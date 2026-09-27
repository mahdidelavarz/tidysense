import type { components } from '../../../shared/api/generated'
import { http } from '../../../shared/api/http'

export type GoalDto = components['schemas']['GoalDto']
export type GoalPage = components['schemas']['CursorPageDtoOfGoalDto']
export type CreateGoalRequest = components['schemas']['CreateGoalRequest']
export type UpdateGoalRequest = components['schemas']['UpdateGoalRequest']
export type TerminalPreview = components['schemas']['TerminalPreviewDto']

const commandHeaders = () => ({ 'Idempotency-Key': crypto.randomUUID() })

export async function listGoals(status?: string, cursor?: string, limit = 20): Promise<GoalPage> {
  const response = await http.get<GoalPage>('/goals', {
    params: { ...(status ? { status } : {}), ...(cursor ? { cursor } : {}), limit },
  })
  return response.data
}

export async function getGoal(id: string): Promise<GoalDto> {
  const response = await http.get<GoalDto>(`/goals/${encodeURIComponent(id)}`)
  return response.data
}

export async function createGoal(request: CreateGoalRequest): Promise<GoalDto> {
  const response = await http.post<GoalDto>('/goals', request, { headers: commandHeaders() })
  return response.data
}

export async function updateGoal(id: string, request: UpdateGoalRequest): Promise<GoalDto> {
  const response = await http.put<GoalDto>(`/goals/${encodeURIComponent(id)}`, request, {
    headers: commandHeaders(),
  })
  return response.data
}

export async function previewGoalTerminal(
  id: string,
  targetStatus: 'ACHIEVED' | 'ABANDONED',
  expectedVersion: number,
): Promise<TerminalPreview> {
  const response = await http.post<TerminalPreview>(
    `/goals/${encodeURIComponent(id)}/terminal-preview`,
    { targetStatus, expectedVersion },
  )
  return response.data
}

export async function terminateGoal(id: string, preview: TerminalPreview): Promise<GoalDto> {
  const response = await http.post<GoalDto>(
    `/goals/${encodeURIComponent(id)}/terminal`,
    {
      targetStatus: preview.targetStatus,
      expectedVersion: preview.expectedVersion,
      previewHash: preview.previewHash,
    },
    { headers: commandHeaders() },
  )
  return response.data
}
