import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTheme } from '../../hooks/useTheme'
import { useAuth } from '../../hooks/useAuth'
import { buttonClasses } from '../ui/buttonClasses'

export default function Navbar() {
  const { theme, toggleTheme } = useTheme()
  const { user, isAuthenticated, isLoading, logout } = useAuth()
  const navigate = useNavigate()
  const [isScrolled, setIsScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setIsScrolled(window.scrollY > 8)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const handleLogout = () => {
    logout()
    navigate('/')
  }

  return (
    <header
      className={`sticky top-0 z-40 transition-all duration-300 ease-premium motion-safe:animate-fade-in-up ${
        isScrolled
          ? 'glass border-b border-gray-200/80 dark:border-gray-800/80 shadow-soft'
          : 'bg-white/40 dark:bg-gray-950/40 border-b border-transparent'
      }`}
    >
      <nav className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        <Link
          to="/"
          className="flex items-center gap-2.5 font-bold text-lg text-gray-900 dark:text-white group"
        >
          <span className="relative w-8 h-8 rounded-lg bg-gradient-to-br from-primary-500 to-accent-600 text-white flex items-center justify-center text-sm shadow-soft transition-transform duration-300 ease-premium group-hover:scale-105 group-hover:rotate-3">
            SL
            <span className="absolute inset-0 rounded-lg bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity" />
          </span>
          ShortLink
        </Link>

        <div className="flex items-center gap-2 sm:gap-3">
          <button
            onClick={toggleTheme}
            aria-label="Toggle dark mode"
            className="w-9 h-9 rounded-lg flex items-center justify-center text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors motion-safe:active:scale-90"
          >
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>

          {isLoading ? (
            <div className="w-20 h-9 skeleton rounded-lg" />
          ) : isAuthenticated ? (
            <>
              <Link to="/dashboard" className={buttonClasses({ variant: 'primary', size: 'sm' })}>
                Dashboard
              </Link>
              <Link
                to="/analytics"
                className="px-2 sm:px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
              >
                Analytics
              </Link>
              <Link
                to="/profile"
                className="px-2 sm:px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 hover:text-primary-600 dark:hover:text-primary-400 transition-colors max-w-[6rem] sm:max-w-[10rem] truncate"
              >
                {user?.full_name || user?.email}
              </Link>
              <button onClick={handleLogout} className={buttonClasses({ variant: 'secondary', size: 'sm' })}>
                Log out
              </button>
            </>
          ) : (
            <>
              <Link
                to="/login"
                className="px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
              >
                Login
              </Link>
              <Link to="/register" className={buttonClasses({ variant: 'primary', size: 'sm' })}>
                Sign up
              </Link>
            </>
          )}
        </div>
      </nav>
    </header>
  )
}
