import type { LucideIcon } from 'lucide-react'
import { useId } from 'react'

const tones = {
  neutral: 'border-border-subtle hover:border-accent hover:bg-accent-tint',
  positive: 'border-positive/30 hover:border-positive hover:bg-positive-tint',
  attention: 'border-attention/30 hover:border-attention hover:bg-attention-tint',
} as const

const iconTones = {
  neutral: 'bg-surface-sunken text-text-secondary',
  positive: 'bg-positive-tint text-positive',
  attention: 'bg-attention-tint text-attention',
} as const

/**
 * A large, self-explaining action: icon, a short label and one line saying
 * what will happen. The label alone is the accessible name; the explanation
 * is attached as the description.
 */
export function ActionTile({ icon: Icon, label, description, tone = 'neutral', disabled, onClick }: {
  icon: LucideIcon
  label: string
  description: string
  tone?: keyof typeof tones
  disabled?: boolean
  onClick: () => void
}) {
  const descriptionId = useId()
  return (
    <button
      className={`flex min-h-16 w-full items-center gap-3 rounded-2xl border bg-surface p-4 text-start shadow-sm transition duration-200 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50 ${tones[tone]}`}
      type="button"
      aria-label={label}
      aria-describedby={descriptionId}
      disabled={disabled}
      onClick={onClick}
    >
      <span className={`flex size-10 shrink-0 items-center justify-center rounded-xl ${iconTones[tone]}`} aria-hidden="true">
        <Icon size={20} />
      </span>
      <span className="min-w-0">
        <span className="block font-bold">{label}</span>
        <span className="block text-xs leading-5 text-text-secondary" id={descriptionId}>{description}</span>
      </span>
    </button>
  )
}
