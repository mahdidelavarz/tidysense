import { expect, test } from '@playwright/test'

const origin = 'http://127.0.0.1:5174'

test('the privacy notice is readable before signing in and from the account menu', async ({ page }) => {
  // Signed out: the notice is one link away from the login form and states what the backend is configured to do.
  await page.goto('/login')
  await page.getByRole('link', { name: 'حریم خصوصی و داده‌ها' }).click()
  await expect(page).toHaveURL(/\/privacy$/)
  await expect(page.getByRole('heading', { name: 'حریم خصوصی و داده‌ها' })).toBeVisible()
  await expect(page.getByText(/۳۰ روز پس از پایان پیش‌نویس/)).toBeVisible()
  await expect(page.getByText(/۱۸۰ روز پس از بسته‌شدن/)).toBeVisible()
  // The isolated backend runs on the samples (see auth-e2e.ps1), and the notice says so instead of naming a provider.
  await expect(page.getByText('در این نسخه هیچ متنی برای سرویس هوش مصنوعی بیرونی فرستاده نمی‌شود.')).toBeVisible()
  const erasure = page.getByRole('region', { name: 'حذف حساب و داده‌ها' })
  await expect(erasure.getByText('support@tidysense.test')).toBeVisible()
  await expect(erasure.getByText(/حداکثر تا ۳۰ روز بعد از بین می‌روند/)).toBeVisible()
  await page.getByRole('link', { name: 'بازگشت به ورود' }).click()
  await expect(page).toHaveURL(/\/login$/)

  // Signed in: the same page inside the application frame, reached from the account menu.
  const session = await page.request.post('/api/v1/dev/test-session', { data: {}, headers: { Origin: origin } })
  expect(session.ok()).toBeTruthy()
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/today')
  await page.getByRole('button', { name: 'حساب کاربری' }).click()
  await page.getByRole('link', { name: 'حریم خصوصی و داده‌ها' }).click()
  await expect(page).toHaveURL(/\/privacy$/)
  await expect(page.getByRole('navigation', { name: 'ناوبری اصلی' })).toBeVisible()
  await expect(page.getByRole('region', { name: 'هوش مصنوعی' })).toBeVisible()
  await page.screenshot({ path: 'test-results/ui-desktop-privacy.png', fullPage: true })

  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/privacy')
  await expect(page.getByRole('heading', { name: 'حریم خصوصی و داده‌ها' })).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
})
