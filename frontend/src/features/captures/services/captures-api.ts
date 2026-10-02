// Capture HTTP operations only. No React Query, no component concerns — hooks
// in ../hooks call these and own caching/state.
import { http } from '../../../shared/api/http'
import type {
  CaptureDto,
  CapturePage,
  CaptureResolutionDto,
  ResolveCaptureToRoutineRequest,
  ResolveCaptureToTaskRequest,
} from '../types/capture.types'

/** Generates a fresh per-request idempotency key for a consequential write. */
const commandHeaders = () => ({ 'Idempotency-Key': crypto.randomUUID() })

/** Saves a quick capture: a title only, not yet a Task. */
export async function createCapture(title: string): Promise<CaptureDto> {
  const response = await http.post<CaptureDto>('/captures', { title }, { headers: commandHeaders() })
  return response.data
}

/** Fetches one cursor page of the caller's captures, optionally filtered by status. */
export async function listCaptures(status?: string, cursor?: string, limit = 20): Promise<CapturePage> {
  const response = await http.get<CapturePage>('/captures', {
    params: { ...(status ? { status } : {}), ...(cursor ? { cursor } : {}), limit },
  })
  return response.data
}

/** Resolves a capture into a new Task. The Task needs a planned date or a Goal/Project owner. */
export async function resolveCaptureToTask(id: string, request: ResolveCaptureToTaskRequest): Promise<CaptureResolutionDto> {
  const response = await http.post<CaptureResolutionDto>(
    `/captures/${encodeURIComponent(id)}/resolve-task`,
    request,
    { headers: commandHeaders() },
  )
  return response.data
}

/** Resolves a capture into a new Routine. */
export async function resolveCaptureToRoutine(id: string, request: ResolveCaptureToRoutineRequest): Promise<CaptureResolutionDto> {
  const response = await http.post<CaptureResolutionDto>(
    `/captures/${encodeURIComponent(id)}/resolve-routine`,
    request,
    { headers: commandHeaders() },
  )
  return response.data
}

/** Discards a capture that will not become work. */
export async function discardCapture(id: string, expectedVersion: number): Promise<CaptureDto> {
  const response = await http.post<CaptureDto>(
    `/captures/${encodeURIComponent(id)}/discard`,
    { expectedVersion },
    { headers: commandHeaders() },
  )
  return response.data
}
