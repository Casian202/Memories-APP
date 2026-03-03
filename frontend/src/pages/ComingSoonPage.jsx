import { useState, useEffect, useCallback, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Clock, Plus, Trash2, X, Image, Quote, Calendar,
  ChevronLeft, ChevronRight, Sparkles, Upload, Type, MapPin, Navigation2
} from 'lucide-react'
import { MapContainer, TileLayer, Marker, Polyline, Popup, useMap, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import api from '../services/api'
import { useAuth } from '../context/AuthContext'
import { format, differenceInDays } from 'date-fns'
import { ro } from 'date-fns/locale'
import toast from 'react-hot-toast'

export default function ComingSoonPage() {
  const { isAdmin } = useAuth()
  const { pageId } = useParams()
  const queryClient = useQueryClient()
  const [showAdminPanel, setShowAdminPanel] = useState(false)
  const [showCreateModal, setShowCreateModal] = useState(false)

  // If pageId is provided, fetch that specific page; otherwise fetch the active page
  const { data: page, isLoading } = useQuery({
    queryKey: pageId ? ['coming-soon-page', pageId] : ['coming-soon-active'],
    queryFn: async () => {
      if (pageId) {
        const response = await api.get(`/coming-soon/${pageId}`)
        return response.data
      }
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

      {/* Non-admin unrevealed: show only a beautiful teaser + optional map */}
      {!isAdmin() && !page.is_revealed ? (
        <>
          <ComingSoonTeaser page={page} />
          {page.map_enabled && (
            <RouteMap page={page} />
          )}
        </>
      ) : (
        <>
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

          {/* Route Map */}
          {page.map_enabled && (
            <RouteMap page={page} />
          )}

          {/* Empty state if no content */}
          {(!page.photos?.length && !page.quotes?.length && !page.map_enabled) && (
            <div className="card text-center py-16">
              <Sparkles className="w-16 h-16 mx-auto text-primary/30 mb-4" />
              <p className="text-gray-500 text-lg">
                {page.is_revealed
                  ? 'Conținutul va fi adăugat în curând...'
                  : 'Ceva special se pregătește...'}
              </p>
            </div>
          )}
        </>
      )}
    </div>
  )
}

// ============ COMING SOON TEASER (non-admin, unrevealed) ============
function ComingSoonTeaser({ page }) {
  const [now, setNow] = useState(new Date())

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60000)
    return () => clearInterval(timer)
  }, [])

  const target = new Date(page.reveal_date)
  const daysLeft = differenceInDays(target, now)
  const totalDays = Math.max(1, differenceInDays(target, new Date(page.created_at || Date.now())))
  const progressPct = Math.min(100, Math.max(0, ((totalDays - daysLeft) / totalDays) * 100))

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, ease: 'easeOut' }}
      className="flex flex-col items-center justify-center min-h-[50vh] text-center px-4"
    >
      {/* Animated mystery icon */}
      <motion.div
        animate={{
          scale: [1, 1.08, 1],
          rotate: [0, 2, -2, 0],
        }}
        transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
        className="relative mb-8"
      >
        <div className="w-28 h-28 rounded-full flex items-center justify-center relative"
          style={{
            background: 'linear-gradient(135deg, rgba(var(--color-primary-rgb), 0.15), rgba(var(--color-secondary-rgb), 0.15))',
            border: '3px solid rgba(var(--color-primary-rgb), 0.3)',
          }}
        >
          <Clock className="w-14 h-14" style={{ color: 'var(--color-primary)' }} />
          {/* Pulsing ring */}
          <motion.div
            animate={{ scale: [1, 1.3, 1], opacity: [0.5, 0, 0.5] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="absolute inset-0 rounded-full"
            style={{ border: '2px solid var(--color-primary)' }}
          />
        </div>
      </motion.div>

      {/* Title */}
      <motion.h2
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="text-2xl sm:text-3xl font-bold text-text mb-3"
      >
        Ceva special se pregătește...
      </motion.h2>

      {/* Subtitle */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="text-gray-500 mb-8 max-w-md"
      >
        Ai răbdare, o surpriză frumoasă te așteaptă! ✨
      </motion.p>

      {/* Countdown card */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.6 }}
        className="card max-w-sm w-full py-8 px-6"
        style={{
          background: 'linear-gradient(135deg, rgba(var(--color-primary-rgb), 0.08), rgba(var(--color-secondary-rgb), 0.08))',
          border: '1px solid rgba(var(--color-primary-rgb), 0.2)',
        }}
      >
        {daysLeft > 0 ? (
          <>
            <div className="text-5xl sm:text-6xl font-bold mb-2" style={{ color: 'var(--color-primary)' }}>
              {daysLeft}
            </div>
            <div className="text-lg text-text font-medium mb-1">
              {daysLeft === 1 ? 'zi rămasă' : 'zile rămase'}
            </div>
          </>
        ) : (
          <>
            <motion.div
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            >
              <Sparkles className="w-12 h-12 mx-auto mb-3" style={{ color: 'var(--color-primary)' }} />
            </motion.div>
            <div className="text-lg font-bold text-text">
              Se dezvăluie astăzi! ✨
            </div>
          </>
        )}

        <div className="flex items-center justify-center gap-2 mt-4 text-sm text-gray-500">
          <Calendar className="w-4 h-4" />
          <span>
            {format(target, 'd MMMM yyyy', { locale: ro })}
          </span>
        </div>

        {/* Progress bar */}
        {daysLeft > 0 && (
          <div className="mt-5">
            <div className="w-full h-2 rounded-full overflow-hidden"
              style={{ background: 'rgba(var(--color-primary-rgb), 0.1)' }}>
              <motion.div
                className="h-full rounded-full"
                style={{ background: 'var(--color-primary)' }}
                initial={{ width: 0 }}
                animate={{ width: `${progressPct}%` }}
                transition={{ duration: 1.5, ease: 'easeOut' }}
              />
            </div>
          </div>
        )}
      </motion.div>

      {/* Floating sparkles decoration */}
      <div className="relative mt-6">
        {[...Array(3)].map((_, i) => (
          <motion.div
            key={i}
            animate={{
              y: [-10, 10, -10],
              opacity: [0.3, 0.7, 0.3],
            }}
            transition={{
              duration: 3 + i,
              repeat: Infinity,
              delay: i * 0.7,
            }}
            className="inline-block mx-2"
          >
            <Sparkles className="w-5 h-5" style={{ color: 'var(--color-primary)', opacity: 0.4 }} />
          </motion.div>
        ))}
      </div>
    </motion.div>
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

// ============ MAP HELPERS ============

function LocationMarker({ onLocationFound }) {
  const map = useMap()
  const [position, setPosition] = useState(null)

  useEffect(() => {
    map.locate({ setView: false, watch: false })
    const handler = (e) => {
      setPosition(e.latlng)
      if (onLocationFound) onLocationFound(e.latlng)
    }
    map.on('locationfound', handler)
    return () => { map.off('locationfound', handler) }
  }, [map, onLocationFound])

  if (!position) return null

  const userIcon = L.divIcon({
    className: '',
    html: `<div style="width:18px;height:18px;background:#4285F4;border:3px solid white;border-radius:50%;box-shadow:0 0 0 5px rgba(66,133,244,0.3);"></div>`,
    iconSize: [18, 18],
    iconAnchor: [9, 9],
  })
  return <Marker position={position} icon={userIcon} />
}

function MapClickHandler({ onMapClick }) {
  useMapEvents({ click: (e) => onMapClick && onMapClick(e.latlng) })
  return null
}

function RouteMap({ page, adminClickMode = false, onMapClick }) {
  const [userLocation, setUserLocation] = useState(null)

  const destination = (page.map_destination_lat != null && page.map_destination_lng != null)
    ? [parseFloat(page.map_destination_lat), parseFloat(page.map_destination_lng)]
    : null

  let waypoints = []
  if (page.map_waypoints_json) {
    try { waypoints = JSON.parse(page.map_waypoints_json) || [] } catch {}
  }

  const buildPolyline = () => {
    const pts = []
    if (userLocation) pts.push([userLocation.lat, userLocation.lng])
    waypoints.forEach(wp => pts.push([parseFloat(wp.lat), parseFloat(wp.lng)]))
    if (destination) pts.push(destination)
    return pts
  }

  const center = destination
    || (waypoints.length > 0 ? [parseFloat(waypoints[0].lat), parseFloat(waypoints[0].lng)] : [44.4268, 26.1025])
  const zoom = destination ? 13 : 10

  const destinationIcon = L.divIcon({
    className: '',
    html: `<div style="font-size:32px;line-height:1;filter:drop-shadow(0 2px 4px rgba(0,0,0,0.5))">🏁</div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32],
  })

  const waypointIcon = (index) => L.divIcon({
    className: '',
    html: `<div style="width:26px;height:26px;background:#db2777;border:3px solid white;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:bold;color:white;box-shadow:0 2px 6px rgba(0,0,0,0.4);text-align:center;line-height:20px;">${index + 1}</div>`,
    iconSize: [26, 26],
    iconAnchor: [13, 13],
  })

  const polylinePoints = buildPolyline()

  const openGoogleMaps = () => {
    if (!destination) return
    const waypointsParam = waypoints.length > 0
      ? `&waypoints=${waypoints.map(wp => `${wp.lat},${wp.lng}`).join('|')}`
      : ''
    const url = `https://www.google.com/maps/dir/?api=1&destination=${destination[0]},${destination[1]}${waypointsParam}&travelmode=driving`
    window.open(url, '_blank')
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-3"
    >
      {/* Romantic message */}
      {page.map_message && (
        <div
          className="card text-center py-4 px-5"
          style={{
            background: 'linear-gradient(135deg, rgba(var(--color-primary-rgb), 0.08), rgba(var(--color-secondary-rgb), 0.08))',
            border: '1px solid rgba(var(--color-primary-rgb), 0.2)',
          }}
        >
          <MapPin className="w-5 h-5 text-primary mx-auto mb-2" />
          <p className="text-text italic leading-relaxed">{page.map_message}</p>
        </div>
      )}

      {/* Map container */}
      <div className="rounded-2xl overflow-hidden shadow-lg" style={{ height: adminClickMode ? '300px' : '380px' }}>
        <MapContainer
          center={center}
          zoom={zoom}
          style={{ height: '100%', width: '100%' }}
          attributionControl={false}
        >
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          {adminClickMode && onMapClick && <MapClickHandler onMapClick={onMapClick} />}
          {!adminClickMode && <LocationMarker onLocationFound={setUserLocation} />}

          {/* Waypoint markers */}
          {waypoints.map((wp, i) => (
            <Marker key={i} position={[parseFloat(wp.lat), parseFloat(wp.lng)]} icon={waypointIcon(i)}>
              {wp.label && <Popup>{wp.label}</Popup>}
            </Marker>
          ))}

          {/* Destination marker */}
          {destination && (
            <Marker position={destination} icon={destinationIcon}>
              {page.map_destination_name && <Popup>{page.map_destination_name}</Popup>}
            </Marker>
          )}

          {/* Route polyline */}
          {polylinePoints.length >= 2 && (
            <Polyline
              positions={polylinePoints}
              pathOptions={{ color: '#db2777', weight: 4, opacity: 0.85, dashArray: '10, 8' }}
            />
          )}
        </MapContainer>
      </div>

      {/* Open in Google Maps */}
      {destination && !adminClickMode && (
        <button
          onClick={openGoogleMaps}
          className="btn btn-primary w-full flex items-center justify-center gap-2"
        >
          <Navigation2 className="w-5 h-5" />
          Deschide în Google Maps
        </button>
      )}

      {/* Destination label */}
      {destination && page.map_destination_name && (
        <div className="text-center text-sm text-gray-500 flex items-center justify-center gap-1">
          <MapPin className="w-4 h-4 text-primary/70" />
          <span>Destinație: <span className="text-text font-medium">{page.map_destination_name}</span></span>
        </div>
      )}

      {adminClickMode && (
        <p className="text-xs text-center text-gray-400 italic">
          Click pe hartă pentru a plasa coordonatele
        </p>
      )}
    </motion.div>
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

  // Map state
  const [mapEnabled, setMapEnabled] = useState(page.map_enabled || false)
  const [mapDestLat, setMapDestLat] = useState(page.map_destination_lat != null ? String(page.map_destination_lat) : '')
  const [mapDestLng, setMapDestLng] = useState(page.map_destination_lng != null ? String(page.map_destination_lng) : '')
  const [mapDestName, setMapDestName] = useState(page.map_destination_name || '')
  const [mapWaypoints, setMapWaypoints] = useState(() => {
    try { return JSON.parse(page.map_waypoints_json) || [] } catch { return [] }
  })
  const [mapMessage, setMapMessage] = useState(page.map_message || '')
  const [clickMode, setClickMode] = useState('destination')
  const [newWpLabel, setNewWpLabel] = useState('')

  const updateMutation = useMutation({
    mutationFn: async (data) => {
      return (await api.put(`/coming-soon/${page.id}`, data)).data
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['coming-soon-active'])
      queryClient.invalidateQueries(['coming-soon-page', String(page.id)])
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
      queryClient.invalidateQueries(['coming-soon-page', String(page.id)])
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
      queryClient.invalidateQueries(['coming-soon-page', String(page.id)])
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

  const saveMapMutation = useMutation({
    mutationFn: async (data) => {
      return (await api.put(`/coming-soon/${page.id}`, data)).data
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['coming-soon-active'])
      queryClient.invalidateQueries(['coming-soon-page', String(page.id)])
      toast.success('Harta a fost salvată!')
    },
    onError: () => toast.error('Eroare la salvarea hărții')
  })

  const handleSaveMap = () => {
    saveMapMutation.mutate({
      map_enabled: mapEnabled,
      map_destination_lat: mapDestLat !== '' ? parseFloat(mapDestLat) : null,
      map_destination_lng: mapDestLng !== '' ? parseFloat(mapDestLng) : null,
      map_destination_name: mapDestName || null,
      map_waypoints_json: mapWaypoints.length > 0 ? JSON.stringify(mapWaypoints) : null,
      map_message: mapMessage || null,
    })
  }

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

      {/* Map Configuration */}
      <div className="card space-y-4">
        <h3 className="font-semibold text-text flex items-center gap-2">
          <MapPin className="w-5 h-5 text-primary" />
          Hartă & Rută
        </h3>

        {/* Enable toggle */}
        <label className="flex items-center gap-3 cursor-pointer select-none">
          <div
            onClick={() => setMapEnabled(!mapEnabled)}
            className={`relative w-11 h-6 rounded-full transition-colors cursor-pointer ${mapEnabled ? 'bg-primary' : 'bg-gray-300'}`}
          >
            <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${mapEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
          </div>
          <span className="text-sm font-medium text-text">Activează harta pe pagină</span>
        </label>

        {/* Map message */}
        <div>
          <label className="block text-sm font-medium text-text mb-1">Mesaj romantic</label>
          <textarea
            value={mapMessage}
            onChange={(e) => setMapMessage(e.target.value)}
            className="input min-h-[60px]"
            placeholder="Un mesaj special care apare deasupra hărții... ✨"
            rows={2}
          />
        </div>

        {/* Destination */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-text">Destinație finală</label>
          <input
            type="text"
            value={mapDestName}
            onChange={(e) => setMapDestName(e.target.value)}
            className="input"
            placeholder="Numele locului magic (ex: Locul magic ✨)"
          />
          <div className="grid grid-cols-2 gap-2">
            <input
              type="number"
              step="any"
              value={mapDestLat}
              onChange={(e) => setMapDestLat(e.target.value)}
              className="input text-sm"
              placeholder="Latitudine"
            />
            <input
              type="number"
              step="any"
              value={mapDestLng}
              onChange={(e) => setMapDestLng(e.target.value)}
              className="input text-sm"
              placeholder="Longitudine"
            />
          </div>
        </div>

        {/* Waypoints */}
        <div>
          <label className="block text-sm font-medium text-text mb-2">
            Puncte de reper ({mapWaypoints.length})
          </label>
          {mapWaypoints.length > 0 && (
            <div className="space-y-1 mb-2">
              {mapWaypoints.map((wp, i) => (
                <div key={i} className="flex items-center gap-2 text-sm bg-gray-50 dark:bg-gray-800/50 rounded-lg px-3 py-2">
                  <span className="w-5 h-5 bg-primary/20 text-primary rounded-full text-xs flex items-center justify-center font-bold flex-shrink-0">{i + 1}</span>
                  <span className="flex-1 text-text truncate">{wp.label || `${parseFloat(wp.lat).toFixed(4)}, ${parseFloat(wp.lng).toFixed(4)}`}</span>
                  <button
                    onClick={() => setMapWaypoints(prev => prev.filter((_, idx) => idx !== i))}
                    className="text-red-400 hover:text-red-600 flex-shrink-0"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
          <input
            type="text"
            value={newWpLabel}
            onChange={(e) => setNewWpLabel(e.target.value)}
            className="input text-sm"
            placeholder="Label pentru următorul punct de reper (opțional)"
          />
          <p className="text-xs text-gray-400 mt-1">Selectează modul "Punct Reper" și click pe hartă pentru a adăuga</p>
        </div>

        {/* Click mode selector + preview map */}
        <div>
          <div className="flex gap-2 mb-2">
            <button
              onClick={() => setClickMode('destination')}
              className={`btn text-xs flex-1 ${clickMode === 'destination' ? 'btn-primary' : 'btn-ghost'}`}
            >
              <MapPin className="w-3.5 h-3.5 mr-1" />
              Setează Destinație
            </button>
            <button
              onClick={() => setClickMode('waypoint')}
              className={`btn text-xs flex-1 ${clickMode === 'waypoint' ? 'btn-primary' : 'btn-ghost'}`}
            >
              <Plus className="w-3.5 h-3.5 mr-1" />
              Punct Reper
            </button>
          </div>
          <RouteMap
            page={{
              ...page,
              map_enabled: mapEnabled,
              map_destination_lat: mapDestLat !== '' ? parseFloat(mapDestLat) : null,
              map_destination_lng: mapDestLng !== '' ? parseFloat(mapDestLng) : null,
              map_destination_name: mapDestName,
              map_waypoints_json: mapWaypoints.length > 0 ? JSON.stringify(mapWaypoints) : null,
              map_message: null,
            }}
            adminClickMode={true}
            onMapClick={(latlng) => {
              if (clickMode === 'destination') {
                setMapDestLat(latlng.lat.toFixed(6))
                setMapDestLng(latlng.lng.toFixed(6))
              } else {
                setMapWaypoints(prev => [...prev, {
                  lat: parseFloat(latlng.lat.toFixed(6)),
                  lng: parseFloat(latlng.lng.toFixed(6)),
                  label: newWpLabel || `Punct ${prev.length + 1}`,
                }])
                setNewWpLabel('')
              }
            }}
          />
        </div>

        <button
          onClick={handleSaveMap}
          disabled={saveMapMutation.isPending}
          className="btn btn-primary w-full"
        >
          {saveMapMutation.isPending ? 'Se salvează...' : 'Salvează Harta'}
        </button>
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
