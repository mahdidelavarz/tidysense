import { Link } from '@tanstack/react-router'
import { formatLongDate, formatNumber, parseIsoDate } from '../../../shared/lib/date'
import { CalendarDays, Sun } from '../../../shared/ui/icons'
import { useToday } from '../../today/hooks/today-hooks'
import type { ReconcileSessionDto } from '../types/reconcile.types'

const day = 86_400_000

/**
 * The earlier days the open Tasks of this session were planned for, newest
 * first, with how many are still open from each. Read from the session the
 * lanes already show; the lanes stay grouped by owner, as on the phone.
 */
export function EarlierDays({ session }: { session: ReconcileSessionDto }) {
  const tasks = session.executionGroups.flatMap(group => [...group.tasks, ...group.sequences.flatMap(sequence => sequence.items)])
  const counts = new Map<string, number>()
  for (const task of tasks) {
    if (!task.actionable || !task.plannedDate || task.plannedDate >= session.localDate) continue
    counts.set(task.plannedDate, (counts.get(task.plannedDate) ?? 0) + 1)
  }
  const days = [...counts.entries()].sort(([a], [b]) => b.localeCompare(a))
  return (
    <section className="desk-card" aria-labelledby="desk-earlier-days">
      <h2 id="desk-earlier-days" className="mb-3 text-sm font-extrabold text-text-secondary">روزهایی که کارشان مانده</h2>
      {days.length === 0 ? <p className="text-sm text-text-secondary">کاری از روزهای قبل نمانده است.</p> : (
        <ul className="space-y-2">
          {days.map(([date, count]) => {
            const ago = Math.round((parseIsoDate(session.localDate).getTime() - parseIsoDate(date).getTime()) / day)
            return (
              <li key={date} className="desk-earlier-day">
                <span className="lane-tile size-9 rounded-xl" aria-hidden="true"><CalendarDays size={18} /></span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-extrabold">{formatLongDate(date)}</p>
                  <p className="text-xs text-text-secondary">{ago === 1 ? 'دیروز' : `${formatNumber(ago)} روز پیش`}</p>
                </div>
                <span className="text-xs font-bold text-text-secondary">{formatNumber(count)} مانده</span>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}

/**
 * Today as it stands after this review: Today's own list, with the Tasks a
 * tap of «امروز» brought here marked as new. Nothing is staged: every
 * decision is already applied or still waits in its own preview.
 */
export function TodayAfter({ quickActions }: { quickActions: ReconcileSessionDto['quickActions'] }) {
  const today = useToday()
  const brought = new Set(quickActions.filter(item => item.status === 'APPLIED' && item.actionType === 'CARRY_TO_TODAY').map(item => item.taskId))
  const tasks = today.data?.tasks ?? []
  const before = tasks.filter(task => !brought.has(task.id)).length
  return (
    <aside className="desk-card desk-today-after" aria-labelledby="desk-today-after">
      <div className="desk-card-head">
        <h2 id="desk-today-after" className="desk-card-title flex items-center gap-2"><Sun size={18} aria-hidden="true" />امروز بعد از بازبینی</h2>
        <span className="text-xs text-text-secondary">
          {formatNumber(before)} ← <b className="text-lg text-text-primary">{formatNumber(tasks.length)}</b> کار
        </span>
      </div>
      {tasks.length === 0 ? <p className="text-sm text-text-secondary">برای امروز کاری برنامه‌ریزی نشده است.</p> : (
        <ul className="space-y-2">
          {tasks.map(task => (
            <li key={task.id} className="desk-today-after-item" data-new={brought.has(task.id) || undefined}>
              <span className="desk-today-after-ring" aria-hidden="true" />
              <span className="min-w-0 flex-1 truncate text-sm">{task.title}</span>
              {brought.has(task.id) && <span className="text-[0.6875rem] font-extrabold text-sun-strong">تازه</span>}
            </li>
          ))}
        </ul>
      )}
      <Link className="desk-row-button mt-auto" to="/today">
        <Sun size={18} aria-hidden="true" />
        <span className="flex-1 text-start">رفتن به امروز</span>
      </Link>
    </aside>
  )
}
