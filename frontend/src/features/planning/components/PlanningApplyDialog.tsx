import { useState } from 'react'
import { toApiError } from '../../../shared/api/http'
import { ConfirmationDialog } from '../../../shared/ui/ConfirmationDialog'
import { EntityLabel } from '../../../shared/ui/EntityUi'
import { FormError } from '../../../shared/ui/FormUi'
import type { PlanningApplyFlow } from '../hooks/planning-hooks'
import { confirmationWarningLabels, entityKinds, factTypeLabels } from '../types/planning.format'
import { planningPhase } from '../types/planning.phase'
import type { PlanningDraftDto } from '../types/planning.types'

const dialogTitle = 'مرور نهایی و تأیید'

/**
 * The final confirmation: shows the server's preview of one draft revision
 * and submits exactly that preview. If the server says the preview no longer
 * matches, nothing was created and the only way forward is a fresh preview.
 */
export function PlanningApplyDialog({ flow, draft }: { flow: PlanningApplyFlow; draft: PlanningDraftDto }) {
  // Acknowledgements belong to one preview: a new preview starts unacknowledged.
  const [acknowledged, setAcknowledged] = useState<{ previewId: string; hashes: string[] }>({ previewId: '', hashes: [] })
  if (!flow.open) return null

  const { preview } = flow
  if (!preview) {
    return (
      <ConfirmationDialog
        title={dialogTitle}
        onClose={flow.cancel}
        pending={flow.previewPending}
        actions={<button className="secondary-button" type="button" disabled={flow.previewPending} onClick={flow.cancel}>بستن</button>}
      >
        {flow.previewPending
          ? <p role="status">در حال آماده‌سازی پیش‌نمایش…</p>
          : <FormError error={flow.previewError} />}
      </ConfirmationDialog>
    )
  }

  const hashes = acknowledged.previewId === preview.id ? acknowledged.hashes : []
  const phase = planningPhase({
    draftStatus: 'REVIEWABLE',
    hasPreview: true,
    unacknowledgedWarnings: preview.warnings.filter(warning => !hashes.includes(warning.warningHash)).length,
    submitPending: flow.submitPending,
    submitErrorCode: flow.submitError ? toApiError(flow.submitError).code : null,
  })
  const conflicted = phase === 'commandConflicted'
  // A warning names items that will not be created, so titles come from the draft, not the preview.
  const titles = new Map(draft.proposals.map(item => [item.proposal.draftId, item.proposal.title]))

  return (
    <ConfirmationDialog
      title={dialogTitle}
      description="این فهرست را سرور ساخته است. با تأیید، همه این موارد یک‌جا ساخته می‌شوند یا هیچ‌کدام."
      onClose={flow.cancel}
      pending={flow.submitPending}
      actions={(
        <>
          <button className="secondary-button" type="button" disabled={flow.submitPending} onClick={flow.cancel}>بازگشت به پیش‌نویس</button>
          {conflicted
            ? <button className="primary-button" type="button" onClick={() => flow.request(Number(draft.revision))}>پیش‌نمایش تازه</button>
            : (
              <button
                className="primary-button"
                type="button"
                disabled={phase === 'submittingCommand' || phase === 'awaitingAcknowledgement'}
                onClick={() => flow.confirm(preview.warnings)}
              >
                {phase === 'submittingCommand' ? 'در حال ساخت…' : 'تأیید و ساخت'}
              </button>
            )}
        </>
      )}
    >
      <ul className="space-y-2" aria-label="مواردی که ساخته می‌شوند">
        {preview.items.map(item => (
          <li key={item.draftId} className="flex flex-wrap items-center gap-2 rounded-xl border border-border-subtle p-3">
            <EntityLabel entity={entityKinds[item.entityType] ?? 'task'} />
            <span className="min-w-0 wrap-break-word font-bold">{item.title}</span>
          </li>
        ))}
      </ul>

      {preview.facts.length > 0 && (
        <p className="notice mt-4">
          برای برنامه‌ریزی‌های بعدی نگه داشته می‌شود: {preview.facts.map(fact => factTypeLabels[fact.factType] ?? fact.factType).join('، ')}
        </p>
      )}
      {preview.noFactsRemembered && (
        <p className="notice mt-4">جزئیات بیشتری برای برنامه‌ریزی‌های بعدی به خاطر سپرده نمی‌شود.</p>
      )}

      {preview.warnings.length > 0 && (
        <fieldset className="mt-4 space-y-2">
          <legend className="text-sm font-bold">پیش از تأیید، این پیامدها را بپذیرید:</legend>
          {preview.warnings.map(warning => (
            <label key={warning.warningId} className="flex items-start gap-3 rounded-xl bg-caution-tint p-3 text-sm">
              <input
                className="mt-1 size-5 shrink-0 accent-accent"
                type="checkbox"
                checked={hashes.includes(warning.warningHash)}
                onChange={event => setAcknowledged({
                  previewId: preview.id,
                  hashes: event.target.checked
                    ? [...hashes, warning.warningHash]
                    : hashes.filter(hash => hash !== warning.warningHash),
                })}
              />
              <span>
                {confirmationWarningLabels[warning.code] ?? warning.code}
                <span className="block text-text-secondary">{warning.affectedDraftIds.map(id => titles.get(id) ?? id).join('، ')}</span>
              </span>
            </label>
          ))}
        </fieldset>
      )}

      {conflicted && (
        <p className="notice-attention mt-4" role="alert">
          از زمان ساخت این پیش‌نمایش چیزی تغییر کرده است. هیچ موردی ساخته نشد؛ پیش‌نمایش تازه بگیرید.
        </p>
      )}
      {phase === 'commandFailed' && <div className="mt-4"><FormError error={flow.submitError} /></div>}
    </ConfirmationDialog>
  )
}
