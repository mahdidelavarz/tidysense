import { Link } from '@tanstack/react-router'
import { useEffect, useRef, useState } from 'react'
import { formatLocalDate, formatNumber } from '../../../shared/lib/date'
import {
  CalendarClock,
  Check,
  ChevronLeft,
  CircleDashed,
  FolderKanban,
  Hourglass,
  ListChecks,
  ListOrdered,
  Lock,
  Pause,
  RefreshCw,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  Sun,
  Target,
  Trash2,
} from '../../../shared/ui/icons'
import { formatAge, reasonLabels } from '../types/reconcile.format'
import type {
  ReconcileActionDraft,
  ReconcileOwnerGroupDto,
  ReconcileQuickActionDto,
  ReconcileQuickActionType,
  ReconcileSequenceGroupDto,
  ReconcileTaskItemDto,
} from '../types/reconcile.types'

/** What an open AI recommendation points at: the control it highlights and the recommendation to cite. */
export type Suggestion = { actionType: string; recommendationId: string }

type LaneActions = {
  /** The session's local date, to tell an earlier planned date from a later one. */
  today: string
  /** Starts an action that needs no further input; the server previews it next. */
  onAction: (draft: ReconcileActionDraft) => void
  /** Starts an action that first needs a date from the user. */
  onDatedAction: (draft: ReconcileActionDraft) => void
  /** «انجام شد» and «امروز»: applied on the tap, with an undo (027 §6). */
  onQuick: (task: ReconcileTaskItemDto, actionType: ReconcileQuickActionType) => void
  onUndo: (action: ReconcileQuickActionDto) => void
  /** The Task or quick action being sent, so its controls wait. */
  busyId?: string
  /** Controls an AI recommendation highlights, by Task or sequence id. It never applies anything. */
  suggestions: ReadonlyMap<string, Suggestion>
  /** The decision just applied: its row takes the focus, so the undo is one key away. */
  focusId?: string
}

const ownerKey = (type: string, id: string | null | undefined) => `${type}:${id ?? ''}`

/**
 * «کارهای عقب‌افتاده»: work that needs a decision, grouped by owner, then by
 * sequence, then by Task. A Task decided on tap in this session stays where it
 * was, as a short row with its undo, until the session closes.
 */
export function ExecutionLane({ groups, quickActions, total, ...actions }: {
  groups: ReconcileOwnerGroupDto[]
  /** This session's one-tap decisions, newest first. */
  quickActions: ReconcileQuickActionDto[]
  /** Every Task waiting for a decision, for the count beside the heading. */
  total: number
} & LaneActions) {
  // A decided Task no longer belongs to the evaluation; its owner may have no other decision left.
  const applied = quickActions.filter(action => action.status === 'APPLIED')
  type Owner = { type: string; id: string | null; title: string | null; group?: ReconcileOwnerGroupDto }
  const owners: Owner[] = groups.map(group => ({ type: group.ownerType, id: group.ownerId ?? null, title: group.ownerTitle ?? null, group }))
  for (const action of applied) {
    if (!owners.some(owner => ownerKey(owner.type, owner.id) === ownerKey(action.ownerType, action.ownerId))) {
      owners.push({ type: action.ownerType, id: action.ownerId ?? null, title: action.ownerTitle ?? null })
    }
  }

  return (
    <section aria-labelledby="reconcile-execution">
      <LaneHeading id="reconcile-execution" icon={ListChecks} count={total} hint="برای هر کدام یکی را انتخاب کنید.">
        کارهای عقب‌افتاده
      </LaneHeading>
      <div className="mt-4 space-y-5">
        {owners.map(owner => {
          const decided = applied.filter(action => ownerKey(action.ownerType, action.ownerId) === ownerKey(owner.type, owner.id))
          return (
            <div key={ownerKey(owner.type, owner.id)}>
              <OwnerLabel type={owner.type} title={owner.title} />
              <ul className="mt-2 space-y-3">
                {decided.map(action => (
                  <li key={action.id}><DecidedRow action={action} focus={actions.focusId === action.id} busy={actions.busyId === action.id} onUndo={() => actions.onUndo(action)} /></li>
                ))}
                {owner.group?.sequences.map(sequence => (
                  <li key={sequence.sequenceId}><SequenceCard sequence={sequence} {...actions} /></li>
                ))}
                {owner.group?.tasks.map(task => (
                  <li key={task.taskId}><TaskCard task={task} {...actions} /></li>
                ))}
              </ul>
            </div>
          )
        })}
      </div>
    </section>
  )
}

