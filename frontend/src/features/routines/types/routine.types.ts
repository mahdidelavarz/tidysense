import type { components } from '../../../shared/api/generated'

export type RoutineDto = components['schemas']['RoutineDto']
export type RoutinePage = components['schemas']['CursorPageDtoOfRoutineDto']
export type RecurrenceDto = components['schemas']['RecurrenceDto']
export type CreateRoutineRequest = components['schemas']['CreateRoutineRequest']
export type UpdateRoutineRequest = components['schemas']['UpdateRoutineRequest']
export type RoutineOccurrenceDto = components['schemas']['RoutineOccurrenceDto']
export type RoutineOccurrencePage = components['schemas']['CursorPageDtoOfRoutineOccurrenceDto']
export type OccurrenceCorrection = 'DONE' | 'MISSED'
