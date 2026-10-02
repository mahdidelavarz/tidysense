// Today HTTP operations only. No React Query, no component concerns.
import { http } from '../../../shared/api/http'
import type { TodayDto } from '../types/today.types'

/** Fetches the Today projection for the pilot-timezone local date: active planned Tasks in execution order, and the date's Routine occurrences. */
export async function getToday(): Promise<TodayDto> {
  const response = await http.get<TodayDto>('/today')
  return response.data
}
