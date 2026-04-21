import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { RefreshCw, ArrowUpRight, ArrowDownRight, Clock } from 'lucide-react';

export default function Accounts() {
  const [accounts, setAccounts] = useState([]);
  const [selectedAcc, setSelectedAcc] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [newAccountType, setNewAccountType] = useState('savings');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');
  const [createSuccess, setCreateSuccess] = useState('');

  useEffect(() => {
    fetchAccounts();
  }, []);

  const fetchAccounts = async () => {
    try {
      const res = await axios.get('http://localhost:5000/api/accounts');
      setAccounts(res.data);
      if(res.data.length > 0) {
         fetchStatement(res.data[0].account_id);
      }
    } catch(e) {
      console.error(e);
    }
  };

  const fetchStatement = async (id) => {
    if (!id) return;
    setSelectedAcc(id);
    setLoading(true);
    try {
      const res = await axios.get(`http://localhost:5000/api/accounts/${id}/statement`);
      setTransactions(res.data);
    } catch(e) {
      console.error(e);
    }
    setLoading(false);
  };

  const createAccount = async (e) => {
    e.preventDefault();
    setCreateError('');
    setCreateSuccess('');
    setCreating(true);
    try {
      const res = await axios.post('http://localhost:5000/api/accounts', { accountType: newAccountType });
      const created = res.data;
      setCreateSuccess(`Account created: ID ${created.account_id}, No. ${created.account_number}`);
      await fetchAccounts();
      if (created?.account_id) {
        fetchStatement(created.account_id);
      }
    } catch (e) {
      setCreateError(e?.response?.data?.error || 'Unable to create account');
    }
    setCreating(false);
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-5xl">
      <h1 className="text-3xl font-bold mb-4">Passbook</h1>

      <form onSubmit={createAccount} className="glass-card p-4 flex flex-col md:flex-row md:items-end gap-3">
        <div>
          <label className="text-gray-400 text-sm mb-1 block">Add New Account</label>
          <select
            value={newAccountType}
            onChange={(e) => setNewAccountType(e.target.value)}
            className="input-field min-w-44"
          >
            <option value="savings">Savings</option>
            <option value="current">Current</option>
            <option value="fd">Fixed Deposit</option>
          </select>
        </div>
        <button type="submit" disabled={creating} className="btn-primary px-5 py-2.5 disabled:opacity-70">
          {creating ? 'Creating...' : 'Create Account'}
        </button>
        {createSuccess && <p className="text-green-400 text-sm">{createSuccess}</p>}
        {createError && <p className="text-red-400 text-sm">{createError}</p>}
      </form>
      
      {/* Account Selector */}
      <div className="flex gap-4 mb-6">
         {accounts.length === 0 && <p className="text-gray-400">No accounts yet. Create one above.</p>}
         {accounts.map(acc => (
           <button 
             key={acc.account_id}
             onClick={() => fetchStatement(acc.account_id)}
             className={`px-6 py-3 rounded-xl font-medium transition-all ${selectedAcc === acc.account_id ? 'bg-bank-blue text-white shadow-lg shadow-bank-blue/20 flexitems-center' : 'glass-card text-gray-400 hover:text-white'}`}
           >
             {acc.account_type.toUpperCase()} - {acc.account_number.slice(-4)}
           </button>
         ))}
      </div>

      {/* Statement Table */}
      <div className="glass-card overflow-hidden">
         <div className="p-4 border-b border-gray-700/50 flex justify-between items-center bg-black/20">
            <h3 className="font-semibold text-lg">Transaction History</h3>
            <button onClick={() => fetchStatement(selectedAcc)} className="text-gray-400 hover:text-white">
               <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
            </button>
         </div>
         
         <div className="overflow-x-auto">
           <table className="w-full text-left">
             <thead className="bg-black/20 text-gray-400 text-sm">
               <tr>
                 <th className="px-6 py-4 font-medium">Date</th>
                 <th className="px-6 py-4 font-medium">Description</th>
                 <th className="px-6 py-4 font-medium">Type</th>
                 <th className="px-6 py-4 font-medium">Status</th>
                 <th className="px-6 py-4 text-right font-medium">Amount</th>
               </tr>
             </thead>
             <tbody className="divide-y divide-gray-800/50">
                {transactions.length === 0 && (
                   <tr><td colSpan="5" className="text-center py-8 text-gray-500">No transactions found</td></tr>
                )}
                {transactions.map(txn => (
                  <tr key={txn.txn_id} className="hover:bg-white/5 transition-colors">
                     <td className="px-6 py-4 text-sm text-gray-300">
                        {new Date(txn.txn_date).toLocaleDateString()} <br/>
                        <span className="text-xs text-gray-500">{new Date(txn.txn_date).toLocaleTimeString()}</span>
                     </td>
                     <td className="px-6 py-4 text-sm">{txn.description}</td>
                     <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${txn.txn_dir === 'CREDIT' ? 'bg-green-500/10 text-green-400 border-green-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'}`}>
                           {txn.txn_dir === 'CREDIT' ? <ArrowDownRight className="w-3 h-3 mr-1" /> : <ArrowUpRight className="w-3 h-3 mr-1" />}
                           {txn.txn_dir}
                        </span>
                     </td>
                     <td className="px-6 py-4">
                         <span className={`inline-flex items-center text-xs font-medium ${txn.status === 'success' ? 'text-green-400' : txn.status === 'flagged' ? 'text-red-400' : 'text-yellow-400'}`}>
                            {txn.status === 'pending' && <Clock className="w-3 h-3 mr-1" />}
                            {txn.status.toUpperCase()}
                         </span>
                     </td>
                     <td className={`px-6 py-4 text-right font-medium ${txn.txn_dir === 'CREDIT' ? 'text-green-400' : 'text-white'}`}>
                        {txn.txn_dir === 'CREDIT' ? '+' : '-'} ₹{parseFloat(txn.amount).toLocaleString('en-IN', {minimumFractionDigits:2})}
                     </td>
                  </tr>
                ))}
             </tbody>
           </table>
         </div>
      </div>
    </div>
  );
}
