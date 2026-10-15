// Scores a run of run.mjs against the bar of Discussion 029 §10 and writes a readable digest.
// Usage: node score.mjs results/name.json [--digest results/name.md]
import { readFileSync, writeFileSync } from 'node:fs'

const [file, flag, digestPath] = process.argv.slice(2)
if (!file) {
  console.error('usage: node score.mjs <results.json> [--digest <digest.md>]')
  process.exit(2)
}
const run = JSON.parse(readFileSync(file, 'utf8'))
const cases = Object.fromEntries(JSON.parse(readFileSync(new URL('./cases.json', import.meta.url), 'utf8'))
  .map(item => [item.id, item]))

// ---- Persian calendar check: a weekday, day and month written together must be one real date ----
const MONTHS = ['فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور', 'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند']
const WEEKDAYS = ['یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنجشنبه', 'جمعه', 'شنبه']
const digits = text => text.replace(/[۰-۹]/g, d => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d))).replace(/[٠-٩]/g, d => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)))
const persian = new Intl.DateTimeFormat('en-u-ca-persian-nu-latn', { day: 'numeric', month: 'numeric', year: 'numeric', timeZone: 'UTC' })
const calendar = new Map()
const origin = new Date(run.ranAt ?? Date.now())
for (let offset = -60; offset <= 800; offset++) {
  const date = new Date(Date.UTC(origin.getUTCFullYear(), origin.getUTCMonth(), origin.getUTCDate() + offset))
  const parts = Object.fromEntries(persian.formatToParts(date).map(x => [x.type, x.value]))
  const key = `${Number(parts.day)} ${MONTHS[Number(parts.month) - 1]}`
  if (!calendar.has(key)) calendar.set(key, [])
  calendar.get(key).push({ weekday: date.getUTCDay(), iso: date.toISOString().slice(0, 10) })
}
const weekdayIndex = name => ({ 'یکشنبه': 0, 'یک‌شنبه': 0, 'دوشنبه': 1, 'سه‌شنبه': 2, 'سه شنبه': 2, 'چهارشنبه': 3,
  'پنجشنبه': 4, 'پنج‌شنبه': 4, 'جمعه': 5, 'شنبه': 6 })[name]
const datePattern = new RegExp(`(?:(یک‌?شنبه|دوشنبه|سه[‌ ]?شنبه|چهارشنبه|پنج‌?شنبه|جمعه|شنبه)\\s+)?(\\d{1,2})\\s+(${MONTHS.join('|')})(?:\\s+\\d{4})?(?:\\s*\\((\\d{4}-\\d{2}-\\d{2})\\))?`, 'g')
function dateErrors(text) {
  const errors = []
  for (const match of digits(text ?? '').matchAll(datePattern)) {
    const [whole, weekday, day, month, iso] = match
    const candidates = calendar.get(`${Number(day)} ${month}`) ?? []
    if (candidates.length === 0) { errors.push(whole); continue }
    // The nearest occurrence after the run, unless the text pins it.
    const pinned = iso ? candidates.find(x => x.iso === iso) : null
    if (iso && !pinned) { errors.push(whole); continue }
    const date = pinned ?? candidates.find(x => x.iso >= origin.toISOString().slice(0, 10)) ?? candidates.at(-1)
    if (weekday && weekdayIndex(weekday.replace(' ', '‌')) !== date.weekday && weekdayIndex(weekday) !== date.weekday) errors.push(whole)
  }
  return errors
}
void WEEKDAYS

