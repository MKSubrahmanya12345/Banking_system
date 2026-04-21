import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { Activity } from 'lucide-react';

export default function Signup() {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    phone: '',
    address: '',
    dob: ''
  });
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);

  const onChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const submit = async (e) => {
    e.preventDefault();
    setErr('');
    setLoading(true);

    try {
      await register(form);
      navigate('/login');
    } catch (e) {
      setErr(e?.response?.data?.error || 'Signup failed. Try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-bank-dark relative overflow-hidden py-8">
      <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-bank-blue/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[30rem] h-[30rem] bg-bank-accent/10 rounded-full blur-3xl pointer-events-none" />

      <form onSubmit={submit} className="glass-card p-8 w-full max-w-xl z-10">
        <div className="flex justify-center mb-4 text-bank-accent">
          <Activity className="w-10 h-10" />
        </div>
        <h2 className="text-3xl font-bold text-center mb-6">Create NexBank Account</h2>

        {err && <div className="bg-red-500/20 text-red-400 p-3 rounded mb-4 text-center">{err}</div>}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-gray-400 text-sm mb-1 block">First Name</label>
            <input name="firstName" type="text" required value={form.firstName} onChange={onChange} className="input-field" />
          </div>
          <div>
            <label className="text-gray-400 text-sm mb-1 block">Last Name</label>
            <input name="lastName" type="text" required value={form.lastName} onChange={onChange} className="input-field" />
          </div>
          <div>
            <label className="text-gray-400 text-sm mb-1 block">Email</label>
            <input name="email" type="email" required value={form.email} onChange={onChange} className="input-field" />
          </div>
          <div>
            <label className="text-gray-400 text-sm mb-1 block">Phone</label>
            <input name="phone" type="tel" required value={form.phone} onChange={onChange} className="input-field" />
          </div>
          <div>
            <label className="text-gray-400 text-sm mb-1 block">Password</label>
            <input name="password" type="password" required minLength={6} value={form.password} onChange={onChange} className="input-field" />
          </div>
          <div>
            <label className="text-gray-400 text-sm mb-1 block">Date of Birth</label>
            <input name="dob" type="date" value={form.dob} onChange={onChange} className="input-field" />
          </div>
          <div className="md:col-span-2">
            <label className="text-gray-400 text-sm mb-1 block">Address</label>
            <input name="address" type="text" value={form.address} onChange={onChange} className="input-field" />
          </div>
        </div>

        <button disabled={loading} type="submit" className="btn-primary w-full py-3 mt-6 text-lg disabled:opacity-70">
          {loading ? 'Creating Account...' : 'Sign Up'}
        </button>
        <p className="text-center text-sm text-gray-400 mt-3">
          Already have an account? <Link to="/login" className="text-bank-accent hover:underline">Sign in</Link>
        </p>
      </form>
    </div>
  );
}
