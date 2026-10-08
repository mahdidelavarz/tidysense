// Persian wording for Reconcile codes. The server sends codes only; every
// label here is neutral by design: a backlog describes work to organise, never
// the person.
import { formatNumber } from '../../../shared/lib/date'
import type { ReconcileActionType } from './reconcile.types'

export const severityLabels: Record<string, { badge: string; title: string; description: string }> = {
  NONE: {
    badge: 'بدون مورد اجرایی',
    title: 'کار عقب‌افتاده‌ای منتظر تصمیم نیست.',
    description: 'اگر مرور تعهد یا یادداشتی مانده باشد، پایین‌تر دیده می‌شود.',
  },
  LIGHT: {
    badge: 'سبک',
    title: 'چند مورد کوچک منتظر تصمیم شماست.',
    description: 'هر وقت خواستید درباره‌شان تصمیم بگیرید؛ امروز همچنان در دسترس است.',
  },
  MEDIUM: {
    badge: 'متوسط',
    title: 'چند مورد به مرور نیاز دارد.',
    description: 'مرورشان پیش از برنامه‌ریزی تازه کمک می‌کند، اما اجباری نیست.',
  },
  RECOVERY: {
    badge: 'گسترده',
    title: 'موارد زیادی جمع شده است؛ می‌شود کم‌کم مرتبشان کرد.',
    description: 'لازم نیست همه را یک‌جا تمام کنید. هر زمان خواستید به امروز برگردید.',
  },
}

export const reasonLabels: Record<string, string> = {
  EXECUTION_OVERDUE: 'از تاریخش گذشته',
  REPEATED_CARRY: 'چند بار منتقل شده',
  DEADLINE_RISK: 'مهلت نزدیک است',
  DROPPED_PREDECESSOR: 'پیش‌نیاز کنار گذاشته شده',
  REVIEW_DUE: 'زمان مرور رسیده',
}

export const actionTitles: Record<ReconcileActionType, string> = {
  REPLAN_TASKS: 'انتقال به تاریخ جدید',
  DROP_TASKS: 'کنار گذاشتن',
  KEEP_TASKS: 'بدون تغییر بماند',
  SEQUENCE_CARRY_ALL: 'انتقال کل دنباله',
  SEQUENCE_DROP_ALL: 'کنار گذاشتن باقی‌مانده دنباله',
  DETACH_DROPPED_PREDECESSOR: 'جدا کردن پیش‌نیاز کنار گذاشته‌شده',
}

export const classificationLabels: Record<string, string> = {
  WILL_REPLAN: 'منتقل می‌شود',
  WILL_SCHEDULE: 'تاریخ می‌گیرد',
  WILL_DROP: 'کنار گذاشته می‌شود',
  WILL_KEEP: 'بدون تغییر می‌ماند',
  WILL_DETACH: 'از دنباله جدا می‌شود',
  WILL_SHIFT_NORMALLY: 'با همان فاصله جابه‌جا می‌شود',
  HAS_PROTECTED_MANUAL_SCHEDULE: 'تاریخ دستی دارد و سر جایش می‌ماند',
  UNSCHEDULED_PARENT_OWNED: 'بدون تاریخ است و تغییری نمی‌کند',
  HAS_TEMPORAL_CONFLICT: 'از مهلتش می‌گذرد',
  PROTECTED: 'محافظت‌شده است',
  NOT_ACTIVE: 'دیگر فعال نیست',
  UNCHANGED: 'تغییری نمی‌کند',
}

/** Classifications that stop the whole action. Nothing is ever applied partially. */
export const blockingClassifications = new Set(['HAS_TEMPORAL_CONFLICT', 'PROTECTED', 'NOT_ACTIVE'])

export const warningLabels: Record<string, string> = {
  UNDATED_TASK_SCHEDULED: 'کاری که تاریخ نداشت، تاریخ می‌گیرد و در آن روز در «امروز» دیده می‌شود.',
  PARENT_LEFT_WITHOUT_ACTIVE_TASKS: 'پس از این کار، هدف یا پروژه مربوط دیگر کار فعالی ندارد. خودش فعال می‌ماند تا جداگانه درباره‌اش تصمیم بگیرید.',
}

