'use client'

import { useEffect, useState } from 'react'

export interface CurrentUser {
  id: string
  username: string
  email: string
  avatarUrl: string | null
  role: string
}

type UserState = CurrentUser | null | undefined // undefined = still loading

/**
 * Client-side hook to fetch the currently authenticated user from the API.
 * Returns undefined while loading, null if not authenticated, or the user object.
 */
export function useCurrentUser(): UserState {
  const [user, setUser] = useState<UserState>(undefined)

  useEffect(() => {
    fetch('/api/auth/me')
      .then((r) => r.json())
      .then((d) => setUser(d.success ? (d.data as CurrentUser) : null))
      .catch(() => setUser(null))
  }, [])

  return user
}
