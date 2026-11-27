import axios, { AxiosError, AxiosRequestConfig, InternalAxiosRequestConfig } from 'axios'
import Cookies from 'js-cookie'

const getInitialApiUrl = () => {
  if (typeof window !== 'undefined') {
    // 1. If loaded over HTTPS or running on a domain name, ALWAYS use same-origin HTTPS
    // to strictly prevent browser "Mixed Content" security blocks.
    if (window.location.protocol === 'https:' || !/^(\d{1,3}\.){3}\d{1,3}$/.test(window.location.hostname)) {
      return `${window.location.origin}/api/v1`;
    }

    // 2. If accessed via raw IP in HTTP (e.g. during direct VPS IP testing http://159.65.154.5:3025)
    const hostname = window.location.hostname;
    if (window.location.port !== '5010') {
      return `${window.location.protocol}//${hostname}:5010/api/v1`;
    }

    return `${window.location.origin}/api/v1`;
  }

  // Server-side fallback during SSR / build
  return process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:5010/api/v1';
};

const API_BASE_URL = getInitialApiUrl();

export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 60000,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Track if we're currently refreshing the token
let isRefreshing = false
let failedQueue: Array<{
  resolve: (token: string) => void
  reject: (error: unknown) => void
}> = []

const processQueue = (error: unknown, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error)
    } else {
      prom.resolve(token!)
    }
  })
  failedQueue = []
}

// Request interceptor: attach Authorization header and ensure correct dynamic host
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    if (typeof window !== 'undefined') {
      // Security enforcement: If page is loaded over HTTPS, strictly rewrite any insecure http:// endpoint to same-origin HTTPS
      if (window.location.protocol === 'https:' && (!config.baseURL || config.baseURL.startsWith('http://'))) {
        config.baseURL = `${window.location.origin}/api/v1`;
      } else if (!config.baseURL) {
        config.baseURL = getInitialApiUrl();
      }
    }
    const token = Cookies.get('accessToken')
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

// Response interceptor: auto-refresh token on 401
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as AxiosRequestConfig & { _retry?: boolean }

    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject })
        })
          .then((token) => {
            if (originalRequest.headers) {
              originalRequest.headers['Authorization'] = `Bearer ${token}`
            }
            return api(originalRequest)
          })
          .catch((err) => Promise.reject(err))
      }

      originalRequest._retry = true
      isRefreshing = true

      const refreshToken = Cookies.get('refreshToken')

      if (!refreshToken) {
        isRefreshing = false
        processQueue(error, null)
        // Redirect to login
        if (typeof window !== 'undefined') {
          Cookies.remove('accessToken', { path: '/' })
          Cookies.remove('refreshToken', { path: '/' })
          window.location.href = '/login'
        }
        return Promise.reject(error)
      }

      try {
        const refreshUrl = `${getInitialApiUrl()}/auth/refresh`;
        const response = await axios.post(refreshUrl, {
          refreshToken,
        })

        const { accessToken, refreshToken: newRefreshToken } = response.data.data

        const isSecure = typeof window !== 'undefined' && window.location.protocol === 'https:'
        Cookies.set('accessToken', accessToken, { expires: 1, secure: isSecure, sameSite: 'lax', path: '/' })
        if (newRefreshToken) {
          Cookies.set('refreshToken', newRefreshToken, {
            expires: 7,
            secure: isSecure,
            sameSite: 'lax',
            path: '/',
          })
        }

        api.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`
        processQueue(null, accessToken)

        if (originalRequest.headers) {
          originalRequest.headers['Authorization'] = `Bearer ${accessToken}`
        }

        return api(originalRequest)
      } catch (refreshError) {
        processQueue(refreshError, null)
        Cookies.remove('accessToken', { path: '/' })
        Cookies.remove('refreshToken', { path: '/' })
        if (typeof window !== 'undefined') {
          window.location.href = '/login'
        }
        return Promise.reject(refreshError)
      } finally {
        isRefreshing = false
      }
    }

    // Handle other errors uniformly
    const errorMessage =
      (error.response?.data as { message?: string })?.message ||
      error.message ||
      'An unexpected error occurred'

    return Promise.reject({
      ...error,
      displayMessage: errorMessage,
    })
  }
)

export default api
