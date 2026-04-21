-- ENUM Types
CREATE TYPE kyc_status_enum AS ENUM ('pending', 'verified', 'rejected');
CREATE TYPE account_type_enum AS ENUM ('savings', 'current', 'fd');
CREATE TYPE account_status_enum AS ENUM ('active', 'frozen', 'closed');
CREATE TYPE txn_type_enum AS ENUM ('NEFT', 'IMPS', 'UPI', 'deposit', 'withdrawal');
CREATE TYPE txn_status_enum AS ENUM ('success', 'failed', 'pending', 'flagged');
CREATE TYPE loan_type_enum AS ENUM ('personal', 'home', 'education');
CREATE TYPE loan_status_enum AS ENUM ('applied', 'approved', 'active', 'closed', 'defaulted');
CREATE TYPE emi_status_enum AS ENUM ('pending', 'paid', 'overdue');
CREATE TYPE card_status_enum AS ENUM ('active', 'blocked', 'expired');
CREATE TYPE alert_severity_enum AS ENUM ('low', 'medium', 'high');
CREATE TYPE alert_resolved_status_enum AS ENUM ('unresolved', 'resolved', 'false_alarm');
CREATE TYPE emp_role_enum AS ENUM ('teller', 'loan_officer', 'admin');

-- Tables
CREATE TABLE CUSTOMER (
    customer_id SERIAL PRIMARY KEY,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    phone VARCHAR(20) UNIQUE NOT NULL,
    address TEXT,
    kyc_status kyc_status_enum DEFAULT 'pending',
    date_of_birth DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE ACCOUNT (
    account_id SERIAL PRIMARY KEY,
    customer_id INT NOT NULL REFERENCES CUSTOMER(customer_id) ON DELETE CASCADE,
    account_number VARCHAR(20) UNIQUE NOT NULL,
    account_type account_type_enum NOT NULL,
    balance DECIMAL(15,2) DEFAULT 0.00,
    status account_status_enum DEFAULT 'active',
    opened_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE TRANSACTION (
    txn_id SERIAL PRIMARY KEY,
    from_account_id INT REFERENCES ACCOUNT(account_id) ON DELETE SET NULL,
    to_account_id INT REFERENCES ACCOUNT(account_id) ON DELETE SET NULL,
    amount DECIMAL(15,2) NOT NULL,
    txn_type txn_type_enum NOT NULL,
    status txn_status_enum DEFAULT 'pending',
    txn_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    description VARCHAR(255)
);

CREATE TABLE EMPLOYEE (
    emp_id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role emp_role_enum NOT NULL,
    branch VARCHAR(100),
    email VARCHAR(255) UNIQUE NOT NULL
);

CREATE TABLE LOAN (
    loan_id SERIAL PRIMARY KEY,
    customer_id INT NOT NULL REFERENCES CUSTOMER(customer_id) ON DELETE CASCADE,
    account_id INT NOT NULL REFERENCES ACCOUNT(account_id) ON DELETE CASCADE, -- Where funds are disbursed/EMIs paid from
    emp_id INT REFERENCES EMPLOYEE(emp_id), -- Loan officer who processed
    loan_type loan_type_enum NOT NULL,
    principal DECIMAL(15,2) NOT NULL,
    interest_rate DECIMAL(5,2) NOT NULL,
    tenure_months INT NOT NULL,
    status loan_status_enum DEFAULT 'applied',
    start_date DATE
);

CREATE TABLE EMI_SCHEDULE (
    emi_id SERIAL PRIMARY KEY,
    loan_id INT NOT NULL REFERENCES LOAN(loan_id) ON DELETE CASCADE,
    emi_number INT NOT NULL,
    emi_amount DECIMAL(15,2) NOT NULL,
    due_date DATE NOT NULL,
    paid_date DATE,
    payment_status emi_status_enum DEFAULT 'pending',
    penalty DECIMAL(15,2) DEFAULT 0.00
);

CREATE TABLE DEBIT_CARD (
    card_id SERIAL PRIMARY KEY,
    account_id INT UNIQUE NOT NULL REFERENCES ACCOUNT(account_id) ON DELETE CASCADE,
    card_number VARCHAR(16) UNIQUE NOT NULL,
    expiry_date DATE NOT NULL,
    daily_limit DECIMAL(15,2) DEFAULT 50000.00,
    card_status card_status_enum DEFAULT 'active',
    issued_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE FRAUD_ALERT (
    alert_id SERIAL PRIMARY KEY,
    account_id INT NOT NULL REFERENCES ACCOUNT(account_id) ON DELETE CASCADE,
    txn_id INT REFERENCES TRANSACTION(txn_id) ON DELETE CASCADE,
    alert_type VARCHAR(100) NOT NULL,
    severity alert_severity_enum DEFAULT 'medium',
    flagged_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    resolved_status alert_resolved_status_enum DEFAULT 'unresolved'
);

-- Indexes
CREATE INDEX idx_transaction_account_date ON TRANSACTION (from_account_id, to_account_id, txn_date);
CREATE INDEX idx_emi_schedule_loan_date ON EMI_SCHEDULE (loan_id, due_date);
CREATE INDEX idx_fraud_alert_account_unresolved ON FRAUD_ALERT (account_id) WHERE resolved_status = 'unresolved';
