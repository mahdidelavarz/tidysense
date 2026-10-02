import { randomUUID } from 'node:crypto'
import { expect, test } from '@playwright/test'

const origin = 'http://127.0.0.1:5174'

test('a multi-slot Routine and a Task are executed together from Today', async ({ page }) => {
  const session = await page.request.post('/api/v1/dev/test-session', {
    data: {}, headers: { Origin: origin },
  })
  expect(session.ok()).toBeTruthy()
  const { localDate } = await (await page.request.get('/api/v1/today')).json() as { localDate: string }
  const stamp = Date.now()
  const routineTitle = `روتین مرورگر ${stamp}`
  const taskTitle = `کار کنار روتین ${stamp}`
  const task = await page.request.post('/api/v1/tasks', {
    data: {
      title: taskTitle, description: null, goalId: null, projectId: null,
      plannedDate: localDate, deadline: null, sequenceId: null, sequenceOrder: null,
    },
    headers: { Origin: origin, 'Idempotency-Key': randomUUID() },
  })
  expect(task.ok()).toBeTruthy()

  // Routines are reached from the sidebar; the create flow is the shared sheet.
  await page.goto('/today')
  await page.getByRole('navigation', { name: 'ناوبری اصلی' }).getByRole('link', { name: 'روتین‌ها' }).click()
  await expect(page).toHaveURL(/\/routines$/)
  await page.getByRole('button', { name: 'روتین جدید' }).click()
  const sheet = page.getByRole('dialog', { name: 'روتین جدید' })
  await sheet.getByLabel('عنوان روتین').fill(routineTitle)
  // 00:00 and 23:59 keep both slots pending whatever time the test runs:
  // the first is missed only once the second is reached.
  for (const time of ['00:00', '23:59']) {
    await sheet.getByLabel('ساعت‌های روز (اختیاری)').fill(time)
    await sheet.getByRole('button', { name: 'افزودن ساعت' }).click()
  }
  await page.screenshot({ path: 'test-results/step-06-routine-sheet.png', fullPage: true })
  await sheet.getByRole('button', { name: 'ساخت روتین' }).click()
  await expect(page.getByRole('heading', { name: routineTitle })).toBeVisible()

  await page.getByRole('navigation', { name: 'ناوبری اصلی' }).getByRole('link', { name: 'امروز' }).click()
  await expect(page.getByRole('heading', { name: taskTitle })).toBeVisible()
  const routines = page.getByRole('region', { name: 'روتین‌های امروز' })
  const group = routines.getByRole('article').filter({ hasText: routineTitle })
  await expect(group.getByRole('button', { name: /^انجام شد:/ })).toHaveCount(2)
  await page.screenshot({ path: 'test-results/step-06-today-before.png', fullPage: true })

  await group.getByRole('button', { name: `انجام شد: ${routineTitle}، ۰۰:۰۰` }).click()
  await expect(group.getByText('انجام‌شده')).toBeVisible()
  await expect(group.getByRole('button', { name: /^انجام شد:/ })).toHaveCount(1)
  await page.getByRole('button', { name: `تکمیل کار: ${taskTitle}` }).click()
  await expect(page.getByRole('heading', { name: taskTitle })).toBeHidden()
  // The Routine's remaining slot keeps Today from being empty.
  await expect(group.getByRole('button', { name: `انجام شد: ${routineTitle}، ۲۳:۵۹` })).toBeVisible()
  await page.screenshot({ path: 'test-results/step-06-today-after.png', fullPage: true })

  // Stop the Routine from its detail page; today's slots and history remain.
  await group.getByRole('link', { name: `جزئیات: ${routineTitle}` }).click()
  await expect(page.getByRole('heading', { name: 'سابقه اجرا' })).toBeVisible()
  await page.getByRole('button', { name: 'توقف روتین' }).click()
  await page.getByRole('button', { name: 'تأیید توقف' }).click()
  await expect(page.getByText('متوقف‌شده')).toBeVisible()
  await expect(page.getByRole('button', { name: 'ازسرگیری روتین' })).toBeVisible()
  await page.screenshot({ path: 'test-results/step-06-routine-detail.png', fullPage: true })
})
