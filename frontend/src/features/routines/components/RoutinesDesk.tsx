import { Link } from '@tanstack/react-router'
import { useEffect } from 'react'
import { formatDayMonth, formatNumber, formatTime, parseIsoDate, toIsoDate } from '../../../shared/lib/date'
import { showToast, useUiStore } from '../../../shared/lib/ui-store'
import { FormError } from '../../../shared/ui/FormUi'
import { Check, ChevronLeft, CircleSlash, LoaderCircle, Pause, Plus, Repeat, Sun } from '../../../shared/ui/icons'
import { EmptyState, ResourceState } from '../../../shared/ui/StateUi'
import { TaskParent } from '../../tasks/components/TaskFacts'
import { useTaskParentTitle } from '../../tasks/hooks/task-hooks'
import { useToday } from '../../today/hooks/today-hooks'
import { useCompleteOccurrence, useCorrectOccurrence, useRoutines, useRoutineWeek } from '../hooks/routine-hooks'
import { recurrenceLabel, slotsLabel } from '../types/routine.format'
import type { RoutineDto, RoutineOccurrenceDto, RoutineWeekDto } from '../types/routine.types'
import { RoutineDetailView } from './RoutineDetailView'

const weekday = new Intl.DateTimeFormat('fa-IR', { weekday: 'long' })
const dayNumber = new Intl.DateTimeFormat('fa-IR', { day: 'numeric' })

/**
 * Routines on desktop (`CodeDesktopRoutines`): this week as a grid of
 * Routines by days, with today's slots completed in place as on Today, and
 * the open Routine's detail beside it. Each day shows what the week already
 * says: done of scheduled for days gone, the slots ahead, and today's slots
 * one by one. Per-slot outcomes of earlier days are on the Routine itself.
 */
