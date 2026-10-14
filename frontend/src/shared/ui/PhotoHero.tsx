import { type ReactNode, useEffect, useState } from 'react'
import heroPhoto from '../assets/sunset.webp'

/**
 * Collapsed while the reader scrolls down past the photograph; open again as
 * soon as they scroll up or reach the top.
 */
function useCollapsed(threshold = 120) {
  const [collapsed, setCollapsed] = useState(false)
  useEffect(() => {
    let last = window.scrollY
    let frame = 0
    const onScroll = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => {
        const y = window.scrollY
        if (y < threshold) setCollapsed(false)
        else if (y > last + 4) setCollapsed(true)
        else if (y < last - 4) setCollapsed(false)
        last = y
      })
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', onScroll)
      cancelAnimationFrame(frame)
    }
  }, [threshold])
  return collapsed
}

/**
 * The top of a primary page drawn on the photograph (Today, Goals, Projects):
 * the page title and a line under it, the account button (below desktop) and
 * the page's action (desktop), an optional row under the title (such as the
 * Goals/Projects switch), and whatever is passed as children at its foot. It
 * collapses to a band on scroll down and opens again on scroll up; the foot
 * steps aside while collapsed.
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
  const collapsed = useCollapsed()
  return (
    <header className="hero" data-collapsed={collapsed}>
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
