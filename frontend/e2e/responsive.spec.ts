import { randomUUID } from 'node:crypto'
import { expect, test, type Page } from '@playwright/test'

const origin = 'http://127.0.0.1:5174'
const phone = { width: 390, height: 844 }
const desktop = { width: 1440, height: 900 }

/** Lets sheet and panel entrance animations finish so screenshots show the settled state. */
const settle = (page: Page) => page.waitForTimeout(400)

/** Signs in through the development session endpoint and seeds one Goal, Project and two Tasks. */
async function seed(page: Page) {
  const session = await page.request.post('/api/v1/dev/test-session', { data: {}, headers: { Origin: origin } })
  expect(session.ok()).toBeTruthy()
  const post = async (path: string, data: unknown) => {
    const response = await page.request.post(`/api/v1/${path}`, {
      data, headers: { Origin: origin, 'Idempotency-Key': randomUUID() },
    })
    expect(response.ok(), `${path}: ${await response.text()}`).toBeTruthy()
    return await response.json() as { id: string }
  }
  const { localDate } = await (await page.request.get('/api/v1/today')).json() as { localDate: string }
  const goal = await post('goals', {
    title: 'تسلط بر زبان انگلیسی', desiredOutcome: 'بتوانم جلسه‌های کاری را بدون مترجم پیش ببرم.',
    targetDate: null, reviewDate: null,
  })
  const project = await post('projects', {
    title: 'دوره مکالمه سطح متوسط', completionMeaning: 'هر دوازده جلسه دوره را تمام کرده باشم.',
    goalId: goal.id, targetDate: null, reviewDate: null,
  })
  const sequenceId = randomUUID()
  const first = await post('tasks', {
    title: 'مرور واژه‌های جلسه سوم', description: 'بیست واژه جدید و مثال‌هایشان.', goalId: null,
    projectId: project.id, plannedDate: localDate, deadline: null, sequenceId, sequenceOrder: 10,
  })
  await post('tasks', {
    title: 'نوشتن تمرین جلسه سوم', description: null, goalId: null,
    projectId: project.id, plannedDate: localDate, deadline: null, sequenceId, sequenceOrder: 20,
  })
  return { goal, project, task: first }
}

test('phone layout uses the five-place tab bar, the account sheet and bottom sheets instead of the rail', async ({ page }) => {
  await page.setViewportSize(phone)
  const { task } = await seed(page)

  await page.goto('/today')
  await expect(page.getByRole('heading', { name: 'مرور واژه‌های جلسه سوم' })).toBeVisible()
  const tabBar = page.getByRole('navigation', { name: 'ناوبری اصلی' })
  await expect(tabBar).toBeVisible()
  // Today, Tasks, Planning in the middle, Routines and Goals.
  await expect(tabBar.getByRole('link')).toHaveCount(5)
  await expect(tabBar.getByRole('link').nth(2)).toHaveAccessibleName('برنامه‌ریزی')
  await expect(tabBar.getByRole('link', { name: /امروز/ })).toHaveAttribute('aria-current', 'page')
  // The page must fit the viewport: no horizontal scrolling on a phone.
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
  await settle(page)
  await page.screenshot({ path: 'test-results/ui-phone-today.png' })

  await page.getByRole('button', { name: 'حساب و تنظیمات' }).click()
  const account = page.getByRole('dialog', { name: 'حساب شما' })
  await expect(account.getByRole('link', { name: /بازبینی/ })).toBeVisible()
  await expect(account.getByRole('link', { name: 'برنامه‌ریزی' })).toBeVisible()
  await expect(account.getByRole('button', { name: 'خروج از این دستگاه' })).toBeVisible()
  await settle(page)
  await page.screenshot({ path: 'test-results/ui-phone-account.png' })
  await page.keyboard.press('Escape')
  await expect(account).toBeHidden()
  // Projects are the other view of the Goals place, reached from its switch; the Goals tab stays current.
  await tabBar.getByRole('link', { name: 'هدف‌ها' }).click()
  await page.getByRole('navigation', { name: 'نمای هدف‌ها و پروژه‌ها' }).getByRole('link', { name: /پروژه‌ها/ }).click()
  await expect(page).toHaveURL(/\/projects$/)
  await expect(tabBar.getByRole('link', { name: 'هدف‌ها' })).toHaveAttribute('aria-current', 'page')
  await tabBar.getByRole('link', { name: 'هدف‌ها' }).click()
  await expect(page).toHaveURL(/\/goals$/)
  await settle(page)
  await page.screenshot({ path: 'test-results/ui-phone-goals.png' })

  await page.getByRole('button', { name: 'افزودن', exact: true }).click()
  await expect(page.getByRole('dialog', { name: 'چه چیزی اضافه می‌کنید؟' })).toBeVisible()
  await settle(page)
  await page.screenshot({ path: 'test-results/ui-phone-create-menu.png' })
  await page.getByRole('button', { name: /^کار/ }).click()
  const sheet = page.getByRole('dialog', { name: 'کار جدید' })
  await sheet.getByRole('button', { name: 'انتخاب روز…' }).click()
  await settle(page)
  await page.screenshot({ path: 'test-results/ui-phone-task-sheet.png' })
  await page.keyboard.press('Escape')
  await expect(sheet).toBeHidden()

  await page.goto(`/tasks/${task.id}`)
  await expect(page.getByRole('button', { name: 'ویرایش کار' })).toBeVisible()
  await settle(page)
  await page.screenshot({ path: 'test-results/ui-phone-task-detail.png', fullPage: true })
})

