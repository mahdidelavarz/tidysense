import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { toIsoDate } from '../../../shared/lib/date'
import type { RoutineDto } from '../types/routine.types'
import { RoutineForm } from './RoutineForm'

const existing: RoutineDto = {
  id: '00000000-0000-0000-0000-000000000300', goalId: null, projectId: null,
  continuationOfRoutineId: null, continuedByRoutineId: null, title: 'ورزش', description: null,
  status: 'ACTIVE', recurrence: { type: 'SPECIFIC_WEEKDAYS', daysOfWeek: [1, 6], dayOfMonth: null },
  timesOfDay: ['07:30:00'], recurrenceTimezone: 'Asia/Tehran', effectiveFromLocalDate: '2026-10-02',
  effectiveUntilLocalDate: null, source: 'MANUAL', version: 4,
  createdAt: '2026-10-02T00:00:00Z', updatedAt: '2026-10-02T00:00:00Z', stoppedAt: null,
}

function renderForm(props: Partial<Parameters<typeof RoutineForm>[0]> = {}) {
  const onSubmit = vi.fn()
  render(<RoutineForm goals={[]} projects={[]} pending={false} error={null} onSubmit={onSubmit} onCancel={vi.fn()} {...props} />)
  return onSubmit
}

function addTime(value: string) {
  fireEvent.change(screen.getByLabelText('ساعت‌های روز (اختیاری)'), { target: { value } })
  fireEvent.click(screen.getByRole('button', { name: 'افزودن ساعت' }))
}

describe('RoutineForm', () => {
  it('creates an untimed daily Routine that starts today by default', async () => {
    const onSubmit = renderForm()
    fireEvent.click(screen.getByRole('button', { name: 'ساخت روتین' }))
    const alerts = await screen.findAllByRole('alert')
    expect(alerts.some(alert => alert.textContent?.includes('عنوان روتین الزامی است.'))).toBe(true)
    expect(onSubmit).not.toHaveBeenCalled()

    fireEvent.change(screen.getByLabelText('عنوان روتین'), { target: { value: 'مطالعه' } })
    fireEvent.click(screen.getByRole('button', { name: 'ساخت روتین' }))
    await waitFor(() => expect(onSubmit).toHaveBeenCalled())
    expect(onSubmit.mock.calls[0][0]).toEqual({
      title: 'مطالعه', description: null, goalId: null, projectId: null,
      recurrence: { type: 'DAILY', daysOfWeek: null, dayOfMonth: null },
      timesOfDay: [], effectiveFromLocalDate: toIsoDate(new Date()),
    })
  })

  it('collects unique time slots in order and rejects a duplicate', async () => {
    const onSubmit = renderForm()
    fireEvent.change(screen.getByLabelText('عنوان روتین'), { target: { value: 'دارو' } })
    addTime('16:00')
    addTime('08:00')
    addTime('16:00')
    expect(screen.getByText('این ساعت قبلاً اضافه شده است.')).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: /^حذف ساعت/ })).toHaveLength(2)
    addTime('00:00')
    fireEvent.click(screen.getByRole('button', { name: 'حذف ساعت ۱۶:۰۰' }))
    fireEvent.click(screen.getByRole('button', { name: 'ساخت روتین' }))
    await waitFor(() => expect(onSubmit).toHaveBeenCalled())
    expect(onSubmit.mock.calls[0][0].timesOfDay).toEqual(['00:00:00', '08:00:00'])
  })

  it('requires a weekday or a valid month day for those recurrence types', async () => {
    const onSubmit = renderForm()
    fireEvent.change(screen.getByLabelText('عنوان روتین'), { target: { value: 'گزارش' } })
    fireEvent.change(screen.getByLabelText('تکرار'), { target: { value: 'SPECIFIC_WEEKDAYS' } })
    fireEvent.click(screen.getByRole('button', { name: 'ساخت روتین' }))
    expect((await screen.findAllByText('دست‌کم یک روز هفته را انتخاب کنید.')).length).toBeGreaterThan(0)

    fireEvent.change(screen.getByLabelText('تکرار'), { target: { value: 'MONTHLY_ON_DAY' } })
    fireEvent.change(screen.getByLabelText('روز ماه'), { target: { value: '32' } })
    fireEvent.click(screen.getByRole('button', { name: 'ساخت روتین' }))
    expect((await screen.findAllByText('روز ماه باید عددی بین ۱ و ۳۱ باشد.')).length).toBeGreaterThan(0)
    expect(onSubmit).not.toHaveBeenCalled()

    fireEvent.change(screen.getByLabelText('روز ماه'), { target: { value: '5' } })
    fireEvent.click(screen.getByRole('button', { name: 'ساخت روتین' }))
    await waitFor(() => expect(onSubmit).toHaveBeenCalled())
    expect(onSubmit.mock.calls[0][0].recurrence).toEqual({ type: 'MONTHLY_ON_DAY', daysOfWeek: null, dayOfMonth: 5 })
  })

  it('edits with the expected version, no start date, and a notice that the schedule changes tomorrow', async () => {
    const onSubmit = renderForm({ routine: existing })
    expect(screen.queryByLabelText('تاریخ شروع')).not.toBeInTheDocument()
    expect(screen.getByText(/از فردا اعمال می‌شود/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'شنبه' })).toHaveAttribute('aria-pressed', 'true')
    fireEvent.click(screen.getByRole('button', { name: 'شنبه' }))
    fireEvent.click(screen.getByRole('button', { name: 'ذخیره تغییرات' }))
    await waitFor(() => expect(onSubmit).toHaveBeenCalled())
    expect(onSubmit.mock.calls[0][0]).toEqual({
      title: 'ورزش', description: null, goalId: null, projectId: null,
      recurrence: { type: 'SPECIFIC_WEEKDAYS', daysOfWeek: [1], dayOfMonth: null },
      timesOfDay: ['07:30:00'], expectedVersion: 4,
    })
  })
})
