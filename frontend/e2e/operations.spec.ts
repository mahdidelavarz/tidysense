import { expect, test } from '@playwright/test'

const origin = 'http://127.0.0.1:5174'

// The isolated backend lists the development test account as an operator (see auth-e2e.ps1).
test('an operator reads alerts, the AI runtime and the evidence tables with their denominators', async ({ page }) => {
  const session = await page.request.post('/api/v1/dev/test-session', { data: {}, headers: { Origin: origin } })
  expect(session.ok()).toBeTruthy()
  expect((await session.json() as { isOperator: boolean }).isOperator).toBe(true)

  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/today')
  await page.getByRole('navigation', { name: 'ناوبری اصلی' }).getByRole('link', { name: 'عملیات' }).click()
  await expect(page).toHaveURL(/\/operations$/)
  await expect(page.getByRole('heading', { name: 'عملیات', exact: true })).toBeVisible()

  // Both families run on the deterministic samples here, and each is stated as such.
  const families = page.getByRole('table', { name: /وضعیت خانواده‌ها/ })
  await expect(families.getByRole('row', { name: /PLANNING/ })).toContainText('mock')
  await expect(families.getByRole('row', { name: /RECONCILE/ })).toContainText('mock')

  // Evidence is shown as counts under named columns, for the primary population and apart for internal accounts.
  const drafts = page.getByRole('table', { name: /H1\.REVIEWABLE_DRAFT/ }).first()
  await expect(drafts.getByRole('columnheader', { name: 'صورت' })).toBeVisible()
  await expect(drafts.getByRole('columnheader', { name: 'مخرج' })).toBeVisible()
  await expect(page.getByText('حساب‌های داخلی (جدا از جمعیت اصلی)')).toBeVisible()
  await expect(page.getByRole('region', { name: 'هشدارها و نگهداری' }).getByText('آخرین اجرای نگهداری')).toBeVisible()
  await page.waitForTimeout(400)
  await page.screenshot({ path: 'test-results/ui-desktop-operations.png', fullPage: true })

  // On a phone the page is reached through the drawer and never scrolls sideways.
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/today')
  await page.getByRole('button', { name: 'باز کردن منو' }).click()
  await page.getByRole('dialog', { name: 'منو' }).getByRole('link', { name: 'عملیات' }).click()
  await expect(page.getByRole('heading', { name: 'عملیات', exact: true })).toBeVisible()
  await expect(page.getByRole('table', { name: /وضعیت خانواده‌ها/ })).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
  await page.screenshot({ path: 'test-results/ui-phone-operations.png', fullPage: true })
})
