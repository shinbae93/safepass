import { createContext, useContext, useEffect, useRef, useState, ReactNode } from 'react';

interface AuthContextValue {
  initialized: boolean;
  statusLoading: boolean;
  jwt: string | null;
  username: string | null;
  cryptoKeyRef: React.MutableRefObject<CryptoKey | null>;
  setJwt: (token: string | null) => void;
  setUsername: (username: string | null) => void;
  setInitialized: (value: boolean) => void;
  lock: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [initialized, setInitialized] = useState(false);
  const [statusLoading, setStatusLoading] = useState(true);
  const [jwt, setJwt] = useState<string | null>(null);
  const [username, setUsername] = useState<string | null>(null);
  const cryptoKeyRef = useRef<CryptoKey | null>(null);

  useEffect(() => {
    window.storeAPI.getUsers().then((users) => {
      setInitialized(users.length > 0);
      setStatusLoading(false);
    });
  }, []);

  function lock() {
    cryptoKeyRef.current = null;
    setJwt(null);
    setUsername(null);
  }

  return (
    <AuthContext.Provider
      value={{
        initialized,
        statusLoading,
        jwt,
        username,
        cryptoKeyRef,
        setJwt,
        setUsername,
        setInitialized,
        lock,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
