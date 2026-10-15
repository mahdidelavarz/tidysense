import { expect, type Page, test } from '@playwright/test'

const origin = 'http://127.0.0.1:5174'

async function signIn(page: Page) {
  const session = await page.request.post('/api/v1/dev/test-session', { data: {}, headers: { Origin: origin } })
  expect(session.ok()).toBeTruthy()
  expect((await session.json() as { isOperator: boolean }).isOperator).toBe(true)
}

// The isolated backend lists the development test account as an operator (see auth-e2e.ps1). A
// non-operator's 404 for every operations endpoint is covered by OperationsApiTests.
test('an operator reads system health and product insights with their denominators', async ({ page }) => {
  await signIn(page)
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/today')
  await page.getByRole('navigation', { name: 'ناوبری اصلی' }).getByRole('link', { name: 'عملیات' }).click()
  await expect(page).toHaveURL(/\/operations$/)
  await expect(page.getByRole('heading', { name: 'عملیات', exact: true })).toBeVisible()
  await expect(page.getByRole('tab', { name: 'سلامت سیستم' })).toHaveAttribute('aria-selected', 'true')

  // Both families run on the deterministic samples here, and each is stated as such.
  await expect(page.getByRole('region', { name: 'خانواده‌ی برنامه‌ریزی' })).toContainText('mock')
  await expect(page.getByRole('region', { name: 'خانواده‌ی بازبینی' })).toContainText('mock')

  // Evidence is shown as counts with denominators, for the primary population and apart for internal accounts.
  await expect(page.getByRole('region', { name: 'H1.REVIEWABLE_DRAFT' }).first()).toContainText('flows that reached a reviewable draft / flows started')
  await expect(page.getByText('حساب‌های داخلی (جدا از جمعیت اصلی)')).toBeVisible()
  await expect(page.getByText('آخرین نگهداری')).toBeVisible()
  await page.waitForTimeout(400)
  await page.screenshot({ path: 'test-results/ui-desktop-operations.png', fullPage: true })

  // The product view: the operator account itself is internal, so it is counted apart and in no figure.
  await page.getByRole('tab', { name: 'سنجش محصول' }).click()
  await expect(page.getByRole('region', { name: 'قیف برنامه‌ریزی' })).toBeVisible()
  await expect(page.getByText(/[۱-۹][۰-۹]* حساب داخلی کنار گذاشته شده/)).toBeVisible()
  await expect(page.getByRole('region', { name: 'خلاصه' }).getByText('فعال‌سازی').locator('xpath=ancestor::div[contains(@class,"ops-tile")]'))
    .toContainText('از')
  await expect(page.getByText(/٪|%/)).toHaveCount(0)
  await page.getByRole('button', { name: '۹۰ روز' }).click()
  await expect(page.getByRole('button', { name: '۹۰ روز' })).toHaveAttribute('aria-pressed', 'true')
  await page.waitForTimeout(400)
  await page.screenshot({ path: 'test-results/ui-desktop-insights.png', fullPage: true })

  // On a phone the page is reached through the account panel and never scrolls sideways, in either view.
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/today')
  await page.getByRole('button', { name: 'حساب و تنظیمات' }).click()
  await page.getByRole('dialog', { name: 'حساب شما' }).getByRole('link', { name: 'عملیات' }).click()
  await expect(page.getByRole('heading', { name: 'عملیات', exact: true })).toBeVisible()
  await expect(page.getByRole('region', { name: 'خانواده‌ی برنامه‌ریزی' })).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
  await page.screenshot({ path: 'test-results/ui-phone-operations.png', fullPage: true })
  await page.getByRole('tab', { name: 'سنجش محصول' }).click()
  await expect(page.getByRole('region', { name: 'قیف برنامه‌ریزی' })).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
  await page.screenshot({ path: 'test-results/ui-phone-insights.png', fullPage: true })
})

