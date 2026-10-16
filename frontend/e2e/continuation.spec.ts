import { randomUUID } from 'node:crypto'
import { expect, type Page, test } from '@playwright/test'

const origin = 'http://127.0.0.1:5174'

async function get<T>(page: Page, path: string) {
  return await (await page.request.get(`/api/v1/${path}`)).json() as T
}

async function post(page: Page, path: string, data: unknown = {}) {
  const response = await page.request.post(`/api/v1/${path}`, { data, headers: { Origin: origin, 'Idempotency-Key': randomUUID() } })
  expect(response.ok(), `${path}: ${await response.text()}`).toBeTruthy()
  return response
}

/** Approves the draft shown on the planning page through the server's preview. */
async function approve(page: Page) {
  await page.getByRole('button', { name: 'مرور نهایی و تأیید' }).click()
  const review = page.getByRole('dialog', { name: 'مرور نهایی و تأیید' })
  await review.getByRole('button', { name: /^تأیید[: ]/ }).click()
  await expect(page.getByText('برنامه ساخته شد.')).toBeVisible()
}

/** The one item a step needs; the test stops with its name when it is missing. */
function found<T>(item: T | undefined, what: string): T {
  if (item === undefined) throw new Error(`${what} was not found`)
  return item
}

type Offer = { windowId: string; week: number; scopeId: string; title: string }
type Listed<T> = { items: T[] }

// STEP-24: from an approved first week to an approved second, built from how the first went (029 §3).
test('the next week of an approved plan is offered near its end and planned with one tap', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 900 })
  await page.request.post('/api/v1/dev/test-session', { data: {}, headers: { Origin: origin } })
  // The shared test account starts from a clean planning state.
  const active = await get<{ draft: { id: string; revision: number } | null; attempt: { id: string } | null }>(page, 'planning/active')
  if (active.attempt) await post(page, `planning/attempts/${active.attempt.id}/cancel`)
  if (active.draft) await post(page, `planning/drafts/${active.draft.id}/cancel`, { expectedRevision: active.draft.revision })

  // Week one, approved as any plan is.
  const intention = `یادگیری گیتار ${Date.now()}`
  await page.goto('/planning')
  await page.getByLabel('روی چه چیزی می‌خواهید پیش بروید؟').fill(intention)
  await page.getByRole('button', { name: 'ساخت پیش‌نویس' }).click()
  await expect(page.getByRole('heading', { name: 'ساختار پیشنهادی' })).toBeVisible({ timeout: 15_000 })
  await approve(page)
  const goal = found((await get<Listed<{ id: string; title: string }>>(page, 'goals?limit=100')).items
    .find(x => x.title === intention), 'the Goal')
  const phase = found((await get<Listed<{ id: string; goalId: string | null }>>(page, 'projects?limit=100')).items
    .find(x => x.goalId === goal.id), 'its phase Project')
  // Nothing is offered while the week has days to go.
  expect((await get<Offer[]>(page, 'planning/continuations')).some(x => x.scopeId === goal.id)).toBe(false)

  // The week happens: its first step is done. Then it is brought to its last day.
  type Task = { id: string; title: string; version: number; status: string; isBlocked: boolean; projectId: string | null }
  const tasks = (await get<Listed<Task>>(page, 'tasks?limit=100')).items.filter(x => x.projectId === phase.id)
  const first = found(tasks.find(x => x.status === 'ACTIVE' && !x.isBlocked), 'an open step')
  const { localDate } = await get<{ localDate: string }>(page, 'today')
  await post(page, `tasks/${first.id}/complete`, { expectedVersion: first.version, completedForLocalDate: localDate })
  await post(page, `dev/planning-windows/rewind?days=6&goalId=${goal.id}`)

  // On Today: how the week went, and the one tap.
  await page.goto('/today')
  const offer = page.getByRole('region', { name: `هفتهٔ اول «${intention}» امروز تمام می‌شود` })
  await expect(offer).toBeVisible()
  await expect(offer).toContainText('۱ کار انجام شد')
  await page.screenshot({ path: 'test-results/step-24-offer-phone.png' })
  await offer.getByRole('link', { name: 'برنامهٔ هفتهٔ بعد' }).click()

  // The next week's draft: built from that week, its steps under the existing phase Project.
  await expect(page.getByText(/هفتهٔ دوم را دقیق چیدیم/)).toBeVisible({ timeout: 15_000 })
  await expect(page.getByText('زیر «گام نخست»')).toBeVisible()
  await expect(page.getByText('پروژه‌ای که از قبل هست')).toBeVisible()
  // The step week one left undated is put into this week instead of being proposed again.
  await expect(page.getByText(/۱ کار موجود در این هفته روز می‌گیرد/)).toBeVisible()
  await expect(page.getByText('کار موجود؛ فقط روزش گذاشته می‌شود')).toBeVisible()
  // The viewport only, at the existing step: a full-page capture puts the sticky footer over it.
  await page.getByText('کار موجود؛ فقط روزش گذاشته می‌شود').scrollIntoViewIfNeeded()
  await page.screenshot({ path: 'test-results/step-24-week-two-review.png' })
  await approve(page)

  // Approved: the offer is gone and the new steps live in the phase Project; no second Goal or Project.
  expect((await get<Offer[]>(page, 'planning/continuations')).some(x => x.scopeId === goal.id)).toBe(false)
  const after = (await get<Listed<Task>>(page, 'tasks?limit=100')).items.filter(x => x.title === 'ادامهٔ قدم‌های هفتهٔ پیش')
  expect(after.some(x => x.projectId === phase.id)).toBe(true)
  // The existing step kept its title and place and gained its day; no second copy of it was made.
  const resources = (await get<Listed<Task & { goalId: string | null; plannedDate: string | null }>>(page, 'tasks?limit=100'))
    .items.filter(x => x.title === 'فهرست‌کردن منابع لازم' && x.goalId === goal.id)
  expect(resources).toHaveLength(1)
  expect(resources[0].plannedDate).not.toBeNull()
  expect((await get<Listed<{ goalId: string | null }>>(page, 'projects?limit=100')).items.filter(x => x.goalId === goal.id)).toHaveLength(1)

  // Week two near its end is offered on the Goal's own page, where «فعلاً نه» ends the offer.
  // It began the day after week one ended (today), so seven days bring it to its last day.
  await post(page, `dev/planning-windows/rewind?days=7&goalId=${goal.id}`)
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto(`/goals/${goal.id}`)
  const weekTwo = page.getByRole('region', { name: `هفتهٔ دوم «${intention}» امروز تمام می‌شود` })
  await expect(weekTwo).toBeVisible()
  await page.screenshot({ path: 'test-results/step-24-offer-goal-desktop.png' })
  await weekTwo.getByRole('button', { name: 'فعلاً نه' }).click()
  await expect(weekTwo).toBeHidden()
  expect((await get<Offer[]>(page, 'planning/continuations')).some(x => x.scopeId === goal.id)).toBe(false)
})
