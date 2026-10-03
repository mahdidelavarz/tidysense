// Persian wording for planning codes. The server sends codes only. The wording
// never promises more than the product does: a "hard" planning detail is
// respected by later planning drafts, not by everything the user does by hand.
import { formatLocalDate } from '../../../shared/lib/date'
import type { EntityKind } from '../../../shared/ui/EntityUi'
import { recurrenceLabel, weekdayOptions } from '../../routines/types/routine.format'
import type { PlanningFactValue, PlanningProposal } from './planning.types'

export const entityKinds: Record<string, EntityKind> = {
  GOAL: 'goal', PROJECT: 'project', TASK: 'task', ROUTINE: 'routine',
}

export const stateLabels: Record<string, string> = {
  INCLUDED: 'در برنامه',
  EXCLUDED: 'کنار گذاشته',
  BLOCKED: 'نیازمند اصلاح',
  BLOCKED_BY_ANCESTOR: 'منتظر اصلاح مورد بالاتر',
}

export const issueLabels: Record<string, string> = {
  DATE_OUTSIDE_WINDOW: 'تاریخ بیرون از هفت روز پیش رو است.',
  DATE_IN_PAST: 'تاریخ گذشته است.',
  DATE_AFTER_DEADLINE: 'تاریخ برنامه‌ریزی از مهلت می‌گذرد.',
  STANDALONE_TASK_NEEDS_DATE: 'کار مستقل باید تاریخ داشته باشد.',
  HARD_CONSTRAINT_CONFLICT: 'با یکی از محدودیت‌های ثبت‌شده برای این برنامه هم‌خوان نیست.',
  UNSUPPORTED_RECURRENCE: 'این نوع تکرار پشتیبانی نمی‌شود. تکرار را تغییر دهید یا این مورد را کنار بگذارید.',
  INVALID_TIMES: 'ساعت‌های روز معتبر نیست.',
  START_IN_PAST: 'تاریخ شروع گذشته است.',
  TARGET_IN_PAST: 'تاریخ هدف گذشته است.',
  REVIEW_IN_PAST: 'تاریخ بازبینی گذشته است.',
  NOT_ALLOWED_IN_CONTEXT: 'در این برنامه‌ریزی نمی‌توان هدف یا پروژه مستقل تازه ساخت.',
  FACT_SCOPE_UNSUPPORTED: 'این مورد به هدف یا پروژه مستقلی وصل نیست و قابل نگه‌داری نیست.',
  FACT_ALREADY_ACTIVE: 'این مورد قبلاً ثبت شده است.',
  FACT_DATE_PASSED: 'تاریخ این مورد گذشته است.',
  FIRST_WEEK_OVERLOADED: 'هفته اول بیش از حد پر است. چند مورد را کم کنید.',
  ASSUMED_DATES: 'تاریخ‌ها پیشنهادی‌اند و می‌توانید تغییرشان دهید.',
  OMITTED_FOR_LIMITS: 'بخشی از درخواست برای کوتاه ماندن پیش‌نویس کنار گذاشته شد.',
  UNSUPPORTED_HARD_CONSTRAINT: 'یکی از محدودیت‌های شما به شکل قطعی قابل بررسی نیست و فقط به‌عنوان ترجیح قابل ثبت است.',
  GOAL_OUTCOME_AMBIGUOUS: 'نتیجه مطلوب این هدف روشن نیست. آن را دقیق‌تر بنویسید.',
  SOFT_PREFERENCE_CONFLICT: 'ممکن است با یکی از ترجیح‌های شما هم‌خوان نباشد (برداشت پیشنهاددهنده).',
}

