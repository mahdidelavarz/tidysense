import { createFileRoute } from '@tanstack/react-router'
import { TaskDetailView } from '../../features/tasks/components/TaskDetailView'

export const Route = createFileRoute('/tasks/$taskId')({ component: TaskRoute })

function TaskRoute() {
  const { taskId } = Route.useParams()
  return <TaskDetailView taskId={taskId} />
}
