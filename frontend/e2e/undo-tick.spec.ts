import { randomUUID } from 'node:crypto'
import { expect, type Page, test } from '@playwright/test'

const origin = 'http://127.0.0.1:5174'

async function post(page: Page, path: string, data: unknown) {
  const response = await page.request.post(`/api/v1/${path}`, { data, headers: { Origin: origin, 'Idempotency-Key': randomUUID() } })
  expect(response.ok(), `${path}: ${await response.text()}`).toBeTruthy()
  return response.json()
}

// A done tick is undone by pressing it again (018, 024 §8 notes).
test('a done Task and a done Routine slot on Today are undone on the same tick', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 900 })
  await page.request.post('/api/v1/dev/test-session', { data: {}, headers: { Origin: origin } })
  const { localDate } = await (await page.request.get('/api/v1/today')).json() as { localDate: string }
  const n = String(Date.now()).slice(-6)
  const task = await post(page, 'tasks', {
    title: `پست نامه ${n}`, description: null, goalId: null, projectId: null, plannedDate: localDate, deadline: null,
    sequenceId: null, sequenceOrder: null, isProtected: false,
  })
  const routine = await post(page, 'routines', {
    title: `آب دادن گلدان ${n}`, description: null, goalId: null, projectId: null, recurrence: { type: 'DAILY' }, timesOfDay: [],
  })

  await page.goto('/today')
  await page.getByRole('button', { name: `تکمیل کار: ${task.title}` }).click()
  const undoTask = page.getByRole('button', { name: `لغو انجام: ${task.title}` })
  await expect(undoTask).toBeVisible()
  await undoTask.click()
  await expect(page.getByText('کار به کارهای باز برگشت.')).toBeVisible()
  await expect(page.getByRole('button', { name: `تکمیل کار: ${task.title}` })).toBeVisible()
  const reopened = await (await page.request.get(`/api/v1/tasks/${task.id}`)).json() as { status: string; plannedDate: string }
  expect(reopened).toMatchObject({ status: 'ACTIVE', plannedDate: localDate })

  await page.getByRole('button', { name: `انجام شد: ${routine.title}، امروز` }).click()
  const undoSlot = page.getByRole('button', { name: `لغو انجام: ${routine.title}، امروز` })
  await expect(undoSlot).toBeVisible()
  await page.screenshot({ path: 'test-results/undo-tick-done.png' })
  await undoSlot.click()
  await expect(page.getByText('انجام این نوبت لغو شد.')).toBeVisible()
  await expect(page.getByRole('button', { name: `انجام شد: ${routine.title}، امروز` })).toBeVisible()
})

// The page keeps its layout while a sheet is open, so crossing the breakpoint loses nothing.
test('an open sheet and what was typed in it survive the window crossing the desktop breakpoint', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.request.post('/api/v1/dev/test-session', { data: {}, headers: { Origin: origin } })
  const { localDate } = await (await page.request.get('/api/v1/today')).json() as { localDate: string }
  const task = await post(page, 'tasks', {
    title: `تمدید بیمه ${String(Date.now()).slice(-6)}`, description: null, goalId: null, projectId: null,
    plannedDate: localDate, deadline: null, sequenceId: null, sequenceOrder: null, isProtected: false,
  })

  await page.goto(`/tasks/${task.id}`)
  await expect(page.getByRole('complementary', { name: 'جزئیات کار' })).toBeVisible()
  await page.getByRole('button', { name: 'ویرایش کار' }).click()
  const sheet = page.getByRole('dialog', { name: 'ویرایش کار' })
  await sheet.getByLabel('عنوان کار').fill('تمدید بیمه‌ی ماشین، نیمه‌نوشته')
  // Narrower than the desktop layout, as when a tablet turns upright.
  await page.setViewportSize({ width: 800, height: 1100 })
  await expect(sheet).toBeVisible()
  await expect(sheet.getByLabel('عنوان کار')).toHaveValue('تمدید بیمه‌ی ماشین، نیمه‌نوشته')
  await page.setViewportSize({ width: 1440, height: 900 })
  await expect(sheet.getByLabel('عنوان کار')).toHaveValue('تمدید بیمه‌ی ماشین، نیمه‌نوشته')

  // Closed at the phone width, the page takes the phone layout.
  await page.setViewportSize({ width: 800, height: 1100 })
  await sheet.getByRole('button', { name: 'انصراف' }).click()
  await expect(sheet).toBeHidden()
  await expect(page.getByRole('complementary', { name: 'جزئیات کار' })).toHaveCount(0)
  await expect(page.getByRole('heading', { name: task.title })).toBeVisible()
})
