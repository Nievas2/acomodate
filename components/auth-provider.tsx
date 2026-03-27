'use client'

import { createContext, useContext, useCallback, useMemo } from 'react'
import useSWR from 'swr'

interface User {
  id: string
  email: string
  username: string
  created_at: string
}

interface AuthContextType {
  user: User | null
  isLoading: boolean
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>
  register: (email: string, password: string, username: string) => Promise<{ success: boolean; error?: string }>
  logout: () => Promise<void>
  refresh: () => void
}

const AuthContext = createContext<AuthContextType | null>(null)

const fetcher = async (url: string) => {
  const res = await fetch(url)
  if (!res.ok) {
    if (res.status === 401) return { user: null }
    throw new Error('Failed to fetch')
  }
  return res.json()
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { data, error, isLoading, mutate } = useSWR('/api/auth/me', fetcher, {
    revalidateOnFocus: false,
    shouldRetryOnError: false,
  })

  const login = useCallback(async (email: string, password: string) => {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      
      const data = await res.json()
      
      if (!res.ok) {
        return { success: false, error: data.error || 'Login failed' }
      }
      
      await mutate()
      return { success: true }
    } catch {
      return { success: false, error: 'An error occurred' }
    }
  }, [mutate])

  const register = useCallback(async (email: string, password: string, username: string) => {
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, username }),
      })
      
      const data = await res.json()
      
      if (!res.ok) {
        return { success: false, error: data.error || 'Registration failed' }
      }
      
      await mutate()
      return { success: true }
    } catch {
      return { success: false, error: 'An error occurred' }
    }
  }, [mutate])

  const logout = useCallback(async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    await mutate({ user: null }, false)
  }, [mutate])

  const value = useMemo(() => ({
    user: data?.user || null,
    isLoading: isLoading && !error,
    login,
    register,
    logout,
    refresh: mutate,
  }), [data, isLoading, error, login, register, logout, mutate])

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
