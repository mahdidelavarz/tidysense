import { createFileRoute } from '@tanstack/react-router'
import { TaskDetailView } from '../../features/tasks/components/TaskDetailView'
import { TasksDesk } from '../../features/tasks/components/TasksDesk'
import { useIsDesktop } from '../../shared/lib/use-desktop'

export const Route = createFileRoute('/tasks/$taskId')({ component: TaskRoute })

function TaskRoute() {
  const { taskId } = Route.useParams()
  // On desktop the Task opens beside the list (CodeDesktopTasks); on a phone it is its own page.
  const desktop = useIsDesktop()
  return desktop ? <TasksDesk selectedId={taskId} /> : <TaskDetailView taskId={taskId} />
}
