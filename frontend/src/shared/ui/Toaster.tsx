import { CircleCheck } from 'lucide-react'
import { useEffect } from 'react'
import { type Toast, useUiStore } from '../lib/ui-store'

const visibleMs = 3500

/** Renders confirmed-success toasts above the tab bar on phones and at the bottom corner on desktop. */
export function Toaster() {
  const toasts = useUiStore(state => state.toasts)
  return (
    <div
      className="pointer-events-none fixed inset-x-4 bottom-[calc(var(--tabbar-height)+env(safe-area-inset-bottom)+1rem)] z-60 flex flex-col items-center gap-2 lg:inset-x-auto lg:bottom-6 lg:end-6 lg:items-end"
      aria-live="polite"
    >
      {toasts.map(toast => <ToastItem key={toast.id} toast={toast} />)}
    </div>
  )
}

function ToastItem({ toast }: { toast: Toast }) {
  const dismissToast = useUiStore(state => state.dismissToast)
  useEffect(() => {
    const timer = window.setTimeout(() => dismissToast(toast.id), visibleMs)
    return () => window.clearTimeout(timer)
  }, [toast.id, dismissToast])

  return (
    <div className="toast">
      <CircleCheck size={20} className="shrink-0 text-positive-tint" aria-hidden="true" />
      {toast.message}
    </div>
  )
}
