import { showToast } from '../../../shared/lib/ui-store'
import { Sheet } from '../../../shared/ui/Sheet'
import { useGoalOptions } from '../../goals/hooks/goal-hooks'
import { useProjectOptions } from '../../projects/hooks/project-hooks'
import { useCreateRoutine } from '../hooks/routine-hooks'
import type { CreateRoutineRequest } from '../types/routine.types'
import { RoutineForm } from './RoutineForm'

/** The create-Routine flow, opened from anywhere through the shell's create menu. */
export function RoutineCreateSheet({ onClose }: { onClose: () => void }) {
  const goals = useGoalOptions()
  const projects = useProjectOptions()
  const create = useCreateRoutine()
  return (
    <Sheet
      title="روتین جدید"
      description="کاری که تکرار می‌شود. در روزهای خودش در «امروز» دیده می‌شود."
      onClose={onClose}
      locked={create.isPending}
    >
      <RoutineForm
        goals={goals.data?.items ?? []}
        projects={projects.data?.items ?? []}
        pending={create.isPending}
        error={create.error}
        onCancel={onClose}
        onSubmit={request => create.mutate(request as CreateRoutineRequest, {
          onSuccess: () => {
            onClose()
            showToast('روتین ساخته شد.')
          },
        })}
      />
    </Sheet>
  )
}
