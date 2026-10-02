import { Link, useNavigate } from '@tanstack/react-router'
import { CalendarDays, CalendarOff, Clock, Link2, Pencil, Play, Repeat, Square } from 'lucide-react'
import { useState } from 'react'
import { toApiError } from '../../../shared/api/http'
import { formatLocalDate } from '../../../shared/lib/date'
import { showToast } from '../../../shared/lib/ui-store'
import { ActionTile } from '../../../shared/ui/ActionTile'
import { ConfirmationDialog } from '../../../shared/ui/ConfirmationDialog'
import { DetailTerm } from '../../../shared/ui/DetailTerm'
import { EntityLabel, StatusBadge } from '../../../shared/ui/EntityUi'
import { FormError } from '../../../shared/ui/FormUi'
import { BackLink } from '../../../shared/ui/PageHeader'
import { Sheet } from '../../../shared/ui/Sheet'
import { ErrorState, LoadingState } from '../../../shared/ui/StateUi'
import { useGoalOptions } from '../../goals/hooks/goal-hooks'
import { useProjectOptions } from '../../projects/hooks/project-hooks'
import { useContinueRoutine, useRoutine, useStopRoutine, useUpdateRoutine } from '../hooks/routine-hooks'
import { recurrenceLabel, slotsLabel } from '../types/routine.format'
import type { CreateRoutineRequest, RoutineDto, UpdateRoutineRequest } from '../types/routine.types'
import { RoutineForm } from './RoutineForm'
import { RoutineOccurrenceHistory } from './RoutineOccurrenceHistory'

/** Routine detail page: read, edit, stop, resume as a continuation, and the occurrence history. */
export function RoutineDetailView({ routineId }: { routineId: string }) {
  const routine = useRoutine(routineId)
  const goals = useGoalOptions()
  const projects = useProjectOptions()
  const update = useUpdateRoutine(routineId)
  const stop = useStopRoutine(routineId)
  const resume = useContinueRoutine(routineId)
  const navigate = useNavigate()
  const [editing, setEditing] = useState(false)
  const [resuming, setResuming] = useState(false)
  const [confirmStop, setConfirmStop] = useState(false)

  if (routine.isPending) {
    return <div className="page"><BackLink to="/routines" /><LoadingState text="در حال دریافت روتین…" /></div>
  }
  if (routine.isError) {
    const notFound = toApiError(routine.error).status === 404
    return (
      <div className="page">
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
  return (
    <div className="page">
      <BackLink to="/routines" />

      <article>
        <div className="flex flex-wrap items-center gap-2">
          <EntityLabel entity="routine" />
          <StatusBadge status={data.status} />
        </div>
        <h1 className="page-title mt-3 wrap-break-word">{data.title}</h1>
        {data.description
          ? <p className="mt-3 whitespace-pre-wrap leading-8 text-text-secondary">{data.description}</p>
          : <p className="mt-3 text-sm text-text-tertiary">توضیحی برای این روتین ثبت نشده است.</p>}
        <dl className="card mt-6 grid gap-5 sm:grid-cols-2">
          <DetailTerm icon={Link2} label="وابستگی" value={<ParentLink routine={data} />} />
          <DetailTerm icon={Repeat} label="تکرار" value={recurrenceLabel(data.recurrence)} />
          <DetailTerm icon={Clock} label="ساعت‌ها" value={slotsLabel(data.timesOfDay)} />
          <DetailTerm icon={CalendarDays} label="تاریخ شروع" value={formatLocalDate(data.effectiveFromLocalDate)} dateTime={data.effectiveFromLocalDate} />
          {data.effectiveUntilLocalDate && (
            <DetailTerm icon={CalendarOff} label="آخرین روز" value={formatLocalDate(data.effectiveUntilLocalDate)} dateTime={data.effectiveUntilLocalDate} />
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
      </article>

      {(active || !data.continuedByRoutineId) && (
        <section className="mt-8" aria-labelledby="routine-actions">
          <h2 className="section-title" id="routine-actions">چه کاری می‌خواهید انجام دهید؟</h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {active ? (
              <>
                <ActionTile icon={Pencil} label="ویرایش روتین" description="عنوان، وابستگی، تکرار یا ساعت‌ها را تغییر دهید." onClick={() => setEditing(true)} />
                <ActionTile
                  icon={Square}
                  tone="attention"
                  label="توقف روتین"
                  description="از فردا دیگر در «امروز» نمی‌آید؛ سابقه آن حفظ می‌شود."
                  disabled={stop.isPending}
                  onClick={() => setConfirmStop(true)}
                />
              </>
            ) : (
              <ActionTile
                icon={Play}
                label="ازسرگیری روتین"
                description="یک روتین تازه با همین مشخصات ساخته می‌شود؛ این روتین و سابقه‌اش دست‌نخورده می‌ماند."
                onClick={() => setResuming(true)}
              />
            )}
          </div>
        </section>
      )}

      <div className="mt-4">
        <FormError error={stop.error} />
      </div>

      <RoutineOccurrenceHistory routineId={routineId} />

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
          description="این روتین از فردا دیگر اجرا نمی‌شود. نوبت‌های امروز و سابقه آن باقی می‌ماند و بعداً می‌توانید آن را با یک روتین تازه از سر بگیرید."
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

/** Names the Routine's parent and links to it, so the user can move up the hierarchy. */
function ParentLink({ routine }: { routine: RoutineDto }) {
  if (routine.projectId) {
    return <Link className="text-link" to="/projects/$projectId" params={{ projectId: routine.projectId }}>مشاهده پروژه</Link>
  }
  if (routine.goalId) {
    return <Link className="text-link" to="/goals/$goalId" params={{ goalId: routine.goalId }}>مشاهده هدف</Link>
  }
  return 'روتین مستقل'
}
