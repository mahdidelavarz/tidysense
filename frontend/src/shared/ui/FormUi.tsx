import { useId } from 'react'
import type { UseFormRegisterReturn } from 'react-hook-form'
import { toApiError } from '../api/http'

/** Labelled text input or textarea wired to React Hook Form, with hint and error announced to assistive tech. */
export function FormField({ label, name, required, multiline, type = 'text', maxLength, registration, error, hint }: {
  label: string
  name: string
  required?: boolean
  multiline?: boolean
  type?: string
  maxLength?: number
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
    'aria-invalid': error ? true : undefined,
    'aria-describedby': [hintId, errorId].filter(Boolean).join(' ') || undefined,
    ...registration,
  }

  return (
    <div>
      <label className="field-label" htmlFor={id}>{label}</label>
      {hint && <span className="field-hint" id={hintId}>{hint}</span>}
      {multiline
        ? <textarea {...shared} className="field-input min-h-28 resize-y" />
        : <input {...shared} className="field-input" type={type} />}
      {error && <span className="field-error" id={errorId} role="alert">{error}</span>}
    </div>
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
