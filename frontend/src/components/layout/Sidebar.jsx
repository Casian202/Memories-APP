import { NavLink } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { 
  Home, 
  Calendar, 
  Gift, 
  Heart, 
  Settings, 
  Shield,
  X,
  Heart as Logo,
  Clock,
  Sparkles
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import api from '../../services/api'

const menuItems = [
  { path: '/dashboard', label: 'Dashboard', icon: Home },
  { path: '/events', label: 'Evenimente', icon: Calendar },
  { path: '/surprises', label: 'Surprize', icon: Gift },
  // Coming Soon is inserted dynamically after Surprises
  { path: '/motivations', label: 'Motivații', icon: Heart },
  { path: '/settings', label: 'Setări', icon: Settings },
]

const adminItems = [
  { path: '/admin', label: 'Admin Panel', icon: Shield },
]

export default function Sidebar({ onClose }) {
  const { isAdmin } = useAuth()

  // Fetch Coming Soon nav info
  const { data: csNavInfo } = useQuery({
    queryKey: ['coming-soon-nav'],
    queryFn: async () => {
      const res = await api.get('/coming-soon/nav-info')
      return res.data
    },
    staleTime: 60000, // refresh every minute
    retry: false,
  })

  // Build menu with dynamic Coming Soon item
  const allMenuItems = [...menuItems]
  if (csNavInfo) {
    const csItem = {
      path: '/coming-soon',
      label: csNavInfo.current_name || 'În curând',
      icon: csNavInfo.is_revealed ? Sparkles : Clock,
    }
    // Insert after Surprize (index 2 = surprises, so insert at 3)
    const surpriseIdx = allMenuItems.findIndex(i => i.path === '/surprises')
    allMenuItems.splice(surpriseIdx + 1, 0, csItem)
  }

  return (
    <div className="h-full w-64 bg-card border-r border-gray-200/20 flex flex-col">
      {/* Header */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-gray-200/20">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <Logo className="w-5 h-5 text-primary fill-primary" />
          </div>
          <span className="font-bold text-primary font-heading text-sm">Cu ❤️ pentru noi</span>
        </div>
        
        {onClose && (
          <button
            onClick={onClose}
            className="lg:hidden p-2 rounded-lg hover:bg-gray-100/50 transition-colors"
            aria-label="Închide meniul"
          >
            <X className="w-5 h-5 text-text" />
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {allMenuItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            onClick={onClose}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 min-h-[44px] ${
                isActive
                  ? 'bg-primary text-white shadow-md'
                  : 'text-text hover:bg-gray-100/50'
              }`
            }
          >
            <item.icon className="w-5 h-5" />
            <span className="font-medium">{item.label}</span>
          </NavLink>
        ))}

        {/* Admin section */}
        {isAdmin() && (
          <div className="pt-4 mt-4 border-t border-gray-200/20">
            <p className="px-4 text-xs font-semibold text-gray-400 uppercase mb-2">
              Administrare
            </p>
            {adminItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={onClose}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 min-h-[44px] ${
                    isActive
                      ? 'bg-primary text-white shadow-md'
                      : 'text-text hover:bg-gray-100/50'
                  }`
                }
              >
                <item.icon className="w-5 h-5" />
                <span className="font-medium">{item.label}</span>
              </NavLink>
            ))}
          </div>
        )}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-gray-200/20">
        <div className="text-center text-xs text-gray-400">
          <p>Făcută cu ❤️</p>
          <p className="mt-1">© 2024 Pentru noi doi</p>
        </div>
      </div>
    </div>
  )
}