import axiosClient from './axiosClient'

export const authApi = {
  register: (payload) => axiosClient.post('/auth/register', payload),
  login: (payload) => axiosClient.post('/auth/login', payload),
  refresh: (refreshToken) => axiosClient.post('/auth/refresh', { refresh_token: refreshToken }),
  getProfile: () => axiosClient.get('/auth/me'),
  updateProfile: (payload) => axiosClient.patch('/auth/me', payload),
}
