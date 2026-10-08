import type { components } from '../../../shared/api/generated'

export type ReconcileOverviewDto = components['schemas']['ReconcileOverviewDto']
export type ReconcileSessionDto = components['schemas']['ReconcileSessionDto']
export type ReconcileOwnerGroupDto = components['schemas']['ReconcileOwnerGroupDto']
export type ReconcileSequenceGroupDto = components['schemas']['ReconcileSequenceGroupDto']
export type ReconcileTaskItemDto = components['schemas']['ReconcileTaskItemDto']
export type ReconcileTaskRefDto = components['schemas']['ReconcileTaskRefDto']
export type ReconcileReviewItemDto = components['schemas']['ReconcileReviewItemDto']
export type ActionConfirmationDto = components['schemas']['ActionConfirmationDto']
export type ConfirmationWarningDto = components['schemas']['ConfirmationWarningDto']
export type ConfirmationResultDto = components['schemas']['ConfirmationResultDto']
export type ReconcilePromptDto = components['schemas']['ReconcilePromptDto']
export type ReconcileAiDto = components['schemas']['ReconcileAiDto']
export type ReconcileExplanationDto = components['schemas']['ReconcileExplanationDto']
export type ReconcileRecommendationDto = components['schemas']['ReconcileRecommendationDto']
export type ReconcileRecommendationEvidenceDto = components['schemas']['ReconcileRecommendationEvidenceDto']
export type ReconcileRecommendationDispositionDto = components['schemas']['ReconcileRecommendationDispositionDto']

export type ReconcilePromptState = 'DISMISSED' | 'SKIPPED'

/** The actions the server previews and applies. Completing a Task uses the Task command instead. */
export type ReconcileActionType =
  | 'REPLAN_TASKS'
  | 'DROP_TASKS'
  | 'KEEP_TASKS'
  | 'SEQUENCE_CARRY_ALL'
  | 'SEQUENCE_DROP_ALL'
  | 'DETACH_DROPPED_PREDECESSOR'

/** What the user asked for, before the server turns it into a preview. */
export type ReconcileActionDraft = {
  actionType: ReconcileActionType
  taskIds?: string[]
  sequenceId?: string
  plannedDate?: string
  includeTaskIds?: string[]
  /** Set when the action was started from an AI recommendation. The server still builds and checks the preview. */
  recommendationId?: string
}
