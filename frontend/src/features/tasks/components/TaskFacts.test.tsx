import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { TaskNote, TaskParent } from './TaskFacts'

const today = '2026-10-14'

describe('TaskNote', () => {
  it.each([
    ['2026-10-13', 'مهلت گذشته', 'attention'],
    ['2026-10-14', 'مهلت امروز', 'caution'],
    ['2026-10-16', '۲ روز مانده', 'caution'],
    ['2026-10-25', 'مهلت ۳ آبان', null],
  ])('says how close a deadline of %s is', (deadline, text, tone) => {
    render(<TaskNote task={{ deadline, carryCount: 3 }} today={today} />)
    const note = screen.getByText(text)
    expect(note.getAttribute('data-tone')).toBe(tone)
  })

  it('falls back to how many times it was moved, and says nothing otherwise', () => {
    const { container, rerender } = render(<TaskNote task={{ deadline: null, carryCount: 2 }} today={today} />)
    expect(screen.getByText('۲ بار جابه‌جا')).toBeInTheDocument()
    rerender(<TaskNote task={{ deadline: null, carryCount: 0 }} today={today} />)
    expect(container).toBeEmptyDOMElement()
  })
})

describe('TaskParent', () => {
  it('names the owner in its colour, its kind for assistive technology, or standalone', () => {
    const { container, rerender } = render(<TaskParent task={{ goalId: null, projectId: 'p' }} parentTitle="بازطراحی" />)
    expect(container.firstElementChild).toHaveClass('entity-project')
    expect(container).toHaveTextContent('پروژه: بازطراحی')
    rerender(<TaskParent task={{ goalId: null, projectId: null }} />)
    expect(container).toHaveTextContent('مستقل')
  })
})
