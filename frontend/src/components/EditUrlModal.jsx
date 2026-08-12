import { useState } from 'react'
import Modal from './Modal'
import { urlApi } from '../api/urlApi'

function toDatetimeLocal(isoString) {
  if (!isoString) return ''
  const date = new Date(isoString)
  const localOffsetMs = date.getTimezoneOffset() * 60000
  return new Date(date.getTime() - localOffsetMs).toISOString().slice(0, 16)
}

export default function EditUrlModal({ url, onClose, onUpdated }) {
  const [originalUrl, setOriginalUrl] = useState(url.original_url)
  const [isActive, setIsActive] = useState(url.is_active)
  const [expiresAt, setExpiresAt] = useState(toDatetimeLocal(url.expires_at))
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setIsSubmitting(true)
    try {
      const payload = {
        original_url: originalUrl,
        is_active: isActive,
        expires_at: expiresAt ? new Date(expiresAt).toISOString() : null,
      }
      const { data } = await urlApi.update(url.id, payload)
      onUpdated(data)
    } catch (err) {
      const validationError = err.response?.data?.errors?.[0]?.msg
      setError(validationError || err.response?.data?.message || 'Failed to update URL.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Modal title="Edit short URL" onClose={onClose}>
      {error && (
        <div className="mb-4 p-3 rounded-lg bg-red-50 dark:bg-red-950 text-red-700 dark:text-red-300 text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <p className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Short code
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400 font-mono">{url.short_code}</p>
        </div>

        <div>
          <label
            htmlFor="edit_original_url"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
          >
            Long URL
          </label>
          <input
            id="edit_original_url"
            type="url"
            required
            value={originalUrl}
            onChange={(e) => setOriginalUrl(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
        </div>

        <div>
          <label
            htmlFor="edit_expires_at"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
          >
            Expires <span className="text-gray-400 font-normal">(optional)</span>
          </label>
          <div className="flex items-center gap-2">
            <input
              id="edit_expires_at"
              type="datetime-local"
              value={expiresAt}
              onChange={(e) => setExpiresAt(e.target.value)}
              className="flex-1 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
            {expiresAt && (
              <button
                type="button"
                onClick={() => setExpiresAt('')}
                className="text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={isActive}
            onChange={(e) => setIsActive(e.target.checked)}
            className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
          />
          <span className="text-sm text-gray-700 dark:text-gray-300">Active</span>
        </label>

        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex-1 py-2.5 rounded-lg bg-primary-600 text-white font-medium hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isSubmitting ? 'Saving...' : 'Save changes'}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            Cancel
          </button>
        </div>
      </form>
    </Modal>
  )
}
