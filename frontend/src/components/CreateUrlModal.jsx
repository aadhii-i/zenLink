import { useState } from 'react'
import Modal from './Modal'
import Input from './ui/Input'
import Button from './ui/Button'
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
        <Input
          label="Long URL"
          id="original_url"
          name="original_url"
          type="url"
          placeholder="https://example.com/a/very/long/path"
          required
          value={formData.original_url}
          onChange={handleChange}
        />

        <Input
          label={
            <>
              Custom alias <span className="text-gray-400 font-normal">(optional)</span>
            </>
          }
          id="custom_alias"
          name="custom_alias"
          type="text"
          placeholder="my-campaign"
          value={formData.custom_alias}
          onChange={handleChange}
        />

        <Input
          label={
            <>
              Expires <span className="text-gray-400 font-normal">(optional)</span>
            </>
          }
          id="expires_at"
          name="expires_at"
          type="datetime-local"
          value={formData.expires_at}
          onChange={handleChange}
        />

        <div className="flex gap-3 pt-2">
          <Button type="submit" disabled={isSubmitting} className="flex-1">
            {isSubmitting ? 'Creating...' : 'Create'}
          </Button>
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </form>
    </Modal>
  )
}
