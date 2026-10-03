import { useState } from 'react'
import { formatLocalDate, formatLongDate } from '../../../shared/lib/date'
import { EntityLabel } from '../../../shared/ui/EntityUi'
import { FormError } from '../../../shared/ui/FormUi'
import { slotsLabel } from '../../routines/types/routine.format'
import {
  entityKinds,
  factTypeLabels,
  factValueLabel,
  issueLabels,
  proposalRecurrenceLabel,
  stateLabels,
  strengthLabels,
} from '../types/planning.format'
import type {
  PlanningDraftDto,
  PlanningDraftEdit,
  PlanningFactViewDto,
  PlanningIssueDto,
  PlanningProposal,
  PlanningProposalViewDto,
} from '../types/planning.types'
import { ProposalEditSheet } from './ProposalEditSheet'

type ReviewProps = {
  draft: PlanningDraftDto
  /** True while an edit is being stored; every control waits for the server's new revision. */
  busy: boolean
  error: unknown
  onEdit: (edit: PlanningDraftEdit, onStored?: () => void) => void
  onApprove: () => void
  onCancel: () => void
  onManual: () => void
}

/**
 * Draft review: the proposed hierarchy, the seven-day view derived from it,
 * and the planning details, each selectable on its own. Review states and
 * every consequence come from the server; this screen only shows them and
 * sends edits back.
 */
