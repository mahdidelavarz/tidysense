import { createFileRoute } from '@tanstack/react-router'
import { GoalsPage } from '../../features/goals/components/GoalsPage'

export const Route = createFileRoute('/goals/')({ component: GoalsPage })
