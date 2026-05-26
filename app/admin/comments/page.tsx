'use client'

import { useCallback, useEffect, useState } from 'react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
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

type CommentStatus = 'VISIBLE' | 'HIDDEN' | 'DELETED'

interface AdminComment {
  id: string
  content: string
  status: CommentStatus
  likeCount: number
  createdAt: string
  user: { username: string }
  song: { id: string; title: string }
}

export default function AdminCommentsPage() {
  const [comments, setComments] = useState<AdminComment[]>([])
  const [q, setQ] = useState('')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [loading, setLoading] = useState(true)
  const [actionId, setActionId] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: String(page), pageSize: '20' })
      if (search) params.set('q', search)
      if (statusFilter !== 'all') params.set('status', statusFilter)
      const res = await fetch(`/api/admin/comments?${params}`)
      const data = await res.json()
      if (data.success) {
        setComments(data.data.comments)
        setTotalPages(data.data.pagination.totalPages)
      }
    } finally {
      setLoading(false)
    }
  }, [page, search, statusFilter])

  useEffect(() => {
    load()
  }, [load])

  async function updateStatus(id: string, status: CommentStatus) {
    setActionId(id)
    try {
      const res = await fetch(`/api/admin/comments/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      if ((await res.json()).success) await load()
    } finally {
      setActionId(null)
    }
  }

  return (
    <div>
      <h2 className="mb-6 text-2xl font-bold">Comments</h2>
      <div className="mb-4 flex flex-wrap gap-2">
        <Input
          placeholder="Search content..."
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
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="VISIBLE">Visible</SelectItem>
            <SelectItem value="HIDDEN">Hidden</SelectItem>
            <SelectItem value="DELETED">Deleted</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User</TableHead>
              <TableHead>Song</TableHead>
              <TableHead>Content</TableHead>
              <TableHead>Status</TableHead>
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
              : comments.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell>{c.user.username}</TableCell>
                    <TableCell className="max-w-[120px] truncate text-muted-foreground">
                      {c.song.title}
                    </TableCell>
                    <TableCell className="max-w-md truncate">{c.content}</TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          c.status === 'VISIBLE'
                            ? 'default'
                            : c.status === 'HIDDEN'
                              ? 'secondary'
                              : 'destructive'
                        }
                      >
                        {c.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="space-x-1 text-right">
                      {c.status !== 'HIDDEN' && c.status !== 'DELETED' && (
                        <Button
                          size="sm"
                          variant="secondary"
                          disabled={actionId === c.id}
                          onClick={() => updateStatus(c.id, 'HIDDEN')}
                        >
                          Hide
                        </Button>
                      )}
                      {(c.status === 'HIDDEN' || c.status === 'DELETED') && (
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={actionId === c.id}
                          onClick={() => updateStatus(c.id, 'VISIBLE')}
                        >
                          Restore
                        </Button>
                      )}
                      {c.status !== 'DELETED' && (
                        <Button
                          size="sm"
                          variant="destructive"
                          disabled={actionId === c.id}
                          onClick={() => updateStatus(c.id, 'DELETED')}
                        >
                          Delete
                        </Button>
                      )}
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