test('desktop layout uses the icon rail and has no tab bar', async ({ page }) => {
  await page.setViewportSize(desktop)
  const { goal, project } = await seed(page)

  await page.goto('/today')
  const rail = page.getByRole('navigation', { name: 'ناوبری اصلی' })
  await expect(rail.getByRole('link', { name: /^امروز/ })).toHaveAttribute('aria-current', 'page')
  await expect(rail.getByRole('link', { name: 'روتین‌ها' })).toBeVisible()
  await expect(rail.getByRole('link', { name: 'برنامه‌ریزی با هوش مصنوعی' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'افزودن', exact: true })).toBeHidden()
  // An icon names itself on keyboard focus too, not only on hover.
  await page.keyboard.press('Tab')
  await rail.getByRole('link', { name: 'روتین‌ها' }).focus()
  await expect(rail.getByRole('link', { name: 'روتین‌ها' }).locator('.rail-tip')).toHaveCSS('opacity', '1')
  await expect(page.getByRole('img', { name: 'منتظر کارهای پیشین' }).first()).toBeVisible()
  await settle(page)
  await page.screenshot({ path: 'test-results/ui-desktop-today.png' })

  await rail.getByRole('link', { name: 'کارها' }).click()
  // The shared test user may already hold the phone test's seed, so titles can repeat.
  await expect(page.getByRole('heading', { name: 'مرور واژه‌های جلسه سوم' }).first()).toBeVisible()
  await settle(page)
  await page.screenshot({ path: 'test-results/ui-desktop-tasks.png' })

  await page.goto('/projects')
  await expect(page.getByRole('link', { name: /دوره مکالمه/ }).first()).toBeVisible()
  await settle(page)
  await page.screenshot({ path: 'test-results/ui-desktop-projects.png' })

  await page.goto(`/goals/${goal.id}`)
  await expect(page.getByRole('button', { name: 'به این هدف رسیدم' })).toBeVisible()
  await settle(page)
  await page.screenshot({ path: 'test-results/ui-desktop-goal-detail.png' })

  await page.goto(`/projects/${project.id}`)
  await page.getByRole('button', { name: 'ویرایش پروژه' }).click()
  await expect(page.getByRole('dialog', { name: 'ویرایش پروژه' })).toBeVisible()
  await settle(page)
  await page.screenshot({ path: 'test-results/ui-desktop-project-edit-sheet.png' })
  await page.keyboard.press('Escape')

  await page.goto('/no-such-page')
  await expect(page.getByText('این صفحه پیدا نشد.')).toBeVisible()
})

test('login screen', async ({ page }) => {
  await page.setViewportSize(desktop)
  await page.goto('/login')
  await expect(page.getByRole('heading', { name: 'ورود یا ثبت‌نام' })).toBeVisible()
  await settle(page)
  await page.screenshot({ path: 'test-results/ui-desktop-login.png' })
  await page.setViewportSize(phone)
  await settle(page)
  await page.screenshot({ path: 'test-results/ui-phone-login.png' })
})

test('on a phone the Today photograph folds with the scroll, and long Goal and Project titles fit a 360px screen', async ({ page }) => {
  await seed(page)
  const long = 'یادگیری زبان آلمانی تا سطح B2 برای مهاجرت کاری و گرفتن مدرک گوته در پایان سال آینده'
  const goal = await page.request.post('/api/v1/goals', {
    data: { title: long, desiredOutcome: 'بتوانم بدون مشکل در جلسه‌های کاری صحبت کنم و ایمیل‌های رسمی بنویسم.', targetDate: null, reviewDate: null },
    headers: { Origin: origin, 'Idempotency-Key': randomUUID() },
  })
  expect(goal.ok()).toBeTruthy()
  const project = await page.request.post('/api/v1/projects', {
    data: { title: `آمادگی کامل برای ${long}`, completionMeaning: null, goalId: (await goal.json()).id, targetDate: null, reviewDate: null },
    headers: { Origin: origin, 'Idempotency-Key': randomUUID() },
  })
  expect(project.ok()).toBeTruthy()

  // The photograph follows the finger: halfway through its fold it is halfway between 300px and the 150px band.
  await page.setViewportSize(phone)
  await page.goto('/today')
  const visible = () => page.locator('.hero').evaluate(element => Math.round(element.getBoundingClientRect().bottom))
  await expect.poll(visible).toBe(300)
  for (const [scroll, height] of [[75, 225], [150, 150], [400, 150], [40, 260], [0, 300]]) {
    await page.evaluate(y => window.scrollTo(0, y), scroll)
    await expect.poll(visible).toBe(height)
  }

  await page.setViewportSize({ width: 360, height: 780 })
  for (const route of ['/goals', '/projects']) {
    await page.goto(route)
    await expect(page.getByRole('link', { name: new RegExp(long.slice(0, 20)) }).first()).toBeVisible()
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
    expect(await page.locator('.goal-card').evaluateAll(cards => cards.every(card => card.getBoundingClientRect().right <= window.innerWidth))).toBe(true)
  }
})
