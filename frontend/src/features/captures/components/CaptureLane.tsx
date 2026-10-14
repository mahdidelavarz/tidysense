import { ListChecks, Repeat, StickyNote, Trash2 } from '../../../shared/ui/icons'
import { useState } from 'react'
import { formatNumber } from '../../../shared/lib/date'
import { LaneHeading } from '../../reconcile/components/ExecutionLane'
import { showToast } from '../../../shared/lib/ui-store'
import { ConfirmationDialog } from '../../../shared/ui/ConfirmationDialog'
import { FormError } from '../../../shared/ui/FormUi'
import { Sheet } from '../../../shared/ui/Sheet'
import { useGoalOptions } from '../../goals/hooks/goal-hooks'
import { useProjectOptions } from '../../projects/hooks/project-hooks'
import { RoutineForm } from '../../routines/components/RoutineForm'
import type { CreateRoutineRequest } from '../../routines/types/routine.types'
import { useDiscardCapture, useResolveCaptureToRoutine } from '../hooks/capture-hooks'
import type { CaptureDto } from '../types/capture.types'
import { CaptureTaskSheet } from './CaptureTaskSheet'

type Open = { kind: 'task' | 'routine' | 'discard'; capture: CaptureDto }

/**
 * Capture lane of Reconcile: quick captures that still need a decision. A
 * capture is not late work; it only waits to become a Task or Routine, or to
 * be discarded.
 */
export function CaptureLane({ captures, total }: {
  captures: CaptureDto[]
  /** Every unresolved capture; the list itself is a limited chunk. */
  total: number
}) {
  const [open, setOpen] = useState<Open | null>(null)
  const discard = useDiscardCapture()
  const close = () => setOpen(null)

  return (
    <section aria-labelledby="reconcile-captures">
      <LaneHeading
        id="reconcile-captures"
        icon={StickyNote}
        count={total}
        hint={`ثبت شده‌اند ولی هنوز کار یا روتین نیستند.${total > captures.length ? ` ${formatNumber(captures.length)} مورد از ${formatNumber(total)} مورد نمایش داده شده است.` : ''}`}
      >
        یادداشت‌های سریع
      </LaneHeading>
      <ul className="mt-4 space-y-4">
        {captures.map(capture => (
          <li key={capture.id}>
            <article className="decision-card capture-card" aria-label={capture.title}>
              <h3 className="decision-title px-4 pt-3.5">{capture.title}</h3>
              <div className="decision-bar mt-3">
                <button className="decision-button entity-task capture-choice" type="button" aria-label={`تبدیل به کار: ${capture.title}`} onClick={() => setOpen({ kind: 'task', capture })}>
                  <ListChecks size={19} aria-hidden="true" />
                  کار کن
                </button>
                <button className="decision-button entity-routine capture-choice" type="button" aria-label={`تبدیل به روتین: ${capture.title}`} onClick={() => setOpen({ kind: 'routine', capture })}>
                  <Repeat size={19} aria-hidden="true" />
                  روتین کن
                </button>
                <button className="decision-button" data-tone="danger" type="button" aria-label={`دور انداختن: ${capture.title}`} onClick={() => setOpen({ kind: 'discard', capture })}>
                  <Trash2 size={19} aria-hidden="true" />
                  دور بینداز
                </button>
              </div>
            </article>
          </li>
        ))}
      </ul>

      {open?.kind === 'task' && <CaptureTaskSheet capture={open.capture} onClose={close} />}
      {open?.kind === 'routine' && <CaptureRoutineSheet capture={open.capture} onClose={close} />}
      {open?.kind === 'discard' && (
        <ConfirmationDialog
          title="دور انداختن یادداشت"
          description={`«${open.capture.title}» حذف می‌شود و به کار تبدیل نخواهد شد.`}
          onClose={close}
          pending={discard.isPending}
          actions={(
            <>
              <button className="secondary-button" type="button" disabled={discard.isPending} onClick={close}>انصراف</button>
              <button
                className="danger-button"
                type="button"
                disabled={discard.isPending}
                onClick={() => discard.mutate({ id: open.capture.id, expectedVersion: Number(open.capture.version) }, {
                  onSuccess: () => {
                    close()
                    showToast('یادداشت دور انداخته شد.')
                  },
                })}
              >
                {discard.isPending ? 'در حال ثبت…' : 'تأیید دور انداختن'}
              </button>
            </>
          )}
        >
          <FormError error={discard.error} />
        </ConfirmationDialog>
      )}
    </section>
  )
}

/** Turns a capture into a Routine using the same form as any other new Routine. */
function CaptureRoutineSheet({ capture, onClose }: { capture: CaptureDto; onClose: () => void }) {
  const goals = useGoalOptions()
  const projects = useProjectOptions()
  const resolve = useResolveCaptureToRoutine()
  return (
    <Sheet title="تبدیل به روتین" description="یادداشت به یک روتین تکرارشونده تبدیل می‌شود." onClose={onClose} locked={resolve.isPending}>
      <RoutineForm
        initialTitle={capture.title}
        goals={goals.data?.items ?? []}
        projects={projects.data?.items ?? []}
        pending={resolve.isPending}
        error={resolve.error}
        onCancel={onClose}
        // RoutineForm's onSubmit covers create and edit; without `routine` it always emits the create shape.
        onSubmit={request => resolve.mutate({
          id: capture.id,
          request: { ...(request as CreateRoutineRequest), expectedVersion: capture.version },
        }, {
          onSuccess: () => {
            onClose()
            showToast('یادداشت به روتین تبدیل شد.')
          },
        })}
      />
    </Sheet>
  )
}
