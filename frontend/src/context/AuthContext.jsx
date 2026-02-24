import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import api from '../services/api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [tokenReady, setTokenReady] = useState(false)

  const fetchUser = useCallback(async () => {
    try {
      const response = await api.get('/auth/me')
      setUser(response.data)
      setTokenReady(true)
    } catch (error) {
      localStorage.removeItem('access_token')
      localStorage.removeItem('refresh_token')
      setUser(null)
      setTokenReady(false)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const token = localStorage.getItem('access_token')
    if (token) {
      fetchUser()
    } else {
      setLoading(false)
      setTokenReady(false)
    }
  }, [fetchUser])

  const login = async (username, password) => {
    const response = await api.post('/auth/login/json', { username, password })
    const { access_token, refresh_token, user: userData } = response.data
    
    // Save tokens first
    localStorage.setItem('access_token', access_token)
    localStorage.setItem('refresh_token', refresh_token)
    
    // Small delay to ensure localStorage is synced
    await new Promise(resolve => setTimeout(resolve, 50))
    
    // Now set user and mark token as ready
    setUser(userData)
    setTokenReady(true)
    
    return userData
  }

  const logout = async () => {
    try {
      await api.post('/auth/logout')
    } catch (error) {
      // Ignore logout errors
    } finally {
      localStorage.removeItem('access_token')
      localStorage.removeItem('refresh_token')
      setUser(null)
    }
  }

  const changePassword = async (currentPassword, newPassword) => {
    const response = await api.post('/auth/change-password', {
      current_password: currentPassword,
      new_password: newPassword
    })
    
    // Update user state with fresh data from response
    if (response.data.user) {
      setUser(response.data.user)
    } else {
      // Fallback: force clear the flag and re-fetch
      setUser(prev => ({ ...prev, force_password_change: false }))
    }
    
    // Re-fetch user to ensure state is fully synced
    await fetchUser()
    
    return response.data
  }

  const isAdmin = () => user?.is_admin === true

  const value = {
    user,
    loading,
    tokenReady,
    login,
    logout,
    changePassword,
    isAdmin,
    fetchUser
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export { AuthContext }