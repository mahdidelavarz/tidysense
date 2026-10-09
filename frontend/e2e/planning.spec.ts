import { randomUUID } from 'node:crypto'
import { expect, test } from '@playwright/test'

const origin = 'http://127.0.0.1:5174'

test('an intention becomes a reviewed draft and only the confirmed plan is created', async ({ page }) => {
  const session = await page.request.post('/api/v1/dev/test-session', { data: {}, headers: { Origin: origin } })
  expect(session.ok()).toBeTruthy()
  const get = async <T>(path: string) => await (await page.request.get(`/api/v1/${path}`)).json() as T
  type Listed = { items: Array<{ id: string; title: string; source: string; goalId: string | null; projectId: string | null }> }

  // The shared test user starts from a clean planning state.
  const active = await get<{ draft: { id: string; revision: number } | null; attempt: { id: string } | null }>('planning/active')
  if (active.attempt) {
    await page.request.post(`/api/v1/planning/attempts/${active.attempt.id}/cancel`, { data: {}, headers: { Origin: origin } })
  }
  if (active.draft) {
    await page.request.post(`/api/v1/planning/drafts/${active.draft.id}/cancel`, {
      data: { expectedRevision: active.draft.revision }, headers: { Origin: origin, 'Idempotency-Key': randomUUID() },
    })
  }

  const stamp = Date.now()
  const intention = `یادگیری زبان ${stamp}`
  const editedTitle = `قدم ویرایش‌شده ${stamp}`

  await page.goto('/today')
  await page.getByRole('navigation', { name: 'ناوبری اصلی' }).getByRole('link', { name: 'برنامه‌ریزی' }).click()
  await expect(page).toHaveURL(/\/planning$/)
  await page.getByLabel('می‌خواهید روی چه چیزی پیش بروید؟').fill(intention)
  await page.getByRole('button', { name: 'ساخت پیش‌نویس' }).click()

  // The draft appears only once it is complete and validated.
  await expect(page.getByRole('heading', { name: 'ساختار پیشنهادی' })).toBeVisible({ timeout: 15_000 })
  await expect(page.getByText('پیش‌نویس تأییدنشده')).toBeVisible()
  const goalCard = page.getByRole('article', { name: intention, exact: true })
  await expect(goalCard.getByText('(پیش‌فرض)')).toBeVisible()
  await expect(page.getByRole('heading', { name: 'هفت روز پیش رو' })).toBeVisible()
  await page.screenshot({ path: 'test-results/step-08-draft-review.png', fullPage: true })

  // Nothing canonical exists while the draft is only reviewed and edited.
  expect((await get<Listed>('goals?limit=100')).items.some(goal => goal.title === intention)).toBe(false)

  // Planning details are approved separately from the work.
  await page.getByRole('checkbox', { name: /^وسیله در دسترس/ }).click()
  await expect(page.getByRole('checkbox', { name: /^وسیله در دسترس/ })).not.toBeChecked()

  await page.getByRole('button', { name: 'ویرایش: روشن‌کردن اولین قدم' }).click()
  const sheet = page.getByRole('dialog', { name: 'ویرایش کار پیشنهادی' })
  await sheet.getByLabel('عنوان').fill(editedTitle)
  await sheet.getByRole('button', { name: 'ذخیره در پیش‌نویس' }).click()
  await expect(sheet).toBeHidden()
  await expect(page.getByRole('article', { name: editedTitle })).toBeVisible()
  expect((await get<Listed>('tasks?limit=100')).items.some(task => task.title === editedTitle)).toBe(false)

  // One server preview, one explicit confirmation.
  await page.getByRole('button', { name: 'مرور نهایی و تأیید' }).click()
  const review = page.getByRole('dialog', { name: 'مرور نهایی و تأیید' })
  await expect(review.getByRole('list', { name: 'مواردی که ساخته می‌شوند' }).getByRole('listitem')).toHaveCount(7)
  await expect(review.getByText(/روزهای غیرقابل‌استفاده هفته/)).toBeVisible()
  await page.screenshot({ path: 'test-results/step-08-confirm.png', fullPage: true })
  await review.getByRole('button', { name: 'تأیید و ساخت' }).click()
  await expect(page.getByText('برنامه ساخته شد.')).toBeVisible()
  await page.screenshot({ path: 'test-results/step-08-result.png', fullPage: true })
  // The optional pilot question sits under the result, is answered once and leaves the way on untouched.
  const question = page.getByRole('group', { name: 'این برنامه چقدر برای شروع کار به دردتان می‌خورد؟' })
  await question.getByRole('button', { name: '۴ از ۵' }).click()
  await expect(page.getByText('ممنون؛ پاسخ شما ثبت شد.')).toBeVisible()
  await expect(question).toBeHidden()

  const goal = (await get<Listed>('goals?limit=100')).items.find(item => item.title === intention)
  if (!goal) throw new Error('The planned Goal was not created.')
  expect(goal.source).toBe('AI_ASSISTED')
  const tasks = (await get<Listed>('tasks?limit=100')).items
  expect(tasks.find(task => task.title === editedTitle)?.source).toBe('AI_ASSISTED')
  const facts = await get<Array<{ factType: string; strength: string }>>(`planning/facts?goalId=${goal.id}`)
  expect(facts).toEqual([expect.objectContaining({ factType: 'UNAVAILABLE_WEEKDAY', strength: 'HARD' })])
  expect((await get<{ draft: unknown }>('planning/active')).draft).toBeNull()

  // The Goal shows what is remembered for later planning and offers planning its next steps.
  await page.getByRole('link', { name: 'دیدن هدف' }).click()
  await expect(page.getByRole('heading', { name: intention })).toBeVisible()
  await expect(page.getByText('روزهای غیرقابل‌استفاده هفته: جمعه')).toBeVisible()
  await page.screenshot({ path: 'test-results/step-08-goal-planning-details.png', fullPage: true })
  await page.getByRole('link', { name: 'برنامه‌ریزی قدم‌های بعدی' }).click()
  await expect(page).toHaveURL(new RegExp(`/planning\\?goalId=${goal.id}`))
  await expect(page.getByText(`این برنامه‌ریزی برای «${intention}» است`)).toBeVisible()
  // Manual creation stays one click away from the planning entry.
  await page.getByRole('button', { name: 'خودم دستی می‌سازم' }).click()
  await expect(page.getByRole('dialog', { name: 'چه چیزی اضافه می‌کنید؟' })).toBeVisible()
})

