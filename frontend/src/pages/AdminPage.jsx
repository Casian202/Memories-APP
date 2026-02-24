import { useState, useEffect, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { Shield, Users, Palette, Calendar, Database, Settings, Eye, EyeOff, Heart, Save, RotateCcw, Trash2, Upload, X, Image, Check, Loader2 } from 'lucide-react'
import api from '../services/api'
import toast from 'react-hot-toast'

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState('relationship')

  const tabs = [
    { id: 'relationship', label: 'Relație', icon: Heart },
    { id: 'themes', label: 'Teme', icon: Palette },
    { id: 'users', label: 'Utilizatori', icon: Users },
    { id: 'system', label: 'Sistem', icon: Database },
  ]

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Shield className="w-6 h-6 md:w-8 md:h-8 text-primary" />
        <h1 className="page-header">Panou Administrare</h1>
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
      {activeTab === 'relationship' && <RelationshipManager />}
      {activeTab === 'themes' && <ThemesManager />}
      {activeTab === 'users' && <UsersManager />}
      {activeTab === 'system' && <SystemManager />}
    </div>
  )
}

function RelationshipManager() {
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
      toast.success('Setările relației au fost salvate!')
    } catch (error) {
      toast.error('Eroare la salvare')
    } finally {
      setLoading(false)
    }
  }

  if (isLoading) return <div className="h-64 skeleton rounded-lg" />

  const startDate = formData.start_date ? new Date(formData.start_date) : null
  const now = new Date()
  const yearsTotal = startDate ? Math.floor((now - startDate) / (365.25 * 24 * 60 * 60 * 1000)) : 0

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
      {/* Settings Form */}
      <div className="card">
        <h2 className="text-lg font-semibold text-text mb-4 flex items-center gap-2">
          <Heart className="w-5 h-5 text-primary" />
          Setări Relație
        </h2>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">Numele relației / cuplului</label>
            <input
              type="text"
              value={formData.relationship_name}
              onChange={(e) => setFormData({ ...formData, relationship_name: e.target.value })}
              className="input"
              placeholder="Ex: Noi doi, Dragostea noastră..."
            />
            <p className="text-xs text-gray-400 mt-1">
              Acest nume apare pe dashboard deasupra contorului
            </p>
          </div>

          <div>
            <label className="label">Data când sunteți împreună</label>
            <input
              type="date"
              value={formData.start_date}
              onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
              className="input"
            />
            <p className="text-xs text-gray-400 mt-1">
              Folosit pentru contorul „Împreună din..." de pe dashboard
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
              Se va activa tema de aniversare automat în această zi. 
              Se calculează câți ani faceți.
            </p>
          </div>

          <button type="submit" disabled={loading} className="btn btn-primary w-full sm:w-auto">
            {loading ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <Save className="w-4 h-4" />
                Salvează Setările
              </>
            )}
          </button>
        </form>
      </div>

      {/* Preview Card */}
      <div className="card bg-gradient-to-br from-primary/5 to-secondary/5">
        <h2 className="text-lg font-semibold text-text mb-4">Previzualizare</h2>
        
        <div className="text-center py-4">
          <Heart className="w-10 h-10 text-primary fill-primary mx-auto mb-3" />
          <h3 className="text-xl font-bold text-primary mb-2">
            {formData.relationship_name || 'Numele relației'}
          </h3>
          
          {startDate && (
            <>
              <div className="grid grid-cols-2 gap-2 max-w-xs mx-auto mb-3">
                <div className="bg-white/80 rounded-lg p-2">
                  <div className="text-2xl font-bold text-primary">{yearsTotal}</div>
                  <div className="text-xs text-gray-500">Ani</div>
                </div>
                <div className="bg-white/80 rounded-lg p-2">
                  <div className="text-2xl font-bold text-primary">
                    {Math.floor((now - startDate) / (24 * 60 * 60 * 1000))}
                  </div>
                  <div className="text-xs text-gray-500">Total Zile</div>
                </div>
              </div>
              <p className="text-sm text-gray-500">
                Împreună din {startDate.toLocaleDateString('ro-RO', { day: 'numeric', month: 'long', year: 'numeric' })}
              </p>
            </>
          )}
        </div>

        {/* Partner Info */}
        <div className="mt-4 pt-4 border-t border-gray-200/50">
          <h4 className="text-sm font-semibold text-gray-600 mb-2">Parteneri</h4>
          <div className="flex gap-3">
            <div className="flex-1 bg-white/80 rounded-lg p-3 text-center">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-1">
                <Users className="w-4 h-4 text-primary" />
              </div>
              <p className="text-sm font-medium">{relationship?.partner1_name || 'Partener 1'}</p>
            </div>
            <div className="flex items-center">
              <Heart className="w-4 h-4 text-primary fill-primary" />
            </div>
            <div className="flex-1 bg-white/80 rounded-lg p-3 text-center">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-1">
                <Users className="w-4 h-4 text-primary" />
              </div>
              <p className="text-sm font-medium">{relationship?.partner2_name || 'Partener 2'}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function ThemesManager() {
  const queryClient = useQueryClient()
  const [expandedTheme, setExpandedTheme] = useState(null)

  const { data: themes, isLoading } = useQuery({
    queryKey: ['themes'],
    queryFn: async () => {
      const response = await api.get('/themes')
      return response.data
    }
  })

  const activateMutation = useMutation({
    mutationFn: async (themeId) => {
      await api.post(`/themes/${themeId}/activate`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['themes'])
      toast.success('Tema a fost activată!')
      window.location.reload()
    },
    onError: () => {
      toast.error('Eroare la activare')
    }
  })

  const uploadBgMutation = useMutation({
    mutationFn: async ({ themeId, file }) => {
      const formData = new FormData()
      formData.append('file', file)
      const response = await api.post(`/themes/${themeId}/background`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['themes'])
      queryClient.invalidateQueries(['active-theme'])
      toast.success('Imaginea de fundal a fost încărcată!')
    },
    onError: (err) => {
      toast.error(err?.response?.data?.detail || 'Eroare la încărcare')
    }
  })

  const deleteBgMutation = useMutation({
    mutationFn: async (themeId) => {
      await api.delete(`/themes/${themeId}/background`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['themes'])
      queryClient.invalidateQueries(['active-theme'])
      toast.success('Imaginea de fundal a fost ștearsă!')
    },
    onError: (err) => {
      toast.error(err?.response?.data?.detail || 'Eroare la ștergere')
    }
  })

  if (isLoading) return <div className="h-64 skeleton rounded-lg" />

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-500">
        Selectează o temă și adaugă imagini de fundal personalizate. Temele sezoniere se activează automat.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
        {themes?.map((theme) => (
          <ThemeCard
            key={theme.id}
            theme={theme}
            isExpanded={expandedTheme === theme.id}
            onToggleExpand={() => setExpandedTheme(expandedTheme === theme.id ? null : theme.id)}
            onActivate={() => activateMutation.mutate(theme.id)}
            isActivating={activateMutation.isPending}
            onUploadBg={(file) => uploadBgMutation.mutate({ themeId: theme.id, file })}
            isUploadingBg={uploadBgMutation.isPending}
            onDeleteBg={() => deleteBgMutation.mutate(theme.id)}
            isDeletingBg={deleteBgMutation.isPending}
          />
        ))}
      </div>
    </div>
  )
}

