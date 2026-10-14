import { randomUUID } from 'node:crypto'
import { expect, test } from '@playwright/test'

const origin = 'http://127.0.0.1:5174'

// Guide 1 promises a plan "in under 2 minutes" (Discussion 028 §4.3). This measures it as a person
// would meet it: from the first word typed to a reviewable draft, with typing and answering at a
// human pace, against whatever generator the backend runs. It is opt-in because only a run against
// the real provider means anything: TIDYSENSE_MEASURE_TIME_TO_DRAFT=1 (runs, the default 3).
const runs = Number(process.env.TIDYSENSE_MEASURE_TIME_TO_DRAFT ?? 0)
const intention = 'می‌خواهم تا آخر پاییز آلمانی‌ام به سطحی برسد که بتوانم در جلسه‌های کاری حرف بزنم'
const typingDelayMs = 150
const thinkingMs = 2_500

test('time from the first word to a reviewable draft', async ({ page }) => {
  test.skip(!runs, 'Set TIDYSENSE_MEASURE_TIME_TO_DRAFT to measure (a real provider is needed for the result to mean anything).')
  test.setTimeout(runs * 240_000)
  await page.setViewportSize({ width: 390, height: 844 })
  await page.request.post('/api/v1/dev/test-session', { data: {}, headers: { Origin: origin } })
  // With the sample generator, a development fixture can stand in for a model that asks (e.g. "clarify").
  const fixture = process.env.TIDYSENSE_PLANNING_FIXTURE
  if (fixture) {
    await page.route('**/api/v1/planning/attempts', route => route.continue({
      headers: { ...route.request().headers(), 'x-planning-fixture': fixture },
    }))
  }
  const results: Array<{ seconds: number; turns: number }> = []

  for (let run = 0; run < runs; run++) {
    const active = await (await page.request.get('/api/v1/planning/active')).json() as
      { draft: { id: string; revision: number } | null; attempt: { id: string } | null }
    if (active.attempt) await page.request.post(`/api/v1/planning/attempts/${active.attempt.id}/cancel`, { data: {}, headers: { Origin: origin } })
    if (active.draft) {
      await page.request.post(`/api/v1/planning/drafts/${active.draft.id}/cancel`, {
        data: { expectedRevision: active.draft.revision }, headers: { Origin: origin, 'Idempotency-Key': randomUUID() },
      })
    }
    await page.goto('/planning')
    const input = page.getByLabel('روی چه چیزی می‌خواهید پیش بروید؟')
    await input.click()
    const started = Date.now()
    await input.pressSequentially(intention, { delay: typingDelayMs })
    await page.getByRole('button', { name: 'ساخت پیش‌نویس' }).click()

    let turns = 0
    const draft = page.getByRole('heading', { name: 'ساختار پیشنهادی' })
    const questions = page.getByRole('heading', { name: /پرسش کوتاه$/ })
    while (true) {
      await expect(draft.or(questions)).toBeVisible({ timeout: 150_000 })
      if (await draft.isVisible()) break
      turns++
      // A person reads each question, then takes its first option or writes three words.
      for (const card of await page.locator('.question-card').all()) {
        await page.waitForTimeout(thinkingMs)
        const options = card.getByRole('button').filter({ hasNotText: 'چیز دیگر…' })
        if (await options.count() > 0) await options.first().click()
        else {
          await card.getByRole('button', { name: 'چیز دیگر…' }).click()
          await card.getByRole('textbox').pressSequentially('هنوز مطمئن نیستم', { delay: typingDelayMs })
        }
      }
      await page.getByRole('button', { name: 'پیش‌نویس را بساز' }).click()
      await expect(questions).toBeHidden({ timeout: 150_000 })
    }
    results.push({ seconds: (Date.now() - started) / 1000, turns })
  }

  const sorted = results.map(x => x.seconds).sort((a, b) => a - b)
  console.log(JSON.stringify({ runs: results, medianSeconds: sorted[Math.floor(sorted.length / 2)] }))
  await test.info().attach('time-to-draft', { body: JSON.stringify(results), contentType: 'application/json' })
})
