import type { ReactNode } from 'react'

export function LoadingState({ text }: { text: string }) {
  return (
    <div className="state-card" role="status" aria-live="polite">
      <div className="flex items-center gap-3">
        <span className="size-5 animate-spin rounded-full border-2 border-accent-tint border-t-accent" aria-hidden="true" />
        <span>{text}</span>
      </div>
      <div className="mt-5 space-y-3" aria-hidden="true">
        <div className="skeleton-line w-3/4" />
        <div className="skeleton-line w-1/2" />
      </div>
    </div>
  )
}

export function EmptyState({ title, description, action }: {
  title: string
  description?: string
  action?: ReactNode
}) {
  return (
    <div className="state-card text-center">
      <div className="mx-auto flex size-10 items-center justify-center rounded-full bg-surface-sunken text-xl text-text-secondary" aria-hidden="true">＋</div>
      <p className="mt-3 font-bold text-text-primary">{title}</p>
      {description && <p className="mx-auto mt-1 max-w-md text-sm">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}

export function ErrorState({ title = 'دریافت اطلاعات ممکن نشد.', description, onRetry, compact = false }: {
  title?: string
  description?: string
  onRetry?: () => void
  compact?: boolean
}) {
  return (
    <div className={`state-card state-card-error ${compact ? '' : 'text-center'}`} role="alert">
      <p className="font-bold text-text-primary">{title}</p>
      {description && <p className="mt-1 text-sm text-text-secondary">{description}</p>}
      {onRetry && <button className="secondary-button mt-4" type="button" onClick={onRetry}>تلاش دوباره</button>}
    </div>
  )
}

export function ResourceState({ pending, error, empty, pendingText, emptyTitle, emptyDescription, emptyAction, onRetry, children }: {
  pending: boolean
  error: unknown
  empty: boolean
  pendingText: string
  emptyTitle: string
  emptyDescription?: string
  emptyAction?: ReactNode
  onRetry?: () => void
  children: ReactNode
}) {
  if (pending) return <LoadingState text={pendingText} />
  if (error) return <ErrorState onRetry={onRetry} description="ارتباط را بررسی کنید و دوباره تلاش کنید." />
  if (empty) return <EmptyState title={emptyTitle} description={emptyDescription} action={emptyAction} />
  return children
}
