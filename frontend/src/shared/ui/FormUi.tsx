import { ChevronDown, SlidersHorizontal } from './icons'
import { type ReactNode, useId, useState } from 'react'
import type { UseFormRegisterReturn } from 'react-hook-form'
import { toApiError } from '../api/http'

const optionalSuffix = ' (اختیاری)'

/** Label text with its "(اختیاری)" ending set quieter. The words stay in the label, so its accessible name is unchanged. */
export function LabelText({ children }: { children: string }) {
  if (!children.endsWith(optionalSuffix)) return children
  return (
    <>
      {children.slice(0, -optionalSuffix.length)}
      <span className="field-optional">{optionalSuffix}</span>
    </>
  )
}

/** Labelled text input or textarea wired to React Hook Form, with hint and error announced to assistive tech. */
export function FormField({ label, name, required, multiline, type = 'text', maxLength, placeholder, autoFocus, prominent, registration, error, hint }: {
  label: string
  name: string
  required?: boolean
  multiline?: boolean
  type?: string
  maxLength?: number
  placeholder?: string
  /** The field a sheet or dialog starts in when it opens. */
  autoFocus?: boolean
  /** The title of a create/edit form: a display-type label over an underlined line. */
  prominent?: boolean
  registration?: UseFormRegisterReturn
  error?: string
  hint?: string
}) {
  const id = useId()
  const hintId = hint ? `${id}-hint` : undefined
  const errorId = error ? `${id}-error` : undefined
  const shared = {
    id,
    name,
    required,
    maxLength,
    placeholder,
    'data-autofocus': autoFocus ? true : undefined,
    'aria-invalid': error ? true : undefined,
    'aria-describedby': [hintId, errorId].filter(Boolean).join(' ') || undefined,
    ...registration,
  }

  return (
    <div>
      <label className={prominent ? 'title-label' : 'field-label'} htmlFor={id}><LabelText>{label}</LabelText></label>
      {multiline
        ? <textarea {...shared} className="field-input" />
        : <input {...shared} className={prominent ? 'title-input' : 'field-input'} type={type} />}
      {error && <span className="field-error" id={errorId} role="alert">{error}</span>}
      {hint && <span className="field-hint" id={hintId}>{hint}</span>}
    </div>
  )
}

/** A few mutually exclusive choices shown side by side, so picking one is a single press. */
export function ChoiceField<T extends string>({ label, value, options, onChange, error }: {
  label: string
  value: T | ''
  options: ReadonlyArray<{ value: T; label: string }>
  onChange: (value: T) => void
  error?: string
}) {
  const id = useId()
  return (
    <div>
      <span className="field-label" id={id}>{label}</span>
      <div className="mt-2 flex flex-wrap gap-2" role="radiogroup" aria-labelledby={id} aria-invalid={error ? true : undefined}>
        {options.map(option => (
          // biome-ignore lint/a11y/useSemanticElements: a button styled as a chip, not a native radio dot.
          <button
            key={option.value}
            className="choice-chip"
            type="button"
            role="radio"
            aria-checked={option.value === value}
            onClick={() => onChange(option.value)}
          >
            {option.label}
          </button>
        ))}
      </div>
      {error && <span className="field-error" role="alert">{error}</span>}
    </div>
  )
}

/** An on/off setting with a one-line explanation, drawn as a switch. */
export function SwitchField({ label, description, registration }: {
  label: string
  description?: string
  registration: UseFormRegisterReturn
}) {
  return (
    <label className="relative flex cursor-pointer items-center gap-3 rounded-xl border border-border-subtle p-3.5 transition-colors duration-200 hover:border-border">
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-bold text-text-primary">{label}</span>
        {description && <span className="block text-xs leading-6 text-text-secondary">{description}</span>}
      </span>
      <input className="sr-only" type="checkbox" {...registration} />
      <span className="switch" aria-hidden="true" />
    </label>
  )
}

/**
 * Keeps a form's optional fields out of the way until they are wanted, so the
 * shortest path to a saved item is the visible one. Hidden fields keep their
 * values; `forceOpen` shows them when one of them has an error.
 */
export function MoreFields({ summary, defaultOpen = false, forceOpen = false, children }: {
  /** What is inside, in a few words. */
  summary: string
  defaultOpen?: boolean
  forceOpen?: boolean
  children: ReactNode
}) {
  const id = useId()
  const [chosen, setChosen] = useState(defaultOpen)
  const open = chosen || forceOpen
  return (
    <>
      <button className="more-toggle" type="button" aria-expanded={open} aria-controls={id} onClick={() => setChosen(!open)}>
        <SlidersHorizontal size={18} className="shrink-0 text-accent" aria-hidden="true" />
        <span className="min-w-0 flex-1">
          <span className="block font-bold text-text-primary">جزئیات بیشتر</span>
          <span className="block truncate text-xs text-text-secondary">{summary}</span>
        </span>
        <ChevronDown size={18} className={`shrink-0 text-text-tertiary transition-transform duration-200 ${open ? 'rotate-180' : ''}`} aria-hidden="true" />
      </button>
      {open && <div className="form-stack animate-fade-in" id={id}>{children}</div>}
    </>
  )
}

/** One summary of every client-side validation message, shown above the fields. */
export function ValidationSummary({ messages }: { messages: Array<string | undefined> }) {
  const visible = [...new Set(messages.filter((message): message is string => Boolean(message)))]
  if (visible.length === 0) return null
  return (
    <div className="notice-attention" role="alert">
      <p className="font-bold">لطفاً موارد زیر را بررسی کنید:</p>
      <ul className="mt-2 list-inside list-disc">
        {visible.map(message => <li key={message}>{message}</li>)}
      </ul>
    </div>
  )
}

/** Explains a failed command in plain language. A stale-version conflict offers a reload, since retrying cannot succeed. */
export function FormError({ error }: { error: unknown }) {
  if (!error) return null
  const api = toApiError(error)
  const stale = api.code === 'CONFLICT_STALE_VERSION'
  const copy = stale
    ? 'این مورد در جای دیگری تغییر کرده است. برای دیدن آخرین وضعیت، صفحه را تازه کنید.'
    : api.code === 'IDEMPOTENCY_MISMATCH'
      ? 'درخواست تکراری با محتوای متفاوت ارسال شد. دوباره تلاش کنید.'
      : 'ارتباط یا ورودی‌ها را بررسی کنید و دوباره تلاش کنید.'
  return (
    <div className="notice-attention" role="alert">
      <p className="font-bold">انجام نشد</p>
      <p className="mt-1">{copy}</p>
      {api.traceId && <p className="mt-1 text-xs text-text-secondary">کد پیگیری: <bdi dir="ltr">{api.traceId}</bdi></p>}
      {stale && (
        <button className="secondary-button mt-3" type="button" onClick={() => window.location.reload()}>تازه‌سازی صفحه</button>
      )}
    </div>
  )
}
