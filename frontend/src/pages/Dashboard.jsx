import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { ArrowUpRight, ArrowDownRight, Wallet, ShieldAlert } from 'lucide-react';
import { apiUrl } from '../config/api';

export default function Dashboard() {
  const [accounts, setAccounts] = useState([]);
  const [alerts, setAlerts] = useState([]);

  useEffect(() => {
    // We attach axios to window in Layout but let's use direct import
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [accRes, alertRes] = await Promise.all([
        axios.get(apiUrl('/api/accounts')),
        axios.get(apiUrl('/api/transactions/fraud/alerts')) // Assume it filters by user in backend view logic ideally
      ]);
      setAccounts(accRes.data);
      setAlerts(alertRes.data);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <h1 className="text-3xl font-bold mb-2">Overview</h1>
      
      {alerts.length > 0 && (
         <div className="bg-red-500/20 border border-red-500/50 p-4 rounded-xl flex items-start gap-4">
            <ShieldAlert className="text-red-400 w-6 h-6 mt-1 flex-shrink-0" />
            <div>
               <h3 className="text-red-400 font-semibold text-lg">Security Alerts</h3>
               <p className="text-sm text-red-200">You have {alerts.length} unresolved flagged transactions on your accounts.</p>
            </div>
         </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {accounts.map(acc => (
          <div key={acc.account_id} className="glass-card p-6 relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-10 blur-xl group-hover:bg-bank-accent group-hover:opacity-20 transition-all w-32 h-32 rounded-full transform translate-x-10 -translate-y-10" />
            
            <div className="flex justify-between items-center mb-4">
              <span className="text-gray-400 font-medium uppercase tracking-wider text-xs">
                 {acc.account_type} Account
              </span>
              <Wallet className="text-bank-accent w-5 h-5" />
            </div>
            
            <div className="text-3xl font-bold mb-1">
              ₹ {parseFloat(acc.balance).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </div>
            <div className="text-sm text-gray-500 tracking-widest font-mono">
              •••• {acc.account_number.slice(-4)}
            </div>
          </div>
        ))}
        {accounts.length === 0 && (
           <div className="glass-card p-6 flex items-center justify-center text-gray-500">
             No active accounts found
           </div>
        )}
      </div>

      <div className="glass-card p-6 mt-8">
         <h2 className="text-xl font-bold mb-4">Recent Activity</h2>
         <div className="text-gray-400 text-sm italic">
           Transactions widget will go here... Please visit Accounts page for your passbook.
         </div>
      </div>
    </div>
  );
}
