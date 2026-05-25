import { expect, test } from '@playwright/test'

test.describe('Comments API security', () => {
  test('POST /api/comments blocked without CSRF header', async ({ page }) => {
    await page.goto('/login')
    const cookies = await page.context().cookies()
    const csrf = cookies.find((c) => c.name === 'csrf_token')?.value
    expect(csrf).toBeTruthy()

    const res = await page.request.post('/api/comments', {
      data: {
        songId: '550e8400-e29b-41d4-a716-446655440000',
        content: 'test comment',
      },
      headers: { Cookie: `csrf_token=${csrf}` },
    })
    expect(res.status()).toBe(403)
  })
})
