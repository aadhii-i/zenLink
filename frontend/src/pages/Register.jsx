import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import Card from '../components/ui/Card'
import Input from '../components/ui/Input'
import Button from '../components/ui/Button'

// Mirrors the backend's UserCreate password validation
// (app/schemas/user.py) so users see feedback before submitting.
const PASSWORD_RULES = [
  { test: (pw) => pw.length >= 8, label: 'At least 8 characters' },
  { test: (pw) => /[A-Z]/.test(pw), label: 'One uppercase letter' },
  { test: (pw) => /[a-z]/.test(pw), label: 'One lowercase letter' },
  { test: (pw) => /[0-9]/.test(pw), label: 'One number' },
]

export default function Register() {
  const { register } = useAuth()
  const navigate = useNavigate()
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    password: '',
    confirmPassword: '',
  })
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleChange = (e) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }))
  }

  const failedRules = PASSWORD_RULES.filter((rule) => !rule.test(formData.password))
  const passwordsMatch =
    formData.password.length > 0 && formData.password === formData.confirmPassword

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (failedRules.length > 0) {
      setError('Password does not meet the requirements below.')
      return
    }
    if (!passwordsMatch) {
      setError('Passwords do not match.')
      return
    }

    setIsSubmitting(true)
    try {
      await register({
        email: formData.email,
        password: formData.password,
        full_name: formData.full_name || null,
      })
      navigate('/dashboard', { replace: true })
    } catch (err) {
      setError(err.response?.data?.detail || 'Registration failed. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <section className="max-w-md mx-auto px-4 py-16 motion-safe:animate-fade-in-up">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 text-center">
        Create your account
      </h1>

      <Card className="p-6">
        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-50 dark:bg-red-950 text-red-700 dark:text-red-300 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label={
              <>
                Full name <span className="text-gray-400 font-normal">(optional)</span>
              </>
            }
            id="full_name"
            name="full_name"
            type="text"
            autoComplete="name"
            value={formData.full_name}
            onChange={handleChange}
          />
          <Input
            label="Email"
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            value={formData.email}
            onChange={handleChange}
          />
          <Input
            label="Password"
            id="password"
            name="password"
            type="password"
            autoComplete="new-password"
            required
            value={formData.password}
            onChange={handleChange}
          >
            {formData.password.length > 0 && (
              <ul className="mt-2 space-y-1">
                {PASSWORD_RULES.map((rule) => {
                  const passed = rule.test(formData.password)
                  return (
                    <li
                      key={rule.label}
                      className={`text-xs flex items-center gap-1.5 transition-colors ${
                        passed ? 'text-green-600 dark:text-green-400' : 'text-gray-400'
                      }`}
                    >
                      <span>{passed ? '✓' : '○'}</span>
                      {rule.label}
                    </li>
                  )
                })}
              </ul>
            )}
          </Input>
          <Input
            label="Confirm password"
            id="confirmPassword"
            name="confirmPassword"
            type="password"
            autoComplete="new-password"
            required
            value={formData.confirmPassword}
            onChange={handleChange}
          >
            {formData.confirmPassword.length > 0 && !passwordsMatch && (
              <p className="mt-1 text-xs text-red-600 dark:text-red-400">Passwords do not match</p>
            )}
          </Input>
          <Button type="submit" disabled={isSubmitting} className="w-full">
            {isSubmitting ? 'Creating account...' : 'Create account'}
          </Button>
        </form>
      </Card>

      <p className="mt-6 text-sm text-center text-gray-600 dark:text-gray-400">
        Already have an account?{' '}
        <Link to="/login" className="text-primary-600 hover:text-primary-700 font-medium">
          Log in
        </Link>
      </p>
    </section>
  )
}
