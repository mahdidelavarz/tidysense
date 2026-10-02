import type { components } from '../../../shared/api/generated'

export type ProjectDto = components['schemas']['ProjectDto']
export type ProjectPage = components['schemas']['CursorPageDtoOfProjectDto']
export type CreateProjectRequest = components['schemas']['CreateProjectRequest']
export type UpdateProjectRequest = components['schemas']['UpdateProjectRequest']
export type ProjectTerminalStatus = 'COMPLETED' | 'STOPPED'
export type ProjectTerminalPreview = components['schemas']['TerminalPreviewDto']
