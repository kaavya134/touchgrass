import axios from 'axios'
const api = axios.create({ baseURL: (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api').replace(/\/$/, ''), withCredentials: true })
let csrfToken = null
let csrfRequest = null
export function setCsrfToken(value) { csrfToken = value || null }
api.interceptors.request.use(async config => {
  if (!['get','head','options'].includes((config.method || 'get').toLowerCase())) {
    if (!csrfToken) {
      csrfRequest ||= api.get('/auth/csrf').then(({data}) => { csrfToken = data.csrfToken }).finally(() => { csrfRequest = null })
      await csrfRequest
    }
    config.headers['X-CSRF-Token'] = csrfToken
  }
  return config
})
api.interceptors.response.use(response => response, error => {
  if (error.response?.status === 401 && !error.config?.url?.startsWith('/auth/')) window.dispatchEvent(new Event('touchgrass:unauthorized'))
  return Promise.reject(error)
})
export default api
