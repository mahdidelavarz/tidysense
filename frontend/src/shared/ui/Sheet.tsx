import { X } from './icons'
import { type ReactNode, useId, useRef } from 'react'
import { useModal } from '../lib/use-modal'
import { EntityIcon, type EntityKind } from './EntityUi'

/**
 * Page sheet for create/edit flows: a bottom sheet on phones and a side
 * panel from tablet width up. Use ConfirmationDialog instead for a short
 * yes/no decision.
 */
export function Sheet({ title, description, entity, aside, children, onClose, locked = false }: {
  title: string
  /** A small mark beside the close button, such as the step of a flow («۴ از ۴»). */
  aside?: ReactNode
  /** What the sheet makes or acts on: its icon sits before the title and its colour marks the fields. */
  entity?: EntityKind
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
        className={`sheet-panel ${entity ? `entity-${entity}` : ''}`}
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined}
      >
        <div className="sheet-handle" aria-hidden="true" />
        <div className="sheet-header">
          {entity && <EntityIcon entity={entity} />}
          <div className="min-w-0 flex-1 self-center">
            <h2 className="display-title text-[1.4375rem]" id={titleId}>{title}</h2>
            {description && <p className="mt-1 text-sm leading-6 text-text-secondary" id={descriptionId}>{description}</p>}
          </div>
          {aside}
          <button className="icon-button -me-2 -mt-1" type="button" onClick={onClose} disabled={locked} aria-label="بستن">
            <X size={22} aria-hidden="true" />
          </button>
        </div>
        <div className="sheet-body">{children}</div>
      </div>
    </>
  )
}
