import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { currentUserKey } from '../../auth/hooks/auth-hooks'
import { getPilotNotice, setAiConsent, submitPilotFeedback } from '../services/pilot-api'
import type { PilotFeedbackInput } from '../types/pilot.types'

export const pilotNoticeKey = ['pilot', 'notice'] as const

/** The facts the privacy notice states. They change only with a deployment, so one read per session is enough. */
export function usePilotNotice() {
  return useQuery({ queryKey: pilotNoticeKey, queryFn: getPilotNotice, staleTime: Number.POSITIVE_INFINITY })
}

/** Records the consent decision; the answer is the current user with the new consent state. */
export function useSetAiConsent() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: ({ granted, noticeVersion }: { granted: boolean; noticeVersion: string | null }) =>
      setAiConsent(granted, noticeVersion),
    onSuccess: user => client.setQueryData(currentUserKey, user),
    // The notice the user read may be stale; the next attempt shows the current one.
    onError: () => { void client.invalidateQueries({ queryKey: pilotNoticeKey }) },
  })
}

export function useSubmitPilotFeedback() {
  return useMutation({ mutationFn: (input: PilotFeedbackInput) => submitPilotFeedback(input) })
}