/** «۳ روز گذشته» for an overdue Task. */
export function formatAge(days: number | string | null | undefined): string | null {
  if (days == null) return null
  return `${formatNumber(Number(days))} روز گذشته`
}

/** The deterministic rule a recommendation rests on, in plain words. */
export const ruleLabels: Record<string, string> = {
  R1: 'چند بار منتقل شده',
  R2: 'مدت زیادی از تاریخش گذشته',
  R3: 'مهلت نزدیک است',
  R6: 'پیش‌نیاز کنار گذاشته شده',
}

/** Why an explanation did not arrive. Each one leaves the lanes below exactly as they were. */
export const explanationFailureLabels: Record<string, string> = {
  AI_UNAVAILABLE: 'دستیار هوشمند اکنون در دسترس نیست.',
  AI_BUDGET_EXHAUSTED: 'سقف استفاده امروز از دستیار هوشمند پر شده است.',
  CONTEXT_TOO_LARGE: 'موارد این بازبینی برای یک توضیح زیاد است.',
  GENERATION_TIMEOUT: 'پاسخ دستیار هوشمند به‌موقع نرسید.',
  EXPLANATION_INVALID: 'پاسخ دستیار هوشمند قابل استفاده نبود و کنار گذاشته شد.',
  PROVIDER_ERROR: 'دستیار هوشمند پاسخ نداد.',
  RECONCILE_AI_UNAVAILABLE: 'دستیار هوشمند اکنون خاموش است.',
  AI_RATE_LIMITED: 'امروز به سقف درخواست توضیح رسیده‌اید.',
  EXPLANATION_NOT_ELIGIBLE: 'دیگر موردی برای توضیح نمانده است.',
}

const recommendationStatusLabels: Record<string, string> = {
  REJECTED: 'این پیشنهاد را نخواستید.',
  OUTDATED: 'وضعیت این کارها تغییر کرده است و این پیشنهاد دیگر معتبر نیست.',
  CANCELLED: 'این پیشنهاد بسته شد.',
  EXPIRED_WITHOUT_DECISION: 'این پیشنهاد بدون تصمیم بسته شد.',
}

/**
 * What became of a recommendation. Accepting is the user's answer; whether
 * anything changed is said only from the command's own result.
 */
export function recommendationStatusText(status: string, commandStatus: string | null | undefined): string {
  if (status !== 'ACCEPTED' && status !== 'ACCEPTED_EDITED') return recommendationStatusLabels[status] ?? status
  const accepted = status === 'ACCEPTED_EDITED' ? 'این پیشنهاد را با تغییر پذیرفتید' : 'این پیشنهاد را پذیرفتید'
  if (commandStatus === 'SUCCEEDED') return `${accepted} و اعمال شد.`
  if (commandStatus) return `${accepted}، اما اعمال نشد. از فهرست پایین دوباره تصمیم بگیرید.`
  return `${accepted}.`
}

type RecommendationFacts = {
  kind: string
  ageDays: number | string | null
  carryCount: number | string
  isProtected: boolean
  daysToDeadline: number | string | null
  memberCount: number | string
  blockedMemberCount: number | string
  hasDroppedPredecessor: boolean
}

/** The deterministic facts behind one recommended Task or sequence, as short phrases. Never model text. */
export function formatFacts(facts: RecommendationFacts): string[] {
  const phrases: string[] = []
  if (facts.kind === 'SEQUENCE') phrases.push(`دنباله‌ای از ${formatNumber(Number(facts.memberCount))} کار`)
  if (facts.hasDroppedPredecessor) phrases.push('پیش‌نیاز کنار گذاشته شده')
  if (Number(facts.blockedMemberCount) > 0) phrases.push(`${formatNumber(Number(facts.blockedMemberCount))} کار منتظر کار پیشین`)
  const age = formatAge(facts.ageDays)
  if (age) phrases.push(age)
  if (Number(facts.carryCount) > 0) phrases.push(`${formatNumber(Number(facts.carryCount))} بار منتقل شده`)
  if (facts.daysToDeadline != null) {
    const days = Number(facts.daysToDeadline)
    phrases.push(days < 0 ? 'از مهلت گذشته' : days === 0 ? 'مهلت امروز است' : `${formatNumber(days)} روز تا مهلت`)
  }
  if (facts.isProtected) phrases.push('محافظت‌شده')
  return phrases
}