/** A lane's heading as on the board: an icon tile, the name with its count, and one line of what to do. */
export function LaneHeading({ id, icon: Icon, count, hint, entity, children }: {
  id: string
  icon: typeof ListChecks
  count: number
  hint: string
  entity?: string
  children: React.ReactNode
}) {
  return (
    <div className="flex items-start gap-3">
      <span className={`lane-tile ${entity ? `entity-${entity}` : ''}`} aria-hidden="true"><Icon size={19} /></span>
      <div className="min-w-0">
        <h2 className="lane-title" id={id}>
          {children}
          <span className="text-sm font-bold text-text-secondary">{formatNumber(count)}</span>
        </h2>
        <p className="lane-hint">{hint}</p>
      </div>
    </div>
  )
}

function OwnerLabel({ type, title }: { type: string; title: string | null }) {
  if (type === 'STANDALONE') {
    return (
      <p className="lane-owner text-text-secondary">
        <CircleDashed size={14} aria-hidden="true" />
        مستقل
      </p>
    )
  }
  const goal = type === 'GOAL'
  return (
    <p className={`lane-owner entity-ink ${goal ? 'entity-goal' : 'entity-project'}`}>
      {goal ? <Target size={14} aria-hidden="true" /> : <FolderKanban size={14} aria-hidden="true" />}
      <span className="sr-only">{goal ? 'هدف: ' : 'پروژه: '}</span>
      <span className="truncate">{title}</span>
    </p>
  )
}

/** A decision already applied on tap: what happened, and the way back while it still exists. */
function DecidedRow({ action, focus, busy, onUndo }: { action: ReconcileQuickActionDto; focus: boolean; busy: boolean; onUndo: () => void }) {
  const complete = action.actionType === 'COMPLETE_TASK'
  // The tapped tile is gone; its row's undo takes the focus instead of letting it fall to the page.
  const undo = useRef<HTMLButtonElement>(null)
  useEffect(() => { if (focus) undo.current?.focus() }, [focus])
  return (
    <article className="decided-row" aria-label={`${complete ? 'انجام شد' : 'به امروز آمد'}: ${action.title}`}>
      <span className={complete ? 'decided-tile entity-task' : 'decided-tile decided-sun'} aria-hidden="true">
        {complete ? <Check size={17} /> : <Sun size={17} />}
      </span>
      <span className="min-w-0 flex-1 leading-6">
        <span className={`block wrap-break-word text-sm font-extrabold ${complete ? 'text-text-secondary line-through decoration-1' : ''}`}>{action.title}</span>
        <span className="block text-xs text-text-secondary">
          {complete ? 'انجام شد' : `به امروز آمد${action.previousPlannedDate ? `؛ قبلاً ${formatLocalDate(action.previousPlannedDate)}` : ''}`}
        </span>
      </span>
      {action.canUndo
        ? (
          <button ref={undo} className="undo-button" type="button" disabled={busy} aria-label={`بازگردان: ${action.title}`} onClick={onUndo}>
            <RotateCcw size={16} aria-hidden="true" />
            {busy ? '…' : 'بازگردان'}
          </button>
        )
        // The Task changed after the tap: undoing would overwrite that change, so it is no longer offered.
        : <span className="shrink-0 text-[0.6875rem] text-text-secondary">بعداً تغییر کرد</span>}
    </article>
  )
}

