import { type ReactNode, useEffect, useId, useRef } from 'react'

export function ConfirmationDialog({ title, description, children, actions, onClose, pending = false }: {
  title: string
  description?: string
  children?: ReactNode
  actions: ReactNode
  onClose: () => void
  pending?: boolean
}) {
  const titleId = useId()
  const descriptionId = useId()
  const panel = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null
    const first = panel.current?.querySelector<HTMLElement>('button:not(:disabled), a[href], input:not(:disabled)')
    first?.focus()

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape' && !pending) {
        event.preventDefault()
        onClose()
        return
      }
      if (event.key !== 'Tab' || !panel.current) return
      const focusable = Array.from(panel.current.querySelectorAll<HTMLElement>('button:not(:disabled), a[href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled)'))
      if (focusable.length === 0) return
      const firstItem = focusable[0]
      const lastItem = focusable[focusable.length - 1]
      if (event.shiftKey && document.activeElement === firstItem) {
        event.preventDefault()
        lastItem.focus()
      } else if (!event.shiftKey && document.activeElement === lastItem) {
        event.preventDefault()
        firstItem.focus()
      }
    }

    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      previousFocus?.focus()
    }
  }, [onClose, pending])

  return (
    <div className="dialog-backdrop" role="presentation">
      <button
        className="absolute inset-0 cursor-default border-0 bg-transparent"
        type="button"
        tabIndex={-1}
        aria-label="بستن با کلیک بیرون از پنجره"
        disabled={pending}
        onClick={onClose}
      />
      <div
        className="dialog-panel"
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold text-text-primary">نیازمند تأیید</p>
            <h2 className="mt-1 text-xl font-bold leading-snug" id={titleId}>{title}</h2>
          </div>
          <button className="ghost-button -m-2 size-11 px-0 text-xl" type="button" onClick={onClose} disabled={pending} aria-label="بستن پنجره">×</button>
        </div>
        {description && <p className="mt-4 text-sm text-text-secondary" id={descriptionId}>{description}</p>}
        {children && <div className="mt-5">{children}</div>}
        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row">{actions}</div>
      </div>
    </div>
  )
}
