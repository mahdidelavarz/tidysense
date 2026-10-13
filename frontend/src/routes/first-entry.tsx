import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { ArrowLeft, ChevronLeft, Compass, Languages, ListChecks, Lock, type AppIcon, Sparkles, Square, Target } from '../shared/ui/icons'
import { type FormEvent, useRef, useState } from 'react'
import { type CreateTarget, useUiStore } from '../shared/lib/ui-store'
import { type EntityKind, EntityIcon, EntityLabel } from '../shared/ui/EntityUi'

/** Written in the user's own voice: choosing one fills the input, where it can still be changed. */
const examples: Array<{ text: string; icon: AppIcon }> = [
  { text: 'یه برنامه برای یادگیری زبان برام بنویس', icon: Languages },
  { text: 'برای یک هدفم برنامه بساز', icon: Target },
  { text: 'کارهام رو مرتب کن', icon: ListChecks },
  { text: 'کمکم کن از کجا شروع کنم', icon: Compass },
]

const manualChoices: Array<{ target: Exclude<CreateTarget, 'menu'>; entity: EntityKind; label: string }> = [
  { target: 'task', entity: 'task', label: 'یک کار اضافه کنم' },
  { target: 'goal', entity: 'goal', label: 'یک هدف مشخص کنم' },
  { target: 'routine', entity: 'routine', label: 'یک روتین بسازم' },
]

/** What the placeholder sentence could turn into. Illustration only: nothing here is real or clickable. */
const sample: Array<{ entity: EntityKind; title?: string; meta?: string; tasks?: string[] }> = [
  { entity: 'goal', title: 'آماده شدن برای مصاحبه فرانت‌اند', meta: 'تا ۳ ماه آینده' },
  { entity: 'project', title: 'برنامه آمادگی مصاحبه فرانت‌اند', meta: '۹۰ روزه' },
  { entity: 'task', tasks: ['مرور مفاهیم HTML، CSS و JS', 'تمرین الگوریتم و حل مسئله'] },
  { entity: 'routine', title: 'مطالعه و تمرین روزانه', meta: 'هر روز، ۲ ساعت' },
]

