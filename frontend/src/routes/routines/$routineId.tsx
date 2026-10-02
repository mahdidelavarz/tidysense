import { createFileRoute } from '@tanstack/react-router'
import { RoutineDetailView } from '../../features/routines/components/RoutineDetailView'

export const Route = createFileRoute('/routines/$routineId')({ component: RoutineRoute })

function RoutineRoute() {
  const { routineId } = Route.useParams()
  return <RoutineDetailView routineId={routineId} />
}
