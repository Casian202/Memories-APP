import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Calendar, Plus, Search, Filter, MapPin, Clock, X } from 'lucide-react'
import api from '../services/api'
import { format } from 'date-fns'
import { ro } from 'date-fns/locale'
import { useAuth } from '../context/AuthContext'
import toast from 'react-hot-toast'

export default function EventsPage() {
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const { isAdmin } = useAuth()

  const { data: eventsData, isLoading } = useQuery({
    queryKey: ['events', typeFilter],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (typeFilter !== 'all') params.append('event_type', typeFilter)
      const response = await api.get(`/events?${params}`)
      return response.data
    }
  })

  const events = eventsData?.events || []

  const filteredEvents = events?.filter(event =>
    event.title.toLowerCase().includes(search.toLowerCase()) ||
    event.location?.toLowerCase().includes(search.toLowerCase())
  )

  const eventTypes = [
    { value: 'all', label: 'Toate' },
    { value: 'date_night', label: 'Întâlnire' },
    { value: 'vacation', label: 'Vacanță' },
    { value: 'anniversary', label: 'Aniversare' },
    { value: 'birthday', label: 'Zi de naștere' },
    { value: 'other', label: 'Altele' },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="page-header">Evenimente</h1>
        {isAdmin() && (
          <button onClick={() => setShowCreateModal(true)} className="btn btn-primary">
            <Plus className="w-5 h-5" />
            Adaugă Eveniment
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Caută evenimente..."
            className="input pl-10"
          />
        </div>
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="input sm:w-48"
        >
          {eventTypes.map((type) => (
            <option key={type.value} value={type.value}>
              {type.label}
            </option>
          ))}
        </select>
      </div>

      {/* Events Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-48 skeleton rounded-lg" />
          ))}
        </div>
      ) : filteredEvents?.length > 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
        >
          {filteredEvents.map((event, index) => (
            <motion.div
              key={event.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <EventCard event={event} />
            </motion.div>
          ))}
        </motion.div>
      ) : (
        <div className="card text-center py-12">
          <Calendar className="w-16 h-16 mx-auto text-gray-300 mb-4" />
          <h3 className="text-lg font-medium text-text mb-2">Niciun eveniment</h3>
          <p className="text-gray-500">
            {search ? 'Nu s-au găsit rezultate' : 'Adaugă primul eveniment pentru a începe'}
          </p>
        </div>
      )}

      {/* Create Event Modal */}
      <AnimatePresence>
        {showCreateModal && <CreateEventModal onClose={() => setShowCreateModal(false)} />}
      </AnimatePresence>
    </div>
  )
}

function CreateEventModal({ onClose }) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [location, setLocation] = useState('')
  const [eventDate, setEventDate] = useState('')
  const [eventType, setEventType] = useState('other')
  const queryClient = useQueryClient()
  const navigate = useNavigate()

  const createMutation = useMutation({
    mutationFn: async (data) => {
      const response = await api.post('/events', data)
      return response.data
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries(['events'])
      toast.success('Evenimentul a fost creat!')
      onClose()
      navigate(`/events/${data.id}`)
    },
    onError: () => {
      toast.error('Eroare la crearea evenimentului')
    }
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!title || !eventDate) {
      toast.error('Completează titlul și data')
      return
    }
    createMutation.mutate({
      title,
      description: description || null,
      location: location || null,
      event_date: eventDate,
      event_type: eventType
    })
  }

  const eventTypes = [
    { value: 'date_night', label: 'Întâlnire' },
    { value: 'vacation', label: 'Vacanță' },
    { value: 'anniversary', label: 'Aniversare' },
    { value: 'birthday', label: 'Zi de naștere' },
    { value: 'other', label: 'Altele' },
  ]

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
          <h2 className="text-lg font-bold text-text">Eveniment Nou</h2>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-200">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-text mb-1">Titlu *</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="input"
              placeholder="Numele evenimentului"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-text mb-1">Data *</label>
            <input
              type="date"
              value={eventDate}
              onChange={(e) => setEventDate(e.target.value)}
              className="input"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-text mb-1">Tip</label>
            <select
              value={eventType}
              onChange={(e) => setEventType(e.target.value)}
              className="input"
            >
              {eventTypes.map((type) => (
                <option key={type.value} value={type.value}>{type.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-text mb-1">Locație</label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="input"
              placeholder="Unde va avea loc"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-text mb-1">Descriere</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="input min-h-[80px]"
              placeholder="Detalii despre eveniment..."
              rows={3}
            />
          </div>

          <button
            type="submit"
            disabled={createMutation.isPending}
            className="btn btn-primary w-full"
          >
            {createMutation.isPending ? 'Se creează...' : 'Creează Eveniment'}
          </button>
        </form>
      </motion.div>
    </motion.div>
  )
}

function EventCard({ event }) {
  return (
    <Link to={`/events/${event.id}`}>
      <div className="card card-hover group">
        {/* Cover Image */}
        <div className="relative h-32 -mx-4 -mt-4 mb-3 rounded-t-lg overflow-hidden bg-gradient-to-br from-primary/20 to-secondary/20">
          {event.cover_photo ? (
            <img
              src={`/photos/${event.cover_photo.file_path}`}
              alt={event.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Calendar className="w-12 h-12 text-primary/40" />
            </div>
          )}
        </div>

        {/* Content */}
        <h3 className="font-semibold text-text mb-2 line-clamp-1">{event.title}</h3>
        
        <div className="space-y-1 text-sm text-gray-500">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4" />
            <span>{format(new Date(event.event_date), 'd MMMM yyyy', { locale: ro })}</span>
          </div>
          {event.location && (
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              <span className="truncate">{event.location}</span>
            </div>
          )}
        </div>

        {/* Status Badge */}
        <div className="mt-3 flex items-center justify-between">
          <span className={`text-xs px-2 py-1 rounded-full ${
            event.status === 'upcoming' ? 'bg-blue-100 text-blue-700' :
            event.status === 'ongoing' ? 'bg-green-100 text-green-700' :
            event.status === 'completed' ? 'bg-gray-100 text-gray-700' :
            'bg-red-100 text-red-700'
          }`}>
            {event.status === 'upcoming' ? 'Viitor' :
             event.status === 'ongoing' ? 'În desfășurare' :
             event.status === 'completed' ? 'Finalizat' : 'Anulat'}
          </span>
          <span className="text-xs text-gray-400">
            {event.photo_count || 0} media
          </span>
        </div>
      </div>
    </Link>
  )
}