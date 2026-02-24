import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { Gift, Plus, Lock, Unlock, Eye, Send, Calendar, X, MousePointerClick, Sparkles, Heart } from 'lucide-react'
import api from '../services/api'
import { format } from 'date-fns'
import { ro } from 'date-fns/locale'
import toast from 'react-hot-toast'

export default function SurprisesPage() {
  const [showForm, setShowForm] = useState(false)
  const [activeTab, setActiveTab] = useState('received')
  const queryClient = useQueryClient()

  const { data: receivedSurprises, isLoading: loadingReceived } = useQuery({
    queryKey: ['surprises', 'received'],
    queryFn: async () => {
      const response = await api.get('/surprises/received')
      return response.data
    }
  })

  const { data: sentSurprises, isLoading: loadingSent } = useQuery({
    queryKey: ['surprises', 'sent'],
    queryFn: async () => {
      const response = await api.get('/surprises/sent')
      return response.data
    }
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="page-header">Surprize</h1>
        <button onClick={() => setShowForm(true)} className="btn btn-primary">
          <Plus className="w-5 h-5" />
          <span className="hidden sm:inline">Surpriză Nouă</span>
        </button>
      </div>

      {/* Tabs */}
      <div className="tab-nav">
        <button
          onClick={() => setActiveTab('received')}
          className={`tab-btn ${activeTab === 'received' ? 'active' : ''}`}
        >
          Primite ({receivedSurprises?.length || 0})
        </button>
        <button
          onClick={() => setActiveTab('sent')}
          className={`tab-btn ${activeTab === 'sent' ? 'active' : ''}`}
        >
          Trimise ({sentSurprises?.length || 0})
        </button>
      </div>

      {/* Content */}
      {activeTab === 'received' ? (
        <ReceivedSurprises surprises={receivedSurprises} isLoading={loadingReceived} />
      ) : (
        <SentSurprises surprises={sentSurprises} isLoading={loadingSent} />
      )}

      {/* Create Surprise Modal */}
      <AnimatePresence>
        {showForm && <CreateSurpriseModal onClose={() => setShowForm(false)} />}
      </AnimatePresence>
    </div>
  )
}

function ReceivedSurprises({ surprises, isLoading }) {
  return isLoading ? (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {[1, 2, 3].map((i) => (
        <div key={i} className="h-48 skeleton rounded-lg" />
      ))}
    </div>
  ) : surprises?.length > 0 ? (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {surprises.map((surprise, index) => (
        <SurpriseCard key={surprise.id} surprise={surprise} index={index} />
      ))}
    </div>
  ) : (
    <div className="card text-center py-12">
      <Gift className="w-16 h-16 mx-auto text-gray-300 mb-4" />
      <h3 className="text-lg font-medium text-text mb-2">Nicio surpriză</h3>
      <p className="text-gray-500">Momentan nu ai nicio surpriză primită</p>
    </div>
  )
}

function SentSurprises({ surprises, isLoading }) {
  return isLoading ? (
    <div className="space-y-3">
      {[1, 2, 3].map((i) => (
        <div key={i} className="h-20 skeleton rounded-lg" />
      ))}
    </div>
  ) : surprises?.length > 0 ? (
    <div className="space-y-3">
      {surprises.map((surprise) => (
        <div key={surprise.id} className="card flex items-center justify-between">
          <div>
            <h4 className="font-medium text-text">{surprise.title || 'Fără titlu'}</h4>
            <p className="text-sm text-gray-500">
              Creată pe {format(new Date(surprise.created_at), 'd MMM yyyy', { locale: ro })}
            </p>
          </div>
          <span className={`text-xs px-2 py-1 rounded-full ${
            surprise.is_revealed ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
          }`}>
            {surprise.is_revealed ? 'Revelat' : 'În așteptare'}
          </span>
        </div>
      ))}
    </div>
  ) : (
    <div className="card text-center py-12">
      <Send className="w-16 h-16 mx-auto text-gray-300 mb-4" />
      <h3 className="text-lg font-medium text-text mb-2">Nicio surpriză trimisă</h3>
      <p className="text-gray-500">Creează prima surpriză pentru partenerul tău</p>
    </div>
  )
}

function SurpriseCard({ surprise, index }) {
  const [clicks, setClicks] = useState(surprise.current_clicks || 0)
  const [isRevealed, setIsRevealed] = useState(surprise.is_revealed)
  const [showContent, setShowContent] = useState(false)
  const [isClicking, setIsClicking] = useState(false)
  const queryClient = useQueryClient()

  const requiredClicks = surprise.reveal_clicks || 1
  const progress = Math.min(100, (clicks / requiredClicks) * 100)
  
  const isLocked = !isRevealed && (
    (surprise.reveal_type === 'date' && new Date(surprise.reveal_date) > new Date()) ||
    (surprise.reveal_type === 'clicks' && clicks < requiredClicks) ||
    (surprise.reveal_type === 'both' && (
      new Date(surprise.reveal_date) > new Date() || clicks < requiredClicks
    ))
  )

  const handleClick = async () => {
    // Already revealed - show content
    if (isRevealed) {
      setShowContent(true)
      return
    }

    // Unlockable (conditions met) - reveal it
    if (!isLocked) {
      try {
        await api.post(`/surprises/${surprise.id}/reveal`)
        setIsRevealed(true)
        queryClient.invalidateQueries(['surprises'])
      } catch (e) {
        // ignore
      }
      setShowContent(true)
      return
    }

    // Locked with clicks - register click
    if (surprise.reveal_type === 'clicks' || surprise.reveal_type === 'both') {
      setIsClicking(true)
      try {
        const response = await api.post(`/surprises/${surprise.id}/click`)
        const newClicks = response.data.current_clicks
        setClicks(newClicks)
        if (response.data.is_revealed) {
          setIsRevealed(true)
          // Auto-show content after a brief delay for the reveal animation
          setTimeout(() => setShowContent(true), 600)
          queryClient.invalidateQueries(['surprises'])
        }
      } catch (error) {
        const detail = error.response?.data?.detail
        if (typeof detail === 'string' && detail.includes('Așteptați')) {
          // Cooldown - ignore silently
        } else {
          toast.error('Eroare la procesare')
        }
      } finally {
        setTimeout(() => setIsClicking(false), 200)
      }
    }
  }

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.05 }}
        onClick={handleClick}
        whileTap={isLocked && surprise.reveal_type !== 'date' ? { scale: 0.95 } : {}}
        className="cursor-pointer relative overflow-hidden rounded-xl min-h-[200px]"
        style={{
          background: isRevealed 
            ? 'linear-gradient(135deg, rgba(var(--color-primary-rgb), 0.15), rgba(var(--color-secondary-rgb), 0.15))'
            : isLocked
              ? 'linear-gradient(135deg, rgba(var(--color-card-rgb), 0.9), rgba(var(--color-card-rgb), 0.7))'
              : 'linear-gradient(135deg, rgba(var(--color-primary-rgb), 0.1), rgba(var(--color-secondary-rgb), 0.1))',
          backdropFilter: 'blur(12px)',
          border: '1px solid rgba(var(--color-primary-rgb), 0.2)',
        }}
      >
        {isLocked ? (
          /* ===== LOCKED STATE ===== */
          <div className="flex flex-col items-center justify-center h-full min-h-[200px] p-6">
            {/* Animated lock icon */}
            <motion.div
              animate={isClicking ? { rotate: [-5, 5, -5, 5, 0], scale: [1, 1.1, 1] } : {}}
              transition={{ duration: 0.4 }}
              className="mb-3"
            >
              <div className="w-16 h-16 rounded-full flex items-center justify-center"
                style={{ background: 'rgba(var(--color-primary-rgb), 0.15)' }}>
                <Lock className="w-8 h-8" style={{ color: 'var(--color-primary)' }} />
              </div>
            </motion.div>
            
            <p className="text-text font-medium mb-1">Surpriză misterioasă</p>
            <p className="text-xs mb-3" style={{ color: 'var(--color-text)', opacity: 0.6 }}>
              De la {surprise.from_user_name || 'Partener'}
            </p>

            {/* Progress for click-based reveals */}
            {(surprise.reveal_type === 'clicks' || surprise.reveal_type === 'both') && (
              <div className="w-full max-w-[180px] space-y-2">
                <div className="flex items-center justify-center gap-1.5 text-xs" style={{ color: 'var(--color-primary)' }}>
                  <MousePointerClick className="w-3.5 h-3.5" />
                  <span>{clicks}/{requiredClicks} click-uri</span>
                </div>
                <div className="w-full h-2 rounded-full overflow-hidden"
                  style={{ background: 'rgba(var(--color-primary-rgb), 0.15)' }}>
                  <motion.div
                    className="h-full rounded-full"
                    style={{ background: 'var(--color-primary)' }}
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    transition={{ type: 'spring', stiffness: 200, damping: 20 }}
                  />
                </div>
              </div>
            )}
            
            {/* Date info */}
            {(surprise.reveal_type === 'date' || surprise.reveal_type === 'both') && surprise.reveal_date && (
              <div className="flex items-center gap-1.5 text-xs mt-2" style={{ color: 'var(--color-text)', opacity: 0.6 }}>
                <Calendar className="w-3.5 h-3.5" />
                <span>{format(new Date(surprise.reveal_date), 'd MMM yyyy', { locale: ro })}</span>
              </div>
            )}

            {surprise.reveal_type !== 'date' && (
              <p className="text-xs mt-3 animate-pulse" style={{ color: 'var(--color-primary)' }}>
                Apasă pentru a debloca!
              </p>
            )}
          </div>
        ) : isRevealed ? (
          /* ===== REVEALED STATE ===== */
          <div className="flex flex-col items-center justify-center h-full min-h-[200px] p-6">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 200, damping: 15 }}
            >
              <div className="w-16 h-16 rounded-full flex items-center justify-center mb-3"
                style={{ background: 'rgba(var(--color-primary-rgb), 0.2)' }}>
                <Gift className="w-8 h-8" style={{ color: 'var(--color-primary)' }} />
              </div>
            </motion.div>
            <h3 className="font-semibold text-text text-center">{surprise.title || 'Surpriză'}</h3>
            <p className="text-xs mt-1" style={{ color: 'var(--color-text)', opacity: 0.6 }}>
              De la {surprise.from_user_name || 'Partener'}
            </p>
            <p className="text-xs mt-2 flex items-center gap-1" style={{ color: 'var(--color-primary)' }}>
              <Eye className="w-3.5 h-3.5" />
              Apasă pentru a vedea
            </p>
          </div>
        ) : (
          /* ===== UNLOCKABLE STATE (conditions met but not yet revealed) ===== */
          <div className="flex flex-col items-center justify-center h-full min-h-[200px] p-6">
            <motion.div
              animate={{ scale: [1, 1.05, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <div className="w-16 h-16 rounded-full flex items-center justify-center mb-3"
                style={{ background: 'rgba(var(--color-primary-rgb), 0.2)' }}>
                <Unlock className="w-8 h-8" style={{ color: 'var(--color-primary)' }} />
              </div>
            </motion.div>
            <h3 className="font-semibold text-text text-center">{surprise.title || 'Surpriză'}</h3>
            <p className="text-xs mt-1" style={{ color: 'var(--color-text)', opacity: 0.6 }}>
              De la {surprise.from_user_name || 'Partener'}
            </p>
            <motion.p 
              animate={{ opacity: [1, 0.5, 1] }}
              transition={{ duration: 1.5, repeat: Infinity }}
              className="text-xs mt-2 flex items-center gap-1"
              style={{ color: 'var(--color-primary)' }}
            >
              <Sparkles className="w-3.5 h-3.5" />
              Apasă pentru a dezvălui!
            </motion.p>
          </div>
        )}
      </motion.div>

      {/* ===== REVEAL MODAL ===== */}
      <AnimatePresence>
        {showContent && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            onClick={() => setShowContent(false)}
          >
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
            
            <motion.div
              initial={{ scale: 0.7, opacity: 0, rotateY: 90 }}
              animate={{ scale: 1, opacity: 1, rotateY: 0 }}
              exit={{ scale: 0.8, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 200, damping: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="relative max-w-md w-full rounded-2xl overflow-hidden shadow-2xl"
              style={{
                background: 'var(--color-card)',
                border: '2px solid rgba(var(--color-primary-rgb), 0.3)',
              }}
            >
              {/* Header gradient */}
              <div className="p-6 text-center" style={{
                background: 'linear-gradient(135deg, rgba(var(--color-primary-rgb), 0.15), rgba(var(--color-secondary-rgb), 0.15))'
              }}>
                <button
                  onClick={() => setShowContent(false)}
                  className="absolute top-3 right-3 p-1.5 rounded-full transition-colors"
                  style={{ background: 'rgba(var(--color-text-rgb), 0.1)' }}
                >
                  <X className="w-4 h-4 text-text" />
                </button>

                <motion.div
                  animate={{ scale: [1, 1.1, 1] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                >
                  <Gift className="w-14 h-14 mx-auto mb-3" style={{ color: 'var(--color-primary)' }} />
                </motion.div>
                <h2 className="text-xl font-bold text-text">{surprise.title || 'Surpriză!'}</h2>
                <p className="text-xs mt-1" style={{ color: 'var(--color-text)', opacity: 0.6 }}>
                  De la {surprise.from_user_name || 'Partener'}
                </p>
              </div>

              {/* Content */}
              <div className="p-6">
                {surprise.content_path && (
                  <img
                    src={`/photos/${surprise.content_path}`}
                    alt="Surpriză"
                    className="w-full rounded-lg mb-4 shadow-md"
                    onError={(e) => { e.target.style.display = 'none' }}
                  />
                )}
                
                {surprise.message && (
                  <div className="rounded-xl p-4 mb-4" style={{
                    background: 'rgba(var(--color-primary-rgb), 0.08)'
                  }}>
                    <p className="text-text text-center italic leading-relaxed whitespace-pre-wrap">
                      "{surprise.message}"
                    </p>
                  </div>
                )}

                {!surprise.message && !surprise.content_path && (
                  <div className="text-center py-4">
                    <Heart className="w-10 h-10 mx-auto mb-2" style={{ color: 'var(--color-primary)' }} />
                    <p className="text-text">O surpriză plină de dragoste! 💕</p>
                  </div>
                )}

                <p className="text-center text-xs" style={{ color: 'var(--color-text)', opacity: 0.5 }}>
                  {surprise.created_at && format(new Date(surprise.created_at), 'd MMMM yyyy', { locale: ro })}
                </p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}

function CreateSurpriseModal({ onClose }) {
  const [formData, setFormData] = useState({
    title: '',
    message: '',
    surprise_type: 'message',
    reveal_type: 'date',
    reveal_date: '',
    reveal_clicks: 5
  })
  const [loading, setLoading] = useState(false)
  const queryClient = useQueryClient()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    
    try {
      // Clean form data - convert empty strings to null for optional fields
      const cleanData = {
        ...formData,
        title: formData.title || null,
        reveal_date: formData.reveal_date || null,
      }
      // Remove reveal_date if not needed
      if (formData.reveal_type === 'clicks' && !formData.reveal_date) {
        delete cleanData.reveal_date
      }
      await api.post('/surprises', cleanData)
      toast.success('Surpriza a fost creată!')
      queryClient.invalidateQueries(['surprises'])
      onClose()
    } catch (error) {
      // Handle pydantic validation errors (422) which return array of error objects
      const detail = error.response?.data?.detail
      if (Array.isArray(detail)) {
        toast.error(detail.map(e => e.msg).join(', '))
      } else if (typeof detail === 'string') {
        toast.error(detail)
      } else {
        toast.error('Eroare la creare')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
    >
      <motion.div
        initial={{ scale: 0.9 }}
        animate={{ scale: 1 }}
        exit={{ scale: 0.9 }}
        className="card max-w-md w-full max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold" style={{ color: 'var(--color-primary)' }}>Surpriză Nouă</h2>
          <button onClick={onClose} className="p-2 rounded-full" style={{ background: 'rgba(var(--color-text-rgb), 0.1)' }}>
            <X className="w-5 h-5 text-text" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">Titlu (opțional)</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="input"
              placeholder="Ex: Dragostea mea..."
            />
          </div>

          <div>
            <label className="label">Mesaj</label>
            <textarea
              value={formData.message}
              onChange={(e) => setFormData({ ...formData, message: e.target.value })}
              className="input min-h-[100px]"
              placeholder="Scrie mesajul tău..."
              required
            />
          </div>

          <div>
            <label className="label">Mod de revelare</label>
            <select
              value={formData.reveal_type}
              onChange={(e) => setFormData({ ...formData, reveal_type: e.target.value })}
              className="input"
            >
              <option value="date">La o dată specifică</option>
              <option value="clicks">După X click-uri</option>
              <option value="both">Ambele</option>
            </select>
          </div>

          {(formData.reveal_type === 'date' || formData.reveal_type === 'both') && (
            <div>
              <label className="label">Data revelării</label>
              <input
                type="date"
                value={formData.reveal_date}
                onChange={(e) => setFormData({ ...formData, reveal_date: e.target.value })}
                className="input"
                required
              />
            </div>
          )}

          {(formData.reveal_type === 'clicks' || formData.reveal_type === 'both') && (
            <div>
              <label className="label">Număr de click-uri necesare</label>
              <input
                type="number"
                min="1"
                max="100"
                value={formData.reveal_clicks}
                onChange={(e) => setFormData({ ...formData, reveal_clicks: parseInt(e.target.value) })}
                className="input"
              />
            </div>
          )}

          <div className="flex gap-3">
            <button type="button" onClick={onClose} className="btn btn-ghost flex-1">
              Anulează
            </button>
            <button type="submit" disabled={loading} className="btn btn-primary flex-1">
              {loading ? 'Se creează...' : 'Creează'}
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  )
}