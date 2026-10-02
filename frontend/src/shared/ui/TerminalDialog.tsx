import type { ReactNode } from 'react'
import { ConfirmationDialog } from './ConfirmationDialog'

export type TerminalBlocker = { id: string; label: ReactNode }

/**
 * Confirmation dialog for an explicit terminal-status transition (Goal
 * achieved/abandoned, Project completed/stopped). Entity-specific copy and
 * blocker links are supplied by the caller; this component owns only the
 * shared interaction/visual shape so Goal and Project do not each repeat it.
 */
export function TerminalDialog({
  title,
  description,
  tone,
  confirmLabel,
  pendingLabel,
  pending,
  canApply,
  blockersIntro,
  blockers,
  onCancel,
  onConfirm,
}: {
  title: string
  description: string
  tone: 'positive' | 'attention'
  confirmLabel: string
  pendingLabel: string
  pending: boolean
  canApply: boolean
  blockersIntro: string
  blockers: TerminalBlocker[]
  onCancel: () => void
  onConfirm: () => void
}) {
  return (
    <ConfirmationDialog
      title={title}
      description={description}
      onClose={onCancel}
      pending={pending}
      actions={(
        <>
          <button className="secondary-button" type="button" onClick={onCancel} disabled={pending}>انصراف</button>
          {canApply && (
            <button
              className={tone === 'positive' ? 'primary-button' : 'danger-button'}
              type="button"
              disabled={pending}
              onClick={onConfirm}
            >
              {pending ? pendingLabel : confirmLabel}
            </button>
          )}
        </>
      )}
    >
      {blockers.length > 0 && (
        <div className="rounded-lg border border-attention/40 bg-attention-tint p-4">
          <p className="font-bold text-text-primary">{blockersIntro}</p>
          <ul className="mt-3 list-inside list-disc space-y-2">
            {blockers.map(blocker => <li key={blocker.id}>{blocker.label}</li>)}
          </ul>
        </div>
      )}
    </ConfirmationDialog>
  )
}
