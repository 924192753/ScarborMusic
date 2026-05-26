'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

import { cn } from '@/lib/utils'

const NAV_ITEMS = [
  { href: '/admin/dashboard', label: 'Dashboard', icon: '📊' },
  { href: '/admin/users', label: 'Users', icon: '👥' },
  { href: '/admin/songs', label: 'Songs', icon: '🎵' },
  { href: '/admin/comments', label: 'Comments', icon: '💬' },
  { href: '/admin/categories', label: 'Categories', icon: '📁' },
  { href: '/admin/tags', label: 'Tags', icon: '🏷️' },
  { href: '/admin/playlists', label: 'Playlists', icon: '📋' },
] as const

export function AdminSidebar() {
  const pathname = usePathname()

  return (
    <aside className="flex w-56 shrink-0 flex-col border-r border-border bg-card">
      <div className="border-b border-border px-4 py-5">
        <Link href="/admin/dashboard" className="text-lg font-bold text-primary">
          ScarborMusic
        </Link>
        <p className="mt-0.5 text-xs text-muted-foreground">Admin Console</p>
      </div>
      <nav className="flex-1 space-y-0.5 p-3">
        {NAV_ITEMS.map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`)
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                active
                  ? 'bg-primary/15 text-primary'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground',
              )}
            >
              <span aria-hidden>{item.icon}</span>
              {item.label}
            </Link>
          )
        })}
      </nav>
      <div className="border-t border-border p-3">
        <Link
          href="/"
          className="block rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          ← Back to Site
        </Link>
      </div>
    </aside>
  )
}
