import type { components } from '../../../shared/api/generated'

/** Where a satisfaction prompt can follow an AI response. The codes are the server's. */
export type AiFeedbackSurface = 'PLANNING_DRAFT'

export type AiFeedbackPrompt = components['schemas']['AiResponseFeedbackPromptDto']
