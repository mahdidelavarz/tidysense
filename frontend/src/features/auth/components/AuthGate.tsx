import { useQuery } from '@tanstack/react-query'
import { Navigate, Outlet, useLocation } from '@tanstack/react-router'
import { currentUser } from '../services/auth-api'
import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'

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

  if (auth.isPending) return <p className="p-6" role="status">در حال بررسی نشست…</p>
  if (auth.isError) {
    return <section className="p-6" role="alert">
      <p>بررسی نشست ممکن نشد.</p>
      <button type="button" onClick={() => auth.refetch()}>تلاش دوباره</button>
    </section>
  }
  if (!auth.data && !onLogin) return <Navigate to="/login" />
  if (auth.data && onLogin) return <Navigate to={auth.data.setupComplete ? '/' : '/first-entry'} />
  return <Outlet />
}
