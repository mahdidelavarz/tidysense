// Reconcile HTTP operations only. No React Query, no component concerns —
// hooks in ../hooks call these and own caching/state.
import { http } from '../../../shared/api/http'
import type {
  ActionConfirmationDto,
  ConfirmationResultDto,
  ConfirmationWarningDto,
  ReconcileActionDraft,
  ReconcileOverviewDto,
  ReconcilePromptDto,
  ReconcilePromptState,
  ReconcileRecommendationDispositionDto,
  ReconcileSessionDto,
} from '../types/reconcile.types'

/** Generates a fresh per-request idempotency key for a consequential write. */
const commandHeaders = () => ({ 'Idempotency-Key': crypto.randomUUID() })

/** Eligibility, severity and counts for the Today entry and the navigation badge. */
export async function getReconcileOverview(): Promise<ReconcileOverviewDto> {
  const response = await http.get<ReconcileOverviewDto>('/reconcile/overview')
  return response.data
}

/** Hides today's prompt. Nothing is resolved by this; the facts stay in Reconcile. */
export async function resolveReconcilePrompt(state: ReconcilePromptState): Promise<ReconcilePromptDto> {
  const response = await http.post<ReconcilePromptDto>('/reconcile/prompt', { state }, { headers: commandHeaders() })
  return response.data
}

/** Opens today's session, or returns the one that is already open. */
export async function openReconcileSession(triggerType: 'MANUAL' | 'PROMPT' = 'MANUAL'): Promise<ReconcileSessionDto> {
  const response = await http.post<ReconcileSessionDto>('/reconcile/sessions', { triggerType }, { headers: commandHeaders() })
  return response.data
}

/** Reads a session with its lanes re-derived from the current state. */
export async function getReconcileSession(id: string): Promise<ReconcileSessionDto> {
  const response = await http.get<ReconcileSessionDto>(`/reconcile/sessions/${encodeURIComponent(id)}`)
  return response.data
}

/** Closes the session. Whatever is still unresolved stays eligible for a later one. */
export async function completeReconcileSession(id: string, expectedVersion: number): Promise<ReconcileSessionDto> {
  const response = await http.post<ReconcileSessionDto>(
    `/reconcile/sessions/${encodeURIComponent(id)}/complete`,
    { expectedVersion },
    { headers: commandHeaders() },
  )
  return response.data
}

/** Asks the server for the exact consequences of an action. Nothing changes yet. */
export async function createReconcilePreview(sessionId: string, draft: ReconcileActionDraft): Promise<ActionConfirmationDto> {
  const response = await http.post<ActionConfirmationDto>(
    `/reconcile/sessions/${encodeURIComponent(sessionId)}/previews`,
    {
      actionType: draft.actionType,
      taskIds: draft.taskIds ?? null,
      sequenceId: draft.sequenceId ?? null,
      plannedDate: draft.plannedDate ?? null,
      includeTaskIds: draft.includeTaskIds ?? null,
      recommendationId: draft.recommendationId ?? null,
    },
  )
  return response.data
}

/** Applies a preview all-or-nothing. The server rejects it if anything it showed has changed. */
export async function submitReconcileConfirmation(id: string, warnings: ConfirmationWarningDto[]): Promise<ConfirmationResultDto> {
  const response = await http.post<ConfirmationResultDto>(
    `/reconcile/confirmations/${encodeURIComponent(id)}/submit`,
    { acknowledgedWarnings: warnings.map(({ warningId, warningHash }) => ({ warningId, warningHash })) },
    { headers: commandHeaders() },
  )
  return response.data
}

/** Asks for the optional AI explanation of the session's rule-matched evidence. The lanes never wait for it. */
export async function requestReconcileExplanation(sessionId: string): Promise<ReconcileSessionDto> {
  const response = await http.post<ReconcileSessionDto>(`/reconcile/sessions/${encodeURIComponent(sessionId)}/explanation`, {})
  return response.data
}

/** Stops a running explanation. A result that arrives anyway is discarded by the server. */
export async function cancelReconcileExplanation(sessionId: string): Promise<ReconcileSessionDto> {
  const response = await http.post<ReconcileSessionDto>(`/reconcile/sessions/${encodeURIComponent(sessionId)}/explanation/cancel`, {})
  return response.data
}

/** Declines one recommendation. Nothing else changes. */
export async function dismissReconcileRecommendation(id: string): Promise<ReconcileRecommendationDispositionDto> {
  const response = await http.post<ReconcileRecommendationDispositionDto>(`/reconcile/recommendations/${encodeURIComponent(id)}/dismiss`, {})
  return response.data
}
