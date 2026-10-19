// Planning evaluation runner (STEP-22, Discussion 029 §10).
// Runs every case of cases.json through the real planning endpoints of a running backend, answers
// questions the way the case's persona would, and stores what was asked and what was drafted.
//
// Usage: node run.mjs --base https://127.0.0.1:7077 --out results/name.json [--only id,id] [--label text] [--week2]
//        [--redo "<correction>"]
// --week2 (STEP-24): each first week is approved, lived through crudely and brought to its end, and
// the next week is then planned from the continuation offer, the way «برنامهٔ هفتهٔ بعد» does.
// --redo (013 §10): each first draft is made again from the review with this correction, the way
// «اصلاح یا نسخهٔ دیگر» does; `--redo true` asks for another version without a correction.
// The backend must run in Development on loopback (the test-session endpoint), with the planning
// provider and generous rate limits configured. See README.md.
import { randomUUID } from 'node:crypto'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname } from 'node:path'

const args = Object.fromEntries(process.argv.slice(2).reduce((pairs, arg, index, all) =>
  arg.startsWith('--') ? [...pairs, [arg.slice(2), all[index + 1]?.startsWith('--') ? true : all[index + 1] ?? true]] : pairs, []))
if (!args.base || !args.out) {
  console.error('usage: node run.mjs --base <backend url> --out <results.json> [--only id,id] [--label text] [--week2] [--redo text]')
  process.exit(2)
}
// The local backend uses a development certificate.
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'

const api = `${args.base.replace(/\/$/, '')}/api/v1`
const origin = 'http://127.0.0.1:5174'
const only = args.only?.split(',')
const cases = JSON.parse(readFileSync(new URL('./cases.json', import.meta.url), 'utf8'))
  .filter(item => !only || only.includes(item.id))

let cookie = ''
async function call(method, path, body) {
  const response = await fetch(api + path, {
    method,
    headers: { Origin: origin, 'Content-Type': 'application/json', 'Idempotency-Key': randomUUID(), Cookie: cookie },
    body: body && JSON.stringify(body)
  })
  for (const set of response.headers.getSetCookie?.() ?? []) {
    const pair = set.split(';')[0]
    const name = pair.split('=')[0]
    cookie = [...cookie.split('; ').filter(x => x && !x.startsWith(`${name}=`)), pair].join('; ')
  }
  const text = await response.text()
  if (!response.ok) throw new Error(`${method} ${path} ${response.status} ${text.slice(0, 300)}`)
  return text ? JSON.parse(text) : null
}

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms))
async function settle(id) {
  for (;;) {
    const attempt = await call('GET', `/planning/attempts/${id}`)
    if (!['QUEUED', 'RUNNING'].includes(attempt.status)) return attempt
    await sleep(500)
  }
}