/**
 * First sign-in: one question with two ways to answer it. The written
 * intention is handed to Planning, which owns the draft and its
 * confirmation; the manual choices open the shell's ordinary create flow.
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
    <div className="mx-auto flex min-h-[calc(100dvh-8rem)] w-full max-w-7xl items-start px-4 pt-6 pb-6 sm:px-6 lg:min-h-dvh lg:items-center lg:px-12 lg:py-8">
      <div className="w-full items-center xl:grid xl:grid-cols-[minmax(0,1fr)_22rem] xl:gap-12 2xl:grid-cols-[minmax(0,1fr)_24rem] 2xl:gap-20">
        <div className="mx-auto w-full max-w-2xl">
          <header className="text-center">
            <h1 className="text-2xl font-extrabold leading-snug tracking-tight sm:text-4xl sm:leading-snug">دوست داری چطور شروع کنی؟</h1>
            <p className="mx-auto mt-3 max-w-xl text-balance text-text-secondary sm:text-lg sm:leading-9">
              لازم نیست از قبل همه‌چیز رو مرتب کرده باشی. فقط چیزی که تو ذهنت هست رو بگو.
            </p>
          </header>

          <form className="mt-8 rounded-3xl border border-border-subtle bg-surface p-4 shadow-md sm:p-6" onSubmit={submit} noValidate>
            <h2 className="flex items-center gap-2 text-lg font-bold">
              <Sparkles size={22} className="text-accent" aria-hidden="true" />
              با هوش مصنوعی برنامه بساز
            </h2>

            <div className="mt-4 rounded-2xl border border-border bg-surface p-4 transition duration-200 focus-within:border-accent focus-within:ring-3 focus-within:ring-accent/20">
              <label className="block font-bold" htmlFor="first-entry-intention">هر چیزی که الان تو ذهنت هست رو بگو.</label>
              <textarea
                ref={input}
                id="first-entry-intention"
                className="mt-2 block w-full resize-none bg-transparent text-base leading-8 text-text-primary placeholder:text-text-tertiary focus:outline-none"
                rows={3}
                maxLength={2000}
                placeholder="می‌خوام تا سه ماه دیگه برای مصاحبه فرانت‌اند آماده بشم. روزی حدود دو ساعت وقت دارم و نمی‌دونم از کجا شروع کنم."
                value={text}
                aria-invalid={empty ? true : undefined}
                aria-describedby={empty ? 'first-entry-error' : undefined}
                onChange={event => { setText(event.target.value); setEmpty(false) }}
                onKeyDown={event => {
                  // Enter sends, as in a message box; Shift+Enter keeps writing.
                  if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) submit(event)
                }}
              />
            </div>
            {empty && <p className="field-error" id="first-entry-error" role="alert">اول بنویس چی تو ذهنته، یا یکی از نمونه‌ها رو انتخاب کن.</p>}

            {/* One swipeable line on phones, wrapped and centred once there is room. */}
            <ul className="-mx-4 mt-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:justify-center sm:overflow-visible sm:px-0" aria-label="نمونه‌ها">
              {examples.map(({ text: example, icon: Icon }) => (
                <li key={example} className="shrink-0">
                  <button
                    className="flex min-h-11 items-center gap-2 rounded-xl border border-border-subtle bg-surface px-3.5 text-sm text-text-secondary transition duration-200 hover:border-accent hover:bg-accent-tint hover:text-accent-strong active:scale-[0.98]"
                    type="button"
                    onClick={() => fillExample(example)}
                  >
                    <Icon size={16} className="shrink-0 text-accent" aria-hidden="true" />
                    {example}
                  </button>
                </li>
              ))}
            </ul>

            <button className="primary-button mt-4 min-h-13 w-full text-base" type="submit">
              <Sparkles size={20} aria-hidden="true" />
              برنامه‌ام رو بساز
            </button>
          </form>

          <h2 className="section-title mt-8 text-center">یا خودت شروع کن</h2>
          <ul className="mt-3 grid gap-3 sm:grid-cols-3">
            {manualChoices.map(choice => (
              <li key={choice.target}>
                <button
                  className="flex min-h-16 w-full items-center gap-3 rounded-2xl border border-border-subtle bg-surface px-3 py-2 text-start text-sm font-bold transition sm:flex-col sm:justify-center sm:gap-2 sm:py-4 sm:text-center duration-200 hover:border-accent hover:bg-accent-tint active:scale-[0.98]"
                  type="button"
                  onClick={() => openCreate(choice.target)}
                >
                  <EntityIcon entity={choice.entity} />
                  <span className="min-w-0 flex-1 sm:flex-none">{choice.label}</span>
                  <ChevronLeft size={18} className="shrink-0 text-text-tertiary sm:hidden" aria-hidden="true" />
                </button>
              </li>
            ))}
          </ul>

          <div className="mt-6 text-center">
            <Link className="ghost-button font-medium" to="/today">
              فعلاً بدون اضافه کردن چیزی وارد برنامه بشم
              <ArrowLeft size={18} aria-hidden="true" />
            </Link>
          </div>
        </div>

        <aside className="hidden rounded-3xl border border-border-subtle bg-surface p-6 shadow-md xl:block" aria-labelledby="first-entry-sample">
          <h2 className="flex items-center gap-2 text-lg font-bold" id="first-entry-sample">
            <Sparkles size={22} className="text-accent" aria-hidden="true" />
            نمونه یک پیشنهاد
          </h2>
          <p className="mt-2 text-sm text-text-secondary">این فقط یک پیشنهاده. قبل از ثبت می‌تونی همه‌چیز رو تغییر بدی.</p>
          <ul className="mt-5 space-y-3">
            {sample.map(item => (
              <li key={item.entity} className="rounded-2xl border border-border-subtle p-3.5">
                <EntityLabel entity={item.entity} />
                {item.title && <p className="mt-2 font-bold">{item.title}</p>}
                {item.meta && <p className="text-sm text-text-secondary">{item.meta}</p>}
                {item.tasks && (
                  <ul className="mt-2 space-y-1.5">
                    {item.tasks.map(task => (
                      <li key={task} className="flex items-center gap-2.5 text-sm">
                        <Square size={18} className="shrink-0 text-text-tertiary" aria-hidden="true" />
                        {task}
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ul>
          <p className="mt-5 flex items-center justify-center gap-2 text-sm text-text-secondary">
            <Lock size={16} aria-hidden="true" />
            تا تأیید نکنی، هیچ چیز ثبت نمی‌شه.
          </p>
        </aside>
      </div>
    </div>
  )
}

export const Route = createFileRoute('/first-entry')({ component: FirstEntry })
