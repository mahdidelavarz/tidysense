import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useCallback, useState } from 'react'
import { createGoal, getGoal, listGoals, previewGoalTerminal, terminateGoal, updateGoal } from '../services/goals-api'
import type { CreateGoalRequest, GoalTerminalPreview, GoalTerminalStatus, UpdateGoalRequest } from '../types/goal.types'

/** Query key factory for Goal queries. The single source of truth other Goal hooks and mutations invalidate against. */
export const goalKeys = {
  all: ['goals'] as const,
  list: ['goals', 'list'] as const,
  /** Unpaginated lookup list used by Project/Task parent selects. */
  options: ['goals', 'options'] as const,
  detail: (id: string) => ['goals', 'detail', id] as const,
}

/** Cursor-paginated Goal list for the Goals panel, loaded one page at a time. */
export function useGoals() {
  return useInfiniteQuery({
    queryKey: goalKeys.list,
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam }) => listGoals(undefined, pageParam),
    getNextPageParam: page => page.page.nextCursor ?? undefined,
  })
}

/** Flat, unpaginated Goal list for parent-selection dropdowns (Project/Task forms). */
export function useGoalOptions() {
  return useQuery({ queryKey: goalKeys.options, queryFn: () => listGoals(undefined, undefined, 100) })
}

/** Fetches one Goal for the Goal detail page. */
export function useGoal(id: string) {
  return useQuery({ queryKey: goalKeys.detail(id), queryFn: () => getGoal(id) })
}

/** Creates a Goal and refreshes the lists that must reflect it. */
export function useCreateGoal() {
  const client = useQueryClient()
  return useMutation({
    // Wrapped (not passed by reference) so TanStack Query's internal
    // mutation context argument never reaches the plain HTTP function.
    mutationFn: (request: CreateGoalRequest) => createGoal(request),
    onSuccess: async () => {
      await Promise.all([
        client.invalidateQueries({ queryKey: goalKeys.list }),
        client.invalidateQueries({ queryKey: goalKeys.options }),
      ])
    },
  })
}

/** Updates a Goal's editable fields and keeps detail/list caches authoritative. */
export function useUpdateGoal(goalId: string) {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (request: UpdateGoalRequest) => updateGoal(goalId, request),
    onSuccess: async data => {
      client.setQueryData(goalKeys.detail(goalId), data)
      await Promise.all([
        client.invalidateQueries({ queryKey: goalKeys.list }),
        client.invalidateQueries({ queryKey: goalKeys.options }),
      ])
    },
  })
}

/**
 * Drives the two-step explicit terminal transition (preview, then confirm)
 * for one Goal: request a preview, hold it until the user decides, apply or
 * cancel. Keeping this state in the hook (rather than the component) is
 * what lets GoalDetailView stay a thin composition.
 */
export function useGoalTerminal(goalId: string) {
  const client = useQueryClient()
  const [preview, setPreview] = useState<GoalTerminalPreview | null>(null)

  const previewMutation = useMutation({
    mutationFn: ({ status, version }: { status: GoalTerminalStatus; version: number }) =>
      previewGoalTerminal(goalId, status, version),
    onSuccess: setPreview,
  })

  const terminalMutation = useMutation({
    mutationFn: (value: GoalTerminalPreview) => terminateGoal(goalId, value),
    onSuccess: async data => {
      client.setQueryData(goalKeys.detail(goalId), data)
      setPreview(null)
      await Promise.all([
        client.invalidateQueries({ queryKey: goalKeys.list }),
        client.invalidateQueries({ queryKey: goalKeys.options }),
      ])
    },
  })

  const cancel = useCallback(() => setPreview(null), [])
  const confirm = useCallback(() => {
    if (preview) terminalMutation.mutate(preview)
  }, [preview, terminalMutation])

  return {
    preview,
    requestPreview: previewMutation.mutate,
    previewPending: previewMutation.isPending,
    previewError: previewMutation.error,
    terminalPending: terminalMutation.isPending,
    terminalError: terminalMutation.error,
    cancel,
    confirm,
  }
}
