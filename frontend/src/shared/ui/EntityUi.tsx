export type EntityKind = 'goal' | 'project' | 'task' | 'routine'

const entityLabels: Record<EntityKind, string> = {
  goal: 'هدف',
  project: 'پروژه',
  task: 'کار',
  routine: 'روتین',
}

export function EntityLabel({ entity }: { entity: EntityKind }) {
  return <span className={`entity-label entity-${entity}`}>{entityLabels[entity]}</span>
}

const statusLabels: Record<string, string> = {
  ACTIVE: 'فعال',
  ACHIEVED: 'محقق‌شده',
  ABANDONED: 'رهاشده',
  COMPLETED: 'تکمیل‌شده',
  DROPPED: 'کنار گذاشته‌شده',
  STOPPED: 'متوقف‌شده',
}

export function StatusBadge({ status }: { status: string }) {
  const tone = status === 'ACHIEVED' || status === 'COMPLETED' ? 'positive' : status === 'ACTIVE' ? 'active' : 'neutral'
  return <span className={`status-badge status-${tone}`}>{statusLabels[status] ?? status}</span>
}
