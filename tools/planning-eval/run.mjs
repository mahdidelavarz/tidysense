// Planning evaluation runner (STEP-22, Discussion 029 §10).
// Runs every case of cases.json through the real planning endpoints of a running backend, answers
// questions the way the case's persona would, and stores what was asked and what was drafted.
//
// Usage: node run.mjs --base https://127.0.0.1:7077 --out results/name.json [--only id,id] [--label text]
// The backend must run in Development on loopback (the test-session endpoint), with the planning
// provider and generous rate limits configured. See README.md.
import { randomUUID } from 'node:crypto'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname } from 'node:path'

const args = Object.fromEntries(process.argv.slice(2).reduce((pairs, arg, index, all) =>
  arg.startsWith('--') ? [...pairs, [arg.slice(2), all[index + 1]]] : pairs, []))
if (!args.base || !args.out) {
  console.error('usage: node run.mjs --base <backend url> --out <results.json> [--only id,id] [--label text]')
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

await call('POST', '/dev/test-session', {})
const results = []
for (const item of cases) {
  const record = { id: item.id, intention: item.intention, turns: [], attemptIds: [], startedAt: Date.now() }
  try {
    const start = { clientAttemptId: randomUUID().replaceAll('-', ''), intention: item.intention,
      goalId: null, projectId: null, replaceActive: true }
    let attempt = await settle((await call('POST', '/planning/attempts', start)).id)
    record.attemptIds.push(attempt.id)
    while (attempt.status === 'SUCCEEDED' && attempt.outcome === 'CLARIFICATION' && attempt.clarification?.questions?.length) {
      const questions = attempt.clarification.questions
      const answers = questions.map(question => answer(question, item.persona))
      record.turns.push({ turn: attempt.clarification.turn, message: attempt.clarification.message, questions, answers })
      attempt = await settle((await call('POST', '/planning/attempts', {
        ...start, clientAttemptId: randomUUID().replaceAll('-', ''), previousAttemptId: attempt.id, answers
      })).id)
      record.attemptIds.push(attempt.id)
    }
    record.final = { status: attempt.status, outcome: attempt.outcome, failureCode: attempt.failureCode,
      clarification: attempt.clarification }
    if (attempt.draftId) record.draft = await call('GET', `/planning/drafts/${attempt.draftId}`)
  } catch (error) {
    record.error = String(error.message ?? error)
  }
  record.ms = Date.now() - record.startedAt
  results.push(record)
  const draft = record.draft
  console.log(`${item.id.padEnd(18)} ${String(Math.round(record.ms / 1000)).padStart(3)}s turns ${record.turns.length}`,
    record.final?.outcome ?? record.final?.failureCode ?? record.error?.slice(0, 120),
    draft ? `canApply=${draft.canApply} items=${draft.proposals.length}` : '')
  mkdirSync(dirname(args.out), { recursive: true })
  writeFileSync(args.out, JSON.stringify({ label: args.label ?? null, base: args.base, ranAt: new Date().toISOString(), results }, null, 1))
}
