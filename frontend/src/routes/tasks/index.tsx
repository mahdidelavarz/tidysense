import { createFileRoute } from '@tanstack/react-router'
import { TaskWorkspace } from '../../features/tasks/components/TaskWorkspace'

export const Route = createFileRoute('/tasks/')({ component: TaskWorkspace })
