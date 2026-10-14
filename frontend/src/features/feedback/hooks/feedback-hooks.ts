import { useMutation, useQuery } from '@tanstack/react-query'
import { answerAiFeedback, closeAiFeedback, requestAiFeedbackPrompt } from '../services/feedback-api'
import type { AiFeedbackSurface } from '../types/feedback.types'

/** Whether the prompt is shown for this response. The answer never changes for a response, so it is read once. */
export function useAiFeedbackPrompt(surface: AiFeedbackSurface, subjectId: string) {
  return useQuery({
    queryKey: ['feedback', 'ai-responses', surface, subjectId],
    queryFn: () => requestAiFeedbackPrompt(surface, subjectId),
    staleTime: Number.POSITIVE_INFINITY,
    retry: false,
  })
}

export function useAnswerAiFeedback() {
  return useMutation({
    mutationFn: ({ promptId, rating, reason }: { promptId: string; rating: number; reason: string | null }) =>
      answerAiFeedback(promptId, rating, reason),
  })
}

export function useCloseAiFeedback() {
  return useMutation({ mutationFn: (promptId: string) => closeAiFeedback(promptId) })
}
