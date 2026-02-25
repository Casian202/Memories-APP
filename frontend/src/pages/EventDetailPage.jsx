import { useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { ArrowLeft, Calendar, MapPin, Clock, Image, Plus, Trash2, Play, X, Star, Video, Film } from 'lucide-react'
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
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 300000, // 5 min timeout for large video uploads
      })
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['photos', id])
      toast.success('Fișierele au fost încărcate cu succes!')
    },
    onError: () => {
      toast.error('Eroare la încărcarea fișierelor')
    }
  })

  const deletePhotoMutation = useMutation({
    mutationFn: async (photoId) => {
      await api.delete(`/photos/${photoId}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['photos', id])
      queryClient.invalidateQueries(['event', id])
      toast.success('Fișierul a fost șters')
    }
  })

  const setCoverMutation = useMutation({
    mutationFn: async (photoId) => {
      await api.put(`/events/${id}/cover/${photoId}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['event', id])
      toast.success('Poza de copertă a fost actualizată!')
    },
    onError: () => {
      toast.error('Eroare la setarea pozei de copertă')
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
      {/* Cover Photo/Video */}
      {event.cover_photo ? (
        <div className="relative h-48 sm:h-64 md:h-72 -mx-4 -mt-4 sm:-mx-6 sm:-mt-6 rounded-b-2xl overflow-hidden">
          {event.cover_photo.media_type === 'video' ? (
            <video
              src={`/photos/${event.cover_photo.file_path}`}
              className="w-full h-full object-cover"
              autoPlay
              loop
              muted
              playsInline
            />
          ) : (
            <img
              src={`/photos/${event.cover_photo.file_path}`}
              alt={event.title}
              className="w-full h-full object-cover"
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-6">
            <button
              onClick={() => navigate('/events')}
              className="absolute top-4 left-4 p-2 rounded-full bg-black/40 text-white hover:bg-black/60 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center backdrop-blur-sm"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="text-2xl sm:text-3xl font-bold text-white drop-shadow-lg">{event.title}</h1>
            <div className="flex flex-wrap items-center gap-3 text-sm text-white/80 mt-1">
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
      ) : (
        /* Header without cover photo */
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
      )}

      {/* Description */}
      {event.description && (
        <div className="card">
          <p className="text-text whitespace-pre-wrap">{event.description}</p>
        </div>
      )}

      {/* Media Section (Photos + Videos) */}
      <div className="space-y-3 md:space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <h2 className="text-base md:text-lg font-semibold text-text flex items-center gap-2 flex-wrap">
            <Image className="w-5 h-5 flex-shrink-0" />
            <span>Media ({photos?.length || 0})</span>
            {photos?.length > 0 && (
              <span className="text-xs font-normal text-gray-400">
                {photos.filter(p => p.media_type !== 'video').length} poze, {photos.filter(p => p.media_type === 'video').length} videoclipuri
              </span>
            )}
          </h2>
          {photos?.length > 0 && (
            <button
              onClick={() => setShowSlideshow(true)}
              className="btn btn-ghost text-sm self-start sm:self-auto"
            >
              <Play className="w-4 h-4" />
              Slideshow
            </button>
          )}
        </div>

        {/* Upload Area */}
        {isAdmin() && (
          <label className="block border-2 border-dashed border-gray-300 hover:border-primary rounded-xl cursor-pointer transition-colors bg-card/50">
            <input
              type="file"
              multiple
              accept="image/*,video/mp4,video/webm,video/quicktime,video/x-msvideo,video/x-matroska"
              className="hidden"
              onChange={handleFileChange}
              disabled={uploadMutation.isPending}
            />
            <div className="flex flex-col items-center py-6 text-gray-500">
              {uploadMutation.isPending ? (
                <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <Plus className="w-8 h-8 mb-2" />
                  <span className="text-sm">Apasă pentru a adăuga poze sau videoclipuri</span>
                  <span className="text-xs text-gray-400 mt-1">Maxim 200MB per fișier</span>
                </>
              )}
            </div>
          </label>
        )}

        {/* Media Grid */}
        {photosLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="aspect-square skeleton rounded-lg" />
            ))}
          </div>
        ) : photos?.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-3">
            {photos.map((photo, index) => (
              <motion.div
                key={photo.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.05 }}
                className="relative aspect-square group"
              >
                {photo.media_type === 'video' ? (
                  <div
                    className="w-full h-full rounded-lg cursor-pointer relative bg-black"
                    onClick={() => {
                      setCurrentPhotoIndex(index)
                      setShowSlideshow(true)
                    }}
                  >
                    <video
                      src={`/photos/${photo.file_path}`}
                      className="w-full h-full object-cover rounded-lg"
                      muted
                      preload="metadata"
                    />
                    {/* Video play overlay */}
                    <div className="absolute inset-0 flex items-center justify-center bg-black/20 rounded-lg">
                      <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-white/90 flex items-center justify-center shadow-lg">
                        <Play className="w-5 h-5 sm:w-6 sm:h-6 text-gray-800 ml-0.5" />
                      </div>
                    </div>
                    {/* Video badge */}
                    <div className="absolute bottom-2 left-2 px-2 py-0.5 bg-black/60 text-white text-xs rounded flex items-center gap-1">
                      <Film className="w-3 h-3" />
                      Video
                    </div>
                  </div>
                ) : (
                  <img
                    src={`/photos/${photo.file_path}`}
                    alt=""
                    className="w-full h-full object-cover rounded-lg cursor-pointer"
                    onClick={() => {
                      setCurrentPhotoIndex(index)
                      setShowSlideshow(true)
                    }}
                  />
                )}
                {/* Cover badge */}
                {event?.cover_photo_id === photo.id && (
                  <div className="absolute top-2 left-2 px-2 py-1 bg-primary text-white text-xs rounded-full flex items-center gap-1 shadow-md">
                    <Star className="w-3 h-3 fill-current" />
                    Copertă
                  </div>
                )}
                {isAdmin() && (
                  <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {event?.cover_photo_id !== photo.id && (
                      <button
                        onClick={() => setCoverMutation.mutate(photo.id)}
                        className="p-2 bg-primary/90 text-white rounded-full hover:bg-primary transition-colors shadow-md"
                        title="Setează ca copertă"
                      >
                        <Star className="w-4 h-4" />
                      </button>
                    )}
                    <button
                      onClick={() => {
                        if (confirm('Ești sigur că vrei să ștergi acest fișier?')) {
                          deletePhotoMutation.mutate(photo.id)
                        }
                      }}
                      className="p-2 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors shadow-md"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="card text-center py-8 text-gray-500">
            <Image className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>Nicio poză sau videoclip încă</p>
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

  const currentMedia = photos[currentIndex]
  const isCurrentVideo = currentMedia?.media_type === 'video'

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black flex items-center justify-center"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <button
        onClick={onClose}
        className="absolute top-2 right-2 sm:top-4 sm:right-4 p-2 text-white hover:bg-white/20 rounded-full z-10 min-h-[44px] min-w-[44px] flex items-center justify-center"
      >
        <X className="w-6 h-6" />
      </button>

      <button
        onClick={handlePrev}
        className="absolute left-1 sm:left-4 p-2 text-white hover:bg-white/20 rounded-full z-10 min-h-[44px] min-w-[44px] flex items-center justify-center"
      >
        <ArrowLeft className="w-5 h-5 sm:w-6 sm:h-6" />
      </button>

      {isCurrentVideo ? (
        <video
          key={currentMedia.id}
          src={`/photos/${currentMedia.file_path}`}
          className="max-w-[calc(100%-4rem)] sm:max-w-[calc(100%-6rem)] max-h-[calc(100vh-6rem)] object-contain"
          controls
          autoPlay
          playsInline
        />
      ) : (
        <img
          src={`/photos/${currentMedia.file_path}`}
          alt=""
          className="max-w-[calc(100%-4rem)] sm:max-w-[calc(100%-6rem)] max-h-[calc(100vh-6rem)] object-contain"
        />
      )}

      <button
        onClick={handleNext}
        className="absolute right-1 sm:right-4 p-2 text-white hover:bg-white/20 rounded-full z-10 min-h-[44px] min-w-[44px] flex items-center justify-center"
      >
        <ArrowLeft className="w-5 h-5 sm:w-6 sm:h-6 rotate-180" />
      </button>

      <div className="absolute bottom-2 sm:bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 text-white text-xs sm:text-sm bg-black/40 px-3 py-1 rounded-full">
        {isCurrentVideo && <Film className="w-3 h-3 sm:w-4 sm:h-4" />}
        {currentIndex + 1} / {photos.length}
      </div>
    </motion.div>
  )
}