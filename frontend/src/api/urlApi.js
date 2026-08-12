import axiosClient from './axiosClient'

export const urlApi = {
  create: (payload) => axiosClient.post('/urls', payload),
  list: (params) => axiosClient.get('/urls', { params }),
  getStats: () => axiosClient.get('/urls/stats'),
  get: (id) => axiosClient.get(`/urls/${id}`),
  update: (id, payload) => axiosClient.patch(`/urls/${id}`, payload),
  remove: (id) => axiosClient.delete(`/urls/${id}`),
}
