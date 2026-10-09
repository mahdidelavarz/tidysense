// Operations HTTP operations only. No React Query, no component concerns.
import { http } from '../../../shared/api/http'
import type { OperationsAiDto, OperationsHealthDto, OperationsMetricsDto } from '../types/operations.types'

/** H1/H2 numerators and denominators for the last `days` days. Operator accounts only; anyone else gets 404. */
export async function getOperationsMetrics(days: number): Promise<OperationsMetricsDto> {
  const response = await http.get<OperationsMetricsDto>('/operations/metrics', { params: { days } })
  return response.data
}

/** AI runtime switches, spend and call results for the last `days` days. */
export async function getOperationsAi(days: number): Promise<OperationsAiDto> {
  const response = await http.get<OperationsAiDto>('/operations/ai', { params: { days } })
  return response.data
}

/** Active alerts and the state of maintenance. */
export async function getOperationsHealth(): Promise<OperationsHealthDto> {
  const response = await http.get<OperationsHealthDto>('/operations/health')
  return response.data
}
