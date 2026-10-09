// The wording of the pilot questions, version 1. The wording belongs to the
// version: changing either means changing `pilotInstrumentVersion` here,
// `PilotInstruments.Version` on the server and the metric dictionary, so an
// answer is never counted under a question the user did not read.
import type { PilotInstrument } from './pilot.types'

export const pilotInstrumentVersion = 1

export const pilotQuestions: Record<PilotInstrument, { question: string; lowest: string; highest: string }> = {
  H1_USEFULNESS: {
    question: 'این برنامه چقدر برای شروع کار به دردتان می‌خورد؟',
    lowest: 'اصلاً',
    highest: 'خیلی زیاد',
  },
  H2_UNDERSTANDING: {
    question: 'چقدر برایتان روشن بود که هر مورد چرا در این بازبینی آمده بود؟',
    lowest: 'اصلاً روشن نبود',
    highest: 'کاملاً روشن بود',
  },
}

export const pilotScale = [1, 2, 3, 4, 5] as const
