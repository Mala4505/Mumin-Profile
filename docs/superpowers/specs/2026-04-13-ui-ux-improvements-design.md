# UI/UX Improvements — Forms, Member Profile, Mumin Dashboard, Form Analysis

**Date:** 2026-04-13  
**Scope:** Full Pro Max — fix inconsistencies, redesign layouts, add form analysis page  
**Affected surfaces:** FormsClient, FormBuilder, BulkFillForm, SelfFillForm, MemberProfileView, MuminDashboard, MuminPortalTabs  
**New surface:** `/forms/[id]/responses` — form analysis page

---

## 1. Goals

1. Standardise modal/loading patterns across the app (use existing `ConfirmDialog`, `Dialog`, `LumaSpin`)
2. Upgrade the Forms page with richer cards and a search/filter/stats header
3. Upgrade Member Profile with a compact identity card hero and Dialog-based contact editing
4. Polish the Mumin Dashboard with a cleaner hero, status ring, and fix a pencil-icon bug
5. Add a form analysis page (`/forms/[id]/responses`) with response table, pending list, and charts

---

## 2. Shared Patterns (applied everywhere)

### 2.1 Loading spinner
- **`LumaSpin`** is used for full-page/overlay loading states (initial data fetch, page transitions)
- **`Loader2`** (Lucide) is kept only for inline button states (e.g. "Saving…" inside a button while a mutation is in flight)
- Files affected: `MuminPortalTabs.tsx`, `MuminDashboard.tsx`, `BulkFillForm.tsx`, `SelfFillForm.tsx`

### 2.2 Confirmation modals
- The custom `ConfirmModal` in `BulkFillForm.tsx` is deleted and replaced with `<ConfirmDialog>` from `components/ui/confirm-dialog.tsx`
- The inline confirm `div` in `SelfFillForm.tsx` is deleted and replaced with `<ConfirmDialog>`
- The existing `ConfirmDialog` component accepts these props (verified against source): `open`, `onOpenChange`, `title`, `description`, `confirmLabel`, `cancelLabel`, `variant` (`'default' | 'danger'`), `onConfirm`, `loading`

### 2.3 FormBuilder — Dialog instead of full-screen overlay
- `FormsClient.tsx` currently renders FormBuilder inside `fixed inset-0 bg-background/80` overlay
- Replace with shadcn `<Dialog>` (`max-w-2xl`, `overflow-y-auto`)
- Closing the dialog mid-wizard triggers `<ConfirmDialog variant="danger">` asking "Discard this draft?"
- On confirm → close dialog, reset draft state

### 2.4 Shadcn Tabs
- `FormsClient.tsx` tab bar (My Forms / Pending Approval / All Forms) migrates to shadcn `<Tabs>` / `<TabsList>` / `<TabsTrigger>`
- `MuminPortalTabs.tsx` tab bar (My Profile / My Forms) migrates to shadcn `<Tabs>`

---

## 3. Forms Page (`/forms`) — `FormsClient.tsx`