// ---- Per case ----
const rows = run.results.map(record => {
  const item = cases[record.id] ?? {}
  const questions = record.turns.flatMap(turn => turn.questions)
  const draft = record.draft
  const proposals = draft?.proposals?.map(x => x.proposal) ?? []
  const childOf = id => proposals.filter(x => x.parentDraftId === id)
  const hasWork = id => childOf(id).some(x => ['TASK', 'ROUTINE'].includes(x.entityType) || hasWork(x.draftId))
  const emptyParents = proposals.filter(x => ['GOAL', 'PROJECT'].includes(x.entityType) && !hasWork(x.draftId))
  const publicAsk = questions.filter(q => (item.publicFacts ?? []).some(pattern => new RegExp(pattern).test(q.text)))
  const texts = [draft?.summary, ...(draft?.assumptions ?? []).map(x => x.text), ...(draft?.unresolvedQuestions ?? []).map(x => x.text),
    ...proposals.map(x => x.title), ...questions.flatMap(q => [q.text, ...(q.options ?? [])])]
  const blocking = draft ? [...draft.draftIssues, ...draft.proposals.flatMap(x => x.issues), ...draft.facts.flatMap(x => x.issues)]
    .filter(x => x.severity === 'BLOCKING').map(x => x.code) : []
  const count = type => proposals.filter(x => x.entityType === type).length
  return {
    id: record.id,
    seconds: Math.round(record.ms / 100) / 10,
    turns: record.turns.length,
    questions: questions.length,
    maxOptions: Math.max(0, ...questions.map(q => q.options?.length ?? 0)),
    entityTypeQuestions: questions.filter(q => q.kind === 'ENTITY_TYPE').length,
    publicFactQuestions: publicAsk.map(q => q.text),
    outcome: record.final?.outcome ?? record.final?.failureCode ?? record.error ?? 'NONE',
    drafted: Boolean(draft),
    approvable: Boolean(draft?.canApply),
    blocking,
    emptyParents: emptyParents.map(x => x.title),
    dateErrors: texts.flatMap(dateErrors),
    removed: draft?.removedItems?.length ?? 0,
    goals: count('GOAL'), projects: count('PROJECT'), tasks: count('TASK'), routines: count('ROUTINE'),
    datedTasks: proposals.filter(x => x.entityType === 'TASK' && x.plannedDate).length,
    sequences: new Set(proposals.map(x => x.sequenceKey).filter(Boolean)).size
  }
})