export function RoutinesDesk({ selectedId }: { selectedId?: string }) {
  const routines = useRoutines()
  const week = useRoutineWeek()
  const todayView = useToday()
  const complete = useCompleteOccurrence()
  const correct = useCorrectOccurrence()
  const openCreate = useUiStore(state => state.openCreate)
  const parentTitle = useTaskParentTitle()

  useEffect(() => {
    if (routines.hasNextPage && !routines.isFetchingNextPage && !routines.isError) routines.fetchNextPage()
  }, [routines])

  const items = routines.data?.pages.flatMap(page => page.items) ?? []
  const active = items.filter(routine => routine.status === 'ACTIVE')
  const stopped = items.filter(routine => routine.status !== 'ACTIVE')
  const today = todayView.data?.localDate ?? toIsoDate(new Date())
  const occurrences = todayView.data?.routineOccurrences ?? []
  const days = week.data?.routines[0]?.days.map(day => day.localDate) ?? []
  const weekOf = (routine: RoutineDto) => week.data?.routines.find(item => item.routineId === routine.id)
  const totals = (week.data?.routines ?? []).reduce((sum, routine) => {
    for (const day of routine.days) {
      sum.scheduled += Number(day.scheduled)
      sum.done += Number(day.done)
    }
    return sum
  }, { scheduled: 0, done: 0 })
  const todayDone = occurrences.filter(slot => slot.status === 'DONE').length
  const todayOpen = occurrences.filter(slot => slot.status === 'PENDING').length
  const lastStopped = [...stopped].sort((a, b) => (b.stoppedAt ?? '').localeCompare(a.stoppedAt ?? ''))[0]
  const busyId = complete.isPending ? complete.variables?.occurrenceId : correct.isPending ? correct.variables?.occurrenceId : undefined

  const onSlot = (slot: RoutineOccurrenceDto) => {
    if (slot.status === 'PENDING') {
      complete.mutate({ occurrenceId: slot.id, expectedVersion: Number(slot.version) }, { onSuccess: () => showToast('نوبت روتین انجام شد.') })
    } else if (slot.status === 'MISSED') {
      correct.mutate({ occurrenceId: slot.id, expectedVersion: Number(slot.version), targetStatus: 'DONE' },
        { onSuccess: () => showToast('سابقه اصلاح شد.') })
    }
  }

  return (
    <div className="page-desk desk-routines">
      <div className="min-w-0">
        <header className="desk-header">
          <div>
            <h1 className="page-title">روتین‌ها</h1>
            <p className="text-xs text-text-secondary">
              {formatNumber(active.length)} فعال، {formatNumber(stopped.length)} متوقف
              {days.length > 0 && <> · این هفته، {formatDayMonth(days[0])} تا {formatDayMonth(days[days.length - 1])}</>}
            </p>
          </div>
          <button className="primary-button" type="button" onClick={() => openCreate('routine')}>
            <Plus size={20} aria-hidden="true" />
            روتین جدید
          </button>
        </header>

        <section className="desk-tiles xl:grid-cols-3" aria-label="خلاصه‌ی روتین‌ها">
          <div className="desk-tile entity-routine">
            <span className="entity-icon size-11 rounded-2xl" aria-hidden="true"><Repeat size={22} /></span>
            <div className="min-w-0 flex-1">
              <p className="text-[0.8125rem] font-bold text-text-secondary">نوبت‌های این هفته</p>
              <p className="text-2xl font-extrabold leading-9">
                {formatNumber(totals.done)} <span className="text-sm font-semibold text-text-secondary">از {formatNumber(totals.scheduled)}</span>
              </p>
              <p className="text-xs text-text-secondary">روزهای پیش رو هم شمرده شده‌اند</p>
            </div>
          </div>
          <div className="desk-tile entity-routine">
            <span className="entity-icon size-11 rounded-2xl" aria-hidden="true"><Sun size={22} /></span>
            <div className="min-w-0 flex-1">
              <p className="text-[0.8125rem] font-bold text-text-secondary">امروز</p>
              <p className="text-2xl font-extrabold leading-9">
                {formatNumber(todayDone)} <span className="text-sm font-semibold text-text-secondary">از {formatNumber(occurrences.length)}</span>
              </p>
              <p className="text-xs text-text-secondary">{formatNumber(todayOpen)} نوبت مانده</p>
            </div>
          </div>
          {lastStopped ? (
            <Link className="desk-tile entity-routine" to="/routines/$routineId" params={{ routineId: lastStopped.id }}>
              <span className="entity-icon size-11 rounded-2xl" aria-hidden="true"><Pause size={22} /></span>
              <div className="min-w-0 flex-1">
                <p className="text-[0.8125rem] font-bold text-text-secondary">آخرین متوقف‌شده</p>
                <p className="truncate text-lg font-extrabold leading-9">{lastStopped.title}</p>
                <p className="text-xs text-text-secondary">
                  {lastStopped.stoppedAt ? `از ${formatDayMonth(lastStopped.stoppedAt.slice(0, 10))} · ` : ''}ادامه دادن از صفحه‌ی آن
                </p>
              </div>
              <ChevronLeft size={18} className="text-text-tertiary" aria-hidden="true" />
            </Link>
          ) : (
            <div className="desk-tile entity-routine">
              <span className="entity-icon size-11 rounded-2xl" aria-hidden="true"><Pause size={22} /></span>
              <div>
                <p className="text-[0.8125rem] font-bold text-text-secondary">متوقف‌شده</p>
                <p className="text-sm text-text-secondary">روتین متوقفی نیست.</p>
              </div>
            </div>
          )}
        </section>

        <section className="desk-card p-0" aria-label="هفته‌ی روتین‌ها">
          <FormError error={complete.error ?? correct.error} />
          <ResourceState
            pending={routines.isPending}
            error={routines.error}
            empty={items.length === 0}
            pendingText="در حال دریافت روتین‌ها…"
            emptyIcon={Repeat}
            emptyTitle="هنوز روتینی نساخته‌اید."
            emptyDescription="کاری را که می‌خواهید مرتب تکرار شود، با روزها و ساعت‌هایش ثبت کنید."
            emptyAction={<button className="secondary-button" type="button" onClick={() => openCreate('routine')}>ثبت یک روتین</button>}
            onRetry={() => routines.refetch()}
          >
            <div className="ops-scroll">
              <table className="desk-week">
                <caption className="sr-only">روتین‌های این هفته به تفکیک روز</caption>
                <thead>
                  <tr>
                    <th scope="col" className="desk-week-day ps-5 text-start">روتین</th>
                    {days.map(day => (
                      <th key={day} scope="col" className="desk-week-day" data-today={day === today || undefined}>
                        <span className="block text-[0.6875rem] font-bold">{day === today ? 'امروز' : weekday.format(parseIsoDate(day))}</span>
                        <span className="text-lg font-extrabold">{dayNumber.format(parseIsoDate(day))}</span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {active.map(routine => (
                    <tr key={routine.id} data-selected={routine.id === selectedId || undefined}>
                      <th scope="row" className="desk-week-name entity-routine">
                        <div className="flex items-start gap-2.5">
                          <span className="entity-icon size-9 rounded-xl" aria-hidden="true"><Repeat size={18} /></span>
                          <div className="min-w-0">
                            <h3 className="text-sm font-extrabold">
                              <Link className="hover:underline" to="/routines/$routineId" params={{ routineId: routine.id }}
                                aria-current={routine.id === selectedId ? 'page' : undefined}>
                                {routine.title}
                              </Link>
                            </h3>
                            <p className="text-xs font-normal text-text-secondary">
                              {recurrenceLabel(routine.recurrence)}، {routine.timesOfDay.length > 0 ? slotsLabel(routine.timesOfDay) : 'بدون ساعت'}
                            </p>
                            <TaskParent task={routine} parentTitle={parentTitle(routine)} />
                          </div>
                        </div>
                      </th>
                      {days.map(day => (
                        <td key={day} className="desk-week-cell" data-today={day === today || undefined}>
                          <DayCell
                            routine={routine}
                            week={weekOf(routine)}
                            day={day}
                            today={today}
                            slots={day === today ? occurrences.filter(slot => slot.routineId === routine.id) : []}
                            busyId={busyId}
                            onSlot={onSlot}
                          />
                        </td>
                      ))}
                    </tr>
                  ))}
                  {stopped.map(routine => (
                    <tr key={routine.id} data-stopped data-selected={routine.id === selectedId || undefined}>
                      <th scope="row" className="desk-week-name">
                        <Link className="font-extrabold text-text-secondary hover:underline" to="/routines/$routineId" params={{ routineId: routine.id }}>
                          {routine.title}
                        </Link>
                        <p className="text-xs font-normal text-text-tertiary">
                          متوقف{routine.stoppedAt ? ` از ${formatDayMonth(routine.stoppedAt.slice(0, 10))}` : ''}
                        </p>
                      </th>
                      <td colSpan={days.length} className="desk-week-cell">
                        <p className="desk-week-stopped">این هفته نوبتی ندارد · ادامه دادن از صفحه‌ی روتین</p>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <ul className="desk-week-legend" aria-label="راهنمای جدول">
              <li><span className="desk-slot" data-state="done" aria-hidden="true" />انجام شد</li>
              <li><span className="desk-slot" data-state="pending" aria-hidden="true" />امروز، مانده</li>
              <li><span className="desk-slot" data-state="missed" aria-hidden="true" />جا ماند</li>
              <li><span className="desk-slot" data-state="ahead" aria-hidden="true" />پیش رو</li>
              <li><span className="desk-slot" data-state="count" aria-hidden="true" />روزهای گذشته: انجام‌شده از برنامه</li>
            </ul>
          </ResourceState>
        </section>
      </div>

      <aside className="desk-card desk-detail" aria-label="جزئیات روتین">
        {selectedId
          ? <RoutineDetailView key={selectedId} routineId={selectedId} panel />
          : <EmptyState icon={Repeat} title="روتینی انتخاب نشده است." description="روی یک روتین بزنید تا ریتم و سابقه‌اش همین‌جا باز شود." />}
      </aside>
    </div>
  )
}

/** One day of one Routine: today's slots in place, the count for days gone, the slots still ahead. */
function DayCell({ routine, week, day, today, slots, busyId, onSlot }: {
  routine: RoutineDto
  week: RoutineWeekDto | undefined
  day: string
  today: string
  slots: RoutineOccurrenceDto[]
  busyId?: string
  onSlot: (slot: RoutineOccurrenceDto) => void
}) {
  const counts = week?.days.find(item => item.localDate === day)
  const scheduled = Number(counts?.scheduled ?? 0)
  const done = Number(counts?.done ?? 0)
  if (day === today) {
    if (slots.length === 0) return <span className="desk-cell-empty"><span aria-hidden="true">·</span><span className="sr-only">بدون نوبت</span></span>
    return (
      <div className="flex flex-col gap-1">
        {slots.map(slot => {
          const time = slot.scheduledLocalTime ? formatTime(slot.scheduledLocalTime) : 'امروز'
          const state = slot.status === 'DONE' ? 'done' : slot.status === 'MISSED' ? 'missed' : 'pending'
          return (
            <button
              key={slot.id}
              className="desk-slot"
              type="button"
              data-state={state}
              disabled={slot.status === 'DONE' || busyId === slot.id}
              aria-label={slot.status === 'PENDING' ? `انجام نوبت ${time} ${routine.title}`
                : slot.status === 'MISSED' ? `اصلاح به انجام‌شده: نوبت ${time} ${routine.title}` : `انجام‌شده: نوبت ${time} ${routine.title}`}
              onClick={() => onSlot(slot)}
            >
              {busyId === slot.id ? <LoaderCircle size={12} className="animate-spin" aria-hidden="true" />
                : slot.status === 'DONE' ? <Check size={12} aria-hidden="true" />
                  : slot.status === 'MISSED' ? <CircleSlash size={12} aria-hidden="true" /> : null}
              <bdi dir="ltr">{time}</bdi>
            </button>
          )
        })}
      </div>
    )
  }
  if (scheduled === 0) return <span className="desk-cell-empty"><span aria-hidden="true">·</span><span className="sr-only">بدون نوبت</span></span>
  if (day > today) {
    return (
      <div className="flex flex-col gap-1">
        {(routine.timesOfDay.length > 0 ? routine.timesOfDay : ['']).map(time => (
          <span key={time || 'any'} className="desk-slot" data-state="ahead">
            <bdi dir="ltr">{time ? formatTime(time) : 'پیش رو'}</bdi>
          </span>
        ))}
      </div>
    )
  }
  return (
    <span className="desk-slot" data-state={done >= scheduled ? 'done' : 'count'}>
      {formatNumber(done)} از {formatNumber(scheduled)}
    </span>
  )
}
