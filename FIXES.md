# Bug Fixes — 2026-04-04

## Fix 1: Requests Page — Empty Family List

**Root cause**: The page queries `family.head_its_no` via a PostgREST foreign-key join. But
`importCoreMembers` only writes `sabeel_no` + `paci_no` to the `family` table — `head_its_no` is
never set (always NULL). PostgREST returns an empty join result, so `families` is always `[]`.

**Fix**: Rewrite the server-side data fetch to query the `mumin` table directly. Group members by
`sabeel_no` in-memory and use the first member of each group as the family representative.
Building names are resolved via `family.paci_no → house.building_id → building.building_name`.

**Files changed**:
- `app/(dashboard)/requests/page.tsx`

---

## Fix 2: Admin Users Page — Shows No Users

**Root cause**: Page queries `.not('supabase_auth_id', 'is', null)` + `.limit(100)`.
The CSV import never succeeded in creating auth accounts (see Fix 3), so all 7000+ members
have `supabase_auth_id = NULL` — the filter returns zero rows.

**Fix**:
- Remove `supabase_auth_id IS NOT NULL` filter → show ALL mumin
- Remove `limit(100)`, replace with `limit(2000)` (sufficient for this use case)
- Add client-side search bar in `UsersClient.tsx` (filter by name or ITS no)
- Add pagination (50 per page)

**Files changed**:
- `app/(dashboard)/admin/users/page.tsx`
- `components/admin/UsersClient.tsx`

---

## Fix 3: CSV Import — Full Upsert, Auth Creation & Real-time Progress

**Problem**: The superadmin uploads a full CSV dump of ~7,000 mumin records. The import must:
1. Compare every row against the existing DB — detect new records and changed fields.
2. Upsert into all master tables: `building`, `house`, `family`, `mumin`.
3. For every **new** mumin (not previously in DB), create a Supabase auth account so they can log in:
   - `email: {its_no}@mumin.local`
   - `password`: `paci_no` from the `family` table (fallback to ITS no)
   - `must_change_password: true`
   - Role defaults to `mumineen`; restricted access applies immediately based on that role.
4. Do **not** re-create auth accounts for mumin who already have `supabase_auth_id` set.
5. Stream real-time progress back to the browser so the superadmin can watch the import happen
   row-by-row without waiting for a full response.
6. Surface every error inline (duplicate key, missing field, auth failure, etc.) — do not silently
   swallow failures.

**Fix**:
- **Batch DB writes**: collect all payloads during a validation pass, then commit in batches of
  500 rows per `upsert` call. Reduces ~28,000 individual DB round-trips to ~50.
- **Auth creation on insert only**: after each batch, query which newly inserted mumin still have
  `supabase_auth_id = NULL` and call `auth.admin.createUser` only for those. This avoids hitting
  the Supabase Auth rate limit (~30 req/min) for existing mumin.
- **SSE streaming**: the route returns `Content-Type: text/event-stream`. Progress events pushed
  in real time:
  - `{ type: 'start', total: N }`
  - `{ type: 'progress', phase: string, processed: N, total: N, inserted: N, updated: N, errors: N }`
  - `{ type: 'error', row: N, its_no: string, message: string }` — one event per bad row
  - `{ type: 'done', result: ImportResult }`
- `maxDuration` set to `300` seconds (Vercel max) to handle large files.
- The browser UI reads the SSE stream incrementally and shows:
  - Current phase label (e.g. "Upserting buildings…", "Creating auth accounts…")
  - Animated progress bar (processed / total)
  - Live error list that grows as errors arrive
  - Final summary panel on `done`

**Files changed**:
- `lib/import/importCoreMembers.ts`
- `app/api/import/core/route.ts`
- `components/import/ImportForm.tsx`

---

## Fix 4: CSV Import — Processes Only ~25 Rows Then Stops

**Root cause**: `auth.admin.createUser` is called once per NEW row. Supabase's Admin Auth API
has a rate limit (~30 requests/minute on free and pro plans). After ~25–30 rows the import stalls
or the calls fail silently, making it appear the import capped at 25.

**Fix**:
- **Remove `auth.admin.createUser` from the import entirely.** Auth accounts are now created
  on-demand in the Admin Users page (Fix 3) when a role is assigned.
- **Batch all DB writes**: instead of one `upsert` call per row for house/family/mumin, collect
  all payloads during a validation pass and commit in batches of 500. This reduces ~28,000 DB
  round-trips to ~50, dropping total processing time from minutes to seconds.
