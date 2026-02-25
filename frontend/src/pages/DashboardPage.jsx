import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { Heart, Calendar, Gift, Clock, Users, MapPin } from 'lucide-react'
import api from '../services/api'
import { format, differenceInDays, differenceInMonths, differenceInYears } from 'date-fns'
import { ro } from 'date-fns/locale'

function useRomaniaDate() {
  const [now, setNow] = useState(() => new Date())
  
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  // Format for Romania timezone from device
  const formatter = new Intl.DateTimeFormat('ro-RO', {
    timeZone: 'Europe/Bucharest',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })

  const parts = formatter.formatToParts(now)
  const getPart = (type) => parts.find(p => p.type === type)?.value || ''

  return {
    formatted: `${getPart('weekday')}, ${getPart('day')} ${getPart('month')} ${getPart('year')}`,
    time: `${getPart('hour')}:${getPart('minute')}:${getPart('second')}`,
    raw: now,
  }
}

export default function DashboardPage() {
  const romaniaDate = useRomaniaDate()

  const { data: relationship, isLoading: relLoading } = useQuery({
    queryKey: ['relationship'],
    queryFn: async () => {
      const response = await api.get('/settings/relationship')
      return response.data
    }
  })

  const { data: upcomingEvents, isLoading: eventsLoading } = useQuery({
    queryKey: ['events', 'upcoming'],
    queryFn: async () => {
      const response = await api.get('/events/upcoming')
      return response.data
    },
    retry: 1,
  })

  // Fetch all events count for stats
  const { data: allEventsData } = useQuery({
    queryKey: ['events', 'all-count'],
    queryFn: async () => {
      const response = await api.get('/events?per_page=1')
      return response.data
    },
    retry: 1,
  })

  // Fetch surprises count
  const { data: receivedSurprises } = useQuery({
    queryKey: ['surprises', 'received'],
    queryFn: async () => {
      const response = await api.get('/surprises/received')
      return response.data
    },
    retry: 1,
  })

  // Fetch motivations count
  const { data: receivedMotivations } = useQuery({
    queryKey: ['motivations', 'received'],
    queryFn: async () => {
      const response = await api.get('/motivations/received')
      return response.data
    },
    retry: 1,
  })

  const { data: pendingMessages } = useQuery({
    queryKey: ['messages', 'pending'],
    queryFn: async () => {
      const response = await api.get('/messages/pending')
      return response.data
    },
    retry: 1,
  })

  const calculateRelationshipTime = () => {
    if (!relationship?.start_date) return null
    const startDate = new Date(relationship.start_date)
    const now = new Date()
    const years = differenceInYears(now, startDate)
    const months = differenceInMonths(now, startDate) % 12
    const days = differenceInDays(now, startDate) % 30
    return { years, months, days, totalDays: differenceInDays(now, startDate) }
  }

  const calculateAnniversary = () => {
    if (!relationship?.start_date) return null
    const startDate = new Date(relationship.start_date)
    const now = new Date()
    const yearsTotal = differenceInYears(now, startDate)
    const nextAnniversary = new Date(startDate)
    nextAnniversary.setFullYear(now.getFullYear())
    if (nextAnniversary < now) {
      nextAnniversary.setFullYear(now.getFullYear() + 1)
    }
    const daysUntil = differenceInDays(nextAnniversary, now)
    return { yearsTotal, nextAnniversary, daysUntil }
  }

  const time = calculateRelationshipTime()
  const anniversary = calculateAnniversary()

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Live Date Banner */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="card bg-gradient-to-r from-primary/5 to-secondary/5 border-primary/20"
      >
        <div className="flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <MapPin className="w-4 h-4 text-primary" />
            <span className="capitalize">{romaniaDate.formatted}</span>
          </div>
          <div className="live-clock text-lg md:text-xl font-bold text-primary">
            {romaniaDate.time}
          </div>
        </div>
      </motion.div>

      {/* Relationship Counter */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="card text-center py-6 md:py-8"
      >
        <div className="flex items-center justify-center gap-2 mb-4">
          <Heart className="w-5 h-5 md:w-6 md:h-6 text-primary fill-primary animate-pulse" />
          <h2 className="page-header mb-0">{relationship?.relationship_name || 'Noi'}</h2>
          <Heart className="w-5 h-5 md:w-6 md:h-6 text-primary fill-primary animate-pulse" />
        </div>

        {relLoading ? (
          <div className="h-24 skeleton rounded-lg" />
        ) : time ? (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 md:gap-4 max-w-lg mx-auto mb-4">
              <CounterBox value={time.years} label="Ani" highlight />
              <CounterBox value={time.months} label="Luni" />
              <CounterBox value={time.days} label="Zile" />
              <CounterBox value={time.totalDays} label="Total Zile" />
            </div>
            <p className="text-sm text-gray-500">
              Împreună din {format(new Date(relationship.start_date), 'd MMMM yyyy', { locale: ro })}
            </p>
            {anniversary && anniversary.daysUntil > 0 && anniversary.daysUntil <= 60 && (
              <p className="text-xs text-primary mt-2 font-medium">
                🎉 {anniversary.daysUntil} zile până la aniversarea de {anniversary.yearsTotal + 1} ani!
              </p>
            )}
          </>
        ) : (
          <p className="text-gray-500 text-sm">
            Configurează data de început a relației din Admin Panel
          </p>
        )}
      </motion.div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        <StatCard icon={Calendar} label="Evenimente" value={allEventsData?.total || 0} loading={eventsLoading} />
        <StatCard icon={Gift} label="Surprize" value={receivedSurprises?.length || 0} loading={false} />
        <StatCard icon={Heart} label="Motivații" value={receivedMotivations?.length || 0} loading={false} />
        <StatCard icon={Users} label="Partener" value="Activ" loading={false} />
      </div>

      {/* Upcoming Events */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <h3 className="page-subheader flex items-center gap-2">
          <Calendar className="w-5 h-5" />
          Evenimente Viitoare
        </h3>
        
        {eventsLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 skeleton rounded-lg" />
            ))}
          </div>
        ) : upcomingEvents?.length > 0 ? (
          <div className="space-y-2 md:space-y-3">
            {upcomingEvents.slice(0, 5).map((event) => (
              <div key={event.id} className="card card-hover flex items-center gap-3 md:gap-4 p-3 md:p-4">
                <div className="w-10 h-10 md:w-12 md:h-12 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Calendar className="w-5 h-5 md:w-6 md:h-6 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium text-text truncate text-sm md:text-base">{event.title}</h4>
                  <p className="text-xs md:text-sm text-gray-500">
                    {format(new Date(event.event_date), 'd MMMM yyyy', { locale: ro })}
                  </p>
                </div>
                <Clock className="w-4 h-4 md:w-5 md:h-5 text-gray-400 flex-shrink-0" />
              </div>
            ))}
          </div>
        ) : (
          <div className="card text-center py-6 md:py-8 text-gray-500">
            <Calendar className="w-10 h-10 md:w-12 md:h-12 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Nu există evenimente viitoare</p>
          </div>
        )}
      </motion.div>

      {/* Daily Message Popup */}
      {pendingMessages && (
        <DailyMessagePopup message={pendingMessages} />
      )}
    </div>
  )
}

