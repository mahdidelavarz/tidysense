import { Navigate, Outlet, useLocation } from '@tanstack/react-router'
import { AppShell } from '../../shell/components/AppShell'
import { ErrorState, LoadingState } from '../../../shared/ui/StateUi'
import { useCurrentUser } from '../hooks/auth-hooks'

/**
 * Route-tree root: resolves the session once, then renders exactly one of
 * the unauthenticated login page, the first-entry redirect, or the
 * authenticated app shell. Not-found/unauthenticated/forbidden stay
 * distinct per devmap/frontend/routing-state-api.md.
 */
export function AuthGate() {
  const location = useLocation()
  const auth = useCurrentUser()
  const onLogin = location.pathname === '/login'

  if (auth.isPending) {
    return <main className="min-h-dvh bg-canvas p-4 text-text-primary sm:p-8"><div className="mx-auto max-w-md pt-16"><LoadingState text="در حال بررسی نشست…" /></div></main>
  }
  if (auth.isError) {
    return <main className="min-h-dvh bg-canvas p-4 text-text-primary sm:p-8"><div className="mx-auto max-w-md pt-16">
      <ErrorState title="بررسی نشست ممکن نشد." description="ارتباط را بررسی کنید و دوباره تلاش کنید." onRetry={() => auth.refetch()} />
    </div></main>
  }
  if (!auth.data && !onLogin) return <Navigate to="/login" />
  if (auth.data && onLogin) return <Navigate to={auth.data.setupComplete ? '/today' : '/first-entry'} />
  if (auth.data) return <AppShell><Outlet /></AppShell>
  return <main className="min-h-dvh bg-canvas text-text-primary"><Outlet /></main>
}