export function PlanningDraftReview({ draft, busy, error, onEdit, onApprove, onCancel, onManual }: ReviewProps) {
  const [editing, setEditing] = useState<PlanningProposal | null>(null)
  const proposals = draft.proposals.map(item => item.proposal)
  const facts = draft.facts.map(item => item.fact)
  const titles = new Map(proposals.map(item => [item.draftId, item.title]))
  const roots = draft.proposals.filter(item => !item.proposal.parentDraftId)
  const notes = (draftId: string | null) => draft.assumptions.filter(note => note.draftId === draftId)

  const editProposal = (changed: PlanningProposal, onStored?: () => void) => onEdit({
    proposals: proposals.map(item => item.draftId === changed.draftId ? changed : item), facts,
  }, onStored)
  const toggleFact = (item: PlanningFactViewDto) => onEdit({
    proposals,
    facts: facts.map(fact => fact.draftId === item.fact.draftId ? { ...fact, included: !fact.included } : fact),
  })

  const days = [...new Set(draft.firstWeek.map(entry => entry.date))].sort()

  function renderBranch(items: PlanningProposalViewDto[]) {
    return (
      <ul className="space-y-3">
        {items.map(item => {
          const children = draft.proposals.filter(child => child.proposal.parentDraftId === item.proposal.draftId)
          return (
            <li key={item.proposal.draftId}>
              <ProposalCard
                item={item}
                owner={item.proposal.parentDraftId
                  ? `زیر «${titles.get(item.proposal.parentDraftId) ?? ''}»`
                  : item.proposal.underContext && draft.context ? `زیر «${draft.context.title}»` : 'مستقل'}
                placements={draft.firstWeek.filter(entry => entry.draftId === item.proposal.draftId).map(entry => entry.date)}
                assumptions={notes(item.proposal.draftId).map(note => note.text)}
                busy={busy}
                onToggle={() => editProposal({ ...item.proposal, included: !item.proposal.included })}
                onEdit={() => setEditing(item.proposal)}
              />
              {children.length > 0 && <div className="ms-3 mt-3 border-s-2 border-border-subtle ps-3 sm:ms-5 sm:ps-5">{renderBranch(children)}</div>}
            </li>
          )
        })}
      </ul>
    )
  }

  return (
    <div className="space-y-8" aria-busy={busy}>
      <section className="card" aria-labelledby="planning-summary">
        <h2 className="sr-only" id="planning-summary">خلاصه پیش‌نویس</h2>
        <p className="status-badge status-neutral">پیش‌نویس تأییدنشده</p>
        <p className="mt-3 font-bold">{draft.summary}</p>
        <p className="mt-1 text-sm text-text-secondary">
          برنامه دقیق فقط برای هفت روز است: از {formatLocalDate(draft.windowStart)} تا {formatLocalDate(draft.windowEnd)}.
          {draft.context && <> موارد تازه زیر «{draft.context.title}» ساخته می‌شوند.</>}
        </p>
        <IssueList issues={draft.draftIssues} />
        {notes(null).map(note => <p key={note.text} className="mt-2 text-sm text-text-secondary">فرض: {note.text}</p>)}
        {draft.unresolvedQuestions.length > 0 && (
          <div className="notice mt-4">
            <p className="font-bold">پرسش‌های بی‌پاسخ</p>
            <ul className="mt-1 list-inside list-disc">
              {draft.unresolvedQuestions.map(note => <li key={note.text}>{note.text}</li>)}
            </ul>
          </div>
        )}
      </section>

      <FormError error={error} />

      {roots.length > 0 && (
        <section aria-labelledby="planning-structure">
          <h2 className="section-title" id="planning-structure">ساختار پیشنهادی</h2>
          <div className="mt-3">{renderBranch(roots)}</div>
        </section>
      )}

      {days.length > 0 && (
        <section aria-labelledby="planning-week">
          <h2 className="section-title" id="planning-week">هفت روز پیش رو</h2>
          <ul className="card mt-3 space-y-3">
            {days.map(day => (
              <li key={day}>
                <p className="text-sm font-bold"><time dateTime={day}>{formatLongDate(day)}</time></p>
                <p className="text-sm text-text-secondary">
                  {draft.firstWeek.filter(entry => entry.date === day).map(entry => titles.get(entry.draftId)).join('، ')}
                </p>
              </li>
            ))}
          </ul>
        </section>
      )}

      {draft.facts.length > 0 && (
        <section aria-labelledby="planning-facts">
          <h2 className="section-title" id="planning-facts">جزئیات برای برنامه‌ریزی‌های بعدی</h2>
          <p className="mt-1 text-sm text-text-secondary">
            فقط مواردی که انتخاب کنید نگه داشته می‌شوند. این انتخاب از تأیید کارها جداست.
          </p>
          <ul className="mt-3 space-y-3">
            {draft.facts.map(item => (
              <li key={item.fact.draftId} className="card">
                <label className="flex items-start gap-3">
                  <input
                    className="mt-1 size-5 shrink-0 accent-accent"
                    type="checkbox"
                    checked={item.fact.included}
                    disabled={busy}
                    onChange={() => toggleFact(item)}
                  />
                  <span className="min-w-0">
                    <span className="block font-bold">{factTypeLabels[item.fact.factType] ?? item.fact.factType}: {factValueLabel(item.fact.value)}</span>
                    <span className="block text-sm text-text-secondary">{strengthLabels[item.fact.strength] ?? item.fact.strength}</span>
                  </span>
                </label>
                {item.state !== 'EXCLUDED' && <IssueList issues={item.issues} />}
              </li>
            ))}
          </ul>
          {draft.facts.every(item => item.state === 'EXCLUDED') && (
            <p className="notice mt-3">جزئیات بیشتری برای برنامه‌ریزی‌های بعدی به خاطر سپرده نمی‌شود.</p>
          )}
        </section>
      )}

      <section className="border-t border-border-subtle pt-6" aria-label="تأیید یا لغو پیش‌نویس">
        {!draft.canApply && (
          <p className="notice-attention mb-4" role="status">
            {draft.proposals.length === 0 && draft.facts.length === 0
              ? 'این پیش‌نویس چیزی برای ساختن ندارد.'
              : 'برای ادامه، موارد «نیازمند اصلاح» را درست کنید یا کنار بگذارید و دست‌کم یک مورد را در برنامه نگه دارید.'}
          </p>
        )}
        <div className="flex flex-wrap items-center gap-3">
          <button className="primary-button" type="button" disabled={busy || !draft.canApply} onClick={onApprove}>مرور نهایی و تأیید</button>
          <button className="secondary-button" type="button" disabled={busy} onClick={onCancel}>لغو پیش‌نویس</button>
          <button className="ghost-button" type="button" onClick={onManual}>خودم دستی می‌سازم</button>
        </div>
      </section>

      {editing && (
        <ProposalEditSheet
          proposal={editing}
          draft={draft}
          pending={busy}
          error={error}
          onClose={() => setEditing(null)}
          onSubmit={changed => editProposal(changed, () => setEditing(null))}
        />
      )}
    </div>
  )
}

