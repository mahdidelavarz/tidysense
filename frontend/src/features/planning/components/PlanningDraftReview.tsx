import { type ReactNode, useId, useRef, useState } from 'react'
import { formatDayMonth, formatLocalDate, formatLongDate, formatNumber, parseIsoDate, toIsoDate } from '../../../shared/lib/date'
import { EntityLabel, type EntityKind } from '../../../shared/ui/EntityUi'
import { FormError } from '../../../shared/ui/FormUi'
import { ChevronDown, CircleAlert, CircleDashed, FolderKanban, Pencil, Plus, StickyNote, Target, X } from '../../../shared/ui/icons'
import { slotsLabel } from '../../routines/types/routine.format'
import {
  entityKinds,
  factTypeLabels,
  factValueLabel,
  issueLabels,
  proposalRecurrenceLabel,
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

const weekdayLetter = new Intl.DateTimeFormat('fa-IR', { weekday: 'narrow' })
const weekdayName = new Intl.DateTimeFormat('fa-IR', { weekday: 'long' })

type ReviewProps = {
  draft: PlanningDraftDto
  /** What the user wrote, quoted under the summary. */
  intention: string
  /** True while an edit is being stored; every control waits for the server's new revision. */
  busy: boolean
  error: unknown
  onEdit: (edit: PlanningDraftEdit, onStored?: () => void) => void
  onApprove: () => void
  onCancel: () => void
}

/**
 * Step three, «مرور»: what the draft would create, as the Goal → Project → Task
 * tree it forms, each item switched in or out and edited on its own; the next
 * seven days it would fill; and the planning details it offers to remember.
 * Review states and every consequence come from the server; this screen only
 * shows them and sends edits back.
 */
export function PlanningDraftReview({ draft, intention, busy, error, onEdit, onApprove, onCancel }: ReviewProps) {
  const [editing, setEditing] = useState<PlanningProposal | null>(null)
  const [collapsed, setCollapsed] = useState<ReadonlySet<string>>(new Set())
  const tree = useRef<HTMLDivElement>(null)
  const proposals = draft.proposals.map(item => item.proposal)
  const facts = draft.facts.map(item => item.fact)
  const children = (draftId: string | null) => draft.proposals.filter(item => (item.proposal.parentDraftId ?? null) === draftId)
  const roots = children(null)
  const notes = (draftId: string | null) => draft.assumptions.filter(note => note.draftId === draftId).map(note => note.text)
  const today = draft.windowStart

  const editProposal = (changed: PlanningProposal, onStored?: () => void) => onEdit({
    proposals: proposals.map(item => item.draftId === changed.draftId ? changed : item), facts,
  }, onStored)
  const toggle = (proposal: PlanningProposal) => editProposal({ ...proposal, included: !proposal.included })
  const toggleFact = (item: PlanningFactViewDto) => onEdit({
    proposals,
    facts: facts.map(fact => fact.draftId === item.fact.draftId ? { ...fact, included: !fact.included } : fact),
  })

  const parents = draft.proposals.filter(item => item.proposal.entityType === 'GOAL' || item.proposal.entityType === 'PROJECT')
  const allCollapsed = parents.length > 0 && parents.every(item => collapsed.has(item.proposal.draftId))
  const flip = (draftId: string) => setCollapsed(current => {
    const next = new Set(current)
    if (!next.delete(draftId)) next.add(draftId)
    return next
  })

  const blocked = draft.proposals.filter(item => item.state === 'BLOCKED').length + draft.facts.filter(item => item.state === 'BLOCKED').length
  const included = (type: string) => draft.proposals.filter(item => item.proposal.entityType === type && item.state !== 'EXCLUDED' && !item.excludedByAncestor).length

  // A sequence loses its order as one: its Tasks stay, independent of each other (029 §9).
  const unchain = (key: string) => onEdit({
    proposals: proposals.map(item => item.sequenceKey === key ? { ...item, sequenceKey: null, sequenceOrder: null } : item),
    facts,
  })
  const row = (item: PlanningProposalViewDto) => (
    <ItemRow key={item.proposal.draftId} item={item} today={today} notes={notes(item.proposal.draftId)} busy={busy}
      chain={chainOf(item.proposal, proposals)} onUnchain={unchain}
      onToggle={() => toggle(item.proposal)} onEdit={() => setEditing(item.proposal)} />
  )
  const project = (item: PlanningProposalViewDto) => (
    <ParentNode key={item.proposal.draftId} item={item} notes={notes(item.proposal.draftId)} busy={busy}
      collapsed={collapsed.has(item.proposal.draftId)} onCollapse={() => flip(item.proposal.draftId)}
      onToggle={() => toggle(item.proposal)} onEdit={() => setEditing(item.proposal)}>
      {children(item.proposal.draftId).map(row)}
    </ParentNode>
  )
  const goal = (item: PlanningProposalViewDto) => {
    const under = children(item.proposal.draftId)
    const direct = under.filter(child => child.proposal.entityType !== 'PROJECT')
    return (
      <ParentNode key={item.proposal.draftId} item={item} notes={notes(item.proposal.draftId)} busy={busy}
        meta={goalMeta(item, draft)}
        collapsed={collapsed.has(item.proposal.draftId)} onCollapse={() => flip(item.proposal.draftId)}
        onToggle={() => toggle(item.proposal)} onEdit={() => setEditing(item.proposal)}>
        {under.filter(child => child.proposal.entityType === 'PROJECT').map(project)}
        {direct.length > 0 && (
          <div className="plan-group">
            <p className="entity-ink px-3 pt-2 text-[0.6875rem] font-extrabold">مستقیم زیر این هدف</p>
            {direct.map(row)}
          </div>
        )}
      </ParentNode>
    )
  }
  const loose = roots.filter(item => item.proposal.entityType === 'TASK' || item.proposal.entityType === 'ROUTINE')

  return (
    <div aria-busy={busy}>
      <section className="draft-summary" aria-labelledby="planning-summary">
        <p className="inline-flex items-center gap-1.5 rounded-lg bg-sun-tint px-2.5 py-1 text-xs font-extrabold text-sun-strong">
          <Pencil size={13} aria-hidden="true" />
          پیش‌نویس؛ هنوز چیزی ساخته نشده
        </p>
        <h1 className="mt-3 text-lg font-extrabold leading-9 wrap-break-word" id="planning-summary">{draft.summary}</h1>
        <p className="draft-quote whitespace-pre-wrap wrap-break-word">«{intention}»</p>
        <p className="mt-3 text-xs leading-6 text-text-secondary">
          این هفته را دقیق چیدیم، از {formatLocalDate(draft.windowStart)} تا {formatLocalDate(draft.windowEnd)}. هفته‌ی بعد را با توجه به اینکه این هفته چطور پیش رفت می‌سازیم.
          {draft.context && <> موارد تازه زیر «{draft.context.title}» ساخته می‌شوند.</>}
        </p>
        <RemovedNote draft={draft} />
        <IssueLines issues={draft.draftIssues} />
        {notes(null).map(text => <p key={text} className="mt-2 text-sm text-text-secondary">فرض: {text}</p>)}
        {draft.unresolvedQuestions.length > 0 && (
          <div className="notice mt-4">
            <p className="font-bold">پرسش‌های بی‌پاسخ</p>
            <ul className="mt-1 list-inside list-disc">
              {draft.unresolvedQuestions.map(note => <li key={note.text}>{note.text}</li>)}
            </ul>
          </div>
        )}
      </section>

      <div className="mt-4"><FormError error={error} /></div>

      {roots.length > 0 && (
        <section className="mt-6" aria-labelledby="planning-structure" ref={tree}>
          <div className="flex items-center justify-between gap-3 px-1">
            <h2 className="text-base font-extrabold" id="planning-structure">ساختار پیشنهادی</h2>
            {parents.length > 0 && (
              <button
                className="min-h-10 px-1 text-xs font-extrabold text-text-secondary hover:text-text-primary"
                type="button"
                onClick={() => setCollapsed(allCollapsed ? new Set() : new Set(parents.map(item => item.proposal.draftId)))}
              >
                {allCollapsed ? 'باز کردن همه' : 'جمع کردن همه'}
              </button>
            )}
          </div>
          <ul className="mt-3 grid grid-cols-4 gap-2" aria-label="آنچه در برنامه است">
            {(['GOAL', 'PROJECT', 'TASK', 'ROUTINE'] as const).map(type => (
              <li key={type} className={`count-tile entity-${entityKinds[type]}`}>
                <b>{formatNumber(included(type))}</b>
                <span>{entityNames[entityKinds[type]]}</span>
              </li>
            ))}
          </ul>
          <div className="mt-3 space-y-3">
            {roots.filter(item => item.proposal.entityType === 'GOAL').map(goal)}
            {roots.filter(item => item.proposal.entityType === 'PROJECT').map(project)}
            {loose.length > 0 && (
              <div className="plan-group">
                <div className="plan-head">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-surface-sunken text-text-secondary" aria-hidden="true">
                    {draft.context?.type === 'GOAL' ? <Target size={18} /> : draft.context ? <FolderKanban size={18} /> : <CircleDashed size={18} />}
                  </span>
                  <span className="min-w-0">
                    <span className="block font-extrabold">{draft.context ? `زیر «${draft.context.title}»` : 'مستقل'}</span>
                    {!draft.context && <span className="block text-xs text-text-secondary">زیر هیچ هدف یا پروژه‌ای نیستند</span>}
                  </span>
                </div>
                {loose.map(row)}
              </div>
            )}
          </div>
        </section>
      )}

      <FirstWeek draft={draft} />

      {draft.facts.length > 0 && (
        <section className="question-card mt-4" aria-labelledby="planning-facts">
          <h2 className="flex items-center gap-2 font-extrabold" id="planning-facts">
            <StickyNote size={18} className="text-sun-strong" aria-hidden="true" />
            برای دفعه‌های بعد یادم بماند؟
          </h2>
          <p className="mt-1 text-xs leading-6 text-text-secondary">فقط موارد انتخاب‌شده برای برنامه‌ریزی‌های بعدی نگه داشته می‌شوند. این انتخاب از ساختن کارها جداست.</p>
          <ul className="mt-3 flex flex-wrap gap-2">
            {draft.facts.map(item => {
              const label = `${factTypeLabels[item.fact.factType] ?? item.fact.factType}: ${factValueLabel(item.fact.value)}`
              return (
                <li key={item.fact.draftId} className="max-w-full">
                  <button
                    className="fact-chip"
                    type="button"
                    aria-pressed={item.fact.included}
                    aria-label={`${item.fact.included ? 'یادم بماند' : 'یادم نماند'}: ${label}، ${strengthLabels[item.fact.strength] ?? ''}`}
                    disabled={busy}
                    onClick={() => toggleFact(item)}
                  >
                    <span className="truncate">{label}</span>
                    {item.fact.included ? <X size={14} aria-hidden="true" /> : <Plus size={14} aria-hidden="true" />}
                  </button>
                  {item.state !== 'EXCLUDED' && <IssueLines issues={item.issues} />}
                </li>
              )
            })}
          </ul>
        </section>
      )}

      <div className="flow-footer">
        {!draft.canApply && (
          <p className="mb-2 text-xs font-extrabold text-attention" role="status">
            {blocked > 0
              ? `${formatNumber(blocked)} مورد نیاز به اصلاح دارد.`
              : draft.proposals.length === 0 && draft.facts.length === 0
                ? 'این پیش‌نویس چیزی برای ساختن ندارد.'
                : 'دست‌کم یک مورد را در برنامه نگه دارید.'}
          </p>
        )}
        <div className="flex gap-3">
          {draft.canApply || blocked === 0 ? (
            <button className="primary-button min-h-13.5 flex-1 rounded-[1.125rem]" type="button" disabled={busy || !draft.canApply} onClick={onApprove}>
              مرور نهایی و تأیید
            </button>
          ) : (
            // Takes the user to the first item that needs fixing, instead of a dead button.
            <button
              className="primary-button min-h-13.5 flex-1 rounded-[1.125rem]"
              type="button"
              disabled={busy}
              onClick={() => tree.current?.querySelector<HTMLButtonElement>('[data-fix]')?.focus()}
            >
              اول {formatNumber(blocked)} مورد را اصلاح کنید
            </button>
          )}
          <button className="secondary-button min-h-13.5 rounded-[1.125rem] px-5" type="button" disabled={busy} onClick={onCancel}>لغو</button>
        </div>
      </div>

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

const entityNames: Record<EntityKind, string> = { goal: 'هدف', project: 'پروژه', task: 'کار', routine: 'روتین' }

/** A date the generator marked as its own estimate (029 §4). */
const estimated = (item: PlanningProposalViewDto) => item.issues.some(issue => issue.code === 'ASSUMED_DATES')

/** «تا ۳۰ اسفند (تخمینی)، ۲ پروژه، ۴ کار، ۱ روتین»: the Goal's date and what sits under it, at any depth. */
function goalMeta(item: PlanningProposalViewDto, draft: PlanningDraftDto): string {
  const goal = item.proposal
  const under = new Set([goal.draftId])
  for (let grew = true; grew;) {
    grew = false
    for (const item of draft.proposals) {
      if (item.proposal.parentDraftId && under.has(item.proposal.parentDraftId) && !under.has(item.proposal.draftId)) {
        under.add(item.proposal.draftId)
        grew = true
      }
    }
  }
  const count = (type: string) => draft.proposals.filter(item => item.proposal.entityType === type && under.has(item.proposal.draftId)).length
  return [
    goal.targetDate ? `تا ${formatDayMonth(goal.targetDate)}${estimated(item) ? ' (تخمینی)' : ''}` : null,
    count('PROJECT') > 0 ? `${formatNumber(count('PROJECT'))} پروژه` : null,
    count('TASK') > 0 ? `${formatNumber(count('TASK'))} کار` : null,
    count('ROUTINE') > 0 ? `${formatNumber(count('ROUTINE'))} روتین` : null,
  ].filter(Boolean).join('، ')
}

/** A proposed Goal or Project: its own switch, edit and fold, and what is under it. */
function ParentNode({ item, meta, notes, busy, collapsed, onCollapse, onToggle, onEdit, children }: {
  item: PlanningProposalViewDto
  meta?: string
  notes: string[]
  busy: boolean
  collapsed: boolean
  onCollapse: () => void
  onToggle: () => void
  onEdit: () => void
  children: ReactNode
}) {
  const proposal = item.proposal
  const entity = entityKinds[proposal.entityType] ?? 'project'
  const goal = entity === 'goal'
  const bodyId = useId()
  const excluded = item.state === 'EXCLUDED' || item.excludedByAncestor
  return (
    <article className={`${goal ? 'plan-goal' : 'plan-project'} entity-${entity}`} data-excluded={excluded} aria-label={proposal.title}>
      <div className={goal ? 'flex items-start gap-2.5 p-1.5' : 'plan-head'}>
        <Check proposal={proposal} busy={busy} onToggle={onToggle} />
        {goal && <span className="goal-tile size-10 shrink-0 rounded-[0.8125rem]" aria-hidden="true"><Target size={20} /></span>}
        <div className="min-w-0 flex-1">
          {goal
            ? <span className="entity-ink block text-[0.6875rem] font-extrabold">هدف</span>
            : (
              <span className="flex items-center gap-2 text-[0.6875rem] font-extrabold">
                <span className="entity-ink inline-flex items-center gap-1"><FolderKanban size={13} aria-hidden="true" />پروژه</span>
                {proposal.targetDate && <span className="text-text-secondary">تا {formatDayMonth(proposal.targetDate)}{estimated(item) && ' (تخمینی)'}</span>}
              </span>
            )}
          <h3 className={`plan-title wrap-break-word ${goal ? 'font-display text-[1.0625rem] font-bold leading-7' : 'font-extrabold leading-7'}`}>{proposal.title}</h3>
          {meta && <p className="text-xs text-text-secondary">{meta}</p>}
        </div>
        {/* Edit and fold stack, so a long title keeps the width. */}
        <span className="flex shrink-0 flex-col items-center gap-1">
        <EditButton title={proposal.title} busy={busy} onEdit={onEdit} />
        <button
          className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-surface shadow-sm"
          type="button"
          aria-expanded={!collapsed}
          aria-controls={bodyId}
          aria-label={`${collapsed ? 'باز کردن' : 'جمع کردن'}: ${proposal.title}`}
          onClick={onCollapse}
        >
          <ChevronDown size={18} className={collapsed ? '' : 'rotate-180'} aria-hidden="true" />
        </button>
        </span>
      </div>
      <ItemNotes item={item} notes={notes} onEdit={onEdit} />
      <div id={bodyId} hidden={collapsed} className={goal ? 'mt-1 space-y-2' : ''}>{children}</div>
    </article>
  )
}

/** One proposed Task or Routine: its switch, what it is, when, and its edit. */
function ItemRow({ item, today, notes, busy, chain, onUnchain, onToggle, onEdit }: {
  item: PlanningProposalViewDto
  today: string
  notes: string[]
  busy: boolean
  chain: PlanningProposal[]
  onUnchain: (key: string) => void
  onToggle: () => void
  onEdit: () => void
}) {
  const proposal = item.proposal
  const entity = entityKinds[proposal.entityType] ?? 'task'
  const when = proposal.entityType === 'ROUTINE'
    ? [proposalRecurrenceLabel(proposal), (proposal.timesOfDay ?? []).length > 0 ? slotsLabel(proposal.timesOfDay ?? []) : null].filter(Boolean).join(' ')
    : proposal.plannedDate ? proposal.plannedDate === today ? 'امروز' : formatDayMonth(proposal.plannedDate) : 'بدون تاریخ'
  return (
    <div className={`entity-${entity}`}>
      <div className="plan-row" data-excluded={item.state === 'EXCLUDED' || item.excludedByAncestor}>
        <Check proposal={proposal} busy={busy} onToggle={onToggle} />
        <span className="min-w-0 flex-1">
          <span className="plan-title block text-sm font-extrabold leading-6 wrap-break-word">{proposal.title}</span>
          <span className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-text-secondary">
            <EntityLabel entity={entity} />
            {when}
          </span>
        </span>
        <EditButton title={proposal.title} busy={busy} onEdit={onEdit} />
      </div>
      {chain.length > 1 && <ChainLine proposal={proposal} chain={chain} busy={busy} onUnchain={onUnchain} />}
      <ItemNotes item={item} notes={notes} onEdit={onEdit} />
    </div>
  )
}

/** The Tasks of a proposed sequence, in their order, or none. */
function chainOf(proposal: PlanningProposal, proposals: PlanningProposal[]): PlanningProposal[] {
  if (!proposal.sequenceKey) return []
  return proposals.filter(item => item.sequenceKey === proposal.sequenceKey)
    .sort((a, b) => Number(a.sequenceOrder) - Number(b.sequenceOrder))
}

/**
 * «قدم ۲ از ۳، بعد از «…»»: where a Task sits in its proposed sequence, which keeps it
 * waiting until the one before is done. The first step carries the one control that
 * removes the order (029 §9).
 */
function ChainLine({ proposal, chain, busy, onUnchain }: {
  proposal: PlanningProposal
  chain: PlanningProposal[]
  busy: boolean
  onUnchain: (key: string) => void
}) {
  const position = chain.findIndex(item => item.draftId === proposal.draftId)
  const before = chain[position - 1]
  return (
    <p className="flex flex-wrap items-center gap-x-2 gap-y-1 px-3 pb-2 text-xs leading-6 text-text-secondary">
      <span>
        قدم {formatNumber(position + 1)} از {formatNumber(chain.length)}
        {before ? `، بعد از «${before.title}»` : '؛ بعدی‌ها تا انجام این صبر می‌کنند'}
      </span>
      {position === 0 && (
        <button
          className="min-h-9 px-1 font-extrabold text-text-secondary underline-offset-4 hover:text-text-primary hover:underline"
          type="button"
          disabled={busy}
          aria-label={`برداشتن ترتیب: ${chain.map(item => item.title).join('، ')}`}
          onClick={() => onUnchain(proposal.sequenceKey ?? '')}
        >
          بدون ترتیب
        </button>
      )}
    </p>
  )
}

/** What the generator proposed but could not make valid, named once (029 §8). */
function RemovedNote({ draft }: { draft: PlanningDraftDto }) {
  const removed = draft.removedItems ?? []
  if (removed.length === 0) return null
  const names = removed.map(item => item.title ? `«${item.title}»` : 'یک جزئیات برنامه')
  return (
    <p className="notice mt-3 text-sm leading-7" role="note">
      این {removed.length === 1 ? 'مورد' : 'موارد'} را نتوانستیم درست بچینیم و کنار گذاشتیم: {names.join('، ')}. اگر لازم است، بعد از تأیید خودتان اضافه کنید.
    </p>
  )
}

function Check({ proposal, busy, onToggle }: { proposal: PlanningProposal; busy: boolean; onToggle: () => void }) {
  return (
    <input
      className="plan-check"
      type="checkbox"
      checked={proposal.included}
      disabled={busy}
      aria-label={`در برنامه باشد: ${proposal.title}`}
      onChange={onToggle}
    />
  )
}

function EditButton({ title, busy, onEdit }: { title: string; busy: boolean; onEdit: () => void }) {
  return (
    <button className="flex size-9 shrink-0 items-center justify-center rounded-xl text-text-secondary hover:bg-surface-sunken hover:text-text-primary" type="button" disabled={busy} aria-label={`ویرایش: ${title}`} onClick={onEdit}>
      <Pencil size={17} aria-hidden="true" />
    </button>
  )
}

/** What the server says about one item: a blocking reason with its fix, other reasons, assumptions. */
function ItemNotes({ item, notes, onEdit }: { item: PlanningProposalViewDto; notes: string[]; onEdit: () => void }) {
  const issues = item.state === 'EXCLUDED' ? [] : item.issues
  const blocking = issues.filter(issue => issue.severity === 'BLOCKING')
  const other = issues.filter(issue => issue.severity !== 'BLOCKING')
  if (blocking.length === 0 && other.length === 0 && notes.length === 0 && !item.excludedByAncestor && item.state !== 'BLOCKED_BY_ANCESTOR') return null
  return (
    <>
      {blocking.map(issue => (
        <p key={issue.code} className="plan-issue">
          <CircleAlert size={17} className="shrink-0" aria-hidden="true" />
          <span className="min-w-0 flex-1">نیازمند اصلاح: {issueLabels[issue.code] ?? issue.code}</span>
          <button className="danger-button min-h-9 shrink-0 px-3 text-xs" type="button" data-fix="" aria-label={`اصلاح: ${item.proposal.title}`} onClick={onEdit}>اصلاح</button>
        </p>
      ))}
      {(other.length > 0 || notes.length > 0 || item.excludedByAncestor || item.state === 'BLOCKED_BY_ANCESTOR') && (
        <ul className="space-y-0.5 px-3 pb-2 text-xs leading-6 text-text-secondary">
          {item.excludedByAncestor && <li>چون مورد بالاتر کنار گذاشته شده، این مورد هم ساخته نمی‌شود.</li>}
          {item.state === 'BLOCKED_BY_ANCESTOR' && <li>این مورد مشکلی ندارد؛ کافی است مورد بالاتر اصلاح شود.</li>}
          {other.map(issue => <li key={issue.code}>{issueLabels[issue.code] ?? issue.code}</li>)}
          {notes.map(text => <li key={text}>فرض: {text}</li>)}
        </ul>
      )}
    </>
  )
}

/** Reasons attached to the whole draft or to a planning detail. A blocking one says so in words, not colour alone. */
function IssueLines({ issues }: { issues: PlanningIssueDto[] }) {
  if (issues.length === 0) return null
  return (
    <ul className="mt-2 space-y-1 text-sm">
      {issues.map(issue => (
        <li key={issue.code} className={issue.severity === 'BLOCKING' ? 'font-bold text-attention' : 'text-text-secondary'}>
          {issue.severity === 'BLOCKING' ? 'نیازمند اصلاح: ' : ''}{issueLabels[issue.code] ?? issue.code}
        </li>
      ))}
    </ul>
  )
}

/**
 * «هفت روز پیش رو»: one column per day of the window, one bar per dated Task or
 * Routine slot the draft puts there (the server's first-week view), and the
 * load in one sentence.
 */
function FirstWeek({ draft }: { draft: PlanningDraftDto }) {
  const days: string[] = []
  for (let day = parseIsoDate(draft.windowStart); toIsoDate(day) <= draft.windowEnd; day.setDate(day.getDate() + 1)) days.push(toIsoDate(day))
  const types = new Map(draft.proposals.map(item => [item.proposal.draftId, item.proposal.entityType]))
  const on = (day: string) => draft.firstWeek.filter(entry => entry.date === day).map(entry => types.get(entry.draftId) ?? 'TASK')
  if (draft.firstWeek.length === 0 || days.length === 0) return null

  const tasks = draft.firstWeek.filter(entry => types.get(entry.draftId) === 'TASK').length
  const slots = draft.firstWeek.length - tasks
  const busiest = Math.max(...days.map(day => on(day).length))
  const free = days.filter(day => on(day).length === 0).map(day => weekdayName.format(parseIsoDate(day)))
  const load = [tasks > 0 ? `${formatNumber(tasks)} کار تاریخ‌دار` : null, slots > 0 ? `${formatNumber(slots)} نوبت روتین` : null]
  const sentence = [
    `${load.filter(Boolean).join(' و ')} در ${formatNumber(days.length)} روز`,
    `پرترین روز ${formatNumber(busiest)} مورد`,
    free.length > 0 ? `${free.join(' و ')} آزاد` : null,
  ].filter(Boolean).join('؛ ')

  return (
    <section className="question-card mt-4" aria-labelledby="planning-week">
      <h2 className="font-extrabold" id="planning-week">هفت روز پیش رو</h2>
      <ol className="mt-3 grid grid-cols-7 gap-1.5">
        {days.map(day => {
          const items = on(day)
          const taskCount = items.filter(type => type === 'TASK').length
          return (
            <li key={day} className="flex flex-col items-center gap-1.5" aria-label={`${formatLongDate(day)}: ${items.length === 0 ? 'آزاد' : `${formatNumber(taskCount)} کار، ${formatNumber(items.length - taskCount)} نوبت روتین`}`}>
              <span className="plan-day w-full" data-today={day === draft.windowStart} aria-hidden="true">
                {items.slice(0, 4).map((type, index) => (
                  // Bars have no identity of their own: their position is their key.
                  // biome-ignore lint/suspicious/noArrayIndexKey: see above.
                  <span key={index} className={`plan-bar entity-${entityKinds[type] ?? 'task'}`} />
                ))}
              </span>
              <span className={`text-xs ${day === draft.windowStart ? 'font-extrabold' : 'text-text-secondary'}`} aria-hidden="true">{weekdayLetter.format(parseIsoDate(day))}</span>
            </li>
          )
        })}
      </ol>
      <p className="mt-3 text-xs leading-6 text-text-secondary">{sentence}.</p>
    </section>
  )
}
