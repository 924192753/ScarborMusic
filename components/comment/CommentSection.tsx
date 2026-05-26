'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

import Image from 'next/image'
import Link from 'next/link'

import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { useCurrentUser } from '@/hooks/useCurrentUser'

// ─── Types ────────────────────────────────────────────────────────────────────

interface CommentUser {
  id: string
  username: string
  avatarUrl: string | null
}

interface CommentData {
  id: string
  content: string
  likeCount: number
  isLiked?: boolean
  createdAt: string
  user: CommentUser
  replies?: CommentData[]
  parentId?: string | null
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function timeAgo(date: string): string {
  const diff = Date.now() - new Date(date).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days}d ago`
  return new Date(date).toLocaleDateString()
}

function UserAvatar({ user, size = 8 }: { user: CommentUser; size?: number }) {
  const cls = `relative shrink-0 overflow-hidden rounded-full bg-primary/20`
  const dim = `h-${size} w-${size}`
  return (
    <div className={`${cls} ${dim}`}>
      {user.avatarUrl ? (
        <Image
          src={user.avatarUrl}
          alt={user.username}
          fill
          sizes={`${size * 4}px`}
          className="object-cover"
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center text-xs font-bold text-primary">
          {user.username.slice(0, 1).toUpperCase()}
        </div>
      )}
    </div>
  )
}

// ─── Comment Input ────────────────────────────────────────────────────────────

function CommentInput({
  onSubmit,
  placeholder = 'Write a comment…',
  autoFocus = false,
  compact = false,
  onCancel,
}: {
  onSubmit: (content: string) => Promise<void>
  placeholder?: string
  autoFocus?: boolean
  compact?: boolean
  onCancel?: () => void
}) {
  const [content, setContent] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const ref = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (autoFocus) ref.current?.focus()
  }, [autoFocus])

  async function handleSubmit() {
    if (!content.trim()) return
    setLoading(true)
    setError(null)
    try {
      await onSubmit(content.trim())
      setContent('')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to post')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={`space-y-2 ${compact ? '' : ''}`}>
      <textarea
        ref={ref}
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder={placeholder}
        rows={compact ? 2 : 3}
        maxLength={1000}
        className="w-full resize-none rounded-lg border bg-muted/30 px-3 py-2 text-sm outline-none ring-ring placeholder:text-muted-foreground focus:ring-1"
      />
      {error && <p className="text-xs text-destructive">{error}</p>}
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">{content.length}/1000</span>
        <div className="flex gap-2">
          {onCancel && (
            <Button variant="ghost" size="sm" onClick={onCancel} disabled={loading}>
              Cancel
            </Button>
          )}
          <Button size="sm" onClick={handleSubmit} disabled={loading || !content.trim()}>
            {loading ? 'Posting…' : 'Post'}
          </Button>
        </div>
      </div>
    </div>
  )
}

// ─── Single Comment Item ──────────────────────────────────────────────────────

function CommentItem({
  comment,
  songId,
  currentUserId,
  depth = 0,
  onReplyPosted,
  onDeleted,
}: {
  comment: CommentData
  songId: string
  currentUserId?: string
  depth?: number
  onReplyPosted: (parentId: string, reply: CommentData) => void
  onDeleted: (id: string) => void
}) {
  const [isLiked, setIsLiked] = useState(comment.isLiked ?? false)
  const [likeCount, setLikeCount] = useState(comment.likeCount)
  const [showReplyInput, setShowReplyInput] = useState(false)

  async function handleLike() {
    if (!currentUserId) {
      window.location.href = '/login'
      return
    }
    const prevLiked = isLiked
    const prevCount = likeCount
    setIsLiked(!prevLiked)
    setLikeCount((c) => c + (prevLiked ? -1 : 1))

    try {
      const res = await fetch(`/api/comments/${comment.id}/like`, { method: 'POST' })
      const d = await res.json()
      if (d.success) {
        setIsLiked(d.data.isLiked)
        setLikeCount(d.data.likeCount)
      } else {
        setIsLiked(prevLiked)
        setLikeCount(prevCount)
      }
    } catch {
      setIsLiked(prevLiked)
      setLikeCount(prevCount)
    }
  }

  async function handleDelete() {
    if (!confirm('Delete this comment?')) return
    const res = await fetch(`/api/comments/${comment.id}`, { method: 'DELETE' })
    const d = await res.json()
    if (d.success) onDeleted(comment.id)
  }

  async function handleReply(content: string) {
    const res = await fetch('/api/comments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ songId, content, parentId: comment.id }),
    })
    const d = await res.json()
    if (!d.success) throw new Error(d.message)
    onReplyPosted(comment.id, d.data as CommentData)
    setShowReplyInput(false)
  }

  const isOwner = currentUserId === comment.user.id
  const canReply = depth < 2 // Max 3 levels (0, 1, 2)

  return (
    <div className={`flex gap-2.5 ${depth > 0 ? 'ml-8 mt-2' : ''}`}>
      <UserAvatar user={comment.user} size={depth > 0 ? 7 : 8} />

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className="text-sm font-medium">{comment.user.username}</span>
          <span className="text-xs text-muted-foreground">{timeAgo(comment.createdAt)}</span>
        </div>

        <p className="mt-0.5 whitespace-pre-wrap text-sm leading-relaxed">{comment.content}</p>

        {/* Actions */}
        <div className="mt-1.5 flex items-center gap-3">
          {/* Like */}
          <button
            onClick={handleLike}
            className={`flex items-center gap-1 text-xs transition-colors ${isLiked ? 'text-red-500' : 'text-muted-foreground hover:text-red-400'}`}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 16 16"
              fill={isLiked ? 'currentColor' : 'none'}
              stroke="currentColor"
              strokeWidth={isLiked ? 0 : 1.5}
              className="h-3.5 w-3.5"
            >
              <path d="M7.463 3.454A4.361 4.361 0 018 3.75c.175 0 .347.012.517.036A4.334 4.334 0 0112 2.25c2.38 0 4.25 2.005 4.25 4.375 0 3.163-3.13 5.937-5.46 7.437-.51.325-1.07.5-1.617.5-.548 0-1.109-.175-1.617-.5C4.879 12.563 1.75 9.788 1.75 6.625 1.75 4.255 3.62 2.25 6 2.25c.534 0 1.058.094 1.543.27l.083.034z" />
            </svg>
            <span>{likeCount}</span>
          </button>

          {/* Reply */}
          {canReply && (
            <button
              onClick={() => setShowReplyInput((v) => !v)}
              className="text-xs text-muted-foreground transition-colors hover:text-foreground"
            >
              Reply
            </button>
          )}

          {/* Delete */}
          {(isOwner || currentUserId) && isOwner && (
            <button
              onClick={handleDelete}
              className="text-xs text-muted-foreground transition-colors hover:text-destructive"
            >
              Delete
            </button>
          )}
        </div>

        {/* Reply input */}
        {showReplyInput && currentUserId && (
          <div className="mt-2">
            <CommentInput
              onSubmit={handleReply}
              placeholder={`Reply to ${comment.user.username}…`}
              autoFocus
              compact
              onCancel={() => setShowReplyInput(false)}
            />
          </div>
        )}

        {showReplyInput && !currentUserId && (
          <p className="mt-2 text-xs text-muted-foreground">
            <Link href="/login" className="text-primary hover:underline">
              Log in
            </Link>{' '}
            to reply
          </p>
        )}

        {/* Nested replies */}
        {comment.replies && comment.replies.length > 0 && (
          <div className="mt-2 space-y-0">
            {comment.replies.map((reply) => (
              <CommentItem
                key={reply.id}
                comment={reply}
                songId={songId}
                currentUserId={currentUserId}
                depth={depth + 1}
                onReplyPosted={onReplyPosted}
                onDeleted={onDeleted}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Main Section ─────────────────────────────────────────────────────────────

export function CommentSection({ songId }: { songId: string }) {
  const currentUser = useCurrentUser()
  const [comments, setComments] = useState<CommentData[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pages, setPages] = useState(1)
  const [sort, setSort] = useState<'latest' | 'hot'>('latest')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchComments = useCallback(
    async (p: number, s: 'latest' | 'hot') => {
      setLoading(true)
      setError(null)
      try {
        const res = await fetch(`/api/comments?songId=${songId}&page=${p}&pageSize=20&sort=${s}`)
        const d = await res.json()
        if (d.success) {
          setComments(d.data.comments)
          setTotal(d.data.total)
          setPages(d.data.pages)
        }
      } catch {
        setError('Failed to load comments')
      } finally {
        setLoading(false)
      }
    },
    [songId],
  )

  useEffect(() => {
    fetchComments(page, sort)
  }, [fetchComments, page, sort])

  async function handlePost(content: string) {
    const res = await fetch('/api/comments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ songId, content }),
    })
    const d = await res.json()
    if (!d.success) throw new Error(d.message)

    setComments((prev) => [d.data as CommentData, ...prev])
    setTotal((t) => t + 1)
  }

  function handleReplyPosted(parentId: string, reply: CommentData) {
    setComments((prev) =>
      prev.map((c) => {
        if (c.id === parentId) {
          return { ...c, replies: [...(c.replies ?? []), reply] }
        }
        return c
      }),
    )
  }

  function handleDeleted(id: string) {
    setComments((prev) => {
      const filtered = prev.filter((c) => c.id !== id)
      return filtered.map((c) => ({
        ...c,
        replies: c.replies?.filter((r) => r.id !== id),
      }))
    })
    setTotal((t) => Math.max(0, t - 1))
  }

  function handleSortChange(s: 'latest' | 'hot') {
    setSort(s)
    setPage(1)
  }

  return (
    <section className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">
          Comments{total > 0 ? ` (${total.toLocaleString()})` : ''}
        </h2>
        <div className="flex gap-1">
          {(['latest', 'hot'] as const).map((s) => (
            <button
              key={s}
              onClick={() => handleSortChange(s)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors capitalize ${
                sort === s
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-muted'
              }`}
            >
              {s === 'latest' ? 'Latest' : '🔥 Hot'}
            </button>
          ))}
        </div>
      </div>

      {/* Comment input */}
      {currentUser === undefined ? null : currentUser ? (
        <div className="flex gap-2.5">
          <UserAvatar user={currentUser} size={8} />
          <div className="flex-1">
            <CommentInput onSubmit={handlePost} placeholder="Share your thoughts…" />
          </div>
        </div>
      ) : (
        <div className="rounded-lg border bg-muted/20 px-4 py-3 text-sm text-muted-foreground">
          <Link href="/login" className="font-medium text-primary hover:underline">
            Log in
          </Link>{' '}
          to leave a comment.
        </div>
      )}

      <Separator />

      {/* Comments list */}
      {loading ? (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="flex gap-2.5">
              <div className="h-8 w-8 animate-pulse rounded-full bg-muted" />
              <div className="flex-1 space-y-1.5">
                <div className="h-3 w-24 animate-pulse rounded bg-muted" />
                <div className="h-4 w-full animate-pulse rounded bg-muted" />
                <div className="h-4 w-3/4 animate-pulse rounded bg-muted" />
              </div>
            </div>
          ))}
        </div>
      ) : error ? (
        <p className="text-sm text-destructive">{error}</p>
      ) : comments.length === 0 ? (
        <div className="py-10 text-center text-muted-foreground">
          <p>No comments yet.</p>
          <p className="mt-1 text-sm">Be the first to share your thoughts!</p>
        </div>
      ) : (
        <div className="space-y-5">
          {comments.map((comment) => (
            <CommentItem
              key={comment.id}
              comment={comment}
              songId={songId}
              currentUserId={currentUser?.id}
              depth={0}
              onReplyPosted={handleReplyPosted}
              onDeleted={handleDeleted}
            />
          ))}
        </div>
      )}

      {/* Pagination */}
      {pages > 1 && (
        <div className="flex items-center justify-center gap-3 pt-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
          >
            ←
          </Button>
          <span className="text-sm text-muted-foreground">
            {page} / {pages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.min(pages, p + 1))}
            disabled={page >= pages}
          >
            →
          </Button>
        </div>
      )}
    </section>
  )
}
