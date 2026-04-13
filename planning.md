# pakt — planning

Living doc of outstanding work. Tick items off as they ship. Authoritative plan of record; deeper context lives in `~/.claude/plans/graceful-weaving-volcano.md`.

## Status snapshot

Shipped milestones:

- **Milestone 0** — scaffold, auth, schema, first migration
- **Milestone 1** — inventory, triage chips, dashboard predictions, boxes, QR labels, scan, pack, unpack
- **Milestone 2** — photos, full triage page, PWA install + service worker, decision quiz, item edit + volume/weight overrides
- **Auth swap** — Clerk → Neon Auth (`@neondatabase/auth`)
- **Theme** — dark default with violet primary, toggle in avatar menu
- **Labels v2** — 40×30 mm PNG via `ImageResponse`, rotated text, single and batch-ZIP downloads, mobile "Save to Photos" via Web Share API
- **Rooms v2** — closet hierarchy (parent room), origin/destination tabs, rename/delete UI, mirror origin → destination, drill-down on both sides, hierarchical prefix in pickers
- **Item search** — `/[moveId]/search` with ILIKE across name/notes/category/rooms, photo + box location + disposition chips in each result

---

## Up next

Pick based on what helps your actual move most. Rough order of impact:

### 1. Offline write queue (IndexedDB) — medium effort, high value

PWA install + SW is live, but every write (add item, attach photo, change disposition) requires network. Inventory capture in basement / garage / spotty Wi‑Fi spots currently blocks.

- Typed outbox in IndexedDB (via `idb`, already in deps): `{ kind: 'addItem' | 'attachPhoto' | 'updateDisposition' | …, clientId, payload }`
- Client `enqueue()` used by item form and disposition chips when offline (or optimistically always)
- Flush triggered by: SW `sync` event, `online` event, app focus
- Idempotency key so the server can dedupe on retries
- Surface a "pending changes" pill in the header when the queue is non-empty

### 2. Pre-move checklist — small-to-medium effort

Curated task list seeded on move creation. Helps with non-pakt move tasks: USPS address change, modem return, movers booked, utilities transferred, etc.

- New table `checklist_items (id, moveId, text, doneAt nullable, category enum('30d','2w','week','day','after'), sortOrder)`
- Seed ~15 defaults in `createMove`
- New page `/[moveId]/checklist` with grouped sections, optimistic toggle, add/edit/delete
- Nav entry (desktop only — mobile is at capacity)

### 3. Inventory PDF export — small effort

For insurance claims, mover estimates, personal records.

- `src/app/api/inventory/pdf/route.ts` using `@react-pdf/renderer` (new dep)
- Cover page: move name, date, totals by disposition, box count, truck recommendation
- Item rows: name, category, qty, disposition, source room, destination room, notes (no photos in v1 — keeps file size sane)
- "Download inventory PDF" button on the dashboard

### 4. Donation receipt tracker — medium effort

Tax-season helper. Group donated items by drop-off trip, attach receipt photo, total estimated value.

- New table `donation_batches (id, moveId, donatedOn date, organization text, receiptBlobUrl/Pathname nullable, notes)`
- Nullable FK on `items`: `donationBatchId`
- Routes: `/[moveId]/donations`, `/[moveId]/donations/new`, `/[moveId]/donations/[batchId]`
- Reuses `CameraCapture` for the receipt photo
- Dashboard summary card: total donated value across batches
- Triage / item edit: "Assign to donation batch" action when disposition is `donate`

---

## Polish / tech debt

Small-to-medium quality-of-life fixes.

- [ ] **`revalidateTag` migration.** Replace the current `revalidatePath('/{moveId}', 'layout')` broad invalidations with tag-based (`move:${id}:inventory`, `move:${id}:dashboard`, `move:${id}:boxes`). Cleaner and ready for Next.js Cache Components when we adopt them.
- [ ] **Drizzle-kit snapshot resync.** `pnpm db:generate` still prompts for a rename left over from the Clerk → Neon Auth migration. Next time there's a schema change, run in a TTY terminal and answer the rename prompts to reset the snapshot state.
- [ ] **iOS PWA + Neon Auth cookie.** Standalone-mode iOS can drop session cookies on cold launch. Untested since the auth swap; verify on a real iPhone after "Add to Home Screen".
- [ ] **Rooms: mobile nav overflow.** Mobile bottom nav is at 5 tabs (Inventory · Triage · Search · Boxes · Scan) — Dashboard moved to header breadcrumb. Tight but works. Revisit if we add a 6th.
- [ ] **`DispositionChips` missing "sold".** Schema enum has it; UI has 5 of 6. Low priority — add when the post-move-reconciliation flow is needed.
- [ ] **Labels print app: orientation hint.** Some thermal printer apps import PNG landscape-only; our 472×354 fits fine. Document in a small tooltip on `/labels` if it trips people up.

---

## Deferred / maybe-never

- **Household sharing** — share a move with another Neon Auth user. Requires invite/accept flow or Neon Auth orgs. Worth it only if someone else will help you pack.
- **Multi-photo reorder** — drag to choose which photo is the primary thumbnail. Nice but not load-bearing.
- **Loose vs tight truck packing setting** — the 15% safety margin in `predictions.ts` is baked in; exposing a toggle for experienced movers would improve accuracy.
- **Custom categories per move** — global `item_categories` table today. Add per-user / per-move override table when a user actually wants to override a default.
- **Truck chart on dashboard** — visual showing how packed the recommended truck is. Today we show size + cuft.

---

## Conventions reminder

- **DB migrations**: `pnpm db:generate` then `pnpm db:migrate`. Never `push`. Commit the generated SQL.
- **Dev / prod share one Neon DB + Blob** by design. Migrations must be additive-safe.
- **Run in a TTY** when drizzle-kit needs a rename prompt — piped shells error out.
- **Neon Auth** lives under `src/lib/auth/` with lazy proxy. Don't reintroduce Clerk.
- **Theme tokens** via `globals.css` `@theme inline`. Dark default with violet primary.
