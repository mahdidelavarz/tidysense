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
  await page.getByLabel('روی چه چیزی می‌خواهید پیش بروید؟').fill(intention)
  await page.getByRole('button', { name: 'ساخت پیش‌نویس' }).click()

  // The draft appears only once it is complete and validated.
  await expect(page.getByRole('heading', { name: 'ساختار پیشنهادی' })).toBeVisible({ timeout: 15_000 })
  await expect(page.getByText('پیش‌نویس؛ هنوز چیزی ساخته نشده')).toBeVisible()
  await expect(page.getByRole('list', { name: 'مراحل برنامه‌ریزی' }).getByRole('listitem').nth(2)).toHaveAttribute('aria-current', 'step')
  await expect(page.getByRole('article', { name: intention, exact: true })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'هفت روز پیش رو' })).toBeVisible()
  await page.screenshot({ path: 'test-results/step-08-draft-review.png', fullPage: true })

  // Nothing canonical exists while the draft is only reviewed and edited.
  expect((await get<Listed>('goals?limit=100')).items.some(goal => goal.title === intention)).toBe(false)

  // Planning details are approved separately from the work.
  await page.getByRole('button', { name: /^یادم بماند: وسیله در دسترس/ }).click()
  await expect(page.getByRole('button', { name: /^یادم نماند: وسیله در دسترس/ })).toHaveAttribute('aria-pressed', 'false')

  await page.getByRole('button', { name: 'ویرایش: روشن‌کردن اولین قدم' }).click()
  const sheet = page.getByRole('dialog', { name: 'ویرایش کار پیشنهادی' })
  await sheet.getByLabel('عنوان').fill(editedTitle)
  await sheet.getByRole('button', { name: 'ذخیره در پیش‌نویس' }).click()
  await expect(sheet).toBeHidden()
  await expect(page.getByRole('checkbox', { name: `در برنامه باشد: ${editedTitle}` })).toBeVisible()
  expect((await get<Listed>('tasks?limit=100')).items.some(task => task.title === editedTitle)).toBe(false)

  // One server preview, one explicit confirmation.
  await page.getByRole('button', { name: 'مرور نهایی و تأیید' }).click()
  const review = page.getByRole('dialog', { name: 'مرور نهایی و تأیید' })
  await expect(review.getByRole('list', { name: 'مواردی که ساخته می‌شوند' })).toBeVisible()
  await expect(review.getByText('۴ از ۴')).toBeVisible()
  await expect(review.getByText(/روزهای غیرقابل‌استفاده هفته/)).toBeVisible()
  await page.screenshot({ path: 'test-results/step-08-confirm.png', fullPage: true })
  await review.getByRole('button', { name: 'تأیید و ساخت ۷ مورد' }).click()
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
  await expect(page.getByRole('button', { name: intention, exact: true })).toHaveAttribute('aria-pressed', 'true')
  // Manual creation stays one click away from the planning entry.
  await page.getByRole('button', { name: 'یا خودم دستی می‌سازم' }).click()
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
  await page.getByLabel('روی چه چیزی می‌خواهید پیش بروید؟').fill(intention)
  await page.getByRole('button', { name: 'ساخت پیش‌نویس' }).click()

  await expect(page.getByRole('heading', { name: 'چهار پرسش کوتاه' })).toBeVisible({ timeout: 15_000 })
  await expect(page.getByRole('heading', { name: 'ساختار پیشنهادی' })).toBeHidden()
  await page.screenshot({ path: 'test-results/step-09-clarification.png', fullPage: true })
  // Questions are not a draft, and they survive a reload as the unfinished flow.
  const waiting = await activeFlow()
  expect(waiting.draft).toBeNull()
  expect(waiting.clarification).not.toBeNull()
  await page.reload()
  const parts = page.getByRole('group', { name: 'روی کدام بخش بیشتر کار کنیم؟' })
  await expect(parts).toBeVisible()

  // Both options and «خودت بنویس» on the first, one date choice, and the two open questions in words (029 §7).
  await parts.getByRole('button', { name: 'مکالمه' }).click()
  await parts.getByRole('button', { name: 'نوشتن' }).click()
  await parts.getByRole('button', { name: 'خودت بنویس' }).click()
  await page.getByLabel('پاسخ خودتان: روی کدام بخش بیشتر کار کنیم؟').fill('تلفظ')
  await page.getByRole('group', { name: 'آیا تاریخ مشخصی برای رسیدن به نتیجه در نظر دارید؟' }).getByRole('button', { name: 'تا سه ماه دیگر' }).click()
  await page.getByLabel('پاسخ خودتان: کدام روزهای هفته برای این کار وقت دارید؟').fill('شنبه و سه‌شنبه')
  await page.getByLabel('پاسخ خودتان: روزی چقدر وقت می‌گذارید؟').fill('یک ساعت')
  await expect(page.getByText('۴ از ۴ پاسخ')).toBeVisible()
  await page.screenshot({ path: 'test-results/step-18-questions.png', fullPage: true })
  await page.getByRole('button', { name: 'پیش‌نویس را بساز' }).click()

  await expect(page.getByRole('heading', { name: 'ساختار پیشنهادی' })).toBeVisible({ timeout: 15_000 })
  await expect(page.getByRole('article', { name: intention, exact: true })).toBeVisible()

  // «اصلاح» (013 §10): the same flow made again with what to change; it drafts at once, asking nothing.
  await page.getByRole('button', { name: 'اصلاح برنامه' }).click()
  const redo = page.getByRole('dialog', { name: 'اصلاح برنامه' })
  await redo.getByLabel('یا بنویسید چه چیزی عوض شود').fill('جمعه‌ها را خالی بگذار')
  await page.screenshot({ path: 'test-results/planning-redo-sheet.png', fullPage: true })
  await redo.getByRole('button', { name: 'اصلاح کن' }).click()
  await expect(page.getByText(/اصلاح‌شده: جمعه‌ها را خالی بگذار/)).toBeVisible({ timeout: 15_000 })
  await expect(page.getByRole('heading', { name: 'چهار پرسش کوتاه' })).toBeHidden()
  const after = await activeFlow()
  expect(after.clarification).toBeNull()
  if (!after.draft) throw new Error('The answered questions did not lead to a draft.')
  // Leave the shared test user without an unfinished planning flow.
  expect((await cancelDraft(after.draft)).ok()).toBeTruthy()
})