// ---- The bar (029 §10) ----
const n = rows.length
const share = predicate => rows.filter(predicate).length
const median = values => { const sorted = [...values].sort((a, b) => a - b); return sorted.length ? sorted[Math.floor((sorted.length - 1) / 2)] : 0 }
// The promise counts a person reading and answering; 15 seconds per question is an assumed allowance.
const withPerson = rows.map(x => x.seconds + 15 * x.questions)
const bar = [
  ['Approvable without a blocking issue ≥ 95%', share(x => x.approvable), n, share(x => x.approvable) / n >= 0.95],
  ['Entity-type questions = 0', rows.reduce((s, x) => s + x.entityTypeQuestions, 0), null, rows.every(x => x.entityTypeQuestions === 0)],
  ['Drafts asking a public fact ≤ 10%', share(x => x.publicFactQuestions.length > 0), n, share(x => x.publicFactQuestions.length > 0) / n <= 0.1],
  ['Drafts with an empty Goal or Project = 0', share(x => x.emptyParents.length > 0), n, rows.every(x => x.emptyParents.length === 0)],
  ['Persian date errors = 0', rows.reduce((s, x) => s + x.dateErrors.length, 0), null, rows.every(x => x.dateErrors.length === 0)],
  ['Median time to draft with a person < 120 s', median(withPerson), null, median(withPerson) < 120]
]
console.log(`Run: ${file}${run.label ? ` (${run.label})` : ''}, ${n} cases`)
for (const [name, value, of, pass] of bar) console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}: ${value}${of ? ` of ${of}` : ''}`)
console.log(`Report: median system time ${median(rows.map(x => x.seconds))} s; turns ${rows.reduce((s, x) => s + x.turns, 0)} ` +
  `(${share(x => x.turns > 1)} cases with more than one); questions ${rows.reduce((s, x) => s + x.questions, 0)}; ` +
  `removed items ${rows.reduce((s, x) => s + x.removed, 0)}; failed ${share(x => !x.drafted)}`)
console.log('')
console.log('case               sec  turns q  outcome          apply items(G/P/T/R) dated seq  problems')
for (const x of rows) {
  const problems = [...x.blocking, ...x.emptyParents.map(t => `EMPTY:${t}`), ...x.publicFactQuestions.map(() => 'PUBLIC_FACT_Q'),
    ...x.dateErrors.map(d => `DATE:${d}`), ...(x.entityTypeQuestions ? ['ENTITY_TYPE_Q'] : [])]
  console.log(`${x.id.padEnd(18)} ${String(x.seconds).padStart(5)} ${String(x.turns).padStart(3)} ${String(x.questions).padStart(2)}  ` +
    `${String(x.outcome).padEnd(16)} ${x.approvable ? 'yes' : 'no '}   ${x.goals}/${x.projects}/${x.tasks}/${x.routines}`.padEnd(12) +
    `      ${String(x.datedTasks).padStart(3)} ${String(x.sequences).padStart(3)}  ${problems.join(', ')}`)
}

// ---- Digest for a person to judge usefulness ----
if (flag === '--digest' && digestPath) {
  const lines = [`# Planning evaluation digest`, '', `Run \`${file}\`${run.label ? ` — ${run.label}` : ''}, ${run.ranAt}.`, '']
  for (const record of run.results) {
    const row = rows.find(x => x.id === record.id)
    lines.push(`## ${record.id} — ${row.outcome}, ${row.seconds} s`, '', `> ${record.intention}`, '')
    for (const turn of record.turns) {
      lines.push(`**Turn ${turn.turn}**`, '')
      turn.questions.forEach((q, index) => {
        const given = turn.answers[index]
        const picked = given?.options?.length ? given.options.map(i => q.options[i]).join('، ') : `«${given?.text ?? ''}»`
        lines.push(`- [${q.kind}${q.multiple ? ', چندتایی' : ''}] ${q.text}${q.options?.length ? `  \n  گزینه‌ها: ${q.options.join(' | ')}` : ''}  \n  پاسخ: ${picked}`)
      })
      lines.push('')
    }
    const draft = record.draft
    if (!draft) { lines.push(record.error ?? record.final?.failureCode ?? 'no draft', ''); continue }
    lines.push(`**Draft** (${draft.canApply ? 'approvable' : 'NOT approvable'}): ${draft.summary}`, '')
    const proposals = draft.proposals
    const show = (view, depth) => {
      const x = view.proposal
      const bits = [x.plannedDate && `📅 ${x.plannedDate}`, x.deadline && `⏰ ${x.deadline}`, x.targetDate && `🎯 ${x.targetDate}`,
        x.recurrence && `🔁 ${x.recurrence.type}${x.recurrence.daysOfWeek ? ` [${x.recurrence.daysOfWeek}]` : ''}${x.timesOfDay?.length ? ` ${x.timesOfDay.join(',')}` : ''}`,
        x.sequenceKey && `⛓ ${x.sequenceKey}#${x.sequenceOrder}`, view.issues.length && `⚠ ${view.issues.map(i => `${i.code}:${i.severity}`).join(',')}`].filter(Boolean)
      lines.push(`${'  '.repeat(depth)}- ${x.entityType} **${x.title}** ${bits.join(' ')}`)
      proposals.filter(c => c.proposal.parentDraftId === x.draftId).forEach(c => show(c, depth + 1))
    }
    proposals.filter(v => !v.proposal.parentDraftId).forEach(v => show(v, 0))
    if (draft.facts.length) lines.push('', `Facts: ${draft.facts.map(f => `${f.fact.factType}=${JSON.stringify(f.fact.value)}`).join('; ')}`)
    if (draft.assumptions.length) lines.push('', `Assumptions: ${draft.assumptions.map(x => x.text).join(' / ')}`)
    if (draft.unresolvedQuestions.length) lines.push('', `Unresolved: ${draft.unresolvedQuestions.map(x => x.text).join(' / ')}`)
    if (draft.removedItems?.length) lines.push('', `Removed: ${draft.removedItems.map(x => x.title ?? x.entityType).join(' / ')}`)
    lines.push('')
  }
  writeFileSync(digestPath, lines.join('\n'))
  console.log(`\nDigest written to ${digestPath}`)
}
