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

  await page.getByRole('link', { name: 'پروژه‌ها', exact: true }).click()
  await page.getByRole('button', { name: 'پروژه جدید' }).click()
  await page.getByLabel('عنوان پروژه').fill(projectTitle)
  await page.getByLabel('معنای تکمیل (اختیاری)').fill('تحویل خروجی محدود')
  await page.getByLabel('هدف بالادست (اختیاری)').selectOption({ label: goalTitle })
  await page.getByRole('button', { name: 'ساخت پروژه' }).click()
  await expect(page.getByRole('link', { name: new RegExp(projectTitle) })).toBeVisible()

  await page.getByRole('link', { name: 'هدف‌ها', exact: true }).click()
  await page.getByRole('link', { name: new RegExp(goalTitle) }).click()
  await page.getByRole('button', { name: 'تحقق هدف' }).click()
  await expect(page.getByText(/ابتدا پروژه‌های فعال/)).toBeVisible()
  await page.getByRole('link', { name: 'مشاهده پروژه فعال' }).click()

  await page.getByRole('button', { name: 'تکمیل پروژه' }).click()
  await page.getByRole('button', { name: 'تأیید تکمیل پروژه' }).click()
  await expect(page.getByText('تکمیل‌شده')).toBeVisible()
  await page.getByRole('link', { name: 'مشاهده هدف' }).click()

  await page.getByRole('button', { name: 'تحقق هدف' }).click()
  await page.getByRole('button', { name: 'تأیید تحقق هدف' }).click()
  await expect(page.getByText('محقق‌شده')).toBeVisible()
})
