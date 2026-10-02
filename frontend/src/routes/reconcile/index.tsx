import { createFileRoute } from '@tanstack/react-router'
import { ReconcilePage } from '../../features/reconcile/components/ReconcilePage'

export const Route = createFileRoute('/reconcile/')({ component: ReconcilePage })
