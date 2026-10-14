import { useState } from 'react'
import { toApiError } from '../../../shared/api/http'
import { formatDayMonth, formatNumber } from '../../../shared/lib/date'
import { FormError } from '../../../shared/ui/FormUi'
import { ArrowLeft, CircleAlert, ShieldCheck } from '../../../shared/ui/icons'
import { Sheet } from '../../../shared/ui/Sheet'
import type { ReconcileActionFlow } from '../hooks/reconcile-hooks'
import { actionTitles, blockingClassifications, classificationLabels, warningLabels } from '../types/reconcile.format'

const refreshableCodes = new Set(['CONFIRMATION_STALE', 'CONFIRMATION_EXPIRED', 'CONFIRMATION_NOT_PENDING'])

/** The verb on the confirming button, as in «تأیید و جابه‌جایی ۲ کار». */
const verbs: Record<string, string> = {
  REPLAN_TASKS: 'جابه‌جایی', SEQUENCE_CARRY_ALL: 'جابه‌جایی', DROP_TASKS: 'کنار گذاشتن', SEQUENCE_DROP_ALL: 'کنار گذاشتن',
  KEEP_TASKS: 'نگه داشتن', DETACH_DROPPED_PREDECESSOR: 'جدا کردن',
}

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

  // «جابه‌جایی دنباله از ۲۲ مهر»: the action and, for a move, the date it moves to.
  const title = draft.plannedDate && draft.actionType === 'SEQUENCE_CARRY_ALL'
    ? `جابه‌جایی دنباله از ${formatDayMonth(draft.plannedDate)}`
    : draft.plannedDate && draft.actionType === 'REPLAN_TASKS'
      ? `جابه‌جایی به ${formatDayMonth(draft.plannedDate)}`
      : actionTitles[draft.actionType]
  if (!preview) {
    return (
      <Sheet title={title} entity="task" onClose={flow.cancel} locked={flow.previewPending}>
        {flow.previewPending
          ? <p role="status">در حال آماده‌سازی پیش‌نمایش…</p>
          : <FormError error={flow.previewError} />}
        <div className="sheet-actions">
          <button className="secondary-button" type="button" disabled={flow.previewPending} onClick={flow.cancel}>برگشت</button>
        </div>
      </Sheet>
    )
  }

  const hashes = acknowledged.previewId === preview.id ? acknowledged.hashes : []
  const allAcknowledged = preview.warnings.every(warning => hashes.includes(warning.warningHash))
  const submitCode = flow.submitError ? toApiError(flow.submitError).code : null
  const outdated = submitCode !== null && refreshableCodes.has(submitCode)
  const manual = preview.items.filter(item => item.classification === 'HAS_PROTECTED_MANUAL_SCHEDULE')

  const changing = preview.items.filter(item => item.classification !== 'UNCHANGED' && item.classification !== 'UNSCHEDULED_PARENT_OWNED' && item.classification !== 'HAS_PROTECTED_MANUAL_SCHEDULE').length

  return (
    <Sheet title={title} entity="task" onClose={flow.cancel} locked={flow.submitPending}>
      <p className="flex items-start gap-2.5 rounded-2xl bg-surface-sunken p-3 text-[0.8125rem] leading-7">
        <ShieldCheck size={18} className="mt-1 shrink-0 text-text-secondary" aria-hidden="true" />
        <span>همه‌ی این تغییرها <b>یک‌جا</b> انجام می‌شوند، یا هیچ‌کدام. این پیش‌نمایش را سرور ساخته و تا تأیید نکنید چیزی تغییر نمی‌کند.</span>
      </p>
      <ul className="mt-4 space-y-2.5" aria-label="موارد این اقدام">
        {preview.items.map(item => {
          const blocking = blockingClassifications.has(item.classification)
          const moves = item.resultingPlannedDate && item.resultingPlannedDate !== item.currentPlannedDate
          return (
            <li key={item.taskId} className="rounded-2xl border border-border-subtle bg-surface p-3.5">
              <p className="wrap-break-word font-extrabold">{item.title}</p>
              {moves && (
                <p className="mt-2 flex items-center gap-2 text-xs font-extrabold">
                  {item.currentPlannedDate && (
                    <span className="rounded-lg bg-surface-sunken px-2 py-1 text-text-secondary line-through">
                      <span className="sr-only">از </span>{formatDayMonth(item.currentPlannedDate)}
                    </span>
                  )}
                  <ArrowLeft size={15} className="text-text-secondary" aria-hidden="true" />
                  <span className="rounded-lg px-2 py-1 entity-task entity-ink" style={{ background: 'color-mix(in srgb, var(--color-entity-task) 12%, var(--color-surface))' }}>
                    <span className="sr-only">به </span>{formatDayMonth(item.resultingPlannedDate as string)}
                  </span>
                </p>
              )}
              <p className={`mt-2 flex items-start gap-1.5 text-xs leading-6 ${blocking ? 'font-bold text-attention' : 'text-text-secondary'}`}>
                {blocking && <CircleAlert size={14} className="mt-1 shrink-0" aria-hidden="true" />}
                {classificationLabels[item.classification] ?? item.classification}
              </p>
            </li>
          )
        })}
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

      <div className="sheet-actions">
        <button className="secondary-button" type="button" disabled={flow.submitPending} onClick={flow.cancel}>برگشت</button>
        {outdated
          ? <button className="primary-button flex-1" type="button" onClick={() => flow.request(draft)}>پیش‌نمایش تازه</button>
          : preview.canApply && (
            <button
              className={`${draft.actionType.includes('DROP') ? 'danger-button' : 'primary-button'} flex-1`}
              type="button"
              disabled={flow.submitPending || !allAcknowledged}
              onClick={() => flow.confirm(preview.warnings)}
            >
              {flow.submitPending ? 'در حال اعمال…' : `تأیید و ${verbs[draft.actionType] ?? 'اعمال'} ${formatNumber(Math.max(changing, 1))} کار`}
            </button>
          )}
      </div>
    </Sheet>
  )
}
