import { createFileRoute } from '@tanstack/react-router'
import { OperationsPage } from '../features/operations/components/OperationsPage'

export const Route = createFileRoute('/operations')({ component: OperationsPage })