test('a cancelled draft may be rated once, with a reason for a low rating, and only once a day', async ({ page }) => {
  const session = await page.request.post('/api/v1/dev/test-session', { data: {}, headers: { Origin: origin } })
  expect(session.ok()).toBeTruthy()
  const active = await (await page.request.get('/api/v1/planning/active')).json() as
    { draft: { id: string; revision: number } | null; attempt: { id: string } | null }
  if (active.attempt) {
    await page.request.post(`/api/v1/planning/attempts/${active.attempt.id}/cancel`, { data: {}, headers: { Origin: origin } })
  }
  if (active.draft) {
    await page.request.post(`/api/v1/planning/drafts/${active.draft.id}/cancel`, {
      data: { expectedRevision: active.draft.revision }, headers: { Origin: origin, 'Idempotency-Key': randomUUID() },
    })
  }
  const question = page.getByRole('heading', { name: 'از پیش‌نویسی که کنار گذاشتید چقدر راضی بودید؟' })
  const draftAndCancel = async (text: string) => {
    await page.getByLabel('روی چه چیزی می‌خواهید پیش بروید؟').fill(text)
    await page.getByRole('button', { name: 'ساخت پیش‌نویس' }).click()
    await expect(page.getByRole('heading', { name: 'ساختار پیشنهادی' })).toBeVisible({ timeout: 15_000 })
    // Nothing is asked while the draft is under review.
    await expect(question).toHaveCount(0)
    await page.getByRole('button', { name: 'لغو', exact: true }).click()
    await expect(page.getByText('برنامه‌ریزی لغو شد.')).toBeVisible()
  }

  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/planning')
  await draftAndCancel(`پیش‌نویسی برای کنار گذاشتن ${Date.now()}`)
  await expect(question).toBeVisible()
  await page.getByRole('button', { name: 'ضعیف' }).click()
  await page.getByLabel(/چه چیزی خوب نبود؟/).fill('کارها برای یک هفته خیلی زیاد بودند')
  await page.screenshot({ path: 'test-results/step-14-satisfaction.png', fullPage: true })
  await page.getByRole('button', { name: 'ارسال' }).click()
  await expect(page.getByText('ممنون؛ پاسخ شما ثبت شد.')).toBeVisible()

  // A second draft ended the same day is not asked about.
  await page.getByRole('button', { name: 'شروع دوباره' }).click()
  await draftAndCancel(`پیش‌نویس دوم ${Date.now()}`)
  await page.waitForLoadState('networkidle')
  await expect(question).toHaveCount(0)
})
