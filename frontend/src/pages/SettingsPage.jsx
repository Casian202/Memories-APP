import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { Settings, User, Lock, Heart, Save, Eye, EyeOff, Key } from 'lucide-react'
import api from '../services/api'
import { useAuth } from '../context/AuthContext'
import toast from 'react-hot-toast'

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('profile')
  const { user, fetchUser } = useAuth()

  const tabs = [
    { id: 'profile', label: 'Profil', icon: User },
    { id: 'relationship', label: 'Relație', icon: Heart },
    { id: 'security', label: 'Securitate', icon: Lock },
  ]

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Settings className="w-6 h-6 md:w-8 md:h-8 text-primary" />
        <h1 className="page-header">Setări</h1>
      </div>

      {/* Tabs */}
      <div className="tab-nav">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`tab-btn ${activeTab === tab.id ? 'active' : ''}`}
          >
            <tab.icon className="w-4 h-4" />
            <span className="hidden sm:inline">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Content */}
      {activeTab === 'profile' && <ProfileSettings user={user} fetchUser={fetchUser} />}
      {activeTab === 'relationship' && <RelationshipSettings />}
      {activeTab === 'security' && <SecuritySettings />}
    </div>
  )
}

function ProfileSettings({ user, fetchUser }) {
  const [displayName, setDisplayName] = useState(user?.display_name || '')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      await api.put('/auth/me', { display_name: displayName })
      await fetchUser()
      toast.success('Profilul a fost actualizat!')
    } catch (error) {
      toast.error('Eroare la actualizare')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="card max-w-lg">
      <h2 className="text-lg font-semibold text-text mb-4">Profilul Meu</h2>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="label">Nume utilizator</label>
          <input
            type="text"
            value={user?.username || ''}
            disabled
            className="input bg-gray-100"
          />
          <p className="text-xs text-gray-400 mt-1">Numele de utilizator nu poate fi modificat</p>
        </div>

        <div>
          <label className="label">Nume afișat</label>
          <input
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className="input"
            placeholder="Numele tău frumos"
          />
        </div>

        <button type="submit" disabled={loading} className="btn btn-primary">
          {loading ? (
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <>
              <Save className="w-4 h-4" />
              Salvează
            </>
          )}
        </button>
      </form>
    </div>
  )
}

function RelationshipSettings() {
  const queryClient = useQueryClient()
  const [loading, setLoading] = useState(false)

  const { data: relationship, isLoading } = useQuery({
    queryKey: ['relationship'],
    queryFn: async () => {
      const response = await api.get('/settings/relationship')
      return response.data
    }
  })

  const [formData, setFormData] = useState({
    relationship_name: '',
    start_date: '',
    anniversary_date: ''
  })

  // Update form when data loads
  useEffect(() => {
    if (relationship) {
      setFormData({
        relationship_name: relationship.relationship_name || '',
        start_date: relationship.start_date || '',
        anniversary_date: relationship.anniversary_date || ''
      })
    }
  }, [relationship])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      await api.put('/settings/relationship', formData)
      queryClient.invalidateQueries(['relationship'])
      toast.success('Setările relației au fost actualizate!')
    } catch (error) {
      toast.error('Eroare la actualizare')
    } finally {
      setLoading(false)
    }
  }

  if (isLoading) {
    return <div className="h-64 skeleton rounded-lg max-w-lg" />
  }

  return (
    <div className="card max-w-lg">
      <h2 className="text-lg font-semibold text-text mb-4">Detalii Relație</h2>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="label">Numele relației</label>
          <input
            type="text"
            value={formData.relationship_name}
            onChange={(e) => setFormData({ ...formData, relationship_name: e.target.value })}
            className="input"
            placeholder="Ex: Noi, Dragostea noastră..."
          />
        </div>

        <div>
          <label className="label">Data de început</label>
          <input
            type="date"
            value={formData.start_date}
            onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
            className="input"
          />
          <p className="text-xs text-gray-400 mt-1">
            Această dată va fi folosită pentru contorul de pe dashboard
          </p>
        </div>

        <div>
          <label className="label">Data aniversării</label>
          <input
            type="date"
            value={formData.anniversary_date}
            onChange={(e) => setFormData({ ...formData, anniversary_date: e.target.value })}
            className="input"
          />
          <p className="text-xs text-gray-400 mt-1">
            Pentru tema specială de aniversare
          </p>
        </div>

        <button type="submit" disabled={loading} className="btn btn-primary">
          {loading ? (
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <>
              <Save className="w-4 h-4" />
              Salvează
            </>
          )}
        </button>
      </form>
    </div>
  )
}

function SecuritySettings() {
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPasswords, setShowPasswords] = useState(false)
  const [loading, setLoading] = useState(false)
  const { changePassword } = useAuth()

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (newPassword !== confirmPassword) {
      toast.error('Parolele nu coincid')
      return
    }

    if (newPassword.length < 8) {
      toast.error('Parola trebuie să aibă minim 8 caractere')
      return
    }

    if (!/[A-Z]/.test(newPassword)) {
      toast.error('Parola trebuie să conțină cel puțin o majusculă')
      return
    }

    if (!/[0-9]/.test(newPassword)) {
      toast.error('Parola trebuie să conțină cel puțin o cifră')
      return
    }

    setLoading(true)
    try {
      await changePassword(currentPassword, newPassword)
      toast.success('Parola a fost schimbată cu succes!')
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Eroare la schimbarea parolei')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="card max-w-lg">
      <h2 className="text-lg font-semibold text-text mb-4">Schimbare Parolă</h2>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="label">Parola curentă</label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
            <input
              type={showPasswords ? 'text' : 'password'}
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="input pl-10 pr-10"
              required
            />
            <button
              type="button"
              onClick={() => setShowPasswords(!showPasswords)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1 -m-1"
              aria-label={showPasswords ? 'Ascunde parola' : 'Arată parola'}
            >
              {showPasswords ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>
        </div>

        <div>
          <label className="label">Parola nouă</label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
            <input
              type={showPasswords ? 'text' : 'password'}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="input pl-10"
              required
            />
          </div>
          <p className="text-xs text-gray-400 mt-1">
            Minim 8 caractere, o majusculă și o cifră
          </p>
        </div>

        <div>
          <label className="label">Confirmă parola nouă</label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
            <input
              type={showPasswords ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="input pl-10"
              required
            />
          </div>
        </div>

        <button type="submit" disabled={loading} className="btn btn-primary">
          {loading ? (
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <>
              <Lock className="w-4 h-4" />
              Schimbă Parola
            </>
          )}
        </button>
      </form>
    </div>
  )
}