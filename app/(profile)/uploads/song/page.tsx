'use client'

import { useEffect, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'

import { useRouter } from 'next/navigation'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'

// Manual form type to avoid Zod default() conflicts with react-hook-form
interface SongFormData {
  title: string
  artistName: string
  albumName?: string
  description?: string
  lyrics?: string
  duration?: number
  status: 'DRAFT' | 'PUBLISHED' | 'HIDDEN'
  categoryId?: number
  tagIds: number[]
}

interface UploadedFileRef {
  id: string
  url: string
  name: string
}

interface Category {
  id: number
  name: string
}
interface Tag {
  id: number
  name: string
}

// ─── File Upload Hook ─────────────────────────────────────────────────────────

type UploadStatus = 'idle' | 'preparing' | 'uploading' | 'done' | 'error'

function useS3Upload(fileType: 'image' | 'audio') {
  const [status, setStatus] = useState<UploadStatus>('idle')
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<UploadedFileRef | null>(null)

  const upload = async (file: File): Promise<UploadedFileRef | null> => {
    setStatus('preparing')
    setProgress(5)
    setError(null)
    setResult(null)

    try {
      const presignedRes = await fetch('/api/upload/presigned-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filename: file.name,
          contentType: file.type,
          fileSize: file.size,
          fileType,
        }),
      })
      const presigned = await presignedRes.json()
      if (!presigned.success) throw new Error(presigned.message)

      const { uploadUrl, objectKey } = presigned.data
      setStatus('uploading')
      setProgress(10)

      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest()
        xhr.upload.addEventListener('progress', (e) => {
          if (e.lengthComputable) setProgress(10 + Math.round((e.loaded / e.total) * 80))
        })
        xhr.addEventListener('load', () =>
          xhr.status < 300 ? resolve() : reject(new Error(`HTTP ${xhr.status}`)),
        )
        xhr.addEventListener('error', () => reject(new Error('Upload failed')))
        xhr.open('PUT', uploadUrl)
        xhr.setRequestHeader('Content-Type', file.type)
        xhr.send(file)
      })

      setProgress(92)
      const confirmRes = await fetch('/api/upload/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ objectKey, fileName: file.name, mimeType: file.type, fileType }),
      })
      const confirm = await confirmRes.json()
      if (!confirm.success) throw new Error(confirm.message)

      setProgress(100)
      setStatus('done')
      const ref: UploadedFileRef = { id: confirm.data.id, url: confirm.data.url, name: file.name }
      setResult(ref)
      return ref
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Upload failed'
      setError(msg)
      setStatus('error')
      return null
    }
  }

  const reset = () => {
    setStatus('idle')
    setProgress(0)
    setError(null)
    setResult(null)
  }

  return { status, progress, error, result, upload, reset }
}

// ─── File Upload Field ────────────────────────────────────────────────────────

