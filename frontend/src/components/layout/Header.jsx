import { useNavigate } from 'react-router-dom'
import { Menu, LogOut, Heart, User } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'

export default function Header({ onMenuClick }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  return (
    <header className="sticky top-0 z-30 glass border-b border-gray-200/20 safe-top">
      <div className="container-mobile flex items-center justify-between h-16">
        <div className="flex items-center gap-3">
          {/* Mobile menu button */}
          <button
            onClick={onMenuClick}
            className="lg:hidden p-2 rounded-lg hover:bg-gray-100/50 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
            aria-label="Meniu"
          >
            <Menu className="w-6 h-6 text-text" />
          </button>

          {/* Logo */}
          <div className="flex items-center gap-2">
            <Heart className="w-6 h-6 text-primary fill-primary" />
            <h1 className="text-xl font-bold font-heading text-primary hidden sm:block">
              Făcută cu ❤️ pentru noi doi
            </h1>
          </div>
        </div>

        {/* User info */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
              <User className="w-4 h-4 text-primary" />
            </div>
            <span className="text-sm font-medium text-text hidden sm:block">
              {user?.display_name || user?.username}
            </span>
          </div>

          <button
            onClick={handleLogout}
            className="p-2 rounded-lg hover:bg-gray-100/50 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
            aria-label="Deconectare"
          >
            <LogOut className="w-5 h-5 text-text" />
          </button>
        </div>
      </div>
    </header>
  )
}