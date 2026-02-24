import { useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { ArrowLeft, Calendar, MapPin, Clock, Image, Plus, Trash2, Play, X } from 'lucide-react'
import api from '../services/api'
import { format } from 'date-fns'
import { ro } from 'date-fns/locale'
import { useAuth } from '../context/AuthContext'
import toast from 'react-hot-toast'

export default function EventDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { isAdmin } = useAuth()
  const queryClient = useQueryClient()
  const [showSlideshow, setShowSlideshow] = useState(false)
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0)

  const { data: event, isLoading } = useQuery({
    queryKey: ['event', id],
    queryFn: async () => {
      const response = await api.get(`/events/${id}`)
      return response.data
    }
  })

  const { data: photos, isLoading: photosLoading } = useQuery({
    queryKey: ['photos', id],
    queryFn: async () => {
      const response = await api.get(`/events/${id}/photos`)
      return response.data
    }
  })

  const uploadMutation = useMutation({
    mutationFn: async (files) => {
      const formData = new FormData()
      files.forEach(file => formData.append('files', file))
      const response = await api.post(`/events/${id}/photos`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['photos', id])
      toast.success('Pozele au fost încărcate cu succes!')
    },
    onError: () => {
      toast.error('Eroare la încărcarea pozelor')
    }
  })

  const deletePhotoMutation = useMutation({
    mutationFn: async (photoId) => {
      await api.delete(`/photos/${photoId}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['photos', id])
      toast.success('Poza a fost ștearsă')
    }
  })

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files)
    if (files.length > 0) {
      uploadMutation.mutate(files)
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-8 skeleton rounded w-1/3" />
        <div className="h-64 skeleton rounded" />
      </div>
    )
  }

  if (!event) {
    return (
      <div className="card text-center py-12">
        <h2 className="text-xl font-medium text-text mb-2">Evenimentul nu a fost găsit</h2>
        <Link to="/events" className="btn-primary mt-4">
          Înapoi la evenimente
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/events')}
          className="p-2 rounded-lg hover:bg-gray-100 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <h1 className="page-header">{event.title}</h1>
          <div className="flex flex-wrap items-center gap-3 text-sm text-gray-500">
            <div className="flex items-center gap-1">
              <Calendar className="w-4 h-4" />
              {format(new Date(event.event_date), 'd MMMM yyyy', { locale: ro })}
            </div>
            {event.location && (
              <div className="flex items-center gap-1">
                <MapPin className="w-4 h-4" />
                {event.location}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Description */}
      {event.description && (
        <div className="card">
          <p className="text-text whitespace-pre-wrap">{event.description}</p>
        </div>
      )}

      {/* Photos Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-text flex items-center gap-2">
            <Image className="w-5 h-5" />
            Poze ({photos?.length || 0})
          </h2>
          {photos?.length > 0 && (
            <button
              onClick={() => setShowSlideshow(true)}
              className="btn btn-ghost text-sm"
            >
              <Play className="w-4 h-4" />
              Slideshow
            </button>
          )}
        </div>

        {/* Upload Area */}
        {isAdmin() && (
          <label className="card border-2 border-dashed border-gray-300 hover:border-primary cursor-pointer transition-colors">
            <input
              type="file"
              multiple
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
              disabled={uploadMutation.isPending}
            />
            <div className="flex flex-col items-center py-8 text-gray-500">
              {uploadMutation.isPending ? (
                <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <Plus className="w-8 h-8 mb-2" />
                  <span>Apasă pentru a adăuga poze</span>
                </>
              )}
            </div>
          </label>
        )}

        {/* Photo Grid */}
        {photosLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="aspect-square skeleton rounded-lg" />
            ))}
          </div>
        ) : photos?.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {photos.map((photo, index) => (
              <motion.div
                key={photo.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.05 }}
                className="relative aspect-square group"
              >
                <img
                  src={`/photos/${photo.file_path}`}
                  alt=""
                  className="w-full h-full object-cover rounded-lg cursor-pointer"
                  onClick={() => {
                    setCurrentPhotoIndex(index)
                    setShowSlideshow(true)
                  }}
                />
                {isAdmin() && (
                  <button
                    onClick={() => {
                      if (confirm('Ești sigur că vrei să ștergi această poză?')) {
                        deletePhotoMutation.mutate(photo.id)
                      }
                    }}
                    className="absolute top-2 right-2 p-2 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="card text-center py-8 text-gray-500">
            <Image className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>Nicio poză încă</p>
          </div>
        )}
      </div>

      {/* Slideshow Modal */}
      {showSlideshow && photos?.length > 0 && (
        <Slideshow
          photos={photos}
          initialIndex={currentPhotoIndex}
          eventId={id}
          onClose={() => setShowSlideshow(false)}
          onPrev={() => setCurrentPhotoIndex(i => (i > 0 ? i - 1 : photos.length - 1))}
          onNext={() => setCurrentPhotoIndex(i => (i < photos.length - 1 ? i + 1 : 0))}
        />
      )}
    </div>
  )
}

function Slideshow({ photos, initialIndex, eventId, onClose, onPrev, onNext }) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex)

  const handlePrev = () => {
    setCurrentIndex(i => (i > 0 ? i - 1 : photos.length - 1))
  }

  const handleNext = () => {
    setCurrentIndex(i => (i < photos.length - 1 ? i + 1 : 0))
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black flex items-center justify-center"
    >
      <button
        onClick={onClose}
        className="absolute top-4 right-4 p-2 text-white hover:bg-white/20 rounded-full z-10"
      >
        <X className="w-6 h-6" />
      </button>

      <button
        onClick={handlePrev}
        className="absolute left-4 p-2 text-white hover:bg-white/20 rounded-full"
      >
        <ArrowLeft className="w-6 h-6" />
      </button>

      <img
        src={`/photos/${photos[currentIndex].file_path}`}
        alt=""
        className="max-w-full max-h-full object-contain"
      />

      <button
        onClick={handleNext}
        className="absolute right-4 p-2 text-white hover:bg-white/20 rounded-full"
      >
        <ArrowLeft className="w-6 h-6 rotate-180" />
      </button>

      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white text-sm">
        {currentIndex + 1} / {photos.length}
      </div>
    </motion.div>
  )
}