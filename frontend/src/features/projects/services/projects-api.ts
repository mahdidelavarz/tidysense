// Project HTTP operations only. No React Query, no component concerns —
// hooks in ../hooks call these and own caching/state.
import { http } from '../../../shared/api/http'
import type {
  CreateProjectRequest,
  ProjectDto,
  ProjectPage,
  ProjectTerminalPreview,
  ProjectTerminalStatus,
  UpdateProjectRequest,
} from '../types/project.types'

/** Generates a fresh per-request idempotency key for a consequential write. */
const commandHeaders = () => ({ 'Idempotency-Key': crypto.randomUUID() })

/** Fetches one cursor page of the caller's Projects, optionally filtered by status. */
export async function listProjects(status?: string, cursor?: string, limit = 20): Promise<ProjectPage> {
  const response = await http.get<ProjectPage>('/projects', {
    params: { ...(status ? { status } : {}), ...(cursor ? { cursor } : {}), limit },
  })
  return response.data
}

/** Fetches one owned Project by id. */
export async function getProject(id: string): Promise<ProjectDto> {
  const response = await http.get<ProjectDto>(`/projects/${encodeURIComponent(id)}`)
  return response.data
}

/** Creates a new Project, optionally attached to a Goal. */
export async function createProject(request: CreateProjectRequest): Promise<ProjectDto> {
  const response = await http.post<ProjectDto>('/projects', request, { headers: commandHeaders() })
  return response.data
}

/** Updates a Project's editable fields under an optimistic version check. */
export async function updateProject(id: string, request: UpdateProjectRequest): Promise<ProjectDto> {
  const response = await http.put<ProjectDto>(`/projects/${encodeURIComponent(id)}`, request, {
    headers: commandHeaders(),
  })
  return response.data
}

/** Keeps a Project active after its review checkpoint and sets its next review date. */
export async function reviewProject(id: string, expectedVersion: number): Promise<ProjectDto> {
  const response = await http.post<ProjectDto>(
    `/projects/${encodeURIComponent(id)}/review`,
    { reviewDate: null, expectedVersion },
    { headers: commandHeaders() },
  )
  return response.data
}

/** Previews the blockers/effects of an explicit terminal transition before it is confirmed. */
export async function previewProjectTerminal(
  id: string,
  targetStatus: ProjectTerminalStatus,
  expectedVersion: number,
): Promise<ProjectTerminalPreview> {
  const response = await http.post<ProjectTerminalPreview>(
    `/projects/${encodeURIComponent(id)}/terminal-preview`,
    { targetStatus, expectedVersion },
  )
  return response.data
}

/** Applies a previously previewed terminal transition (complete/stop). */
export async function terminateProject(id: string, preview: ProjectTerminalPreview): Promise<ProjectDto> {
  const response = await http.post<ProjectDto>(
    `/projects/${encodeURIComponent(id)}/terminal`,
    {
      targetStatus: preview.targetStatus,
      expectedVersion: preview.expectedVersion,
      previewHash: preview.previewHash,
    },
    { headers: commandHeaders() },
  )
  return response.data
}
