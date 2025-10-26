import axios from 'axios'

const baseURL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'

export const api = axios.create({ baseURL })

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token')
  if (token) {
    config.headers = config.headers || {}
    config.headers['Authorization'] = `Bearer ${token}`
  }
  return config
})

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true
      const refresh = localStorage.getItem('refresh_token')
      if (refresh) {
        try {
          const r = await api.post('/auth/refresh', { refresh })
          localStorage.setItem('access_token', r.data.access)
          localStorage.setItem('refresh_token', r.data.refresh)
          original.headers = original.headers || {}
          original.headers['Authorization'] = `Bearer ${r.data.access}`
          return api(original)
        } catch {
          // fallthrough to logout
        }
      }
      localStorage.removeItem('access_token')
      localStorage.removeItem('refresh_token')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)
