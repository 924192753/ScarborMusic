'use client'

import { useCallback, useRef, useState } from 'react'

import type { Metadata } from 'next'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  ALLOWED_AUDIO_TYPES,
  ALLOWED_IMAGE_TYPES,
  MAX_AUDIO_SIZE,
  MAX_IMAGE_SIZE,
} from '@/lib/upload'

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const _metadata: Metadata = { title: 'Upload Files' }

type FileCategory = 'image' | 'audio'

interface UploadState {
  file: File | null
  progress: number
  status: 'idle' | 'preparing' | 'uploading' | 'confirming' | 'success' | 'error'
  message: string
  resultUrl: string | null
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

// ─── File Type Icon ───────────────────────────────────────────────────────────

function FileIcon({
  category,
  className = 'h-8 w-8',
}: {
  category: FileCategory
  className?: string
}) {
  if (category === 'image') {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        className={className}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z"
        />
      </svg>
    )
  }
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      className={className}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9 9l10.5-3m0 6.553v3.75a2.25 2.25 0 01-1.632 2.163l-1.32.377a1.803 1.803 0 11-.99-3.467l2.31-.66a2.25 2.25 0 001.632-2.163zm0 0V2.25L9 5.25v10.303m0 0v3.75a2.25 2.25 0 01-1.632 2.163l-1.32.377a1.803 1.803 0 01-.99-3.467l2.31-.66A2.25 2.25 0 009 15.553z"
      />
    </svg>
  )
}

// ─── Upload Zone ──────────────────────────────────────────────────────────────

