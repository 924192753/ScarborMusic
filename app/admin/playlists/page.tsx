'use client'

import { useCallback, useEffect, useState } from 'react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

interface AdminPlaylist {
  id: string
  name: string
  isPublic: boolean
  songCount: number
  user: { username: string }
  createdAt: string
}

export default function AdminPlaylistsPage() {
  const [playlists, setPlaylists] = useState<AdminPlaylist[]>([])
  const [q, setQ] = useState('')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [loading, setLoading] = useState(true)
  const [actionId, setActionId] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: String(page), pageSize: '20' })
      if (search) params.set('q', search)
      const res = await fetch(`/api/admin/playlists?${params}`)
      const data = await res.json()
      if (data.success) {
        setPlaylists(data.data.playlists)
        setTotalPages(data.data.pagination.totalPages)
      }
    } finally {
      setLoading(false)
    }
  }, [page, search])

  useEffect(() => {
    load()
  }, [load])

  async function hidePlaylist(id: string) {
    setActionId(id)
    try {
      const res = await fetch(`/api/admin/playlists/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hidden: true }),
      })
      if ((await res.json()).success) await load()
    } finally {
      setActionId(null)
    }
  }

  async function deletePlaylist(id: string) {
    if (!confirm('Delete this playlist?')) return
    setActionId(id)
    try {
      const res = await fetch(`/api/admin/playlists/${id}`, { method: 'DELETE' })
      if ((await res.json()).success) await load()
    } finally {
      setActionId(null)
    }
  }

  return (
    <div>
      <h2 className="mb-6 text-2xl font-bold">Playlists</h2>
      <div className="mb-4 flex gap-2">
        <Input
          placeholder="Search playlists..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && (setSearch(q), setPage(1))}
          className="max-w-xs"
        />
        <Button variant="secondary" onClick={() => (setSearch(q), setPage(1))}>
          Search
        </Button>
      </div>
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Owner</TableHead>
              <TableHead>Songs</TableHead>
              <TableHead>Visibility</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading
              ? Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell colSpan={5}>
                      <Skeleton className="h-8 w-full" />
                    </TableCell>
                  </TableRow>
                ))
              : playlists.map((pl) => (
                  <TableRow key={pl.id}>
                    <TableCell className="font-medium">{pl.name}</TableCell>
                    <TableCell>{pl.user.username}</TableCell>
                    <TableCell>{pl.songCount}</TableCell>
                    <TableCell>
                      <Badge variant={pl.isPublic ? 'default' : 'secondary'}>
                        {pl.isPublic ? 'Public' : 'Private'}
                      </Badge>
                    </TableCell>
                    <TableCell className="space-x-1 text-right">
                      {pl.isPublic && (
                        <Button
                          size="sm"
                          variant="secondary"
                          disabled={actionId === pl.id}
                          onClick={() => hidePlaylist(pl.id)}
                        >
                          Hide
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="destructive"
                        disabled={actionId === pl.id}
                        onClick={() => deletePlaylist(pl.id)}
                      >
                        Delete
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
          </TableBody>
        </Table>
      </div>
      {totalPages > 1 && (
        <div className="mt-4 flex justify-end gap-2">
          <Button
            size="sm"
            variant="outline"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
          >
            Previous
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  )
}
