import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { Heart, Send, Plus, X } from 'lucide-react'
import api from '../services/api'
import { format } from 'date-fns'
import { ro } from 'date-fns/locale'
import toast from 'react-hot-toast'

export default function MotivationsPage() {
  const [showForm, setShowForm] = useState(false)
  const queryClient = useQueryClient()

  const { data: motivations, isLoading } = useQuery({
    queryKey: ['motivations', 'received'],
    queryFn: async () => {
      const response = await api.get('/motivations/received')
      return response.data
    }
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="page-header">Motivații Zilnice</h1>
        <button onClick={() => setShowForm(true)} className="btn btn-primary">
          <Plus className="w-5 h-5" />
          <span className="hidden sm:inline">Trimite Motivație</span>
        </button>
      </div>

      {/* Info Card */}
      <div className="card bg-gradient-to-r from-primary/10 to-secondary/10">
        <div className="flex items-start gap-3">
          <Heart className="w-6 h-6 text-primary flex-shrink-0" />
          <div>
            <h3 className="font-medium text-text">Spune-le partenerului cât de mult îți pasă</h3>
            <p className="text-sm text-gray-600 mt-1">
              Trimite motivații zilnice pentru a-ți arăta afecțiunea. Mesajele tale vor fi apreciate!
            </p>
          </div>
        </div>
      </div>

      {/* Motivations List */}
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 skeleton rounded-lg" />
          ))}
        </div>
      ) : motivations?.length > 0 ? (
        <div className="space-y-4">
          {motivations.map((motivation, index) => (
            <MotivationCard key={motivation.id} motivation={motivation} index={index} />
          ))}
        </div>
      ) : (
        <div className="card text-center py-12">
          <Heart className="w-16 h-16 mx-auto text-gray-300 mb-4" />
          <h3 className="text-lg font-medium text-text mb-2">Nicio motivație</h3>
          <p className="text-gray-500">Trimite prima motivație partenerului tău!</p>
        </div>
      )}

      {/* Create Modal */}
      <AnimatePresence>
        {showForm && <CreateMotivationModal onClose={() => setShowForm(false)} />}
      </AnimatePresence>
    </div>
  )
}

function MotivationCard({ motivation, index }) {
  const queryClient = useQueryClient()

  const markAsRead = async () => {
    if (!motivation.is_read) {
      await api.put(`/motivations/${motivation.id}/read`)
      queryClient.invalidateQueries(['motivations'])
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      onClick={markAsRead}
      className={`card relative overflow-hidden ${
        motivation.is_read ? '' : 'border-l-4 border-primary'
      }`}
    >
      <div className="flex items-start gap-4">
        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
          <Heart className={`w-5 h-5 ${motivation.is_read ? 'text-gray-400' : 'text-primary fill-primary'}`} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-text whitespace-pre-wrap">{motivation.message}</p>
          <div className="mt-2 flex items-center gap-2 text-sm text-gray-500">
            <span>De la {motivation.from_user_name}</span>
            <span>•</span>
            <span>{format(new Date(motivation.created_at), 'd MMM yyyy, HH:mm', { locale: ro })}</span>
          </div>
        </div>
      </div>
      
      {!motivation.is_read && (
        <div className="absolute top-2 right-2">
          <span className="text-xs bg-primary text-white px-2 py-1 rounded-full">Nou</span>
        </div>
      )}
    </motion.div>
  )
}

function CreateMotivationModal({ onClose }) {
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const queryClient = useQueryClient()

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!message.trim()) {
      toast.error('Te rog scrie un mesaj')
      return
    }

    if (message.length > 500) {
      toast.error('Mesajul trebuie să aibă maxim 500 caractere')
      return
    }

    setLoading(true)
    try {
      await api.post('/motivations', { message })
      toast.success('Motivația a fost trimisă!')
      queryClient.invalidateQueries(['motivations'])
      onClose()
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Eroare la trimitere')
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
        className="card max-w-md w-full"
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-primary flex items-center gap-2">
            <Heart className="w-5 h-5" />
            Trimite o Motivație
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">Mesajul tău</label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="input min-h-[150px]"
              placeholder="Scrie ceva frumos pentru partenerul tău..."
              maxLength={500}
            />
            <p className="text-xs text-gray-400 text-right mt-1">
              {message.length}/500 caractere
            </p>
          </div>

          <div className="flex gap-3">
            <button type="button" onClick={onClose} className="btn btn-ghost flex-1">
              Anulează
            </button>
            <button type="submit" disabled={loading || !message.trim()} className="btn btn-primary flex-1">
              {loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  Trimite
                </>
              )}
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  )
}