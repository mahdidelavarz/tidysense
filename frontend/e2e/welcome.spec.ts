import { expect, test } from '@playwright/test'

const phone = { width: 390, height: 844 }

test('a first visit on a phone sees the welcome and the guides once, then goes to sign-in', async ({ page }) => {
  await page.setViewportSize(phone)
  await page.goto('/today')
  await expect(page).toHaveURL(/\/welcome$/)
  await page.getByRole('button', { name: 'شروع' }).click()

  await expect(page.getByRole('heading', { name: 'از یک جمله، تا یک برنامه‌ی کامل' })).toBeVisible()
  await page.getByRole('button', { name: 'بعدی' }).click()
  await expect(page.getByRole('heading', { name: 'هر فکری، همان لحظه یک کار' })).toBeVisible()
  await page.getByRole('button', { name: 'قبلی' }).click()
  await expect(page.getByRole('heading', { name: 'از یک جمله، تا یک برنامه‌ی کامل' })).toBeVisible()
  await page.getByRole('button', { name: 'بعدی' }).click()
  await page.getByRole('button', { name: 'بعدی' }).click()
  await expect(page.getByRole('heading', { name: 'کار مانده، دوباره در برنامه' })).toBeVisible()
  await page.screenshot({ path: 'test-results/step-17-guide-3.png' })
  await page.getByRole('button', { name: 'شروع کنیم' }).click()
  await expect(page).toHaveURL(/\/login$/)

  // The mark is on this device; the second visit goes straight to sign-in.
  await page.goto('/today')
  await expect(page).toHaveURL(/\/login$/)
  await expect(page.getByRole('heading', { name: 'ورود یا ثبت‌نام' })).toBeVisible()
})

test('skipping the guides also counts as seen, and desktop never shows them', async ({ page, browser }) => {
  await page.setViewportSize(phone)
  await page.goto('/login')
  await expect(page).toHaveURL(/\/welcome$/)
  await page.getByRole('button', { name: 'شروع' }).click()
  await page.getByRole('button', { name: 'رد شدن' }).click()
  await expect(page).toHaveURL(/\/login$/)
  await page.goto('/welcome')
  await expect(page.getByRole('button', { name: 'شروع' })).toBeVisible()

  const desktop = await browser.newContext({ baseURL: 'http://127.0.0.1:5174', viewport: { width: 1440, height: 900 } })
  const fresh = await desktop.newPage()
  await fresh.goto('/today')
  await expect(fresh).toHaveURL(/\/login$/)
  await desktop.close()
})
