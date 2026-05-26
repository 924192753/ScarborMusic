'use client'

import { useEffect } from 'react'

import { CSRF_COOKIE_NAME, CSRF_HEADER_NAME, isCsrfExemptPath } from '@/lib/csrf'

function readCsrfCookie(): string | null {
  const match = document.cookie.match(new RegExp(`(?:^|; )${CSRF_COOKIE_NAME}=([^;]*)`))
  return match ? decodeURIComponent(match[1]) : null
}

function resolveUrl(input: RequestInfo | URL): string {
  if (typeof input === 'string') return input
  if (input instanceof URL) return input.pathname
  return input.url
}

/**
 * Patches window.fetch to attach CSRF header on unsafe /api/* requests.
 * Avoids editing individual feature modules (comments, upload, playlists, etc.).
 */
export function CsrfProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const originalFetch = window.fetch.bind(window)

    window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      const method = (init?.method ?? 'GET').toUpperCase()
      const url = resolveUrl(input)
      const pathname = url.startsWith('http') ? new URL(url).pathname : url.split('?')[0]

      if (
        ['POST', 'PATCH', 'DELETE', 'PUT'].includes(method) &&
        pathname.startsWith('/api/') &&
        !isCsrfExemptPath(pathname)
      ) {
        const token = readCsrfCookie()
        if (token) {
          const headers = new Headers(init?.headers)
          headers.set(CSRF_HEADER_NAME, token)
          init = { ...init, headers, credentials: init?.credentials ?? 'same-origin' }
        }
      }

      return originalFetch(input, init)
    }

    return () => {
      window.fetch = originalFetch
    }
  }, [])

  return <>{children}</>
}
