import { describe, expect, it } from 'vitest'
import { planningPhase } from './planning.phase'

describe('planningPhase', () => {
  it('follows an attempt from input to a terminal state', () => {
    expect(planningPhase({})).toBe('input')
    expect(planningPhase({ startPending: true })).toBe('submittingAttempt')
    expect(planningPhase({ attemptStatus: 'QUEUED' })).toBe('queued')
    expect(planningPhase({ attemptStatus: 'RUNNING' })).toBe('running')
    expect(planningPhase({ attemptStatus: 'FAILED' })).toBe('attemptFailed')
    expect(planningPhase({ attemptStatus: 'CANCELLED' })).toBe('cancelled')
    // Until the draft itself has been read, a succeeded attempt is not reviewable yet.
    expect(planningPhase({ attemptStatus: 'SUCCEEDED' })).toBe('running')
  })

  it('treats questions and a blocked input as finished answers that are not a draft', () => {
    expect(planningPhase({ attemptStatus: 'SUCCEEDED', attemptOutcome: 'CLARIFICATION' })).toBe('clarifying')
    expect(planningPhase({ attemptStatus: 'SUCCEEDED', attemptOutcome: 'INPUT_BLOCKED' })).toBe('inputBlocked')
    expect(planningPhase({ attemptStatus: 'SUCCEEDED', attemptOutcome: 'DRAFT' })).toBe('running')
    // An outcome means nothing until the attempt has succeeded.
    expect(planningPhase({ attemptStatus: 'RUNNING', attemptOutcome: 'CLARIFICATION' })).toBe('running')
    expect(planningPhase({ attemptStatus: 'FAILED', attemptOutcome: null })).toBe('attemptFailed')
  })

  it('asks before replacing an unapproved draft', () => {
    expect(planningPhase({ collision: true })).toBe('collision')
    expect(planningPhase({ collision: true, startPending: true })).toBe('submittingAttempt')
  })

  it('separates every step between a reviewable draft and a command result', () => {
    const draft = { attemptStatus: 'SUCCEEDED', draftStatus: 'REVIEWABLE' }
    expect(planningPhase(draft)).toBe('reviewable')
    expect(planningPhase({ ...draft, revisePending: true })).toBe('editingRevision')
    expect(planningPhase({ ...draft, previewPending: true })).toBe('creatingConfirmation')
    expect(planningPhase({ ...draft, hasPreview: true, unacknowledgedWarnings: 1 })).toBe('awaitingAcknowledgement')
    expect(planningPhase({ ...draft, hasPreview: true, unacknowledgedWarnings: 0 })).toBe('readyToSubmit')
    expect(planningPhase({ ...draft, hasPreview: true, submitPending: true })).toBe('submittingCommand')
    expect(planningPhase({ ...draft, hasPreview: true, submitErrorCode: 'CONFIRMATION_STALE' })).toBe('commandConflicted')
    expect(planningPhase({ ...draft, hasPreview: true, submitErrorCode: 'CONFIRMATION_EXPIRED' })).toBe('commandConflicted')
    expect(planningPhase({ ...draft, hasPreview: true, submitErrorCode: 'WARNING_NOT_ACKNOWLEDGED' })).toBe('commandFailed')
  })

  it('never derives success from the draft: only the command result counts', () => {
    // A linked or even submitted confirmation leaves the draft a draft.
    expect(planningPhase({ draftStatus: 'REVIEWABLE', hasPreview: true })).not.toBe('commandSucceeded')
    expect(planningPhase({ draftStatus: 'EXPIRED' })).toBe('expired')
    expect(planningPhase({ draftStatus: 'EXPIRED', applied: true })).toBe('commandSucceeded')
    expect(planningPhase({ draftStatus: 'SUPERSEDED' })).toBe('expired')
    expect(planningPhase({ draftStatus: 'CANCELLED' })).toBe('cancelled')
  })
})
