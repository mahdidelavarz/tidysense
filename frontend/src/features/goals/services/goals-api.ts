// Goal HTTP operations only. No React Query, no component concerns — hooks
// in ../hooks call these and own caching/state.
import { http } from '../../../shared/api/http'
import type {
  CreateGoalRequest,
  GoalDto,
  GoalPage,
  GoalTerminalPreview,
  GoalTerminalStatus,
  UpdateGoalRequest,
} from '../types/goal.types'

/** Generates a fresh per-request idempotency key for a consequential write. */
const commandHeaders = () => ({ 'Idempotency-Key': crypto.randomUUID() })

/** Fetches one cursor page of the caller's Goals, optionally filtered by status. */
export async function listGoals(status?: string, cursor?: string, limit = 20): Promise<GoalPage> {
  const response = await http.get<GoalPage>('/goals', {
    params: { ...(status ? { status } : {}), ...(cursor ? { cursor } : {}), limit },
  })
  return response.data
}

/** Fetches one owned Goal by id. */
export async function getGoal(id: string): Promise<GoalDto> {
  const response = await http.get<GoalDto>(`/goals/${encodeURIComponent(id)}`)
  return response.data
}

/** Creates a new Goal. */
export async function createGoal(request: CreateGoalRequest): Promise<GoalDto> {
  const response = await http.post<GoalDto>('/goals', request, { headers: commandHeaders() })
  return response.data
}

/** Updates a Goal's editable fields under an optimistic version check. */
export async function updateGoal(id: string, request: UpdateGoalRequest): Promise<GoalDto> {
  const response = await http.put<GoalDto>(`/goals/${encodeURIComponent(id)}`, request, {
    headers: commandHeaders(),
  })
  return response.data
}

/** Answers the Goal Continuation Check. Both decisions keep the Goal active and set its next review date. */
export async function reviewGoal(id: string, decision: 'CONTINUE' | 'REVIEW_LATER', expectedVersion: number): Promise<GoalDto> {
  const response = await http.post<GoalDto>(
    `/goals/${encodeURIComponent(id)}/review`,
    { decision, reviewDate: null, expectedVersion },
    { headers: commandHeaders() },
  )
  return response.data
}

/** Previews the blockers/effects of an explicit terminal transition before it is confirmed. */
export async function previewGoalTerminal(
  id: string,
  targetStatus: GoalTerminalStatus,
  expectedVersion: number,
): Promise<GoalTerminalPreview> {
  const response = await http.post<GoalTerminalPreview>(
    `/goals/${encodeURIComponent(id)}/terminal-preview`,
    { targetStatus, expectedVersion },
  )
  return response.data
}

/** Applies a previously previewed terminal transition (achieve/abandon). */
export async function terminateGoal(id: string, preview: GoalTerminalPreview): Promise<GoalDto> {
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