function UploadZone({
  category,
  state,
  onFileSelect,
  onUpload,
  onReset,
}: {
  category: FileCategory
  state: UploadState
  onFileSelect: (file: File) => void
  onUpload: () => void
  onReset: () => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [isDragging, setIsDragging] = useState(false)

  const accept =
    category === 'image' ? ALLOWED_IMAGE_TYPES.join(',') : ALLOWED_AUDIO_TYPES.join(',')

  const maxSize = category === 'image' ? MAX_IMAGE_SIZE : MAX_AUDIO_SIZE
  const isImage = category === 'image'

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragging(false)
      const file = e.dataTransfer.files[0]
      if (file) onFileSelect(file)
    },
    [onFileSelect],
  )

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) onFileSelect(file)
  }

  const isActive = state.status !== 'idle'
  const isSuccess = state.status === 'success'
  const isError = state.status === 'error'
  const isLoading = ['preparing', 'uploading', 'confirming'].includes(state.status)

  return (
    <div className="space-y-4">
      {/* Drop zone */}
      {!isActive && (
        <div
          role="button"
          tabIndex={0}
          className={`flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed p-12 transition-colors ${
            isDragging
              ? 'border-primary bg-primary/5'
              : 'border-border hover:border-primary/50 hover:bg-muted/30'
          }`}
          onDragOver={(e) => {
            e.preventDefault()
            setIsDragging(true)
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
          onKeyDown={(e) => e.key === 'Enter' && inputRef.current?.click()}
        >
          <div className="rounded-full bg-muted p-4">
            <FileIcon category={category} className="h-8 w-8 text-muted-foreground" />
          </div>
          <div className="text-center">
            <p className="font-medium">
              Drop your {isImage ? 'image' : 'audio'} here, or{' '}
              <span className="text-primary">browse</span>
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {isImage ? 'JPG, PNG, WebP' : 'MP3, WAV, FLAC, AAC'} · Max {formatBytes(maxSize)}
            </p>
          </div>
          <input
            ref={inputRef}
            type="file"
            accept={accept}
            className="sr-only"
            onChange={handleChange}
          />
        </div>
      )}

      {/* Selected file info */}
      {state.file && (
        <div className="rounded-lg border bg-muted/30 p-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <div className="shrink-0 rounded-md bg-primary/10 p-2">
                <FileIcon category={category} className="h-5 w-5 text-primary" />
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{state.file.name}</p>
                <p className="text-xs text-muted-foreground">
                  {formatBytes(state.file.size)} · {state.file.type}
                </p>
              </div>
            </div>
            {!isLoading && (
              <Button variant="ghost" size="sm" onClick={onReset} className="shrink-0">
                Remove
              </Button>
            )}
          </div>

          {/* Progress bar */}
          {isLoading && (
            <div className="mt-3 space-y-1.5">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>
                  {state.status === 'preparing'
                    ? 'Preparing…'
                    : state.status === 'uploading'
                      ? `Uploading… ${state.progress}%`
                      : 'Confirming…'}
                </span>
                <span>{state.progress}%</span>
              </div>
              <Progress value={state.progress} className="h-1.5" />
            </div>
          )}
        </div>
      )}

      {/* Status messages */}
      {isSuccess && state.resultUrl && (
        <div className="rounded-lg border border-green-500/30 bg-green-500/10 p-4">
          <div className="flex items-center gap-2">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
              className="h-5 w-5 text-green-500"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z"
                clipRule="evenodd"
              />
            </svg>
            <p className="text-sm font-medium text-green-700 dark:text-green-400">
              {state.message}
            </p>
          </div>
          <p className="mt-2 break-all text-xs text-muted-foreground">URL: {state.resultUrl}</p>
          <Button variant="outline" size="sm" className="mt-3" onClick={onReset}>
            Upload another
          </Button>
        </div>
      )}

      {isError && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-4">
          <div className="flex items-center gap-2">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
              className="h-5 w-5 text-destructive"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z"
                clipRule="evenodd"
              />
            </svg>
            <p className="text-sm font-medium text-destructive">{state.message}</p>
          </div>
          <Button variant="outline" size="sm" className="mt-3" onClick={onReset}>
            Try again
          </Button>
        </div>
      )}

      {/* Upload button */}
      {state.file && !isActive && (
        <Button className="w-full" onClick={onUpload}>
          Upload {isImage ? 'Image' : 'Audio'}
        </Button>
      )}

      {isLoading && (
        <Button className="w-full" disabled>
          <svg
            className="mr-2 h-4 w-4 animate-spin"
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
          {state.status === 'uploading' ? `${state.progress}%` : 'Processing…'}
        </Button>
      )}
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

const INITIAL_STATE: UploadState = {
  file: null,
  progress: 0,
  status: 'idle',
  message: '',
  resultUrl: null,
}

function useFileUpload(category: FileCategory) {
  const [state, setState] = useState<UploadState>(INITIAL_STATE)

  const setFile = useCallback(
    (file: File) => {
      const maxSize = category === 'image' ? MAX_IMAGE_SIZE : MAX_AUDIO_SIZE
      const allowed = category === 'image' ? ALLOWED_IMAGE_TYPES : ALLOWED_AUDIO_TYPES

      if (file.size > maxSize) {
        setState({
          ...INITIAL_STATE,
          file,
          status: 'error',
          message: `File too large. Max size is ${formatBytes(maxSize)}.`,
        })
        return
      }

      const normalizedType = file.type.replace('audio/mp3', 'audio/mpeg')
      if (
        !(allowed as readonly string[]).includes(normalizedType) &&
        !(allowed as readonly string[]).includes(file.type)
      ) {
        setState({
          ...INITIAL_STATE,
          file,
          status: 'error',
          message: `File type "${file.type}" is not allowed for ${category} uploads.`,
        })
        return
      }

      setState({ ...INITIAL_STATE, file })
    },
    [category],
  )

  const upload = useCallback(async () => {
    if (!state.file) return
    const file = state.file

    setState((s) => ({ ...s, status: 'preparing', progress: 5, message: '' }))

    try {
      // Step 1: Get presigned URL
      const presignedRes = await fetch('/api/upload/presigned-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filename: file.name,
          contentType: file.type,
          fileSize: file.size,
          fileType: category,
        }),
      })
      const presigned = await presignedRes.json()
      if (!presigned.success) {
        setState((s) => ({ ...s, status: 'error', message: presigned.message }))
        return
      }

      const { uploadUrl, objectKey } = presigned.data
      setState((s) => ({ ...s, progress: 10 }))

      // Step 2: Upload to MinIO via presigned URL with progress tracking
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest()
        xhr.upload.addEventListener('progress', (e) => {
          if (e.lengthComputable) {
            const pct = 10 + Math.round((e.loaded / e.total) * 80)
            setState((s) => ({ ...s, progress: pct, status: 'uploading' }))
          }
        })
        xhr.addEventListener('load', () => {
          if (xhr.status >= 200 && xhr.status < 300) resolve()
          else reject(new Error(`Upload failed: HTTP ${xhr.status}`))
        })
        xhr.addEventListener('error', () => reject(new Error('Upload failed: network error')))
        xhr.open('PUT', uploadUrl)
        xhr.setRequestHeader('Content-Type', file.type)
        xhr.send(file)
      })

      setState((s) => ({ ...s, progress: 92, status: 'confirming' }))

      // Step 3: Confirm upload
      const confirmRes = await fetch('/api/upload/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          objectKey,
          fileName: file.name,
          mimeType: file.type,
          fileType: category,
        }),
      })
      const confirm = await confirmRes.json()
      if (!confirm.success) {
        setState((s) => ({ ...s, status: 'error', message: confirm.message }))
        return
      }

      setState((s) => ({
        ...s,
        progress: 100,
        status: 'success',
        message: `${category === 'image' ? 'Image' : 'Audio'} uploaded successfully!`,
        resultUrl: confirm.data.url,
      }))
    } catch (err) {
      setState((s) => ({
        ...s,
        status: 'error',
        message: err instanceof Error ? err.message : 'Upload failed. Please try again.',
      }))
    }
  }, [state.file, category])

  const reset = useCallback(() => setState(INITIAL_STATE), [])

  return { state, setFile, upload, reset }
}

