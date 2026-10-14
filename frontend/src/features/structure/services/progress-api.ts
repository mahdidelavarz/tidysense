// Progress HTTP operations only. No React Query, no component concerns.
import { http } from '../../../shared/api/http'
import type { ProgressDto } from '../types/progress.types'

/** Fetches how far every Goal and Project has come: counts of the work under it and its next steps. */
export async function getProgress(): Promise<ProgressDto> {
  const response = await http.get<ProgressDto>('/progress')
  return response.data
}
