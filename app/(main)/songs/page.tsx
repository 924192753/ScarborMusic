import type { Metadata } from 'next'
import Link from 'next/link'

import { SongCard } from '@/components/music/SongCard'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { prisma } from '@/lib/prisma'

export const metadata: Metadata = {
  title: 'Songs',
  description: 'Browse and discover music on ScarborMusic',
}

// ISR: revalidate every 60 seconds
export const revalidate = 60

const SONG_INCLUDE = {
  category: { select: { id: true, name: true, slug: true } },
  tags: { include: { tag: { select: { id: true, name: true, slug: true } } } },
  coverFile: { select: { url: true } },
  user: { select: { id: true, username: true } },
} as const

interface PageProps {
  searchParams: Promise<{
    page?: string
    categoryId?: string
    tagId?: string
    sort?: string
  }>
}

export default async function SongsPage({ searchParams }: PageProps) {
  const sp = await searchParams
  const page = Math.max(1, Number(sp.page ?? 1))
  const pageSize = 20
  const categoryId = sp.categoryId ? Number(sp.categoryId) : undefined
  const tagId = sp.tagId ? Number(sp.tagId) : undefined
  const sort = (sp.sort as 'latest' | 'popular' | 'liked') ?? 'latest'

  const where = {
    deletedAt: null,
    status: 'PUBLISHED' as const,
    ...(categoryId && { categoryId }),
    ...(tagId && { tags: { some: { tagId } } }),
  }

  const [songs, total, categories, tags] = await Promise.all([
    prisma.song.findMany({
      where,
      include: SONG_INCLUDE,
      orderBy:
        sort === 'popular'
          ? { playCount: 'desc' }
          : sort === 'liked'
            ? { likeCount: 'desc' }
            : { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.song.count({ where }),
    prisma.category.findMany({ orderBy: { name: 'asc' } }),
    prisma.tag.findMany({ orderBy: { name: 'asc' } }),
  ])

  const totalPages = Math.ceil(total / pageSize)

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Songs</h1>
          <p className="mt-1 text-sm text-muted-foreground">{total} songs available</p>
        </div>
        <Link href="/uploads/song">
          <Button size="sm">+ Upload Song</Button>
        </Link>
      </div>

      <div className="flex gap-6">
        {/* Sidebar filters */}
        <aside className="hidden w-48 shrink-0 space-y-6 lg:block">
          {/* Sort */}
          <div>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Sort by
            </h3>
            <div className="space-y-1">
              {(['latest', 'popular', 'liked'] as const).map((s) => (
                <Link
                  key={s}
                  href={{ pathname: '/songs', query: { ...sp, sort: s, page: '1' } }}
                  className={`block rounded-md px-3 py-1.5 text-sm capitalize transition-colors ${
                    sort === s
                      ? 'bg-primary/10 font-medium text-primary'
                      : 'text-muted-foreground hover:bg-muted'
                  }`}
                >
                  {s}
                </Link>
              ))}
            </div>
          </div>

          {/* Categories */}
          <div>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Category
            </h3>
            <div className="space-y-1">
              <Link
                href={{ pathname: '/songs', query: { ...sp, categoryId: undefined, page: '1' } }}
                className={`block rounded-md px-3 py-1.5 text-sm transition-colors ${
                  !categoryId
                    ? 'bg-primary/10 font-medium text-primary'
                    : 'text-muted-foreground hover:bg-muted'
                }`}
              >
                All
              </Link>
              {categories.map((cat) => (
                <Link
                  key={cat.id}
                  href={{ pathname: '/songs', query: { ...sp, categoryId: cat.id, page: '1' } }}
                  className={`block rounded-md px-3 py-1.5 text-sm transition-colors ${
                    categoryId === cat.id
                      ? 'bg-primary/10 font-medium text-primary'
                      : 'text-muted-foreground hover:bg-muted'
                  }`}
                >
                  {cat.name}
                </Link>
              ))}
            </div>
          </div>

          {/* Tags */}
          <div>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Tags
            </h3>
            <div className="flex flex-wrap gap-1.5">
              {tags.map((tag) => (
                <Link
                  key={tag.id}
                  href={{ pathname: '/songs', query: { ...sp, tagId: tag.id, page: '1' } }}
                >
                  <Badge
                    variant={tagId === tag.id ? 'default' : 'secondary'}
                    className="cursor-pointer text-xs"
                  >
                    {tag.name}
                  </Badge>
                </Link>
              ))}
            </div>
          </div>
        </aside>

        {/* Song grid */}
        <div className="flex-1">
          {songs.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-24 text-center">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="currentColor"
                className="mb-4 h-12 w-12 text-muted-foreground/30"
              >
                <path d="M19.952 1.651a.75.75 0 01.298.599V16.303a3 3 0 01-2.176 2.884l-1.32.377a2.553 2.553 0 11-1.403-4.909l2.311-.66a1.5 1.5 0 001.088-1.442V6.994l-9 2.572v9.737a3 3 0 01-2.176 2.884l-1.32.377a2.553 2.553 0 11-1.402-4.909l2.31-.66a1.5 1.5 0 001.088-1.442V9.017 5.25a.75.75 0 01.544-.721l10.5-3a.75.75 0 01.658.122z" />
              </svg>
              <p className="text-muted-foreground">No songs found</p>
              <Link href="/uploads/song" className="mt-3">
                <Button variant="outline" size="sm">
                  Upload the first song
                </Button>
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-5">
              {songs.map((song) => (
                <SongCard key={song.id} song={{ ...song, playCount: song.playCount.toString() }} />
              ))}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-8 flex items-center justify-center gap-2">
              {page > 1 && (
                <Link href={{ pathname: '/songs', query: { ...sp, page: page - 1 } }}>
                  <Button variant="outline" size="sm">
                    ← Previous
                  </Button>
                </Link>
              )}
              <span className="text-sm text-muted-foreground">
                Page {page} of {totalPages}
              </span>
              {page < totalPages && (
                <Link href={{ pathname: '/songs', query: { ...sp, page: page + 1 } }}>
                  <Button variant="outline" size="sm">
                    Next →
                  </Button>
                </Link>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
