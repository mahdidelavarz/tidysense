// Pilot HTTP operations only. No React Query, no component concerns —
// hooks in ../hooks call these and own caching/state.
import { http } from '../../../shared/api/http'
import { pilotInstrumentVersion } from '../types/pilot.format'
import type { PilotFeedbackInput, PilotNotice } from '../types/pilot.types'

/** What the privacy notice states, read from the running configuration. Readable without a session. */
export async function getPilotNotice(): Promise<PilotNotice> {
  const response = await http.get<PilotNotice>('/pilot/notice')
  return response.data
}

/** Stores one answer to a pilot question. A second answer about the same subject changes nothing. */
export async function submitPilotFeedback(input: PilotFeedbackInput): Promise<void> {
  await http.post('/pilot/feedback', { ...input, instrumentVersion: pilotInstrumentVersion })
}
