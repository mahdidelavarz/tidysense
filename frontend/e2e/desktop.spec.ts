import { randomUUID } from 'node:crypto'
import { expect, type Page, test } from '@playwright/test'

const origin = 'http://127.0.0.1:5174'

async function post(page: Page, path: string, data: unknown) {
  const response = await page.request.post(`/api/v1/${path}`, { data, headers: { Origin: origin, 'Idempotency-Key': randomUUID() } })
  expect(response.ok(), `${path}: ${await response.text()}`).toBeTruthy()
  return response.json()
}

const shift = (iso: string, days: number) => {
  const date = new Date(`${iso}T12:00:00Z`)
  date.setUTCDate(date.getUTCDate() + days)
  return date.toISOString().slice(0, 10)
}

const task = (title: string, extra: Record<string, unknown> = {}) => ({
  title, description: null, goalId: null, projectId: null, plannedDate: null, deadline: null, sequenceId: null,
  sequenceOrder: null, isProtected: false, ...extra,
})

async function noSidewaysScroll(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
}

// STEP-21: every desktop board at 1440px, built from the phone's data and actions (028 §5).
test('desktop layouts show the phone’s data and actions at 1440px, by pointer and keyboard', async ({ page }) => {
  test.setTimeout(120_000)
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.request.post('/api/v1/dev/test-session', { data: {}, headers: { Origin: origin } })
  const { localDate: today } = await (await page.request.get('/api/v1/today')).json() as { localDate: string }
  // The test account is shared by every scenario, so each title here is its own.
  const n = String(Date.now()).slice(-6)
  const names = { goal: `آلمانی ${n}`, project: `آمادگی آزمون ${n}`, words: `تمرین لغات ${n}`, late: `ارسال فاکتور ${n}`, walk: `پیاده‌روی ${n}`, bread: `خرید نان ${n}` }
  const goal = await post(page, 'goals', { title: names.goal, desiredOutcome: 'در جلسه حرف بزنم', targetDate: shift(today, 40), reviewDate: null })
  const project = await post(page, 'projects', { title: names.project, completionMeaning: null, goalId: goal.id, targetDate: shift(today, 12), reviewDate: null })
  await post(page, 'tasks', task(names.words, { projectId: project.id, plannedDate: today, deadline: shift(today, 3) }))
  await post(page, 'tasks', task(names.late, { plannedDate: shift(today, -1) }))
  await post(page, 'routines', {
    title: names.walk, description: null, goalId: goal.id, projectId: null, timesOfDay: ['23:30'], effectiveFromLocalDate: null,
    recurrence: { type: 'DAILY', daysOfWeek: null, dayOfMonth: null },
  })

  // Today: the tiles, the deadlines and the Goal beside the day; a Task added and completed by keyboard alone.
  await page.goto('/today')
  await expect(page.getByRole('region', { name: 'خلاصه‌ی امروز' })).toBeVisible()
  await expect(page.getByRole('region', { name: 'مهلت‌های نزدیک' })).toContainText(names.words)
  await expect(page.getByRole('region', { name: 'هدف‌ها' })).toContainText(names.goal)
  await expect(page.getByRole('searchbox')).toHaveCount(0)
  const add = page.getByLabel('کار تازه برای این روز')
  for (let step = 0; step < 300 && !(await add.evaluate(element => element === document.activeElement)); step++) await page.keyboard.press('Tab')
  await expect(add).toBeFocused()
  await page.keyboard.type(names.bread)
  await page.keyboard.press('Enter')
  const list = page.getByRole('region', { name: 'کارهای امروز' })
  await expect(list.getByRole('heading', { name: names.bread })).toBeVisible()
  await list.getByRole('button', { name: `تکمیل کار: ${names.bread}` }).focus()
  await page.keyboard.press('Enter')
  await expect(list.getByRole('listitem').filter({ hasText: names.bread }).getByRole('img', { name: 'انجام شد' })).toBeVisible()
  await noSidewaysScroll(page)
  for (const theme of ['light', 'dark'] as const) {
    await page.emulateMedia({ colorScheme: theme })
    await page.screenshot({ path: `test-results/desktop-today-${theme}.png`, fullPage: true })
  }
  await page.emulateMedia({ colorScheme: 'light' })

  // Tasks: views narrow the same list; a Task opens beside it.
  await page.getByRole('navigation', { name: 'ناوبری اصلی' }).getByRole('link', { name: 'کارها' }).click()
  const views = page.getByRole('navigation', { name: 'نماهای کارها' })
  await views.getByRole('button', { name: /از روزهای قبل/ }).click()
  await expect(page.getByRole('region', { name: 'از روزهای قبل' }).first()).toContainText(names.late)
  await page.getByRole('link', { name: names.late }).click()
  await expect(page).toHaveURL(/\/tasks\/[0-9a-f-]{36}$/)
  await expect(page.getByRole('complementary', { name: 'جزئیات کار' }).getByRole('heading', { name: names.late })).toBeVisible()
  await noSidewaysScroll(page)
  await page.screenshot({ path: 'test-results/desktop-tasks.png', fullPage: true })

  // Routines: the week grid, today's slot completed in place, the Routine beside it.
  await page.goto('/routines')
  const week = page.getByRole('table', { name: 'روتین‌های این هفته به تفکیک روز' })
  await week.getByRole('button', { name: `انجام نوبت ۲۳:۳۰ ${names.walk}` }).click()
  await expect(week.getByRole('button', { name: `انجام‌شده: نوبت ۲۳:۳۰ ${names.walk}` })).toBeDisabled()
  await week.getByRole('link', { name: names.walk }).click()
  await expect(page.getByRole('complementary', { name: 'جزئیات روتین' }).getByRole('heading', { name: names.walk })).toBeVisible()
  await noSidewaysScroll(page)
  await page.screenshot({ path: 'test-results/desktop-routines.png', fullPage: true })

  // Goals: the Project on the timeline and facts that need a look, with no forecast.
  await page.goto('/goals')
  await expect(page.getByRole('region', { name: 'خط زمانی پروژه‌ها' })).toContainText(names.project)
  await expect(page.getByRole('complementary', { name: 'نیاز به توجه' })).toContainText(`«${names.project}»: ۱۲ روز مانده`)
  await expect(page.getByText(/با این سرعت/)).toHaveCount(0)
  await noSidewaysScroll(page)
  await page.screenshot({ path: 'test-results/desktop-goals.png', fullPage: true })

  // Planning: an empty road until there is a draft, then the draft's own items on it.
  await page.goto('/planning')
  await expect(page.getByRole('complementary', { name: 'مسیر تا هدف' })).toContainText('بعد از ساخت پیش‌نویس')
  await page.getByLabel('روی چه چیزی می‌خواهید پیش بروید؟').fill('می‌خواهم این ماه سه بار در هفته ورزش کنم')
  await page.getByRole('button', { name: 'ساخت پیش‌نویس' }).click()
  await expect(page.getByRole('heading', { name: 'ساختار پیشنهادی' })).toBeVisible({ timeout: 30_000 })
  await expect(page.getByRole('list', { name: 'موارد پیش‌نویس به ترتیب تاریخ' })).toBeVisible()
  await noSidewaysScroll(page)
  await page.screenshot({ path: 'test-results/desktop-planning.png', fullPage: true })
  await page.getByRole('button', { name: 'لغو' }).last().click()

  // Reconcile: the earlier days, the lanes, and today after a tap of «امروز».
  await page.goto('/reconcile')
  await expect(page.getByRole('region', { name: 'روزهایی که کارشان مانده' })).toContainText('دیروز')
  await page.getByRole('button', { name: `امروز: ${names.late}` }).click()
  const after = page.getByRole('complementary', { name: 'امروز بعد از بازبینی' })
  await expect(after.getByText(names.late).locator('..')).toContainText('تازه')
  await noSidewaysScroll(page)
  for (const theme of ['light', 'dark'] as const) {
    await page.emulateMedia({ colorScheme: theme })
    await page.screenshot({ path: `test-results/desktop-reconcile-${theme}.png`, fullPage: true })
  }
})