/** One coherent decision for the remaining members of a sequence; «تک‌تک» opens each member's own. */
function SequenceCard({ sequence, ...actions }: { sequence: ReconcileSequenceGroupDto } & LaneActions) {
  const [individually, setIndividually] = useState(false)
  const allowed = new Set(sequence.allowedActions)
  const dropped = sequence.droppedPredecessor
  const suggested = actions.suggestions.get(sequence.sequenceId)
  const count = sequence.items.length
  const both = count === 2
  return (
    <article className="decision-card" aria-label="دنباله کارها">
      <p className="flex items-center gap-2 px-4 pt-3.5 text-[0.8125rem] font-extrabold text-text-secondary">
        <ListOrdered size={16} aria-hidden="true" />
        {both ? 'دو کار به‌هم‌وابسته' : `${formatNumber(count)} کار به‌هم‌وابسته`}
      </p>
      {dropped && (
        <p className="notice mx-4 mt-3">
          کار پیش‌نیاز کنار گذاشته شده است، پس کارهای بعدی قابل انجام نیستند تا درباره‌اش تصمیم بگیرید:{' '}
          <Link className="text-link" to="/tasks/$taskId" params={{ taskId: dropped.id }}>{dropped.title}</Link>
        </p>
      )}
      <ol className="mt-2 px-4">
        {sequence.items.map((task, index) => (
          <li key={task.taskId} className="flex items-center gap-3 py-1.5">
            <span className={task.isBlocked ? 'sequence-node sequence-lock' : 'sequence-node'} aria-hidden="true">
              {task.isBlocked ? <Lock size={12} /> : null}
            </span>
            <span className="min-w-0 flex-1 wrap-break-word text-[0.9375rem] font-extrabold">
              <span className="sr-only">{`قدم ${formatNumber(index + 1)}: `}</span>
              {task.title}
            </span>
            {task.isBlocked
              ? <span className="shrink-0 text-xs text-text-secondary">منتظر قبلی</span>
              : <AgeChip task={task} />}
          </li>
        ))}
      </ol>
      <div className="decision-bar mt-2">
        {allowed.has('SEQUENCE_CARRY_ALL') && (
          <Tile
            icon={CalendarClock}
            label={both ? 'هر دو جابه‌جا' : 'همه جابه‌جا'}
            name="جابه‌جایی کل دنباله"
            suggested={suggested?.actionType === 'SEQUENCE_CARRY_ALL'}
            onClick={() => actions.onDatedAction({ actionType: 'SEQUENCE_CARRY_ALL', sequenceId: sequence.sequenceId, recommendationId: pick(suggested, 'SEQUENCE_CARRY_ALL') })}
          />
        )}
        {allowed.has('DETACH_DROPPED_PREDECESSOR') && (
          <Tile
            icon={RefreshCw}
            label="ادامه بدون پیش‌نیاز"
            suggested={suggested?.actionType === 'DETACH_DROPPED_PREDECESSOR'}
            onClick={() => actions.onAction({ actionType: 'DETACH_DROPPED_PREDECESSOR', sequenceId: sequence.sequenceId, recommendationId: pick(suggested, 'DETACH_DROPPED_PREDECESSOR') })}
          />
        )}
        <Tile icon={ListOrdered} label="تک‌تک" name="تصمیم برای هر کار جداگانه" pressed={individually} onClick={() => setIndividually(value => !value)} />
        {allowed.has('SEQUENCE_DROP_ALL') && (
          <Tile
            icon={Trash2}
            tone="danger"
            label={both ? 'هر دو کنار' : 'همه کنار'}
            name="کنار گذاشتن کل دنباله"
            suggested={suggested?.actionType === 'SEQUENCE_DROP_ALL'}
            onClick={() => actions.onAction({ actionType: 'SEQUENCE_DROP_ALL', sequenceId: sequence.sequenceId, recommendationId: pick(suggested, 'SEQUENCE_DROP_ALL') })}
          />
        )}
      </div>
      {individually && (
        <ul className="space-y-2.5 border-t border-border-subtle bg-canvas p-2.5">
          {sequence.items.map(task => (
            <li key={task.taskId}><TaskCard task={task} nested {...actions} /></li>
          ))}
        </ul>
      )}
    </article>
  )
}

/**
 * One Task's decision. «انجام شد» and «امروز» say exactly what the tap does and
 * apply it; «جابه‌جا»، «بماند» and «کنار بگذار» show the server's preview first.
 */
