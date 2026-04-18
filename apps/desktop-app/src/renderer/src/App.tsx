import { useEffect } from 'react'
import { MemoryRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom'
import { AuthProvider, useAuth } from '@renderer/context/AuthContext'
import SetupPage from '@renderer/pages/SetupPage'
import UnlockPage from '@renderer/pages/UnlockPage'
import VaultPage from '@renderer/pages/VaultPage'

function AppRoutes() {
  const { initialized, jwt } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (!initialized) {
      navigate('/setup')
    } else if (!jwt) {
      navigate('/unlock')
    } else {
      navigate('/vault')
    }
  }, [initialized, jwt, navigate])

  return (
    <Routes>
      <Route path="/setup" element={<SetupPage />} />
      <Route path="/unlock" element={<UnlockPage />} />
      <Route path="/vault" element={<VaultPage />} />
      <Route path="*" element={<Navigate to="/unlock" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <MemoryRouter initialEntries={['/unlock']}>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </MemoryRouter>
  )
}
