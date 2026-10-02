import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { DateField } from './DateField'

describe('DateField', () => {
  it('shows the value as a Jalali date and reports picks as ISO Gregorian', () => {
    const onChange = vi.fn()
    render(<DateField label="تاریخ" value="2026-09-28" onChange={onChange} />)
    const trigger = screen.getByLabelText('تاریخ')
    expect(trigger).toHaveTextContent('۶ مهر ۱۴۰۵')
    fireEvent.click(trigger)
    // Mehr 1405 starts on 2026-09-23, so its 10th day is 2026-10-02.
    expect(screen.getByText('مهر ۱۴۰۵')).toBeInTheDocument()
    expect(document.querySelector('[data-date="2026-09-28"]')).toHaveAttribute('aria-pressed', 'true')
    const tenth = document.querySelector<HTMLElement>('[data-date="2026-10-02"]')
    expect(tenth).toHaveTextContent('۱۰')
    fireEvent.click(tenth as HTMLElement)
    expect(onChange).toHaveBeenCalledWith('2026-10-02')
  })

  it('moves between months and can clear an optional date', () => {
    const onChange = vi.fn()
    render(<DateField label="تاریخ" value="2026-09-28" onChange={onChange} />)
    fireEvent.click(screen.getByLabelText('تاریخ'))
    fireEvent.click(screen.getByRole('button', { name: 'ماه بعد' }))
    expect(screen.getByText('آبان ۱۴۰۵')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'بدون تاریخ' }))
    expect(onChange).toHaveBeenCalledWith('')
  })
})