function TaskCard({ task, nested = false, today, onAction, onDatedAction, onQuick, busyId, suggestions }: {
  task: ReconcileTaskItemDto
  nested?: boolean
} & LaneActions) {
  const allowed = new Set(task.allowedActions)
  const busy = busyId === task.taskId
  const suggested = suggestions.get(task.taskId)
  // «امروز» moves a Task planned for an earlier day, only where its deadline still allows today.
  const toToday = allowed.has('REPLAN_TASKS') && task.plannedDate != null && task.plannedDate < today &&
    (task.deadline == null || task.deadline >= today)
  const hasActions = ['COMPLETE_TASK', 'REPLAN_TASKS', 'KEEP_TASKS', 'DROP_TASKS'].some(action => allowed.has(action))
  return (
    <article className={nested ? 'decision-card shadow-none' : 'decision-card'} aria-label={task.title}>
      <div className="flex items-start gap-2 px-4 pt-3.5">
        <div className="min-w-0 flex-1">
          <h3 className="decision-title">{task.title}</h3>
          <p className="mt-1.5 flex flex-wrap items-center gap-1.5">
            <AgeChip task={task} />
            {task.deadline && <span className="meta-chip">مهلت: {formatLocalDate(task.deadline)}</span>}
            {Number(task.carryCount) > 0 && (
              <span className="meta-chip">
                <RotateCcw size={12} className="shrink-0" aria-hidden="true" />
                {formatNumber(Number(task.carryCount))} بار منتقل شده
              </span>
            )}
            {task.isProtected && (
              <span className="meta-chip">
                <ShieldCheck size={12} className="shrink-0" aria-hidden="true" />
                محافظت‌شده
              </span>
            )}
            {task.isBlocked && (
              <span className="meta-chip bg-caution-tint text-caution">
                <Lock size={12} className="shrink-0" aria-hidden="true" />
                منتظر کار پیشین
              </span>
            )}
            {/* The age chip already says a date has passed, so that reason is not repeated in words. */}
            {task.actionable && task.reasonCodes.filter(code => !(task.ageDays != null && code === 'EXECUTION_OVERDUE')).map(code => (
              <span key={code} className="meta-chip">{reasonLabels[code] ?? code}</span>
            ))}
          </p>
        </div>
        <Link className="icon-button -me-2 -mt-1.5" to="/tasks/$taskId" params={{ taskId: task.taskId }} aria-label={`جزئیات: ${task.title}`}>
          <ChevronLeft size={20} aria-hidden="true" />
        </Link>
      </div>
      {hasActions && (
        <div className="decision-bar mt-3">
          {allowed.has('COMPLETE_TASK') && task.actionable && (
            <Tile icon={Check} tone="done" label={busy ? '…' : 'انجام شد'} name={`انجام شد: ${task.title}`} disabled={busy} onClick={() => onQuick(task, 'COMPLETE_TASK')} />
          )}
          {toToday && task.actionable && (
            <Tile icon={Sun} tone="today" label="امروز" name={`امروز: ${task.title}`} disabled={busy} onClick={() => onQuick(task, 'CARRY_TO_TODAY')} />
          )}
          {allowed.has('REPLAN_TASKS') && (
            <Tile
              icon={CalendarClock}
              label="جابه‌جا"
              name={`جابه‌جا به روز دیگر: ${task.title}`}
              disabled={busy}
              suggested={suggested?.actionType === 'REPLAN_TASKS'}
              onClick={() => onDatedAction({ actionType: 'REPLAN_TASKS', taskIds: [task.taskId], recommendationId: pick(suggested, 'REPLAN_TASKS') })}
            />
          )}
          {allowed.has('KEEP_TASKS') && (
            <Tile
              icon={Pause}
              label="بماند"
              name={`فعلاً بماند: ${task.title}`}
              disabled={busy}
              suggested={suggested?.actionType === 'KEEP_TASKS'}
              onClick={() => onAction({ actionType: 'KEEP_TASKS', taskIds: [task.taskId], recommendationId: pick(suggested, 'KEEP_TASKS') })}
            />
          )}
          {allowed.has('DROP_TASKS') && (
            <Tile
              icon={Trash2}
              tone="danger"
              label="کنار بگذار"
              name={`کنار گذاشتن: ${task.title}`}
              disabled={busy}
              suggested={suggested?.actionType === 'DROP_TASKS'}
              onClick={() => onAction({ actionType: 'DROP_TASKS', taskIds: [task.taskId], recommendationId: pick(suggested, 'DROP_TASKS') })}
            />
          )}
        </div>
      )}
    </article>
  )
}

/** The recommendation is cited only when the user takes the very action it pointed at. */
function pick(suggested: Suggestion | undefined, actionType: string) {
  return suggested?.actionType === actionType ? suggested.recommendationId : undefined
}

function AgeChip({ task }: { task: ReconcileTaskItemDto }) {
  const age = formatAge(task.ageDays)
  if (!age) return null
  return (
    <span className="meta-chip bg-caution-tint text-caution">
      <Hourglass size={12} className="shrink-0" aria-hidden="true" />
      {age}
    </span>
  )
}

/**
 * One decision tile: icon over a short label. A tile an AI recommendation
 * points at is ringed in the moonstone and says so to a screen reader; it does
 * nothing more than any other tile.
 */
function Tile({ icon: Icon, label, name, tone, suggested = false, pressed, disabled, onClick }: {
  icon: typeof Check
  label: string
  /** The accessible name when the label alone is not enough. */
  name?: string
  tone?: 'done' | 'today' | 'danger'
  suggested?: boolean
  pressed?: boolean
  disabled?: boolean
  onClick: () => void
}) {
  return (
    <button
      className="decision-button"
      data-tone={tone}
      data-suggested={suggested || undefined}
      type="button"
      aria-label={name ? `${name}${suggested ? '، پیشنهاد دستیار' : ''}` : undefined}
      aria-pressed={pressed}
      disabled={disabled}
      onClick={onClick}
    >
      {suggested && <Sparkles size={12} className="decision-spark" aria-hidden="true" />}
      <Icon size={19} aria-hidden="true" />
      {label}
    </button>
  )
}
