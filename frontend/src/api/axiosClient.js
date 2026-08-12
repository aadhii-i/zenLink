import axios from 'axios'

// Falls back to localhost for local (non-Docker) `npm run dev` usage; in
// Docker/production this is injected at build time from the frontend's .env.
const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1'

const axiosClient = axios.create({
  baseURL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Attaches the JWT access token. Reading directly from localStorage here
// (rather than importing AuthContext) avoids a circular dependency between
// the context and the client it needs.
axiosClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Coalesces concurrent 401s onto a single in-flight refresh call instead of
// firing one refresh request per failed request.
let refreshPromise = null

async function refreshAccessToken() {
  const refreshToken = localStorage.getItem('refreshToken')
  if (!refreshToken) {
    throw new Error('No refresh token available')
  }

  // Uses the bare `axios` module, not `axiosClient` — going through
  // axiosClient would attach the just-expired access token and re-enter
  // this same response interceptor.
  const response = await axios.post(`${baseURL}/auth/refresh`, { refresh_token: refreshToken })
  localStorage.setItem('accessToken', response.data.access_token)
  localStorage.setItem('refreshToken', response.data.refresh_token)
  return response.data.access_token
}

axiosClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config
    const isAuthEndpoint = /\/auth\/(login|register|refresh)$/.test(originalRequest?.url || '')

    if (error.response?.status === 401 && !originalRequest._retry && !isAuthEndpoint) {
      originalRequest._retry = true

      try {
        refreshPromise = refreshPromise || refreshAccessToken()
        const newAccessToken = await refreshPromise
        refreshPromise = null

        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`
        return axiosClient(originalRequest)
      } catch (refreshError) {
        refreshPromise = null
        localStorage.removeItem('accessToken')
        localStorage.removeItem('refreshToken')
        window.location.href = '/login'
        return Promise.reject(refreshError)
      }
    }

    return Promise.reject(error)
  },
)

export default axiosClient
