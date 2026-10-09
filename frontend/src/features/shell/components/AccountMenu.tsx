import { Link } from '@tanstack/react-router'
import { ChevronUp, CircleUser, LogOut, ShieldCheck } from 'lucide-react'
import { useId, useState } from 'react'
import { useCurrentUser, useLogout } from '../../auth/hooks/auth-hooks'

/** Account block at the foot of the sidebar/drawer: who is signed in, the privacy page and the two sign-out choices. */
export function AccountMenu({ onNavigate }: { onNavigate?: () => void }) {
  const user = useCurrentUser()
  const logout = useLogout()
  const [open, setOpen] = useState(false)
  const [failed, setFailed] = useState(false)
  const panelId = useId()

  function signOut(all: boolean) {
    setFailed(false)
    logout.mutate(all, { onError: () => setFailed(true) })
  }

  return (
    <div className="border-t border-border-subtle pt-3">
      {open && (
        <div className="mb-1 space-y-1" id={panelId}>
          <Link className="nav-item" to="/privacy" onClick={onNavigate}>
            <ShieldCheck size={20} aria-hidden="true" />
            حریم خصوصی و داده‌ها
          </Link>
          <button className="nav-item w-full" type="button" disabled={logout.isPending} onClick={() => signOut(false)}>
            <LogOut size={20} aria-hidden="true" />
            خروج از این مرورگر
          </button>
          <button className="nav-item w-full" type="button" disabled={logout.isPending} onClick={() => signOut(true)}>
            <LogOut size={20} aria-hidden="true" />
            خروج از همه‌ی نشست‌ها
          </button>
          {failed && <p className="px-3 text-xs font-bold text-attention" role="alert">خروج انجام نشد. دوباره تلاش کنید.</p>}
        </div>
      )}
      <button className="nav-item w-full" type="button" aria-expanded={open} aria-controls={panelId} onClick={() => setOpen(value => !value)}>
        <CircleUser size={20} aria-hidden="true" />
        <span className="min-w-0 flex-1 text-start">
          <span className="block leading-5">حساب کاربری</span>
          {user.data && <bdi className="block text-xs font-normal leading-5 text-text-secondary" dir="ltr">{user.data.phoneNumber}</bdi>}
        </span>
        <ChevronUp size={18} className={`transition-transform duration-200 ${open ? '' : 'rotate-180'}`} aria-hidden="true" />
      </button>
    </div>
  )
}
