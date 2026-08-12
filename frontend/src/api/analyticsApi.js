import axiosClient from './axiosClient'

export const analyticsApi = {
  getOverview: (days = 30) => axiosClient.get('/analytics/overview', { params: { days } }),
  getUrlAnalytics: (urlId, days = 30) =>
    axiosClient.get(`/analytics/urls/${urlId}`, { params: { days } }),
  getTopUrls: (limit = 5) => axiosClient.get('/analytics/top-urls', { params: { limit } }),
}
