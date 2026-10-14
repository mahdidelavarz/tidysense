import { useQuery } from '@tanstack/react-query'
import { getOperationsAi, getOperationsHealth, getOperationsInsights, getOperationsMetrics } from '../services/operations-api'

/** Query keys of the operator page. Every query is read-only. */
export const operationsKeys = {
  metrics: (days: number) => ['operations', 'metrics', days] as const,
  insights: (days: number) => ['operations', 'insights', days] as const,
  ai: (days: number) => ['operations', 'ai', days] as const,
  health: ['operations', 'health'] as const,
}

export function useOperationsMetrics(days: number, enabled: boolean) {
  return useQuery({ queryKey: operationsKeys.metrics(days), queryFn: () => getOperationsMetrics(days), enabled })
}

export function useOperationsInsights(days: number, enabled: boolean) {
  return useQuery({ queryKey: operationsKeys.insights(days), queryFn: () => getOperationsInsights(days), enabled })
}

export function useOperationsAi(days: number, enabled: boolean) {
  return useQuery({ queryKey: operationsKeys.ai(days), queryFn: () => getOperationsAi(days), enabled })
}

/** Alerts change without anyone acting on the page, so they are read again every minute. */
export function useOperationsHealth(enabled: boolean) {
  return useQuery({ queryKey: operationsKeys.health, queryFn: getOperationsHealth, enabled, refetchInterval: 60_000 })
}
