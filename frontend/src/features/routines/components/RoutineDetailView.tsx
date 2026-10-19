import { Link, useNavigate } from '@tanstack/react-router'
import { CalendarDays, CalendarOff, Check, Link2, LoaderCircle, Pause, Pencil, Play, RefreshCw } from '../../../shared/ui/icons'
import { useState } from 'react'
import { toApiError } from '../../../shared/api/http'
import { formatLocalDate, formatNumber, formatTime } from '../../../shared/lib/date'
import { showToast } from '../../../shared/lib/ui-store'
import { ConfirmationDialog } from '../../../shared/ui/ConfirmationDialog'
import { FactRow } from '../../../shared/ui/FactRow'
import { EntityLabel, StatusBadge } from '../../../shared/ui/EntityUi'
import { FormError } from '../../../shared/ui/FormUi'
import { BackLink } from '../../../shared/ui/PageHeader'
import { Sheet } from '../../../shared/ui/Sheet'
import { ErrorState, LoadingState } from '../../../shared/ui/StateUi'
import { useGoalOptions } from '../../goals/hooks/goal-hooks'
import { useProjectOptions } from '../../projects/hooks/project-hooks'
import { useTaskParentTitle } from '../../tasks/hooks/task-hooks'
import { useToday } from '../../today/hooks/today-hooks'
import {
  useCompleteOccurrence, useContinueRoutine, useCorrectOccurrence, useRoutine, useRoutineMonth, useStopRoutine, useUndoOccurrenceDone, useUpdateRoutine,
} from '../hooks/routine-hooks'
import { recurrenceLabel, slotsLabel, undoneOccurrenceMessage } from '../types/routine.format'
import type { CreateRoutineRequest, RoutineDto, RoutineOccurrenceDto, UpdateRoutineRequest } from '../types/routine.types'
import { RoutineForm } from './RoutineForm'
import { RoutineMonth } from './RoutineMonth'
import { RoutineOccurrenceHistory } from './RoutineOccurrenceHistory'

/**
 * Routine detail page: its schedule, today's slots (completed here too), the
 * last four weeks, its facts and its history. Editing is the pencil at the
 * top; stopping (or resuming as a continuation) is at the foot.
 */
