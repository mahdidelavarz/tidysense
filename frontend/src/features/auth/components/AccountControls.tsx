import { useState } from 'react'
import { useLogout } from '../hooks/auth-hooks'

/** Account/session controls: sign out of this browser, or every session. */
export function AccountControls() {
  const logout = useLogout()
  const [error, setError] = useState('')

  function signOut(all: boolean) {
    setError('')
    logout.mutate(all, { onError: () => setError('خروج انجام نشد. دوباره تلاش کنید.') })
  }

  return (
    <footer className="mx-auto mb-8 max-w-5xl px-4 sm:px-8">
      <div className="flex flex-col gap-3 border-t border-border-subtle pt-6 text-sm sm:flex-row sm:items-center">
        <span className="text-text-tertiary">حساب کاربری</span>
        <button type="button" className="ghost-button justify-start" disabled={logout.isPending} onClick={() => signOut(false)}>خروج از این مرورگر</button>
        <button type="button" className="ghost-button justify-start" disabled={logout.isPending} onClick={() => signOut(true)}>خروج از همه‌ی نشست‌ها</button>
      </div>
      {error && <p role="alert" className="mt-3 rounded-lg border border-attention/40 bg-attention-tint p-3 text-sm font-medium text-text-primary">{error}</p>}
    </footer>
  )
}
