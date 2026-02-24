import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Heart, Gift, X, Sparkles, ArrowRight } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import api from '../services/api'
import { useAuth } from '../context/AuthContext'

const POLL_INTERVAL = 30000 // 30 seconds

export default function NotificationPopup() {
  const { user, tokenReady } = useAuth()
  const navigate = useNavigate()
  const [motivationPopup, setMotivationPopup] = useState(null)
  const [surprisePopup, setSurprisePopup] = useState(null)
  const [motivationQueue, setMotivationQueue] = useState([])
  const [surpriseQueue, setSurpriseQueue] = useState([])
  const seenMotivationIds = useRef(new Set())
  const seenSurpriseIds = useRef(new Set())
  const pollRef = useRef(null)
  const initialCheckDone = useRef(false)

  const checkNotifications = useCallback(async () => {
    if (!user || !tokenReady) return
    
    try {
      const response = await api.get('/notifications/unread')
      const data = response.data
      
      // Filter out already-seen notifications
      const newMotivations = (data.unread_motivations || []).filter(
        m => !seenMotivationIds.current.has(m.id)
      )
      const newSurprises = (data.new_surprises || []).filter(
        s => !seenSurpriseIds.current.has(s.id)
      )
      
      // Queue new motivations
      if (newMotivations.length > 0) {
        newMotivations.forEach(m => seenMotivationIds.current.add(m.id))
        setMotivationQueue(prev => [...prev, ...newMotivations])
      }
      
      // Queue new surprises
      if (newSurprises.length > 0) {
        newSurprises.forEach(s => seenSurpriseIds.current.add(s.id))
        setSurpriseQueue(prev => [...prev, ...newSurprises])
      }
    } catch (error) {
      // Silently ignore - user might not be logged in yet
    }
  }, [user, tokenReady])

  // Process queues - show one popup at a time, surprises first
  useEffect(() => {
    if (surprisePopup || motivationPopup) return // Already showing a popup
    
    if (surpriseQueue.length > 0) {
      setSurprisePopup(surpriseQueue[0])
      setSurpriseQueue(prev => prev.slice(1))
    } else if (motivationQueue.length > 0) {
      setMotivationPopup(motivationQueue[0])
      setMotivationQueue(prev => prev.slice(1))
    }
  }, [surpriseQueue, motivationQueue, surprisePopup, motivationPopup])

  // Initial check on login + polling
  useEffect(() => {
    if (!user || !tokenReady) {
      initialCheckDone.current = false
      return
    }
    
    // Initial check with small delay (let other queries settle)
    if (!initialCheckDone.current) {
      initialCheckDone.current = true
      const timeout = setTimeout(() => checkNotifications(), 1500)
      return () => clearTimeout(timeout)
    }
  }, [user, tokenReady, checkNotifications])

  // Polling
  useEffect(() => {
    if (!user || !tokenReady) return
    
    pollRef.current = setInterval(checkNotifications, POLL_INTERVAL)
    return () => clearInterval(pollRef.current)
  }, [user, tokenReady, checkNotifications])

  const dismissMotivation = async (motivation) => {
    // Mark as read in backend
    try {
      await api.put(`/motivations/${motivation.id}/read`)
    } catch (e) {
      // ignore
    }
    setMotivationPopup(null)
  }

  const goToMotivations = async (motivation) => {
    try {
      await api.put(`/motivations/${motivation.id}/read`)
    } catch (e) { /* ignore */ }
    setMotivationPopup(null)
    navigate('/motivations')
  }

  const dismissSurprise = async (surprise) => {
    // Mark notification as dismissed in backend
    try {
      await api.post(`/surprises/${surprise.id}/dismiss-notification`)
    } catch (e) {
      // ignore
    }
    setSurprisePopup(null)
  }

  const goToSurprises = async (surprise) => {
    try {
      await api.post(`/surprises/${surprise.id}/dismiss-notification`)
    } catch (e) { /* ignore */ }
    setSurprisePopup(null)
    navigate('/surprises')
  }

  return (
    <>
      <AnimatePresence>
        {motivationPopup && (
          <MotivationNotification
            motivation={motivationPopup}
            onDismiss={() => dismissMotivation(motivationPopup)}
            onView={() => goToMotivations(motivationPopup)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {surprisePopup && (
          <SurpriseNotification
            surprise={surprisePopup}
            onDismiss={() => dismissSurprise(surprisePopup)}
            onView={() => goToSurprises(surprisePopup)}
          />
        )}
      </AnimatePresence>
    </>
  )
}

/* ============ MOTIVATION POPUP ============ */
function MotivationNotification({ motivation, onDismiss, onView }) {
  // Auto-dismiss after 15 seconds
  useEffect(() => {
    const timer = setTimeout(onDismiss, 15000)
    return () => clearTimeout(timer)
  }, [onDismiss])

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      onClick={onDismiss}
    >
      {/* Blurred backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />

      <motion.div
        initial={{ scale: 0.6, opacity: 0, y: 30 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.8, opacity: 0, y: -20 }}
        transition={{ type: 'spring', stiffness: 300, damping: 25 }}
        onClick={(e) => e.stopPropagation()}
        className="relative max-w-sm w-full"
      >
        {/* Glowing border */}
        <div className="absolute -inset-1 bg-gradient-to-r from-primary via-secondary to-primary rounded-2xl opacity-50 blur-md animate-pulse" />
        
        <div className="relative bg-card rounded-2xl p-6 shadow-2xl border border-primary/20 overflow-hidden">
          {/* Background sparkle effect */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {[...Array(6)].map((_, i) => (
              <motion.div
                key={i}
                className="absolute"
                initial={{ 
                  x: `${Math.random() * 100}%`, 
                  y: `${Math.random() * 100}%`,
                  scale: 0 
                }}
                animate={{ 
                  scale: [0, 1, 0],
                  opacity: [0, 0.6, 0],
                }}
                transition={{ 
                  duration: 2,
                  delay: i * 0.3,
                  repeat: Infinity,
                  repeatDelay: 1
                }}
              >
                <Sparkles className="w-4 h-4 text-primary/30" />
              </motion.div>
            ))}
          </div>

          {/* Close button */}
          <button
            onClick={onDismiss}
            className="absolute top-3 right-3 p-1.5 hover:bg-gray-100 rounded-full z-10 transition-colors"
          >
            <X className="w-4 h-4 text-gray-400" />
          </button>

          {/* Heart icon with pulse */}
          <div className="text-center mb-4">
            <motion.div
              animate={{ scale: [1, 1.15, 1] }}
              transition={{ duration: 1.5, repeat: Infinity }}
              className="inline-block"
            >
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center mx-auto">
                <Heart className="w-8 h-8 text-primary fill-primary" />
              </div>
            </motion.div>
          </div>

          {/* Label */}
          <p className="text-center text-xs text-primary font-semibold uppercase tracking-wider mb-2">
            Motivație nouă
          </p>

          {/* Sender */}
          <p className="text-center text-sm text-gray-500 mb-3">
            De la <span className="font-semibold text-primary">{motivation.from_user_name}</span>
          </p>

          {/* Message */}
          <div className="bg-gradient-to-br from-primary/5 to-secondary/5 rounded-xl p-4 mb-4">
            <p className="text-text text-center italic leading-relaxed whitespace-pre-wrap">
              "{motivation.message}"
            </p>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={onDismiss}
              className="btn btn-ghost flex-1 text-sm"
            >
              Am citit
            </button>
            <button
              onClick={onView}
              className="btn btn-primary flex-1 text-sm"
            >
              <span>Vezi toate</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}

/* ============ SURPRISE POPUP (Heart shaped) ============ */
function SurpriseNotification({ surprise, onDismiss, onView }) {
  // Auto-dismiss after 20 seconds
  useEffect(() => {
    const timer = setTimeout(onDismiss, 20000)
    return () => clearTimeout(timer)
  }, [onDismiss])

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      onClick={onDismiss}
    >
      {/* Blurred backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

      <motion.div
        initial={{ scale: 0, rotate: -10 }}
        animate={{ scale: 1, rotate: 0 }}
        exit={{ scale: 0, rotate: 10 }}
        transition={{ type: 'spring', stiffness: 250, damping: 20 }}
        onClick={(e) => e.stopPropagation()}
        className="relative"
      >
        {/* Floating hearts background */}
        <div className="absolute -inset-20 pointer-events-none overflow-hidden">
          {[...Array(12)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute"
              style={{
                left: `${10 + Math.random() * 80}%`,
                bottom: '-20px',
              }}
              animate={{
                y: [0, -300 - Math.random() * 200],
                x: [0, (Math.random() - 0.5) * 100],
                opacity: [0, 0.7, 0],
                scale: [0.5, 1, 0.3],
                rotate: [0, (Math.random() - 0.5) * 60],
              }}
              transition={{
                duration: 3 + Math.random() * 2,
                delay: i * 0.4,
                repeat: Infinity,
                repeatDelay: Math.random() * 2,
              }}
            >
              <Heart 
                className="text-primary fill-primary" 
                style={{ 
                  width: `${12 + Math.random() * 16}px`,
                  height: `${12 + Math.random() * 16}px`,
                  opacity: 0.4 + Math.random() * 0.4,
                }}
              />
            </motion.div>
          ))}
        </div>

        {/* Heart-shaped container */}
        <div className="relative w-[300px] sm:w-[340px]">
          {/* Glow */}
          <div className="absolute -inset-2 bg-gradient-to-b from-primary to-secondary rounded-3xl opacity-30 blur-xl" />
          
          {/* Card */}
          <div 
            className="relative overflow-hidden rounded-3xl shadow-2xl"
            style={{
              background: 'var(--color-card)',
              border: '2px solid var(--color-primary)',
            }}
          >
            {/* Top heart header */}
            <div 
              className="relative py-8 px-6 text-center overflow-hidden"
              style={{
                background: `linear-gradient(135deg, var(--color-primary), var(--color-secondary))`,
              }}
            >
              {/* Animated gift/heart */}
              <motion.div
                animate={{ 
                  scale: [1, 1.1, 1],
                  rotate: [0, -5, 5, 0],
                }}
                transition={{ duration: 2, repeat: Infinity }}
                className="inline-block mb-3"
              >
                <div className="relative">
                  <Heart className="w-16 h-16 text-white fill-white drop-shadow-lg" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Gift className="w-7 h-7 text-primary" />
                  </div>
                </div>
              </motion.div>

              <motion.h2
                initial={{ y: 10, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="text-xl font-bold text-white drop-shadow-md"
              >
                Ai o surpriză!
              </motion.h2>

              {/* Shimmer effect */}
              <motion.div
                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
                animate={{ x: ['-100%', '200%'] }}
                transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
              />
            </div>

            {/* Content */}
            <div className="p-6 text-center">
              {/* Close button */}
              <button
                onClick={onDismiss}
                className="absolute top-3 right-3 p-1.5 rounded-full text-white/70 hover:text-white hover:bg-white/20 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>

              <p className="text-sm text-gray-500 mb-1">
                De la <span className="font-semibold text-primary">{surprise.from_user_name}</span>
              </p>

              {surprise.title && (
                <p className="text-lg font-bold text-text mb-3">
                  {surprise.title}
                </p>
              )}

              <div className="bg-gradient-to-br from-primary/5 to-secondary/5 rounded-xl p-4 mb-4">
                <Gift className="w-10 h-10 mx-auto text-primary mb-2" />
                <p className="text-sm text-gray-600">
                  {surprise.reveal_type === 'clicks' 
                    ? 'Apasă pe surpriză pentru a o descoperi!'
                    : surprise.reveal_type === 'date'
                    ? 'Surpriza se va revela la o dată specială!'
                    : 'O surpriză te așteaptă!'}
                </p>
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                <button
                  onClick={onDismiss}
                  className="btn btn-ghost flex-1 text-sm"
                >
                  Mai târziu
                </button>
                <button
                  onClick={onView}
                  className="btn btn-primary flex-1 text-sm"
                >
                  <Gift className="w-4 h-4" />
                  <span>Vezi Surpriza</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}
