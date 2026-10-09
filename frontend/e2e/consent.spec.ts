import { expect, test } from '@playwright/test'

const origin = 'http://127.0.0.1:5174'

// The isolated backend runs on the samples, where no consent is needed. This test shows the
// consent card in a real browser by answering the two reads that drive it as a backend with a
// real provider would. The server-side rule itself is covered by PilotReadinessTests.
test('the consent card names the provider before any planning text can be written', async ({ page }) => {
  const session = await page.request.post('/api/v1/dev/test-session', { data: {}, headers: { Origin: origin } })
  expect(session.ok()).toBeTruthy()
  const account = await session.json() as Record<string, unknown>
  let granted = false
  let sent: unknown = null

  await page.route('**/api/v1/users/me', route => route.fulfill({
    json: { ...account, aiConsentRequired: true, aiConsentGranted: granted },
  }))
  await page.route('**/api/v1/pilot/notice', async route => {
    const real = await (await route.fetch()).json() as Record<string, unknown>
    await route.fulfill({ json: { ...real, aiProviderName: 'DeepSeek' } })
  })
  await page.route('**/api/v1/users/me/ai-consent', async route => {
    sent = route.request().postDataJSON()
    granted = true
    await route.fulfill({ json: { ...account, aiConsentRequired: true, aiConsentGranted: true } })
  })
  await page.route('**/api/v1/planning/active', route => route.fulfill({
    json: { attempt: null, draft: null, clarification: null, sampleGenerator: false },
  }))

  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/planning')
  const card = page.getByRole('region', { name: 'اجازه شما برای برنامه‌ریزی با هوش مصنوعی' })
  await expect(card).toBeVisible()
  await expect(card.getByText('DeepSeek')).toBeVisible()
  await expect(card.getByText(/این متن از کشور خارج می‌شود/)).toBeVisible()
  await expect(page.getByLabel('می‌خواهید روی چه چیزی پیش بروید؟')).toHaveCount(0)
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
  await page.screenshot({ path: 'test-results/ui-phone-ai-consent.png', fullPage: true })

  // Declining keeps the manual path one tap away.
  await card.getByRole('button', { name: 'خودم دستی می‌سازم' }).click()
  await expect(page.getByRole('dialog', { name: 'چه چیزی اضافه می‌کنید؟' })).toBeVisible()
  await page.keyboard.press('Escape')

  await card.getByRole('button', { name: 'موافقم، با هوش مصنوعی برنامه‌ریزی کن' }).click()
  await expect(page.getByLabel('می‌خواهید روی چه چیزی پیش بروید؟')).toBeVisible()
  // Agreement names the notice the user was shown.
  expect(sent).toEqual({ granted: true, noticeVersion: expect.stringMatching(/^\d{4}-\d{2}-\d{2}\.\d+$/) })
  await expect(page.getByText(/با اجازه‌ای که داده‌اید/)).toBeVisible()
})
