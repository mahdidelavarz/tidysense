import type { components } from '../../../shared/api/generated'
import { http } from '../../../shared/api/http'

export type ProjectDto = components['schemas']['ProjectDto']

export async function getProject(id: string): Promise<ProjectDto> {
  const response = await http.get<ProjectDto>(`/projects/${encodeURIComponent(id)}`)
  return response.data
}
