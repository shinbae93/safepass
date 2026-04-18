import { useState, FormEvent, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@renderer/context/AuthContext';
import { api } from '@renderer/lib/api';
import { deriveKey, hashKey, base64ToSalt } from '@renderer/lib/crypto';

export default function LoginPage() {
  const { cryptoKeyRef, setJwt, setUsername } = useAuth();
  const navigate = useNavigate();
  const [knownUsers, setKnownUsers] = useState<StoredUser[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [manualUsername, setManualUsername] = useState('');
  const [showManual, setShowManual] = useState(false);
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    window.storeAPI.getUsers().then((users) => {
      setKnownUsers(users);
      if (users.length > 0) setSelectedUserId(users[0].id);
      else setShowManual(true);
    });
  }, []);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const activeUser = showManual ? null : (knownUsers.find((u) => u.id === selectedUserId) ?? null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!showManual && !activeUser) { setError('Please select a user'); return; }
    if (showManual && !manualUsername.trim()) { setError('Please enter a username'); return; }

    setLoading(true);
    try {
      const saltQuery = showManual ? { username: manualUsername.trim() } : { userId: activeUser!.id };
      const displayUsername = showManual ? manualUsername.trim() : activeUser!.username;

      const { userId, salt: saltB64 } = await api.getSalt(saltQuery);
      const salt = base64ToSalt(saltB64);
      const key = await deriveKey(password, salt);
      const passwordHash = await hashKey(key);
      const { token } = await api.login({ userId, passwordHash });
      await window.storeAPI.addUser({ id: userId, username: displayUsername });
      cryptoKeyRef.current = key;
      setJwt(token);
      setUsername(displayUsername);
      navigate('/vault');
    } catch (e) {
      const msg = e instanceof Error ? e.message : '';
      if (msg.toLowerCase().includes('fetch') || msg.toLowerCase().includes('network')) {
        setError('Cannot reach the server. Make sure the API is running.');
      } else {
        setError('Invalid master password');
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthLayout>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-[#1A1B26]">Welcome back</h1>
          <p className="mt-1 text-sm text-[#2F334D]/60">Sign in to your vault</p>
        </div>

        {error && (
          <div className="rounded-lg border border-[#F7768E]/30 bg-[#F7768E]/8 px-4 py-2.5 text-sm text-[#F7768E]">
            {error}
          </div>
        )}

        {!showManual && knownUsers.length > 0 && (
          <div ref={dropdownRef} className="relative">
            <button
              type="button"
              onClick={() => setDropdownOpen((v) => !v)}
              className="w-full rounded-lg border border-[#E5E7EB] bg-[#F5F5F7] px-4 py-2.5 text-sm text-[#1A1B26] text-left flex items-center justify-between focus:border-[#7AA2F7] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#7AA2F7] transition-colors"
            >
              <span>{activeUser?.username ?? ''}</span>
              <svg className={`w-4 h-4 text-[#2F334D]/50 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {dropdownOpen && (
              <ul className="absolute z-10 mt-1 w-full rounded-lg border border-[#E5E7EB] bg-white shadow-lg overflow-hidden">
                {knownUsers.map((u) => (
                  <li key={u.id}>
                    <button
                      type="button"
                      onClick={() => { setSelectedUserId(u.id); setDropdownOpen(false); }}
                      className={`w-full px-4 py-2.5 text-sm text-left hover:bg-[#F5F5F7] transition-colors ${u.id === selectedUserId ? 'text-[#7AA2F7] font-medium' : 'text-[#1A1B26]'}`}
                    >
                      {u.username}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {showManual && (
          <input
            type="text"
            placeholder="Username"
            value={manualUsername}
            onChange={(e) => setManualUsername(e.target.value)}
            className="w-full rounded-lg border border-[#E5E7EB] bg-[#F5F5F7] px-4 py-2.5 text-sm text-[#1A1B26] placeholder-[#2F334D]/30 focus:border-[#7AA2F7] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#7AA2F7] transition-colors"
            autoFocus
          />
        )}

        {knownUsers.length > 0 && (
          <button
            type="button"
            onClick={() => setShowManual((v) => !v)}
            className="text-sm text-[#7AA2F7] hover:opacity-80 transition-opacity"
          >
            {showManual ? '← Back to saved accounts' : 'Use a different account'}
          </button>
        )}

        <input
          type="password"
          placeholder="Master password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full rounded-lg border border-[#E5E7EB] bg-[#F5F5F7] px-4 py-2.5 text-sm text-[#1A1B26] placeholder-[#2F334D]/30 focus:border-[#7AA2F7] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#7AA2F7] transition-colors"
          required
        />

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-[#7AA2F7] py-2.5 text-sm font-semibold text-white shadow-sm hover:opacity-90 disabled:opacity-50 transition-opacity"
        >
          {loading ? 'Signing in…' : 'Sign In'}
        </button>

        <p className="text-center text-sm text-[#2F334D]/60">
          No account?{' '}
          <button
            type="button"
            onClick={() => navigate('/register')}
            className="text-[#7AA2F7] hover:opacity-80 transition-opacity"
          >
            Create one
          </button>
        </p>
      </form>
    </AuthLayout>
  );
}

function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-[#F5F5F7]">
      {/* Left branding panel */}
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

      {/* Right form panel */}
      <div className="flex flex-1 items-center justify-center p-8">
        <div className="w-full max-w-sm rounded-2xl border border-[#E5E7EB] bg-white p-8 shadow-lg">
          {children}
        </div>
      </div>
    </div>
  );
}
