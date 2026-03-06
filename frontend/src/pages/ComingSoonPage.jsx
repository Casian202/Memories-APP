import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Clock, Plus, Trash2, X, Image, Quote, Calendar,
  ChevronLeft, ChevronRight, Sparkles, Upload, Type, MapPin, Navigation2,
  CheckCircle, ChevronUp, ChevronDown, RotateCcw, Heart, Film, Lock
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
  const [previewMode, setPreviewMode] = useState(false)

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
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setPreviewMode(!previewMode)
                if (!previewMode) setShowAdminPanel(false)
              }}
              className={`btn text-sm ${previewMode ? 'btn-primary' : 'btn-ghost'}`}
            >
              {previewMode ? 'Ieși din Preview' : '👁 Preview'}
            </button>
            {!previewMode && (
              <button
                onClick={() => setShowAdminPanel(!showAdminPanel)}
                className="btn btn-ghost text-sm"
              >
                {showAdminPanel ? 'Ascunde Admin' : 'Admin'}
              </button>
            )}
          </div>
        )}
      </div>

      {/* Admin Panel */}
      <AnimatePresence>
        {showAdminPanel && isAdmin() && !previewMode && (
          <AdminPanel page={page} />
        )}
      </AnimatePresence>

      {/* Preview mode banner */}
      <AnimatePresence>
        {previewMode && isAdmin() && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="rounded-xl px-4 py-2 text-sm font-medium text-center"
            style={{
              background: 'rgba(var(--color-primary-rgb), 0.12)',
              border: '1px dashed rgba(var(--color-primary-rgb), 0.5)',
              color: 'var(--color-primary)',
            }}
          >
            👁 Mod Preview — exact ce vede partenera ta
          </motion.div>
        )}
      </AnimatePresence>

      {/* Non-admin unrevealed OR admin in preview mode: show teaser only */}
      {(!isAdmin() || previewMode) && !page.is_revealed ? (
        <ComingSoonTeaser page={page} />
      ) : (
        <RevealedContent page={page} isAdminView={isAdmin() && !previewMode} />
      )}
    </div>
  )
}

