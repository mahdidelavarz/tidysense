import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { PlanningDraftDto } from '../types/planning.types'
import { PlanningRoad } from './PlanningDesk'

const proposal = (draftId: string, entityType: string, title: string, dates: Record<string, string | null>, state = 'INCLUDED') => ({
  proposal: {
    draftId, entityType, title, description: null, parentDraftId: null, underContext: false, source: 'AI', confidence: 'HIGH',
    included: state !== 'EXCLUDED', desiredOutcome: null, completionMeaning: null, targetDate: null, reviewDate: null,
    reviewDateSource: null, plannedDate: null, deadline: null, recurrence: null, timesOfDay: null, effectiveFromLocalDate: null,
    ...dates,
  },
  state, excludedByAncestor: false, issues: [],
})

const draft = {
  proposals: [
    proposal('g', 'GOAL', 'آلمانی B1', { targetDate: '2026-12-11' }),
    proposal('p', 'PROJECT', 'آمادگی آزمون', { targetDate: '2026-11-22' }),
    proposal('t1', 'TASK', 'ثبت‌نام آزمون', { deadline: '2026-10-17' }),
    proposal('t2', 'TASK', 'هماهنگی جلسه', { plannedDate: '2026-10-16' }),
    proposal('t3', 'TASK', 'کار برداشته‌شده', { plannedDate: '2026-10-20' }, 'EXCLUDED'),
    proposal('t4', 'TASK', 'بدون تاریخ', {}),
    proposal('r', 'ROUTINE', 'تمرین شنیداری', {}),
  ],
} as unknown as PlanningDraftDto

describe('PlanningRoad', () => {
  it('lays the draft’s own dated items on the road in date order and estimates nothing', () => {
    render(<PlanningRoad draft={draft} today="2026-10-15" />)
    const stops = within(screen.getByRole('list', { name: 'موارد پیش‌نویس به ترتیب تاریخ' })).getAllByRole('listitem')
    expect(stops.map(stop => stop.textContent)).toEqual([
      'امروز، ۲۳ مهرشروع از همین‌جا',
      'کار، ۲۴ مهرهماهنگی جلسه',
      'کار با مهلت، ۲۵ مهرثبت‌نام آزمون',
      'پروژه، ۱ آذرآمادگی آزمون',
      'هدف، ۲۰ آذرآلمانی B1',
    ])
    // Days to the Goal come from the draft's own target date; Routines are the rhythm, not stops.
    expect(screen.getByText('روز تا آلمانی B1', { exact: false })).toHaveTextContent('۵۷ روز تا آلمانی B1')
    expect(screen.getByText(/ریتم ثابت در کل مسیر/)).toHaveTextContent('تمرین شنیداری')
    expect(screen.getByText('۱ مورد تاریخ ندارد و روی جاده نیامده است.')).toBeInTheDocument()
  })

  it('is an empty road until there is a draft', () => {
    render(<PlanningRoad today="2026-10-15" />)
    expect(screen.queryByRole('list')).not.toBeInTheDocument()
    expect(screen.getByText('بعد از ساخت پیش‌نویس، جاده‌اش اینجا کشیده می‌شود')).toBeInTheDocument()
  })
})
