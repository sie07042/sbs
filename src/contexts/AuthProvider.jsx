import { useEffect, useState } from 'react'
import axios from 'axios'
import AuthContext from './AuthContext'

const USER_STORAGE_KEY = 'user'
const SESSION_TOKEN_KEY = 'accessToken'

const normalizeUser = (rawUser) => {
  if (!rawUser) {
    return null
  }

  const source = rawUser.user && typeof rawUser.user === 'object' ? rawUser.user : rawUser
  const id = source.id ?? source.userId ?? rawUser.id ?? rawUser.userId ?? null

  return {
    ...rawUser,
    ...source,
    id,
    userId: source.userId ?? id,
    email: source.email ?? rawUser.email ?? '',
    name: source.name ?? rawUser.name ?? '',
    profileImage: source.profileImage ?? rawUser.profileImage ?? null,
    role: source.role ?? rawUser.role ?? null,
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [accessToken, setAccessToken] = useState(null)
  const [isLoading, setIsLoading] = useState(true)

  const fetchCurrentUser = async (token, fallbackUser = null) => {
    if (!token) {
      return normalizeUser(fallbackUser)
    }

    try {
      const response = await axios.get('/api/user/me', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        withCredentials: true,
      })

      return normalizeUser(response.data?.data || fallbackUser)
    } catch (error) {
      console.error('Failed to fetch current user from server:', error)
      return normalizeUser(fallbackUser)
    }
  }

  useEffect(() => {
    const restoreFromSession = () => {
      const savedUser = localStorage.getItem(USER_STORAGE_KEY)
      const savedToken = sessionStorage.getItem(SESSION_TOKEN_KEY)

      if (!savedUser || !savedToken) {
        return false
      }

      try {
        const userData = normalizeUser(JSON.parse(savedUser))

        if (!userData?.id) {
          throw new Error('Stored user is missing id')
        }

        setUser(userData)
        setAccessToken(savedToken)
        return true
      } catch (error) {
        console.error('Failed to restore auth from session storage:', error)
        localStorage.removeItem(USER_STORAGE_KEY)
        sessionStorage.removeItem(SESSION_TOKEN_KEY)
        return false
      }
    }

    const clearStoredAuth = () => {
      localStorage.removeItem(USER_STORAGE_KEY)
      sessionStorage.removeItem(SESSION_TOKEN_KEY)
    }

    const checkAuth = async () => {
      if (user && accessToken) {
        setIsLoading(false)
        return
      }

      const savedUser = localStorage.getItem(USER_STORAGE_KEY)

      if (!savedUser) {
        setIsLoading(false)
        return
      }

      try {
        const response = await axios.post('/api/refresh', {}, {
          withCredentials: true,
          headers: {
            'Content-Type': 'application/json',
          },
        })

        if (response.data.success) {
          const token = response.data.data.accessToken
          const userData = await fetchCurrentUser(
            token,
            response.data.data.user || JSON.parse(savedUser)
          )

          setUser(userData)
          setAccessToken(token)
          localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(userData))
          sessionStorage.setItem(SESSION_TOKEN_KEY, token)
          return
        }

        if (restoreFromSession()) {
          return
        }

        clearStoredAuth()
      } catch (error) {
        console.error('Refresh request failed:', error.response?.status, error.response?.data)

        if (restoreFromSession()) {
          return
        }

        clearStoredAuth()
      } finally {
        setIsLoading(false)
      }
    }

    checkAuth()
  }, [accessToken, user])

  const login = async (userData, token) => {
    const normalizedUser = normalizeUser(userData)
    const hydratedUser = await fetchCurrentUser(token, normalizedUser)

    setUser(hydratedUser)
    setAccessToken(token)
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(hydratedUser))
    sessionStorage.setItem(SESSION_TOKEN_KEY, token)
  }

  const logout = async () => {
    try {
      await axios.post('/api/logout', {}, {
        withCredentials: true,
      })
    } catch (error) {
      console.error('Server logout failed:', error)
    } finally {
      setUser(null)
      setAccessToken(null)
      localStorage.removeItem(USER_STORAGE_KEY)
      sessionStorage.removeItem(SESSION_TOKEN_KEY)
    }
  }

  const updateToken = (newToken) => {
    setAccessToken(newToken)
    sessionStorage.setItem(SESSION_TOKEN_KEY, newToken)
  }

  const updateUser = (nextUser) => {
    const normalizedUser = normalizeUser(nextUser)

    setUser(normalizedUser)
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(normalizedUser))
  }

  const refreshAccessToken = async () => {
    try {
      const response = await axios.post('/api/refresh', {}, {
        withCredentials: true,
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (!response.data.success) {
        throw new Error(response.data.message || 'Failed to refresh access token.')
      }

      const newAccessToken = response.data.data.accessToken
      const userData = await fetchCurrentUser(newAccessToken, response.data.data.user || user)

      setUser(userData)
      setAccessToken(newAccessToken)

      if (userData) {
        localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(userData))
      }

      sessionStorage.setItem(SESSION_TOKEN_KEY, newAccessToken)
      return newAccessToken
    } catch (error) {
      setUser(null)
      setAccessToken(null)
      localStorage.removeItem(USER_STORAGE_KEY)
      sessionStorage.removeItem(SESSION_TOKEN_KEY)
      throw error
    }
  }

  const value = {
    user,
    accessToken,
    isLoading,
    login,
    logout,
    updateToken,
    updateUser,
    refreshAccessToken,
    isAuthenticated: !!user,
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}
