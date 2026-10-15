import { type ReactNode, type RefObject, useEffect, useRef, useState } from 'react'
import heroPhoto from '../assets/sunset.webp'

/**
 * How far the photograph has folded, from 0 (open) to 1 (the band), following
 * the scroll position itself: it shrinks as the page scrolls down and grows as
 * it scrolls back up, with no threshold and no animation of its own. The
 * value is written to `--hero-p` on the header without a React render; the
 * returned flag only says whether it is mostly folded, for `inert`.
 */
function useFold(ref: RefObject<HTMLElement | null>) {
  const [folded, setFolded] = useState(false)
  useEffect(() => {
    const element = ref.current
    if (!element) return
    let frame = 0
    const update = () => {
      const rem = Number.parseFloat(getComputedStyle(document.documentElement).fontSize) || 16
      // The header keeps its height; it folds by the part above the 9.375rem band.
      const range = Math.max(1, element.offsetHeight - 9.375 * rem)
      const fold = Math.min(1, Math.max(0, window.scrollY / range))
      element.style.setProperty('--hero-p', fold.toFixed(4))
      setFolded(fold >= 0.5)
    }
    const onScroll = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(update)
    }
    update()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
      cancelAnimationFrame(frame)
    }
  }, [ref])
  return folded
}

/**
 * The top of a primary page drawn on the photograph (Today, Goals, Projects):
 * the page title and a line under it, the account button (below desktop) and
 * the page's action (desktop), an optional row under the title (such as the
 * Goals/Projects switch), and whatever is passed as children at its foot. It
 * folds into a band as the page scrolls and opens again as it scrolls back,
 * following the scroll itself; the foot fades away as it folds.
 */
export function PhotoHero({ title, subtitle, end, below, children }: {
  title: string
  subtitle?: ReactNode
  /** Controls at the end of the title row: the account button and the page action. */
  end?: ReactNode
  /** A row under the title, inside the photograph. */
  below?: ReactNode
  children?: ReactNode
}) {
  const header = useRef<HTMLElement>(null)
  const collapsed = useFold(header)
  return (
    <header ref={header} className="hero" data-collapsed={collapsed}>
      <img className="hero-photo" src={heroPhoto} alt="" decoding="async" />
      <div className="hero-veil" aria-hidden="true" />
      <div className="hero-inner">
        <div className="min-w-0">
          <h1 className="hero-title">{title}</h1>
          {subtitle && <p className="hero-date">{subtitle}</p>}
        </div>
        <div className="flex shrink-0 items-center gap-2">{end}</div>
      </div>
      {below && <div className="hero-below" inert={collapsed}>{below}</div>}
      {children && <div className="hero-foot" inert={collapsed}>{children}</div>}
    </header>
  )
}
