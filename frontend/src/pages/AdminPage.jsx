import { useState, useEffect, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { Shield, Users, Palette, Calendar, Database, Settings, Eye, EyeOff, Heart, Save, RotateCcw, Trash2, Upload, X, Image, Check, Loader2, Clock, Sparkles, Plus } from 'lucide-react'
import api from '../services/api'
import toast from 'react-hot-toast'

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState('relationship')

  const tabs = [
    { id: 'relationship', label: 'Relație', icon: Heart },
    { id: 'themes', label: 'Teme', icon: Palette },
    { id: 'coming-soon', label: 'În curând', icon: Clock },
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
      {activeTab === 'coming-soon' && <ComingSoonManager />}
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

function ComingSoonManager() {
  const queryClient = useQueryClient()
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [expandedPage, setExpandedPage] = useState(null)

  const { data: pages, isLoading } = useQuery({
    queryKey: ['coming-soon-all'],
    queryFn: async () => {
      const response = await api.get('/coming-soon')
      return response.data
    }
  })

  const deleteMutation = useMutation({
    mutationFn: async (pageId) => {
      await api.delete(`/coming-soon/${pageId}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['coming-soon-all'])
      queryClient.invalidateQueries(['coming-soon-nav'])
      queryClient.invalidateQueries(['coming-soon-active'])
      toast.success('Pagina a fost ștearsă')
    },
    onError: () => toast.error('Eroare la ștergere')
  })

  const toggleActiveMutation = useMutation({
    mutationFn: async (pageId) => {
      return (await api.post(`/coming-soon/${pageId}/toggle-active`)).data
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['coming-soon-all'])
      queryClient.invalidateQueries(['coming-soon-nav'])
      queryClient.invalidateQueries(['coming-soon-active'])
      toast.success('Starea a fost schimbată!')
    },
    onError: () => toast.error('Eroare la schimbare')
  })

  const createMutation = useMutation({
    mutationFn: async (data) => {
      return (await api.post('/coming-soon', data)).data
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['coming-soon-all'])
      queryClient.invalidateQueries(['coming-soon-nav'])
      queryClient.invalidateQueries(['coming-soon-active'])
      toast.success('Pagina a fost creată!')
      setShowCreateModal(false)
    },
    onError: () => toast.error('Eroare la creare')
  })

  if (isLoading) return <div className="h-64 skeleton rounded-lg" />

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">
          Creează și gestionează pagini „În curând" care se dezvăluie la o dată specifică.
        </p>
        <button onClick={() => setShowCreateModal(true)} className="btn btn-primary">
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">Pagină Nouă</span>
        </button>
      </div>

      {pages?.length === 0 && (
        <div className="card text-center py-12">
          <Clock className="w-12 h-12 mx-auto text-gray-300 mb-3" />
          <h3 className="text-lg font-medium text-text mb-2">Nicio pagină</h3>
          <p className="text-gray-500 text-sm">Creează prima pagină „În curând"</p>
        </div>
      )}

      <div className="space-y-3">
        {pages?.map((page) => (
          <CSPageCard
            key={page.id}
            page={page}
            isExpanded={expandedPage === page.id}
            onToggleExpand={() => setExpandedPage(expandedPage === page.id ? null : page.id)}
            onDelete={() => {
              if (confirm('Ești sigur că vrei să ștergi această pagină?')) {
                deleteMutation.mutate(page.id)
              }
            }}
            onToggleActive={() => toggleActiveMutation.mutate(page.id)}
          />
        ))}
      </div>

      {/* Create Modal */}
      <AnimatePresence>
        {showCreateModal && (
          <CSCreateModal
            onClose={() => setShowCreateModal(false)}
            onCreate={(data) => createMutation.mutate(data)}
            isCreating={createMutation.isPending}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

function CSPageCard({ page, isExpanded, onToggleExpand, onDelete, onToggleActive }) {
  const queryClient = useQueryClient()
  const [editMode, setEditMode] = useState(false)
  const [realName, setRealName] = useState(page.real_name)
  const [displayName, setDisplayName] = useState(page.display_name)
  const [description, setDescription] = useState(page.description || '')
  const [revealDate, setRevealDate] = useState(page.reveal_date)
  const [newQuote, setNewQuote] = useState('')
  const [newQuoteAuthor, setNewQuoteAuthor] = useState('')

  const updateMutation = useMutation({
    mutationFn: async (data) => {
      return (await api.put(`/coming-soon/${page.id}`, data)).data
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['coming-soon-all'])
      queryClient.invalidateQueries(['coming-soon-nav'])
      toast.success('Pagina a fost actualizată!')
      setEditMode(false)
    },
    onError: () => toast.error('Eroare la actualizare')
  })

  const uploadPhotosMutation = useMutation({
    mutationFn: async (files) => {
      const formData = new FormData()
      files.forEach(f => formData.append('files', f))
      return (await api.post(`/coming-soon/${page.id}/photos`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })).data
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['coming-soon-all'])
      toast.success('Pozele au fost încărcate!')
    },
    onError: () => toast.error('Eroare la încărcarea pozelor')
  })

  const deletePhotoMutation = useMutation({
    mutationFn: async (photoId) => {
      await api.delete(`/coming-soon/photos/${photoId}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['coming-soon-all'])
      toast.success('Poza a fost ștearsă')
    }
  })

  const addQuoteMutation = useMutation({
    mutationFn: async (data) => {
      return (await api.post(`/coming-soon/${page.id}/quotes`, data)).data
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['coming-soon-all'])
      setNewQuote('')
      setNewQuoteAuthor('')
      toast.success('Citatul a fost adăugat!')
    },
    onError: () => toast.error('Eroare la adăugare')
  })

  const deleteQuoteMutation = useMutation({
    mutationFn: async (quoteId) => {
      await api.delete(`/coming-soon/quotes/${quoteId}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['coming-soon-all'])
      toast.success('Citatul a fost șters')
    }
  })

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`card overflow-hidden transition-all ${page.is_active ? 'ring-2 ring-primary' : 'opacity-80'}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between cursor-pointer" onClick={onToggleExpand}>
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ background: 'rgba(var(--color-primary-rgb), 0.1)' }}>
            {page.is_revealed ? (
              <Sparkles className="w-5 h-5" style={{ color: 'var(--color-primary)' }} />
            ) : (
              <Clock className="w-5 h-5" style={{ color: 'var(--color-primary)' }} />
            )}
          </div>
          <div className="min-w-0">
            <h3 className="font-semibold text-text truncate">{page.current_name}</h3>
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <span>Real: {page.real_name}</span>
              <span>•</span>
              <span>Data: {page.reveal_date}</span>
              <span>•</span>
              <span>{page.photos?.length || 0} poze, {page.quotes?.length || 0} citate</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {page.is_active ? (
            <span className="badge badge-primary text-xs">Activă</span>
          ) : (
            <span className="text-xs text-gray-400">Inactivă</span>
          )}
          {page.is_revealed && (
            <span className="text-xs text-green-600 font-medium">Dezvăluită ✓</span>
          )}
        </div>
      </div>

      {/* Expanded Content */}
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
              {/* Action Buttons */}
              <div className="flex flex-wrap gap-2">
                <button onClick={onToggleActive} className="btn btn-ghost text-xs">
                  {page.is_active ? (
                    <><EyeOff className="w-3.5 h-3.5" /> Dezactivează</>
                  ) : (
                    <><Eye className="w-3.5 h-3.5" /> Activează</>
                  )}
                </button>
                <button onClick={() => setEditMode(!editMode)} className="btn btn-ghost text-xs">
                  {editMode ? 'Anulează' : 'Editează'}
                </button>
                <button onClick={onDelete} className="btn btn-ghost text-xs text-red-500">
                  <Trash2 className="w-3.5 h-3.5" /> Șterge
                </button>
              </div>

              {/* Edit Form */}
              {editMode && (
                <div className="space-y-3 p-3 rounded-lg" style={{ background: 'rgba(var(--color-primary-rgb), 0.05)' }}>
                  <div>
                    <label className="block text-xs font-medium text-text mb-1">Numele afișat</label>
                    <input type="text" value={displayName} onChange={(e) => setDisplayName(e.target.value)} className="input text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-text mb-1">Numele real</label>
                    <input type="text" value={realName} onChange={(e) => setRealName(e.target.value)} className="input text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-text mb-1">Data dezvăluirii</label>
                    <input type="date" value={revealDate} onChange={(e) => setRevealDate(e.target.value)} className="input text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-text mb-1">Descriere</label>
                    <textarea value={description} onChange={(e) => setDescription(e.target.value)} className="input text-sm min-h-[60px]" rows={2} />
                  </div>
                  <button
                    onClick={() => updateMutation.mutate({
                      real_name: realName, display_name: displayName,
                      description: description || null, reveal_date: revealDate
                    })}
                    disabled={updateMutation.isPending}
                    className="btn btn-primary text-sm w-full"
                  >
                    {updateMutation.isPending ? 'Se salvează...' : 'Salvează'}
                  </button>
                </div>
              )}

              {/* Photos */}
              <div className="space-y-2">
                <h4 className="text-sm font-semibold text-text flex items-center gap-2">
                  <Image className="w-4 h-4" /> Poze Slideshow ({page.photos?.length || 0})
                </h4>
                <label className="block border-2 border-dashed border-gray-300 hover:border-primary rounded-lg cursor-pointer transition-colors">
                  <input type="file" multiple accept="image/*" className="hidden"
                    onChange={(e) => {
                      const files = Array.from(e.target.files)
                      if (files.length > 0) uploadPhotosMutation.mutate(files)
                    }}
                    disabled={uploadPhotosMutation.isPending}
                  />
                  <div className="flex items-center justify-center gap-2 py-3 text-gray-500">
                    {uploadPhotosMutation.isPending ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <><Upload className="w-4 h-4" /><span className="text-sm">Adaugă poze</span></>
                    )}
                  </div>
                </label>
                {page.photos?.length > 0 && (
                  <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                    {page.photos.map((photo) => (
                      <div key={photo.id} className="relative aspect-square group">
                        <img src={`/photos/${photo.file_path}`} alt="" className="w-full h-full object-cover rounded-lg" />
                        <button
                          onClick={() => deletePhotoMutation.mutate(photo.id)}
                          className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Quotes */}
              <div className="space-y-2">
                <h4 className="text-sm font-semibold text-text flex items-center gap-2">
                  <Calendar className="w-4 h-4" /> Citate ({page.quotes?.length || 0})
                </h4>
                <div className="flex gap-2">
                  <div className="flex-1 space-y-1">
                    <input type="text" value={newQuote} onChange={(e) => setNewQuote(e.target.value)}
                      className="input text-sm" placeholder="Textul citatului..." />
                    <input type="text" value={newQuoteAuthor} onChange={(e) => setNewQuoteAuthor(e.target.value)}
                      className="input text-sm" placeholder="Autor (opțional)" />
                  </div>
                  <button
                    onClick={() => {
                      if (!newQuote.trim()) return
                      addQuoteMutation.mutate({
                        text: newQuote.trim(),
                        author: newQuoteAuthor.trim() || null,
                        sort_order: (page.quotes?.length || 0)
                      })
                    }}
                    disabled={!newQuote.trim() || addQuoteMutation.isPending}
                    className="btn btn-primary self-start"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
                {page.quotes?.length > 0 && (
                  <div className="space-y-1">
                    {page.quotes.map((quote) => (
                      <div key={quote.id} className="flex items-center justify-between p-2 rounded-lg text-sm"
                        style={{ background: 'rgba(var(--color-text-rgb), 0.05)' }}>
                        <div className="min-w-0 flex-1">
                          <span className="text-text italic">"{quote.text}"</span>
                          {quote.author && <span className="text-gray-500 ml-1">— {quote.author}</span>}
                        </div>
                        <button onClick={() => deleteQuoteMutation.mutate(quote.id)}
                          className="p-1 text-red-500 hover:bg-red-50 rounded flex-shrink-0 ml-2">
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

function CSCreateModal({ onClose, onCreate, isCreating }) {
  const [realName, setRealName] = useState('')
  const [displayName, setDisplayName] = useState('În curând')
  const [description, setDescription] = useState('')
  const [revealDate, setRevealDate] = useState('')

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!realName || !revealDate) {
      toast.error('Completează numele real și data dezvăluirii')
      return
    }
    onCreate({
      real_name: realName,
      display_name: displayName || 'În curând',
      description: description || null,
      reveal_date: revealDate
    })
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="card w-full max-w-md"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-text">Pagină Nouă „În curând"</h2>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-200">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-text mb-1">Numele real al paginii *</label>
            <input type="text" value={realName} onChange={(e) => setRealName(e.target.value)}
              className="input" placeholder="ex: Ziua noastră specială" required />
          </div>
          <div>
            <label className="block text-sm font-medium text-text mb-1">Numele afișat (înainte de dezvăluire)</label>
            <input type="text" value={displayName} onChange={(e) => setDisplayName(e.target.value)}
              className="input" placeholder="În curând" />
          </div>
          <div>
            <label className="block text-sm font-medium text-text mb-1">Data dezvăluirii *</label>
            <input type="date" value={revealDate} onChange={(e) => setRevealDate(e.target.value)}
              className="input" required />
          </div>
          <div>
            <label className="block text-sm font-medium text-text mb-1">Descriere</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)}
              className="input min-h-[80px]" placeholder="O scurtă descriere..." rows={3} />
          </div>
          <button type="submit" disabled={isCreating} className="btn btn-primary w-full">
            {isCreating ? 'Se creează...' : 'Creează Pagina'}
          </button>
        </form>
      </motion.div>
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