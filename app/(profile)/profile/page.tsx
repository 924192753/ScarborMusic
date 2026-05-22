import { cookies } from 'next/headers'
import Image from 'next/image'
import Link from 'next/link'
import { redirect } from 'next/navigation'

import { SongCard } from '@/components/music/SongCard'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { verifyAccessToken } from '@/lib/jwt'
import { prisma } from '@/lib/prisma'
import type { PlayerSong } from '@/store/player'

export const dynamic = 'force-dynamic'

async function getProfileData(userId: string) {
  const [user, songCount, favoriteCount, playlistCount, recentSongs] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        username: true,
        email: true,
        avatarUrl: true,
        createdAt: true,
        role: { select: { name: true } },
      },
    }),
    prisma.song.count({ where: { userId, deletedAt: null } }),
    prisma.favorite.count({ where: { userId } }),
    prisma.playlist.count({ where: { userId, deletedAt: null } }),
    prisma.song.findMany({
      where: { userId, deletedAt: null },
      orderBy: { createdAt: 'desc' },
      take: 5,
      include: {
        coverFile: { select: { url: true } },
        audioFile: { select: { url: true } },
        category: { select: { id: true, name: true, slug: true } },
        tags: { include: { tag: { select: { id: true, name: true, slug: true } } } },
      },
    }),
  ])
  return { user, songCount, favoriteCount, playlistCount, recentSongs }
}

export default async function ProfilePage() {
  const cookieStore = await cookies()
  const token = cookieStore.get('access_token')?.value
  if (!token) redirect('/login?redirect=/profile')

  let userId: string
  try {
    const payload = await verifyAccessToken(token)
    userId = payload.sub
  } catch {
    redirect('/login?redirect=/profile')
  }

  const { user, songCount, favoriteCount, playlistCount, recentSongs } =
    await getProfileData(userId)
  if (!user) redirect('/login')

  const playerQueue: PlayerSong[] = recentSongs
    .filter((s) => s.audioFile?.url)
    .map((s) => ({
      id: s.id,
      title: s.title,
      artistName: s.artistName,
      audioUrl: s.audioFile!.url,
      coverUrl: s.coverFile?.url ?? null,
      duration: s.duration ?? null,
    }))

  return (
    <div className="space-y-8">
      {/* User info */}
      <div className="flex items-center gap-5">
        <div className="relative h-16 w-16 overflow-hidden rounded-full bg-primary/20 shadow">
          {user.avatarUrl ? (
            <Image
              src={user.avatarUrl}
              alt={user.username}
              fill
              sizes="64px"
              className="object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-2xl font-bold text-primary">
              {user.username.slice(0, 1).toUpperCase()}
            </div>
          )}
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold">{user.username}</h1>
            {user.role.name === 'ADMIN' && (
              <Badge variant="default" className="text-xs">
                Admin
              </Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground">{user.email}</p>
          <p className="text-xs text-muted-foreground">
            Member since{' '}
            {new Date(user.createdAt).toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'long',
            })}
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Link href="/uploads">
          <Card className="transition-all hover:shadow-md hover:border-primary/30">
            <CardContent className="pt-5 text-center">
              <p className="text-3xl font-bold text-primary">{songCount}</p>
              <p className="mt-1 text-sm text-muted-foreground">Songs</p>
            </CardContent>
          </Card>
        </Link>
        <Link href="/favorites">
          <Card className="transition-all hover:shadow-md hover:border-primary/30">
            <CardContent className="pt-5 text-center">
              <p className="text-3xl font-bold text-primary">{favoriteCount}</p>
              <p className="mt-1 text-sm text-muted-foreground">Favorites</p>
            </CardContent>
          </Card>
        </Link>
        <Link href="/playlists">
          <Card className="transition-all hover:shadow-md hover:border-primary/30">
            <CardContent className="pt-5 text-center">
              <p className="text-3xl font-bold text-primary">{playlistCount}</p>
              <p className="mt-1 text-sm text-muted-foreground">Playlists</p>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Quick actions */}
      <div className="flex flex-wrap gap-2">
        <Link
          href="/uploads/song"
          className="rounded-full border px-4 py-1.5 text-sm transition-colors hover:bg-muted"
        >
          + Upload Song
        </Link>
        <Link
          href="/playlists"
          className="rounded-full border px-4 py-1.5 text-sm transition-colors hover:bg-muted"
        >
          My Playlists
        </Link>
        <Link
          href="/favorites"
          className="rounded-full border px-4 py-1.5 text-sm transition-colors hover:bg-muted"
        >
          Favorites
        </Link>
      </div>

      {/* Recent uploads */}
      {recentSongs.length > 0 && (
        <>
          <Separator />
          <div>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold">Recent Uploads</h2>
              <Link href="/uploads" className="text-sm text-primary hover:underline">
                View all →
              </Link>
            </div>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-5">
              {recentSongs.map((song) => (
                <SongCard
                  key={song.id}
                  song={{ ...song, playCount: song.playCount.toString() }}
                  queue={playerQueue}
                />
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
