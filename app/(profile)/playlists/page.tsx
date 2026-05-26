'use client'

import { useEffect, useState } from 'react'

import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'

interface Playlist {
  id: string
  name: string
  description: string | null
  isPublic: boolean
  songCount: number
  coverFile: { url: string } | null
  updatedAt: string
}

function CreatePlaylistDialog({ onCreated }: { onCreated: (p: Playlist) => void }) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [isPublic, setIsPublic] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleCreate() {
    if (!name.trim()) {
      setError('Name is required')
      return
    }
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/playlists', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || undefined,
          isPublic,
        }),
      })
      const data = await res.json()
      if (!data.success) {
        setError(data.message)
        return
      }
      onCreated(data.data)
      setOpen(false)
      setName('')
      setDescription('')
    } catch {
      setError('Failed to create playlist')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger>
        <Button size="sm">+ New Playlist</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Playlist</DialogTitle>
          <DialogDescription>Give your playlist a name and start adding songs.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          {error && <p className="text-sm text-destructive">{error}</p>}
          <div className="space-y-1.5">
            <Label>Name *</Label>
            <Input
              placeholder="My Playlist"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Description</Label>
            <Input
              placeholder="Optional"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isPublic"
              checked={isPublic}
              onChange={(e) => setIsPublic(e.target.checked)}
              className="h-4 w-4 rounded border"
            />
            <Label htmlFor="isPublic">Make this playlist public</Label>
          </div>
          <Button className="w-full" onClick={handleCreate} disabled={loading}>
            {loading ? 'Creating…' : 'Create Playlist'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function PlaylistCard({
  playlist,
  onDelete,
}: {
  playlist: Playlist
  onDelete: (id: string) => void
}) {
  return (
    <Card className="group overflow-hidden transition-all hover:shadow-md">
      <Link href={`/playlist/${playlist.id}`}>
        <div className="relative aspect-square overflow-hidden bg-muted">
          {playlist.coverFile?.url ? (
            <Image
              src={playlist.coverFile.url}
              alt={playlist.name}
              fill
              sizes="200px"
              className="object-cover"
            />
          ) : (
            <div className="flex h-full items-center justify-center bg-gradient-to-br from-primary/20 to-primary/5">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="currentColor"
                className="h-10 w-10 text-primary/40"
              >
                <path d="M19.952 1.651a.75.75 0 01.298.599V16.303a3 3 0 01-2.176 2.884l-1.32.377a2.553 2.553 0 11-1.403-4.909l2.311-.66a1.5 1.5 0 001.088-1.442V6.994l-9 2.572v9.737a3 3 0 01-2.176 2.884l-1.32.377a2.553 2.553 0 11-1.402-4.909l2.31-.66a1.5 1.5 0 001.088-1.442V9.017 5.25a.75.75 0 01.544-.721l10.5-3a.75.75 0 01.658.122z" />
              </svg>
            </div>
          )}
          {!playlist.isPublic && (
            <div className="absolute top-1.5 right-1.5 rounded bg-black/50 px-1.5 py-0.5 text-xs text-white">
              Private
            </div>
          )}
        </div>
      </Link>
      <CardContent className="p-3">
        <Link
          href={`/playlist/${playlist.id}`}
          className="block truncate text-sm font-semibold hover:text-primary"
        >
          {playlist.name}
        </Link>
        <p className="mt-0.5 text-xs text-muted-foreground">{playlist.songCount} songs</p>
        <button
          onClick={(e) => {
            e.preventDefault()
            onDelete(playlist.id)
          }}
          className="mt-2 text-xs text-muted-foreground hover:text-destructive"
        >
          Delete
        </button>
      </CardContent>
    </Card>
  )
}

export default function PlaylistsPage() {
  const [playlists, setPlaylists] = useState<Playlist[]>([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    fetch('/api/playlists?mine=true')
      .then((r) => r.json())
      .then((d) => {
        if (d.success) setPlaylists(d.data.playlists)
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  async function handleDelete(id: string) {
    if (!confirm('Delete this playlist?')) return
    const res = await fetch(`/api/playlists/${id}`, { method: 'DELETE' })
    const d = await res.json()
    if (d.success) setPlaylists((p) => p.filter((pl) => pl.id !== id))
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">My Playlists</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {playlists.length} playlist{playlists.length !== 1 ? 's' : ''}
          </p>
        </div>
        <CreatePlaylistDialog
          onCreated={(p) => {
            setPlaylists((prev) => [p as Playlist, ...prev])
            router.push(`/playlist/${p.id}`)
          }}
        />
      </div>
      <Separator />
      {loading ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="aspect-square animate-pulse rounded-xl bg-muted" />
          ))}
        </div>
      ) : playlists.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-24 text-center">
          <p className="text-muted-foreground">No playlists yet.</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Create your first playlist to get started.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5">
          {playlists.map((pl) => (
            <PlaylistCard key={pl.id} playlist={pl} onDelete={handleDelete} />
          ))}
        </div>
      )}
    </div>
  )
}
