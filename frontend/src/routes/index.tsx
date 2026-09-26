import { createFileRoute, Link } from '@tanstack/react-router'
import { useQueryClient } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { logout } from '../features/auth/services/auth-api'
import { currentUserQueryKey } from '../features/auth/components/AuthGate'
import { useState } from 'react'

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
    <section className="mx-auto max-w-xl p-6">
      <h1 className="text-2xl font-bold">TidySense</h1>
      <p className="mt-3 text-text-secondary">برنامهٔ شما آماده است.</p>
      <Link className="mt-5 inline-block rounded-lg bg-accent px-4 py-3 text-white" to="/projects/$projectId" params={{ projectId: '00000000-0000-0000-0000-000000000000' }}>
        مشاهدهٔ نمونهٔ پروژه
      </Link>
      <div className="mt-8 flex gap-4">
        <button type="button" className="underline disabled:opacity-50" disabled={leaving} onClick={() => leave(false)}>خروج از این مرورگر</button>
        <button type="button" className="underline disabled:opacity-50" disabled={leaving} onClick={() => leave(true)}>خروج از همهٔ نشست‌ها</button>
      </div>
      {error && <p role="alert" className="mt-3 text-attention">{error}</p>}
    </section>
  )
}

export const Route = createFileRoute('/')({
  component: Home,
})
