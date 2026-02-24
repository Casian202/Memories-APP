import { useState, useEffect, useCallback, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Clock, Plus, Trash2, X, Image, Quote, Calendar,
  ChevronLeft, ChevronRight, Sparkles, Upload, Type
} from 'lucide-react'
import api from '../services/api'
import { useAuth } from '../context/AuthContext'
import { format, differenceInDays } from 'date-fns'
import { ro } from 'date-fns/locale'
import toast from 'react-hot-toast'

export default function ComingSoonPage() {
  const { isAdmin } = useAuth()
  const queryClient = useQueryClient()
  const [showAdminPanel, setShowAdminPanel] = useState(false)
  const [showCreateModal, setShowCreateModal] = useState(false)

  const { data: page, isLoading } = useQuery({
    queryKey: ['coming-soon-active'],
    queryFn: async () => {
      const response = await api.get('/coming-soon/active')
      return response.data
    }
  })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent" />
      </div>
    )
  }

  // No active page
  if (!page) {
    return (
      <div className="space-y-6">
        <h1 className="page-header">În curând</h1>
        <div className="card text-center py-16">
          <Sparkles className="w-16 h-16 mx-auto text-primary/40 mb-4" />
          <h2 className="text-xl font-semibold text-text mb-2">Ceva special se pregătește...</h2>
          <p className="text-gray-500 mb-6">Revino mai târziu pentru surprize!</p>
          {isAdmin() && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="btn btn-primary"
            >
              <Plus className="w-5 h-5" />
              Creează Pagina
            </button>
          )}
        </div>
        <AnimatePresence>
          {showCreateModal && (
            <CreatePageModal onClose={() => setShowCreateModal(false)} />
          )}
        </AnimatePresence>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-header flex items-center gap-3">
            {page.is_revealed ? (
              <Sparkles className="w-7 h-7 text-primary" />
            ) : (
              <Clock className="w-7 h-7 text-primary animate-pulse" />
            )}
            {page.current_name}
          </h1>
          {!page.is_revealed && (
            <CountdownBanner revealDate={page.reveal_date} />
          )}
        </div>
        {isAdmin() && (
          <button
            onClick={() => setShowAdminPanel(!showAdminPanel)}
            className="btn btn-ghost text-sm"
          >
            {showAdminPanel ? 'Ascunde Admin' : 'Admin'}
          </button>
        )}
      </div>

      {/* Admin Panel */}
      <AnimatePresence>
        {showAdminPanel && isAdmin() && (
          <AdminPanel page={page} />
        )}
      </AnimatePresence>

      {/* Description */}
      {page.description && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="card text-center"
        >
          <p className="text-text text-lg italic whitespace-pre-wrap">
            {page.description}
          </p>
        </motion.div>
      )}

      {/* Photo Slideshow */}
      {page.photos?.length > 0 && (
        <PhotoSlideshow photos={page.photos} />
      )}

      {/* Floating Quotes */}
      {page.quotes?.length > 0 && (
        <FloatingQuotes quotes={page.quotes} />
      )}

      {/* Empty state if no content */}
      {(!page.photos?.length && !page.quotes?.length) && (
        <div className="card text-center py-16">
          <Sparkles className="w-16 h-16 mx-auto text-primary/30 mb-4" />
          <p className="text-gray-500 text-lg">
            {page.is_revealed
              ? 'Conținutul va fi adăugat în curând...'
              : 'Ceva special se pregătește...'}
          </p>
        </div>
      )}
    </div>
  )
}

// ============ COUNTDOWN BANNER ============
function CountdownBanner({ revealDate }) {
  const [now, setNow] = useState(new Date())

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60000) // update every minute
    return () => clearInterval(timer)
  }, [])

  const target = new Date(revealDate)
  const daysLeft = differenceInDays(target, now)

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      className="flex items-center gap-2 mt-1"
    >
      <Calendar className="w-4 h-4 text-primary/70" />
      <span className="text-sm text-gray-500">
        Se dezvăluie pe {format(target, 'd MMMM yyyy', { locale: ro })}
        {daysLeft > 0 && (
          <span className="ml-1 text-primary font-medium">
            ({daysLeft} {daysLeft === 1 ? 'zi' : 'zile'} rămase)
          </span>
        )}
        {daysLeft <= 0 && daysLeft > -1 && (
          <span className="ml-1 text-primary font-bold animate-pulse"> — Astăzi! ✨</span>
        )}
      </span>
    </motion.div>
  )
}