const stateTones: Record<string, string> = {
  INCLUDED: 'status-active', EXCLUDED: 'status-neutral', BLOCKED: 'status-neutral', BLOCKED_BY_ANCESTOR: 'status-neutral',
}

/** One proposed entity: what it is, where it belongs, its review state and the reasons beside it. */
function ProposalCard({ item, owner, placements, assumptions, busy, onToggle, onEdit }: {
  item: PlanningProposalViewDto
  owner: string
  placements: string[]
  assumptions: string[]
  busy: boolean
  onToggle: () => void
  onEdit: () => void
}) {
  const proposal = item.proposal
  const defaultReview = proposal.reviewDateSource === 'SYSTEM_DEFAULT' ? ' (پیش‌فرض)' : ''
  return (
    <article className="card" aria-label={proposal.title}>
      <div className="flex flex-wrap items-center gap-2">
        <EntityLabel entity={entityKinds[proposal.entityType] ?? 'task'} />
        <span className={`status-badge ${stateTones[item.state] ?? 'status-neutral'}`}>{stateLabels[item.state] ?? item.state}</span>
      </div>
      <h3 className="mt-3 wrap-break-word font-bold">{proposal.title}</h3>
      <p className="text-sm text-text-secondary">{owner}</p>
      <ul className="mt-2 space-y-1 text-sm text-text-secondary">
        {proposal.desiredOutcome && <li>نتیجه مطلوب: {proposal.desiredOutcome}</li>}
        {proposal.completionMeaning && <li>معنای تکمیل: {proposal.completionMeaning}</li>}
        {proposal.targetDate && <li>تاریخ هدف: {formatLocalDate(proposal.targetDate)}</li>}
        {proposal.reviewDate && <li>تاریخ بازبینی: {formatLocalDate(proposal.reviewDate)}{defaultReview}</li>}
        {proposal.entityType === 'TASK' && (
          <li>{proposal.plannedDate ? `تاریخ برنامه‌ریزی: ${formatLocalDate(proposal.plannedDate)}` : 'بدون تاریخ'}</li>
        )}
        {proposal.deadline && <li>مهلت: {formatLocalDate(proposal.deadline)}</li>}
        {proposal.entityType === 'ROUTINE' && (
          <li>تکرار: {proposalRecurrenceLabel(proposal)} · {slotsLabel(proposal.timesOfDay ?? [])}</li>
        )}
        {placements.length > 0 && <li>در هفته اول: {placements.map(formatLongDate).join('، ')}</li>}
        {assumptions.map(text => <li key={text}>فرض: {text}</li>)}
      </ul>

      {item.excludedByAncestor && (
        <p className="notice mt-3">چون مورد بالاتر کنار گذاشته شده، این مورد هم ساخته نمی‌شود.</p>
      )}
      {item.state === 'BLOCKED_BY_ANCESTOR' && (
        <p className="notice mt-3">این مورد مشکلی ندارد؛ کافی است مورد بالاتر اصلاح شود.</p>
      )}
      {item.state !== 'EXCLUDED' && <IssueList issues={item.issues} />}

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <label className="flex min-h-11 items-center gap-2 text-sm font-bold">
          <input
            className="size-5 shrink-0 accent-accent"
            type="checkbox"
            checked={proposal.included}
            disabled={busy}
            aria-label={`در برنامه باشد: ${proposal.title}`}
            onChange={onToggle}
          />
          در برنامه باشد
        </label>
        <button className="secondary-button min-h-9 px-3" type="button" disabled={busy} aria-label={`ویرایش: ${proposal.title}`} onClick={onEdit}>
          ویرایش
        </button>
      </div>
    </article>
  )
}

/** The reasons attached to an item or to the draft. A blocking reason is emphasised with weight and wording, not colour alone. */
function IssueList({ issues }: { issues: PlanningIssueDto[] }) {
  if (issues.length === 0) return null
  return (
    <ul className="mt-3 space-y-1 text-sm">
      {issues.map(issue => (
        <li key={issue.code} className={issue.severity === 'BLOCKING' ? 'font-bold text-attention' : 'text-text-secondary'}>
          {issue.severity === 'BLOCKING' ? 'نیازمند اصلاح: ' : ''}{issueLabels[issue.code] ?? issue.code}
        </li>
      ))}
    </ul>
  )
}
