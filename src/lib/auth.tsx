import { createContext, useContext, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Navigate } from '@tanstack/react-router'
import { marketplaceApi, tokenStore } from './api'
import type { User } from './models'

type AuthContextValue = {
  user: User | null
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  register: (name: string, email: string, password: string) => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState(tokenStore.get)
  const queryClient = useQueryClient()
  const session = useQuery({
    queryKey: ['session', token],
    queryFn: marketplaceApi.session,
    enabled: !!token,
    retry: false,
    staleTime: 30_000,
  })

  function establishSession(newToken: string) {
    queryClient.clear()
    tokenStore.set(newToken)
    setToken(newToken)
  }

  const value = useMemo<AuthContextValue>(() => ({
    user: token && session.isSuccess ? session.data : null,
    loading: !!token && session.isPending,
    login: async (email, password) => {
      const result = await marketplaceApi.login({ email, password })
      establishSession(result.token)
    },
    register: async (name, email, password) => {
      const result = await marketplaceApi.register({ name, email, password })
      establishSession(result.token)
    },
    logout: async () => {
      // Revoke the client session before waiting for the simulated server.
      // A page navigation must never be able to reuse the previous token.
      const serverLogout = marketplaceApi.logout()
      tokenStore.clear()
      queryClient.clear()
      setToken(null)
      try { await serverLogout } catch {
        // Local logout still succeeds when the network is unavailable.
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [token, session.data, session.isSuccess, session.isPending, queryClient])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used inside AuthProvider')
  return context
}

export function RequireAuth({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth()
  if (loading) return <div className="mx-auto max-w-6xl px-6 py-24 text-slate-400">Restaurando sua sessão…</div>
  if (!user) {
    sessionStorage.setItem('jungle-resume-path', window.location.pathname)
    return <Navigate to="/login" replace />
  }
  return <>{children}</>
}
