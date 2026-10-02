import type { TaskDto } from '../types/task.types'

/** The list of same-sequence predecessor Tasks still blocking this one. */
export function BlockedByList({ blockers }: { blockers: TaskDto['blockedBy'] }) {
  if (blockers.length === 0) return null
  return (
    <ul className="mt-2 list-inside list-disc">
      {blockers.map(blocker => <li key={blocker.id}>{blocker.title}</li>)}
    </ul>
  )
}