// ============ REVEALED CONTENT (after reveal date) ============
function RevealedContent({ page, isAdminView }) {
  // Check route completion from localStorage
  const progressKey = `hunt-progress-${page.id}`
  const [routeCompleted, setRouteCompleted] = useState(() => {
    if (!page.map_enabled) return true // no map = content visible immediately
    try {
      const waypoints = JSON.parse(page.map_waypoints_json || '[]')
      const hasDest = page.map_destination_lat != null && page.map_destination_lng != null
      const totalStops = waypoints.length + (hasDest ? 1 : 0)
      if (totalStops === 0) return true
      const progress = parseInt(localStorage.getItem(progressKey) || '0', 10)
      return progress >= totalStops
    } catch { return false }
  })

  // Re-check on storage changes (RouteMap updates localStorage)
  useEffect(() => {
    const check = () => {
      if (!page.map_enabled) { setRouteCompleted(true); return }
      try {
        const waypoints = JSON.parse(page.map_waypoints_json || '[]')
        const hasDest = page.map_destination_lat != null && page.map_destination_lng != null
        const totalStops = waypoints.length + (hasDest ? 1 : 0)
        if (totalStops === 0) { setRouteCompleted(true); return }
        const progress = parseInt(localStorage.getItem(progressKey) || '0', 10)
        setRouteCompleted(progress >= totalStops)
      } catch { /* keep current state */ }
    }
    // Listen for storage events and custom events
    window.addEventListener('storage', check)
    window.addEventListener('route-progress-updated', check)
    const interval = setInterval(check, 1000) // poll fallback
    return () => {
      window.removeEventListener('storage', check)
      window.removeEventListener('route-progress-updated', check)
      clearInterval(interval)
    }
  }, [page, progressKey])

  const showContent = isAdminView || routeCompleted

  return (
    <>
      {/* Route Map — always visible after reveal if enabled */}
      {page.map_enabled && (
        <RouteMap page={page} />
      )}

      {/* Content gated behind route completion */}
      {showContent ? (
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

          {/* Photo/Video Slideshow */}
          {page.photos?.length > 0 && (
            <PhotoSlideshow photos={page.photos} />
          )}

          {/* Floating Quotes */}
          {page.quotes?.length > 0 && (
            <FloatingQuotes quotes={page.quotes} />
          )}
        </>
      ) : page.map_enabled ? (
        /* Hint that content is locked behind route completion */
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="card text-center py-8"
          style={{
            background: 'linear-gradient(135deg, rgba(var(--color-primary-rgb),0.06), rgba(var(--color-secondary-rgb),0.06))',
            border: '1px dashed rgba(var(--color-primary-rgb),0.3)',
          }}
        >
          <Lock className="w-10 h-10 mx-auto mb-3" style={{ color: 'var(--color-primary)', opacity: 0.5 }} />
          <p className="text-text font-medium mb-1">Mai sunt surprize pentru tine...</p>
          <p className="text-gray-500 text-sm">Finalizează ruta pentru a descoperi restul conținutului 💝</p>
        </motion.div>
      ) : null}

      {/* Empty state if no content at all */}
      {showContent && !page.photos?.length && !page.quotes?.length && !page.map_enabled && !page.description && (
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

// ============ PHOTO/VIDEO SLIDESHOW ============
function PhotoSlideshow({ photos }) {
  const [current, setCurrent] = useState(0)
  const [isAutoPlaying, setIsAutoPlaying] = useState(true)
  const [videoPlaying, setVideoPlaying] = useState(false)
  const intervalRef = useRef(null)
  const videoRef = useRef(null)

  const currentItem = photos[current]
  const isCurrentVideo = currentItem?.media_type === 'video'

  const nextSlide = useCallback(() => {
    setCurrent(c => (c + 1) % photos.length)
    setVideoPlaying(false)
  }, [photos.length])

  const prevSlide = useCallback(() => {
    setCurrent(c => (c - 1 + photos.length) % photos.length)
    setVideoPlaying(false)
  }, [photos.length])

  // Auto-play (pauses on video)
  useEffect(() => {
    if (isAutoPlaying && photos.length > 1 && !isCurrentVideo) {
      intervalRef.current = setInterval(nextSlide, 5000)
      return () => clearInterval(intervalRef.current)
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [isAutoPlaying, nextSlide, photos.length, isCurrentVideo])

  const handleManualNav = (fn) => {
    setIsAutoPlaying(false)
    fn()
    // Resume auto-play after 10 seconds
    setTimeout(() => setIsAutoPlaying(true), 10000)
  }

  // When video ends, advance to next slide
  const handleVideoEnded = () => {
    setVideoPlaying(false)
    if (photos.length > 1) {
      nextSlide()
      setIsAutoPlaying(true)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative rounded-2xl overflow-hidden shadow-2xl"
      style={{ aspectRatio: '16/9' }}
    >
      <AnimatePresence mode="wait">
        {isCurrentVideo ? (
          <motion.div
            key={currentItem.id}
            initial={{ opacity: 0, scale: 1.05 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.8 }}
            className="absolute inset-0 w-full h-full bg-black"
          >
            {currentItem.transcoding_status === 'pending' || currentItem.transcoding_status === 'processing' ? (
              <div className="flex items-center justify-center w-full h-full">
                <div className="text-center text-white">
                  <div className="w-10 h-10 border-3 border-white border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                  <p className="text-sm opacity-70">Se procesează videoclipul...</p>
                </div>
              </div>
            ) : currentItem.transcoding_status === 'failed' ? (
              <div className="flex items-center justify-center w-full h-full">
                <p className="text-white text-sm opacity-70">Videoclipul nu a putut fi procesat</p>
              </div>
            ) : (
              <video
                ref={videoRef}
                src={`/photos/${currentItem.file_path}`}
                className="w-full h-full object-contain"
                controls
                autoPlay
                playsInline
                onPlay={() => setVideoPlaying(true)}
                onPause={() => setVideoPlaying(false)}
                onEnded={handleVideoEnded}
              />
            )}
          </motion.div>
        ) : (
          <motion.img
            key={currentItem.id}
            src={`/photos/${currentItem.file_path}`}
            alt=""
            initial={{ opacity: 0, scale: 1.05 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.8 }}
            className="absolute inset-0 w-full h-full object-cover"
          />
        )}
      </AnimatePresence>

      {/* Gradient overlay (only on images) */}
      {!isCurrentVideo && (
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
      )}

      {/* Navigation arrows */}
      {photos.length > 1 && (
        <>
          <button
            onClick={() => handleManualNav(prevSlide)}
            className="absolute left-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/40 text-white hover:bg-black/60 backdrop-blur-sm transition-colors z-10"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            onClick={() => handleManualNav(nextSlide)}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/40 text-white hover:bg-black/60 backdrop-blur-sm transition-colors z-10"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </>
      )}

      {/* Dots indicator */}
      {photos.length > 1 && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-10">
          {photos.map((p, i) => (
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

function FlyTo({ position, zoom }) {
  const map = useMap()
  useEffect(() => {
    if (position) map.flyTo(position, zoom || 15, { duration: 1.0 })
  }, [position?.[0], position?.[1]])
  return null
}

// Admin-only full overview map (all points visible, click-to-place)
function AdminOverviewMap({ page, onMapClick, clickMode }) {
  const destination = (page.map_destination_lat != null && page.map_destination_lng != null)
    ? [parseFloat(page.map_destination_lat), parseFloat(page.map_destination_lng)]
    : null

  const waypoints = useMemo(() => {
    try { return JSON.parse(page.map_waypoints_json) || [] } catch { return [] }
  }, [page.map_waypoints_json])

  const center = waypoints.length > 0
    ? [parseFloat(waypoints[0].lat), parseFloat(waypoints[0].lng)]
    : destination || [44.4268, 26.1025]

  const destIcon = L.divIcon({
    className: '',
    html: `<div style="font-size:28px;line-height:1;filter:drop-shadow(0 2px 4px rgba(0,0,0,0.5))">🏁</div>`,
    iconSize: [28, 28], iconAnchor: [14, 28], popupAnchor: [0, -28],
  })
  const wpIcon = (i, total) => L.divIcon({
    className: '',
    html: `<div style="width:26px;height:26px;background:${i === total - 1 && !destination ? '#dc2626' : '#db2777'};border:3px solid white;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:bold;color:white;box-shadow:0 2px 6px rgba(0,0,0,0.4);">${i + 1}</div>`,
    iconSize: [26, 26], iconAnchor: [13, 13],
  })

  const polyline = [
    ...waypoints.map(wp => [parseFloat(wp.lat), parseFloat(wp.lng)]),
    ...(destination ? [destination] : []),
  ]

  return (
    <div className="rounded-2xl overflow-hidden shadow-lg" style={{ height: '300px' }}>
      <MapContainer center={center} zoom={13} style={{ height: '100%', width: '100%' }} attributionControl={false}>
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        <MapClickHandler onMapClick={onMapClick} />
        {waypoints.map((wp, i) => (
          <Marker key={i} position={[parseFloat(wp.lat), parseFloat(wp.lng)]} icon={wpIcon(i, waypoints.length)}>
            <Popup>{wp.label || `Punct ${i + 1}`}</Popup>
          </Marker>
        ))}
        {destination && (
          <Marker position={destination} icon={destIcon}>
            {page.map_destination_name && <Popup>{page.map_destination_name}</Popup>}
          </Marker>
        )}
        {polyline.length >= 2 && (
          <Polyline positions={polyline} pathOptions={{ color: '#db2777', weight: 3, opacity: 0.7, dashArray: '8, 6' }} />
        )}
      </MapContainer>
    </div>
  )
}

// User-facing hunt map: shows one stop at a time, confirm arrival to advance
function RouteMap({ page, adminClickMode = false, onMapClick }) {
  if (adminClickMode) {
    return (
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-2">
        <AdminOverviewMap page={page} onMapClick={onMapClick} />
        <p className="text-xs text-center text-gray-400 italic">Click pe hartă pentru a plasa coordonatele</p>
      </motion.div>
    )
  }

  // Build ordered stops: waypoints first, then final destination
  const waypoints = useMemo(() => {
    try { return JSON.parse(page.map_waypoints_json) || [] } catch { return [] }
  }, [page.map_waypoints_json])

  const destination = (page.map_destination_lat != null && page.map_destination_lng != null)
    ? { lat: parseFloat(page.map_destination_lat), lng: parseFloat(page.map_destination_lng), label: page.map_destination_name || 'Destinația finală', hint: null, isFinal: true }
    : null

  const allStops = [
    ...waypoints.map((wp, i) => ({ ...wp, isFinal: false, stepIndex: i })),
    ...(destination ? [{ ...destination, isFinal: true, stepIndex: waypoints.length }] : []),
  ]

  const progressKey = `hunt-progress-${page.id}`
  const [currentStep, setCurrentStep] = useState(() => {
    try { return Math.min(parseInt(localStorage.getItem(progressKey) || '0', 10), allStops.length) } catch { return 0 }
  })
  const [confirming, setConfirming] = useState(false)
  const [justConfirmed, setJustConfirmed] = useState(false)
  const [showCelebration, setShowCelebration] = useState(false)

  const isFinished = currentStep >= allStops.length
  const stop = isFinished ? null : allStops[currentStep]
  const stopPos = stop ? [parseFloat(stop.lat), parseFloat(stop.lng)] : null

  // Auto-dismiss celebration after 5 seconds
  useEffect(() => {
    if (isFinished) {
      setShowCelebration(true)
      const timer = setTimeout(() => setShowCelebration(false), 5000)
      return () => clearTimeout(timer)
    }
  }, [isFinished])

  const handleConfirm = () => {
    setConfirming(true)
    setJustConfirmed(true)
    setTimeout(() => {
      const next = currentStep + 1
      setCurrentStep(next)
      localStorage.setItem(progressKey, String(next))
      // Notify RevealedContent about progress change
      window.dispatchEvent(new Event('route-progress-updated'))
      setConfirming(false)
      setJustConfirmed(false)
    }, 1400)
  }

  const handleReset = () => {
    localStorage.removeItem(progressKey)
    setCurrentStep(0)
    window.dispatchEvent(new Event('route-progress-updated'))
  }

  const openGoogleMapsToStop = () => {
    if (!stop) return
    const url = `https://www.google.com/maps/dir/?api=1&destination=${stop.lat},${stop.lng}&travelmode=driving`
    window.open(url, '_blank')
  }

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
      {/* Romantic message */}
      {page.map_message && currentStep === 0 && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          className="card text-center py-4 px-5"
          style={{
            background: 'linear-gradient(135deg, rgba(var(--color-primary-rgb),0.08),rgba(var(--color-secondary-rgb),0.08))',
            border: '1px solid rgba(var(--color-primary-rgb),0.2)',
          }}
        >
          <Heart className="w-5 h-5 text-primary mx-auto mb-2" />
          <p className="text-text italic leading-relaxed">{page.map_message}</p>
        </motion.div>
      )}

      {/* Progress stepper — only show completed + current, then '...' so total stays hidden */}
      {allStops.length > 1 && (
        <div className="flex items-center justify-center gap-1.5 flex-wrap px-2">
          {/* Completed stops */}
          {Array.from({ length: currentStep }).map((_, i) => (
            <div key={i} className="flex items-center gap-1">
              <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border-2 bg-green-500 border-green-500 text-white transition-all duration-500">
                ✓
              </div>
              <div className="h-0.5 w-4 sm:w-6 rounded bg-green-400" />
            </div>
          ))}
          {/* Current stop */}
          {!isFinished && (
            <div className="flex items-center gap-1">
              <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border-2 bg-primary border-primary text-white scale-110 shadow-md transition-all duration-500">
                {stop?.isFinal ? '🏁' : currentStep + 1}
              </div>
              {/* Ellipsis to hint more stops ahead without revealing count */}
              {!stop?.isFinal && (
                <>
                  <div className="h-0.5 w-4 sm:w-6 rounded bg-gray-200" />
                  <div className="flex gap-0.5">
                    {[0,1,2].map(d => (
                      <div key={d} className="w-1.5 h-1.5 rounded-full bg-gray-300" />
                    ))}
                  </div>
                </>
              )}
            </div>
          )}
          {/* Finished */}
          {isFinished && (
            <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border-2 bg-green-500 border-green-500 text-white">✓</div>
          )}
        </div>
      )}

      {/* Finished! */}
      {isFinished && showCelebration ? (
        <AnimatePresence>
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ type: 'spring', stiffness: 200 }}
            className="card text-center py-10 px-6"
            style={{
              background: 'linear-gradient(135deg, rgba(var(--color-primary-rgb),0.1),rgba(var(--color-secondary-rgb),0.1))',
              border: '2px solid rgba(var(--color-primary-rgb),0.3)',
            }}
          >
            <motion.div
              animate={{ scale: [1, 1.15, 1], rotate: [0, 5, -5, 0] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="text-5xl mb-4"
            >
              💍
            </motion.div>
            <h2 className="text-2xl font-bold text-text mb-2">Ai ajuns! ✨</h2>
            <p className="text-gray-500 mb-6">Ai urmat toate punctele rutei. Momentul magic te așteaptă!</p>
            <button onClick={handleReset} className="btn btn-ghost text-xs text-gray-400 flex items-center gap-1 mx-auto">
              <RotateCcw className="w-3.5 h-3.5" /> Resetează ruta
            </button>
          </motion.div>
        </AnimatePresence>
      ) : isFinished ? null : (
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -40 }}
            transition={{ duration: 0.4 }}
            className="space-y-3"
          >
            {/* Current stop card */}
            <div
              className="card px-5 py-4 space-y-3"
              style={{
                background: 'linear-gradient(135deg, rgba(var(--color-primary-rgb),0.06),rgba(var(--color-secondary-rgb),0.06))',
                border: '1px solid rgba(var(--color-primary-rgb),0.25)',
              }}
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-primary text-white flex items-center justify-center font-bold text-sm flex-shrink-0 shadow">
                  {stop.isFinal ? '🏁' : currentStep + 1}
                </div>
                <div>
                  <div className="text-xs text-gray-400 font-medium uppercase tracking-wide">
                    {stop.isFinal ? 'Destinație finală' : `Punct ${currentStep + 1} din ?`}
                  </div>
                  <div className="font-semibold text-text">{stop.label || `Punct ${currentStep + 1}`}</div>
                </div>
              </div>

              {stop.hint && (
                <div className="rounded-xl px-4 py-3 text-sm text-text italic leading-relaxed"
                  style={{ background: 'rgba(var(--color-primary-rgb),0.08)', borderLeft: '3px solid var(--color-primary)' }}>
                  💌 {stop.hint}
                </div>
              )}
            </div>

            {/* Map */}
            <div className="rounded-2xl overflow-hidden shadow-lg" style={{ height: '300px' }}>
              <MapContainer center={stopPos} zoom={15} style={{ height: '100%', width: '100%' }} attributionControl={false}>
                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                <FlyTo position={stopPos} zoom={15} />
                <LocationMarker />
                <Marker
                  position={stopPos}
                  icon={L.divIcon({
                    className: '',
                    html: stop.isFinal
                      ? `<div style="font-size:36px;line-height:1;filter:drop-shadow(0 2px 6px rgba(0,0,0,0.6))">🏁</div>`
                      : `<div style="width:32px;height:32px;background:#db2777;border:4px solid white;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:bold;color:white;box-shadow:0 3px 10px rgba(219,39,119,0.5);">${currentStep + 1}</div>`,
                    iconSize: [36, 36],
                    iconAnchor: [18, 18],
                    popupAnchor: [0, -18],
                  })}
                >
                  <Popup>{stop.label || `Punct ${currentStep + 1}`}</Popup>
                </Marker>
              </MapContainer>
            </div>

            {/* Actions */}
            <button
              onClick={openGoogleMapsToStop}
              className="btn btn-ghost border w-full flex items-center justify-center gap-2 text-sm"
              style={{ borderColor: 'rgba(var(--color-primary-rgb),0.3)', color: 'var(--color-primary)' }}
            >
              <Navigation2 className="w-4 h-4" />
              Navighează spre acest punct
            </button>

            <motion.button
              onClick={handleConfirm}
              disabled={confirming}
              whileTap={{ scale: 0.96 }}
              className="btn btn-primary w-full flex items-center justify-center gap-2 text-base py-3 relative overflow-hidden"
            >
              <AnimatePresence mode="wait">
                {justConfirmed ? (
                  <motion.span
                    key="confirmed"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex items-center gap-2"
                  >
                    <CheckCircle className="w-5 h-5" /> Confirmat! ✨
                  </motion.span>
                ) : (
                  <motion.span key="ready" className="flex items-center gap-2">
                    <CheckCircle className="w-5 h-5" />
                    Am ajuns! {stop.isFinal ? '💍' : '→'}
                  </motion.span>
                )}
              </AnimatePresence>
            </motion.button>

            {currentStep > 0 && (
              <button onClick={handleReset} className="btn btn-ghost text-xs text-gray-400 flex items-center gap-1 mx-auto w-fit">
                <RotateCcw className="w-3 h-3" /> Resetează ruta
              </button>
            )}
          </motion.div>
        </AnimatePresence>
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
  const [clickMode, setClickMode] = useState('waypoint')
  const [newWpLabel, setNewWpLabel] = useState('')
  const [newWpHint, setNewWpHint] = useState('')

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

      {/* Photos/Videos Management */}
      <div className="card space-y-3">
        <h3 className="font-semibold text-text flex items-center gap-2">
          <Image className="w-5 h-5" />
          Poze & Videoclipuri ({page.photos?.length || 0})
        </h3>

        {/* Upload */}
        <label className="block border-2 border-dashed border-gray-300 hover:border-primary rounded-xl cursor-pointer transition-colors">
          <input
            type="file"
            multiple
            accept="image/*,video/*"
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
                <span className="text-sm">Adaugă poze / videoclipuri</span>
              </>
            )}
          </div>
        </label>

        {/* Photo/video thumbnails */}
        {page.photos?.length > 0 && (
          <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
            {page.photos.map((photo) => (
              <div key={photo.id} className="relative aspect-square group">
                {photo.media_type === 'video' ? (
                  <div className="w-full h-full bg-gray-900 rounded-lg flex items-center justify-center relative overflow-hidden">
                    <Film className="w-6 h-6 text-white/60" />
                    {photo.transcoding_status === 'pending' || photo.transcoding_status === 'processing' ? (
                      <div className="absolute bottom-1 left-1 right-1 text-center">
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto" />
                        <span className="text-[9px] text-white/60">procesare...</span>
                      </div>
                    ) : photo.transcoding_status === 'failed' ? (
                      <div className="absolute bottom-1 left-1 right-1 text-center">
                        <span className="text-[9px] text-red-400">eroare</span>
                      </div>
                    ) : null}
                  </div>
                ) : (
                  <img
                    src={`/photos/${photo.file_path}`}
                    alt=""
                    className="w-full h-full object-cover rounded-lg"
                  />
                )}
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
            Puncte de reper pe traseu ({mapWaypoints.length})
          </label>
          {mapWaypoints.length > 0 && (
            <div className="space-y-2 mb-3">
              {mapWaypoints.map((wp, i) => (
                <div key={i} className="flex items-start gap-2 bg-gray-50 dark:bg-gray-800/50 rounded-xl px-3 py-2">
                  <span className="w-6 h-6 mt-0.5 bg-primary/20 text-primary rounded-full text-xs flex items-center justify-center font-bold flex-shrink-0">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-text">{wp.label || `Punct ${i + 1}`}</div>
                    {wp.hint && <div className="text-xs text-gray-400 italic mt-0.5 truncate">💌 {wp.hint}</div>}
                    <div className="text-xs text-gray-400 mt-0.5">{parseFloat(wp.lat).toFixed(5)}, {parseFloat(wp.lng).toFixed(5)}</div>
                  </div>
                  <div className="flex flex-col gap-0.5 flex-shrink-0">
                    <button
                      disabled={i === 0}
                      onClick={() => setMapWaypoints(prev => { const a = [...prev]; [a[i-1], a[i]] = [a[i], a[i-1]]; return a })}
                      className="p-0.5 text-gray-400 hover:text-primary disabled:opacity-20"
                    >
                      <ChevronUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      disabled={i === mapWaypoints.length - 1}
                      onClick={() => setMapWaypoints(prev => { const a = [...prev]; [a[i], a[i+1]] = [a[i+1], a[i]]; return a })}
                      className="p-0.5 text-gray-400 hover:text-primary disabled:opacity-20"
                    >
                      <ChevronDown className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <button
                    onClick={() => setMapWaypoints(prev => prev.filter((_, idx) => idx !== i))}
                    className="p-1 text-red-400 hover:text-red-600 flex-shrink-0 mt-0.5"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
          <div className="space-y-2 p-3 rounded-xl border border-dashed border-gray-300 dark:border-gray-600">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Punct nou</p>
            <input
              type="text"
              value={newWpLabel}
              onChange={(e) => setNewWpLabel(e.target.value)}
              className="input text-sm"
              placeholder="Numele locului (ex: Parcul Central)"
            />
            <textarea
              value={newWpHint}
              onChange={(e) => setNewWpHint(e.target.value)}
              className="input text-sm min-h-[50px]"
              rows={2}
              placeholder="Indiciu/mesaj pentru ea la acest punct... 💌"
            />
            <p className="text-xs text-gray-400">→ Alege modul <b>Punct Reper</b> și click pe hartă pentru a plasa</p>
          </div>
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
                  hint: newWpHint || null,
                }])
                setNewWpLabel('')
                setNewWpHint('')
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
