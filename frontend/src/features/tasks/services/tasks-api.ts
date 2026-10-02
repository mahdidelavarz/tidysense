// Task HTTP operations only. No React Query, no component concerns — hooks
// in ../hooks call these and own caching/state. The Today projection has
// its own endpoint and lives in the `today` feature.
import { http } from '../../../shared/api/http'
import type { CreateTaskRequest, TaskDto, TaskPage, UpdateTaskRequest } from '../types/task.types'

/** Generates a fresh per-request idempotency key for a consequential write. */
const commandHeaders = () => ({ 'Idempotency-Key': crypto.randomUUID() })

/** Fetches one cursor page of the caller's Tasks, optionally filtered by status. */
export async function listTasks(status?: string, cursor?: string, limit = 20): Promise<TaskPage> {
  const response = await http.get<TaskPage>('/tasks', {
    params: { ...(status ? { status } : {}), ...(cursor ? { cursor } : {}), limit },
  })
  return response.data
}

/** Fetches one owned Task by id. */
export async function getTask(id: string): Promise<TaskDto> {
  const response = await http.get<TaskDto>(`/tasks/${encodeURIComponent(id)}`)
  return response.data
}

/** Creates a new Task under a Goal, a Project, or standalone with a planned date. */
export async function createTask(request: CreateTaskRequest): Promise<TaskDto> {
  const response = await http.post<TaskDto>('/tasks', request, { headers: commandHeaders() })
  return response.data
}

/** Updates a Task's editable fields under an optimistic version check. */
export async function updateTask(id: string, request: UpdateTaskRequest): Promise<TaskDto> {
  const response = await http.put<TaskDto>(`/tasks/${encodeURIComponent(id)}`, request, {
    headers: commandHeaders(),
  })
  return response.data
}

/** Drops an active Task out of Today/active lists; it remains recoverable via restore. */
export async function dropTask(id: string, expectedVersion: number): Promise<TaskDto> {
  const response = await http.post<TaskDto>(
    `/tasks/${encodeURIComponent(id)}/drop`,
    { expectedVersion },
    { headers: commandHeaders() },
  )
  return response.data
}

/** Restores a dropped Task back to active, optionally with a new planned date. */
export async function restoreTask(id: string, expectedVersion: number, plannedDate: string | null): Promise<TaskDto> {
  const response = await http.post<TaskDto>(
    `/tasks/${encodeURIComponent(id)}/restore`,
    { expectedVersion, plannedDate },
    { headers: commandHeaders() },
  )
  return response.data
}

/** Marks a Task complete for a given local date. Idempotent under its optimistic version. */
export async function completeTask(id: string, expectedVersion: number, completedForLocalDate: string): Promise<TaskDto> {
  const response = await http.post<TaskDto>(
    `/tasks/${encodeURIComponent(id)}/complete`,
    { expectedVersion, completedForLocalDate },
    { headers: commandHeaders() },
  )
  return response.data
}
