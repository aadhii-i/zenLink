import { useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import Card from '../components/ui/Card'
import Input from '../components/ui/Input'
import Button from '../components/ui/Button'

export default function Profile() {
  const { user, updateProfile, logout } = useAuth()
  const [fullName, setFullName] = useState(user?.full_name || '')
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  if (!user) return null

  const initial = (user.full_name || user.email || '?').charAt(0).toUpperCase()

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
    <section className="max-w-lg mx-auto px-4 py-16 motion-safe:animate-fade-in-up">
      <div className="flex items-center gap-4 mb-6">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary-500 to-accent-600 text-white flex items-center justify-center text-xl font-bold shadow-soft flex-shrink-0">
          {initial}
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Your profile</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">{user.email}</p>
        </div>
      </div>

      <Card className="p-6 space-y-4">
        {success && (
          <div className="p-3 rounded-lg bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-300 text-sm motion-safe:animate-fade-in-up">
            {success}
          </div>
        )}
        {error && (
          <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950 text-red-700 dark:text-red-300 text-sm motion-safe:animate-fade-in-up">
            {error}
          </div>
        )}

        <div>
          <p className="text-sm text-gray-500 dark:text-gray-400">Email</p>
          <p className="text-gray-900 dark:text-white font-medium">{user.email}</p>
        </div>

        {isEditing ? (
          <form onSubmit={handleSave} className="space-y-3">
            <Input
              label="Full name"
              id="full_name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
            />
            <div className="flex gap-3">
              <Button type="submit" disabled={isSaving}>
                {isSaving ? 'Saving...' : 'Save'}
              </Button>
              <Button type="button" variant="secondary" onClick={handleCancel}>
                Cancel
              </Button>
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
      </Card>
    </section>
  )
}
