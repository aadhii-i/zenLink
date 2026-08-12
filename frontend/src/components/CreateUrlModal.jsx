import { useState } from 'react'
import Modal from './Modal'
import { urlApi } from '../api/urlApi'

const initialFormData = { original_url: '', custom_alias: '', expires_at: '' }

export default function CreateUrlModal({ onClose, onCreated }) {
  const [formData, setFormData] = useState(initialFormData)
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

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
        // <input type="datetime-local"> has no timezone; treat it as local
        // time and let Date.toISOString() convert to UTC for the API.
        expires_at: formData.expires_at ? new Date(formData.expires_at).toISOString() : null,
      }
      const { data } = await urlApi.create(payload)
      onCreated(data)
    } catch (err) {
      const validationError = err.response?.data?.errors?.[0]?.msg
      setError(validationError || err.response?.data?.message || 'Failed to create short URL.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Modal title="Create short URL" onClose={onClose}>
      {error && (
        <div className="mb-4 p-3 rounded-lg bg-red-50 dark:bg-red-950 text-red-700 dark:text-red-300 text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label
            htmlFor="original_url"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
          >
            Long URL
          </label>
          <input
            id="original_url"
            name="original_url"
            type="url"
            placeholder="https://example.com/a/very/long/path"
            required
            value={formData.original_url}
            onChange={handleChange}
            className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
        </div>

        <div>
          <label
            htmlFor="custom_alias"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
          >
            Custom alias <span className="text-gray-400 font-normal">(optional)</span>
          </label>
          <input
            id="custom_alias"
            name="custom_alias"
            type="text"
            placeholder="my-campaign"
            value={formData.custom_alias}
            onChange={handleChange}
            className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
        </div>

        <div>
          <label
            htmlFor="expires_at"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
          >
            Expires <span className="text-gray-400 font-normal">(optional)</span>
          </label>
          <input
            id="expires_at"
            name="expires_at"
            type="datetime-local"
            value={formData.expires_at}
            onChange={handleChange}
            className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
        </div>

        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex-1 py-2.5 rounded-lg bg-primary-600 text-white font-medium hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isSubmitting ? 'Creating...' : 'Create'}
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
