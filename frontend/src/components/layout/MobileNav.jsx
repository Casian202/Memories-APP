import { NavLink } from 'react-router-dom'
import { Home, Calendar, Gift, Heart, Settings } from 'lucide-react'

const navItems = [
  { path: '/dashboard', label: 'Acasă', icon: Home },
  { path: '/events', label: 'Evenimente', icon: Calendar },
  { path: '/surprises', label: 'Surprize', icon: Gift },
  { path: '/motivations', label: 'Motivații', icon: Heart },
]

export default function MobileNav() {
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