### 3.1 Header redesign
```
[ My Forms | Pending (2) | All Forms ]           [ + New Form ]
[ 🔍 Search forms...                ] [ ⊞ | ☰ ]
─────────────────────────────────────────────────────────────────
  Total: 4   Published: 2   Pending: 1   Responses: 99
```
- Search input filters the visible form cards client-side by title
- Card/list view toggle: grid (default) or compact list rows
- Stats bar renders **below the search row, above the cards grid** (not at page bottom)
  - Shows: Total Forms · Published · Pending · Total Responses (sum across currently visible tab's forms)

### 3.2 Enhanced form cards
Each card shows:
- **Title** + status badge + type badge (existing)
- **Response progress bar** (published forms only): `X / Y · Z% completion · N pending`
  - Progress bar uses a gradient fill (`from-sky-400 to-violet-400`)
  - Counts fetched as part of the forms list API response (add `response_count`, `audience_count` fields)
- **Contextual action buttons** based on status:
  - `draft` → "Continue Editing" (opens FormBuilder Dialog with existing draft)
  - `pending_approval` → "Edit" (staff/SuperAdmin only sees Approve/Reject on Pending tab)
  - `published` → "Edit" + **"View Responses"** (navigates to `/forms/[id]/responses`)
  - `expired` → "View Responses" only (with final response counts shown)
  - `closed` → "View Responses" only

### 3.3 Empty state
Unchanged from current — icon + message + link to create.

### 3.4 Toast system
Keep existing custom toast in `FormsClient.tsx` (no shared toast library needed).

---

## 4. Member Profile Page — `MemberProfileView.tsx`

### 4.1 Hero card — Compact Identity Card
```
┌─────────────────────────────────────────┐
│  [AH]●  Ali Hussein Bohari   [✏️ Edit]  │
│         ITS 10000001 · Sabeel 42        │
│         [Active] [Male] [Balig]         │
│  ─────────────────────────────────────  │
│  Phone          Email         DOB       │
│  +965 9999…     ali@ex…       15 Jan 90 │
└─────────────────────────────────────────┘
```
- Avatar: gradient circle (`from-blue-500 to-violet-500`), initials, size `w-12 h-12`
- Status ring dot: `w-3.5 h-3.5` coloured circle bottom-right of avatar (green = active, grey = others)
- Name, ITS/Sabeel, badges all in one tight block
- Contact fields below a divider (phone, email, DOB — staff also sees alt phone)
- "Edit" button top-right of card

### 4.2 Contact edit → Dialog
- Pencil/Edit button opens a shadcn `<Dialog>` (`max-w-md`)
- Dialog contains the contact edit form (phone, alt phone, email, status) using shadcn `<Input>` and `<Select>`
- Footer: Cancel + Save buttons; Save shows `Loader2` spinner while in flight
- On success: **optimistically update `displayProfile` state first**, then close dialog, then call `router.refresh()` in the background. This prevents a visible flicker between close and revalidation.
- Error shown inside dialog as a destructive alert (dialog stays open on error)

### 4.3 Editable Umoor fields
- Replace raw `<input>` in `EditableField` with shadcn `<Input>`
- No structural change to the tab/accordion layout

### 4.4 Access rules (unchanged)
- Staff (SuperAdmin, Masool, Musaid) and own profile can edit contact
- SuperAdmin + staff can edit Umoor fields; Mumin can edit fields where `mumin_can_edit = true`

---

## 5. Mumin Dashboard — `MuminDashboard.tsx` + `MuminPortalTabs.tsx`

### 5.1 Hero card — Centered, polished
```
         ┌──────────────────────────────┐
         │         [AH]●               │
         │    Ali Hussein Bohari        │
         │  ITS 10000001 · Sabeel 42   │
         │  [Active]  [Male]  [Balig]  │
         └──────────────────────────────┘
```
- Avatar: gradient circle, `w-16 h-16`, centered
- Status ring dot: bottom-right of avatar
- Badges: centered row below ITS line
- No banner, no stats strip (clean, symmetric)

### 5.2 Location info grid
- Unchanged structure, minor spacing polish

### 5.3 `MuminPortalTabs.tsx` — fixes + upgrades
- **Bug fix:** Add `group` class to the parent `div` wrapping each `EditableProfileField` row so `group-hover:opacity-100` on the pencil button works
- **Loading:** Replace `<Loader2 className="animate-spin" />` with `<LumaSpin size={40} />` centered in the tab content area
- **Tabs:** Replace custom `<button>` tab bar with shadcn `<Tabs>` / `<TabsList>` / `<TabsTrigger>`
  - "My Forms" tab shows a count badge on `TabsTrigger` when `pendingForms.length > 0`
- **Edit buttons:** On mobile, pencil buttons are always visible (not hover-only); on desktop, hover behaviour is kept

### 5.4 Profile category sub-tabs inside portal
- Keep existing sub-tab scroll strip for Umoor categories inside "My Profile" tab
- No structural change

---

## 6. Form Analysis Page (new) — `/forms/[id]/responses`

### 6.1 Route & Access Control
- `app/(dashboard)/forms/[id]/responses/page.tsx` — server component, fetches form metadata + initial response counts
- **Route protection:** Add `/forms/:id/responses` to `proxy.ts` protected routes — requires authenticated session
- **Role access:**
  - `SuperAdmin` and `Admin` — always have access to any form's responses
  - `Masool` and `Musaid` — can view responses only for forms they are designated to fill (i.e. their role/user appears in `filler_access.fillers`), scoped to their assigned sectors/subsectors
  - `Mumin` — never has access; redirect to `/dashboard`
- The page server component reads the session via `getSession()`, checks role, and verifies Masool/Musaid filler access against the form's `filler_access` JSON before rendering. Returns 404 if form not found, redirect to `/dashboard` if access denied.

### 6.2 Stats header
```
Ramadan Attendance 1446         [Published]  Expires Apr 20
47 responses  ·  83% complete  ·  9 pending
```

### 6.3 Tabs
**Tab 1 — All Responses**
- Table columns: Name | ITS No | Answer(s) | Submitted At
- Rows sorted by submitted_at desc by default
- Each Name cell is a link to `/members/[its_no]`
- Answer column: for simple forms (one question), show value directly; for detailed forms (multiple questions), show a "View" button that opens a `<Dialog>` with all answers

**Tab 2 — Pending**
- Filtered list of audience members with no submission
- Columns: Name | ITS No | Subsector
- No actions (read-only, for follow-up reference)

**Tab 3 — Charts**
- Per-question answer distribution using Recharts `<BarChart>` (already in codebase)
- **Short-answer / enum values** (≤ 20 distinct values): horizontal `<BarChart>` of value counts, one bar per distinct answer
- **Free-text / open-ended** (> 20 distinct values or field_type = 'text' with high cardinality): skip bar chart; instead show "N total responses · M unique answers" and a scrollable list of the top 10 most common values with their counts
- **Unanswered questions**: if a question has 0 responses, show a muted placeholder ("No answers yet")
- Overall completion: shadcn `<Progress>` bar showing `responded / total_audience` with percentage label

### 6.4 API
- `GET /api/forms/[id]/responses` — returns `{ form, responses: [...], audience: [...] }`
  - `responses`: `form_response` rows joined with `mumin.name` and `mumin.its_no`; ordered by `submitted_at` desc
  - `audience`: members matching the form's `audience_filters`, joined with `subsector.name`; used to compute pending list
- **Access check:** SuperAdmin/Admin always allowed. Masool/Musaid: verify their user ID appears in `form.filler_access.fillers` before returning data; return 403 otherwise. Mumin: always 403.
- `GET /api/forms` (existing) — extend response shape to include `response_count: number` and `audience_count: number` per form, computed via subquery/count. These power the progress bar on form cards.

### 6.5 Navigation
- "View Responses" button on each published/expired/closed form card in `FormsClient`
- Back button on responses page returns to `/forms`

---

## 7. Files Changed

| File | Change |
|------|--------|
| `components/forms/FormsClient.tsx` | shadcn Tabs, search bar, view toggle, stats bar, enhanced cards, FormBuilder in Dialog |
| `components/forms/FormBuilder.tsx` | Wrapped in Dialog, discard ConfirmDialog on close |
| `components/forms/BulkFillForm.tsx` | Replace custom ConfirmModal with ConfirmDialog, LumaSpin |
| `components/forms/SelfFillForm.tsx` | Replace inline confirm with ConfirmDialog, LumaSpin |
| `components/members/MemberProfileView.tsx` | Compact Identity Card hero, contact edit Dialog, shadcn Input in EditableField |
| `components/dashboard/MuminDashboard.tsx` | Polished hero with status ring |
| `components/dashboard/MuminPortalTabs.tsx` | Fix group bug, LumaSpin, shadcn Tabs, mobile-visible edit buttons |
| `app/(dashboard)/forms/[id]/responses/page.tsx` | New page — server component |
| `components/forms/FormResponsesClient.tsx` | New client component — stats header + tabs |
| `app/api/forms/[id]/responses/route.ts` | New API route |

---

## 8. Out of Scope

- No changes to FormBuilder step content (Step1–Step5 logic unchanged)
- No changes to import page, reports page, analytics dashboard
- No changes to BulkFillForm question/answer logic — only modal and spinner patterns
- No new shadcn components needed beyond `Tabs` (already installed: `Dialog`, `Button`, `Input`, `Select`, `Progress`)
