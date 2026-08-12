import { useState } from 'react'
import { Link } from 'react-router-dom'
import { urlApi } from '../api/urlApi'
import { useAuth } from '../hooks/useAuth'
import Button from './ui/Button'
import QrCodeButton from './QrCodeButton'

const initialFormData = { original_url: '', custom_alias: '', expires_at: '' }

// Usable without an account: axiosClient only attaches a token when one
// exists in localStorage, so this same request is what both anonymous and
// logged-in visitors send — the backend decides ownership from whether a
// valid token came with it, not from anything this component asserts.
export default function ShortenUrlForm() {
  const { isAuthenticated } = useAuth()
  const [formData, setFormData] = useState(initialFormData)
  const [showOptions, setShowOptions] = useState(false)
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [result, setResult] = useState(null)
  const [copied, setCopied] = useState(false)

  const handleChange = (e) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setIsSubmitting(true)
    try {
      const payload = {
        original_url: formData.original_url,
        custom_alias: formData.custom_alias || null,
        expires_at: formData.expires_at ? new Date(formData.expires_at).toISOString() : null,
      }
      const { data } = await urlApi.create(payload)
      setResult(data)
      setCopied(false)
      setFormData(initialFormData)
    } catch (err) {
      const validationError = err.response?.data?.errors?.[0]?.msg
      setError(
        validationError ||
          err.response?.data?.detail ||
          err.response?.data?.message ||
          'Failed to create short URL.',
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCopy = async () => {
    if (!result) return
    await navigator.clipboard.writeText(result.short_url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="w-full max-w-2xl mx-auto text-left">
      <form
        onSubmit={handleSubmit}
        className="relative rounded-2xl border border-gray-200/80 dark:border-gray-800 bg-white/80 dark:bg-gray-900/70 backdrop-blur-xl shadow-premium p-2 transition-shadow duration-300 focus-within:shadow-glow-lg focus-within:border-primary-400/60 dark:focus-within:border-primary-500/50"
      >
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="flex-1 flex items-center gap-2 px-3">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              className="w-5 h-5 text-gray-400 flex-shrink-0"
              aria-hidden="true"
            >
              <path
                d="M9 12a3 3 0 0 0 4.24 0l3-3a3 3 0 0 0-4.24-4.24l-1 1"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
              <path
                d="M15 12a3 3 0 0 0-4.24 0l-3 3a3 3 0 0 0 4.24 4.24l1-1"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
            </svg>
            <input
              type="url"
              name="original_url"
              required
              placeholder="Paste a long URL to shorten..."
              value={formData.original_url}
              onChange={handleChange}
              className="flex-1 py-3.5 bg-transparent text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none text-base"
            />
          </div>
          <Button type="submit" size="lg" disabled={isSubmitting} className="flex-shrink-0">
            {isSubmitting ? (
              <>
                <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full motion-safe:animate-spin" />
                Shortening...
              </>
            ) : (
              'Shorten'
            )}
          </Button>
        </div>

        <button
          type="button"
          onClick={() => setShowOptions((prev) => !prev)}
          className="mt-1 mb-1 ml-3 text-sm text-gray-500 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
        >
          {showOptions ? '− Hide options' : '+ Custom alias / expiry'}
        </button>

        {showOptions && (
          <div className="flex flex-col sm:flex-row gap-3 px-3 pb-3 motion-safe:animate-fade-in-up">
            <input
              type="text"
              name="custom_alias"
              placeholder="Custom alias (optional)"
              value={formData.custom_alias}
              onChange={handleChange}
              className="flex-1 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-4 focus:ring-primary-500/15 focus:border-primary-500 transition-all"
            />
            <input
              type="datetime-local"
              name="expires_at"
              value={formData.expires_at}
              onChange={handleChange}
              className="flex-1 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-4 focus:ring-primary-500/15 focus:border-primary-500 transition-all"
            />
          </div>
        )}
      </form>

      {error && (
        <div className="mt-4 p-3 rounded-lg bg-red-50 dark:bg-red-950 text-red-700 dark:text-red-300 text-sm motion-safe:animate-fade-in-up">
          {error}
        </div>
      )}

      {result && (
        <div className="mt-5 rounded-2xl border border-primary-200/60 dark:border-primary-800/40 bg-gradient-to-br from-primary-50/80 to-accent-50/50 dark:from-primary-950/40 dark:to-accent-950/20 p-5 shadow-premium motion-safe:animate-scale-in">
          <div className="flex items-center gap-2 text-xs font-medium text-primary-700 dark:text-primary-400 mb-3">
            <span className="w-4 h-4 rounded-full bg-primary-600 text-white flex items-center justify-center motion-safe:animate-pop-in">
              <svg viewBox="0 0 24 24" fill="none" className="w-2.5 h-2.5">
                <path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
            Your link is ready
          </div>

          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-gray-500 dark:text-gray-400 mb-1">
            <span className="truncate max-w-full">{result.original_url}</span>
          </div>
          <div className="flex items-center gap-2 text-gray-300 dark:text-gray-700 mb-2" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4 rotate-90 sm:rotate-0">
              <path d="M4 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <a
              href={result.short_url}
              target="_blank"
              rel="noreferrer"
              className="text-xl sm:text-2xl font-bold text-gradient hover:opacity-80 transition-opacity break-all"
            >
              {result.short_url}
            </a>

            <div className="flex items-center gap-2 flex-shrink-0">
              <Button type="button" variant="secondary" size="sm" onClick={handleCopy}>
                {copied ? (
                  <span className="flex items-center gap-1.5 text-primary-600 dark:text-primary-400 motion-safe:animate-pop-in">
                    <svg viewBox="0 0 24 24" fill="none" className="w-3.5 h-3.5">
                      <path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    Copied
                  </span>
                ) : (
                  'Copy'
                )}
              </Button>
              <QrCodeButton value={result.short_url} />
            </div>
          </div>

          {result.expires_at && (
            <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">
              Expires {new Date(result.expires_at).toLocaleString()}
            </p>
          )}

          <p className="mt-3 text-sm text-gray-600 dark:text-gray-400 border-t border-primary-200/50 dark:border-primary-800/30 pt-3">
            {isAuthenticated ? (
              <>
                Saved to your dashboard.{' '}
                <Link
                  to="/dashboard"
                  className="text-primary-600 dark:text-primary-400 font-medium hover:underline"
                >
                  View it there
                </Link>
                .
              </>
            ) : (
              <>
                It works normally — but it won&apos;t be saved to any history.{' '}
                <Link
                  to="/login"
                  className="text-primary-600 dark:text-primary-400 font-medium hover:underline"
                >
                  Sign in
                </Link>{' '}
                to save your links and see click analytics.
              </>
            )}
          </p>
        </div>
      )}
    </div>
  )
}
