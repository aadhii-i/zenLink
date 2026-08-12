import { useState } from 'react'
import Modal from './Modal'
import Input from './ui/Input'
import Button from './ui/Button'
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
          <p className="text-sm text-gray-500 dark:text-gray-400 font-mono px-3 py-2 rounded-lg bg-gray-50 dark:bg-gray-800/60 border border-gray-200/80 dark:border-gray-800 inline-block">
            {url.short_code}
          </p>
        </div>

        <Input
          label="Long URL"
          id="edit_original_url"
          type="url"
          required
          value={originalUrl}
          onChange={(e) => setOriginalUrl(e.target.value)}
        />

        <div>
          <label
            htmlFor="edit_expires_at"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5"
          >
            Expires <span className="text-gray-400 font-normal">(optional)</span>
          </label>
          <div className="flex items-center gap-2">
            <input
              id="edit_expires_at"
              type="datetime-local"
              value={expiresAt}
              onChange={(e) => setExpiresAt(e.target.value)}
              className="flex-1 px-3.5 py-2.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-white/90 dark:bg-gray-900/70 text-gray-900 dark:text-white transition-all duration-200 focus:outline-none focus:ring-4 focus:ring-primary-500/15 focus:border-primary-500"
            />
            {expiresAt && (
              <button
                type="button"
                onClick={() => setExpiresAt('')}
                className="text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        <label className="flex items-center gap-2.5 cursor-pointer w-fit">
          <input
            type="checkbox"
            checked={isActive}
            onChange={(e) => setIsActive(e.target.checked)}
            className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500 focus:ring-offset-0"
          />
          <span className="text-sm text-gray-700 dark:text-gray-300">Active</span>
        </label>

        <div className="flex gap-3 pt-2">
          <Button type="submit" disabled={isSubmitting} className="flex-1">
            {isSubmitting ? 'Saving...' : 'Save changes'}
          </Button>
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </form>
    </Modal>
  )
}
