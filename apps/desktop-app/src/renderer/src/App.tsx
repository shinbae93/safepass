import { useEffect } from 'react';
import { MemoryRouter, Routes, Route, useNavigate } from 'react-router-dom';
import { AuthProvider, useAuth } from '@renderer/context/AuthContext';
import LoginPage from '@renderer/pages/LoginPage';
import RegisterPage from '@renderer/pages/RegisterPage';
import VaultPage from '@renderer/pages/VaultPage';

function AppRoutes() {
  const { jwt } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!jwt) {
      navigate('/login');
    } else {
      navigate('/vault');
    }
  }, [jwt, navigate]);

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/vault" element={<VaultPage />} />
    </Routes>
  );
}

export default function App() {
  return (
    <MemoryRouter initialEntries={['/login']}>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </MemoryRouter>
  );
}
