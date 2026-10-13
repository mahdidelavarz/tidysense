import { Check, ChevronDown, Search } from './icons'
import { Fragment, type KeyboardEvent, type ReactNode, useEffect, useId, useRef, useState } from 'react'
import { LabelText } from './FormUi'

export type SelectOption = {
  value: string
  label: string
  /** Consecutive options with the same group are listed under that heading. */
  group?: string
  icon?: ReactNode
}

/** Persian text typed on different keyboards should still match: Arabic letter forms and the half-space are levelled. */
const fold = (text: string) => text.replace(/ي/g, 'ی').replace(/ك/g, 'ک').replace(/‌/g, ' ').trim().toLowerCase()

/**
 * Single-choice picker that replaces the native select: a field-styled
 * trigger with a searchable list floating under it. Type to narrow, arrows
 * to move, Enter to choose, Escape to put it away.
 */
export function SelectField({ label, value, options, onChange, hint, error, searchPlaceholder = 'جست‌وجو…' }: {
  label: string
  value: string
  options: SelectOption[]
  onChange: (value: string) => void
  hint?: string
  error?: string
  searchPlaceholder?: string
}) {
  const id = useId()
  const listId = `${id}-list`
  const hintId = hint ? `${id}-hint` : undefined
  const errorId = error ? `${id}-error` : undefined
  const root = useRef<HTMLDivElement>(null)
  const trigger = useRef<HTMLButtonElement>(null)
  const search = useRef<HTMLInputElement>(null)
  const panel = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)

  const selected = options.find(option => option.value === value)
  const needle = fold(query)
  const visible = needle ? options.filter(option => fold(option.label).includes(needle)) : options

  useEffect(() => {
    if (!open) return
    search.current?.focus()
    // Inside a scrolling sheet the list can open below the fold; bring it into view.
    panel.current?.scrollIntoView?.({ block: 'nearest', behavior: 'smooth' })
    const close = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('pointerdown', close)
    return () => document.removeEventListener('pointerdown', close)
  }, [open])

  function show() {
    setQuery('')
    setActive(Math.max(0, options.findIndex(option => option.value === value)))
    setOpen(true)
  }

  function hide() {
    setOpen(false)
    trigger.current?.focus()
  }

  function choose(option: SelectOption) {
    onChange(option.value)
    hide()
  }

  function onSearchKey(event: KeyboardEvent) {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault()
      if (visible.length === 0) return
      const step = event.key === 'ArrowDown' ? 1 : -1
      const next = (active + step + visible.length) % visible.length
      setActive(next)
      document.getElementById(`${id}-option-${next}`)?.scrollIntoView?.({ block: 'nearest' })
    } else if (event.key === 'Enter') {
      // Enter picks an option; it must not submit the form around the field.
      event.preventDefault()
      if (visible[active]) choose(visible[active])
    } else if (event.key === 'Escape') {
      // Closes only the list, not the sheet or dialog that holds the form.
      event.preventDefault()
      event.stopPropagation()
      hide()
    } else if (event.key === 'Tab') {
      setOpen(false)
    }
  }

  return (
    <div className="relative" ref={root}>
      <label className="field-label" htmlFor={id}><LabelText>{label}</LabelText></label>
      <button
        ref={trigger}
        id={id}
        className="field-input flex items-center gap-3 text-start"
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        aria-invalid={error ? true : undefined}
        aria-describedby={[hintId, errorId].filter(Boolean).join(' ') || undefined}
        onClick={() => (open ? setOpen(false) : show())}
        onKeyDown={event => {
          if (event.key === 'ArrowDown' && !open) {
            event.preventDefault()
            show()
          }
        }}
      >
        {selected?.icon}
        <span className={`min-w-0 flex-1 truncate ${selected ? '' : 'text-text-tertiary'}`}>{selected?.label ?? 'انتخاب کنید'}</span>
        <ChevronDown size={20} className={`shrink-0 text-text-secondary transition-transform duration-200 ${open ? 'rotate-180' : ''}`} aria-hidden="true" />
      </button>
      {error && <span className="field-error" id={errorId} role="alert">{error}</span>}
      {hint && <span className="field-hint" id={hintId}>{hint}</span>}

      {open && (
        <div className="select-panel" ref={panel}>
          <div className="flex items-center gap-2.5 border-b border-border-subtle px-3.5">
            <Search size={18} className="shrink-0 text-text-tertiary" aria-hidden="true" />
            <input
              ref={search}
              className="min-h-12 w-full bg-transparent text-base text-text-primary placeholder:text-text-tertiary focus:outline-none"
              type="text"
              role="combobox"
              aria-label={`جست‌وجو در ${label}`}
              aria-expanded="true"
              aria-controls={listId}
              aria-autocomplete="list"
              aria-activedescendant={visible[active] ? `${id}-option-${active}` : undefined}
              placeholder={searchPlaceholder}
              value={query}
              onChange={event => { setQuery(event.target.value); setActive(0) }}
              onKeyDown={onSearchKey}
            />
          </div>
          {/* A listbox driven from the search input: a native select can be neither styled nor searched. */}
          <div className="max-h-64 overflow-y-auto p-1.5" id={listId} role="listbox" aria-label={label}>
            {visible.map((option, index) => (
              <Fragment key={option.value}>
                {option.group && option.group !== visible[index - 1]?.group && (
                  <p className="px-3 pb-1 pt-2.5 text-xs font-bold text-text-secondary" role="presentation">{option.group}</p>
                )}
                {/* biome-ignore lint/a11y/useKeyWithClickEvents: keys are handled on the search input, which keeps focus. */}
                <div
                  id={`${id}-option-${index}`}
                  className="select-option"
                  role="option"
                  tabIndex={-1}
                  aria-selected={option.value === value}
                  data-active={index === active}
                  onPointerMove={() => setActive(index)}
                  onClick={() => choose(option)}
                >
                  {option.icon}
                  <span className="min-w-0 flex-1 truncate">{option.label}</span>
                  {option.value === value && <Check size={18} className="shrink-0" aria-hidden="true" />}
                </div>
              </Fragment>
            ))}
            {visible.length === 0 && <p className="px-3 py-4 text-center text-sm text-text-secondary">موردی با این نام پیدا نشد.</p>}
          </div>
        </div>
      )}
    </div>
  )
}
