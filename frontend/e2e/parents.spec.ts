import { expect, test } from '@playwright/test'

const origin = 'http://127.0.0.1:5174'

test('create Goal and child Project, resolve blocker, then explicitly achieve Goal', async ({ page }) => {
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

  await page.getByRole('button', { name: 'این پروژه تمام شد' }).click()
  await page.getByRole('button', { name: 'تأیید تکمیل پروژه' }).click()
  await expect(page.getByText('تکمیل‌شده')).toBeVisible()
  await page.getByRole('link', { name: `هدف: ${goalTitle}` }).click()

  await page.getByRole('button', { name: 'به این هدف رسیدم' }).click()
  await page.getByRole('button', { name: 'تأیید تحقق هدف' }).click()
  await expect(page.getByText('محقق‌شده')).toBeVisible()
})
