import { expect, test } from '@playwright/test'

import { apiHeaders, ensureCsrfCookie } from './helpers'

const hasMysql = process.env.E2E_MYSQL === '1'

test.describe('Register', () => {
  test('register page renders', async ({ page }) => {
    await page.goto('/register')
    await expect(page.locator('input[type="email"]')).toBeVisible()
  })

  test('send-code requires CSRF token', async ({ page }) => {
    await page.goto('/login')
    const cookies = await page.context().cookies()
    const csrf = cookies.find((c) => c.name === 'csrf_token')?.value ?? 'token'

    const blocked = await page.request.post('/api/auth/send-code', {
      data: { email: 'csrf-test@test.local', type: 'register' },
      headers: { Cookie: `csrf_token=${csrf}` },
    })
    expect(blocked.status()).toBe(403)
  })

  test('send-code succeeds with CSRF when services available', async ({ page }) => {
    test.skip(!hasMysql, 'MySQL not available')

    const csrf = await ensureCsrfCookie(page)
    const email = `e2e-${Date.now()}@test.local`

    const res = await page.request.post('/api/auth/send-code', {
      data: { email, type: 'register' },
      headers: {
        ...apiHeaders(csrf),
        Cookie: `csrf_token=${csrf}`,
      },
    })
    const body = await res.json()
    expect(body.success).toBe(true)
  })
})
