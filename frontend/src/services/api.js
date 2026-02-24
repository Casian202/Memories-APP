import axios from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api'

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Sync function to get token (called at request time)
const getAccessToken = () => {
  try {
    return localStorage.getItem('access_token')
  } catch {
    return null
  }
}

// Request interceptor for auth token
api.interceptors.request.use(
  (config) => {
    const token = getAccessToken()
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

// Response interceptor for token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config
    
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true
      
      const refreshToken = localStorage.getItem('refresh_token')
      if (refreshToken) {
        try {
          const response = await axios.post(`${API_BASE_URL}/auth/refresh`, {
            refresh_token: refreshToken
          })
          
          const { access_token, refresh_token } = response.data
          localStorage.setItem('access_token', access_token)
          localStorage.setItem('refresh_token', refresh_token)
          
          originalRequest.headers.Authorization = `Bearer ${access_token}`
          return api(originalRequest)
        } catch (refreshError) {
          localStorage.removeItem('access_token')
          localStorage.removeItem('refresh_token')
          window.location.href = '/login'
        }
      }
    }
    
    return Promise.reject(error)
  }
)

// Admin verification - verify admin password and get temp token
export const adminVerify = async (password) => {
  const response = await api.post('/auth/admin-verify', {
    admin_password: password
  })
  return response.data
}

// Create user with temp token (requires admin verification first)
export const createFirstUser = async (tempToken, userData) => {
  const response = await api.post('/auth/create-user', userData, {
    headers: {
      Authorization: `Bearer ${tempToken}`
    }
  })
  return response.data
}

// Create user (requires admin authentication)
export const createUser = async (userData) => {
  const response = await api.post('/auth/create-user', userData)
  return response.data
}

// Check setup status
export const getSetupStatus = async () => {
  const response = await api.get('/auth/setup-status')
  return response.data
}

export default api