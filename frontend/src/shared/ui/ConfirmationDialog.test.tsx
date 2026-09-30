import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { ConfirmationDialog } from './ConfirmationDialog'

describe('ConfirmationDialog', () => {
  it('labels the modal, moves focus inside, and restores focus after close', () => {
    const trigger = document.createElement('button')
    document.body.append(trigger)
    trigger.focus()
    const onClose = vi.fn()
    const view = render(
      <ConfirmationDialog
        title="تأیید تغییر"
        description="پیامد تغییر را بررسی کنید."
        onClose={onClose}
        actions={<button type="button">تأیید</button>}
      />,
    )

    expect(screen.getByRole('dialog', { name: 'تأیید تغییر' })).toHaveAttribute('aria-modal', 'true')
    expect(screen.getByRole('button', { name: 'بستن پنجره' })).toHaveFocus()
    view.unmount()
    expect(trigger).toHaveFocus()
    trigger.remove()
  })

  it('closes on Escape unless an action is pending', () => {
    const onClose = vi.fn()
    const view = render(
      <ConfirmationDialog title="تأیید تغییر" onClose={onClose} actions={<button type="button">تأیید</button>} />,
    )
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(onClose).toHaveBeenCalledOnce()
    view.rerender(
      <ConfirmationDialog title="تأیید تغییر" onClose={onClose} pending actions={<button type="button">تأیید</button>} />,
    )
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(onClose).toHaveBeenCalledOnce()
  })
})
