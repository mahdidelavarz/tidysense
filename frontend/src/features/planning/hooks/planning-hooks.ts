import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useCallback, useRef, useState } from 'react'
import { toApiError } from '../../../shared/api/http'
import {
  cancelPlanningAttempt,
  cancelPlanningDraft,
  createPlanningPreview,
  getPlanningActive,
  getPlanningAttempt,
  getPlanningConfirmation,
  getPlanningDraft,
  listPlanningFacts,
  removePlanningFact,
  revisePlanningDraft,
  startPlanningAttempt,
  submitPlanningConfirmation,
} from '../services/planning-api'
import type {
  PlanningApplyResultDto,
  PlanningAttemptInput,
  PlanningConfirmationDto,
  PlanningDraftDto,
  PlanningDraftEdit,
  PlanningFactDto,
  PlanningScopeInput,
  PlanningWarningDto,
} from '../types/planning.types'

/** Query key factory for Planning. */
export const planningKeys = {
  all: ['planning'] as const,
  active: ['planning', 'active'] as const,
  attempt: (id: string) => ['planning', 'attempt', id] as const,
  draft: (id: string) => ['planning', 'draft', id] as const,
  facts: (scope: PlanningScopeInput) => ['planning', 'facts', scope.goalId ?? '', scope.projectId ?? ''] as const,
}

const pollIntervalMs = 1000

/** The unfinished flow to resume or to resolve before starting another. Always read fresh. */
export function usePlanningActive() {
  return useQuery({ queryKey: planningKeys.active, queryFn: getPlanningActive, staleTime: 0, gcTime: 0 })
}

/**
 * Starts an attempt. The client attempt id is kept until the server answers,
 * so repeating the same request after a lost response reaches the same
 * attempt instead of generating a second draft.
 */
export function useStartPlanningAttempt() {
  const client = useQueryClient()
  const unanswered = useRef<{ key: string; id: string } | null>(null)
  return useMutation({
    mutationFn: (input: PlanningAttemptInput) => {
      const key = JSON.stringify(input)
      if (unanswered.current?.key !== key) unanswered.current = { key, id: crypto.randomUUID() }
      return startPlanningAttempt(unanswered.current.id, input)
    },
    onSuccess: data => {
      unanswered.current = null
      client.setQueryData(planningKeys.attempt(data.id), data)
    },
    onError: error => {
      if (toApiError(error).status !== 0) unanswered.current = null
    },
  })
}

/** One attempt, polled by its id while it is queued or running. Polling pauses while the page is hidden. */
export function usePlanningAttempt(id: string | null) {
  return useQuery({
    queryKey: planningKeys.attempt(id ?? ''),
    queryFn: () => getPlanningAttempt(id ?? ''),
    enabled: id !== null,
    refetchInterval: query => {
      const status = query.state.data?.status
      return status === 'QUEUED' || status === 'RUNNING' ? pollIntervalMs : false
    },
  })
}

/** Cancels a queued or running attempt. */
export function useCancelPlanningAttempt() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => cancelPlanningAttempt(id),
    onSuccess: data => client.setQueryData(planningKeys.attempt(data.id), data),
  })
}

/** A draft's current revision with its server-derived review states. */
export function usePlanningDraft(id: string | null) {
  return useQuery({
    queryKey: planningKeys.draft(id ?? ''),
    queryFn: () => getPlanningDraft(id ?? ''),
    enabled: id !== null,
  })
}

/** Stores an edit as a new revision and shows what the server returned, never a local guess. */
export function useRevisePlanningDraft() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: ({ draft, edit }: { draft: PlanningDraftDto; edit: PlanningDraftEdit }) =>
      revisePlanningDraft(draft.id, Number(draft.revision), edit),
    onSuccess: data => client.setQueryData(planningKeys.draft(data.id), data),
  })
}

/** Ends a draft without creating anything. */
export function useCancelPlanningDraft() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (draft: PlanningDraftDto) => cancelPlanningDraft(draft.id, Number(draft.revision)),
    onSuccess: data => client.setQueryData(planningKeys.draft(data.id), data),
  })
}

/**
 * Drives approval through its two explicit steps: ask the server for a
 * preview of one revision, then submit exactly that preview. Success is the
 * command's own result. If a submission gets no answer, the confirmation is
 * read first: the command may already have run, and submitting again blindly
 * is not allowed.
 */
export function usePlanningApply(draftId: string | null) {
  const client = useQueryClient()
  const [preview, setPreview] = useState<PlanningConfirmationDto | null>(null)
  const [result, setResult] = useState<PlanningApplyResultDto | null>(null)

  const previewMutation = useMutation({
    mutationFn: (revision: number) => createPlanningPreview(draftId ?? '', revision),
    onSuccess: setPreview,
  })

  const submitMutation = useMutation({
    mutationFn: async ({ id, warnings }: { id: string; warnings: PlanningWarningDto[] }) => {
      try {
        return await submitPlanningConfirmation(id, warnings)
      } catch (error) {
        if (toApiError(error).status !== 0) throw error
        const confirmation = await getPlanningConfirmation(id)
        if (confirmation.result) return confirmation.result
        throw error
      }
    },
    onSuccess: async data => {
      setResult(data)
      setPreview(null)
      // One confirmed plan can create a Goal, Projects, Tasks, Routines and planning details at once.
      await client.invalidateQueries()
    },
  })

  const request = useCallback((revision: number) => {
    setPreview(null)
    submitMutation.reset()
    previewMutation.mutate(revision)
  }, [previewMutation, submitMutation])

  const cancel = useCallback(() => {
    setPreview(null)
    previewMutation.reset()
    submitMutation.reset()
  }, [previewMutation, submitMutation])

  const confirm = useCallback((warnings: PlanningWarningDto[]) => {
    if (preview) submitMutation.mutate({ id: preview.id, warnings })
  }, [preview, submitMutation])

  const clearResult = useCallback(() => setResult(null), [])

  return {
    preview,
    result,
    request,
    cancel,
    confirm,
    clearResult,
    /** True from the moment a preview is requested until the dialog is closed. */
    open: previewMutation.isPending || previewMutation.isError || preview !== null,
    previewPending: previewMutation.isPending,
    previewError: previewMutation.error,
    submitPending: submitMutation.isPending,
    submitError: submitMutation.error,
  }
}

export type PlanningApplyFlow = ReturnType<typeof usePlanningApply>

/** The planning details remembered for one Goal or one standalone Project. */
export function usePlanningFacts(scope: PlanningScopeInput) {
  return useQuery({ queryKey: planningKeys.facts(scope), queryFn: () => listPlanningFacts(scope) })
}

/** Removes a planning detail from future planning and refreshes its list. */
export function useRemovePlanningFact(scope: PlanningScopeInput) {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (fact: PlanningFactDto) => removePlanningFact(fact.id, Number(fact.version)),
    onSuccess: () => client.invalidateQueries({ queryKey: planningKeys.facts(scope) }),
  })
}
