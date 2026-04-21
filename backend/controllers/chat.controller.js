const db = require('../config/db');
const { Anthropic } = require('@anthropic-ai/sdk');

const anthropic = new Anthropic({
  apiKey: process.env.CLAUDE_API_KEY,
});

exports.chat = async (req, res) => {
  const { message, history } = req.body;
  const customerId = req.user.id;

  try {
    // 1. Gather Customer Context from Database Context
    const custRes = await db.query('SELECT first_name, last_name FROM CUSTOMER WHERE customer_id = $1', [customerId]);
    const accountsRes = await db.query('SELECT account_number, account_type, balance, status FROM ACCOUNT WHERE customer_id = $1', [customerId]);
    const fraudRes = await db.query(`
      SELECT f.alert_type, f.severity, a.account_number 
      FROM FRAUD_ALERT f 
      JOIN ACCOUNT a ON f.account_id = a.account_id 
      WHERE a.customer_id = $1 AND f.resolved_status = 'unresolved'`, 
      [customerId]
    );

    const contextData = {
      user: custRes.rows[0],
      accounts: accountsRes.rows,
      unresolvedFraudAlerts: fraudRes.rows
    };

    const systemPrompt = `
You are NexBank's AI banking assistant. You have access to the following current customer data in JSON format:
  ${JSON.stringify(contextData)}

Rules:
1. Address the customer by name.
2. Mask account numbers (e.g., XXXXXX1234) if you output them.
3. Format currency in ₹ (INR) or your default locale currency clearly.
4. Keep responses concise, professional, and helpful.
5. If there are unresolved fraud alerts, politely inform the user to check their fraud dashboard.
6. Only use the provided json context to answer account/balance queries.`;

    // Map history to Anthropic format
    const formattedHistory = history ? history.map(msg => ({
      role: msg.role === 'user' ? 'user' : 'assistant',
      content: msg.content
    })) : [];
    
    formattedHistory.push({ role: 'user', content: message });

    // Ensure we have a key
    if (!process.env.CLAUDE_API_KEY || process.env.CLAUDE_API_KEY === 'your_anthropic_api_key_here') {
      return res.json({ 
        reply: "AI component is enabled but API Key is missing. I see you have " + accountsRes.rows.length + " accounts." 
      });
    }

    const response = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 500,
      system: systemPrompt,
      messages: formattedHistory
    });

    res.json({ reply: response.content[0].text });

  } catch (error) {
    console.error('Chat error:', error);
    res.status(500).json({ error: 'Failed to process chat request' });
  }
};
