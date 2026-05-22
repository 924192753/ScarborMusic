import type { Metadata, Viewport } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'

import './globals.css'

const geistSans = Geist({
  variable: '--font-sans',
  subsets: ['latin'],
  display: 'swap',
})

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
  display: 'swap',
})

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'),
  title: {
    default: 'ScarborMusic — Discover & Share Music',
    template: '%s | ScarborMusic',
  },
  description:
    'ScarborMusic is a professional music streaming platform. Discover, upload, and share your favorite songs.',
  keywords: ['music', 'streaming', 'songs', 'artists', 'playlists', 'ScarborMusic'],
  authors: [{ name: 'ScarborMusic' }],
  creator: 'ScarborMusic',
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: '/',
    siteName: 'ScarborMusic',
    title: 'ScarborMusic — Discover & Share Music',
    description:
      'ScarborMusic is a professional music streaming platform. Discover, upload, and share your favorite songs.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'ScarborMusic — Discover & Share Music',
    description:
      'ScarborMusic is a professional music streaming platform. Discover, upload, and share your favorite songs.',
    creator: '@scarbormusic',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
}

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#1a1a2e' },
  ],
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>{children}</body>
    </html>
  )
}
