import { CircleAlert, type LucideIcon, RefreshCw } from 'lucide-react'
import type { ReactNode } from 'react'

/** Labelled initial-loading placeholder shaped like the list it replaces. */
export function LoadingState({ text }: { text: string }) {
  return (
    <div role="status" aria-live="polite">
      <span className="sr-only">{text}</span>
      <div className="space-y-3" aria-hidden="true">
        {['', 'opacity-70', 'opacity-40'].map(fade => (
          <div key={fade} className={`flex items-center gap-3.5 rounded-2xl border border-border-subtle bg-surface p-3 ${fade}`}>
            <div className="skeleton size-12" />
            <div className="flex-1 space-y-2">
              <div className="skeleton h-4 w-2/5" />
              <div className="skeleton h-3 w-3/5" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

/** Explains an empty list and offers the one next step that fills it. */
export function EmptyState({ icon: Icon, title, description, action }: {
  icon?: LucideIcon
  title: string
  description?: string
  action?: ReactNode
}) {
  return (
    <div className="state-panel">
      {Icon && (
        <div className="flex size-14 items-center justify-center rounded-2xl bg-accent-tint text-accent-strong" aria-hidden="true">
          <Icon size={26} />
        </div>
      )}
      <p className="mt-4 text-lg font-bold text-text-primary">{title}</p>
      {description && <p className="mt-1 max-w-sm text-sm text-text-secondary">{description}</p>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  )
}

export function ErrorState({ title = 'دریافت اطلاعات ممکن نشد.', description, onRetry, action }: {
  title?: string
  description?: string
  onRetry?: () => void
  /** A way out when retrying cannot help (for example a link back from a not-found page). */
  action?: ReactNode
}) {
  return (
    <div className="state-panel" data-tone="attention" role="alert">
      <div className="flex size-14 items-center justify-center rounded-2xl bg-attention-tint text-attention" aria-hidden="true">
        <CircleAlert size={26} />
      </div>
      <p className="mt-4 text-lg font-bold text-text-primary">{title}</p>
      {description && <p className="mt-1 max-w-sm text-sm text-text-secondary">{description}</p>}
      {(onRetry || action) && (
        <div className="mt-6 flex flex-col items-center gap-3">
          {onRetry && (
            <button className="secondary-button" type="button" onClick={onRetry}>
              <RefreshCw size={18} aria-hidden="true" />
              تلاش دوباره
            </button>
          )}
          {action}
        </div>
      )}
    </div>
  )
}

/** What an address that leads nowhere shows, including a page the signed-in account may not open. */
export function NotFoundState({ action }: { action: ReactNode }) {
  return (
    <div className="page pt-10">
      <ErrorState title="این صفحه پیدا نشد." description="نشانی اشتباه است یا این صفحه دیگر وجود ندارد." action={action} />
    </div>
  )
}

/** The loading → error → empty → content ladder every list page shares. */
export function ResourceState({ pending, error, empty, pendingText, emptyIcon, emptyTitle, emptyDescription, emptyAction, onRetry, children }: {
  pending: boolean
  error: unknown
  empty: boolean
  pendingText: string
  emptyIcon?: LucideIcon
  emptyTitle: string
  emptyDescription?: string
  emptyAction?: ReactNode
  onRetry?: () => void
  children: ReactNode
}) {
  if (pending) return <LoadingState text={pendingText} />
  if (error) return <ErrorState onRetry={onRetry} description="ارتباط را بررسی کنید و دوباره تلاش کنید." />
  if (empty) return <EmptyState icon={emptyIcon} title={emptyTitle} description={emptyDescription} action={emptyAction} />
  return children
}

/** "Load more" control for cursor-paginated lists. */
export function LoadMoreButton({ visible, loading, label, onClick }: {
  visible: boolean
  loading: boolean
  label: string
  onClick: () => void
}) {
  if (!visible) return null
  return (
    <div className="mt-6 flex justify-center">
      <button className="secondary-button" type="button" disabled={loading} onClick={onClick}>
        {loading ? 'در حال دریافت…' : label}
      </button>
    </div>
  )
}
