import { useCallback, useEffect, useState } from 'react'
import { authApi } from '../api/authApi'
import { AuthContext } from './auth-context'

function storeTokens(tokens) {
  localStorage.setItem('accessToken', tokens.access_token)
  localStorage.setItem('refreshToken', tokens.refresh_token)
}

function clearTokens() {
  localStorage.removeItem('accessToken')
  localStorage.removeItem('refreshToken')
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [isLoading, setIsLoading] = useState(true)

  const loadProfile = useCallback(async () => {
    if (!localStorage.getItem('accessToken')) {
      setUser(null)
      setIsLoading(false)
      return
    }
    try {
      const { data } = await authApi.getProfile()
      setUser(data)
    } catch {
      clearTokens()
      setUser(null)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadProfile()
  }, [loadProfile])

  const login = useCallback(async (credentials) => {
    const { data } = await authApi.login(credentials)
    storeTokens(data)
    await loadProfile()
  }, [loadProfile])

  const register = useCallback(
    async (payload) => {
      await authApi.register(payload)
      // Registration returns the created user, not a session, so log in
      // immediately after to get the user straight into the app.
      await login({ email: payload.email, password: payload.password })
    },
    [login],
  )

  const logout = useCallback(() => {
    clearTokens()
    setUser(null)
  }, [])

  const updateProfile = useCallback(async (payload) => {
    const { data } = await authApi.updateProfile(payload)
    setUser(data)
    return data
  }, [])

  const value = {
    user,
    isAuthenticated: Boolean(user),
    isLoading,
    login,
    register,
    logout,
    updateProfile,
    refreshProfile: loadProfile,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
