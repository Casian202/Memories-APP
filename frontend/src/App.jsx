import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { AuthProvider, useAuth } from './context/AuthContext'
import { ThemeProvider } from './context/ThemeContext'
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import EventsPage from './pages/EventsPage'
import EventDetailPage from './pages/EventDetailPage'
import SurprisesPage from './pages/SurprisesPage'
import ComingSoonPage from './pages/ComingSoonPage'
import MotivationsPage from './pages/MotivationsPage'
import AdminPage from './pages/AdminPage'
import SettingsPage from './pages/SettingsPage'
import Layout from './components/layout/Layout'

function ProtectedRoute({ children, adminOnly = false }) {
  const { user, loading, tokenReady, isAdmin } = useAuth()
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent" />
      </div>
    )
  }
  
  if (!user || !tokenReady) {
    return <Navigate to="/login" replace />
  }
  
  // Redirect to login for password change if needed
  if (user.force_password_change) {
    return <Navigate to="/login" replace />
  }
  
  if (adminOnly && !isAdmin()) {
    return <Navigate to="/dashboard" replace />
  }
  
  return children
}

function PublicRoute({ children }) {
  const { user, loading, tokenReady } = useAuth()
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent" />
      </div>
    )
  }
  
  // Don't redirect if user needs to change password
  if (user && tokenReady && !user.force_password_change) {
    return <Navigate to="/dashboard" replace />
  }
  
  return children
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={
        <PublicRoute>
          <LoginPage />
        </PublicRoute>
      } />
      <Route path="/" element={
        <ProtectedRoute>
          <Layout />
        </ProtectedRoute>
      }>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="events" element={<EventsPage />} />
        <Route path="events/:id" element={<EventDetailPage />} />
        <Route path="surprises" element={<SurprisesPage />} />
        <Route path="coming-soon" element={<ComingSoonPage />} />
        <Route path="coming-soon/:pageId" element={<ComingSoonPage />} />
        <Route path="motivations" element={<MotivationsPage />} />
        <Route path="admin" element={
          <ProtectedRoute adminOnly>
            <AdminPage />
          </ProtectedRoute>
        } />
        <Route path="settings" element={<SettingsPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ThemeProvider>
          <AppRoutes />
          <Toaster
            position="top-center"
            toastOptions={{
              duration: 3000,
              style: {
                background: 'var(--color-card)',
                color: 'var(--color-text)',
                borderRadius: 'var(--border-radius)',
              },
              success: {
                iconTheme: {
                  primary: 'var(--color-primary)',
                  secondary: 'white',
                },
              },
              error: {
                iconTheme: {
                  primary: '#EF4444',
                  secondary: 'white',
                },
              },
            }}
          />
        </ThemeProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}