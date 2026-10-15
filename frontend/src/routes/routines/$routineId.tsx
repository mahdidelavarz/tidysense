import { createFileRoute } from '@tanstack/react-router'
import { RoutineDetailView } from '../../features/routines/components/RoutineDetailView'
import { RoutinesDesk } from '../../features/routines/components/RoutinesDesk'
import { useIsDesktop } from '../../shared/lib/use-desktop'

export const Route = createFileRoute('/routines/$routineId')({ component: RoutineRoute })

function RoutineRoute() {
  const { routineId } = Route.useParams()
  // On desktop the Routine opens beside the week (CodeDesktopRoutines); on a phone it is its own page.
  const desktop = useIsDesktop()
  return desktop ? <RoutinesDesk selectedId={routineId} /> : <RoutineDetailView routineId={routineId} />
}
