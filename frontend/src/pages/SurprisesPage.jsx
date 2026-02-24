import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { Gift, Plus, Lock, Eye, Send, Calendar, X } from 'lucide-react'
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
          Primite
        </button>
        <button
          onClick={() => setActiveTab('sent')}
          className={`tab-btn ${activeTab === 'sent' ? 'active' : ''}`}
        >
          Trimise
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
  const queryClient = useQueryClient()

  const isLocked = !surprise.is_revealed && (
    (surprise.reveal_type === 'date' && new Date(surprise.reveal_date) > new Date()) ||
    (surprise.reveal_type === 'clicks' && clicks < surprise.reveal_clicks) ||
    (surprise.reveal_type === 'both' && (
      new Date(surprise.reveal_date) > new Date() || clicks < surprise.reveal_clicks
    ))
  )

  const handleClick = async () => {
    if (!isLocked && !surprise.is_revealed) {
      setShowContent(true)
      return
    }

    if (isLocked && surprise.reveal_type !== 'date') {
      try {
        const response = await api.post(`/surprises/${surprise.id}/click`)
        setClicks(response.data.current_clicks)
        if (response.data.is_revealed) {
          setIsRevealed(true)
        }
      } catch (error) {
        toast.error('Eroare la procesare')
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
        className={`card-hover cursor-pointer relative overflow-hidden ${
          isLocked ? 'bg-gradient-to-br from-gray-100 to-gray-200' : ''
        }`}
      >
        {isLocked ? (
          <>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <Lock className="w-12 h-12 mx-auto text-gray-400 mb-2" />
                <p className="text-gray-500 text-sm mb-2">Misterios</p>
                {surprise.reveal_type === 'clicks' && (
                  <p className="text-xs text-gray-400">
                    {clicks}/{surprise.reveal_clicks} click-uri
                  </p>
                )}
                {surprise.reveal_type === 'date' && (
                  <p className="text-xs text-gray-400 flex items-center justify-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {format(new Date(surprise.reveal_date), 'd MMM yyyy', { locale: ro })}
                  </p>
                )}
              </div>
            </div>
          </>
        ) : (
          <div className="text-center py-8">
            <Gift className="w-12 h-12 mx-auto text-primary mb-2" />
            <h3 className="font-medium text-text">{surprise.title}</h3>
            <p className="text-sm text-gray-500">Apasă pentru a vedea</p>
          </div>
        )}
      </motion.div>

      <AnimatePresence>
        {showContent && (
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
              className="card max-w-md w-full text-center"
            >
              <button
                onClick={() => setShowContent(false)}
                className="absolute top-2 right-2 p-2 hover:bg-gray-100 rounded-full"
              >
                <X className="w-5 h-5" />
              </button>
              
              <Gift className="w-16 h-16 mx-auto text-primary fill-primary mb-4" />
              <h2 className="text-xl font-bold text-primary mb-2">{surprise.title}</h2>
              
              {surprise.message && (
                <p className="text-text mb-4">{surprise.message}</p>
              )}
              
              {surprise.content_path && (
                <img
                  src={`/photos/surprises/${surprise.content_path}`}
                  alt=""
                  className="w-full rounded-lg mb-4"
                />
              )}
              
              <p className="text-sm text-gray-500">
                De la {surprise.from_user_name}
              </p>
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
      await api.post('/surprises', formData)
      toast.success('Surpriza a fost creată!')
      queryClient.invalidateQueries(['surprises'])
      onClose()
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Eroare la creare')
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
          <h2 className="text-xl font-bold text-primary">Surpriză Nouă</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full">
            <X className="w-5 h-5" />
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