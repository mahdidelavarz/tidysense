import { Link } from '@tanstack/react-router'
import { CircleAlert, CircleCheck, CircleSlash, FolderKanban, ListChecks, Repeat, Target } from './icons'
import { ConfirmationDialog } from './ConfirmationDialog'

export type TerminalItem = { id: string; kind: 'Project' | 'Task' | 'Routine'; title: string }

const kinds = {
  Project: { label: 'پروژه', entity: 'project', icon: FolderKanban },
  Task: { label: 'کار', entity: 'task', icon: ListChecks },
  Routine: { label: 'روتین', entity: 'routine', icon: Repeat },
} as const

/** Opens the page of one item that stands in the way, so it can be finished or set aside there. */
function OpenLink({ item }: { item: TerminalItem }) {
  const label = `باز کن: ${item.title}`
  if (item.kind === 'Project') return <Link className="primary-button min-h-9 shrink-0 px-3 text-xs" to="/projects/$projectId" params={{ projectId: item.id }} aria-label={label}>باز کن</Link>
  if (item.kind === 'Routine') return <Link className="primary-button min-h-9 shrink-0 px-3 text-xs" to="/routines/$routineId" params={{ routineId: item.id }} aria-label={label}>باز کن</Link>
  return <Link className="primary-button min-h-9 shrink-0 px-3 text-xs" to="/tasks/$taskId" params={{ taskId: item.id }} aria-label={label}>باز کن</Link>
}

function ItemRow({ item, action }: { item: TerminalItem; action?: React.ReactNode }) {
  const kind = kinds[item.kind]
  return (
    <li className={`entity-${kind.entity} flex items-center gap-2.5 rounded-2xl bg-surface p-2.5`} style={{ boxShadow: 'inset 0 0 0 1px var(--color-border-subtle)' }}>
      <span className="project-tile size-8.5 rounded-[0.6875rem]" aria-hidden="true"><kind.icon size={17} /></span>
      <span className="min-w-0 flex-1 leading-5">
        <span className="entity-ink block text-[0.6875rem] font-extrabold">{kind.label}</span>
        <span className="block truncate text-sm font-extrabold">{item.title}</span>
      </span>
      {action}
    </li>
  )
}

/**
 * Confirmation of an explicit terminal transition (a Goal achieved or
 * abandoned, a Project completed or stopped). While active children stand
 * in the way it lists them, each with a way to open it, and offers only
 * "later"; once nothing does, it says what confirming will change, including
 * the Routines it will stop by itself, then asks.
 */
export function TerminalDialog({ entity, entityTitle, title, tone, confirmLabel, pending, canApply, blockers, cascades = [], notes, onCancel, onConfirm }: {
  entity: 'goal' | 'project'
  entityTitle: string
  title: string
  tone: 'positive' | 'attention'
  confirmLabel: string
  pending: boolean
  canApply: boolean
  blockers: TerminalItem[]
  /** Children the transition will change by itself, shown so the decision is informed. */
  cascades?: TerminalItem[]
  /** What confirming means, a line each. */
  notes: string[]
  onCancel: () => void
  onConfirm: () => void
}) {
  const ToneIcon = tone === 'positive' ? CircleCheck : CircleSlash
  return (
    <ConfirmationDialog
      title={title}
      onClose={onCancel}
      pending={pending}
      actions={canApply ? (
        <>
          <button className="secondary-button" type="button" onClick={onCancel} disabled={pending}>انصراف</button>
          <button className={tone === 'positive' ? 'primary-button' : 'danger-button'} type="button" disabled={pending} onClick={onConfirm}>
            <ToneIcon size={18} aria-hidden="true" />
            {pending ? 'در حال ثبت…' : confirmLabel}
          </button>
        </>
      ) : (
        <button className="secondary-button flex-1" type="button" onClick={onCancel}>باشه، بعداً</button>
      )}
    >
      <div className={`sample-goal entity-${entity} flex items-center gap-2.5 py-2.5`}>
        <span className={entity === 'goal' ? 'goal-tile size-8 rounded-[0.5625rem]' : 'project-tile size-8 rounded-[0.5625rem]'} aria-hidden="true">
          {entity === 'goal' ? <Target size={17} /> : <FolderKanban size={17} />}
        </span>
        <span className="leading-6">
          <span className="entity-ink block text-[0.6875rem] font-extrabold">{entity === 'goal' ? 'هدف' : 'پروژه'}</span>
          <span className="block font-display text-base font-bold">{entityTitle}</span>
        </span>
      </div>
      {blockers.length > 0 ? (
        <div className="mt-3">
          <p className="flex items-start gap-2 text-[0.8125rem] leading-7">
            <CircleAlert size={17} className="mt-1 shrink-0 text-caution" aria-hidden="true" />
            <span><b>این‌ها هنوز زیر این {entity === 'goal' ? 'هدف' : 'پروژه'} فعال‌اند.</b> اول تکلیفشان را روشن کنید؛ بعد می‌شود ادامه داد.</span>
          </p>
          <ul className="mt-2.5 space-y-2">
            {blockers.map(item => <ItemRow key={item.id} item={item} action={<OpenLink item={item} />} />)}
          </ul>
          <p className="mt-2.5 text-[0.71875rem] text-text-secondary">«باز کن» صفحه‌ی همان مورد را باز می‌کند تا تمامش کنید یا کنارش بگذارید.</p>
        </div>
      ) : (
        <ul className="mt-3 space-y-2 rounded-2xl bg-canvas p-3.5 text-[0.8125rem] leading-6">
          {notes.map(note => (
            <li key={note} className="flex gap-2"><ToneIcon size={15} className="mt-1 shrink-0 text-text-secondary" aria-hidden="true" />{note}</li>
          ))}
        </ul>
      )}
      {cascades.length > 0 && (
        <div className="mt-3">
          <p className="text-[0.8125rem] font-bold">این روتین‌ها با تأیید شما متوقف می‌شوند:</p>
          <ul className="mt-2 space-y-2">{cascades.map(item => <ItemRow key={item.id} item={item} />)}</ul>
        </div>
      )}
    </ConfirmationDialog>
  )
}
