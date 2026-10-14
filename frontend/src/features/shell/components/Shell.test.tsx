import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createMemoryHistory, createRootRoute, createRoute, createRouter, Outlet, RouterProvider } from '@tanstack/react-router'
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useUiStore } from '../../../shared/lib/ui-store'
import { currentUser } from '../../auth/services/auth-api'
import { getReconcileOverview } from '../../reconcile/services/reconcile-api'
import { AccountPanel } from './AccountPanel'
import { Rail } from './Rail'
import { TabBar } from './TabBar'

vi.mock('../../auth/services/auth-api', () => ({ currentUser: vi.fn(), logout: vi.fn(), logoutAll: vi.fn() }))
vi.mock('../../reconcile/services/reconcile-api', () => ({ getReconcileOverview: vi.fn() }))

const user = (isOperator: boolean) => ({
  id: '00000000-0000-0000-0000-000000000001', phoneNumber: '+989120000000', displayName: 'مهدی', setupComplete: true, isOperator,
})

/** Renders shell parts inside a router at the given path, so links know which page is current. */
function renderAt(path: string, ui: React.ReactNode) {
  const root = createRootRoute({ component: () => <>{ui}<Outlet /></> })
  const pages = ['/today', '/tasks', '/planning', '/routines', '/goals', '/projects', '/reconcile', '/privacy', '/operations']
    .map(p => createRoute({ getParentRoute: () => root, path: p, component: () => null }))
  const router = createRouter({ routeTree: root.addChildren(pages), history: createMemoryHistory({ initialEntries: [path] }) })
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(<QueryClientProvider client={client}><RouterProvider router={router} /></QueryClientProvider>)
}

describe('shell navigation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useUiStore.setState({ accountOpen: false, createTarget: null })
    vi.mocked(currentUser).mockResolvedValue(user(false))
    vi.mocked(getReconcileOverview).mockResolvedValue({ attentionCount: 2 } as never)
  })

  it('puts the five places in the tab bar with Planning in the middle, the Reconcile count on Today, and creating apart', async () => {
    renderAt('/projects', <TabBar />)
    const nav = await screen.findByRole('navigation', { name: 'ناوبری اصلی' })
    const links = within(nav).getAllByRole('link')
    expect(links.map(link => link.textContent?.replace(/[۰-۹].*$/, ''))).toEqual(['امروز', 'کارها', 'برنامه‌ریزی', 'روتین‌ها', 'هدف‌ها'])
    expect(await within(nav).findByText('مورد برای بازبینی', { exact: false })).toBeInTheDocument()
    // The Goals place stands for Projects too.
    expect(within(nav).getByRole('link', { name: 'هدف‌ها' })).toHaveAttribute('aria-current', 'page')
    fireEvent.click(screen.getByRole('button', { name: 'افزودن' }))
    expect(useUiStore.getState().createTarget).toBe('menu')
  })

  it('names every rail icon, shows Operations only to operators and opens the account panel', async () => {
    vi.mocked(currentUser).mockResolvedValue(user(true))
    renderAt('/routines', <Rail />)
    const rail = await screen.findByRole('navigation', { name: 'ناوبری اصلی' })
    expect(within(rail).getByRole('link', { name: 'روتین‌ها' })).toHaveAttribute('aria-current', 'page')
    expect(within(rail).getByRole('link', { name: 'برنامه‌ریزی با هوش مصنوعی' })).toBeInTheDocument()
    expect(within(rail).getByRole('link', { name: 'هدف‌ها و پروژه‌ها' })).toBeInTheDocument()
    expect(await within(rail).findByRole('link', { name: 'عملیات' })).toBeInTheDocument()
    const account = within(rail).getByRole('button', { name: /حساب و تنظیمات/ })
    expect(account).toHaveAttribute('aria-expanded', 'false')
    fireEvent.click(account)
    expect(useUiStore.getState().accountOpen).toBe(true)
  })

  it('keeps Operations out of the rail for everyone else', async () => {
    renderAt('/today', <Rail />)
    const rail = await screen.findByRole('navigation', { name: 'ناوبری اصلی' })
    await waitFor(() => expect(currentUser).toHaveBeenCalled())
    expect(within(rail).queryByRole('link', { name: 'عملیات' })).not.toBeInTheDocument()
  })

  it('the account panel holds Reconcile with its count, appearance, privacy and signing out, and closes on Escape', async () => {
    const onClose = vi.fn()
    renderAt('/today', <AccountPanel onClose={onClose} />)
    const panel = await screen.findByRole('dialog', { name: 'مهدی' })
    const reconcile = within(panel).getByRole('link', { name: /^بازبینی/ })
    await waitFor(() => expect(reconcile).toHaveTextContent('۲ مورد منتظر تصمیم'))
    expect(within(panel).getByRole('link', { name: 'حریم خصوصی و داده‌ها' })).toBeInTheDocument()
    expect(within(panel).getByRole('button', { name: 'خروج از این دستگاه' })).toBeInTheDocument()
    expect(within(panel).getByRole('button', { name: 'خروج از همه‌ی دستگاه‌ها' })).toBeInTheDocument()
    expect(within(panel).queryByRole('link', { name: 'عملیات' })).not.toBeInTheDocument()
    act(() => { fireEvent.keyDown(document, { key: 'Escape' }) })
    expect(onClose).toHaveBeenCalled()
  })
})