function CounterBox({ value, label, highlight }) {
  return (
    <div className={`rounded-xl p-3 md:p-4 ${highlight ? 'bg-gradient-to-br from-primary/10 to-secondary/10' : 'bg-primary/5'}`}>
      <div className={`text-xl md:text-3xl font-bold ${highlight ? 'text-gradient' : 'text-primary'}`}>{value}</div>
      <div className="text-xs md:text-sm text-gray-500 mt-0.5">{label}</div>
    </div>
  )
}

function StatCard({ icon: Icon, label, value, loading }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="card text-center p-3 md:p-4"
    >
      {loading ? (
        <div className="h-12 skeleton rounded" />
      ) : (
        <>
          <Icon className="w-6 h-6 md:w-8 md:h-8 mx-auto text-primary mb-1.5" />
          <div className="text-lg md:text-xl font-bold text-text">{value}</div>
          <div className="text-xs md:text-sm text-gray-500">{label}</div>
        </>
      )}
    </motion.div>
  )
}

function DailyMessagePopup({ message }) {
  const [visible, setVisible] = useState(true)

  const handleDismiss = async () => {
    try {
      await api.put(`/messages/${message.id}/read`)
    } catch (e) {
      // ignore
    }
    setVisible(false)
  }

  if (!visible) return null

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
      onClick={handleDismiss}
    >
      <div className="card max-w-md w-full text-center p-6 md:p-8" onClick={(e) => e.stopPropagation()}>
        <Heart className="w-12 h-12 md:w-16 md:h-16 mx-auto text-primary fill-primary mb-4" />
        <h3 className="text-lg md:text-xl font-bold text-primary mb-2">Mesajul Zilei</h3>
        <p className="text-text mb-4 text-sm md:text-base">{message.message}</p>
        <p className="text-xs md:text-sm text-gray-500 mb-4">De la {message.from_user_name || 'partener'}</p>
        <button onClick={handleDismiss} className="btn btn-primary">
          Am citit ❤️
        </button>
      </div>
    </motion.div>
  )
}