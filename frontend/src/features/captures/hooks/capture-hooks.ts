import { useMutation, useQueryClient } from '@tanstack/react-query'
import { reconcileKeys } from '../../reconcile/hooks/reconcile-hooks'
import { routineKeys } from '../../routines/hooks/routine-hooks'
import { taskKeys } from '../../tasks/hooks/task-hooks'
import { todayKey } from '../../today/hooks/today-hooks'
import { createCapture, discardCapture, resolveCaptureToRoutine, resolveCaptureToTask } from '../services/captures-api'
import type { ResolveCaptureToRoutineRequest, ResolveCaptureToTaskRequest } from '../types/capture.types'

/** Saves a quick capture. Unresolved captures are listed in Reconcile, so its queries are refreshed. */
export function useCreateCapture() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (title: string) => createCapture(title),
    onSuccess: () => client.invalidateQueries({ queryKey: reconcileKeys.all }),
  })
}

/** Turns a capture into a new Task and refreshes every list the new Task can appear in. */
export function useResolveCaptureToTask() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: ({ id, request }: { id: string; request: ResolveCaptureToTaskRequest }) =>
      resolveCaptureToTask(id, request),
    onSuccess: async () => {
      await Promise.all([
        client.invalidateQueries({ queryKey: reconcileKeys.all }),
        client.invalidateQueries({ queryKey: taskKeys.all }),
        client.invalidateQueries({ queryKey: todayKey }),
      ])
    },
  })
}

/** Turns a capture into a new Routine. */
export function useResolveCaptureToRoutine() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: ({ id, request }: { id: string; request: ResolveCaptureToRoutineRequest }) =>
      resolveCaptureToRoutine(id, request),
    onSuccess: async () => {
      await Promise.all([
        client.invalidateQueries({ queryKey: reconcileKeys.all }),
        client.invalidateQueries({ queryKey: routineKeys.all }),
        client.invalidateQueries({ queryKey: todayKey }),
      ])
    },
  })
}

/** Discards a capture that will not become work. */
export function useDiscardCapture() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: ({ id, expectedVersion }: { id: string; expectedVersion: number }) =>
      discardCapture(id, expectedVersion),
    onSuccess: () => client.invalidateQueries({ queryKey: reconcileKeys.all }),
  })
}
