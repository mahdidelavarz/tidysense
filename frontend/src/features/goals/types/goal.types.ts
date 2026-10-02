import type { components } from '../../../shared/api/generated'

// Transport types re-exported from the generated OpenAPI schema. Feature
// code imports these instead of reaching into `components['schemas']`
// directly, so the generated module stays an implementation detail.
export type GoalDto = components['schemas']['GoalDto']
export type GoalPage = components['schemas']['CursorPageDtoOfGoalDto']
export type CreateGoalRequest = components['schemas']['CreateGoalRequest']
export type UpdateGoalRequest = components['schemas']['UpdateGoalRequest']
export type GoalTerminalStatus = 'ACHIEVED' | 'ABANDONED'
export type GoalTerminalPreview = components['schemas']['TerminalPreviewDto']
