import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Link } from 'react-router-dom';
import { Activity } from 'lucide-react';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [pass, setPass] = useState('');
  const [err, setErr] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    try {
      await login(email, pass);
      navigate('/');
    } catch (e) {
      setErr('Invalid credentials');
    }
  };

  return (
    <div className="h-screen w-full flex items-center justify-center bg-bank-dark relative overflow-hidden">
      {/* Decorative blobs */}
      <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-bank-blue/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[30rem] h-[30rem] bg-bank-accent/10 rounded-full blur-3xl pointer-events-none" />

      <form onSubmit={submit} className="glass-card p-10 w-full max-w-md z-10">
        <div className="flex justify-center mb-6 text-bank-accent">
          <Activity className="w-12 h-12" />
        </div>
        <h2 className="text-3xl font-bold text-center mb-8">NexBank Login</h2>
        
        {err && <div className="bg-red-500/20 text-red-400 p-3 rounded mb-4 text-center">{err}</div>}
        
        <div className="space-y-4">
          <div>
            <label className="text-gray-400 text-sm mb-1 block">Email Address</label>
            <input 
              type="email" required
              value={email} onChange={e=>setEmail(e.target.value)} 
              className="input-field" placeholder="john@example.com" />
          </div>
          <div>
            <label className="text-gray-400 text-sm mb-1 block">Password</label>
            <input 
              type="password" required
              value={pass} onChange={e=>setPass(e.target.value)} 
              className="input-field" placeholder="••••••••" />
          </div>
          <button type="submit" className="btn-primary w-full py-3 mt-4 text-lg">
            Sign In to Dashboard
          </button>
          <p className="text-center text-sm text-gray-400 mt-3">
            New here? <Link to="/signup" className="text-bank-accent hover:underline">Create account</Link>
          </p>
        </div>
      </form>
    </div>
  );
}