export function RoutineDetailView({ routineId, panel = false }: { routineId: string; panel?: boolean }) {
  const root = panel ? 'desk-detail-body' : 'page'
  const routine = useRoutine(routineId)
  const goals = useGoalOptions()
  const projects = useProjectOptions()
  const update = useUpdateRoutine(routineId)
  const stop = useStopRoutine(routineId)
  const resume = useContinueRoutine(routineId)
  const month = useRoutineMonth(routineId)
  const todayView = useToday()
  const parentTitle = useTaskParentTitle()
  const navigate = useNavigate()
  const [editing, setEditing] = useState(false)
  const [resuming, setResuming] = useState(false)
  const [confirmStop, setConfirmStop] = useState(false)

  if (routine.isPending) {
    return <div className={root}><BackLink to="/routines" /><LoadingState text="در حال دریافت روتین…" /></div>
  }
  if (routine.isError) {
    const notFound = toApiError(routine.error).status === 404
    return (
      <div className={root}>
        <BackLink to="/routines" />
        <ErrorState
          title={notFound ? 'روتین پیدا نشد.' : 'دریافت روتین ممکن نشد.'}
          description={notFound ? 'این روتین وجود ندارد یا در دسترس شما نیست.' : 'ارتباط را بررسی کنید و دوباره تلاش کنید.'}
          onRetry={notFound ? undefined : () => routine.refetch()}
        />
      </div>
    )
  }

  const data = routine.data
  const version = Number(data.version)
  const active = data.status === 'ACTIVE'
  const slots = (todayView.data?.routineOccurrences ?? []).filter(occurrence => occurrence.routineId === data.id)
  const weeks = month.data?.routines[0]
  return (
    <div className={root}>
      <BackLink
        to="/routines"
        actions={active && (
          <button className="account-button" type="button" aria-label="ویرایش روتین" onClick={() => setEditing(true)}>
            <Pencil size={20} aria-hidden="true" />
          </button>
        )}
      />

      <header className="entity-routine">
        <div className="flex flex-wrap items-center gap-2">
          <EntityLabel entity="routine" />
          <StatusBadge status={data.status} />
        </div>
        <h1 className="page-title mt-3 wrap-break-word">{data.title}</h1>
        <p className="mt-1 flex items-center gap-1.5 text-sm font-semibold text-text-secondary">
          <RefreshCw size={16} aria-hidden="true" />
          {recurrenceLabel(data.recurrence)}، {data.timesOfDay.length > 0 ? `ساعت ${slotsLabel(data.timesOfDay)}` : 'بدون ساعت مشخص'}
        </p>
        {data.description && <p className="mt-3 whitespace-pre-wrap leading-8 text-text-secondary">{data.description}</p>}
      </header>

      {slots.length > 0 && (
        <section className="card entity-routine mt-6 p-4 sm:p-5" aria-labelledby="routine-today">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-extrabold" id="routine-today">نوبت‌های امروز</h2>
            <span className="entity-ink text-xs font-bold">
              {formatNumber(slots.filter(slot => slot.status === 'DONE').length)} از {formatNumber(slots.length)}
            </span>
          </div>
          <ul className="mt-3 grid grid-cols-2 gap-2.5">
            {slots.map(slot => <TodaySlot key={slot.id} slot={slot} title={data.title} next={slot === slots.find(item => item.status === 'PENDING')} />)}
          </ul>
        </section>
      )}

      {weeks && (
        <section className="card mt-5 p-4 sm:p-5" aria-labelledby="routine-month">
          <h2 className="mb-3 font-extrabold" id="routine-month">۴ هفته‌ی اخیر</h2>
          <RoutineMonth weeks={weeks} today={month.data?.today ?? ''} />
        </section>
      )}

      <dl className="fact-list mt-5">
        <FactRow icon={Link2} label="برای" value={<OwnerValue routine={data} title={parentTitle(data)} />} />
        <FactRow icon={CalendarDays} label="شروع از" value={formatLocalDate(data.effectiveFromLocalDate)} dateTime={data.effectiveFromLocalDate} />
        {data.effectiveUntilLocalDate && (
          <FactRow icon={CalendarOff} label="آخرین روز" value={formatLocalDate(data.effectiveUntilLocalDate)} dateTime={data.effectiveUntilLocalDate} />
        )}
      </dl>
      {(data.continuationOfRoutineId || data.continuedByRoutineId) && (
        <div className="notice mt-4 space-y-1">
          {data.continuationOfRoutineId && (
            <p>
              این روتین ادامه یک روتین متوقف‌شده است.{' '}
              <Link className="text-link" to="/routines/$routineId" params={{ routineId: data.continuationOfRoutineId }}>مشاهده روتین قبلی</Link>
            </p>
          )}
          {data.continuedByRoutineId && (
            <p>
              این روتین با یک روتین تازه ادامه پیدا کرده است.{' '}
              <Link className="text-link" to="/routines/$routineId" params={{ routineId: data.continuedByRoutineId }}>مشاهده روتین ادامه</Link>
            </p>
          )}
        </div>
      )}

      <RoutineOccurrenceHistory routineId={routineId} today={month.data?.today} />

      <div className="mt-4">
        <FormError error={stop.error} />
      </div>
      {active ? (
        <div className="mt-6 flex justify-center">
          <button className="ghost-button text-attention" type="button" disabled={stop.isPending} onClick={() => setConfirmStop(true)}>
            <Pause size={18} aria-hidden="true" />
            توقف روتین
          </button>
        </div>
      ) : !data.continuedByRoutineId && (
        <button className="secondary-button mt-6 min-h-14 w-full rounded-[1.25rem]" type="button" onClick={() => setResuming(true)}>
          <Play size={20} aria-hidden="true" />
          ازسرگیری روتین
        </button>
      )}

      {editing && (
        <Sheet title="ویرایش روتین" onClose={() => setEditing(false)} locked={update.isPending}>
          <RoutineForm
            routine={data}
            goals={goals.data?.items ?? []}
            projects={projects.data?.items ?? []}
            pending={update.isPending}
            error={update.error}
            onCancel={() => setEditing(false)}
            // RoutineForm's onSubmit covers create and edit; passing `routine` guarantees the edit shape.
            onSubmit={request => update.mutate(request as UpdateRoutineRequest, {
              onSuccess: () => {
                setEditing(false)
                showToast('تغییرات روتین ذخیره شد.')
              },
            })}
          />
        </Sheet>
      )}
      {resuming && (
        <Sheet
          title="ازسرگیری روتین"
          description="مشخصات را بازبینی کنید. روتین تازه از تاریخ شروعی که انتخاب می‌کنید اجرا می‌شود."
          onClose={() => setResuming(false)}
          locked={resume.isPending}
        >
          <RoutineForm
            source={data}
            goals={goals.data?.items ?? []}
            projects={projects.data?.items ?? []}
            pending={resume.isPending}
            error={resume.error}
            onCancel={() => setResuming(false)}
            onSubmit={request => resume.mutate(request as CreateRoutineRequest, {
              onSuccess: created => {
                setResuming(false)
                showToast('روتین تازه ساخته شد.')
                void navigate({ to: '/routines/$routineId', params: { routineId: created.id } })
              },
            })}
          />
        </Sheet>
      )}
      {confirmStop && (
        <ConfirmationDialog
          title="توقف روتین"
          description="این روتین از همین حالا متوقف می‌شود و نوبت‌های باز امروزش از «امروز» برداشته می‌شوند. نوبت‌های انجام‌شده و سابقه‌اش باقی می‌ماند و بعداً می‌توانید آن را با یک روتین تازه از سر بگیرید."
          onClose={() => setConfirmStop(false)}
          pending={stop.isPending}
          actions={(
            <>
              <button className="secondary-button" type="button" disabled={stop.isPending} onClick={() => setConfirmStop(false)}>انصراف</button>
              <button
                className="danger-button"
                type="button"
                disabled={stop.isPending}
                onClick={() => stop.mutate(version, {
                  onSuccess: () => {
                    setConfirmStop(false)
                    showToast('روتین متوقف شد.')
                  },
                })}
              >
                {stop.isPending ? 'در حال ثبت…' : 'تأیید توقف'}
              </button>
            </>
          )}
        />
      )}
    </div>
  )
}

