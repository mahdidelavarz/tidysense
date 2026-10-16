import { randomUUID } from 'node:crypto'
import { expect, type Page, test } from '@playwright/test'

const origin = 'http://127.0.0.1:5174'

async function post(page: Page, path: string, data: unknown) {
  const response = await page.request.post(`/api/v1/${path}`, { data, headers: { Origin: origin, 'Idempotency-Key': randomUUID() } })
  expect(response.ok(), `${path}: ${await response.text()}`).toBeTruthy()
  return response.json()
}

const task = (title: string, goalId: string) => ({
  title, description: null, goalId, projectId: null, plannedDate: null, deadline: null, sequenceId: null,
  sequenceOrder: null, isProtected: false,
})

// STEP-23: a sequence built from two existing Tasks, then changed and undone by hand (029 §9.2).
for (const [layout, width] of [['phone', 390], ['desktop', 1440]] as const) {
  test(`two existing Tasks become a sequence and come apart again by hand, on ${layout}`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 })
    await page.request.post('/api/v1/dev/test-session', { data: {}, headers: { Origin: origin } })
    const n = String(Date.now()).slice(-6)
    const goal = await post(page, 'goals', { title: `اسباب‌کشی ${n}`, desiredOutcome: 'در خانه‌ی تازه', targetDate: null, reviewDate: null })
    const boxes = await post(page, 'tasks', task(`خرید کارتن ${n}`, goal.id))
    const books = await post(page, 'tasks', task(`بسته‌بندی کتاب‌ها ${n}`, goal.id))

    await page.goto(`/tasks/${books.id}`)
    await page.getByRole('button', { name: 'بعد از…' }).click()
    const sheet = page.getByRole('dialog', { name: 'بعد از کار دیگری' })
    await sheet.getByRole('button', { name: /بعد از کدام کار؟/ }).click()
    await sheet.getByRole('option', { name: boxes.title }).click()
    await expect(sheet.getByText(`«${books.title}» بعد از «${boxes.title}» می‌آید و تا انجام آن منتظر می‌ماند.`)).toBeVisible()
    await expect(sheet.getByRole('listitem').nth(1)).toContainText('منتظر می‌ماند')
    // The viewport only: a full-page capture briefly resizes the window to 1×1, which crosses the
    // desktop breakpoint, swaps the page's layout and so closes the open sheet.
    await page.screenshot({ path: `test-results/step-23-follow-${layout}.png` })
    await sheet.getByRole('button', { name: 'تأیید' }).click()
    await expect(sheet).toBeHidden()

    // The Task now waits for the first; the order is shown on its page.
    const order = page.getByRole('region', { name: 'ترتیب انجام' })
    await expect(order).toContainText('مرحله‌ی ۲ از ۲')
    await expect(order).toContainText(`منتظر «${boxes.title}» است.`)
    await expect(page.getByRole('button', { name: 'انجام شد' })).toBeDisabled()
    await page.screenshot({ path: `test-results/step-23-sequence-${layout}.png` })

    // It moves earlier, so the other one waits instead.
    await order.getByRole('button', { name: 'زودتر' }).click()
    const move = page.getByRole('dialog', { name: 'یک قدم زودتر' })
    await expect(move.getByRole('listitem').first()).toContainText(books.title)
    await move.getByRole('button', { name: 'تأیید' }).click()
    await expect(order).toContainText('مرحله‌ی ۱ از ۲')
    await expect(page.getByRole('button', { name: 'انجام شد' })).toBeEnabled()

    // Out of the order: both stand on their own again.
    await order.getByRole('button', { name: 'بیرون از ترتیب' }).click()
    const leave = page.getByRole('dialog', { name: 'بیرون از ترتیب' })
    await expect(leave.getByText(/دیگر ترتیبی نمی‌ماند/)).toBeVisible()
    await leave.getByRole('button', { name: 'تأیید' }).click()
    await expect(page.getByRole('button', { name: 'بعد از…' })).toBeVisible()
    const other = await (await page.request.get(`/api/v1/tasks/${boxes.id}`)).json() as { sequenceId: string | null }
    expect(other.sequenceId).toBeNull()
  })
}

test('a new Task is made to follow an existing one from the create form', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.request.post('/api/v1/dev/test-session', { data: {}, headers: { Origin: origin } })
  const n = String(Date.now()).slice(-6)
  const goal = await post(page, 'goals', { title: `پایان‌نامه ${n}`, desiredOutcome: 'دفاع', targetDate: null, reviewDate: null })
  const data = await post(page, 'tasks', task(`جمع‌آوری داده ${n}`, goal.id))

  await page.goto('/tasks')
  await page.getByRole('button', { name: 'کار جدید' }).click()
  const sheet = page.getByRole('dialog', { name: 'کار جدید' })
  await sheet.getByLabel('چه کاری باید انجام شود؟').fill(`تحلیل داده ${n}`)
  // A few parents are chips; with more of them on the account the rest are found by search.
  const parents = sheet.getByRole('group', { name: 'برای کدام هدف یا پروژه؟' })
  const chip = parents.getByRole('button', { name: goal.title })
  const search = parents.getByRole('button', { name: 'جست‌وجوی هدف یا پروژه' })
  await expect(chip.or(search).first()).toBeVisible()
  if (await chip.isVisible()) await chip.click()
  else {
    await search.click()
    await sheet.getByRole('button', { name: /وابستگی/ }).click()
    await sheet.getByPlaceholder('نام هدف یا پروژه…').fill(goal.title)
    await sheet.getByRole('option', { name: goal.title }).click()
  }
  await sheet.getByRole('button', { name: /جزئیات بیشتر/ }).click()
  await sheet.getByRole('button', { name: /ترتیب انجام \(اختیاری\)/ }).click()
  await sheet.getByRole('option', { name: `بعد از «${data.title}»` }).click()
  await sheet.getByRole('button', { name: 'افزودن به امروز' }).click()
  await expect(sheet).toBeHidden()

  const tasks = await (await page.request.get('/api/v1/tasks?limit=100')).json() as
    { items: { title: string; sequenceId: string | null; sequenceOrder: number | null; isBlocked: boolean }[] }
  const created = tasks.items.find(x => x.title === `تحلیل داده ${n}`)
  const first = tasks.items.find(x => x.title === data.title)
  expect(created?.sequenceId).toBeTruthy()
  expect(created?.sequenceId).toBe(first?.sequenceId)
  expect(created?.isBlocked).toBe(true)
})
