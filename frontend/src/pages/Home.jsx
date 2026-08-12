import { Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import ShortenUrlForm from '../components/ShortenUrlForm'

export default function Home() {
  const { isAuthenticated } = useAuth()

  return (
    <section className="max-w-4xl mx-auto px-4 sm:px-6 py-20 text-center">
      <h1 className="text-4xl sm:text-5xl font-extrabold text-gray-900 dark:text-white tracking-tight">
        Shorten links. <span className="text-primary-600">Track everything.</span>
      </h1>
      <p className="mt-4 text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
        ShortLink turns long URLs into short, branded, trackable links — with click
        analytics, custom aliases, and expiry controls built in. No account needed to
        get started.
      </p>

      <div className="mt-10">
        <ShortenUrlForm />
      </div>

      {!isAuthenticated && (
        <p className="mt-6 text-sm text-gray-500 dark:text-gray-400">
          <Link to="/login" className="text-primary-600 dark:text-primary-400 hover:underline">
            Login
          </Link>{' '}
          or{' '}
          <Link to="/register" className="text-primary-600 dark:text-primary-400 hover:underline">
            sign up
          </Link>{' '}
          to save your history and see click analytics — it&apos;s optional.
        </p>
      )}

      <div className="mt-6 flex items-center justify-center gap-4">
        {isAuthenticated && (
          <Link
            to="/dashboard"
            className="px-6 py-3 rounded-lg bg-primary-600 text-white font-medium hover:bg-primary-700 transition-colors"
          >
            Go to dashboard
          </Link>
        )}
        <a
          href="/docs"
          className="px-6 py-3 rounded-lg border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-200 font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
        >
          API Docs
        </a>
      </div>
    </section>
  )
}
