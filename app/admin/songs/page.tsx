'use client'

import { useCallback, useEffect, useState } from 'react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

type SongStatus = 'DRAFT' | 'PUBLISHED' | 'HIDDEN'

interface AdminSong {
  id: string
  title: string
  artistName: string
  status: SongStatus
  playCount: string
  user: { username: string }
}

interface Pagination {
  page: number
  totalPages: number
  total: number
}

const STATUS_VARIANT: Record<SongStatus, 'default' | 'secondary' | 'destructive'> = {
  PUBLISHED: 'default',
  DRAFT: 'secondary',
  HIDDEN: 'destructive',
}

export default function AdminSongsPage() {
  const [songs, setSongs] = useState<AdminSong[]>([])
  const [pagination, setPagination] = useState<Pagination | null>(null)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [q, setQ] = useState('')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [actionId, setActionId] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: String(page), pageSize: '20' })
      if (search) params.set('q', search)
      if (statusFilter !== 'all') params.set('status', statusFilter)
      const res = await fetch(`/api/admin/songs?${params}`)
      const data = await res.json()
      if (data.success) {
        setSongs(data.data.songs)
        setPagination(data.data.pagination)
        setSelected(new Set())
      }
    } finally {
      setLoading(false)
    }
  }, [page, search, statusFilter])

  useEffect(() => {
    load()
  }, [load])

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleAll() {
    if (selected.size === songs.length) setSelected(new Set())
    else setSelected(new Set(songs.map((s) => s.id)))
  }

  async function updateStatus(id: string, status: SongStatus) {
    setActionId(id)
    try {
      const res = await fetch(`/api/admin/songs/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      if ((await res.json()).success) await load()
    } finally {
      setActionId(null)
    }
  }

  async function deleteSong(id: string) {
    if (!confirm('Delete this song?')) return
    setActionId(id)
    try {
      const res = await fetch(`/api/admin/songs/${id}`, { method: 'DELETE' })
      if ((await res.json()).success) await load()
    } finally {
      setActionId(null)
    }
  }

  async function batchDelete() {
    if (selected.size === 0) return
    if (!confirm(`Delete ${selected.size} song(s)?`)) return
    setActionId('batch')
    try {
      const res = await fetch('/api/admin/songs/batch-delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: Array.from(selected) }),
      })
      if ((await res.json()).success) await load()
    } finally {
      setActionId(null)
    }
  }

  return (
    <div>
      <h2 className="mb-6 text-2xl font-bold">Songs</h2>
      <div className="mb-4 flex flex-wrap gap-2">
        <Input
          placeholder="Search title, artist, album..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && (setSearch(q), setPage(1))}
          className="max-w-xs"
        />
        <Button variant="secondary" onClick={() => (setSearch(q), setPage(1))}>
          Search
        </Button>
        <Select
          value={statusFilter}
          onValueChange={(v) => {
            if (v) {
              setStatusFilter(v)
              setPage(1)
            }
          }}
        >
          <SelectTrigger className="w-36">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="DRAFT">Draft</SelectItem>
            <SelectItem value="PUBLISHED">Published</SelectItem>
            <SelectItem value="HIDDEN">Hidden</SelectItem>
          </SelectContent>
        </Select>
        {selected.size > 0 && (
          <Button variant="destructive" disabled={actionId === 'batch'} onClick={batchDelete}>
            Delete Selected ({selected.size})
          </Button>
        )}
      </div>
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">
                <Checkbox
                  checked={songs.length > 0 && selected.size === songs.length}
                  onCheckedChange={toggleAll}
                />
              </TableHead>
              <TableHead>Title</TableHead>
              <TableHead>Artist</TableHead>
              <TableHead>Uploader</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Plays</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading
              ? Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell colSpan={7}>
                      <Skeleton className="h-8 w-full" />
                    </TableCell>
                  </TableRow>
                ))
              : songs.map((song) => (
                  <TableRow key={song.id}>
                    <TableCell>
                      <Checkbox
                        checked={selected.has(song.id)}
                        onCheckedChange={() => toggleSelect(song.id)}
                      />
                    </TableCell>
                    <TableCell className="font-medium">{song.title}</TableCell>
                    <TableCell>{song.artistName}</TableCell>
                    <TableCell className="text-muted-foreground">{song.user.username}</TableCell>
                    <TableCell>
                      <Badge variant={STATUS_VARIANT[song.status]}>{song.status}</Badge>
                    </TableCell>
                    <TableCell>{Number(song.playCount).toLocaleString()}</TableCell>
                    <TableCell className="space-x-1 text-right">
                      {song.status !== 'PUBLISHED' && (
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={actionId === song.id}
                          onClick={() => updateStatus(song.id, 'PUBLISHED')}
                        >
                          Publish
                        </Button>
                      )}
                      {song.status !== 'HIDDEN' && (
                        <Button
                          size="sm"
                          variant="secondary"
                          disabled={actionId === song.id}
                          onClick={() => updateStatus(song.id, 'HIDDEN')}
                        >
                          Hide
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="destructive"
                        disabled={actionId === song.id}
                        onClick={() => deleteSong(song.id)}
                      >
                        Delete
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
          </TableBody>
        </Table>
      </div>
      {pagination && pagination.totalPages > 1 && (
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
            disabled={page >= pagination.totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  )
}
