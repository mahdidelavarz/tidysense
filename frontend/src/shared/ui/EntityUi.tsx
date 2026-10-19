import { FolderKanban, ListChecks, type AppIcon, Repeat, Target } from './icons'

export type EntityKind = 'goal' | 'project' | 'task' | 'routine'

const entities: Record<EntityKind, { label: string; icon: AppIcon }> = {
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

/** Compact entity icon for dense places such as picker options. Decorative: the option text names the item. */
export function EntityMark({ entity }: { entity: EntityKind }) {
  const Icon = entities[entity].icon
  return (
    <span className={`entity-icon entity-${entity} size-7 rounded-lg`} aria-hidden="true">
      <Icon size={16} />
    </span>
  )
}

const statusLabels: Record<string, string> = {
  ACTIVE: 'فعال',
  ACHIEVED: 'محقق‌شده',
  ABANDONED: 'متوقف‌شده',
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
