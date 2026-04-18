import { createContext, useContext, useEffect, useRef, useState, ReactNode } from 'react'
import { api } from '@renderer/lib/api'

interface AuthContextValue {
  initialized: boolean
  jwt: string | null
  cryptoKeyRef: React.MutableRefObject<CryptoKey | null>
  setJwt: (token: string | null) => void
  setInitialized: (value: boolean) => void
  lock: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [initialized, setInitialized] = useState(false)
  const [jwt, setJwt] = useState<string | null>(null)
  const cryptoKeyRef = useRef<CryptoKey | null>(null)

  useEffect(() => {
    api.getStatus().then(({ initialized }) => setInitialized(initialized))
  }, [])

  function lock() {
    cryptoKeyRef.current = null
    setJwt(null)
  }

  return (
    <AuthContext.Provider
      value={{ initialized, jwt, cryptoKeyRef, setJwt, setInitialized, lock }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
