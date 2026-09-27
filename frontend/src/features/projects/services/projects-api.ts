import type { components } from '../../../shared/api/generated'
import { http } from '../../../shared/api/http'

export type ProjectDto = components['schemas']['ProjectDto']
export type ProjectPage = components['schemas']['CursorPageDtoOfProjectDto']
export type CreateProjectRequest = components['schemas']['CreateProjectRequest']
export type UpdateProjectRequest = components['schemas']['UpdateProjectRequest']
export type TerminalPreview = components['schemas']['TerminalPreviewDto']

const commandHeaders = () => ({ 'Idempotency-Key': crypto.randomUUID() })

export async function listProjects(status?: string, cursor?: string, limit = 20): Promise<ProjectPage> {
  const response = await http.get<ProjectPage>('/projects', {
    params: { ...(status ? { status } : {}), ...(cursor ? { cursor } : {}), limit },
  })
  return response.data
}

export async function getProject(id: string): Promise<ProjectDto> {
  const response = await http.get<ProjectDto>(`/projects/${encodeURIComponent(id)}`)
  return response.data
}

export async function createProject(request: CreateProjectRequest): Promise<ProjectDto> {
  const response = await http.post<ProjectDto>('/projects', request, { headers: commandHeaders() })
  return response.data
}

export async function updateProject(id: string, request: UpdateProjectRequest): Promise<ProjectDto> {
  const response = await http.put<ProjectDto>(`/projects/${encodeURIComponent(id)}`, request, {
    headers: commandHeaders(),
  })
  return response.data
}

export async function previewProjectTerminal(
  id: string,
  targetStatus: 'COMPLETED' | 'STOPPED',
  expectedVersion: number,
): Promise<TerminalPreview> {
  const response = await http.post<TerminalPreview>(
    `/projects/${encodeURIComponent(id)}/terminal-preview`,
    { targetStatus, expectedVersion },
  )
  return response.data
}

export async function terminateProject(id: string, preview: TerminalPreview): Promise<ProjectDto> {
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
