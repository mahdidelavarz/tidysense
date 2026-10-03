// The planning flow as one explicit state. Every state is derived from what
// the server has answered; none of them is assumed. In particular a draft
// with a linked confirmation is still only a draft: "succeeded" needs the
// command's own result.

export type PlanningPhase =
  | 'input'
  | 'collision'
  | 'submittingAttempt'
  | 'queued'
  | 'running'
  | 'attemptFailed'
  | 'clarifying'
  | 'inputBlocked'
  | 'cancelled'
  | 'reviewable'
  | 'editingRevision'
  | 'creatingConfirmation'
  | 'awaitingAcknowledgement'
  | 'readyToSubmit'
  | 'submittingCommand'
  | 'commandSucceeded'
  | 'commandConflicted'
  | 'commandFailed'
  | 'expired'

export type PlanningPhaseInput = {
  /** An unapproved draft exists and the user has not yet chosen to continue or replace it. */
  collision?: boolean
  startPending?: boolean
  attemptStatus?: string | null
  /** What a succeeded attempt ended in: a draft, questions, or a blocked input. */
  attemptOutcome?: string | null
  draftStatus?: string | null
  revisePending?: boolean
  previewPending?: boolean
  /** A confirmation preview is open. */
  hasPreview?: boolean
  unacknowledgedWarnings?: number
  submitPending?: boolean
  /** The error code of the last submission, if it failed. */
  submitErrorCode?: string | null
  /** True only when the server returned the command's result. */
  applied?: boolean
}

/** Conflict codes: what the user approved is no longer what would happen, so a fresh preview is required. */
export const conflictCodes = new Set(['CONFIRMATION_STALE', 'CONFLICT_STALE_VERSION', 'CONFIRMATION_NOT_PENDING', 'CONFIRMATION_EXPIRED'])

export function planningPhase(input: PlanningPhaseInput): PlanningPhase {
  if (input.applied) return 'commandSucceeded'
  if (input.startPending) return 'submittingAttempt'
  if (input.collision) return 'collision'

  if (input.draftStatus) {
    if (input.draftStatus !== 'REVIEWABLE') return input.draftStatus === 'CANCELLED' ? 'cancelled' : 'expired'
    if (input.submitPending) return 'submittingCommand'
    if (input.submitErrorCode) return conflictCodes.has(input.submitErrorCode) ? 'commandConflicted' : 'commandFailed'
    if (input.previewPending) return 'creatingConfirmation'
    if (input.hasPreview) return (input.unacknowledgedWarnings ?? 0) > 0 ? 'awaitingAcknowledgement' : 'readyToSubmit'
    return input.revisePending ? 'editingRevision' : 'reviewable'
  }

  switch (input.attemptStatus) {
    case 'QUEUED': return 'queued'
    case 'RUNNING': return 'running'
    case 'FAILED': return 'attemptFailed'
    case 'CANCELLED': return 'cancelled'
    case 'SUCCEEDED':
      // Questions and a blocked input are complete answers without a draft.
      if (input.attemptOutcome === 'CLARIFICATION') return 'clarifying'
      if (input.attemptOutcome === 'INPUT_BLOCKED') return 'inputBlocked'
      // A succeeded attempt whose draft has not been read yet is still being prepared.
      return 'running'
    default: return 'input'
  }
}
