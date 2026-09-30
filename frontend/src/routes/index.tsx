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
  return (
    <>
      <ParentDashboard />
      <footer className="mx-auto mb-8 max-w-5xl px-4 sm:px-8">
        <div className="flex flex-col gap-3 border-t border-border-subtle pt-6 text-sm sm:flex-row sm:items-center">
          <span className="text-text-tertiary">حساب کاربری</span>
          <button type="button" className="ghost-button justify-start" disabled={leaving} onClick={() => leave(false)}>خروج از این مرورگر</button>
          <button type="button" className="ghost-button justify-start" disabled={leaving} onClick={() => leave(true)}>خروج از همه‌ی نشست‌ها</button>
        </div>
        {error && <p role="alert" className="mt-3 rounded-lg border border-attention/40 bg-attention-tint p-3 text-sm font-medium text-text-primary">{error}</p>}
      </footer>
    </>
  )
}

export const Route = createFileRoute('/')({ component: Home })
