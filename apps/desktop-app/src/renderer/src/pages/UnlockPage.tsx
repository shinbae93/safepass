import { useState, FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@renderer/context/AuthContext'
import { api } from '@renderer/lib/api'
import { deriveKey, hashKey, base64ToSalt } from '@renderer/lib/crypto'

export default function UnlockPage() {
  const { cryptoKeyRef, setJwt } = useAuth()
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const { salt: saltB64 } = await api.getSalt()
      const salt = base64ToSalt(saltB64)
      const key = await deriveKey(password, salt)
      const passwordHash = await hashKey(key)
      const { token } = await api.unlock({ passwordHash })
      cryptoKeyRef.current = key
      setJwt(token)
      navigate('/vault')
    } catch (e) {
      setError('Invalid master password')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-950">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm space-y-4 rounded-xl bg-gray-900 p-8 shadow-lg"
      >
        <h1 className="text-2xl font-bold text-white">Unlock SafePass</h1>
        {error && <p className="text-sm text-red-400">{error}</p>}
        <input
          type="password"
          placeholder="Master password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full rounded-lg bg-gray-800 px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
          required
          autoFocus
        />
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-blue-600 py-2 font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? 'Unlocking…' : 'Unlock'}
        </button>
      </form>
    </div>
  )
}
