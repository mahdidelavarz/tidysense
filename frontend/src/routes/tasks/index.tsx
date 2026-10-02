import { createFileRoute } from '@tanstack/react-router'
import { TasksPage } from '../../features/tasks/components/TasksPage'

export const Route = createFileRoute('/tasks/')({ component: TasksPage })
