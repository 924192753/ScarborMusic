'use client'

import { useEffect, useState } from 'react'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

interface DashboardStats {
  totalUsers: number
  totalSongs: number
  totalComments: number
  totalPlaylists: number
  todayNewUsers: number
  todayPlays: number
}

const STAT_CARDS: { key: keyof DashboardStats; label: string; accent: string }[] = [
  { key: 'totalUsers', label: 'Total Users', accent: 'text-blue-500' },
  { key: 'totalSongs', label: 'Total Songs', accent: 'text-purple-500' },
  { key: 'totalComments', label: 'Total Comments', accent: 'text-green-500' },
  { key: 'totalPlaylists', label: 'Total Playlists', accent: 'text-orange-500' },
  { key: 'todayNewUsers', label: 'New Users Today', accent: 'text-cyan-500' },
  { key: 'todayPlays', label: 'Plays Today', accent: 'text-pink-500' },
]

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/admin/dashboard/stats')
        const data = await res.json()
        if (!data.success) {
          setError(data.message)
          return
        }
        setStats(data.data)
      } catch {
        setError('Failed to load dashboard stats')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  return (
    <div>
      <h2 className="mb-6 text-2xl font-bold">Dashboard</h2>
      {error && (
        <p className="mb-4 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-2 text-sm text-destructive">
          {error}
        </p>
      )}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {STAT_CARDS.map((card) => (
          <Card key={card.key}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {card.label}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="h-8 w-24" />
              ) : (
                <p className={`text-3xl font-bold ${card.accent}`}>
                  {stats ? stats[card.key].toLocaleString() : '—'}
                </p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
