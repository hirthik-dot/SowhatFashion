'use client';

import { useState } from 'react';
import { adminLogin } from '@/lib/api';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';

export default function AdminLoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { checkAuth } = useAuth();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await adminLogin(email, password);
      await checkAuth(); // Refresh auth state
      router.push('/admin');
    } catch (err: any) {
      setError('Invalid email or password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--navbar-bg)] selection:bg-[var(--gold)] selection:text-black">
      <div className="bg-white p-8 md:p-10 rounded-xl w-full max-w-md shadow-2xl">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-playfair font-bold tracking-[0.1em] mb-2">
            SO<span className="text-[var(--gold)]">WAAT</span>
          </h1>
          <p className="text-[var(--text-secondary)] font-semibold tracking-widest text-sm uppercase">Admin Portal</p>
        </div>

        {error && (
          <div className="bg-red-50 text-[var(--sale-red)] p-3 rounded mb-6 text-sm text-center border border-red-100 font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase mb-2">Email Address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full border border-[var(--border)] rounded px-4 py-3 outline-none focus:border-[var(--gold)] transition-colors"
            />
          </div>
          
          <div>
            <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase mb-2">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full border border-[var(--border)] rounded px-4 py-3 outline-none focus:border-[var(--gold)] transition-colors"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn-gold w-full text-base py-3 rounded shadow mt-4 flex items-center justify-center gap-2"
          >
            {loading ? (
              <span className="animate-spin w-5 h-5 border-2 border-black border-t-transparent rounded-full"></span>
            ) : (
              'LOGIN SECURELY'
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
