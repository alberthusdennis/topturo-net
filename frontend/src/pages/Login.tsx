import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, User } from 'lucide-react';
import { api, ApiError } from '../lib/api';
import { tokenManager } from '../lib/tokenManager';
import { useAuthStore } from '../store/authStore';

interface LoginResponse {
  token: string;
  user: { id: number; username: string; role: 'admin' | 'owner' };
}

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const login = useAuthStore((s) => s.login);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setError('Username dan password harus diisi.');
      return;
    }
    setIsLoading(true);
    setError('');

    try {
      const res = await api.post<LoginResponse>('/api/auth/login', { username, password });

      // Step 1: Write token to localStorage IMMEDIATELY — before anything else
      tokenManager.set(res.token);

      // Step 2: Update Zustand state
      login(res.user, res.token);

      // Step 3: Navigate to the correct dashboard
      if (res.user.role === 'admin') {
        navigate('/admin/dashboard', { replace: true });
      } else {
        navigate('/owner/dashboard', { replace: true });
      }
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 0) setError('Tidak bisa terhubung ke server. Pastikan backend berjalan di port 3001.');
        else if (err.status === 400) setError('Username minimal 3 karakter dan password minimal 6 karakter.');
        else if (err.status === 401) setError('Username atau password salah.');
        else if (err.status === 429) setError('Terlalu banyak percobaan. Coba lagi 15 menit lagi.');
        else setError(`Error ${err.status}: ${err.message}`);
      } else {
        setError('Terjadi kesalahan tidak diketahui.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-dark">
      {/* Dynamic Background */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/20 blur-[120px] rounded-full animate-pulse"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-500/20 blur-[120px] rounded-full animate-pulse" style={{ animationDelay: '1s' }}></div>

      <div className="relative z-10 w-full max-w-md p-8 rounded-3xl glass shadow-2xl border border-white/10">
        <div className="flex flex-col items-center mb-8">
          <img src="/topturo.jpg" className="w-16 h-16 rounded-2xl object-cover mb-4 shadow-lg shadow-indigo-500/30" alt="Topturo Net Logo" />
          <h1 className="text-3xl font-bold tracking-tight text-white">El Matadore Net</h1>
          <p className="text-neutral-400 mt-2 text-sm">System Management Protocol</p>
        </div>

        {error && (
          <div className="mb-6 p-3 rounded-lg bg-red-500/10 border border-red-500/50 text-red-400 text-sm text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-5">
          <div className="space-y-1">
            <label htmlFor="username" className="text-xs font-semibold text-neutral-400 uppercase tracking-wider ml-1">Username</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <User className="h-5 w-5 text-neutral-500" />
              </div>
              <input
                id="username"
                type="text"
                autoComplete="username"
                className="block w-full pl-10 px-4 py-3 bg-black/40 border border-white/5 rounded-xl text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                placeholder="admin_warnet"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="space-y-1">
            <label htmlFor="password" className="text-xs font-semibold text-neutral-400 uppercase tracking-wider ml-1">Password</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Lock className="h-5 w-5 text-neutral-500" />
              </div>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                className="block w-full pl-10 px-4 py-3 bg-black/40 border border-white/5 rounded-xl text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
          </div>

          <button
            type="submit"
            id="login-btn"
            disabled={isLoading}
            className="w-full py-3 px-4 rounded-xl font-medium text-white bg-gradient-to-r from-primary to-purple-600 hover:from-primary-hover hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-dark focus:ring-primary shadow-lg shadow-primary/25 transition-all active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed mt-2"
          >
            {isLoading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-4 w-4 text-white" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Authenticating...
              </span>
            ) : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
}
