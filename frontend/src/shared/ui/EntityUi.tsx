import { FolderKanban, ListChecks, type LucideIcon, Repeat, Target } from 'lucide-react'

export type EntityKind = 'goal' | 'project' | 'task' | 'routine'

const entities: Record<EntityKind, { label: string; icon: LucideIcon }> = {
  goal: { label: 'هدف', icon: Target },
  project: { label: 'پروژه', icon: FolderKanban },
  task: { label: 'کار', icon: ListChecks },
  routine: { label: 'روتین', icon: Repeat },
}

/** Small labelled chip naming what kind of thing this is. Identity is icon + text, never colour alone. */
export function EntityLabel({ entity }: { entity: EntityKind }) {
  const { label, icon: Icon } = entities[entity]
  return (
    <span className={`entity-chip entity-${entity}`}>
      <Icon size={14} aria-hidden="true" />
      {label}
    </span>
  )
}

/** Decorative entity icon tile used at the start of cards and menu rows. */
export function EntityIcon({ entity }: { entity: EntityKind }) {
  const Icon = entities[entity].icon
  return (
    <span className={`entity-icon entity-${entity}`} aria-hidden="true">
      <Icon size={20} />
    </span>
  )
}

const statusLabels: Record<string, string> = {
  ACTIVE: 'فعال',
  ACHIEVED: 'محقق‌شده',
  ABANDONED: 'رهاشده',
  COMPLETED: 'تکمیل‌شده',
  DROPPED: 'کنار گذاشته‌شده',
  STOPPED: 'متوقف‌شده',
  PENDING: 'در انتظار',
  DONE: 'انجام‌شده',
  // A missed occurrence is a neutral fact, so its wording and tone carry no judgement.
  MISSED: 'انجام‌نشده',
}

/** Lifecycle status. Kept visually separate from entity identity. */
export function StatusBadge({ status }: { status: string }) {
  const positive = status === 'ACHIEVED' || status === 'COMPLETED' || status === 'DONE'
  const tone = positive ? 'positive' : status === 'ACTIVE' || status === 'PENDING' ? 'active' : 'neutral'
  return <span className={`status-badge status-${tone}`}>{statusLabels[status] ?? status}</span>
}
