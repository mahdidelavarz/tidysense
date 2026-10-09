// Pilot HTTP operations only. No React Query, no component concerns —
// hooks in ../hooks call these and own caching/state.
import { http } from '../../../shared/api/http'
import type { CurrentUser } from '../../auth/types/auth.types'
import { pilotInstrumentVersion } from '../types/pilot.format'
import type { PilotFeedbackInput, PilotNotice } from '../types/pilot.types'

/** What the privacy notice states, read from the running configuration. Readable without a session. */
export async function getPilotNotice(): Promise<PilotNotice> {
  const response = await http.get<PilotNotice>('/pilot/notice')
  return response.data
}

/**
 * Agrees to, or withdraws agreement to, sending planning text to the AI
 * provider. Agreement names the notice version the user was shown.
 */
export async function setAiConsent(granted: boolean, noticeVersion: string | null): Promise<CurrentUser> {
  const response = await http.put<CurrentUser>('/users/me/ai-consent', { granted, noticeVersion }, {
    headers: { 'Idempotency-Key': crypto.randomUUID() },
  })
  return response.data
}

/** Stores one answer to a pilot question. A second answer about the same subject changes nothing. */
export async function submitPilotFeedback(input: PilotFeedbackInput): Promise<void> {
  await http.post('/pilot/feedback', { ...input, instrumentVersion: pilotInstrumentVersion })
}