function ThemeCard({ theme, isExpanded, onToggleExpand, onActivate, isActivating, onUploadBg, isUploadingBg, onDeleteBg, isDeletingBg }) {
  const fileInputRef = useRef(null)
  const [dragOver, setDragOver] = useState(false)
  const [previewUrl, setPreviewUrl] = useState(null)

  const bgImageUrl = theme.background_image 
    ? `/photos/${theme.background_image}` 
    : null

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0]
    if (file) {
      handleFile(file)
    }
  }

  const handleFile = (file) => {
    if (!file.type.startsWith('image/')) {
      toast.error('Te rog selectează o imagine validă')
      return
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error('Imaginea depășește limita de 10MB')
      return
    }
    // Show preview
    const url = URL.createObjectURL(file)
    setPreviewUrl(url)
    // Upload
    onUploadBg(file)
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files?.[0]
    if (file) handleFile(file)
  }

  const handleDragOver = (e) => {
    e.preventDefault()
    setDragOver(true)
  }

  const handleDragLeave = () => setDragOver(false)

  // Clear preview after upload completes
  useEffect(() => {
    if (!isUploadingBg && previewUrl) {
      URL.revokeObjectURL(previewUrl)
      setPreviewUrl(null)
    }
  }, [isUploadingBg])

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`card relative overflow-hidden transition-all duration-300 ${
        theme.is_active ? 'ring-2 ring-primary shadow-lg' : ''
      } ${isExpanded ? 'sm:col-span-2 lg:col-span-3' : ''}`}
    >
      {/* Theme Preview Header - with bg image if available */}
      <div
        className="h-24 -mx-5 -mt-5 mb-3 relative cursor-pointer"
        onClick={onToggleExpand}
        style={{
          borderRadius: 'var(--border-radius) var(--border-radius) 0 0',
        }}
      >
        {/* Gradient fallback */}
        <div
          className="absolute inset-0"
          style={{
            background: `linear-gradient(135deg, ${theme.primary_color}, ${theme.secondary_color})`,
            borderRadius: 'inherit',
          }}
        />
        
        {/* Background image overlay */}
        {bgImageUrl && (
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: `url(${bgImageUrl})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              borderRadius: 'inherit',
            }}
          />
        )}
        
        {/* Dark overlay for text readability */}
        <div
          className="absolute inset-0 bg-black/20"
          style={{ borderRadius: 'inherit' }}
        />
        
        {/* Theme name */}
        <div className="absolute inset-0 flex items-center justify-center px-3">
          <span
            className="text-lg font-bold truncate drop-shadow-md"
            style={{ color: '#FFFFFF' }}
          >
            {theme.name}
          </span>
        </div>

        {/* Active indicator */}
        {theme.is_active && (
          <div className="absolute top-2 right-2 bg-white rounded-full p-1 shadow-md">
            <Check className="w-3.5 h-3.5 text-green-600" />
          </div>
        )}

        {/* Background image indicator */}
        {bgImageUrl && (
          <div className="absolute top-2 left-2 bg-white/90 rounded-full p-1 shadow-md" title="Are imagine de fundal">
            <Image className="w-3.5 h-3.5 text-blue-600" />
          </div>
        )}
      </div>

      <p className="text-xs text-gray-500 mb-3 line-clamp-2">{theme.description}</p>

      {/* Color Swatches */}
      <div className="flex gap-1.5 mb-3">
        {[theme.primary_color, theme.secondary_color, theme.accent_color, theme.background_color].filter(Boolean).map((color, i) => (
          <div
            key={i}
            className="w-6 h-6 rounded-full border-2 border-white shadow-sm"
            style={{ backgroundColor: color }}
          />
        ))}
      </div>

      {/* Status & Actions */}
      <div className="flex items-center justify-between">
        {theme.is_active ? (
          <span className="badge badge-primary">Activă</span>
        ) : theme.is_seasonal ? (
          <span className="badge badge-info">Sezonieră</span>
        ) : theme.trigger_event_type ? (
          <span className="badge badge-warning">Eveniment</span>
        ) : (
          <span className="text-xs text-gray-400">Disponibilă</span>
        )}

        <div className="flex items-center gap-2">
          <button
            onClick={onToggleExpand}
            className="btn btn-ghost text-xs px-2 py-1"
            title="Editează fundal"
          >
            <Image className="w-3.5 h-3.5" />
            <span className="hidden sm:inline ml-1">Fundal</span>
          </button>
          
          {!theme.is_active && (
            <button
              onClick={onActivate}
              disabled={isActivating}
              className="btn btn-ghost text-xs text-primary font-medium px-2 py-1"
            >
              {isActivating ? '...' : 'Activează'}
            </button>
          )}
        </div>
      </div>

      {/* Expanded: Background Image Editor */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <div className="mt-4 pt-4 border-t border-gray-200/50 space-y-4">
              <h4 className="text-sm font-semibold text-text flex items-center gap-2">
                <Image className="w-4 h-4" />
                Imagine de Fundal
              </h4>

              {/* Current Background Preview */}
              {bgImageUrl && (
                <div className="relative rounded-lg overflow-hidden group">
                  <img
                    src={bgImageUrl}
                    alt={`Fundal ${theme.name}`}
                    className="w-full h-32 sm:h-40 md:h-48 object-cover rounded-lg"
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                    <button
                      onClick={onDeleteBg}
                      disabled={isDeletingBg}
                      className="opacity-0 group-hover:opacity-100 transition-opacity bg-red-500 text-white rounded-full p-2 shadow-lg hover:bg-red-600"
                      title="Șterge imaginea de fundal"
                    >
                      {isDeletingBg ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        <Trash2 className="w-5 h-5" />
                      )}
                    </button>
                  </div>
                </div>
              )}

              {/* Upload Area */}
              <div
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onClick={() => fileInputRef.current?.click()}
                className={`relative border-2 border-dashed rounded-lg p-4 sm:p-6 text-center cursor-pointer transition-all ${
                  dragOver 
                    ? 'border-primary bg-primary/5 scale-[1.02]' 
                    : 'border-gray-300 hover:border-primary/50 hover:bg-gray-50'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                
                {isUploadingBg ? (
                  <div className="flex flex-col items-center gap-2">
                    <Loader2 className="w-8 h-8 text-primary animate-spin" />
                    <p className="text-sm text-gray-500">Se încarcă...</p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2">
                    <Upload className="w-8 h-8 text-gray-400" />
                    <p className="text-sm text-gray-600">
                      {bgImageUrl ? 'Înlocuiește imaginea' : 'Adaugă imagine de fundal'}
                    </p>
                    <p className="text-xs text-gray-400">
                      Trage o imagine sau apasă pentru a selecta
                    </p>
                    <p className="text-xs text-gray-400">
                      JPEG, PNG, WebP, GIF • Max 10MB
                    </p>
                  </div>
                )}
              </div>

              {/* Tip */}
              <p className="text-xs text-gray-400 italic">
                💡 Recomandare: folosește imagini de min. 1920×1080px pentru cel mai bun efect pe desktop.
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

function UsersManager() {
  const queryClient = useQueryClient()
  const [resetUserId, setResetUserId] = useState(null)
  const [newPassword, setNewPassword] = useState('')

  const { data: users, isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const response = await api.get('/admin/users')
      return response.data
    }
  })

  const resetMutation = useMutation({
    mutationFn: async ({ userId, password }) => {
      await api.post(`/admin/users/${userId}/reset-password`, { new_password: password })
    },
    onSuccess: () => {
      toast.success('Parola a fost resetată!')
      setResetUserId(null)
      setNewPassword('')
    },
    onError: () => {
      toast.error('Eroare la resetare')
    }
  })

  if (isLoading) return <div className="h-64 skeleton rounded-lg" />

  return (
    <div className="space-y-4">
      <div className="card bg-amber-50 border-amber-200">
        <p className="text-amber-800 text-sm">
          <Shield className="w-4 h-4 inline mr-2" />
          Aplicația este pentru exact 2 utilizatori - partenerii din cuplu.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {users?.map((user) => (
          <div key={user.id} className="card">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                <Users className="w-6 h-6 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-medium text-text truncate">{user.display_name || user.username}</h4>
                <p className="text-xs text-gray-500">@{user.username}</p>
              </div>
              {user.is_admin && (
                <span className="badge badge-primary">Admin</span>
              )}
            </div>

            <div className="text-xs text-gray-500 space-y-1 mb-3">
              <p>Creat: {new Date(user.created_at).toLocaleDateString('ro-RO')}</p>
              {user.birthday && <p>Ziua de naștere: {new Date(user.birthday).toLocaleDateString('ro-RO')}</p>}
              <p>Schimbare parolă forțată: {user.force_password_change ? 'Da' : 'Nu'}</p>
            </div>

            {resetUserId === user.id ? (
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="input text-sm flex-1"
                  placeholder="Parola nouă"
                />
                <button
                  onClick={() => resetMutation.mutate({ userId: user.id, password: newPassword })}
                  disabled={!newPassword || resetMutation.isPending}
                  className="btn btn-primary text-xs px-3"
                >
                  OK
                </button>
                <button
                  onClick={() => { setResetUserId(null); setNewPassword('') }}
                  className="btn btn-ghost text-xs px-2"
                >
                  ✕
                </button>
              </div>
            ) : (
              <button
                onClick={() => setResetUserId(user.id)}
                className="btn btn-outline text-xs w-full"
              >
                <RotateCcw className="w-3 h-3" />
                Resetează Parola
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

function SystemManager() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: async () => {
      const response = await api.get('/admin/stats')
      return response.data
    }
  })

  const backupMutation = useMutation({
    mutationFn: async () => {
      const response = await api.post('/admin/backup')
      return response.data
    },
    onSuccess: (data) => {
      toast.success(`Backup creat: ${data.file}`)
    },
    onError: () => {
      toast.error('Eroare la backup')
    }
  })

  if (isLoading) return <div className="h-64 skeleton rounded-lg" />

  return (
    <div className="space-y-4">
      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        <div className="card text-center p-3">
          <Calendar className="w-6 h-6 mx-auto text-primary mb-1" />
          <div className="text-xl font-bold">{stats?.events_count || 0}</div>
          <div className="text-xs text-gray-500">Evenimente</div>
        </div>
        <div className="card text-center p-3">
          <Eye className="w-6 h-6 mx-auto text-primary mb-1" />
          <div className="text-xl font-bold">{stats?.photos_count || 0}</div>
          <div className="text-xs text-gray-500">Fotografii</div>
        </div>
        <div className="card text-center p-3">
          <Heart className="w-6 h-6 mx-auto text-primary mb-1" />
          <div className="text-xl font-bold">{stats?.surprises_count || 0}</div>
          <div className="text-xs text-gray-500">Surprize</div>
        </div>
        <div className="card text-center p-3">
          <Database className="w-6 h-6 mx-auto text-primary mb-1" />
          <div className="text-xl font-bold">{stats?.storage_used_mb || 0} MB</div>
          <div className="text-xs text-gray-500">Stocare</div>
        </div>
      </div>

      {/* Backup */}
      <div className="card">
        <h3 className="font-semibold text-text mb-3">Backup</h3>
        <p className="text-sm text-gray-500 mb-3">
          Creează o copie de siguranță a bazei de date.
        </p>
        <button
          onClick={() => backupMutation.mutate()}
          disabled={backupMutation.isPending}
          className="btn btn-primary"
        >
          {backupMutation.isPending ? (
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <>
              <Database className="w-4 h-4" />
              Crează Backup
            </>
          )}
        </button>
      </div>
    </div>
  )
}