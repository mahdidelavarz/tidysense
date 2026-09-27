import { createFileRoute } from '@tanstack/react-router'
import { GoalDetailView } from '../../features/goals/components/GoalDetailView'

export const Route = createFileRoute('/goals/$goalId')({ component: GoalRoute })

function GoalRoute() {
  const { goalId } = Route.useParams()
  return <GoalDetailView goalId={goalId} />
}
