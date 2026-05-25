import { expect, test } from '@playwright/test'

import { apiHeaders, ensureCsrfCookie } from './helpers'

test.describe('Upload security', () => {
  test('presigned-url rejects without auth', async ({ page }) => {
    const csrf = await ensureCsrfCookie(page)

    const res = await page.request.post('/api/upload/presigned-url', {
      data: {
        filename: 'test.png',
        contentType: 'image/png',
        fileSize: 1024,
        fileType: 'image',
      },
      headers: apiHeaders(csrf),
    })
    expect([401, 403]).toContain(res.status())
  })

  test('presigned-url rejects dangerous extension without CSRF', async ({ page }) => {
    await page.goto('/login')
    const res = await page.request.post('/api/upload/presigned-url', {
      data: {
        filename: 'virus.exe',
        contentType: 'image/png',
        fileSize: 1024,
        fileType: 'image',
      },
    })
    expect([401, 403]).toContain(res.status())
  })

  test('uploads page requires login', async ({ page }) => {
    await page.goto('/uploads')
    await page.waitForURL(/\/login/)
    expect(page.url()).toContain('/login')
  })
})
