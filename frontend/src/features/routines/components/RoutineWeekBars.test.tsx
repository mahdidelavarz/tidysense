import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { RoutineWeekDto } from '../types/routine.types'
import { RoutineWeekBars, weekProgress } from './RoutineWeekBars'

const day = (localDate: string, scheduled: number, done: number) => ({ localDate, scheduled, done })
const week: RoutineWeekDto = {
  routineId: '00000000-0000-0000-0000-000000000300',
  recurrence: { type: 'SPECIFIC_WEEKDAYS', daysOfWeek: [6, 1, 3], dayOfMonth: null },
  slotsPerDay: 2,
  days: [
    day('2026-10-10', 2, 2), day('2026-10-11', 0, 0), day('2026-10-12', 2, 1), day('2026-10-13', 0, 0),
    day('2026-10-14', 2, 0), day('2026-10-15', 0, 0), day('2026-10-16', 0, 0),
  ],
}

describe('RoutineWeekBars', () => {
  it('counts the scheduled days whose every slot is done', () => {
    expect(weekProgress(week)).toEqual({ complete: 1, scheduled: 3 })
  })

  it('draws only scheduled days, or a quiet place for every day in a list', () => {
    const { container, rerender } = render(<RoutineWeekBars week={week} today="2026-10-12" />)
    expect(screen.getByRole('img', { name: 'این هفته: ۱ روز کامل از ۳ روز' })).toBeInTheDocument()
    const states = () => Array.from(container.querySelectorAll('.week-day'), element => element.getAttribute('data-when'))
    expect(states()).toEqual(['past', 'today', 'later'])
    rerender(<RoutineWeekBars week={week} today="2026-10-12" everyDay />)
    expect(states()).toEqual(['past', 'off', 'today', 'off', 'later', 'off', 'off'])
  })

  it('fills a day by the share of its slots done', () => {
    const { container } = render(<RoutineWeekBars week={week} today="2026-10-12" />)
    const today = container.querySelector('[data-when="today"]') as HTMLElement
    expect(today.style.getPropertyValue('--fill')).toBe('50%')
  })
})
