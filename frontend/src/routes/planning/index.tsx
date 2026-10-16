import { createFileRoute, useRouterState } from '@tanstack/react-router'
import { PlanningPage } from '../../features/planning/components/PlanningPage'

const uuid = /^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i

/** A Goal or Project id opens planning for that parent; a planned week's id (`continue`) plans its next week. Anything else is ignored. */
const id = (value: unknown) => typeof value === 'string' && uuid.test(value) ? value : undefined

export const Route = createFileRoute('/planning/')({
  validateSearch: (search: Record<string, unknown>): { goalId?: string; projectId?: string; continue?: string } => {
    const continuation = id(search.continue)
    if (continuation) return { continue: continuation }
    const goalId = id(search.goalId)
    return goalId ? { goalId } : { projectId: id(search.projectId) }
  },
  component: PlanningRoute,
})

function PlanningRoute() {
  const search = Route.useSearch()
  // First Entry hands over what the user wrote; it stays out of the address.
  const intention = useRouterState({ select: state => state.location.state.intention })
  return <PlanningPage goalId={search.goalId} projectId={search.projectId} continuationOf={search.continue} initialIntention={intention} />
}

declare module '@tanstack/react-router' {
  interface HistoryState { intention?: string }
}
