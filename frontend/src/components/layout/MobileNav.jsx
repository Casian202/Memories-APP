import { NavLink } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Home, Calendar, Gift, Heart, Settings, Clock, Sparkles } from 'lucide-react'
import api from '../../services/api'

const baseNavItems = [
  { path: '/dashboard', label: 'Acasă', icon: Home },
  { path: '/events', label: 'Evenimente', icon: Calendar },
  { path: '/surprises', label: 'Surprize', icon: Gift },
  // Coming Soon inserted dynamically
  { path: '/motivations', label: 'Motivații', icon: Heart },
]

export default function MobileNav() {
  const { data: csNavInfo } = useQuery({
    queryKey: ['coming-soon-nav'],
    queryFn: async () => {
      const res = await api.get('/coming-soon/nav-info')
      return res.data
    },
    staleTime: 60000,
    retry: false,
  })

  const navItems = [...baseNavItems]
  if (csNavInfo) {
    const csItem = {
      path: '/coming-soon',
      label: csNavInfo.current_name?.length > 10
        ? csNavInfo.current_name.substring(0, 9) + '…'
        : (csNavInfo.current_name || 'În curând'),
      icon: csNavInfo.is_revealed ? Sparkles : Clock,
    }
    const surpriseIdx = navItems.findIndex(i => i.path === '/surprises')
    navItems.splice(surpriseIdx + 1, 0, csItem)
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 lg:hidden glass border-t border-gray-200/20 safe-bottom z-30">
      <div className="flex items-center justify-around h-16">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `flex flex-col items-center justify-center min-w-[64px] min-h-[44px] rounded-lg transition-colors ${
                isActive
                  ? 'text-primary'
                  : 'text-gray-500 hover:text-text'
              }`
            }
          >
            <item.icon className="w-6 h-6" />
            <span className="text-xs mt-1 font-medium">{item.label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  )
}