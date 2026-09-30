import { createFileRoute } from '@tanstack/react-router'
import { TodayView } from '../features/today/components/TodayView'

export const Route = createFileRoute('/today')({ component: TodayView })
