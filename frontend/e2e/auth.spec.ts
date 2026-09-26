import { expect, test } from '@playwright/test'

const origin = 'http://127.0.0.1:5174'

async function codeFor(request: import('@playwright/test').APIRequestContext, phone: string) {
  const response = await request.get(`/api/v1/dev/otp/latest?phoneNumber=${phone}`)
  expect(response.ok()).toBeTruthy()
  return (await response.json()).code as string
}

test('new user login, invalid code, reload, logout, and immediate login again', async ({ page, request }) => {
  const phone = `0912${String(Date.now() % 10_000_000).padStart(7, '0')}`
  await page.goto('/login')
  await page.getByLabel('شماره موبایل').fill(phone)
  await page.getByRole('button', { name: 'دریافت کد' }).click()
  await expect(page.getByLabel('کد تأیید')).toBeVisible()
  const code = await codeFor(request, phone)
  await expect(page.getByRole('status')).toContainText(code)
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
  const freshCode = await codeFor(request, phone)
  await expect(page.getByRole('status')).toContainText(freshCode)
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
  await page.getByLabel('کد تأیید').fill(await codeFor(request, '09120000000'))
  await page.getByRole('button', { name: 'ورود' }).click()
  await expect(page).toHaveURL(`${origin}/`)
  const another = await browser.newContext({ storageState: await page.context().storageState() })
  const second = await another.newPage()
  await second.goto('/')
  await second.getByRole('button', { name: 'خروج از همهٔ نشست‌ها' }).click()
  await expect(second).toHaveURL(/login/)
  await page.reload()
  await expect(page).toHaveURL(/login/)
  await another.close()
})