// A crude stand-in for a person: an option is chosen when it shares words with the persona,
// otherwise the persona is written in «خودت بنویس».
const words = text => new Set(text.replace(/[‌.,،؛:!?؟()«»"']/g, ' ').split(/\s+/).filter(x => x.length > 1))
function answer(question, persona) {
  const mine = words(persona)
  const scored = (question.options ?? []).map((label, index) => ({
    index, score: [...words(label)].filter(x => mine.has(x)).length
  }))
  const best = Math.max(0, ...scored.map(x => x.score))
  if (best === 0) return { questionId: question.id, text: persona.slice(0, 500) }
  const chosen = scored.filter(x => question.multiple ? x.score > 0 : x.score === best).map(x => x.index)
  return { questionId: question.id, options: question.multiple ? chosen : chosen.slice(0, 1) }
}

/** One planning flow to its end: questions answered as the persona would, then the draft. */
async function plan(record, item, start) {
  const begin = { clientAttemptId: randomUUID().replaceAll('-', ''), ...start }
  let attempt = await settle((await call('POST', '/planning/attempts', begin)).id)
  record.attemptIds.push(attempt.id)
  while (attempt.status === 'SUCCEEDED' && attempt.outcome === 'CLARIFICATION' && attempt.clarification?.questions?.length) {
    const questions = attempt.clarification.questions
    const answers = questions.map(question => answer(question, item.persona))
    record.turns.push({ turn: attempt.clarification.turn, message: attempt.clarification.message, questions, answers })
    attempt = await settle((await call('POST', '/planning/attempts', {
      ...begin, clientAttemptId: randomUUID().replaceAll('-', ''), previousAttemptId: attempt.id, answers
    })).id)
    record.attemptIds.push(attempt.id)
  }
  record.final = { status: attempt.status, outcome: attempt.outcome, failureCode: attempt.failureCode,
    clarification: attempt.clarification }
  if (attempt.draftId) record.draft = await call('GET', `/planning/drafts/${attempt.draftId}`)
}

/** Approves a draft through its server preview, acknowledging its warnings as a person reading them would. */
async function approve(draft) {
  const preview = await call('POST', `/planning/drafts/${draft.id}/previews`, { expectedRevision: draft.revision })
  return await call('POST', `/planning/confirmations/${preview.id}/submit`, {
    acknowledgedWarnings: preview.warnings.map(x => ({ warningId: x.warningId, warningHash: x.warningHash }))
  })
}

/**
 * STEP-24: the first week is approved and lived through crudely (about 40% of its Tasks done in
 * their order, one dropped, the rest left), brought to its last day, and the next week is planned
 * from the offer. Routine slots of the past are not simulated: the rewind moves the week, not its slots.
 */
async function secondWeek(record, item) {
  const week = record.week2
  if (!record.draft?.canApply) { week.skipped = 'the first week is not approvable'; return }
  const applied = await approve(record.draft)
  const scope = applied.goalId ? { goalId: applied.goalId } : applied.projectIds.length === 1 ? { projectId: applied.projectIds[0] } : null
  if (!scope) { week.skipped = 'the first week planned no Goal or single Project'; return }
  const { localDate } = await call('GET', '/today')
  const tasks = async () => Promise.all(applied.taskIds.map(id => call('GET', `/tasks/${id}`)))
  const open = list => list.filter(x => x.status === 'ACTIVE' && !x.isBlocked)
    .sort((a, b) => (a.plannedDate ?? '9').localeCompare(b.plannedDate ?? '9'))
  const target = Math.round(applied.taskIds.length * 0.4)
  week.done = []
  while (week.done.length < target) {
    const [next] = open(await tasks())
    if (!next) break
    await call('POST', `/tasks/${next.id}/complete`, { expectedVersion: next.version, completedForLocalDate: localDate })
    week.done.push(next.title)
  }
  const remaining = open(await tasks())
  if (remaining.length > 1) {
    const dropped = remaining.at(-1)
    await call('POST', `/tasks/${dropped.id}/drop`, { expectedVersion: dropped.version })
    week.dropped = dropped.title
  }
  const left = (await tasks()).filter(x => x.status === 'ACTIVE')
  week.left = left.map(x => x.title)
  const query = scope.goalId ? `goalId=${scope.goalId}` : `projectId=${scope.projectId}`
  await call('POST', `/dev/planning-windows/rewind?days=6&${query}`)

  const offer = (await call('GET', '/planning/continuations')).find(x => x.scopeId === (scope.goalId ?? scope.projectId))
  if (!offer) { week.skipped = 'no offer at the end of the week'; return }
  week.offer = offer
  // What already exists in the scope, for the duplicate checks of the score.
  const projects = (await call('GET', '/projects?limit=100')).items
    .filter(x => (scope.goalId ? x.goalId === scope.goalId : x.id === scope.projectId) && x.status === 'ACTIVE')
  week.existing = {
    projects: projects.map(x => x.title),
    routines: await Promise.all(applied.routineIds.map(async id => (await call('GET', `/routines/${id}`)).title)),
    openTasks: week.left
  }
  await plan(week, item, { intention: 'برنامهٔ هفتهٔ بعد', goalId: null, projectId: null, replaceActive: true,
    continuationOfWindowId: offer.windowId })
}

/** 013 §10: the draft made again from its own flow with the correction, as «اصلاح» on the review does. */
async function redo(record) {
  const first = record.draft
  const correction = args.redo === true ? null : args.redo
  record.redo = { correction, startedAt: Date.now() }
  const attempt = await settle((await call('POST', '/planning/attempts', {
    clientAttemptId: randomUUID().replaceAll('-', ''), intention: record.intention, replaceActive: false,
    redo: { draftId: first.id, expectedRevision: first.revision, correction }
  })).id)
  record.redo.final = { status: attempt.status, outcome: attempt.outcome, failureCode: attempt.failureCode,
    clarification: attempt.clarification }
  if (attempt.draftId) record.redo.draft = await call('GET', `/planning/drafts/${attempt.draftId}`)
  record.redo.ms = Date.now() - record.redo.startedAt
}

await call('POST', '/dev/test-session', {})
const results = []
for (const item of cases) {
  const record = { id: item.id, intention: item.intention, turns: [], attemptIds: [], startedAt: Date.now() }
  try {
    await plan(record, item, { intention: item.intention, goalId: null, projectId: null, replaceActive: true })
    if (args.redo && record.draft) {
      try { await redo(record) } catch (error) { record.redo = { ...record.redo, error: String(error.message ?? error) } }
    }
    if (args.week2) {
      record.week2 = { turns: [], attemptIds: [], startedAt: Date.now() }
      try { await secondWeek(record, item) } catch (error) { record.week2.error = String(error.message ?? error) }
      record.week2.ms = Date.now() - record.week2.startedAt
    }
  } catch (error) {
    record.error = String(error.message ?? error)
  }
  record.ms = Date.now() - record.startedAt
  results.push(record)
  const draft = record.draft
  console.log(`${item.id.padEnd(18)} ${String(Math.round(record.ms / 1000)).padStart(3)}s turns ${record.turns.length}`,
    record.final?.outcome ?? record.final?.failureCode ?? record.error?.slice(0, 120),
    draft ? `canApply=${draft.canApply} items=${draft.proposals.length}` : '',
    record.week2 ? `| week 2 ${Math.round(record.week2.ms / 1000)}s turns ${record.week2.turns.length} ` +
      (record.week2.draft ? `canApply=${record.week2.draft.canApply} items=${record.week2.draft.proposals.length}`
        : record.week2.skipped ?? record.week2.final?.failureCode ?? record.week2.error?.slice(0, 120)) : '',
    record.redo ? `| redo ${Math.round((record.redo.ms ?? 0) / 1000)}s ` + (record.redo.draft
      ? `canApply=${record.redo.draft.canApply} items=${record.redo.draft.proposals.length}`
      : record.redo.final?.outcome ?? record.redo.final?.failureCode ?? record.redo.error?.slice(0, 120)) : '')
  mkdirSync(dirname(args.out), { recursive: true })
  writeFileSync(args.out, JSON.stringify({ label: args.label ?? null, base: args.base, ranAt: new Date().toISOString(), results }, null, 1))
}
