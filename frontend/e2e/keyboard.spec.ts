import { expect, test, type Page } from '@playwright/test'

const origin = 'http://127.0.0.1:5174'

/** Presses Tab until the wanted element has focus, so the test never depends on the exact tab order in between. */
async function tabTo(page: Page, name: string | RegExp, role: 'link' | 'button' | 'textbox' = 'button', limit = 40) {
  const target = page.getByRole(role, { name }).first()
  for (let presses = 0; presses < limit; presses++) {
    if (await target.evaluate(element => element === document.activeElement).catch(() => false)) return target
    await page.keyboard.press('Tab')
  }
  throw new Error(`Tab never reached the ${role} "${name}".`)
}

// No pointer is used after the page loads: a Task is created, executed and found again with the keyboard alone.
test('the critical manual flow works with the keyboard alone', async ({ page }) => {
  const session = await page.request.post('/api/v1/dev/test-session', { data: {}, headers: { Origin: origin } })
  expect(session.ok()).toBeTruthy()
  const title = `کار صفحه‌کلید ${Date.now()}`
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/today')
  await expect(page.getByRole('navigation', { name: 'ناوبری اصلی' })).toBeVisible()

  // Navigation: a destination is reached with Tab and opened with Enter.
  await tabTo(page, 'کارها', 'link')
  await page.keyboard.press('Enter')
  await expect(page).toHaveURL(/\/tasks$/)

  // The create sheet takes focus when it opens and keeps Tab inside it.
  const opener = await tabTo(page, 'کار جدید')
  await page.keyboard.press('Enter')
  const sheet = page.getByRole('dialog', { name: 'کار جدید' })
  await expect(sheet).toBeVisible()
  expect(await sheet.evaluate(element => element.contains(document.activeElement))).toBe(true)
  for (let presses = 0; presses < 30; presses++) {
    await page.keyboard.press('Tab')
    expect(await sheet.evaluate(element => element.contains(document.activeElement))).toBe(true)
  }

  // Escape closes it and focus returns to the button that opened it.
  await page.keyboard.press('Escape')
  await expect(sheet).toBeHidden()
  await expect(opener).toBeFocused()

  // Open again, type a title and choose today from the calendar with the keyboard.
  await page.keyboard.press('Enter')
  await expect(sheet).toBeVisible()
  await tabTo(page, 'عنوان کار', 'textbox')
  await page.keyboard.type(title)
  await tabTo(page, 'تاریخ برنامه‌ریزی')
  await page.keyboard.press('Enter')
  const { localDate } = await (await page.request.get('/api/v1/today')).json() as { localDate: string }
  const day = page.locator(`[data-date="${localDate}"]`)
  await expect(day).toBeVisible()
  for (let presses = 0; presses < 60; presses++) {
    if (await day.evaluate(element => element === document.activeElement)) break
    await page.keyboard.press('Tab')
  }
  await expect(day).toBeFocused()
  await page.keyboard.press('Enter')
  await tabTo(page, 'ساخت کار')
  await page.keyboard.press('Enter')
  await expect(sheet).toBeHidden()
  await expect(page.getByRole('heading', { name: title })).toBeVisible()

  // Today: the Task is completed from the keyboard.
  await tabTo(page, 'امروز', 'link')
  await page.keyboard.press('Enter')
  await expect(page).toHaveURL(/\/today$/)
  await tabTo(page, `تکمیل کار: ${title}`)
  await page.keyboard.press('Enter')
  await expect(page.getByRole('button', { name: `تکمیل کار: ${title}` })).toBeHidden()

  // A focused control shows a visible focus indicator (checked on one navigation link).
  const link = await tabTo(page, 'کارها', 'link')
  const outline = await link.evaluate(element => {
    const style = getComputedStyle(element)
    return style.outlineStyle !== 'none' || style.boxShadow !== 'none'
  })
  expect(outline).toBe(true)
})
