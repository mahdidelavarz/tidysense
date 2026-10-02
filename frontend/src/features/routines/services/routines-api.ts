// Routine HTTP operations only. No React Query, no component concerns — hooks
// in ../hooks call these and own caching/state. Today's occurrences arrive
// through the Today projection in the `today` feature.
import { http } from '../../../shared/api/http'
import type {
  CreateRoutineRequest,
  OccurrenceCorrection,
  RoutineDto,
  RoutineOccurrenceDto,
  RoutineOccurrencePage,
  RoutinePage,
  UpdateRoutineRequest,
} from '../types/routine.types'

/** Generates a fresh per-request idempotency key for a consequential write. */
const commandHeaders = () => ({ 'Idempotency-Key': crypto.randomUUID() })

/** Fetches one cursor page of the caller's Routines, optionally filtered by status. */
export async function listRoutines(status?: string, cursor?: string, limit = 20): Promise<RoutinePage> {
  const response = await http.get<RoutinePage>('/routines', {
    params: { ...(status ? { status } : {}), ...(cursor ? { cursor } : {}), limit },
  })
  return response.data
}

/** Fetches one owned Routine by id. */
export async function getRoutine(id: string): Promise<RoutineDto> {
  const response = await http.get<RoutineDto>(`/routines/${encodeURIComponent(id)}`)
  return response.data
}

/** Creates a Routine under a Goal, a Project, or standalone. */
export async function createRoutine(request: CreateRoutineRequest): Promise<RoutineDto> {
  const response = await http.post<RoutineDto>('/routines', request, { headers: commandHeaders() })
  return response.data
}

/** Updates a Routine. Schedule changes take effect from the next local date. */
export async function updateRoutine(id: string, request: UpdateRoutineRequest): Promise<RoutineDto> {
  const response = await http.put<RoutineDto>(`/routines/${encodeURIComponent(id)}`, request, {
    headers: commandHeaders(),
  })
  return response.data
}

/** Stops a Routine. It never becomes active again; resuming creates a continuation. */
export async function stopRoutine(id: string, expectedVersion: number): Promise<RoutineDto> {
  const response = await http.post<RoutineDto>(
    `/routines/${encodeURIComponent(id)}/stop`,
    { expectedVersion },
    { headers: commandHeaders() },
  )
  return response.data
}

/** Resumes a stopped Routine by creating a new Routine that continues it. */
export async function continueRoutine(sourceId: string, request: CreateRoutineRequest): Promise<RoutineDto> {
  const response = await http.post<RoutineDto>(
    `/routines/${encodeURIComponent(sourceId)}/continuation`,
    request,
    { headers: commandHeaders() },
  )
  return response.data
}

/** Fetches one cursor page of a Routine's occurrences, newest first. */
export async function listRoutineOccurrences(routineId: string, cursor?: string, limit = 20): Promise<RoutineOccurrencePage> {
  const response = await http.get<RoutineOccurrencePage>(`/routines/${encodeURIComponent(routineId)}/occurrences`, {
    params: { ...(cursor ? { cursor } : {}), limit },
  })
  return response.data
}

/** Marks a pending occurrence done. */
export async function completeOccurrence(id: string, expectedVersion: number): Promise<RoutineOccurrenceDto> {
  const response = await http.post<RoutineOccurrenceDto>(
    `/routine-occurrences/${encodeURIComponent(id)}/done`,
    { expectedVersion },
    { headers: commandHeaders() },
  )
  return response.data
}

/** Corrects a resolved occurrence between done and missed. Its date and slot never change. */
export async function correctOccurrence(id: string, expectedVersion: number, targetStatus: OccurrenceCorrection): Promise<RoutineOccurrenceDto> {
  const response = await http.post<RoutineOccurrenceDto>(
    `/routine-occurrences/${encodeURIComponent(id)}/correct`,
    { targetStatus, expectedVersion },
    { headers: commandHeaders() },
  )
  return response.data
}
