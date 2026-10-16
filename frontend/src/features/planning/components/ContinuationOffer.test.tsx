import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { declinePlanningContinuation, listPlanningContinuations } from '../services/planning-api'
import { ContinuationOffers } from './ContinuationOffer'

vi.mock('@tanstack/react-router', () => ({
  Link: ({ children, className, search }: { children: React.ReactNode; className?: string; search?: Record<string, string> }) =>
    <a className={className} href={`/planning?continue=${search?.continue ?? ''}`}>{children}</a>,
}))
vi.mock('../services/planning-api', () => ({ listPlanningContinuations: vi.fn(), declinePlanningContinuation: vi.fn() }))

const goal = '00000000-0000-0000-0000-000000000400'
const offer = (scopeId: string, title: string, endDate: string) => ({
  windowId: `00000000-0000-0000-0000-0000000005${scopeId.slice(-2)}`, week: 1, scopeType: 'GOAL', scopeId, title,
  startDate: '2026-10-11', endDate, nextStartDate: '2026-10-18', nextEndDate: '2026-10-24',
  evidence: { completedTasks: 4, carriedTasks: 1, droppedTasks: 0, leftTasks: 2, routineDone: 5, routineMissed: 1 },
  version: 1,
})

function renderOffers(props: { today: string; scopeId?: string }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  return render(<QueryClientProvider client={client}><ContinuationOffers {...props} /></QueryClientProvider>)
}

describe('The offer of the next week (029 §3)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(listPlanningContinuations).mockResolvedValue([
      offer(goal, 'یادگیری آلمانی', '2026-10-17'),
      offer('00000000-0000-0000-0000-000000000499', 'اسباب‌کشی', '2026-10-15'),
    ] as never)
    vi.mocked(declinePlanningContinuation).mockResolvedValue(undefined)
  })

  it('says how the week went and opens the next week with one tap, without generating anything itself', async () => {
    renderOffers({ today: '2026-10-16' })
    const german = within(await screen.findByRole('region', { name: 'هفتهٔ اول «یادگیری آلمانی» فردا تمام می‌شود' }))
    // Only what happened, with the slots of the Routines; nothing judged.
    expect(german.getByText('۴ کار انجام شد، ۲ کار مانده، ۱ جابه‌جا شد، روتین‌ها ۵ از ۶ نوبت.')).toBeInTheDocument()
    expect(german.getByRole('link', { name: 'برنامهٔ هفتهٔ بعد' })).toHaveAttribute('href', `/planning?continue=${offer(goal, '', '').windowId}`)
    // A week that has ended says so.
    expect(screen.getByRole('region', { name: 'هفتهٔ اول «اسباب‌کشی» تمام شد' })).toBeInTheDocument()
    expect(declinePlanningContinuation).not.toHaveBeenCalled()
  })

  it('shows only its own week on a Goal page, and «فعلاً نه» records the decision once', async () => {
    renderOffers({ today: '2026-10-16', scopeId: goal })
    const card = within(await screen.findByRole('region', { name: /یادگیری آلمانی/ }))
    expect(screen.queryByRole('region', { name: /اسباب‌کشی/ })).not.toBeInTheDocument()
    fireEvent.click(card.getByRole('button', { name: 'فعلاً نه' }))
    await waitFor(() => expect(declinePlanningContinuation).toHaveBeenCalledWith(offer(goal, '', '').windowId, 1))
  })
})