export default function UploadsPage() {
  const image = useFileUpload('image')
  const audio = useFileUpload('audio')

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Upload Files</h1>
        <p className="mt-1 text-muted-foreground">
          Upload images and audio files to ScarborMusic. Files are stored securely and validated.
        </p>
      </div>

      <Separator />

      {/* File Type Badges */}
      <div className="flex flex-wrap gap-2">
        <span className="text-sm font-medium text-muted-foreground">Allowed types:</span>
        {['JPG', 'PNG', 'WebP'].map((t) => (
          <Badge key={t} variant="secondary">
            {t}
          </Badge>
        ))}
        <span className="text-sm text-muted-foreground">|</span>
        {['MP3', 'WAV', 'FLAC', 'AAC'].map((t) => (
          <Badge key={t} variant="secondary">
            {t}
          </Badge>
        ))}
      </div>

      <Tabs defaultValue="image" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="image">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
              className="mr-1.5 h-4 w-4"
            >
              <path
                fillRule="evenodd"
                d="M1 5.25A2.25 2.25 0 013.25 3h13.5A2.25 2.25 0 0119 5.25v9.5A2.25 2.25 0 0116.75 17H3.25A2.25 2.25 0 011 14.75v-9.5zm1.5 5.81v3.69c0 .414.336.75.75.75h13.5a.75.75 0 00.75-.75v-2.69l-2.22-2.219a.75.75 0 00-1.06 0l-1.91 1.909.47.47a.75.75 0 11-1.06 1.06L6.53 8.091a.75.75 0 00-1.06 0l-3 3v-.031zm9.22-5.81a.75.75 0 10-1.5 0 .75.75 0 001.5 0z"
                clipRule="evenodd"
              />
            </svg>
            Images
          </TabsTrigger>
          <TabsTrigger value="audio">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
              className="mr-1.5 h-4 w-4"
            >
              <path d="M15.75 5.25a3 3 0 013 3m-3-3A2.25 2.25 0 0013.5 7.5m2.25-2.25L13.5 7.5m-3.75-3A6 6 0 016 7.5m3.75-3A4.5 4.5 0 009.75 7.5M6 7.5a6 6 0 003.75 5.477m-6-1.477A4.5 4.5 0 005.25 16.5m0-4.5a4.5 4.5 0 014.5-4.5m-4.5 4.5A4.5 4.5 0 009.75 16.5m0 0A4.5 4.5 0 0014.25 12m-4.5 4.5v-.75m0 .75a.75.75 0 01-.75.75H6.75a.75.75 0 01-.75-.75v-3a.75.75 0 01.75-.75h2.25a.75.75 0 01.75.75v3z" />
            </svg>
            Audio
          </TabsTrigger>
        </TabsList>

        <TabsContent value="image" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Upload Image</CardTitle>
              <CardDescription>Supported formats: JPG, PNG, WebP · Max 5 MB</CardDescription>
            </CardHeader>
            <CardContent>
              <UploadZone
                category="image"
                state={image.state}
                onFileSelect={image.setFile}
                onUpload={image.upload}
                onReset={image.reset}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="audio" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Upload Audio</CardTitle>
              <CardDescription>Supported formats: MP3, WAV, FLAC, AAC · Max 50 MB</CardDescription>
            </CardHeader>
            <CardContent>
              <UploadZone
                category="audio"
                state={audio.state}
                onFileSelect={audio.setFile}
                onUpload={audio.upload}
                onReset={audio.reset}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Security notice */}
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="flex items-start gap-3 pt-5">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
            className="mt-0.5 h-5 w-5 shrink-0 text-primary"
          >
            <path
              fillRule="evenodd"
              d="M10 1a4.5 4.5 0 00-4.5 4.5V9H5a2 2 0 00-2 2v6a2 2 0 002 2h10a2 2 0 002-2v-6a2 2 0 00-2-2h-.5V5.5A4.5 4.5 0 0010 1zm3 8V5.5a3 3 0 10-6 0V9h6z"
              clipRule="evenodd"
            />
          </svg>
          <div>
            <p className="text-sm font-medium">Secure Upload</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              All files are validated on both client and server using magic number detection.
              Executable files, scripts, and unsupported formats are automatically rejected.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
