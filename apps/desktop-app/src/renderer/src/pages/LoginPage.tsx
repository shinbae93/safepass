import { useState, FormEvent, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@renderer/context/AuthContext';
import { api } from '@renderer/lib/api';
import { deriveKey, hashKey, base64ToSalt } from '@renderer/lib/crypto';

export default function LoginPage() {
  const { cryptoKeyRef, setJwt, setUsername } = useAuth();
  const navigate = useNavigate();
  const [knownUsers, setKnownUsers] = useState<StoredUser[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string>('');
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

  const activeUser = showManual
    ? null
    : knownUsers.find((u) => u.id === selectedUserId) ?? null;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (!showManual && !activeUser) {
      setError('Please select a user');
      return;
    }
    if (showManual && !manualUsername.trim()) {
      setError('Please enter a username');
      return;
    }

    setLoading(true);
    try {
      let userId: string;
      let displayUsername: string;

      if (showManual) {
        const found = knownUsers.find(
          (u) => u.username.toLowerCase() === manualUsername.trim().toLowerCase(),
        );
        if (!found) {
          setError('Account not found on this device. Please register first.');
          setLoading(false);
          return;
        }
        userId = found.id;
        displayUsername = found.username;
      } else {
        userId = activeUser!.id;
        displayUsername = activeUser!.username;
      }

      const { salt: saltB64 } = await api.getSalt(userId);
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
    <div className="flex min-h-screen items-center justify-center bg-gray-950">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm space-y-4 rounded-xl bg-gray-900 p-8 shadow-lg"
      >
        <h1 className="text-2xl font-bold text-white">Sign In</h1>
        {error && <p className="text-sm text-red-400">{error}</p>}

        {!showManual && knownUsers.length > 0 && (
          <select
            value={selectedUserId}
            onChange={(e) => setSelectedUserId(e.target.value)}
            className="w-full rounded-lg bg-gray-800 px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {knownUsers.map((u) => (
              <option key={u.id} value={u.id}>
                {u.username}
              </option>
            ))}
          </select>
        )}

        {showManual && (
          <input
            type="text"
            placeholder="Username"
            value={manualUsername}
            onChange={(e) => setManualUsername(e.target.value)}
            className="w-full rounded-lg bg-gray-800 px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            autoFocus
          />
        )}

        {knownUsers.length > 0 && (
          <button
            type="button"
            onClick={() => setShowManual((v) => !v)}
            className="text-sm text-blue-400 hover:underline"
          >
            {showManual ? '← Back to saved accounts' : 'Use a different account'}
          </button>
        )}

        <input
          type="password"
          placeholder="Master password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full rounded-lg bg-gray-800 px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
          required
        />
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-blue-600 py-2 font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? 'Signing in…' : 'Sign In'}
        </button>

        <p className="text-center text-sm text-gray-400">
          No account?{' '}
          <button
            type="button"
            onClick={() => navigate('/register')}
            className="text-blue-400 hover:underline"
          >
            Create one
          </button>
        </p>
      </form>
    </div>
  );
}
