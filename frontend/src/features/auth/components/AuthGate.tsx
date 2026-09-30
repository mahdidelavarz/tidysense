import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Navigate, Outlet, useLocation } from '@tanstack/react-router'
import { useEffect } from 'react'
import { AppShell } from '../../../shared/ui/AppShell'
import { ErrorState, LoadingState } from '../../../shared/ui/StateUi'
import { currentUser } from '../services/auth-api'

export const currentUserQueryKey = ['auth', 'current-user'] as const

export function AuthGate() {
  const location = useLocation()
  const queryClient = useQueryClient()
  const auth = useQuery({ queryKey: currentUserQueryKey, queryFn: currentUser, retry: false })
  const onLogin = location.pathname === '/login'
  useEffect(() => {
    const clearSession = () => queryClient.setQueryData(currentUserQueryKey, null)
    window.addEventListener('tidysense:unauthorized', clearSession)
    return () => window.removeEventListener('tidysense:unauthorized', clearSession)
  }, [queryClient])

  if (auth.isPending) {
    return <main className="min-h-screen bg-canvas p-4 text-text-primary sm:p-8"><div className="mx-auto max-w-md pt-16"><LoadingState text="در حال بررسی نشست…" /></div></main>
  }
  if (auth.isError) {
    return <main className="min-h-screen bg-canvas p-4 text-text-primary sm:p-8"><div className="mx-auto max-w-md pt-16">
      <ErrorState title="بررسی نشست ممکن نشد." description="ارتباط را بررسی کنید و دوباره تلاش کنید." onRetry={() => auth.refetch()} />
    </div></main>
  }
  if (!auth.data && !onLogin) return <Navigate to="/login" />
  if (auth.data && onLogin) return <Navigate to={auth.data.setupComplete ? '/' : '/first-entry'} />
  if (auth.data) return <AppShell><Outlet /></AppShell>
  return <main className="min-h-screen bg-canvas text-text-primary"><Outlet /></main>
}