- **SSE streaming**: the API route returns `Content-Type: text/event-stream`. The import logic
  calls an `onProgress` callback, which the route pushes to the SSE stream. Events:
  - `{ type: 'start', total: N }`
  - `{ type: 'progress', phase: string, processed: N, total: N, inserted: N, updated: N, errors: N }`
  - `{ type: 'done', result: ImportResult }`
  - `{ type: 'error', message: string }`
- `maxDuration` raised to `300` seconds (Vercel max) to handle large files.

**Files changed**:
- `lib/import/importCoreMembers.ts`
- `app/api/import/core/route.ts`

---

## Fix 5: Import Form — Real-time Progress UI

**Root cause**: The `ImportForm` component uses a simple `await fetch(...)` and waits for the
full response. It shows a static "Processing import…" spinner with no actual feedback.

**Fix**: Switch from a plain JSON fetch to reading the SSE stream incrementally:
- Parse `data: {...}\n\n` events line-by-line as they arrive
- Show a phase label + animated progress bar (processed / total)
- On `done`, transition to the existing result panel

**Files changed**:
- `components/import/ImportForm.tsx`

---

## Fix 6: Mobile Navigation — Missing Pages

**Root cause**: `MobileHeader.tsx` has a hard-coded `NAV_ITEMS` array that is out of sync with
`AppSidebar.tsx`. Missing items: **Requests**, **Request Review**. Also `Admin` role is not
included in any of the existing mobile nav items (Dashboard, Members, etc.).

**Fix**: Mirror `AppSidebar.tsx`'s `NAV_ITEMS` exactly in `MobileHeader.tsx`.

**Files changed**:
- `components/layout/MobileHeader.tsx`

---

## Fix 7: Mobile Layout — Page Header Hidden Under Top Bar

**Root cause**: The dashboard layout's `<main>` has no top padding on mobile. The fixed
`MobileHeader` is `h-14` (56 px), so the top of each page's content is obscured.

**Fix**: Add `pt-14 md:pt-0` to the `<main>` wrapper in the dashboard layout.

**Files changed**:
- `app/(dashboard)/layout.tsx`

---

## Fix 8: Sheet `aria-describedby` Console Warning

**Root cause**: Radix's `Dialog` (underlying `Sheet`) requires either a `<Description>` child or
`aria-describedby={undefined}` on `<DialogContent>` when no visible description is provided.

**Fix**: Add `aria-describedby={undefined}` to the `SheetContent` element in `MobileHeader.tsx`.

**Files changed**:
- `components/layout/MobileHeader.tsx`

---

## Fix 9: Dashboard Accordions & Tables — Members Not Showing / Missing Values

**Problem**:
- The dashboard accordions (e.g. by building, family, umoor group) do not show member lists inside
  them — the accordions expand but are empty or show stale placeholder data.
- The member tables across the app have columns that render blank even though data exists in the DB
  (e.g. full name, ITS no, sabeel no, role, building/floor/flat).
- Some table columns were never wired to the correct field from the query response.

**Fix**:
- Audit every accordion component in the dashboard: ensure the data-fetch includes a `.select()`
  that pulls member rows and that the component maps over them correctly. If members are fetched
  separately, confirm the foreign-key or group-by key matches what the accordion uses.
- For each member table, cross-check every `<td>` / column definition against the actual fields
  returned by the Supabase query. Fix any mismatched field names (e.g. `full_name` vs `name`,
  `its_no` vs `its`).
- Add a quick smoke-test pass: open each table in the browser and confirm no column is universally
  blank across all rows. If a column is blank for all rows it is almost certainly a field-name
  mismatch or a missing `.select()` clause — fix the query, not the display logic.
- Ensure pagination/limit settings don't silently hide records (raise limits or add server-side
  pagination where needed).

**Files to check**:
- `app/(dashboard)/page.tsx` and any accordion sub-components
- `components/dashboard/*` — all accordion and stats card components
- `app/(dashboard)/admin/users/page.tsx` + `components/admin/UsersClient.tsx`
- `app/(dashboard)/members/page.tsx` (if it exists)
- Any other page that renders a member table

---

## Execution order

1. `app/(dashboard)/layout.tsx` — layout padding (trivial, no deps)
2. `components/layout/MobileHeader.tsx` — nav fix + aria fix
3. `app/(dashboard)/requests/page.tsx` — requests data fix
4. `app/(dashboard)/admin/users/page.tsx` — remove filter
5. `components/admin/UsersClient.tsx` — search + pagination
6. `lib/import/importCoreMembers.ts` — batch upsert + auth creation + SSE callback
7. `app/api/import/core/route.ts` — SSE route
8. `components/import/ImportForm.tsx` — SSE client UI with live error list
9. Dashboard accordion + member table audit (Fix 9)
