// Planning HTTP operations only. No React Query, no component concerns —
// hooks in ../hooks call these and own caching/state.
import { http } from '../../../shared/api/http'
import type {
  PlanningActiveDto,
  PlanningApplyResultDto,
  PlanningAttemptDto,
  PlanningAttemptInput,
  PlanningConfirmationDto,
  PlanningDraftDto,
  PlanningDraftEdit,
  PlanningFactDto,
  PlanningScopeInput,
  PlanningWarningDto,
} from '../types/planning.types'

/** Generates a fresh per-request idempotency key for a consequential write. */
const commandHeaders = () => ({ 'Idempotency-Key': crypto.randomUUID() })

/** The unfinished planning flow, if any: a running attempt, an unapproved draft or unanswered questions. */
export async function getPlanningActive(): Promise<PlanningActiveDto> {
  const response = await http.get<PlanningActiveDto>('/planning/active')
  return response.data
}

/**
 * Starts generating a draft. The client attempt id identifies the attempt:
 * sending it again returns the same attempt instead of generating twice.
 */
export async function startPlanningAttempt(clientAttemptId: string, input: PlanningAttemptInput): Promise<PlanningAttemptDto> {
  const response = await http.post<PlanningAttemptDto>('/planning/attempts', {
    clientAttemptId,
    intention: input.intention,
    goalId: input.goalId ?? null,
    projectId: input.projectId ?? null,
    replaceActive: input.replaceActive,
    previousAttemptId: input.previousAttemptId ?? null,
    answers: input.answers ?? null,
    draftNow: input.draftNow ?? false,
  })
  return response.data
}

/** Reads one attempt as a complete snapshot. Polling uses this; it never creates an attempt. */
export async function getPlanningAttempt(id: string): Promise<PlanningAttemptDto> {
  const response = await http.get<PlanningAttemptDto>(`/planning/attempts/${encodeURIComponent(id)}`)
  return response.data
}

/** Cancels a queued or running attempt. A result that arrives later is discarded by the server. */
export async function cancelPlanningAttempt(id: string): Promise<PlanningAttemptDto> {
  const response = await http.post<PlanningAttemptDto>(`/planning/attempts/${encodeURIComponent(id)}/cancel`, {})
  return response.data
}

/** Reads a draft's current revision with its review states. */
export async function getPlanningDraft(id: string): Promise<PlanningDraftDto> {
  const response = await http.get<PlanningDraftDto>(`/planning/drafts/${encodeURIComponent(id)}`)
  return response.data
}

/** Stores the user's edit as a new revision. The previous revision is never changed. */
export async function revisePlanningDraft(id: string, expectedRevision: number, edit: PlanningDraftEdit): Promise<PlanningDraftDto> {
  const response = await http.post<PlanningDraftDto>(
    `/planning/drafts/${encodeURIComponent(id)}/revisions`,
    { expectedRevision, proposals: edit.proposals, facts: edit.facts },
    { headers: commandHeaders() },
  )
  return response.data
}

/** Ends a draft without creating anything. */
export async function cancelPlanningDraft(id: string, expectedRevision: number): Promise<PlanningDraftDto> {
  const response = await http.post<PlanningDraftDto>(
    `/planning/drafts/${encodeURIComponent(id)}/cancel`,
    { expectedRevision },
    { headers: commandHeaders() },
  )
  return response.data
}

/** Asks the server exactly what approving this revision would create. Nothing is created yet. */
export async function createPlanningPreview(draftId: string, expectedRevision: number): Promise<PlanningConfirmationDto> {
  const response = await http.post<PlanningConfirmationDto>(
    `/planning/drafts/${encodeURIComponent(draftId)}/previews`,
    { expectedRevision },
  )
  return response.data
}

/** Reads a confirmation and, once its command has run, the command's result. */
export async function getPlanningConfirmation(id: string): Promise<PlanningConfirmationDto> {
  const response = await http.get<PlanningConfirmationDto>(`/planning/confirmations/${encodeURIComponent(id)}`)
  return response.data
}

/** Creates everything the confirmation showed, or nothing. */
export async function submitPlanningConfirmation(id: string, warnings: PlanningWarningDto[]): Promise<PlanningApplyResultDto> {
  const response = await http.post<PlanningApplyResultDto>(
    `/planning/confirmations/${encodeURIComponent(id)}/submit`,
    { acknowledgedWarnings: warnings.map(({ warningId, warningHash }) => ({ warningId, warningHash })) },
    { headers: commandHeaders() },
  )
  return response.data
}

/** The planning details remembered for one Goal or one standalone Project. */
export async function listPlanningFacts(scope: PlanningScopeInput): Promise<PlanningFactDto[]> {
  const response = await http.get<PlanningFactDto[]>('/planning/facts', {
    params: scope.goalId ? { goalId: scope.goalId } : { projectId: scope.projectId },
  })
  return response.data
}

/** Takes a planning detail out of future planning. */
export async function removePlanningFact(id: string, expectedVersion: number): Promise<PlanningFactDto> {
  const response = await http.post<PlanningFactDto>(
    `/planning/facts/${encodeURIComponent(id)}/remove`,
    { expectedVersion },
    { headers: commandHeaders() },
  )
  return response.data
}
