import { ChevronLeft } from 'lucide-react'
import { type CreateTarget, useUiStore } from '../../../shared/lib/ui-store'
import { type EntityKind, EntityIcon } from '../../../shared/ui/EntityUi'
import { Sheet } from '../../../shared/ui/Sheet'
import { GoalCreateSheet } from '../../goals/components/GoalCreateSheet'
import { ProjectCreateSheet } from '../../projects/components/ProjectCreateSheet'
import { TaskCreateSheet } from '../../tasks/components/TaskCreateSheet'

const choices: Array<{ target: Exclude<CreateTarget, 'menu'>; entity: EntityKind; label: string; description: string }> = [
  { target: 'task', entity: 'task', label: 'کار', description: 'یک اقدام روشن که می‌توان انجامش داد.' },
  { target: 'project', entity: 'project', label: 'پروژه', description: 'یک تلاش محدود با پایان مشخص.' },
  { target: 'goal', entity: 'goal', label: 'هدف', description: 'نتیجه یا جهتی که برایتان مهم است.' },
]

/**
 * The one create flow for the whole app. The tab bar, the sidebar, page
 * headers and empty states all open it through the UI store, so creating
 * something looks and behaves the same from everywhere.
 */
export function CreateSheet() {
  const target = useUiStore(state => state.createTarget)
  const openCreate = useUiStore(state => state.openCreate)
  const close = useUiStore(state => state.closeCreate)

  if (target === 'task') return <TaskCreateSheet onClose={close} />
  if (target === 'project') return <ProjectCreateSheet onClose={close} />
  if (target === 'goal') return <GoalCreateSheet onClose={close} />
  if (target !== 'menu') return null

  return (
    <Sheet title="چه چیزی اضافه می‌کنید؟" onClose={close}>
      <ul className="space-y-3">
        {choices.map(choice => (
          <li key={choice.target}>
            <button
              className="flex w-full items-center gap-3 rounded-2xl border border-border-subtle p-4 text-start transition duration-200 hover:border-accent hover:bg-accent-tint"
              type="button"
              onClick={() => openCreate(choice.target)}
            >
              <EntityIcon entity={choice.entity} />
              <span className="min-w-0 flex-1">
                <span className="block font-bold">{choice.label}</span>
                <span className="block text-sm text-text-secondary">{choice.description}</span>
              </span>
              <ChevronLeft size={20} className="shrink-0 text-text-tertiary" aria-hidden="true" />
            </button>
          </li>
        ))}
      </ul>
    </Sheet>
  )
}
