import { expect, test } from '@playwright/test'

import { apiHeaders, ensureCsrfCookie } from './helpers'

test.describe('Favorites API security', () => {
  test('POST /api/favorites requires auth and CSRF', async ({ page }) => {
    const csrf = await ensureCsrfCookie(page)

    const res = await page.request.post('/api/favorites', {
      data: { songId: '550e8400-e29b-41d4-a716-446655440000' },
      headers: apiHeaders(csrf),
    })
    expect([401, 403]).toContain(res.status())
  })
})
