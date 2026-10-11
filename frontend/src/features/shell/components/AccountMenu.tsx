import { Link } from '@tanstack/react-router'
import { ChevronsUpDown, LogOut, MonitorSmartphone, ShieldCheck, UserRound } from 'lucide-react'
import { useEffect, useId, useRef, useState } from 'react'
import { useCurrentUser, useLogout } from '../../auth/hooks/auth-hooks'

/** Account block at the foot of the sidebar/drawer: who is signed in, the privacy page and the two sign-out choices. */
export function AccountMenu({ onNavigate }: { onNavigate?: () => void }) {
  const user = useCurrentUser()
  const logout = useLogout()
  const [open, setOpen] = useState(false)
  const [failed, setFailed] = useState(false)
  const panelId = useId()
  const root = useRef<HTMLDivElement>(null)

  // The choices float above the button, so a press anywhere else puts them away.
  useEffect(() => {
    if (!open) return
    const close = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('pointerdown', close)
    return () => document.removeEventListener('pointerdown', close)
  }, [open])

  function signOut(all: boolean) {
    setFailed(false)
    logout.mutate(all, { onError: () => setFailed(true) })
  }

  return (
    <div className="relative" ref={root}>
      {open && (
        <div className="absolute inset-x-0 bottom-full z-10 mb-2 animate-pop-in rounded-2xl border border-border-subtle bg-surface p-1.5 shadow-lg" id={panelId}>
          <Link className="menu-item" to="/privacy" onClick={onNavigate}>
            <ShieldCheck size={20} aria-hidden="true" />
            حریم خصوصی و داده‌ها
          </Link>
          <div className="mx-3 my-1.5 h-px bg-border-subtle" aria-hidden="true" />
          <button className="menu-item w-full" type="button" disabled={logout.isPending} onClick={() => signOut(false)}>
            <LogOut size={20} aria-hidden="true" />
            خروج از این مرورگر
          </button>
          <button className="menu-item w-full" type="button" disabled={logout.isPending} onClick={() => signOut(true)}>
            <MonitorSmartphone size={20} aria-hidden="true" />
            خروج از همه‌ی نشست‌ها
          </button>
          {failed && <p className="px-3 py-1 text-xs font-bold text-attention" role="alert">خروج انجام نشد. دوباره تلاش کنید.</p>}
        </div>
      )}
      <button
        className="flex w-full items-center gap-3 rounded-2xl border border-border-subtle bg-canvas p-2.5 text-start transition duration-200 hover:border-border hover:bg-surface-sunken"
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen(value => !value)}
      >
        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-accent-tint text-accent-strong" aria-hidden="true">
          <UserRound size={20} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-bold leading-5">حساب کاربری</span>
          {user.data && <bdi className="block truncate text-xs leading-5 text-text-secondary" dir="ltr">{user.data.phoneNumber}</bdi>}
        </span>
        <ChevronsUpDown size={18} className="shrink-0 text-text-tertiary" aria-hidden="true" />
      </button>
    </div>
  )
}
