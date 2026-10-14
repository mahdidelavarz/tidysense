import { useNavigate } from '@tanstack/react-router'
import { ChevronLeft, Sparkles } from '../../../shared/ui/icons'
import { type CreateTarget, useUiStore } from '../../../shared/lib/ui-store'
import { type EntityKind, EntityIcon } from '../../../shared/ui/EntityUi'
import { Sheet } from '../../../shared/ui/Sheet'
import { GoalCreateSheet } from '../../goals/components/GoalCreateSheet'
import { ProjectCreateSheet } from '../../projects/components/ProjectCreateSheet'
import { RoutineCreateSheet } from '../../routines/components/RoutineCreateSheet'
import { TaskCreateSheet } from '../../tasks/components/TaskCreateSheet'

const choices: Array<{ target: Exclude<CreateTarget, 'menu'>; entity: EntityKind; label: string; description: string; example: string }> = [
  { target: 'task', entity: 'task', label: 'کار', description: 'یک اقدام روشن که می‌توان انجامش داد.', example: 'ارسال فاکتور مهر' },
  { target: 'routine', entity: 'routine', label: 'روتین', description: 'کاری که در روزها یا ساعت‌های مشخص تکرار می‌شود.', example: 'پیاده‌روی، هر روز ساعت ۱۸' },
  { target: 'project', entity: 'project', label: 'پروژه', description: 'یک تلاش محدود با پایان مشخص.', example: 'بازطراحی محصول' },
  { target: 'goal', entity: 'goal', label: 'هدف', description: 'نتیجه یا جهتی که برایتان مهم است.', example: 'آلمانی را تا B1 برسانم' },
]

/**
 * The one create flow for the whole app. The floating create button, page
 * headers and empty states all open it through the UI store, so creating
 * something looks and behaves the same from everywhere. The chooser ends with
 * the way into Planning, for someone who does not yet know what to create.
 */
export function CreateSheet() {
  const target = useUiStore(state => state.createTarget)
  const openCreate = useUiStore(state => state.openCreate)
  const close = useUiStore(state => state.closeCreate)
  const navigate = useNavigate()

  if (target === 'task') return <TaskCreateSheet onClose={close} />
  if (target === 'routine') return <RoutineCreateSheet onClose={close} />
  if (target === 'project') return <ProjectCreateSheet onClose={close} />
  if (target === 'goal') return <GoalCreateSheet onClose={close} />
  if (target !== 'menu') return null

  return (
    <Sheet title="چه چیزی اضافه می‌کنید؟" description="هر کدام فرم کوتاه خودش را دارد." onClose={close}>
      <ul className="space-y-3">
        {choices.map(choice => (
          <li key={choice.target}>
            <button
              className={`entity-${choice.entity} create-choice`}
              type="button"
              onClick={() => openCreate(choice.target)}
            >
              <EntityIcon entity={choice.entity} />
              <span className="min-w-0 flex-1">
                <span className="block text-base font-bold">{choice.label}</span>
                <span className="block text-sm font-normal leading-6 text-text-secondary">{choice.description}</span>
                <span className="entity-ink block text-xs font-semibold leading-5">مثلاً: {choice.example}</span>
              </span>
              <ChevronLeft size={18} className="shrink-0 text-text-tertiary" aria-hidden="true" />
            </button>
          </li>
        ))}
        <li>
          <button
            className="create-choice create-choice-ai"
            type="button"
            onClick={() => {
              close()
              void navigate({ to: '/planning' })
            }}
          >
            <span className="flex size-10 shrink-0 items-center justify-center rounded-[0.8125rem] bg-accent text-on-accent" aria-hidden="true">
              <Sparkles size={22} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-base font-bold">نمی‌دانید از کجا شروع کنید؟</span>
              <span className="block text-sm font-normal leading-6 text-text-secondary">بگویید چه در ذهنتان است تا با هم بچینیمش.</span>
            </span>
            <ChevronLeft size={18} className="shrink-0 text-text-tertiary" aria-hidden="true" />
          </button>
        </li>
      </ul>
    </Sheet>
  )
}
