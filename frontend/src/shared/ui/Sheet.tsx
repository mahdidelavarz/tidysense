import { X } from 'lucide-react'
import { type ReactNode, useId, useRef } from 'react'
import { useModal } from '../lib/use-modal'

/**
 * Page sheet for create/edit flows: a bottom sheet on phones and a side
 * panel from tablet width up. Use ConfirmationDialog instead for a short
 * yes/no decision.
 */
export function Sheet({ title, description, children, onClose, locked = false }: {
  title: string
  description?: string
  children: ReactNode
  onClose: () => void
  /** Blocks dismissal while a submit is in flight. */
  locked?: boolean
}) {
  const titleId = useId()
  const descriptionId = useId()
  const panel = useRef<HTMLDivElement>(null)
  useModal(panel, onClose, locked)

  return (
    <>
      <button
        className="overlay-backdrop cursor-default border-0"
        type="button"
        tabIndex={-1}
        aria-label="بستن با کلیک بیرون از پنجره"
        disabled={locked}
        onClick={onClose}
      />
      <div
        className="sheet-panel"
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined}
      >
        <div className="sheet-handle" aria-hidden="true" />
        <div className="flex items-start justify-between gap-4 px-5 pb-4 pt-4 sm:px-6 md:pt-6">
          <div className="min-w-0">
            <h2 className="text-xl font-extrabold leading-snug" id={titleId}>{title}</h2>
            {description && <p className="mt-1 text-sm text-text-secondary" id={descriptionId}>{description}</p>}
          </div>
          <button className="icon-button -me-2 -mt-1" type="button" onClick={onClose} disabled={locked} aria-label="بستن">
            <X size={22} aria-hidden="true" />
          </button>
        </div>
        <div className="sheet-body">{children}</div>
      </div>
    </>
  )
}
