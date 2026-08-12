import { useState } from 'react'
import { Link } from 'react-router-dom'
import { urlApi } from '../api/urlApi'
import { useAuth } from '../hooks/useAuth'

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
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            type="url"
            name="original_url"
            required
            placeholder="Paste a long URL to shorten..."
            value={formData.original_url}
            onChange={handleChange}
            className="flex-1 px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-6 py-3 rounded-lg bg-primary-600 text-white font-medium hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex-shrink-0"
          >
            {isSubmitting ? 'Shortening...' : 'Shorten'}
          </button>
        </div>

        <button
          type="button"
          onClick={() => setShowOptions((prev) => !prev)}
          className="text-sm text-gray-500 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
        >
          {showOptions ? '− Hide options' : '+ Custom alias / expiry'}
        </button>

        {showOptions && (
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              name="custom_alias"
              placeholder="Custom alias (optional)"
              value={formData.custom_alias}
              onChange={handleChange}
              className="flex-1 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
            <input
              type="datetime-local"
              name="expires_at"
              value={formData.expires_at}
              onChange={handleChange}
              className="flex-1 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>
        )}
      </form>

      {error && (
        <div className="mt-4 p-3 rounded-lg bg-red-50 dark:bg-red-950 text-red-700 dark:text-red-300 text-sm">
          {error}
        </div>
      )}

      {result && (
        <div className="mt-4 p-4 rounded-lg border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900">
          <div className="flex items-center justify-between gap-3">
            <a
              href={result.short_url}
              target="_blank"
              rel="noreferrer"
              className="text-primary-600 dark:text-primary-400 font-medium hover:underline break-all"
            >
              {result.short_url}
            </a>
            <button
              onClick={handleCopy}
              className="px-3 py-1.5 rounded-md text-xs font-medium border border-gray-300 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors flex-shrink-0"
            >
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            {isAuthenticated ? (
              'Your link is ready and saved to your dashboard.'
            ) : (
              <>
                Your link is ready and works normally — but it won&apos;t be saved to any
                history.{' '}
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
