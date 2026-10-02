import { randomUUID } from 'node:crypto'
import { expect, test } from '@playwright/test'

const origin = 'http://127.0.0.1:5174'

/** Shifts an ISO local date by whole days without touching time zones. */
function shiftDate(iso: string, days: number) {
  const date = new Date(`${iso}T12:00:00Z`)
  date.setUTCDate(date.getUTCDate() + days)
  return date.toISOString().slice(0, 10)
}

test('a quick capture and an overdue sequence are resolved in Reconcile while Today stays usable', async ({ page }) => {
  const session = await page.request.post('/api/v1/dev/test-session', { data: {}, headers: { Origin: origin } })
  expect(session.ok()).toBeTruthy()
  const post = async (path: string, data: unknown) => {
    const response = await page.request.post(`/api/v1/${path}`, {
      data, headers: { Origin: origin, 'Idempotency-Key': randomUUID() },
    })
    expect(response.ok(), `${path}: ${await response.text()}`).toBeTruthy()
    return await response.json() as { id: string }
  }
  const { localDate } = await (await page.request.get('/api/v1/today')).json() as { localDate: string }
  const stamp = Date.now()
  const captureTitle = `یادداشت مرورگر ${stamp}`
  const firstTitle = `گام اول ${stamp}`
  const secondTitle = `گام دوم ${stamp}`
  const project = await post('projects', {
    title: `پروژه بازبینی ${stamp}`, completionMeaning: null, goalId: null, targetDate: null, reviewDate: null,
  })
  const sequenceId = randomUUID()
  await post('tasks', {
    title: firstTitle, description: null, goalId: null, projectId: project.id,
    plannedDate: shiftDate(localDate, -3), deadline: null, sequenceId, sequenceOrder: 10,
  })
  await post('tasks', {
    title: secondTitle, description: null, goalId: null, projectId: project.id,
    plannedDate: shiftDate(localDate, -2), deadline: null, sequenceId, sequenceOrder: 20,
  })

  // Quick capture: a title alone through the ordinary Add Task form.
  await page.goto('/today')
  await page.getByRole('button', { name: 'افزودن کار' }).click()
  const createSheet = page.getByRole('dialog', { name: 'کار جدید' })
  await createSheet.getByLabel('عنوان کار').fill(captureTitle)
  await expect(createSheet.getByRole('status')).toContainText('یادداشت سریع')
  await createSheet.getByRole('button', { name: 'ذخیره یادداشت' }).click()
  await expect(createSheet).toBeHidden()
  // A capture is not a commitment, so it never appears in Today.
  await expect(page.getByRole('heading', { name: captureTitle })).toHaveCount(0)

  // Today offers Reconcile without standing in the way.
  const offer = page.getByRole('region', { name: 'پیشنهاد بازبینی' })
  await expect(offer).toBeVisible()
  await expect(page.getByRole('heading', { name: 'امروز' })).toBeVisible()
  await page.screenshot({ path: 'test-results/step-07-today-offer.png', fullPage: true })
  await offer.getByRole('link', { name: 'شروع بازبینی' }).click()
  await expect(page).toHaveURL(/\/reconcile$/)

  const execution = page.getByRole('region', { name: 'تصمیم‌های اجرایی' })
  const sequence = execution.getByRole('article', { name: 'دنباله کارها' }).filter({ hasText: firstTitle })
  await expect(sequence).toContainText(secondTitle)
  await expect(sequence.getByText('منتظر کار پیشین')).toBeVisible()
  const captures = page.getByRole('region', { name: 'یادداشت‌های سریع' })
  await expect(captures.getByRole('heading', { name: captureTitle })).toBeVisible()
  await page.screenshot({ path: 'test-results/step-07-reconcile.png', fullPage: true })

  // The capture becomes a Task once it has a date.
  await captures.getByRole('button', { name: `تبدیل به کار: ${captureTitle}` }).click()
  const captureSheet = page.getByRole('dialog', { name: 'تبدیل به کار' })
  await captureSheet.getByLabel('تاریخ برنامه‌ریزی').click()
  // The server's local date decides what Today shows, so pick exactly that day.
  await captureSheet.locator(`[data-date="${localDate}"]`).click()
  await captureSheet.getByRole('button', { name: 'ساخت کار' }).click()
  await expect(captureSheet).toBeHidden()
  await expect(page.getByRole('heading', { name: captureTitle })).toHaveCount(0)

  // The whole sequence is re-anchored through a server preview and one confirmation.
  await sequence.getByRole('button', { name: 'انتقال کل دنباله' }).click()
  const dateSheet = page.getByRole('dialog', { name: 'انتقال کل دنباله' })
  await dateSheet.getByLabel('تاریخ جدید').click()
  await dateSheet.getByRole('button', { name: 'فردا', exact: true }).click()
  await dateSheet.getByRole('button', { name: 'دیدن پیش‌نمایش' }).click()
  const review = page.getByRole('dialog', { name: 'انتقال کل دنباله' })
  await expect(review.getByRole('listitem')).toHaveCount(2)
  await expect(review.getByText('با همان فاصله جابه‌جا می‌شود')).toHaveCount(2)
  await page.screenshot({ path: 'test-results/step-07-review-apply.png', fullPage: true })
  await review.getByRole('button', { name: 'تأیید و اعمال' }).click()
  await expect(review).toBeHidden()
  await expect(page.getByText(firstTitle)).toHaveCount(0)

  // Back on Today the resolved capture is ordinary dated work.
  await page.getByRole('navigation', { name: 'ناوبری اصلی' }).getByRole('link', { name: 'امروز' }).click()
  await expect(page.getByRole('heading', { name: captureTitle })).toBeVisible()
  await page.getByRole('button', { name: `تکمیل کار: ${captureTitle}` }).click()
  await expect(page.getByRole('heading', { name: captureTitle })).toBeHidden()

  const tasks = await (await page.request.get('/api/v1/tasks?limit=100')).json() as {
    items: Array<{ title: string; plannedDate: string; carryCount: number }>
  }
  const first = tasks.items.find(task => task.title === firstTitle)
  const second = tasks.items.find(task => task.title === secondTitle)
  if (!first || !second) throw new Error('The carried sequence Tasks were not returned.')
  expect(first.carryCount).toBe(1)
  // The one-day gap between the two members survives the move.
  expect(second.plannedDate).toBe(shiftDate(first.plannedDate, 1))
})
