import { toIsoDate } from '../../../shared/lib/date'
import { showToast, useUiStore } from '../../../shared/lib/ui-store'
import { Sheet } from '../../../shared/ui/Sheet'
import { useCreateCapture } from '../../captures/hooks/capture-hooks'
import { useGoalOptions } from '../../goals/hooks/goal-hooks'
import { useProjectOptions } from '../../projects/hooks/project-hooks'
import { useToday } from '../../today/hooks/today-hooks'
import { useCreateTask, useFollowTask, useTaskOptions } from '../hooks/task-hooks'
import type { CreateTaskRequest } from '../types/task.types'
import { TaskForm } from './TaskForm'

/**
 * The create-Task flow, opened from anywhere through the shell's create menu.
 * A title alone is a Task for today; with no date and no owner it is saved as
 * a quick capture instead.
 */
export function TaskCreateSheet({ onClose }: { onClose: () => void }) {
  const goals = useGoalOptions()
  const projects = useProjectOptions()
  const tasks = useTaskOptions()
  const create = useCreateTask()
  const follow = useFollowTask()
  const capture = useCreateCapture()
  const pending = create.isPending || follow.isPending || capture.isPending
  const parent = useUiStore(state => state.createParent)
  // The server's local date when it is known; the browser's until then (the pilot runs in one time zone).
  const today = useToday().data?.localDate ?? toIsoDate(new Date())
  return (
    <Sheet title="کار جدید" entity="task" onClose={onClose}
      locked={pending}
    >
      <TaskForm
        today={today}
        parentScope={parent ?? undefined}
        goals={goals.data?.items ?? []}
        projects={projects.data?.items ?? []}
        tasks={tasks.data?.items ?? []}
        pending={pending}
        error={create.error ?? capture.error}
        onCancel={onClose}
        onSubmit={(request, followAfter) => create.mutate(request as CreateTaskRequest, {
          onSuccess: async created => {
            // The Task exists either way; a refused «بعد از…» is said, not retried, so nothing is made twice.
            const linked = followAfter
              ? await follow.mutateAsync({ taskId: created.id, predecessorId: followAfter }).then(() => true, () => false)
              : true
            onClose()
            showToast(linked ? 'کار ساخته شد.' : 'کار ساخته شد، اما ترتیبش ثبت نشد؛ از صفحه‌ی کار «بعد از…» را بزنید.')
          },
        })}
        onCapture={title => capture.mutate(title, {
          onSuccess: () => {
            onClose()
            showToast('یادداشت ذخیره شد.')
          },
        })}
      />
    </Sheet>
  )
}
