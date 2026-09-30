import type { components } from '../../../shared/api/generated'
import { http } from '../../../shared/api/http'

export type TaskDto = components['schemas']['TaskDto']
export type TaskPage = components['schemas']['CursorPageDtoOfTaskDto']
export type TodayDto = components['schemas']['TodayDto']
export type CreateTaskRequest = components['schemas']['CreateTaskRequest']
export type UpdateTaskRequest = components['schemas']['UpdateTaskRequest']

export const taskKeys = {
  all: ['tasks'] as const,
  list: ['tasks', 'list'] as const,
  options: ['tasks', 'options'] as const,
  detail: (id: string) => ['tasks', 'detail', id] as const,
}

export const todayKey = ['today'] as const

const commandHeaders = () => ({ 'Idempotency-Key': crypto.randomUUID() })

export async function listTasks(status?: string, cursor?: string, limit = 20): Promise<TaskPage> {
  const response = await http.get<TaskPage>('/tasks', {
    params: { ...(status ? { status } : {}), ...(cursor ? { cursor } : {}), limit },
  })
  return response.data
}

export async function getTask(id: string): Promise<TaskDto> {
  const response = await http.get<TaskDto>(`/tasks/${encodeURIComponent(id)}`)
  return response.data
}

export async function createTask(request: CreateTaskRequest): Promise<TaskDto> {
  const response = await http.post<TaskDto>('/tasks', request, { headers: commandHeaders() })
  return response.data
}

export async function updateTask(id: string, request: UpdateTaskRequest): Promise<TaskDto> {
  const response = await http.put<TaskDto>(`/tasks/${encodeURIComponent(id)}`, request, {
    headers: commandHeaders(),
  })
  return response.data
}

export async function dropTask(id: string, expectedVersion: number): Promise<TaskDto> {
  const response = await http.post<TaskDto>(
    `/tasks/${encodeURIComponent(id)}/drop`,
    { expectedVersion },
    { headers: commandHeaders() },
  )
  return response.data
}

export async function restoreTask(id: string, expectedVersion: number, plannedDate: string | null): Promise<TaskDto> {
  const response = await http.post<TaskDto>(
    `/tasks/${encodeURIComponent(id)}/restore`,
    { expectedVersion, plannedDate },
    { headers: commandHeaders() },
  )
  return response.data
}

export async function completeTask(id: string, expectedVersion: number, completedForLocalDate: string): Promise<TaskDto> {
  const response = await http.post<TaskDto>(
    `/tasks/${encodeURIComponent(id)}/complete`,
    { expectedVersion, completedForLocalDate },
    { headers: commandHeaders() },
  )
  return response.data
}

export async function getToday(): Promise<TodayDto> {
  const response = await http.get<TodayDto>('/today')
  return response.data
}
