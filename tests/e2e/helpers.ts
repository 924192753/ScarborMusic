import { type Page } from '@playwright/test'

export const CSRF_COOKIE = 'csrf_token'
export const CSRF_HEADER = 'x-csrf-token'

export async function ensureCsrfCookie(page: Page): Promise<string> {
  await page.goto('/login')
  const cookies = await page.context().cookies()
  const csrf = cookies.find((c) => c.name === CSRF_COOKIE)?.value
  if (!csrf) throw new Error('CSRF cookie was not set')
  return csrf
}

export function apiHeaders(csrf: string, extra?: Record<string, string>) {
  return {
    'Content-Type': 'application/json',
    [CSRF_HEADER]: csrf,
    ...extra,
  }
}