/** The Routine's owner, linked, or that it stands alone. */
function OwnerValue({ routine, title }: { routine: RoutineDto; title?: string }) {
  if (routine.projectId) {
    return <Link className="text-link" to="/projects/$projectId" params={{ projectId: routine.projectId }}>{title ?? 'مشاهده پروژه'}</Link>
  }
  if (routine.goalId) {
    return <Link className="text-link" to="/goals/$goalId" params={{ goalId: routine.goalId }}>{title ?? 'مشاهده هدف'}</Link>
  }
  return 'مستقل'
}

/** One of today's slots: open and completed with one press, done and undone with another, or missed (correctable). */
function TodaySlot({ slot, title, next }: { slot: RoutineOccurrenceDto; title: string; next: boolean }) {
  const complete = useCompleteOccurrence()
  const undo = useUndoOccurrenceDone()
  const correct = useCorrectOccurrence()
  const time = slot.scheduledLocalTime ? formatTime(slot.scheduledLocalTime) : 'امروز'
  const face = (mark: React.ReactNode, words: string) => (
    <>
      {mark}
      <span className="min-w-0">
        <bdi className="block font-extrabold" dir={slot.scheduledLocalTime ? 'ltr' : undefined}>{time}</bdi>
        <span className="block text-xs font-semibold text-text-secondary">{words}</span>
      </span>
    </>
  )
  if (slot.status === 'PENDING') {
    return (
      <li>
        <button
          className="slot-tile w-full"
          type="button"
          aria-label={`انجام شد: ${title}، ${time}`}
          disabled={complete.isPending}
          onClick={() => complete.mutate(
            { occurrenceId: slot.id, expectedVersion: Number(slot.version) },
            { onSuccess: () => showToast('نوبت روتین انجام شد.') },
          )}
        >
          {face(
            complete.isPending
              ? <LoaderCircle size={28} className="animate-spin text-entity-routine" aria-hidden="true" />
              : <span className="size-7 shrink-0 rounded-full border-2 border-entity-routine" aria-hidden="true" />,
            next ? 'بعدی' : 'در پیش',
          )}
        </button>
      </li>
    )
  }
  if (slot.status === 'DONE') {
    return (
      <li>
        <button
          className="slot-tile w-full"
          type="button"
          data-status="DONE"
          aria-label={`لغو انجام: ${title}، ${time}`}
          disabled={undo.isPending}
          onClick={() => undo.mutate(
            { occurrenceId: slot.id, expectedVersion: Number(slot.version) },
            { onSuccess: result => showToast(undoneOccurrenceMessage(result.status)) },
          )}
        >
          {face(
            undo.isPending
              ? <LoaderCircle size={28} className="animate-spin text-entity-routine" aria-hidden="true" />
              : <span className="slot-done size-7" aria-hidden="true"><Check size={16} /></span>,
            'انجام شد',
          )}
        </button>
      </li>
    )
  }
  return (
    <li className="slot-tile" data-status={slot.status}>
      {face(<span className="slot-missed size-7" aria-hidden="true" />, 'انجام نشد')}
      {slot.status === 'MISSED' && (
        <button
          className="text-link relative ms-auto text-xs"
          type="button"
          disabled={correct.isPending}
          onClick={() => correct.mutate(
            { occurrenceId: slot.id, expectedVersion: Number(slot.version), targetStatus: 'DONE' },
            { onSuccess: () => showToast('سابقه اصلاح شد.') },
          )}
        >
          انجامش دادم
        </button>
      )}
    </li>
  )
}
