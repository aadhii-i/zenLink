import { useState } from 'react'
import { useAuth } from '../hooks/useAuth'

export default function Profile() {
  const { user, updateProfile, logout } = useAuth()
  const [fullName, setFullName] = useState(user?.full_name || '')
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  if (!user) return null

  const handleSave = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    setIsSaving(true)
    try {
      await updateProfile({ full_name: fullName || null })
      setSuccess('Profile updated.')
      setIsEditing(false)
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to update profile.')
    } finally {
      setIsSaving(false)
    }
  }

  const handleCancel = () => {
    setIsEditing(false)
    setFullName(user.full_name || '')
  }

  return (
    <section className="max-w-lg mx-auto px-4 py-16">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Your profile</h1>

      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6 space-y-4">
        {success && (
          <div className="p-3 rounded-lg bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-300 text-sm">
            {success}
          </div>
        )}
        {error && (
          <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950 text-red-700 dark:text-red-300 text-sm">
            {error}
          </div>
        )}

        <div>
          <p className="text-sm text-gray-500 dark:text-gray-400">Email</p>
          <p className="text-gray-900 dark:text-white font-medium">{user.email}</p>
        </div>

        {isEditing ? (
          <form onSubmit={handleSave} className="space-y-3">
            <div>
              <label
                htmlFor="full_name"
                className="block text-sm text-gray-500 dark:text-gray-400 mb-1"
              >
                Full name
              </label>
              <input
                id="full_name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
            <div className="flex gap-3">
              <button
                type="submit"
                disabled={isSaving}
                className="px-4 py-2 rounded-lg bg-primary-600 text-white font-medium hover:bg-primary-700 disabled:opacity-50 transition-colors"
              >
                {isSaving ? 'Saving...' : 'Save'}
              </button>
              <button
                type="button"
                onClick={handleCancel}
                className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">Full name</p>
            <p className="text-gray-900 dark:text-white font-medium">{user.full_name || '—'}</p>
            <button
              onClick={() => setIsEditing(true)}
              className="mt-3 text-sm text-primary-600 hover:text-primary-700 font-medium"
            >
              Edit
            </button>
          </div>
        )}

        <div className="pt-4 border-t border-gray-200 dark:border-gray-800">
          <button onClick={logout} className="text-sm text-red-600 hover:text-red-700 font-medium">
            Log out
          </button>
        </div>
      </div>
    </section>
  )
}
