import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useCallback, useState } from 'react'
import {
  completeReconcileSession,
  createReconcilePreview,
  getReconcileOverview,
  getReconcileSession,
  openReconcileSession,
  resolveReconcilePrompt,
  submitReconcileConfirmation,
} from '../services/reconcile-api'
import type {
  ActionConfirmationDto,
  ConfirmationWarningDto,
  ReconcileActionDraft,
  ReconcilePromptState,
  ReconcileSessionDto,
} from '../types/reconcile.types'

/** Query key factory for Reconcile. Other features invalidate `all` when they change work Reconcile derives facts from. */
export const reconcileKeys = {
  all: ['reconcile'] as const,
  overview: ['reconcile', 'overview'] as const,
  session: ['reconcile', 'session'] as const,
}

/** Eligibility, severity and counts for the Today entry and the navigation badge. */
export function useReconcileOverview() {
  return useQuery({ queryKey: reconcileKeys.overview, queryFn: getReconcileOverview })
}

/** Hides today's prompt (dismiss or skip). The unresolved facts stay available in Reconcile. */
export function useResolveReconcilePrompt() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (state: ReconcilePromptState) => resolveReconcilePrompt(state),
    onSuccess: () => client.invalidateQueries({ queryKey: reconcileKeys.overview }),
  })
}

/**
 * The session behind the Reconcile page. The first load opens today's session;
 * later refreshes re-read the same one so the lanes follow the current state.
 * After a session is completed, the next load opens a new one.
 */
export function useReconcileSession() {
  const client = useQueryClient()
  return useQuery({
    queryKey: reconcileKeys.session,
    queryFn: () => {
      const current = client.getQueryData<ReconcileSessionDto>(reconcileKeys.session)
      return current?.status === 'OPEN' ? getReconcileSession(current.id) : openReconcileSession('MANUAL')
    },
  })
}

/** Completes the session. The result is cached so the page can show its closed state without reopening one. */
export function useCompleteReconcileSession() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (session: ReconcileSessionDto) => completeReconcileSession(session.id, Number(session.version)),
    onSuccess: async data => {
      client.setQueryData(reconcileKeys.session, data)
      await client.invalidateQueries({ queryKey: reconcileKeys.overview })
    },
  })
}

/**
 * Drives one Reconcile action through its two explicit steps: ask the server
 * for a preview, then apply exactly that preview. The draft is kept so a
 * stale or adjusted preview can be requested again without losing the user's
 * choices.
 */
export function useReconcileAction(sessionId: string) {
  const client = useQueryClient()
  const [draft, setDraft] = useState<ReconcileActionDraft | null>(null)
  const [preview, setPreview] = useState<ActionConfirmationDto | null>(null)

  const previewMutation = useMutation({
    mutationFn: (value: ReconcileActionDraft) => createReconcilePreview(sessionId, value),
    onSuccess: setPreview,
  })

  const submitMutation = useMutation({
    mutationFn: ({ id, warnings }: { id: string; warnings: ConfirmationWarningDto[] }) =>
      submitReconcileConfirmation(id, warnings),
    onSuccess: async () => {
      setPreview(null)
      setDraft(null)
      // A confirmed action can change Tasks, Today, parents and captures at once.
      await client.invalidateQueries()
    },
  })

  const request = useCallback((value: ReconcileActionDraft) => {
    setDraft(value)
    setPreview(null)
    submitMutation.reset()
    previewMutation.mutate(value)
  }, [previewMutation, submitMutation])

  const cancel = useCallback(() => {
    setDraft(null)
    setPreview(null)
    previewMutation.reset()
    submitMutation.reset()
  }, [previewMutation, submitMutation])

  const confirm = useCallback((warnings: ConfirmationWarningDto[]) => {
    if (preview) submitMutation.mutate({ id: preview.id, warnings })
  }, [preview, submitMutation])

  return {
    draft,
    preview,
    request,
    cancel,
    confirm,
    previewPending: previewMutation.isPending,
    previewError: previewMutation.error,
    submitPending: submitMutation.isPending,
    submitError: submitMutation.error,
  }
}

export type ReconcileActionFlow = ReturnType<typeof useReconcileAction>
