import { useState } from 'react'
import { toApiError } from '../../../shared/api/http'
import { formatNumber } from '../../../shared/lib/date'
import { EntityLabel } from '../../../shared/ui/EntityUi'
import { FormError } from '../../../shared/ui/FormUi'
import { CircleCheck, ShieldCheck, Target } from '../../../shared/ui/icons'
import { Sheet } from '../../../shared/ui/Sheet'
import type { PlanningApplyFlow } from '../hooks/planning-hooks'
import { confirmationWarningLabels, entityKinds, factTypeLabels } from '../types/planning.format'
import { planningPhase } from '../types/planning.phase'
import type { PlanningConfirmationDto, PlanningDraftDto } from '../types/planning.types'

const title = 'مرور نهایی و تأیید'
const step = <span className="mt-1.5 shrink-0 rounded-full bg-surface-sunken px-2.5 py-1 text-xs font-extrabold">{formatNumber(4)} از {formatNumber(4)}</span>

/**
 * Step four, «تأیید»: the server's preview of one draft revision, in the same
 * Goal → Project → Task shape, and submitting exactly that preview. If the
 * server says the preview no longer matches, nothing was created and the only
 * way forward is a fresh preview.
 */
export function PlanningApplyDialog({ flow, draft }: { flow: PlanningApplyFlow; draft: PlanningDraftDto }) {
  // Acknowledgements belong to one preview: a new preview starts unacknowledged.
  const [acknowledged, setAcknowledged] = useState<{ previewId: string; hashes: string[] }>({ previewId: '', hashes: [] })
  if (!flow.open) return null

  const { preview } = flow
  if (!preview) {
    return (
      <Sheet title={title} aside={step} onClose={flow.cancel} locked={flow.previewPending}>
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
  const count = (type: string) => preview.items.filter(item => item.entityType === type).length

  return (
    <Sheet title={title} aside={step} onClose={flow.cancel} locked={flow.submitPending}>
      <p className="flex items-start gap-2.5 rounded-2xl bg-positive-tint p-3.5 text-[0.8125rem] leading-7">
        <ShieldCheck size={18} className="mt-1 shrink-0 text-positive" aria-hidden="true" />
        <span>همه‌ی این‌ها <b>یک‌جا</b> ساخته می‌شوند، یا هیچ‌کدام. بعداً هر کدام را جدا می‌توانید ویرایش یا حذف کنید.</span>
      </p>
      <ul className="mt-4 grid grid-cols-4 gap-2" aria-label="شمار موارد">
        {(['GOAL', 'PROJECT', 'TASK', 'ROUTINE'] as const).map(type => (
          <li key={type} className={`count-tile entity-${entityKinds[type]} min-h-12 flex-row gap-1.5`}>
            <b>{formatNumber(count(type))}</b>
            <span>{{ GOAL: 'هدف', PROJECT: 'پروژه', TASK: 'کار', ROUTINE: 'روتین' }[type]}</span>
          </li>
        ))}
      </ul>

      <h3 className="mt-5 flex items-center gap-1.5 text-sm font-extrabold text-positive">
        <CircleCheck size={17} aria-hidden="true" />
        ساخته می‌شود
      </h3>
      <PreviewTree preview={preview} draft={draft} />

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

      <div className="sheet-actions">
        <button className="secondary-button" type="button" disabled={flow.submitPending} onClick={flow.cancel}>برگشت</button>
        {conflicted
          ? <button className="primary-button flex-1" type="button" onClick={() => flow.request(Number(draft.revision))}>پیش‌نمایش تازه</button>
          : (
            <button
              className="primary-button flex-1"
              type="button"
              disabled={phase === 'submittingCommand' || phase === 'awaitingAcknowledgement'}
              onClick={() => flow.confirm(preview.warnings)}
            >
              <CircleCheck size={19} aria-hidden="true" />
              {phase === 'submittingCommand' ? 'در حال ساخت…' : `تأیید و ساخت ${formatNumber(preview.items.length)} مورد`}
            </button>
          )}
      </div>
    </Sheet>
  )
}

/**
 * What will be created, nested as the draft nests it: each Goal holds its
 * Projects and its direct Tasks and Routines, each Project its own. Only items
 * in the preview appear; the nesting comes from the draft.
 */
function PreviewTree({ preview, draft }: { preview: PlanningConfirmationDto; draft: PlanningDraftDto }) {
  const parentOf = new Map(draft.proposals.map(item => [item.proposal.draftId, item.proposal.parentDraftId ?? null]))
  const created = new Set(preview.items.map(item => item.draftId))
  const under = (parent: string | null) => preview.items.filter(item =>
    (created.has(parentOf.get(item.draftId) ?? '') ? parentOf.get(item.draftId) ?? null : null) === parent)
  const line = (item: PlanningConfirmationDto['items'][number]) => (
    <li key={item.draftId} className="flex items-center gap-2 py-1">
      <EntityLabel entity={entityKinds[item.entityType] ?? 'task'} />
      <span className="min-w-0 text-[0.8125rem] font-extrabold wrap-break-word">{item.title}</span>
    </li>
  )
  const project = (item: PlanningConfirmationDto['items'][number]) => (
    <li key={item.draftId} className="apply-box entity-project">
      <ul>{line(item)}{under(item.draftId).map(line)}</ul>
    </li>
  )

  return (
    <ul className="mt-2.5 space-y-2.5" aria-label="مواردی که ساخته می‌شوند">
      {under(null).map(item => {
        if (item.entityType === 'GOAL') {
          const children = under(item.draftId)
          return (
            <li key={item.draftId} className="apply-goal entity-goal">
              <p className="flex items-center gap-2.5">
                <span className="goal-tile size-8 rounded-[0.5625rem]" aria-hidden="true"><Target size={17} /></span>
                <span className="min-w-0 leading-5">
                  <span className="entity-ink block text-[0.6875rem] font-extrabold">هدف</span>
                  <span className="block text-sm font-extrabold wrap-break-word">{item.title}</span>
                </span>
              </p>
              <ul>
                {children.filter(child => child.entityType === 'PROJECT').map(project)}
                {children.some(child => child.entityType !== 'PROJECT') && (
                  <li className="apply-box"><ul>{children.filter(child => child.entityType !== 'PROJECT').map(line)}</ul></li>
                )}
              </ul>
            </li>
          )
        }
        if (item.entityType === 'PROJECT') return <li key={item.draftId}><ul>{project(item)}</ul></li>
        return <li key={item.draftId} className="apply-box"><ul>{line(item)}</ul></li>
      })}
    </ul>
  )
}
