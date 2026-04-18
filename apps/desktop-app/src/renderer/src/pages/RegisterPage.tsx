import { useState, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@renderer/context/AuthContext';
import { api } from '@renderer/lib/api';
import { deriveKey, hashKey, generateSalt, saltToBase64 } from '@renderer/lib/crypto';

export default function RegisterPage() {
  const { cryptoKeyRef, setJwt, setUsername } = useAuth();
  const navigate = useNavigate();
  const [usernameInput, setUsernameInput] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (password !== confirm) { setError('Passwords do not match'); return; }
    if (password.length < 8) { setError('Password must be at least 8 characters'); return; }

    setLoading(true);
    try {
      const salt = generateSalt();
      const saltB64 = saltToBase64(salt);
      const key = await deriveKey(password, salt);
      const passwordHash = await hashKey(key);
      const { token, userId } = await api.register({
        username: usernameInput.trim(),
        salt: saltB64,
        passwordHash,
      });
      await window.storeAPI.addUser({ id: userId, username: usernameInput.trim() });
      cryptoKeyRef.current = key;
      setJwt(token);
      setUsername(usernameInput.trim());
      navigate('/vault');
    } catch (e) {
      const msg = e instanceof Error ? e.message : '';
      if (msg.toLowerCase().includes('fetch') || msg.toLowerCase().includes('network')) {
        setError('Cannot reach the server. Make sure the API is running.');
      } else {
        setError(msg || 'Registration failed');
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthLayout>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-[#1A1B26]">Create account</h1>
          <p className="mt-1 text-sm text-[#2F334D]/60">Set up your local vault</p>
        </div>

        {error && (
          <div className="rounded-lg border border-[#F7768E]/30 bg-[#F7768E]/8 px-4 py-2.5 text-sm text-[#F7768E]">
            {error}
          </div>
        )}

        <input
          type="text"
          placeholder="Username"
          value={usernameInput}
          onChange={(e) => setUsernameInput(e.target.value)}
          className="w-full rounded-lg border border-[#E5E7EB] bg-[#F5F5F7] px-4 py-2.5 text-sm text-[#1A1B26] placeholder-[#2F334D]/30 focus:border-[#7AA2F7] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#7AA2F7] transition-colors"
          required
          autoFocus
        />
        <input
          type="password"
          placeholder="Master password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full rounded-lg border border-[#E5E7EB] bg-[#F5F5F7] px-4 py-2.5 text-sm text-[#1A1B26] placeholder-[#2F334D]/30 focus:border-[#7AA2F7] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#7AA2F7] transition-colors"
          required
        />
        <input
          type="password"
          placeholder="Confirm password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          className="w-full rounded-lg border border-[#E5E7EB] bg-[#F5F5F7] px-4 py-2.5 text-sm text-[#1A1B26] placeholder-[#2F334D]/30 focus:border-[#7AA2F7] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#7AA2F7] transition-colors"
          required
        />

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-[#7AA2F7] py-2.5 text-sm font-semibold text-white shadow-sm hover:opacity-90 disabled:opacity-50 transition-opacity"
        >
          {loading ? 'Creating account…' : 'Create Account'}
        </button>

        <p className="text-center text-sm text-[#2F334D]/60">
          Already have an account?{' '}
          <button
            type="button"
            onClick={() => navigate('/login')}
            className="text-[#7AA2F7] hover:opacity-80 transition-opacity"
          >
            Sign in
          </button>
        </p>
      </form>
    </AuthLayout>
  );
}

function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-[#F5F5F7]">
      <div className="hidden w-80 flex-col justify-between bg-[#1A1B26] p-10 lg:flex">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-[#7AA2F7]">SafePass</p>
          <p className="text-[10px] text-white/30">Secure Vault</p>
        </div>
        <div>
          <p className="text-2xl font-bold leading-snug text-white">
            Your passwords,<br />safe and private.
          </p>
          <p className="mt-3 text-sm text-white/40">
            Zero-knowledge encryption. Only you can access your vault.
          </p>
        </div>
        <p className="text-[10px] text-white/20">SafePass · Local-first</p>
      </div>

      <div className="flex flex-1 items-center justify-center p-8">
        <div className="w-full max-w-sm rounded-2xl border border-[#E5E7EB] bg-white p-8 shadow-lg">
          {children}
        </div>
      </div>
    </div>
  );
}
