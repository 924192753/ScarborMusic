// ─── Enums ────────────────────────────────────────────────────────────────────

export type UserRole = 'USER' | 'ADMIN'
export type SongStatus = 'PENDING' | 'PUBLISHED' | 'BANNED'
export type PlayMode = 'normal' | 'shuffle' | 'repeat_one' | 'repeat_all'
export type FavoriteType = 'song' | 'playlist'
export type VerificationCodeType = 'register' | 'reset_password'

// ─── User ─────────────────────────────────────────────────────────────────────

export interface User {
  id: string
  username: string
  email: string
  avatarUrl: string | null
  role: UserRole
  emailVerified: boolean
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface AuthUser extends User {
  accessToken: string
}

// ─── Category ─────────────────────────────────────────────────────────────────

export interface Category {
  id: number
  name: string
  slug: string
  description: string | null
  coverUrl: string | null
  sortOrder: number
}

// ─── Tag ──────────────────────────────────────────────────────────────────────

export interface Tag {
  id: number
  name: string
  slug: string
}

// ─── Song ─────────────────────────────────────────────────────────────────────

export interface Song {
  id: string
  title: string
  artist: string
  album: string | null
  duration: number
  audioUrl: string
  coverUrl: string | null
  categoryId: number | null
  category: Category | null
  tags: Tag[]
  uploaderId: string
  uploader: Pick<User, 'id' | 'username' | 'avatarUrl'>
  playCount: number
  status: SongStatus
  lyrics: string | null
  fileSize: number | null
  bitrate: number | null
  createdAt: string
  updatedAt: string
}

// ─── Playlist ─────────────────────────────────────────────────────────────────

export interface Playlist {
  id: string
  name: string
  description: string | null
  coverUrl: string | null
  userId: string
  user: Pick<User, 'id' | 'username' | 'avatarUrl'>
  isPublic: boolean
  shareToken: string | null
  songCount: number
  playCount: number
  createdAt: string
  updatedAt: string
}

export interface PlaylistWithSongs extends Playlist {
  songs: Song[]
}

// ─── Comment ──────────────────────────────────────────────────────────────────

export interface Comment {
  id: string
  content: string
  userId: string
  user: Pick<User, 'id' | 'username' | 'avatarUrl'>
  songId: string
  parentId: string | null
  likeCount: number
  isHidden: boolean
  isLiked?: boolean
  replies?: Comment[]
  createdAt: string
}

// ─── API Response ─────────────────────────────────────────────────────────────

export interface ApiResponse<T = unknown> {
  code: number
  message: string
  data: T
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number
    pageSize: number
    total: number
    totalPages: number
  }
}

// ─── Search ───────────────────────────────────────────────────────────────────

export type SearchType = 'song' | 'artist' | 'album' | 'tag'

export interface SearchResults {
  songs: Song[]
  artists: string[]
  albums: string[]
  tags: Tag[]
}

// ─── Chart ────────────────────────────────────────────────────────────────────

export interface ChartSong extends Song {
  rank: number
  trend: 'up' | 'down' | 'stable' | 'new'
}

// ─── Upload ───────────────────────────────────────────────────────────────────

export interface PresignedUrlResponse {
  url: string
  key: string
  publicUrl: string
}

// ─── Player Store ─────────────────────────────────────────────────────────────

export interface PlayerState {
  currentSong: Song | null
  queue: Song[]
  originalQueue: Song[]
  currentIndex: number
  isPlaying: boolean
  mode: PlayMode
  volume: number
  isMuted: boolean
  speed: number
  currentTime: number
  duration: number
}
