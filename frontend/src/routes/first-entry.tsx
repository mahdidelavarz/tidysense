import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { type FormEvent, useRef, useState } from 'react'
import photo from '../shared/assets/night.jpg'
import { type CreateTarget, useUiStore } from '../shared/lib/ui-store'
import { type EntityKind, EntityIcon, EntityLabel } from '../shared/ui/EntityUi'
import { ChevronLeft, ShieldCheck, Sparkles } from '../shared/ui/icons'

/** Written in the user's own voice: choosing one fills the input, where it can still be changed. */
const examples = [
  'یک برنامه برای یادگیری زبان',
  'برای یکی از هدف‌هایم برنامه بساز',
  'کارهایم را مرتب کن',
  'کمکم کن از کجا شروع کنم',
  'ورزش را منظم کنم',
]

const manualChoices: Array<{ target: Exclude<CreateTarget, 'menu'>; entity: EntityKind; label: string }> = [
  { target: 'task', entity: 'task', label: 'یک کار' },
  { target: 'goal', entity: 'goal', label: 'یک هدف' },
  { target: 'routine', entity: 'routine', label: 'یک روتین' },
]

/**
 * First sign-in: one question with two ways to answer it. The written
 * intention is handed to Planning, which owns the draft and its
 * confirmation; the manual choices open the shell's ordinary create flow;
 * «بعداً» goes to Today with nothing made.
 */
function FirstEntry() {
  const navigate = useNavigate()
  const openCreate = useUiStore(state => state.openCreate)
  const input = useRef<HTMLTextAreaElement>(null)
  const [text, setText] = useState('')
  const [empty, setEmpty] = useState(false)

  const submit = (event?: FormEvent) => {
    event?.preventDefault()
    const intention = text.trim()
    if (!intention) {
      setEmpty(true)
      input.current?.focus()
      return
    }
    void navigate({ to: '/planning', state: { intention } })
  }

  const fillExample = (example: string) => {
    setText(example)
    setEmpty(false)
    input.current?.focus()
  }

  return (
    <div className="page pb-10">
      <header className="first-hero">
        <img className="absolute inset-0 size-full object-cover" style={{ objectPosition: '50% 30%' }} src={photo} alt="" />
        <div className="hero-veil" aria-hidden="true" />
        <Link className="glass-later" to="/today">
          بعداً
          <ChevronLeft size={16} aria-hidden="true" />
        </Link>
        <h1 className="first-hero-title">سلام، خوش آمدید</h1>
      </header>

      <form className="first-card" onSubmit={submit} noValidate>
        <div className="flex items-center gap-3">
          <span className="ai-tile" aria-hidden="true"><Sparkles size={20} /></span>
          <div>
            <h2 className="font-extrabold">با هوش مصنوعی برنامه بسازید</h2>
            <p className="text-xs text-text-secondary">هر چیزی که الان در ذهن دارید را بگویید.</p>
          </div>
        </div>

        <label className="sr-only" htmlFor="first-entry-intention">هر چیزی که الان در ذهن دارید</label>
        <textarea
          ref={input}
          id="first-entry-intention"
          className="intent-input"
          rows={3}
          maxLength={2000}
          placeholder="هر چه در ذهن دارید بنویسید، یا یکی از این‌ها را انتخاب کنید…"
          value={text}
          aria-invalid={empty ? true : undefined}
          aria-describedby={empty ? 'first-entry-error' : undefined}
          onChange={event => { setText(event.target.value); setEmpty(false) }}
          onKeyDown={event => {
            // Enter sends, as in a message box; Shift+Enter keeps writing.
            if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) submit(event)
          }}
        />
        {empty && <p className="field-error" id="first-entry-error" role="alert">اول بنویسید چه در ذهن دارید، یا یکی از نمونه‌ها را انتخاب کنید.</p>}

        <ul className="mt-3 flex flex-wrap gap-2" aria-label="نمونه‌ها">
          {examples.map(example => (
            <li key={example}>
              <button className="example-chip" type="button" onClick={() => fillExample(example)}>{example}</button>
            </li>
          ))}
        </ul>

        <button className="primary-button mt-4 min-h-13.5 w-full rounded-[1.125rem] text-[0.9375rem]" type="submit">
          <Sparkles size={20} aria-hidden="true" />
          برنامه‌ام را بساز
        </button>
        <p className="mt-3 flex items-center justify-center gap-1.5 text-xs text-text-secondary">
          <ShieldCheck size={15} aria-hidden="true" />
          تا خودتان تأیید نکنید، چیزی ساخته نمی‌شود.
        </p>
      </form>

      <section className="mt-6" aria-labelledby="first-entry-sample">
        <h2 className="px-1 text-[0.8125rem] font-extrabold text-text-secondary" id="first-entry-sample">
          مثلاً «می‌خواهم تا سه ماه دیگر برای مصاحبه آماده شوم» می‌شود:
        </h2>
        {/* Illustration only: nothing here is real or clickable. */}
        <div className="sample-goal entity-goal mt-2.5">
          <p className="flex items-center justify-between gap-2">
            <span className="flex min-w-0 items-center gap-2"><EntityLabel entity="goal" /><b className="truncate text-sm">آماده شدن برای مصاحبه‌ی فرانت‌اند</b></span>
            <span className="shrink-0 text-[0.6875rem] text-text-secondary">تا ۳ ماه دیگر</span>
          </p>
          <div className="sample-project entity-project mt-2.5">
            <p className="flex items-center gap-2"><EntityLabel entity="project" /><b className="text-[0.8125rem]">برنامه‌ی آمادگی ۹۰ روزه</b></p>
            <p className="mt-1.5 flex items-center gap-2"><EntityLabel entity="task" /><span className="text-[0.8125rem] font-bold">مرور مفاهیم HTML، CSS و JS</span></p>
            <p className="mt-1.5 flex items-center gap-2"><EntityLabel entity="task" /><span className="text-[0.8125rem] font-bold">تمرین الگوریتم و حل مسئله</span></p>
          </div>
          <p className="mt-2.5 flex items-center justify-between gap-2">
            <span className="flex items-center gap-2"><EntityLabel entity="routine" /><span className="text-[0.8125rem] font-bold">مطالعه و تمرین روزانه</span></span>
            <span className="text-[0.6875rem] text-text-secondary">هر روز</span>
          </p>
        </div>
      </section>

      <h2 className="divider-title mt-7">یا خودتان شروع کنید</h2>
      <ul className="mt-3 grid grid-cols-3 gap-3">
        {manualChoices.map(choice => (
          <li key={choice.target}>
            <button className="manual-tile" type="button" onClick={() => openCreate(choice.target)}>
              <EntityIcon entity={choice.entity} />
              {choice.label}
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}

export const Route = createFileRoute('/first-entry')({ component: FirstEntry })
