// Satisfaction prompt HTTP operations only. No React Query, no component concerns —
// hooks in ../hooks call these and own caching/state.
import { http } from '../../../shared/api/http'
import { aiFeedbackInstrumentVersion } from '../types/feedback.format'
import type { AiFeedbackPrompt, AiFeedbackSurface } from '../types/feedback.types'

/**
 * Asks whether to show the prompt for one AI response. The server decides and
 * records it when it does; asking again about the same response returns the
 * same open prompt, never a second one.
 */
export async function requestAiFeedbackPrompt(surface: AiFeedbackSurface, subjectId: string): Promise<AiFeedbackPrompt> {
  const response = await http.post<AiFeedbackPrompt>('/feedback/ai-responses', { surface, subjectId })
  return response.data
}

export async function answerAiFeedback(promptId: string, rating: number, reason: string | null): Promise<void> {
  await http.post(`/feedback/ai-responses/${promptId}/answer`, {
    instrumentVersion: aiFeedbackInstrumentVersion, rating, reason,
  })
}

/** Closing is recorded as no response, never as a rating. */
export async function closeAiFeedback(promptId: string): Promise<void> {
  await http.post(`/feedback/ai-responses/${promptId}/close`, {})
}
