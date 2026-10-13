import { useMutation, useQuery } from '@tanstack/react-query'
import { getPilotNotice, submitPilotFeedback } from '../services/pilot-api'
import type { PilotFeedbackInput } from '../types/pilot.types'

export const pilotNoticeKey = ['pilot', 'notice'] as const

/** The facts the privacy notice states. They change only with a deployment, so one read per session is enough. */
export function usePilotNotice() {
  return useQuery({ queryKey: pilotNoticeKey, queryFn: getPilotNotice, staleTime: Number.POSITIVE_INFINITY })
}

export function useSubmitPilotFeedback() {
  return useMutation({ mutationFn: (input: PilotFeedbackInput) => submitPilotFeedback(input) })
}
