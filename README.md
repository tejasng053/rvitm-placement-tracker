# RVITM Placement Tracker

A responsive placement dashboard for RVITM's Class of 2027, covering CSE, ISE, and ECE. Track unique students, branch counts, full-time offers, internships, and percentages with durable saved updates.

## Features

- Overall selection rate based on the batch total; a separate eligible-student rate.
- Unknown eligibility and branch strengths remain unknown rather than becoming zero.
- Separate student counts for internship only, internship + confirmed FTE, internship + performance-based FTE, and direct full-time offers. Unclear PPO terms have their own category. Choose which offers contribute to the headline.
- Deduplication by USN, with normalized name fallback when a USN is unavailable.
- Shortlists are not entered as offers. Waitlists and training fellowships do not count.
- Cumulative progress by announcement date, branch breakdowns, search, and offer filters.
- Add or edit selections, record source references, and update batch details.
- Append-only saved revisions with optimistic concurrency checks and idempotent retries.

The public repository contains **application code only**. Student records, WhatsApp exports, attachments, credentials, and local database files are excluded. The deployed personal tracker is private and stores records in Cloudflare D1. Do not change its audience to public without adding explicit server-side write authorization.

## Run locally

Requires Node.js 22.13+ (Node.js 24 recommended).

```sh
npm ci
npm run build
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0000_greedy_marvel_boy.sql
npm run dev
```

Open the URL printed by the dev server. The new local database starts empty with an editable batch total of 400. A standalone deployment must supply the `DB` D1 binding and an authenticated access boundary. The original Site identity in `.openai/hosting.json` is not a reusable deployment credential.

```sh
npx tsc --noEmit
node --experimental-strip-types --test tests/tracker.test.mjs
```

## Data model and counting

`lib/tracker.ts` owns validation and counting. Each offer has an ID, student name, optional USN, branch, company, type, announcement date, source, and note. One student can have several offers but contributes only once to the overall total. Exclusive category cards use each student’s strongest offer: direct FTE, internship + confirmed FTE, internship + performance-based FTE, unclear PPO, internship only. These cards do not overlap; the offer table retains every selection.

- Overall rate: unique included students / total students × 100.
- Eligible rate: unique included students / eligible students × 100; unavailable for an unknown or zero denominator.
- Branch rate: selected students in a branch / that branch's total; unavailable until supplied.
- Internship PPOs are explicitly conditional until a source confirms full-time employment. A PPO with unspecified conditions is flagged instead of guessed.
- Announcement dates describe selections, not verified joining or offer acceptance dates.

## Updating from chat

Send the latest placement-group messages or an export in the Codex task. Reconcile candidates with the existing live records, preserve existing records, deduplicate USNs, and attach message dates/source references. Do not count advertisements, interview shortlists, registrations, waitlists, training-only programs, other colleges, or other batches.

The private service endpoint is `GET /api/tracker` and `POST /api/tracker`. Sites service access uses an `OAI-Sites-Authorization` bearer credential obtained for that exact private Site. Never place it in browser code or Git.

`scripts/tracker-data.mjs` accepts a single JSON line over hidden stdin:

- Read: `action`, `url`, `token`, `outputFile` (absolute private scratch path).
- Update: `action`, `url`, `token`, `inputFile`, optional `outputFile`.

An update file contains `baseVersion` from the last read, a complete validated `state`, a short `summary`, and a stable UUID `requestId`. Retain the same request ID when retrying an uncertain submission. A conflicting version returns HTTP 409; re-read and reconcile changes. Reads and writes must target only the selected Site. Import files and live data stay outside the public repository.

## Stack

React 19, TypeScript, Vinext/Vite, Cloudflare Workers + D1, Drizzle schema migrations, and Lucide icons. Database queries use prepared statements. The production database is independent of local previews and Git; publishing code does not import or reset placement data.
