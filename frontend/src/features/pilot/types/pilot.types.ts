import type { components } from '../../../shared/api/generated'

export type PilotNotice = components['schemas']['PilotNoticeDto']

/** The in-app pilot questions. The codes are the server's. */
export type PilotInstrument = 'H1_USEFULNESS' | 'H2_UNDERSTANDING'

export type PilotFeedbackInput = { instrument: PilotInstrument; subjectId: string; answer: number }
