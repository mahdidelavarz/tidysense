import { useQuery } from '@tanstack/react-query'
import { getToday } from '../services/today-api'

/** Query key for the Today projection. There is exactly one Today per session, so no sub-keys are needed. */
export const todayKey = ['today'] as const

/** Fetches today's Task projection for the Today page. */
export function useToday() {
  return useQuery({ queryKey: todayKey, queryFn: getToday })
}
