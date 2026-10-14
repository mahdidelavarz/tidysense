import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Stepper } from './Stepper'

const steps = ['نوشتن', 'پرسش‌ها', 'مرور', 'تأیید'] as const

describe('Stepper', () => {
  it('marks passed steps done, the current one as the step, and numbers the rest', () => {
    render(<Stepper steps={steps} current={2} />)
    const list = screen.getByRole('list', { name: 'مراحل' })
    const items = within(list).getAllByRole('listitem')
    expect(items).toHaveLength(4)
    expect(items[0]).toHaveTextContent('نوشتن، انجام شد')
    expect(items[1]).toHaveTextContent('پرسش‌ها، انجام شد')
    expect(items[2]).toHaveAttribute('aria-current', 'step')
    expect(items[2]).toHaveTextContent('۳مرور')
    expect(items[3]).not.toHaveAttribute('aria-current')
    expect(items[3]).toHaveTextContent('۴تأیید')
  })
})
