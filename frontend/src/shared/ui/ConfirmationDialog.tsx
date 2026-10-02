import { X } from 'lucide-react'
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
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold text-text-secondary">نیازمند تأیید</p>
            <h2 className="mt-1 text-xl font-extrabold leading-snug" id={titleId}>{title}</h2>
          </div>
          <button className="icon-button -me-2 -mt-2" type="button" onClick={onClose} disabled={pending} aria-label="بستن پنجره">
            <X size={22} aria-hidden="true" />
          </button>
        </div>
        {description && <p className="mt-4 text-sm text-text-secondary" id={descriptionId}>{description}</p>}
        {children && <div className="mt-5">{children}</div>}
        <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">{actions}</div>
      </div>
    </div>
  )
}
