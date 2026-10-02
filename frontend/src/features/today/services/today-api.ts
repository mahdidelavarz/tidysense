// Today HTTP operations only. No React Query, no component concerns.
import { http } from '../../../shared/api/http'
import type { TodayDto } from '../types/today.types'

/** Fetches the Today projection: active Tasks planned for the pilot-timezone local date, in execution order. */
export async function getToday(): Promise<TodayDto> {
  const response = await http.get<TodayDto>('/today')
  return response.data
}
