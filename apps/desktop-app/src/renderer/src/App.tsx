import { useEffect } from 'react';
import { MemoryRouter, Routes, Route, useNavigate } from 'react-router-dom';
import { AuthProvider, useAuth } from '@renderer/context/AuthContext';
import SetupPage from '@renderer/pages/SetupPage';
import UnlockPage from '@renderer/pages/UnlockPage';
import VaultPage from '@renderer/pages/VaultPage';

function AppRoutes() {
  const { initialized, statusLoading, jwt } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (statusLoading) return;
    if (!initialized) {
      navigate('/setup');
    } else if (!jwt) {
      navigate('/unlock');
    } else {
      navigate('/vault');
    }
  }, [initialized, statusLoading, jwt, navigate]);

  if (statusLoading) return null;

  return (
    <Routes>
      <Route path="/setup" element={<SetupPage />} />
      <Route path="/unlock" element={<UnlockPage />} />
      <Route path="/vault" element={<VaultPage />} />
    </Routes>
  );
}

export default function App() {
  return (
    <MemoryRouter initialEntries={['/']}>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </MemoryRouter>
  );
}
