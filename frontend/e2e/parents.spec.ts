import { randomUUID } from 'node:crypto'
import { expect, type Page, test } from '@playwright/test'

const origin = 'http://127.0.0.1:5174'

async function post(page: Page, path: string, data: unknown) {
  const response = await page.request.post(`/api/v1/${path}`, { data, headers: { Origin: origin, 'Idempotency-Key': randomUUID() } })
  expect(response.ok(), `${path}: ${await response.text()}`).toBeTruthy()
  return response.json()
}

const task = (title: string, place: { goalId?: string; projectId?: string }, plannedDate: string) => ({
  title, description: null, goalId: place.goalId ?? null, projectId: place.projectId ?? null, plannedDate, deadline: null,
  sequenceId: null, sequenceOrder: null, isProtected: false,
})

// A Project is never completed by hand: its last Task done completes it (owner decision 2026-10-19).
test('create Goal and child Project, the Project completes by its Task, then explicitly achieve Goal', async ({ page }) => {
  const session = await page.request.post('/api/v1/dev/test-session', {
    data: {}, headers: { Origin: origin },
  })
  expect(session.ok()).toBeTruthy()
  await page.goto('/goals')

  const suffix = String(Date.now())
  const goalTitle = `هدف مرورگر ${suffix}`
  const projectTitle = `پروژه مرورگر ${suffix}`

  await page.getByRole('button', { name: 'هدف جدید' }).click()
  await page.getByLabel('عنوان هدف').fill(goalTitle)
  await page.getByLabel('نتیجه مطلوب').fill('یک نتیجه روشن و قابل تشخیص')
  await page.getByRole('button', { name: 'ساخت هدف' }).click()
  await expect(page.getByRole('link', { name: new RegExp(goalTitle) })).toBeVisible()

  // Goals and Projects are one place; the switch on the photograph moves between them.
  await page.getByRole('navigation', { name: 'نمای هدف‌ها و پروژه‌ها' }).getByRole('link', { name: /پروژه‌ها/ }).click()
  await expect(page).toHaveURL(/\/projects$/)
  await page.getByRole('button', { name: 'پروژه جدید' }).click()
  await page.getByLabel('عنوان پروژه').fill(projectTitle)
  await page.getByLabel('معنای تکمیل (اختیاری)').fill('تحویل خروجی محدود')
  await page.getByLabel('هدف بالادست (اختیاری)').click()
  await page.getByRole('option', { name: goalTitle }).click()
  await page.getByRole('button', { name: 'ساخت پروژه' }).click()
  await expect(page.getByRole('link', { name: new RegExp(projectTitle) })).toBeVisible()

  await page.getByRole('navigation', { name: 'ناوبری اصلی' }).getByRole('link', { name: 'هدف‌ها و پروژه‌ها' }).click()
  await page.getByRole('link', { name: new RegExp(goalTitle) }).click()
  await page.getByRole('button', { name: 'به این هدف رسیدم' }).click()
  const blocked = page.getByRole('dialog', { name: 'رسیدن به هدف' })
  await expect(blocked.getByText('این‌ها هنوز زیر این هدف فعال‌اند.')).toBeVisible()
  await expect(blocked.getByRole('button', { name: 'تأیید تحقق هدف' })).toHaveCount(0)
  await page.screenshot({ path: 'test-results/step-17-goal-terminal-blocked.png' })
  await blocked.getByRole('link', { name: `باز کن: ${projectTitle}` }).click()

  await expect(page.getByRole('button', { name: 'این پروژه تمام شد' })).toHaveCount(0)
  const projectId = page.url().split('/projects/')[1]
  const { localDate } = await (await page.request.get('/api/v1/today')).json() as { localDate: string }
  const only = await post(page, 'tasks', task(`تنها کار پروژه ${suffix}`, { projectId }, localDate))
  await page.goto('/today')
  await page.getByRole('button', { name: `تکمیل کار: ${only.title}` }).click()
  await page.goto(`/projects/${projectId}`)
  await expect(page.getByText('تکمیل‌شده').first()).toBeVisible()
  await expect(page.getByText('۱۰۰٪')).toBeVisible()
  await page.screenshot({ path: 'test-results/project-completed-by-progress.png' })
  await page.getByRole('link', { name: `هدف: ${goalTitle}` }).click()

  await page.getByRole('button', { name: 'به این هدف رسیدم' }).click()
  await page.getByRole('button', { name: 'تأیید تحقق هدف' }).click()
  await expect(page.getByText('محقق‌شده')).toBeVisible()
})

// Stopping a Goal ends everything open under it, exactly as previewed, and it all leaves Today.
test('stopping a Goal stops its Project, drops its open Tasks and stops its Routines', async ({ page }) => {
  await page.request.post('/api/v1/dev/test-session', { data: {}, headers: { Origin: origin } })
  const { localDate } = await (await page.request.get('/api/v1/today')).json() as { localDate: string }
  const n = String(Date.now()).slice(-6)
  const goal = await post(page, 'goals', { title: `هدف توقف ${n}`, desiredOutcome: 'یک نتیجه روشن', targetDate: null, reviewDate: null })
  const project = await post(page, 'projects', { title: `پروژه توقف ${n}`, completionMeaning: null, goalId: goal.id, targetDate: null, reviewDate: null })
  const open = await post(page, 'tasks', task(`کار باز ${n}`, { projectId: project.id }, localDate))
  const direct = await post(page, 'tasks', task(`کار مستقیم ${n}`, { goalId: goal.id }, localDate))
  const routine = await post(page, 'routines', {
    title: `روتین توقف ${n}`, description: null, goalId: null, projectId: project.id, recurrence: { type: 'DAILY' }, timesOfDay: [],
  })

  await page.goto(`/goals/${goal.id}`)
  await page.getByRole('button', { name: 'توقف هدف' }).click()
  const dialog = page.getByRole('dialog', { name: 'توقف هدف' })
  for (const title of [project.title, open.title, direct.title, routine.title]) await expect(dialog.getByText(title)).toBeVisible()
  await page.screenshot({ path: 'test-results/goal-stop-preview.png' })
  await dialog.getByRole('button', { name: 'تأیید توقف هدف' }).click()
  await expect(dialog).toBeHidden()
  await expect.poll(async () => (await (await page.request.get(`/api/v1/goals/${goal.id}`)).json()).status).toBe('ABANDONED')

  expect((await (await page.request.get(`/api/v1/projects/${project.id}`)).json()).status).toBe('STOPPED')
  expect((await (await page.request.get(`/api/v1/tasks/${open.id}`)).json()).status).toBe('DROPPED')
  expect((await (await page.request.get(`/api/v1/routines/${routine.id}`)).json()).status).toBe('STOPPED')
  await page.goto('/today')
  await expect(page.getByRole('main')).toBeVisible()
  for (const title of [open.title, direct.title, routine.title]) await expect(page.getByText(title)).toHaveCount(0)
})