test('clarifying questions are answered before a draft exists', async ({ page }) => {
  const session = await page.request.post('/api/v1/dev/test-session', { data: {}, headers: { Origin: origin } })
  expect(session.ok()).toBeTruthy()
  type Active = { draft: { id: string; revision: number } | null; attempt: { id: string } | null; clarification: { id: string } | null }
  const activeFlow = async () => await (await page.request.get('/api/v1/planning/active')).json() as Active
  const cancelDraft = async (draft: { id: string; revision: number }) => await page.request.post(`/api/v1/planning/drafts/${draft.id}/cancel`, {
    data: { expectedRevision: draft.revision }, headers: { Origin: origin, 'Idempotency-Key': randomUUID() },
  })

  const before = await activeFlow()
  if (before.attempt) {
    await page.request.post(`/api/v1/planning/attempts/${before.attempt.id}/cancel`, { data: {}, headers: { Origin: origin } })
  }
  if (before.draft) await cancelDraft(before.draft)

  // The sample generator asks its questions only when this development-only fixture is requested.
  await page.route('**/api/v1/planning/attempts', route => route.continue({
    headers: { ...route.request().headers(), 'x-planning-fixture': 'clarify' },
  }))

  const intention = `تمرین منظم ${Date.now()}`
  await page.goto('/planning')
  await page.getByLabel('می‌خواهید روی چه چیزی پیش بروید؟').fill(intention)
  await page.getByRole('button', { name: 'ساخت پیش‌نویس' }).click()

  await expect(page.getByRole('heading', { name: 'چند پرسش پیش از ساخت پیش‌نویس' })).toBeVisible({ timeout: 15_000 })
  await expect(page.getByText('گام ۱ از حداکثر ۳')).toBeVisible()
  await expect(page.getByRole('heading', { name: 'ساختار پیشنهادی' })).toBeHidden()
  await page.screenshot({ path: 'test-results/step-09-clarification.png', fullPage: true })
  // Questions are not a draft, and they survive a reload as the unfinished flow.
  const waiting = await activeFlow()
  expect(waiting.draft).toBeNull()
  expect(waiting.clarification).not.toBeNull()
  await page.reload()
  const firstQuestion = page.getByLabel('هر هفته چند روز می‌توانید برای این کار وقت بگذارید؟')
  await expect(firstQuestion).toBeVisible()

  await page.getByRole('button', { name: 'ادامه' }).click()
  await expect(page.getByText(/دست‌کم به یکی از پرسش‌ها پاسخ دهید/)).toBeVisible()
  await firstQuestion.fill('سه روز در هفته')
  await page.getByRole('button', { name: 'ادامه' }).click()

  await expect(page.getByRole('heading', { name: 'ساختار پیشنهادی' })).toBeVisible({ timeout: 15_000 })
  await expect(page.getByRole('article', { name: intention, exact: true })).toBeVisible()
  const after = await activeFlow()
  expect(after.clarification).toBeNull()
  if (!after.draft) throw new Error('The answered questions did not lead to a draft.')
  // Leave the shared test user without an unfinished planning flow.
  expect((await cancelDraft(after.draft)).ok()).toBeTruthy()
})
