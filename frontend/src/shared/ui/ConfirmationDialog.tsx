import { X } from './icons'
import { type ReactNode, useId, useRef } from 'react'
import { useModal } from '../lib/use-modal'

/** Modal for one explicit, consequential decision. Longer create/edit flows use Sheet. */
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
  useModal(panel, onClose, pending)

  return (
    <div className="dialog-layer" role="presentation">
      <button
        className="overlay-backdrop cursor-default border-0"
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
        <div className="sheet-handle sm:hidden" aria-hidden="true" />
        <div className="flex items-start justify-between gap-4 px-5 pt-4 sm:px-7 sm:pt-7">
          <h2 className="text-xl font-extrabold leading-snug" id={titleId}>{title}</h2>
          <button className="icon-button -me-2 -mt-1.5" type="button" onClick={onClose} disabled={pending} aria-label="بستن پنجره">
            <X size={22} aria-hidden="true" />
          </button>
        </div>
        <div className="px-5 pb-5 sm:px-7 sm:pb-6">
          {description && <p className="mt-2 text-sm leading-7 text-text-secondary" id={descriptionId}>{description}</p>}
          {children && <div className="mt-5">{children}</div>}
        </div>
        <div className="dialog-actions">{actions}</div>
      </div>
    </div>
  )
}
