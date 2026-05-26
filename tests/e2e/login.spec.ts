import { expect, test } from '@playwright/test'

const hasMysql = process.env.E2E_MYSQL === '1'

test.describe('Login', () => {
  test('login page renders form', async ({ page }) => {
    await page.goto('/login')
    await expect(page.locator('input[type="email"]')).toBeVisible()
    await expect(page.locator('input[type="password"]')).toBeVisible()
  })

  test('rejects invalid credentials via API', async ({ page }) => {
    test.skip(!hasMysql, 'MySQL not available')

    const res = await page.request.post('/api/auth/login', {
      data: { email: 'nonexistent@test.com', password: 'WrongPass123!' },
    })
    expect([401, 429]).toContain(res.status())
    const body = await res.json()
    expect(body.success).toBe(false)
  })
})
