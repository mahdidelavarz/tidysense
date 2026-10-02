import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useCallback } from 'react'
import { todayKey } from '../../today/hooks/today-hooks'
import {
  completeOccurrence,
  continueRoutine,
  correctOccurrence,
  createRoutine,
  getRoutine,
  listRoutineOccurrences,
  listRoutines,
  stopRoutine,
  updateRoutine,
} from '../services/routines-api'
import type { CreateRoutineRequest, OccurrenceCorrection, RoutineDto, UpdateRoutineRequest } from '../types/routine.types'

/** Query key factory for Routine queries. The single source of truth Routine hooks and mutations invalidate against. */
export const routineKeys = {
  all: ['routines'] as const,
  list: ['routines', 'list'] as const,
  detail: (id: string) => ['routines', 'detail', id] as const,
  occurrences: (id: string) => ['routines', 'occurrences', id] as const,
}

/** Cursor-paginated Routine list for the Routines page, loaded one page at a time. */
export function useRoutines(status?: string) {
  return useInfiniteQuery({
    queryKey: [...routineKeys.list, status ?? 'all'],
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam }) => listRoutines(status, pageParam),
    getNextPageParam: page => page.page.nextCursor ?? undefined,
  })
}

/** Fetches one Routine for the Routine detail page. */
export function useRoutine(id: string) {
  return useQuery({ queryKey: routineKeys.detail(id), queryFn: () => getRoutine(id) })
}

/** Cursor-paginated occurrence history of one Routine, newest first. */
export function useRoutineOccurrences(routineId: string) {
  return useInfiniteQuery({
    queryKey: routineKeys.occurrences(routineId),
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam }) => listRoutineOccurrences(routineId, pageParam),
    getNextPageParam: page => page.page.nextCursor ?? undefined,
  })
}

/** Every Routine and occurrence write can change the lists, the history and Today. */
function useRoutineInvalidation() {
  const client = useQueryClient()
  return useCallback(async () => {
    await Promise.all([
      client.invalidateQueries({ queryKey: routineKeys.all }),
      client.invalidateQueries({ queryKey: todayKey }),
    ])
  }, [client])
}

/** Creates a Routine and refreshes the Routine lists and Today. */
export function useCreateRoutine() {
  const invalidate = useRoutineInvalidation()
  return useMutation({
    mutationFn: (request: CreateRoutineRequest) => createRoutine(request),
    onSuccess: invalidate,
  })
}

/** Resumes a stopped Routine as a new continuation Routine. */
export function useContinueRoutine(sourceId: string) {
  const invalidate = useRoutineInvalidation()
  return useMutation({
    mutationFn: (request: CreateRoutineRequest) => continueRoutine(sourceId, request),
    onSuccess: invalidate,
  })
}

/** Caches the authoritative RoutineDto a lifecycle mutation returned, then refreshes what it can affect. */
function useRoutineCacheSync() {
  const client = useQueryClient()
  const invalidate = useRoutineInvalidation()
  return useCallback(async (routine: RoutineDto) => {
    client.setQueryData(routineKeys.detail(routine.id), routine)
    await invalidate()
  }, [client, invalidate])
}

/** Updates a Routine under an optimistic version check. */
export function useUpdateRoutine(routineId: string) {
  const sync = useRoutineCacheSync()
  return useMutation({
    mutationFn: (request: UpdateRoutineRequest) => updateRoutine(routineId, request),
    onSuccess: sync,
  })
}

/** Stops a Routine; today's occurrence stays resolvable and nothing later is generated. */
export function useStopRoutine(routineId: string) {
  const sync = useRoutineCacheSync()
  return useMutation({
    mutationFn: (expectedVersion: number) => stopRoutine(routineId, expectedVersion),
    onSuccess: sync,
  })
}

/**
 * Marks an occurrence done. Not bound to one id: Today and the history act on
 * whichever row the user picks. A rejected command (for example a slot whose
 * boundary just passed) still refreshes, so the row shows its real state.
 */
export function useCompleteOccurrence() {
  const invalidate = useRoutineInvalidation()
  return useMutation({
    mutationFn: ({ occurrenceId, expectedVersion }: { occurrenceId: string; expectedVersion: number }) =>
      completeOccurrence(occurrenceId, expectedVersion),
    onSettled: invalidate,
  })
}

/** Corrects a resolved occurrence between done and missed. */
export function useCorrectOccurrence() {
  const invalidate = useRoutineInvalidation()
  return useMutation({
    mutationFn: ({ occurrenceId, expectedVersion, targetStatus }: {
      occurrenceId: string
      expectedVersion: number
      targetStatus: OccurrenceCorrection
    }) => correctOccurrence(occurrenceId, expectedVersion, targetStatus),
    onSettled: invalidate,
  })
}