export const failureLabels: Record<string, string> = {
  DRAFT_INVALID: 'پیش‌نویس ساخته‌شده معتبر نبود و نمایش داده نشد.',
  PROVIDER_ERROR: 'ساخت پیش‌نویس با خطا روبه‌رو شد.',
  GENERATION_TIMEOUT: 'ساخت پیش‌نویس بیش از حد طول کشید.',
  GENERATION_INTERRUPTED: 'ساخت پیش‌نویس نیمه‌کاره ماند.',
  CONTEXT_INTEGRITY: 'پیش‌نویس با وضعیت فعلی کارهای شما هم‌خوان نبود.',
  DRAFT_COLLISION: 'هم‌زمان پیش‌نویس دیگری ساخته شد.',
  AI_UNAVAILABLE: 'دستیار برنامه‌ریزی فعلاً در دسترس نیست.',
  AI_BUDGET_EXHAUSTED: 'سقف استفاده از دستیار برنامه‌ریزی برای امروز پر شده است.',
  CONTEXT_TOO_LARGE: 'این برنامه‌ریزی برای یک پیش‌نویس بیش از حد بزرگ است. آن را از داخل یک پروژه یا با درخواستی کوچک‌تر شروع کنید.',
}

/** Why an attempt could not even be started. Nothing was stored or changed in any of these cases. */
export const startErrorLabels: Record<string, string> = {
  PLANNING_AI_UNAVAILABLE: 'دستیار برنامه‌ریزی فعلاً در دسترس نیست. چیزی تغییر نکرد؛ می‌توانید بعداً دوباره تلاش کنید یا همین حالا دستی بسازید.',
  AI_RATE_LIMITED: 'تعداد درخواست‌های برنامه‌ریزی از حد مجاز گذشته است. چیزی تغییر نکرد؛ کمی بعد دوباره تلاش کنید یا دستی بسازید.',
  CLARIFICATION_ALREADY_ANSWERED: 'به این پرسش‌ها قبلاً پاسخ داده شده است.',
  CLARIFICATION_NOT_PENDING: 'این پرسش‌ها دیگر منتظر پاسخ نیستند.',
}

export const blockReasonLabels: Record<string, string> = {
  TOO_VAGUE: 'درخواست برای برنامه‌ریزی بیش از حد کلی است.',
  CONTRADICTORY: 'در درخواست دو خواسته ناسازگار وجود دارد.',
  UNSUPPORTED_REQUEST: 'این درخواست از نوعی نیست که بتوان برایش برنامه ساخت.',
  MISSING_CONSTRAINT: 'برای ساخت برنامه یک اطلاع ضروری کم است.',
}

export const factTypeLabels: Record<string, string> = {
  UNAVAILABLE_WEEKDAY: 'روزهای غیرقابل‌استفاده هفته',
  UNAVAILABLE_DATE: 'تاریخ غیرقابل‌استفاده',
  UNAVAILABLE_DATE_RANGE: 'بازه غیرقابل‌استفاده',
  AVAILABLE_DEVICE: 'وسیله در دسترس',
  CURRENT_LEVEL: 'سطح فعلی',
  LEARNING_FOCUS: 'تمرکز',
  EXCLUDED_PATH: 'مسیر کنارگذاشته',
}

export const strengthLabels: Record<string, string> = {
  HARD: 'در برنامه‌ریزی‌های بعدی رعایت می‌شود',
  SOFT: 'ترجیح',
  INFORMATIONAL: 'برای اطلاع',
}

export const confirmationWarningLabels: Record<string, string> = {
  DESCENDANTS_EXCLUDED_WITH_PARENT: 'مواردی که زیر یک مورد کنارگذاشته‌شده قرار دارند هم ساخته نمی‌شوند.',
}

/** A planning detail's value in words. */
export function factValueLabel(value: PlanningFactValue): string {
  if (value.weekdays?.length) {
    const selected = value.weekdays.map(Number)
    return weekdayOptions.filter(day => selected.includes(day.value)).map(day => day.label).join('، ')
  }
  if (value.localDate) return formatLocalDate(value.localDate)
  if (value.startLocalDate && value.endLocalDate) {
    return `از ${formatLocalDate(value.startLocalDate)} تا ${formatLocalDate(value.endLocalDate)}`
  }
  return value.text ?? ''
}

const supportedRecurrences = new Set(['DAILY', 'SPECIFIC_WEEKDAYS', 'MONTHLY_ON_DAY'])

/** The proposed recurrence in words. An unsupported pattern is named as such, never shown as a supported one. */
export function proposalRecurrenceLabel(proposal: PlanningProposal): string {
  if (!proposal.recurrence || !supportedRecurrences.has(proposal.recurrence.type)) return 'تکرار پشتیبانی‌نشده'
  return recurrenceLabel(proposal.recurrence)
}
