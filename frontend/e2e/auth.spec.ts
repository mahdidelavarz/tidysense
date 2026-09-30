import { expect, test, type Page } from '@playwright/test'

const origin = 'http://127.0.0.1:5174'

async function codeFromToast(page: Page) {
  const toast = page.getByRole('status')
  await expect(toast).toContainText(/\d{4}/)
  const match = (await toast.textContent())?.match(/\d{4}/)
  if (!match) throw new Error('Development OTP was not visible in the notification.')
  return match[0]
}

test('new user login, invalid code, reload, logout, and immediate login again', async ({ page }) => {
  const phone = `0912${String(Date.now() % 10_000_000).padStart(7, '0')}`
  await page.goto('/login')
  await page.getByLabel('شماره موبایل').fill(phone)
  await page.getByRole('button', { name: 'دریافت کد' }).click()
  await expect(page.getByLabel('کد تأیید')).toBeVisible()
  const code = await codeFromToast(page)
  await page.getByLabel('کد تأیید').fill('0000')
  await page.getByRole('button', { name: 'ورود' }).click()
  await expect(page.getByText('کد نامعتبر یا منقضی شده است.')).toBeVisible()
  await page.getByLabel('کد تأیید').fill(code)
  await page.getByRole('button', { name: 'ورود' }).click()
  await expect(page).toHaveURL(/first-entry/)
  await page.screenshot({ path: 'test-results/auth-first-entry.png' })
  await page.getByRole('link', { name: 'ادامه به برنامه' }).click()
  await expect(page.getByRole('button', { name: 'خروج از این مرورگر' })).toBeVisible()
  await page.screenshot({ path: 'test-results/auth-account.png' })
  await page.reload()
  await expect(page.getByRole('button', { name: 'خروج از این مرورگر' })).toBeVisible()
  await page.getByRole('button', { name: 'خروج از این مرورگر' }).click()
  await expect(page).toHaveURL(/login/)
  await page.getByLabel('شماره موبایل').fill(phone)
  await page.getByRole('button', { name: 'دریافت کد' }).click()
  await expect(page.getByLabel('کد تأیید')).toBeVisible()
  const freshCode = await codeFromToast(page)
  await page.getByLabel('کد تأیید').fill(freshCode)
  await page.getByRole('button', { name: 'ورود' }).click()
  await expect(page).toHaveURL(/first-entry/)
})

test('returning login and logout-all revoke another browser', async ({ browser, page, request }) => {
  const created = await request.post('/api/v1/dev/test-session', {
    data: {}, headers: { Origin: origin },
  })
  expect(created.ok()).toBeTruthy()
  await page.goto('/login')
  await page.getByLabel('شماره موبایل').fill('09120000000')
  await page.getByRole('button', { name: 'دریافت کد' }).click()
  await page.getByLabel('کد تأیید').fill(await codeFromToast(page))
  await page.getByRole('button', { name: 'ورود' }).click()
  await expect(page).toHaveURL(`${origin}/`)
  const another = await browser.newContext({ storageState: await page.context().storageState() })
  const second = await another.newPage()
  await second.goto('/')
  await second.getByRole('button', { name: /خروج از همه/ }).click()
  await expect(second).toHaveURL(/login/)
  await page.reload()
  await expect(page).toHaveURL(/login/)
  await another.close()
})

test('manual task moves through Today to completion', async ({ page }) => {
  const session = await page.request.post('/api/v1/dev/test-session', {
    data: {}, headers: { Origin: origin },
  })
  expect(session.ok()).toBeTruthy()
  const todayResponse = await page.request.get('/api/v1/today')
  expect(todayResponse.ok()).toBeTruthy()
  const { localDate } = await todayResponse.json() as { localDate: string }
  const title = `کار مرورگر ${Date.now()}`

  await page.goto('/tasks')
  await page.getByRole('button', { name: 'کار جدید' }).click()
  await page.getByLabel('عنوان کار').fill(title)
  await page.getByLabel('تاریخ برنامه‌ریزی').fill(localDate)
  await page.getByRole('button', { name: 'ساخت کار' }).click()
  await expect(page.getByRole('heading', { name: title })).toBeVisible()

  await page.getByRole('link', { name: 'امروز' }).click()
  await expect(page.getByRole('heading', { name: title })).toBeVisible()
  await page.screenshot({ path: 'test-results/step-05-today-before.png', fullPage: true })
  await page.getByRole('button', { name: 'تکمیل کار' }).click()
  await expect(page.getByText('برای امروز کاری نمانده است.')).toBeVisible()
  await page.screenshot({ path: 'test-results/step-05-today-after.png', fullPage: true })

  await page.getByRole('link', { name: 'کارها', exact: true }).click()
  await page.getByRole('heading', { name: title }).click()
  await expect(page.getByText('تکمیل‌شده')).toBeVisible()
})
