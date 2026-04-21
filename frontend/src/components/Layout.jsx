import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Activity, CreditCard, LayoutDashboard, LogOut, MessageSquare, Send } from 'lucide-react';

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [chatOpen, setChatOpen] = useState(false);
  const [msg, setMsg] = useState('');
  const [chatHistory, setChatHistory] = useState([{ role: 'assistant', content: 'Hello! I am NexBank AI. How can I help you today?' }]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const menus = [
    { name: 'Dashboard', icon: LayoutDashboard, path: '/' },
    { name: 'Transfer', icon: Send, path: '/transfer' },
    { name: 'Accounts', icon: CreditCard, path: '/accounts' },
  ];

  const sendMsg = async (e) => {
    e.preventDefault();
    if(!msg.trim()) return;

    const newHistory = [...chatHistory, { role: 'user', content: msg }];
    setChatHistory(newHistory);
    setMsg('');

    try {
      const { data } = await window.axios.post('http://localhost:5000/api/chat', {
        message: msg,
        history: chatHistory
      });
      setChatHistory([...newHistory, { role: 'assistant', content: data.reply }]);
    } catch (e) {
       setChatHistory([...newHistory, { role: 'assistant', content: "Sorry, I'm having trouble connecting." }]);
    }
  };

  return (
    <div className="flex h-screen bg-bank-dark overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 border-r border-gray-800 bg-bank-card flex flex-col justify-between">
        <div>
          <div className="h-16 flex items-center px-6 border-b border-gray-800">
            <Activity className="text-bank-accent w-8 h-8 mr-2" />
            <span className="text-xl font-bold tracking-wider">NexBank</span>
          </div>
          <nav className="p-4 space-y-2">
            {menus.map((m) => (
              <button 
                key={m.name} 
                onClick={() => navigate(m.path)}
                className="w-full flex items-center px-4 py-3 text-gray-400 hover:text-white hover:bg-white/5 rounded-xl transition-colors"
               >
                <m.icon className="w-5 h-5 mr-3" />
                {m.name}
              </button>
            ))}
          </nav>
        </div>
        <div className="p-4 border-t border-gray-800">
          <div className="px-4 py-2 mb-4 text-sm text-gray-400">
            Welcome, <br/><span className="text-white font-medium">{user.name}</span>
          </div>
          <button onClick={handleLogout} className="w-full flex items-center px-4 py-3 text-red-400 hover:bg-red-400/10 rounded-xl transition-colors">
            <LogOut className="w-5 h-5 mr-3" />
            Logout
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto relative">
        <div className="p-8">
          {children}
        </div>

        {/* Floating AI Chatbot */}
        <div className="fixed bottom-6 right-6 z-50">
           {chatOpen && (
             <div className="mb-4 glass-card w-80 h-96 flex flex-col overflow-hidden shadow-2xl transition-all">
                <div className="bg-bank-blue p-3 flex justify-between items-center">
                   <h3 className="font-medium flex items-center"><MessageSquare className="w-4 h-4 mr-2"/> NexBank AI</h3>
                   <button onClick={() => setChatOpen(false)} className="text-white/80 hover:text-white">&times;</button>
                </div>
                <div className="flex-1 p-4 overflow-y-auto space-y-3 flex flex-col">
                   {chatHistory.map((c, i) => (
                     <div key={i} className={\`p-2 rounded-lg text-sm max-w-[85%] \${c.role === 'user' ? 'bg-bank-blue ml-auto' : 'bg-gray-800 mr-auto'}\`}>
                       {c.content}
                     </div>
                   ))}
                </div>
                <form onSubmit={sendMsg} className="p-3 border-t border-gray-700 flex gap-2">
                   <input type="text" value={msg} onChange={e=>setMsg(e.target.value)} className="flex-1 bg-bank-dark rounded px-2 py-1 text-sm border border-gray-700 outline-none" placeholder="Ask AI..." />
                   <button type="submit" className="text-bank-accent hover:text-white"><Send className="w-4 h-4"/></button>
                </form>
             </div>
           )}
           <button 
             onClick={() => setChatOpen(!chatOpen)}
             className="bg-bank-accent hover:bg-bank-accent/80 text-bank-dark p-4 rounded-full shadow-lg shadow-bank-accent/20 float-right">
             <MessageSquare className="w-6 h-6" />
           </button>
        </div>
      </main>
    </div>
  )
}
