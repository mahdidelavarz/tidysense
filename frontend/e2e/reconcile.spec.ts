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
  await expect(page.getByRole('heading', { name: 'امروز', exact: true })).toBeVisible()
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

test('an optional explanation points at an allowed action and the change still goes through the confirmed preview', async ({ page }) => {
  const session = await page.request.post('/api/v1/dev/test-session', { data: {}, headers: { Origin: origin } })
  expect(session.ok()).toBeTruthy()
  const { localDate } = await (await page.request.get('/api/v1/today')).json() as { localDate: string }
  const title = `کار قدیمی ${Date.now()}`
  const created = await page.request.post('/api/v1/tasks', {
    data: {
      title, description: null, goalId: null, projectId: null,
      plannedDate: shiftDate(localDate, -8), deadline: null, sequenceId: null, sequenceOrder: null,
    },
    headers: { Origin: origin, 'Idempotency-Key': randomUUID() },
  })
  expect(created.ok(), await created.text()).toBeTruthy()
  const task = await created.json() as { id: string }

  await page.goto('/reconcile')
  // The deterministic lane is complete before any explanation is asked for.
  const execution = page.getByRole('region', { name: 'تصمیم‌های اجرایی' })
  await expect(execution.getByRole('heading', { name: title })).toBeVisible()
  const card = page.getByRole('region', { name: /توضیح هوش مصنوعی/ })
  await expect(card.getByText('توضیح چیزی را تغییر نمی‌دهد.')).toBeVisible()
  await card.getByRole('button', { name: 'توضیح بده' }).click()

  const recommendation = card.getByRole('article', { name: 'پیشنهاد: انتقال به تاریخ جدید' }).filter({ hasText: title })
  await expect(recommendation).toBeVisible()
  await expect(recommendation.getByText(/^قاعده:/)).toBeVisible()
  await expect(recommendation.getByText(/واقعیت‌ها:.*۸ روز گذشته/)).toBeVisible()
  await expect(card.getByText(/تا پیش‌نمایش را تأیید نکنید چیزی تغییر نمی‌کند/)).toBeVisible()
  await page.screenshot({ path: 'test-results/step-10-explanation.png', fullPage: true })
  // Other old work of the shared test user may be in the same recommendation; only this Task is kept.
  for (const box of await recommendation.getByRole('checkbox').all()) {
    const label = await box.evaluate(node => node.closest('label')?.textContent ?? '')
    if (!label.includes(title)) await box.uncheck()
  }

  // Nothing has changed yet: the Task is still where it was.
  const before = await (await page.request.get(`/api/v1/tasks/${task.id}`)).json() as { plannedDate: string }
  expect(before.plannedDate).toBe(shiftDate(localDate, -8))

  await recommendation.getByRole('button', { name: 'دیدن پیش‌نمایش' }).click()
  const dateSheet = page.getByRole('dialog', { name: 'انتقال به تاریخ جدید' })
  await dateSheet.getByLabel('تاریخ جدید').click()
  await dateSheet.getByRole('button', { name: 'فردا', exact: true }).click()
  await dateSheet.getByRole('button', { name: 'دیدن پیش‌نمایش' }).click()
  const review = page.getByRole('dialog', { name: 'انتقال به تاریخ جدید' })
  await expect(review.getByRole('listitem')).toHaveCount(1)
  await expect(review.getByText('منتقل می‌شود')).toBeVisible()
  await review.getByRole('button', { name: 'تأیید و اعمال' }).click()
  await expect(review).toBeHidden()
  await expect(execution.getByRole('heading', { name: title })).toHaveCount(0)

  const after = await (await page.request.get(`/api/v1/tasks/${task.id}`)).json() as { plannedDate: string; carryCount: number }
  expect(after.plannedDate).toBe(shiftDate(localDate, 1))
  expect(after.carryCount).toBe(1)
})
