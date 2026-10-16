import type { components } from '../../../shared/api/generated'

export type TaskDto = components['schemas']['TaskDto']
export type TaskPage = components['schemas']['CursorPageDtoOfTaskDto']
export type CreateTaskRequest = components['schemas']['CreateTaskRequest']
export type UpdateTaskRequest = components['schemas']['UpdateTaskRequest']
export type TaskSequencePreview = components['schemas']['TaskSequencePreviewDto']
export type TaskVersionRef = components['schemas']['TaskVersionRefDto']
/** What a person can do to a Task's place in a sequence (029 §9.2). */
export type TaskSequenceAction = 'FOLLOW' | 'MOVE_EARLIER' | 'MOVE_LATER' | 'LEAVE'
