import { createContext, useContext, useState, useEffect } from 'react'
import api from '../services/api'

const ThemeContext = createContext(null)

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(null)
  const [loading, setLoading] = useState(true)

  const hexToRgb = (hex) => {
    if (!hex) return '0 0 0'
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
    return result
      ? `${parseInt(result[1], 16)} ${parseInt(result[2], 16)} ${parseInt(result[3], 16)}`
      : '0 0 0'
  }

  const applyTheme = (themeData) => {
    if (!themeData) return
    
    const root = document.documentElement
    
    // Set hex values (for direct CSS use)
    root.style.setProperty('--color-primary', themeData.primary_color)
    root.style.setProperty('--color-secondary', themeData.secondary_color)
    root.style.setProperty('--color-accent', themeData.accent_color || themeData.primary_color)
    root.style.setProperty('--color-background', themeData.background_color)
    root.style.setProperty('--color-text', themeData.text_color)
    root.style.setProperty('--color-card', themeData.card_background || '#FFFFFF')
    
    // Set RGB values (for Tailwind opacity modifiers like bg-primary/10)
    root.style.setProperty('--color-primary-rgb', hexToRgb(themeData.primary_color))
    root.style.setProperty('--color-secondary-rgb', hexToRgb(themeData.secondary_color))
    root.style.setProperty('--color-accent-rgb', hexToRgb(themeData.accent_color || themeData.primary_color))
    root.style.setProperty('--color-background-rgb', hexToRgb(themeData.background_color))
    root.style.setProperty('--color-text-rgb', hexToRgb(themeData.text_color))
    root.style.setProperty('--color-card-rgb', hexToRgb(themeData.card_background || '#FFFFFF'))
    
    // Fonts and border radius
    root.style.setProperty('--font-heading', themeData.font_heading || "'Inter', sans-serif")
    root.style.setProperty('--font-body', themeData.font_body || "'Inter', sans-serif")
    root.style.setProperty('--border-radius', `${themeData.border_radius || 12}px`)
    
    // Update meta theme color
    const metaThemeColor = document.querySelector('meta[name="theme-color"]')
    if (metaThemeColor) {
      metaThemeColor.setAttribute('content', themeData.primary_color)
    }
    
    // Set data-theme attribute for CSS hooks
    root.setAttribute('data-theme', themeData.slug || 'default')
  }

  const fetchTheme = async () => {
    try {
      const response = await api.get('/themes/active')
      // The /themes/active endpoint returns { theme: {...}, relationship: {...} }
      const data = response.data
      const themeData = data?.theme || data
      setTheme(themeData)
      applyTheme(themeData)
    } catch (error) {
      console.error('Failed to fetch theme:', error)
      // Apply default theme
      const defaultTheme = {
        primary_color: '#8B5CF6',
        secondary_color: '#6366F1',
        accent_color: '#A78BFA',
        background_color: '#FAFAFA',
        text_color: '#1F2937',
        card_background: '#FFFFFF',
        font_heading: "'Inter', sans-serif",
        font_body: "'Inter', sans-serif",
        border_radius: 12,
        slug: 'default'
      }
      setTheme(defaultTheme)
      applyTheme(defaultTheme)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchTheme()
  }, [])

  const value = {
    theme,
    loading,
    fetchTheme,
    setTheme: (newTheme) => {
      setTheme(newTheme)
      applyTheme(newTheme)
    }
  }

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
}

export { ThemeContext }