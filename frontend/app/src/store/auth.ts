import { create } from 'zustand'

export type Role = 'ADM' | 'USUARIO' | null

export interface AuthState {
  access: string | null
  refresh: string | null
  role: Role
  setTokens: (access: string, refresh: string, role: Role) => void
  clear: () => void
}

function decodeRoleFromToken(token: string | null): Role {
  if (!token) return null
  try {
    const payload = JSON.parse(atob(token.split('.')[1]))
    const role = payload?.role
    if (role === 'ADM' || role === 'USUARIO') return role
    return null
  } catch {
    return null
  }
}

export const useAuth = create<AuthState>((set) => ({
  access: localStorage.getItem('access_token'),
  refresh: localStorage.getItem('refresh_token'),
  role: decodeRoleFromToken(localStorage.getItem('access_token')),
  setTokens: (access, refresh, role) => {
    localStorage.setItem('access_token', access)
    localStorage.setItem('refresh_token', refresh)
    set({ access, refresh, role })
  },
  clear: () => {
    localStorage.removeItem('access_token')
    localStorage.removeItem('refresh_token')
    set({ access: null, refresh: null, role: null })
  }
}))
