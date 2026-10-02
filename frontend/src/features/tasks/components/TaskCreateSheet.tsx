import { showToast } from '../../../shared/lib/ui-store'
import { Sheet } from '../../../shared/ui/Sheet'
import { useCreateCapture } from '../../captures/hooks/capture-hooks'
import { useGoalOptions } from '../../goals/hooks/goal-hooks'
import { useProjectOptions } from '../../projects/hooks/project-hooks'
import { useCreateTask, useTaskOptions } from '../hooks/task-hooks'
import type { CreateTaskRequest } from '../types/task.types'
import { TaskForm } from './TaskForm'

/**
 * The create-Task flow, opened from anywhere through the shell's create menu.
 * It is also the quick-capture entry: a title alone is saved as a capture.
 */
export function TaskCreateSheet({ onClose }: { onClose: () => void }) {
  const goals = useGoalOptions()
  const projects = useProjectOptions()
  const tasks = useTaskOptions()
  const create = useCreateTask()
  const capture = useCreateCapture()
  const pending = create.isPending || capture.isPending
  return (
    <Sheet
      title="کار جدید"
      description="کار زیر هدف یا پروژه می‌تواند بدون تاریخ بماند. اگر فقط عنوان بنویسید، به‌صورت یادداشت سریع ذخیره می‌شود."
      onClose={onClose}
      locked={pending}
    >
      <TaskForm
        goals={goals.data?.items ?? []}
        projects={projects.data?.items ?? []}
        tasks={tasks.data?.items ?? []}
        pending={pending}
        error={create.error ?? capture.error}
        onCancel={onClose}
        onSubmit={request => create.mutate(request as CreateTaskRequest, {
          onSuccess: () => {
            onClose()
            showToast('کار ساخته شد.')
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
