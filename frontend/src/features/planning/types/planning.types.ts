import type { components } from '../../../shared/api/generated'

export type PlanningAttemptDto = components['schemas']['PlanningAttemptDto']
export type PlanningActiveDto = components['schemas']['PlanningActiveDto']
export type PlanningDraftDto = components['schemas']['PlanningDraftDto']
export type PlanningProposal = components['schemas']['PlanningProposal']
export type PlanningProposalViewDto = components['schemas']['PlanningProposalViewDto']
export type PlanningFactProposal = components['schemas']['PlanningFactProposal']
export type PlanningFactViewDto = components['schemas']['PlanningFactViewDto']
export type PlanningFactValue = components['schemas']['PlanningFactValue']
export type PlanningIssueDto = components['schemas']['PlanningIssueDto']
export type PlanningConfirmationDto = components['schemas']['PlanningConfirmationDto']
export type PlanningWarningDto = components['schemas']['PlanningWarningDto']
export type PlanningApplyResultDto = components['schemas']['PlanningApplyResultDto']
export type PlanningFactDto = components['schemas']['PlanningFactDto']
export type RevisePlanningDraftRequest = components['schemas']['RevisePlanningDraftRequest']

/** The Goal or Project a planning flow starts from. Neither means a global flow. */
export type PlanningScopeInput = { goalId?: string; projectId?: string }

export type PlanningClarificationDto = components['schemas']['PlanningClarificationDto']
export type PlanningAnswer = components['schemas']['PlanningAnswer']

/**
 * What the user asked for when starting an attempt. The client attempt id is added by the hook.
 * `previousAttemptId` answers the questions of that attempt; `draftNow` asks for a draft without
 * further questions.
 */
export type PlanningAttemptInput = PlanningScopeInput & {
  intention: string
  replaceActive: boolean
  previousAttemptId?: string
  answers?: PlanningAnswer[]
  draftNow?: boolean
  /** «برنامهٔ هفتهٔ بعد»: the planned week this attempt continues (029 §3). */
  continuationOfWindowId?: string
  /** «اصلاح» or «نسخهٔ دیگر» on the review: the draft and revision seen, and what to change (none: another version). */
  redo?: { draftId: string; expectedRevision: number; correction: string | null; differentWay: boolean }
}

/** A planned week whose next week can be planned now, with how it went. */
export type PlanningContinuationDto = components['schemas']['PlanningContinuationDto']
export type PlanningContextProjectDto = components['schemas']['PlanningContextProjectDto']

/** The edited item lists of one revision, sent back whole. */
export type PlanningDraftEdit = { proposals: PlanningProposal[]; facts: PlanningFactProposal[] }
