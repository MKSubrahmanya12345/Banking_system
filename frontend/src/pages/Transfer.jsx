import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Send, CheckCircle } from 'lucide-react';
import { apiUrl } from '../config/api';

export default function Transfer() {
  const [accounts, setAccounts] = useState([]);
  const [form, setForm] = useState({
     fromAccount: '',
     toAccount: '',
     amount: '',
     txnType: 'NEFT',
     description: ''
  });
  const [status, setStatus] = useState(null);

  useEffect(() => {
      axios.get(apiUrl('/api/accounts')).then(res => {
       setAccounts(res.data);
       if(res.data.length > 0) setForm(prev => ({...prev, fromAccount: res.data[0].account_number}));
    });
  }, []);

  const handleChange = (e) => {
     setForm({...form, [e.target.name]: e.target.value});
  }

  const submit = async (e) => {
     e.preventDefault();
     setStatus({ type: 'loading', msg: 'Processing transfer...' });
     try {
          await axios.post(apiUrl('/api/transactions/transfer'), {
          ...form, amount: parseFloat(form.amount)
       });
       setStatus({ type: 'success', msg: 'Transfer successful! The funds have been moved.' });
       setForm(f => ({...f, toAccount:'', amount:'', description:''}));
     } catch(e) {
       setStatus({ type: 'error', msg: e.response?.data?.error || 'Transfer failed' });
     }
  }

  return (
    <div className="max-w-xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 mt-10">
      
      <div className="glass-card overflow-hidden">
        <div className="bg-gradient-to-r from-bank-blue to-bank-accent p-6 text-white text-center">
           <Send className="w-10 h-10 mx-auto mb-2 opacity-80" />
           <h2 className="text-2xl font-bold">Fund Transfer</h2>
           <p className="text-white/80 text-sm mt-1">Move money securely between accounts</p>
        </div>
        
        <form onSubmit={submit} className="p-8 space-y-5">
           {status && status.type === 'success' && (
              <div className="bg-green-500/20 border border-green-500/50 text-green-400 p-4 rounded-xl text-center mb-6 flex items-center justify-center gap-2">
                 <CheckCircle className="w-5 h-5" />
                 {status.msg}
              </div>
           )}
           {status && status.type === 'error' && (
              <div className="bg-red-500/20 border border-red-500/50 text-red-400 p-4 rounded-xl text-center mb-6">
                 {status.msg}
              </div>
           )}

           <div>
              <label className="text-gray-400 text-sm mb-1 block">From Account</label>
              <select name="fromAccount" value={form.fromAccount} onChange={handleChange} required className="input-field appearance-none">
                 {accounts.map(acc => (
                    <option key={acc.account_id} value={acc.account_number} className="bg-bank-dark">
                       {acc.account_type.toUpperCase()} - {acc.account_number.slice(-4)} (Bal: ₹{acc.balance})
                    </option>
                 ))}
              </select>
           </div>
           
           <div>
              <label className="text-gray-400 text-sm mb-1 block">Beneficiary Account Number</label>
              <input type="text" name="toAccount" value={form.toAccount} onChange={handleChange} required className="input-field font-mono" placeholder="10-digit account number" />
           </div>

           <div className="grid grid-cols-2 gap-4">
              <div>
                 <label className="text-gray-400 text-sm mb-1 block">Amount (₹)</label>
                 <input type="number" name="amount" value={form.amount} onChange={handleChange} required min="1" step="0.01" className="input-field" placeholder="1000.00" />
              </div>
              <div>
                 <label className="text-gray-400 text-sm mb-1 block">Transfer Type</label>
                 <select name="txnType" value={form.txnType} onChange={handleChange} className="input-field appearance-none">
                    <option value="IMPS">IMPS (Instant)</option>
                    <option value="NEFT">NEFT</option>
                    <option value="UPI">UPI</option>
                 </select>
              </div>
           </div>

           <div>
              <label className="text-gray-400 text-sm mb-1 block">Remarks</label>
              <input type="text" name="description" value={form.description} onChange={handleChange} className="input-field" placeholder="E.g. Rent Payment" />
           </div>

           <button type="submit" disabled={status?.type === 'loading'} className="btn-primary w-full py-3 mt-6 text-lg disabled:opacity-50">
              {status?.type === 'loading' ? 'Processing...' : 'Secure Transfer'}
           </button>
        </form>
      </div>
    </div>
  );
}