// ============ PHOTO SLIDESHOW ============
function PhotoSlideshow({ photos }) {
  const [current, setCurrent] = useState(0)
  const [isAutoPlaying, setIsAutoPlaying] = useState(true)
  const intervalRef = useRef(null)

  const nextSlide = useCallback(() => {
    setCurrent(c => (c + 1) % photos.length)
  }, [photos.length])

  const prevSlide = useCallback(() => {
    setCurrent(c => (c - 1 + photos.length) % photos.length)
  }, [photos.length])

  // Auto-play
  useEffect(() => {
    if (isAutoPlaying && photos.length > 1) {
      intervalRef.current = setInterval(nextSlide, 5000)
      return () => clearInterval(intervalRef.current)
    }
  }, [isAutoPlaying, nextSlide, photos.length])

  const handleManualNav = (fn) => {
    setIsAutoPlaying(false)
    fn()
    // Resume auto-play after 10 seconds
    setTimeout(() => setIsAutoPlaying(true), 10000)
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative rounded-2xl overflow-hidden shadow-2xl"
      style={{ aspectRatio: '16/9' }}
    >
      <AnimatePresence mode="wait">
        <motion.img
          key={photos[current].id}
          src={`/photos/${photos[current].file_path}`}
          alt=""
          initial={{ opacity: 0, scale: 1.05 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.8 }}
          className="absolute inset-0 w-full h-full object-cover"
        />
      </AnimatePresence>

      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />

      {/* Navigation arrows */}
      {photos.length > 1 && (
        <>
          <button
            onClick={() => handleManualNav(prevSlide)}
            className="absolute left-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/40 text-white hover:bg-black/60 backdrop-blur-sm transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            onClick={() => handleManualNav(nextSlide)}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/40 text-white hover:bg-black/60 backdrop-blur-sm transition-colors"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </>
      )}

      {/* Dots indicator */}
      {photos.length > 1 && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
          {photos.map((_, i) => (
            <button
              key={i}
              onClick={() => handleManualNav(() => setCurrent(i))}
              className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${
                i === current
                  ? 'bg-white scale-110 shadow-lg'
                  : 'bg-white/50 hover:bg-white/70'
              }`}
            />
          ))}
        </div>
      )}

      {/* Photo counter */}
      <div className="absolute top-3 right-3 px-3 py-1 rounded-full bg-black/40 backdrop-blur-sm text-white text-xs">
        {current + 1} / {photos.length}
      </div>
    </motion.div>
  )
}

// ============ FLOATING QUOTES ============
function FloatingQuotes({ quotes }) {
  const [activeIndex, setActiveIndex] = useState(0)

  useEffect(() => {
    if (quotes.length <= 1) return
    const timer = setInterval(() => {
      setActiveIndex(i => (i + 1) % quotes.length)
    }, 6000)
    return () => clearInterval(timer)
  }, [quotes.length])

  return (
    <div className="relative min-h-[180px]">
      <AnimatePresence mode="wait">
        <motion.div
          key={activeIndex}
          initial={{ opacity: 0, y: 30, rotateX: -10 }}
          animate={{ opacity: 1, y: 0, rotateX: 0 }}
          exit={{ opacity: 0, y: -30, rotateX: 10 }}
          transition={{ duration: 0.8, ease: 'easeInOut' }}
          className="card text-center py-8 px-6 relative overflow-hidden"
        >
          {/* Decorative quote marks */}
          <div className="absolute top-2 left-4 text-6xl text-primary/10 font-serif leading-none">"</div>
          <div className="absolute bottom-2 right-4 text-6xl text-primary/10 font-serif leading-none rotate-180">"</div>

          <Quote className="w-8 h-8 text-primary/40 mx-auto mb-4" />
          <p className="text-lg sm:text-xl text-text italic leading-relaxed relative z-10 font-body">
            {quotes[activeIndex].text}
          </p>
          {quotes[activeIndex].author && (
            <p className="mt-4 text-sm text-primary/70 font-medium">
              — {quotes[activeIndex].author}
            </p>
          )}

          {/* Quote dots */}
          {quotes.length > 1 && (
            <div className="flex justify-center gap-2 mt-4">
              {quotes.map((_, i) => (
                <div
                  key={i}
                  className={`w-1.5 h-1.5 rounded-full transition-all ${
                    i === activeIndex ? 'bg-primary scale-125' : 'bg-gray-300'
                  }`}
                />
              ))}
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}

// ============ ADMIN PANEL ============
function AdminPanel({ page }) {
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
      queryClient.invalidateQueries(['coming-soon-active'])
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
      queryClient.invalidateQueries(['coming-soon-active'])
      toast.success('Pozele au fost încărcate!')
    },
    onError: () => toast.error('Eroare la încărcarea pozelor')
  })

  const deletePhotoMutation = useMutation({
    mutationFn: async (photoId) => {
      await api.delete(`/coming-soon/photos/${photoId}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['coming-soon-active'])
      toast.success('Poza a fost ștearsă')
    }
  })

  const addQuoteMutation = useMutation({
    mutationFn: async (data) => {
      return (await api.post(`/coming-soon/${page.id}/quotes`, data)).data
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['coming-soon-active'])
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
      queryClient.invalidateQueries(['coming-soon-active'])
      toast.success('Citatul a fost șters')
    }
  })

  const handleFileUpload = (e) => {
    const files = Array.from(e.target.files)
    if (files.length > 0) {
      uploadPhotosMutation.mutate(files)
    }
  }

  const handleSave = () => {
    updateMutation.mutate({
      real_name: realName,
      display_name: displayName,
      description: description || null,
      reveal_date: revealDate
    })
  }

  const handleAddQuote = () => {
    if (!newQuote.trim()) return
    addQuoteMutation.mutate({
      text: newQuote.trim(),
      author: newQuoteAuthor.trim() || null,
      sort_order: (page.quotes?.length || 0)
    })
  }

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      className="space-y-4"
    >
      {/* Settings Card */}
      <div className="card space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-text">Setări Pagină</h3>
          <button
            onClick={() => setEditMode(!editMode)}
            className="btn btn-ghost text-sm"
          >
            {editMode ? 'Anulează' : 'Editează'}
          </button>
        </div>

        {editMode ? (
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-text mb-1">Numele afișat (înainte de dezvăluire)</label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="input"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text mb-1">Numele real (după dezvăluire)</label>
              <input
                type="text"
                value={realName}
                onChange={(e) => setRealName(e.target.value)}
                className="input"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text mb-1">Data dezvăluirii</label>
              <input
                type="date"
                value={revealDate}
                onChange={(e) => setRevealDate(e.target.value)}
                className="input"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text mb-1">Descriere</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="input min-h-[80px]"
                rows={3}
              />
            </div>
            <button
              onClick={handleSave}
              disabled={updateMutation.isPending}
              className="btn btn-primary w-full"
            >
              {updateMutation.isPending ? 'Se salvează...' : 'Salvează'}
            </button>
          </div>
        ) : (
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Nume afișat:</span>
              <span className="text-text font-medium">{page.display_name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Nume real:</span>
              <span className="text-text font-medium">{page.real_name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Data dezvăluirii:</span>
              <span className="text-text font-medium">{page.reveal_date}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Status:</span>
              <span className={`font-medium ${page.is_revealed ? 'text-green-600' : 'text-primary'}`}>
                {page.is_revealed ? 'Dezvăluit ✓' : 'Ascuns'}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Photos Management */}
      <div className="card space-y-3">
        <h3 className="font-semibold text-text flex items-center gap-2">
          <Image className="w-5 h-5" />
          Poze Slideshow ({page.photos?.length || 0})
        </h3>

        {/* Upload */}
        <label className="block border-2 border-dashed border-gray-300 hover:border-primary rounded-xl cursor-pointer transition-colors">
          <input
            type="file"
            multiple
            accept="image/*"
            className="hidden"
            onChange={handleFileUpload}
            disabled={uploadPhotosMutation.isPending}
          />
          <div className="flex items-center justify-center gap-2 py-4 text-gray-500">
            {uploadPhotosMutation.isPending ? (
              <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <Upload className="w-5 h-5" />
                <span className="text-sm">Adaugă poze</span>
              </>
            )}
          </div>
        </label>

        {/* Photo thumbnails */}
        {page.photos?.length > 0 && (
          <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
            {page.photos.map((photo) => (
              <div key={photo.id} className="relative aspect-square group">
                <img
                  src={`/photos/${photo.file_path}`}
                  alt=""
                  className="w-full h-full object-cover rounded-lg"
                />
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

      {/* Quotes Management */}
      <div className="card space-y-3">
        <h3 className="font-semibold text-text flex items-center gap-2">
          <Type className="w-5 h-5" />
          Citate ({page.quotes?.length || 0})
        </h3>

        {/* Add quote form */}
        <div className="space-y-2">
          <textarea
            value={newQuote}
            onChange={(e) => setNewQuote(e.target.value)}
            className="input min-h-[60px]"
            placeholder="Textul citatului..."
            rows={2}
          />
          <div className="flex gap-2">
            <input
              type="text"
              value={newQuoteAuthor}
              onChange={(e) => setNewQuoteAuthor(e.target.value)}
              className="input flex-1"
              placeholder="Autor (opțional)"
            />
            <button
              onClick={handleAddQuote}
              disabled={!newQuote.trim() || addQuoteMutation.isPending}
              className="btn btn-primary"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Existing quotes */}
        {page.quotes?.length > 0 && (
          <div className="space-y-2">
            {page.quotes.map((quote) => (
              <div key={quote.id} className="flex items-start gap-2 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                <Quote className="w-4 h-4 text-primary/50 mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-text italic">"{quote.text}"</p>
                  {quote.author && (
                    <p className="text-xs text-gray-500 mt-1">— {quote.author}</p>
                  )}
                </div>
                <button
                  onClick={() => deleteQuoteMutation.mutate(quote.id)}
                  className="p-1 text-red-500 hover:bg-red-50 rounded flex-shrink-0"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  )
}

// ============ CREATE PAGE MODAL ============
function CreatePageModal({ onClose }) {
  const [realName, setRealName] = useState('')
  const [displayName, setDisplayName] = useState('În curând')
  const [description, setDescription] = useState('')
  const [revealDate, setRevealDate] = useState('')
  const queryClient = useQueryClient()

  const createMutation = useMutation({
    mutationFn: async (data) => {
      return (await api.post('/coming-soon', data)).data
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['coming-soon-active'])
      queryClient.invalidateQueries(['coming-soon-nav'])
      toast.success('Pagina a fost creată!')
      onClose()
    },
    onError: () => toast.error('Eroare la creare')
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!realName || !revealDate) {
      toast.error('Completează numele real și data dezvăluirii')
      return
    }
    createMutation.mutate({
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
          <h2 className="text-lg font-bold text-text">Pagină Nouă</h2>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-200">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-text mb-1">
              Numele real al paginii *
            </label>
            <input
              type="text"
              value={realName}
              onChange={(e) => setRealName(e.target.value)}
              className="input"
              placeholder="ex: Ziua noastră specială"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-text mb-1">
              Numele afișat (înainte de dezvăluire)
            </label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="input"
              placeholder="În curând"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-text mb-1">
              Data dezvăluirii *
            </label>
            <input
              type="date"
              value={revealDate}
              onChange={(e) => setRevealDate(e.target.value)}
              className="input"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-text mb-1">
              Descriere
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="input min-h-[80px]"
              placeholder="O scurtă descriere..."
              rows={3}
            />
          </div>

          <button
            type="submit"
            disabled={createMutation.isPending}
            className="btn btn-primary w-full"
          >
            {createMutation.isPending ? 'Se creează...' : 'Creează Pagina'}
          </button>
        </form>
      </motion.div>
    </motion.div>
  )
}
