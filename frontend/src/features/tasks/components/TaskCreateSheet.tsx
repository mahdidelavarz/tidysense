import { showToast } from '../../../shared/lib/ui-store'
import { Sheet } from '../../../shared/ui/Sheet'
import { useGoalOptions } from '../../goals/hooks/goal-hooks'
import { useProjectOptions } from '../../projects/hooks/project-hooks'
import { useCreateTask, useTaskOptions } from '../hooks/task-hooks'
import type { CreateTaskRequest } from '../types/task.types'
import { TaskForm } from './TaskForm'

/** The create-Task flow, opened from anywhere through the shell's create menu. */
export function TaskCreateSheet({ onClose }: { onClose: () => void }) {
  const goals = useGoalOptions()
  const projects = useProjectOptions()
  const tasks = useTaskOptions()
  const create = useCreateTask()
  return (
    <Sheet
      title="کار جدید"
      description="کار مستقل به تاریخ برنامه‌ریزی نیاز دارد؛ کار زیر هدف یا پروژه می‌تواند بدون تاریخ بماند."
      onClose={onClose}
      locked={create.isPending}
    >
      <TaskForm
        goals={goals.data?.items ?? []}
        projects={projects.data?.items ?? []}
        tasks={tasks.data?.items ?? []}
        pending={create.isPending}
        error={create.error}
        onCancel={onClose}
        onSubmit={request => create.mutate(request as CreateTaskRequest, {
          onSuccess: () => {
            onClose()
            showToast('کار ساخته شد.')
          },
        })}
      />
    </Sheet>
  )
}
