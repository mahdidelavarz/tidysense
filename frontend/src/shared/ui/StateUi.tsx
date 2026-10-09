import { CircleAlert, type LucideIcon, RefreshCw } from 'lucide-react'
import type { ReactNode } from 'react'

/** Labelled initial-loading placeholder shaped like the list it replaces. */
export function LoadingState({ text }: { text: string }) {
  return (
    <div role="status" aria-live="polite">
      <span className="sr-only">{text}</span>
      <div className="space-y-3" aria-hidden="true">
        <div className="skeleton h-20" />
        <div className="skeleton h-20 opacity-70" />
        <div className="skeleton h-20 opacity-40" />
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
    <div className="flex flex-col items-center rounded-3xl border border-dashed border-border px-6 py-12 text-center">
      {Icon && (
        <div className="flex size-14 items-center justify-center rounded-2xl bg-surface text-text-secondary shadow-sm" aria-hidden="true">
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
    <div className="flex flex-col items-center rounded-3xl bg-attention-tint px-6 py-10 text-center" role="alert">
      <CircleAlert size={28} className="text-attention" aria-hidden="true" />
      <p className="mt-3 text-lg font-bold text-text-primary">{title}</p>
      {description && <p className="mt-1 max-w-sm text-sm text-text-secondary">{description}</p>}
      {onRetry && (
        <button className="secondary-button mt-5" type="button" onClick={onRetry}>
          <RefreshCw size={18} aria-hidden="true" />
          تلاش دوباره
        </button>
      )}
      {action && <div className="mt-5">{action}</div>}
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
