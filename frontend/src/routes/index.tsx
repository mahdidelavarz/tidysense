import { useQueryClient } from '@tanstack/react-query'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { currentUserQueryKey } from '../features/auth/components/AuthGate'
import { logout } from '../features/auth/services/auth-api'
import { ParentDashboard } from '../features/parents/components/ParentDashboard'

function Home() {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const [leaving, setLeaving] = useState(false)
  const [error, setError] = useState('')
  async function leave(all: boolean) {
    setLeaving(true)
    setError('')
    try {
      await logout(all)
      queryClient.setQueryData(currentUserQueryKey, null)
      await navigate({ to: '/login' })
    } catch {
      setError('خروج انجام نشد. دوباره تلاش کنید.')
      setLeaving(false)
    }
  }
  return <>
    <ParentDashboard />
    <footer className="mx-auto mb-8 flex max-w-5xl flex-wrap gap-4 border-t border-border px-4 pt-5 text-sm sm:px-8">
      <button type="button" className="underline disabled:opacity-50" disabled={leaving} onClick={() => leave(false)}>خروج از این مرورگر</button>
      <button type="button" className="underline disabled:opacity-50" disabled={leaving} onClick={() => leave(true)}>خروج از همه‌ی نشست‌ها</button>
      {error && <p role="alert" className="w-full text-attention">{error}</p>}
    </footer>
  </>
}

export const Route = createFileRoute('/')({ component: Home })
