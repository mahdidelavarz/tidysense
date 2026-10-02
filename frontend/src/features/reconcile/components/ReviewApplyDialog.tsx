import { useState } from 'react'
import { toApiError } from '../../../shared/api/http'
import { formatLocalDate } from '../../../shared/lib/date'
import { ConfirmationDialog } from '../../../shared/ui/ConfirmationDialog'
import { FormError } from '../../../shared/ui/FormUi'
import type { ReconcileActionFlow } from '../hooks/reconcile-hooks'
import { actionTitles, blockingClassifications, classificationLabels, warningLabels } from '../types/reconcile.format'

const refreshableCodes = new Set(['CONFIRMATION_STALE', 'CONFIRMATION_EXPIRED', 'CONFIRMATION_NOT_PENDING'])

/**
 * Review & Apply: shows the server's preview of one action and applies exactly
 * that preview. The client never decides consequences; if the server reports
 * that the preview is out of date, the only way forward is a fresh preview.
 */
export function ReviewApplyDialog({ flow }: { flow: ReconcileActionFlow }) {
  const { draft, preview } = flow
  // Acknowledgements belong to one preview: a new preview starts unacknowledged.
  const [acknowledged, setAcknowledged] = useState<{ previewId: string; hashes: string[] }>({ previewId: '', hashes: [] })
  if (!draft) return null

  const title = actionTitles[draft.actionType]
  if (!preview) {
    return (
      <ConfirmationDialog
        title={title}
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
  const allAcknowledged = preview.warnings.every(warning => hashes.includes(warning.warningHash))
  const submitCode = flow.submitError ? toApiError(flow.submitError).code : null
  const outdated = submitCode !== null && refreshableCodes.has(submitCode)
  const manual = preview.items.filter(item => item.classification === 'HAS_PROTECTED_MANUAL_SCHEDULE')

  return (
    <ConfirmationDialog
      title={title}
      description="این پیش‌نمایش را سرور ساخته است. تا تأیید نکنید چیزی تغییر نمی‌کند، و یا همه موارد اعمال می‌شود یا هیچ‌کدام."
      onClose={flow.cancel}
      pending={flow.submitPending}
      actions={(
        <>
          <button className="secondary-button" type="button" disabled={flow.submitPending} onClick={flow.cancel}>انصراف</button>
          {outdated
            ? <button className="primary-button" type="button" onClick={() => flow.request(draft)}>پیش‌نمایش تازه</button>
            : preview.canApply && (
              <button
                className={draft.actionType.includes('DROP') ? 'danger-button' : 'primary-button'}
                type="button"
                disabled={flow.submitPending || !allAcknowledged}
                onClick={() => flow.confirm(preview.warnings)}
              >
                {flow.submitPending ? 'در حال اعمال…' : 'تأیید و اعمال'}
              </button>
            )}
        </>
      )}
    >
      <ul className="space-y-2" aria-label="موارد این اقدام">
        {preview.items.map(item => (
          <li key={item.taskId} className="rounded-xl border border-border-subtle p-3">
            <p className="wrap-break-word font-bold">{item.title}</p>
            <p className={`text-sm ${blockingClassifications.has(item.classification) ? 'font-bold text-attention' : 'text-text-secondary'}`}>
              {classificationLabels[item.classification] ?? item.classification}
              {item.resultingPlannedDate && item.resultingPlannedDate !== item.currentPlannedDate && (
                <> · {formatLocalDate(item.currentPlannedDate)} ← {formatLocalDate(item.resultingPlannedDate)}</>
              )}
            </p>
          </li>
        ))}
      </ul>

      {manual.length > 0 && (
        <button
          className="secondary-button mt-3"
          type="button"
          disabled={flow.submitPending}
          onClick={() => flow.request({ ...draft, includeTaskIds: [...(draft.includeTaskIds ?? []), ...manual.map(item => item.taskId)] })}
        >
          کارهای دارای تاریخ دستی هم جابه‌جا شوند
        </button>
      )}

      {!preview.canApply && (
        <p className="notice-attention mt-4" role="alert">
          این اقدام به این شکل قابل اعمال نیست. موارد مشخص‌شده را جداگانه تعیین تکلیف کنید و دوباره تلاش کنید.
        </p>
      )}

      {preview.canApply && preview.warnings.length > 0 && (
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
              <span>{warningLabels[warning.code] ?? warning.code}</span>
            </label>
          ))}
        </fieldset>
      )}

      {outdated && (
        <p className="notice-attention mt-4" role="alert">
          از زمان ساخت این پیش‌نمایش، وضعیت کارها تغییر کرده است. چیزی اعمال نشد؛ پیش‌نمایش تازه بگیرید.
        </p>
      )}
      {flow.submitError && !outdated && <div className="mt-4"><FormError error={flow.submitError} /></div>}
    </ConfirmationDialog>
  )
}
