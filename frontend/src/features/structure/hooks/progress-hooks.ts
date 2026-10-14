import { useQuery } from '@tanstack/react-query'
import { getProgress } from '../services/progress-api'

/** Query key for the progress read model. Task and Routine writes invalidate it. */
export const progressKey = ['progress'] as const

/** How far every Goal and Project has come, for the Goals and Projects screens. */
export function useProgress() {
  return useQuery({ queryKey: progressKey, queryFn: getProgress })
}
