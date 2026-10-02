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
