-- ==========================================
-- VIEWS
-- ==========================================

-- Passbook View
CREATE OR REPLACE VIEW vw_passbook AS
SELECT 
    t.txn_id,
    a.account_id,
    a.account_number,
    t.txn_date,
    t.description,
    CASE 
        WHEN t.from_account_id = a.account_id THEN 'DEBIT'
        WHEN t.to_account_id = a.account_id THEN 'CREDIT'
    END as txn_dir,
    t.amount,
    t.status
FROM ACCOUNT a
JOIN TRANSACTION t ON a.account_id = t.from_account_id OR a.account_id = t.to_account_id
ORDER BY t.txn_date DESC;

-- Loan Summary View
CREATE OR REPLACE VIEW vw_loan_summary AS
SELECT 
    l.customer_id,
    c.first_name,
    c.last_name,
    l.loan_id,
    l.principal,
    l.interest_rate,
    l.status,
    COALESCE(SUM(CASE WHEN e.payment_status = 'paid' THEN e.emi_amount ELSE 0 END), 0) AS total_paid,
    COALESCE(SUM(CASE WHEN e.payment_status IN ('pending', 'overdue') THEN e.emi_amount ELSE 0 END), 0) AS outstanding_amount
FROM LOAN l
JOIN CUSTOMER c ON l.customer_id = c.customer_id
LEFT JOIN EMI_SCHEDULE e ON l.loan_id = e.loan_id
GROUP BY l.customer_id, c.first_name, c.last_name, l.loan_id, l.principal, l.interest_rate, l.status;

-- Active Fraud Alerts View
CREATE OR REPLACE VIEW vw_active_fraud_alerts AS
SELECT 
    f.alert_id,
    f.account_id,
    a.account_number,
    c.first_name,
    c.last_name,
    f.alert_type,
    f.severity,
    f.flagged_at,
    t.amount AS txn_amount
FROM FRAUD_ALERT f
JOIN ACCOUNT a ON f.account_id = a.account_id
JOIN CUSTOMER c ON a.customer_id = c.customer_id
LEFT JOIN TRANSACTION t ON f.txn_id = t.txn_id
WHERE f.resolved_status = 'unresolved'
ORDER BY f.flagged_at DESC;

-- ==========================================
-- FUNCTIONS & TRIGGERS
-- ==========================================

-- Function to handle transaction balances
CREATE OR REPLACE FUNCTION process_transaction_balances()
RETURNS TRIGGER AS $$
BEGIN
    -- Only process successful or pending (assume pending means amount is deducted, but success clears it. For simplicity, we deduct immediately upon creation).
    IF NEW.status IN ('success', 'pending', 'flagged') THEN
        -- Withdraw from sender
        IF NEW.from_account_id IS NOT NULL THEN
            UPDATE ACCOUNT SET balance = balance - NEW.amount WHERE account_id = NEW.from_account_id;
            
            -- Prevent negative balance. Postgres triggers execute at the statement level for updates too, but this catches per row.
            IF (SELECT balance FROM ACCOUNT WHERE account_id = NEW.from_account_id) < 0 THEN
                RAISE EXCEPTION 'Insufficient funds in account %', NEW.from_account_id;
            END IF;
        END IF;

        -- Deposit to receiver
        IF NEW.to_account_id IS NOT NULL THEN
            UPDATE ACCOUNT SET balance = balance + NEW.amount WHERE account_id = NEW.to_account_id;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_transaction_balances
AFTER INSERT ON TRANSACTION
FOR EACH ROW
EXECUTE FUNCTION process_transaction_balances();

-- Fraud Detection Trigger
CREATE OR REPLACE FUNCTION check_fraud_heuristics()
RETURNS TRIGGER AS $$
DECLARE
    recent_count INT;
