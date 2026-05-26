import { expect, test } from '@playwright/test'

import { apiHeaders, ensureCsrfCookie } from './helpers'

test.describe('Playlist API security', () => {
  test('POST /api/playlists requires auth and CSRF', async ({ page }) => {
    const csrf = await ensureCsrfCookie(page)

    const res = await page.request.post('/api/playlists', {
      data: { name: 'E2E Playlist', isPublic: true },
      headers: apiHeaders(csrf),
    })
    expect([401, 403]).toContain(res.status())
  })

  test('playlists page redirects unauthenticated users', async ({ page }) => {
    await page.goto('/playlists')
    await page.waitForURL(/\/login/)
    expect(page.url()).toContain('/login')
  })
})
