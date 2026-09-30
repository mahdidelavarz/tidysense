import { useId } from 'react'
import type { UseFormRegisterReturn } from 'react-hook-form'
import { toApiError } from '../api/http'

export function FormField({
  label,
  name,
  required,
  multiline,
  type = 'text',
  maxLength,
  defaultValue,
  registration,
  error,
  hint,
}: {
  label: string
  name: string
  required?: boolean
  multiline?: boolean
  type?: string
  maxLength?: number
  defaultValue?: string
  registration?: UseFormRegisterReturn
  error?: string
  hint?: string
}) {
  const id = useId()
  const hintId = hint ? `${id}-hint` : undefined
  const errorId = error ? `${id}-error` : undefined
  const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined
  const shared = {
    id,
    className: 'field-input',
    name,
    required,
    maxLength,
    defaultValue,
    'aria-invalid': error ? true : undefined,
    'aria-describedby': describedBy,
    ...registration,
  }

  return (
    <div>
      <label className="field-label" htmlFor={id}>{label}</label>
      {hint && <span className="field-hint" id={hintId}>{hint}</span>}
      {multiline
        ? <textarea {...shared} className="field-input min-h-28 resize-y" />
        : <input {...shared} type={type} dir={type === 'date' ? 'ltr' : undefined} />}
      {error && <span className="field-error" id={errorId} role="alert">{error}</span>}
    </div>
  )
}

export function ValidationSummary({ messages }: { messages: Array<string | undefined> }) {
  const visible = [...new Set(messages.filter((message): message is string => Boolean(message)))]
  if (visible.length === 0) return null
  return (
    <div className="rounded-lg border border-attention/40 bg-attention-tint p-4 text-sm" role="alert">
      <p className="font-bold text-text-primary">لطفاً موارد زیر را بررسی کنید:</p>
      <ul className="mt-2 list-inside list-disc text-text-primary">
        {visible.map(message => <li key={message}>{message}</li>)}
      </ul>
    </div>
  )
}

export function FormError({ error }: { error: unknown }) {
  if (!error) return null
  const api = toApiError(error)
  const copy = api.code === 'CONFLICT_STALE_VERSION'
    ? 'این مورد در جای دیگری تغییر کرده است. صفحه را تازه کنید.'
    : api.code === 'IDEMPOTENCY_MISMATCH'
      ? 'درخواست تکراری با محتوای متفاوت ارسال شد.'
      : 'ذخیره انجام نشد. ورودی‌ها را بررسی و دوباره تلاش کنید.'
  return (
    <div className="rounded-lg border border-attention/40 bg-attention-tint p-4 text-sm" role="alert">
      <p className="font-bold text-text-primary">ذخیره انجام نشد</p>
      <p className="mt-1 text-text-primary">{copy}{api.traceId ? ` کد پیگیری: ${api.traceId}` : ''}</p>
    </div>
  )
}
