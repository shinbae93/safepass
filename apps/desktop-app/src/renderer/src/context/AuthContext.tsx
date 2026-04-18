import { createContext, useContext, useRef, useState, ReactNode } from 'react';

interface AuthContextValue {
  jwt: string | null;
  username: string | null;
  cryptoKeyRef: React.MutableRefObject<CryptoKey | null>;
  setJwt: (token: string | null) => void;
  setUsername: (username: string | null) => void;
  lock: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [jwt, setJwt] = useState<string | null>(null);
  const [username, setUsername] = useState<string | null>(null);
  const cryptoKeyRef = useRef<CryptoKey | null>(null);

  function lock() {
    cryptoKeyRef.current = null;
    setJwt(null);
    setUsername(null);
  }

  return (
    <AuthContext.Provider value={{ jwt, username, cryptoKeyRef, setJwt, setUsername, lock }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