function FileField({
  label,
  accept,
  required,
  onUploaded,
  uploader,
}: {
  label: string
  accept: string
  required?: boolean
  onUploaded: (ref: UploadedFileRef | null) => void
  uploader: ReturnType<typeof useS3Upload>
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const { status, progress, error, result, upload, reset } = uploader

  const handleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const ref = await upload(file)
    onUploaded(ref)
  }

  if (status === 'done' && result) {
    return (
      <div className="rounded-lg border border-green-500/30 bg-green-500/8 px-3 py-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 16 16"
              fill="currentColor"
              className="h-4 w-4 text-green-500"
            >
              <path
                fillRule="evenodd"
                d="M8 15A7 7 0 108 1a7 7 0 000 14zm3.844-8.791a.75.75 0 00-1.188-.918l-3.7 4.79-1.649-1.833a.75.75 0 10-1.114 1.004l2.25 2.5a.75.75 0 001.15-.043l4.25-5.5z"
                clipRule="evenodd"
              />
            </svg>
            <span className="font-medium text-green-700 dark:text-green-400">{result.name}</span>
          </div>
          <button
            type="button"
            onClick={() => {
              reset()
              onUploaded(null)
            }}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            Change
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-1.5">
      <div
        role="button"
        tabIndex={0}
        className={`flex cursor-pointer items-center justify-center gap-2 rounded-lg border-2 border-dashed px-4 py-5 text-sm transition-colors ${status === 'idle' || status === 'error' ? 'hover:border-primary/50 hover:bg-muted/20' : 'pointer-events-none opacity-60'} border-border`}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => e.key === 'Enter' && inputRef.current?.click()}
      >
        {status === 'idle' || status === 'error' ? (
          <>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
              className="h-5 w-5 text-muted-foreground"
            >
              <path d="M9.25 13.25a.75.75 0 001.5 0V4.636l2.955 3.129a.75.75 0 001.09-1.03l-4.25-4.5a.75.75 0 00-1.09 0l-4.25 4.5a.75.75 0 101.09 1.03L9.25 4.636v8.614z" />
              <path d="M3.5 12.75a.75.75 0 00-1.5 0v2.5A2.75 2.75 0 004.75 18h10.5A2.75 2.75 0 0018 15.25v-2.5a.75.75 0 00-1.5 0v2.5c0 .69-.56 1.25-1.25 1.25H4.75c-.69 0-1.25-.56-1.25-1.25v-2.5z" />
            </svg>
            <span className="text-muted-foreground">
              Choose {label.toLowerCase()} {required ? '' : '(optional)'}
            </span>
          </>
        ) : (
          <div className="w-full space-y-1">
            <Progress value={progress} className="h-1.5" />
            <p className="text-center text-xs text-muted-foreground">
              {status === 'preparing'
                ? 'Preparing…'
                : status === 'uploading'
                  ? `${progress}%`
                  : 'Confirming…'}
            </p>
          </div>
        )}
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="sr-only"
        onChange={handleChange}
      />
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function UploadSongPage() {
  const router = useRouter()
  const [serverError, setServerError] = useState<string | null>(null)
  const [audioFileId, setAudioFileId] = useState<string | null>(null)
  const [coverFileId, setCoverFileId] = useState<string | null>(null)
  const [categories, setCategories] = useState<Category[]>([])
  const [tags, setTags] = useState<Tag[]>([])
  const [selectedTags, setSelectedTags] = useState<number[]>([])

  const audioUploader = useS3Upload('audio')
  const coverUploader = useS3Upload('image')

  // Load categories and tags
  useEffect(() => {
    Promise.all([
      fetch('/api/categories').then((r) => r.json()),
      fetch('/api/tags').then((r) => r.json()),
    ])
      .then(([cats, tgs]) => {
        if (cats.success) setCategories(cats.data)
        if (tgs.success) setTags(tgs.data)
      })
      .catch(console.error)
  }, [])

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<SongFormData>({
    defaultValues: { status: 'PUBLISHED', tagIds: [] },
  })

  const toggleTag = (tagId: number) => {
    setSelectedTags((prev) => {
      const next = prev.includes(tagId) ? prev.filter((t) => t !== tagId) : [...prev, tagId]
      setValue('tagIds', next)
      return next
    })
  }

  const onSubmit = async (data: SongFormData) => {
    setServerError(null)
    if (!audioFileId) {
      setServerError('Please upload an audio file first')
      return
    }

    try {
      const res = await fetch('/api/songs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, audioFileId, coverFileId: coverFileId ?? undefined }),
      })
      const json = await res.json()
      if (!json.success) {
        setServerError(json.message)
        return
      }
      router.push(`/song/${json.data.id}`)
    } catch {
      setServerError('Failed to create song. Please try again.')
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6 px-4 py-8">
      <div>
        <h1 className="text-2xl font-bold">Upload Song</h1>
        <p className="mt-1 text-sm text-muted-foreground">Share your music with the world</p>
      </div>

      <Separator />

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6" noValidate>
        {serverError && (
          <div
            role="alert"
            className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
          >
            {serverError}
          </div>
        )}

        {/* Audio Upload */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Audio File *</CardTitle>
            <CardDescription>MP3, WAV, FLAC, or AAC · Max 50 MB</CardDescription>
          </CardHeader>
          <CardContent>
            <FileField
              label="Audio file"
              accept="audio/mpeg,audio/mp3,audio/wav,audio/flac,audio/aac"
              required
              uploader={audioUploader}
              onUploaded={(ref) => setAudioFileId(ref?.id ?? null)}
            />
          </CardContent>
        </Card>

        {/* Cover Image Upload */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Cover Image</CardTitle>
            <CardDescription>JPG, PNG, or WebP · Max 5 MB · Optional</CardDescription>
          </CardHeader>
          <CardContent>
            <FileField
              label="Cover image"
              accept="image/jpeg,image/png,image/webp"
              uploader={coverUploader}
              onUploaded={(ref) => setCoverFileId(ref?.id ?? null)}
            />
          </CardContent>
        </Card>

        {/* Song Metadata */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Song Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Title */}
            <div className="space-y-1.5">
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                placeholder="Song title"
                {...register('title')}
                aria-invalid={!!errors.title}
              />
              {errors.title && <p className="text-xs text-destructive">{errors.title.message}</p>}
            </div>

            {/* Artist */}
            <div className="space-y-1.5">
              <Label htmlFor="artistName">Artist *</Label>
              <Input
                id="artistName"
                placeholder="Artist name"
                {...register('artistName')}
                aria-invalid={!!errors.artistName}
              />
              {errors.artistName && (
                <p className="text-xs text-destructive">{errors.artistName.message}</p>
              )}
            </div>

            {/* Album */}
            <div className="space-y-1.5">
              <Label htmlFor="albumName">Album</Label>
              <Input
                id="albumName"
                placeholder="Album name (optional)"
                {...register('albumName')}
              />
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <Label htmlFor="description">Description</Label>
              <textarea
                id="description"
                placeholder="Tell listeners about this song…"
                rows={3}
                className="flex min-h-[80px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                {...register('description')}
              />
            </div>

            {/* Category */}
            <div className="space-y-1.5">
              <Label htmlFor="categoryId">Category</Label>
              <Select onValueChange={(v) => setValue('categoryId', Number(v))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={String(cat.id)}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Tags */}
            <div className="space-y-1.5">
              <Label>Tags</Label>
              <div className="flex flex-wrap gap-2">
                {tags.map((tag) => (
                  <button
                    key={tag.id}
                    type="button"
                    onClick={() => toggleTag(tag.id)}
                    className={`rounded-full border px-3 py-0.5 text-sm transition-colors ${
                      selectedTags.includes(tag.id)
                        ? 'border-primary bg-primary text-primary-foreground'
                        : 'border-border text-muted-foreground hover:border-primary/50'
                    }`}
                  >
                    #{tag.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Status */}
            <div className="space-y-1.5">
              <Label htmlFor="status">Visibility</Label>
              <Select
                defaultValue="PUBLISHED"
                onValueChange={(v) => setValue('status', v as 'DRAFT' | 'PUBLISHED' | 'HIDDEN')}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PUBLISHED">Public</SelectItem>
                  <SelectItem value="DRAFT">Draft</SelectItem>
                  <SelectItem value="HIDDEN">Hidden</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Button type="submit" className="w-full" disabled={isSubmitting || !audioFileId}>
          {isSubmitting ? (
            <span className="flex items-center gap-2">
              <svg
                className="h-4 w-4 animate-spin"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                />
              </svg>
              Creating song…
            </span>
          ) : (
            'Create Song'
          )}
        </Button>
      </form>
    </div>
  )
}
