import { createFileRoute } from '@tanstack/react-router'
import { RoutinesPage } from '../../features/routines/components/RoutinesPage'

export const Route = createFileRoute('/routines/')({ component: RoutinesPage })