BEGIN
    IF NEW.from_account_id IS NOT NULL THEN
        -- Check > 3 transactions within 10 minutes
        SELECT COUNT(*) INTO recent_count 
        FROM TRANSACTION 
        WHERE from_account_id = NEW.from_account_id 
          AND txn_date >= NOW() - INTERVAL '10 minutes';
          
        IF recent_count >= 3 THEN
            INSERT INTO FRAUD_ALERT (account_id, txn_id, alert_type, severity)
            VALUES (NEW.from_account_id, NEW.txn_id, 'Velocity limits exceeded: 3+ tx within 10 mins', 'high');
            
            -- Automatically flag the new transaction
            NEW.status := 'flagged';
        END IF;
        
        -- High value transaction alert
        IF NEW.amount > 500000 THEN
             INSERT INTO FRAUD_ALERT (account_id, txn_id, alert_type, severity)
             VALUES (NEW.from_account_id, NEW.txn_id, 'High value transaction', 'medium');
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_fraud_detection
BEFORE INSERT ON TRANSACTION
FOR EACH ROW
EXECUTE FUNCTION check_fraud_heuristics();

-- Loan Default Detection
CREATE OR REPLACE FUNCTION check_loan_default()
RETURNS TRIGGER AS $$
DECLARE
    overdue_count INT;
BEGIN
    IF NEW.payment_status = 'overdue' THEN
        SELECT COUNT(*) INTO overdue_count FROM EMI_SCHEDULE WHERE loan_id = NEW.loan_id AND payment_status = 'overdue';
        IF overdue_count >= 3 THEN
            UPDATE LOAN SET status = 'defaulted' WHERE loan_id = NEW.loan_id;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_loan_default
AFTER UPDATE ON EMI_SCHEDULE
FOR EACH ROW
EXECUTE FUNCTION check_loan_default();

-- ==========================================
-- STORED PROCEDURES
-- ==========================================

-- Fund Transfer Procedure
CREATE OR REPLACE PROCEDURE sp_fund_transfer(
    p_from_account INT,
    p_to_account INT,
    p_amount DECIMAL,
    p_type txn_type_enum,
    p_desc VARCHAR,
    OUT p_txn_id INT,
    OUT p_status txn_status_enum
)
LANGUAGE plpgsql
AS $$
BEGIN
    -- Check balances and insert txn
    INSERT INTO TRANSACTION (from_account_id, to_account_id, amount, txn_type, status, description)
    VALUES (p_from_account, p_to_account, p_amount, p_type, 'success', p_desc)
    RETURNING txn_id, status INTO p_txn_id, p_status;
EXCEPTION
    WHEN OTHERS THEN
        ROLLBACK;
        p_status := 'failed';
        RAISE;
END;
$$;

-- EMI Schedule Generator
CREATE OR REPLACE PROCEDURE sp_generate_emi_schedule(p_loan_id INT)
LANGUAGE plpgsql
AS $$
DECLARE
    v_principal DECIMAL;
    v_rate DECIMAL;
    v_tenure INT;
    v_start_date DATE;
    v_emi_amount DECIMAL;
    v_monthly_rate DECIMAL;
BEGIN
    SELECT principal, interest_rate, tenure_months, start_date 
    INTO v_principal, v_rate, v_tenure, v_start_date
    FROM LOAN WHERE loan_id = p_loan_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Loan ID % not found', p_loan_id;
    END IF;

    -- Monthly interest rate
    v_monthly_rate := (v_rate / 12) / 100;
    
    -- EMI Formula: P x R x (1+R)^N / [(1+R)^N-1]
    IF v_monthly_rate > 0 THEN
        v_emi_amount := (v_principal * v_monthly_rate * POWER(1 + v_monthly_rate, v_tenure)) / (POWER(1 + v_monthly_rate, v_tenure) - 1);
    ELSE
        v_emi_amount := v_principal / v_tenure;
    END IF;

    FOR i IN 1..v_tenure LOOP
        INSERT INTO EMI_SCHEDULE (loan_id, emi_number, emi_amount, due_date)
        VALUES (p_loan_id, i, ROUND(v_emi_amount, 2), v_start_date + (i || ' month')::interval);
    END LOOP;
END;
$$;
