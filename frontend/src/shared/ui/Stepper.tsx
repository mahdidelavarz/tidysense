import { formatNumber } from '../lib/date'
import { Check } from './icons'

/**
 * Where the user is in a fixed sequence of named steps, such as the planning
 * flow (نوشتن، پرسش‌ها، مرور، تأیید). A passed step shows a tick; a step that
 * was skipped still counts as passed, so the path always looks the same.
 */
export function Stepper({ steps, current, label = 'مراحل' }: { steps: readonly string[]; current: number; label?: string }) {
  return (
    <ol className="stepper" aria-label={label}>
      {steps.map((step, index) => {
        const state = index < current ? 'done' : index === current ? 'current' : 'next'
        return (
          <li key={step} className="stepper-step" data-state={state} aria-current={state === 'current' ? 'step' : undefined}>
            <span className="stepper-dot" aria-hidden="true">
              {state === 'done' ? <Check size={13} /> : formatNumber(index + 1)}
            </span>
            <span>
              {step}
              {state === 'done' && <span className="sr-only">، انجام شد</span>}
            </span>
          </li>
        )
      })}
    </ol>
  )
}
