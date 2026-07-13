# Attendly — Deep Dive Q&A

> All answers are based on direct inspection of the actual source code.

---

## 🏗️ Architecture

### Why did you choose Context API + custom hooks instead of Redux, Zustand, or another state manager?

The choice was practical and well-suited to the app's scale. The entire app state lives in a **single, monolithic custom hook** — [`useAppData.ts`](file:///c:/Users/Karthikeya%20Dusi/Desktop/Artifacts/Attendly/src/hooks/useAppData.ts) — which is then served to the component tree through a thin [`AppProvider.tsx`](file:///c:/Users/Karthikeya%20Dusi/Desktop/Artifacts/Attendly/src/components/AppProvider.tsx) (just 22 lines).

The reasons this works:
- **Single source of truth**: All state (subjects, timetable, attendance, holidays, archives, sync status, user) lives in one `useState<AppCoreData>` call. There's no cross-slice communication problem.
- **No async middleware needed**: Data flows are simple — user action → `setData(prev => ...)` → `useEffect` persists to localStorage/Firestore. Redux's `createAsyncThunk` or Zustand middleware would add boilerplate for no gain.
- **Derived state via `useMemo`**: `subjectMap`, `timetableByDay`, `attendanceByDate`, and `subjectStats` are all memoized derived Maps. This removes the need for Redux selectors.
- **Next.js compatibility**: With Next.js App Router and Server Components, adding a client-side store like Redux requires careful `'use client'` boundary management. The hook approach is cleaner.

The only real downside is that **every consumer re-renders whenever any part of `data` changes**, because `AppContext.Provider value={appData}` is a new object on every render of `AppProvider`. A proper Redux/Zustand setup would allow selective subscriptions.

---

### If you had to rebuild Attendly today, what architectural decision would you change first?

**Split `useAppData.ts` into domain slices.** At 742 lines, it handles authentication, localStorage persistence, Firestore sync, 15+ action creators, and 4 memoized derived data structures. This is the biggest architectural debt.

The ideal split:
- `useAuthSync.ts` — Firebase auth, Firestore listener, sign-in/sign-out
- `useTimetable.ts` — CRUD for subjects and time slots
- `useAttendance.ts` — logAttendance, rescheduleClass, undoPostpone, toggleHoliday
- `useStats.ts` — all the `useMemo` calculations (subjectStats, attendanceByDate, etc.)
- `useBackup.ts` — export, import, archiveAndReset, clearAllData

A state manager like **Zustand** would be a natural fit for this split — each domain becomes a slice with its own store, avoiding the "one huge hook" problem while still being simpler than Redux.

---

### Which file or module do you think has accumulated the most technical debt?

**[`useAppData.ts`](file:///c:/Users/Karthikeya%20Dusi/Desktop/Artifacts/Attendly/src/hooks/useAppData.ts)** without question. Evidence:

1. It has a **typo in a constant** that has become permanent: `const APP_DATA_KEY = 'attdendlyData'` (note the double-d). This key is already baked into every user's localStorage, so it can never be fixed without a migration.
2. The **Firestore persistence effect** at line 164 triggers on every `data` change — including changes that came *from* Firestore — which could cause a write loop if the `hasPendingWrites` guard in the snapshot listener isn't working correctly.
3. The `deleteSubject` function (line 289) has a **logic bug**: it filters attendance records based on the *new* timetable (slots for other subjects), so attendance records for the deleted subject's slots may survive deletion if those slot IDs also appear in other contexts.
4. `BACKUP_VERSION = 1` is defined in **two separate files** — `useAppData.ts` (line 15) and `settings/page.tsx` (line 23) — and they must be kept in sync manually.

---

### Is there any part of the code that you're afraid to touch because it might break something else?

Yes — **the `rescheduleClass` / `undoPostpone` / `deleteOneOffSlot` triad**.

These three functions form a stateful chain:
1. `rescheduleClass` marks an `AttendanceRecord` as `'Postponed'` and saves the previous status in `previousStatus?`.
2. `undoPostpone` finds the `OneOffSlot`, traces it back to the original `AttendanceRecord` via `originalSlotId + originalDate`, then restores `previousStatus`.
3. `deleteOneOffSlot` removes the `OneOffSlot` and also nukes the original `Postponed` record.

The state is linked through three separate arrays (`attendance`, `oneOffSlots`, and the ID convention `"YYYY-MM-DD-slotId"`). Any change to how IDs are constructed, or how `originalSlotId` is set (line 409 has an inline conditional: `'originalSlotId' in slot ? slot.originalSlotId : slot.id`), could silently break undo. There are no tests protecting this invariant.

---

## 🗃️ Data Model

### What are the core entities in Attendly?

From [`src/types/index.ts`](file:///c:/Users/Karthikeya%20Dusi/Desktop/Artifacts/Attendly/src/types/index.ts):

| Entity | Key Fields | Purpose |
|---|---|---|
| `Subject` | `id`, `name`, `type ('Lecture'\|'Lab')` | Master list of courses |
| `TimeSlot` | `id`, `day`, `startTime`, `endTime`, `subjectId`, `credits` | Recurring weekly class schedule |
| `OneOffSlot` | `id`, `date`, `startTime`, `endTime`, `subjectId`, `credits`, `originalSlotId`, `originalDate` | A rescheduled class for a specific date |
| `AttendanceRecord` | `id ("YYYY-MM-DD-slotId")`, `slotId`, `date`, `status`, `previousStatus?` | A single attendance log entry |
| `HistoricalData` | `conductedCredits`, `attendedCredits` | Pre-tracking-start attendance credits |
| `ArchivedSemester` | `name`, `archivedAt`, full snapshot of all above | Completed semester archive |
| `AppCoreData` | All arrays of the above + settings | The root persisted state blob |

---

### Which entity gave you the hardest time to design?

**`OneOffSlot`** + its relationship with `AttendanceRecord`.

The challenge: a "postponed" class is not a new concept — it's an existing `TimeSlot` that was moved. So the question was: *do you mutate the TimeSlot, create a new one, or track it separately?*

The design chosen creates a new `OneOffSlot` (immutable, dated) and marks the original `TimeSlot`'s attendance record as `'Postponed'`. This preserves the original timetable structure (no mutation) and lets the dashboard correctly show "class was moved to Date X." The `originalSlotId` field creates the necessary link back.

The tricky edge case: what if you postpone a class that was *already a OneOffSlot* (i.e., a rescheduled class gets rescheduled again)? The code handles this on line 409 with `'originalSlotId' in slot ? slot.originalSlotId : slot.id`, but there's no UI to test this double-reschedule path thoroughly.

---

### Did you ever redesign the data model midway through development?

Yes — the `credits` field on `TimeSlot` and `OneOffSlot` was clearly added later. The original design likely tracked only *class count*; the credits system was retrofitted to handle lab classes (which carry 3 credits) vs. lectures (2 credits).

You can see evidence of this in `processRawSlots` in [TimetableImportDialog.tsx](file:///c:/Users/Karthikeya%20Dusi/Desktop/Artifacts/Attendly/src/components/timetable/TimetableImportDialog.tsx) (line 172): `credits: slot.subjectName.toLowerCase().includes('lab') ? 3 : 2` — a hardcoded heuristic that only works because credits weren't in the original AI output schema.

The `archives` array being inside `AppCoreData` also suggests the archive feature was retrofitted — a cleaner design would store archives in a separate Firestore collection.

---

### Are attendance records immutable after they're created, or can users edit them freely?

They are **freely editable/overwritable** — but only through the UI. The `logAttendance` function uses an **upsert pattern**: it finds an existing record by `id = "YYYY-MM-DD-slotId"` and replaces it, or appends a new one. So tapping a different status simply overwrites the existing record.

The `clearAttendanceRecord` function also lets users undo any log entirely. There's no "locked" state for past dates... with one exception: the `trackingStartDate` guard in `logAttendance` (line 341) prevents logging attendance for dates before the tracking start date. But you can *still edit* a record via `clearAttendanceRecord` even for old dates — the guard is only on `logAttendance`.

One more nuance: records with status `'Postponed'` are intentionally *not* user-editable from the UI — the attendance buttons don't render for postponed slots. They can only be changed via `undoPostpone`.

---

## ⚙️ Attendance Engine

### Where does the attendance math live?

In two places:

1. **[`useAppData.ts` — `subjectStats` (line 662–702)](file:///c:/Users/Karthikeya%20Dusi/Desktop/Artifacts/Attendly/src/hooks/useAppData.ts)** — Per-subject percentage, attended/conducted credits. This is the canonical calculation for the Subjects page.

2. **[`AttendanceStats.tsx` — `stats` useMemo (line 42–112)](file:///c:/Users/Karthikeya%20Dusi/Desktop/Artifacts/Attendly/src/components/attendance/AttendanceStats.tsx)** — *Overall* aggregate attendance across all subjects, plus the "safe to miss" calculation. This is a *duplicate* of the core math, not a reuse of `subjectStats`.

This duplication is a form of technical debt — the overall percentage in `AttendanceStats.tsx` must independently account for historical data, holidays, `trackingStartDate`, cancelled/postponed filtering, and credit weighting. A bug fixed in one place won't automatically fix the other.

---

### Are the calculations pure functions, or are they mixed into UI/state logic?

**Mixed into state logic.** The `subjectStats` computation is a `useMemo` inside `useAppData`, which means it's pure in the functional sense (same inputs → same output), but it's *not* a standalone pure function you can unit-test in isolation. It accesses `data.subjects`, `data.timetable`, `data.oneOffSlots`, `data.attendance`, `data.trackingStartDate`, `data.holidays`, and `isLoaded` — all from hook state.

`AttendanceStats.tsx` goes further by embedding a `safeToMiss()` closure inside a `useMemo`, which is pure but completely untestable as-is.

To improve testability, all math should be extracted into `lib/attendanceCalculations.ts` as named pure functions.

---

### What's the trickiest attendance calculation you've implemented?

**The "safe to miss" formula** in `AttendanceStats.tsx` (lines 83–101).

The problem: *given your current attended credits, conducted credits, and minimum percentage threshold, how many more classes can you miss (or must you attend) to reach the minimum?*

When **above** the threshold:
```
creditsCanMiss = floor((attended - ratio * conducted) / ratio)
classesCanMiss = floor(creditsCanMiss / avgCreditsPerClass)
```

When **below** the threshold:
```
creditsNeeded = ceil((ratio * conducted - attended) / (1 - ratio))
classesNeeded = ceil(creditsNeeded / avgCreditsPerClass)
```

The derivation requires solving `(attended + x) / (conducted + x) >= ratio` for `x`, accounting for the fact that each future class adds to both numerator and denominator. The average credits per class conversion adds another layer of approximation (since not all classes have the same credits). Division-by-zero guards are also needed for edge cases like 0% or 100% minimum attendance thresholds.

---

### How do cancelled classes affect percentages?

Cancelled classes are **excluded from the denominator**. In `subjectStats` (line 679) and `AttendanceStats.tsx` (line 66):
```typescript
if (record.status === 'Cancelled' || record.status === 'Postponed') continue;
```
So a cancelled class never counts as "conducted." It appears in the UI as a count (`cancelledCount`) but doesn't hurt your percentage. This is the correct behavior — if the professor cancels, it's not your fault.

---

### How do postponed classes affect calculations?

Postponed original classes are **excluded from the denominator** (same `continue` guard above). The rescheduled class (the `OneOffSlot`) only enters the calculation *after* the user logs attendance for it as Attended or Absent. So:

- Original slot on Tuesday → marked `Postponed` → **not counted** in stats
- Rescheduled slot on Friday (OneOffSlot) → user logs `Attended` → **counts as attended+conducted**

This is semantically correct: the class was held once (on Friday), not twice.

---

### How do archived semesters affect current calculations?

Archived semesters are **completely isolated** from current calculations. The `archiveAndReset` function stores a snapshot in `prev.archives[]` and then **zeros out** the current `attendance`, `oneOffSlots`, `holidays`, `historicalData`, and `trackingStartDate`. The archived data is only accessible via the `SemesterViewDialog` in settings.

The **`historicalData`** field (`conductedCredits` / `attendedCredits`) bridges the gap between archived semesters and the current stats — a user can manually input pre-tracking credits, and these are added to the current semester's totals in `AttendanceStats.tsx` (lines 78–79):
```typescript
const totalConductedCredits = historicalConductedCredits + dailyConductedCredits;
const totalAttendedCredits = historicalAttendedCredits + dailyAttendedCredits;
```

---

## 💾 Storage

### How do you prevent corrupted localStorage from crashing the app?

With a `try/catch` in the initialization `useEffect` (line 91–104 of `useAppData.ts`):
```typescript
try {
  const storedData = localStorage.getItem(APP_DATA_KEY);
  if (storedData) {
    const parsed = JSON.parse(storedData);
    const initial = getInitialData();
    setData({ ...initial, ...parsed });
  }
} catch (error) {
  console.error("Failed to load data from localStorage", error);
}
```

The spread `{ ...initial, ...parsed }` is critical — it ensures that if new fields are added to `AppCoreData` (e.g., `archives`), they get their default values even if the stored data doesn't have them. **This is the migration strategy.**

However, if `JSON.parse` succeeds but the data has a corrupt shape (e.g., `attendance` is `null` instead of an array), the app will still likely crash downstream. There is no schema validation after parsing.

---

### Do you validate imported backup files?

Partially. In [`settings/page.tsx` line 127–134](file:///c:/Users/Karthikeya%20Dusi/Desktop/Artifacts/Attendly/src/app/%28main%29/settings/page.tsx), three checks are performed:
```typescript
if (
  parsedData.version !== BACKUP_VERSION ||
  !Array.isArray(parsedData.subjects) ||
  !Array.isArray(parsedData.timetable) ||
  !Array.isArray(parsedData.attendance)
) {
  throw new Error("Invalid backup file format.");
}
```

This catches obviously malformed files, but it's weak: it doesn't validate the *shape* of individual records (e.g., does each `Subject` have an `id` and `name`?), doesn't check for `oneOffSlots`, `holidays`, or `archives` arrays, and doesn't validate that foreign key references are consistent (e.g., every `TimeSlot.subjectId` points to a real subject).

---

### If a backup is from an older version, how is it migrated?

The **spread merge strategy** acts as an implicit migration. In `restoreFromBackup`:
```typescript
const { version, exportedAt, ...restOfData } = backupData;
const initialData = getInitialData();
const finalData = { ...initialData, ...restOfData };
setData(finalData);
```

`getInitialData()` provides all defaults, and `restOfData` overrides only what it has. So a backup without `archives` will get `archives: []` from `initialData`. This works for *additive* schema changes (new fields). It breaks for *renaming* fields or *changing field types*.

There's currently only `BACKUP_VERSION = 1`, so no version-based migration logic exists yet. If a breaking schema change were needed, the version check would need an upgrade path.

---

### Is Firebase a source of truth or just a synchronization layer?

**Both, depending on auth state:**

- **Signed-out users**: localStorage is the sole source of truth. Firebase is completely unused.
- **Signed-in users**: Firestore is the *cloud* source of truth; localStorage is a local cache. On login, the app fetches from Firestore and overwrites local state. An `onSnapshot` listener keeps the local state in sync with the cloud in real time.

The design has a subtle conflict: the persistence `useEffect` (line 164) **always writes to Firestore whenever local state changes** (if online and logged in). But the `onSnapshot` listener ignores writes that have `hasPendingWrites: true`. This prevents the write loop, but if `hasPendingWrites` is `false` when the server echoes back, the state could be set redundantly (though harmlessly, since it'd be the same data).

---

## 🔍 OCR (Future / Current AI)

### How do you plan to parse OCR output into timetable slots?

The current architecture already has a two-stage pipeline in [TimetableImportDialog.tsx](file:///c:/Users/Karthikeya%20Dusi/Desktop/Artifacts/Attendly/src/components/timetable/TimetableImportDialog.tsx):

1. **AI Stage** (`extractTimetable` Genkit flow): Gemini is given the image and a prompt instructing it to extract `{ day, startTime, subjectName }` triplets. Critically, the AI is told **not to compute end times** — just report what it sees.

2. **Client-side processing stage** (`processRawSlots`): A 140-line pure function that:
   - Normalizes inconsistent time formats (12h/24h, AM/PM, dots instead of colons)
   - Infers end times by looking at the *next* class's start time per day
   - Applies a hardcoded lunch rule (`12:20` is the lunch cutoff)
   - Merges consecutive same-subject slots
   - Filters structural non-class entries (LUNCH, BREAK)
   - Assigns default credits based on whether the name contains "lab"

> **Note**: The current AI flow is in **DEMO MODE** — it returns hardcoded data and doesn't actually call Gemini Vision. The `gemini-pro-vision` model is defined in the prompt but the flow's async function immediately returns demo data.

---

### What happens if OCR misses a subject or reads one incorrectly?

The user is shown a **review/edit step** before anything is saved. After extraction, each slot is displayed as an editable row where the user can:
- Change the subject name (or map it to an existing subject)
- Edit the day, start time, end time, and credits
- Delete any incorrectly extracted slot
- Leave the dialog without saving (cancels everything)

This "human in the loop" design means OCR errors are never silently committed. The trade-off is that it requires user effort for every import.

---

### How much user correction will you allow before saving?

**Full correction** — every field of every extracted slot is editable. The subject mapping is particularly thoughtful: a dropdown lets users either create a new subject or map the AI-detected name to an existing one (preserving attendance history for that subject).

There's no limit on corrections. The dialog stays open and editable until the user explicitly clicks "Save to Timetable."

---

## ⚡ Performance

### Is there any expensive computation that runs on every render?

The `subjectStats` `useMemo` in `useAppData.ts` (lines 662–702) iterates over all attendance records to build a `Map<subjectId, stats>`. This runs whenever `data.subjects`, `data.timetable`, `data.oneOffSlots`, `data.attendance`, `data.trackingStartDate`, `data.holidays`, or `isLoaded` changes. For a user with a year of daily attendance (~1800 records across 6 subjects), this is fast in practice (~1ms), but it's O(n) on attendance records.

The **bigger concern** is `AttendanceStats.tsx`, which duplicates this computation in its own `useMemo` with the same dependency array. The same data is computed twice — once in the hook for per-subject stats, and once in the component for the overall dashboard stats.

---

### Are you memoizing anything (useMemo, useCallback)?

Yes, extensively:

In `useAppData.ts`:
- `subjectMap` — `useMemo` on `data.subjects`
- `timetableByDay` — `useMemo` on `data.timetable`
- `attendanceByDate` — `useMemo` on `data.attendance`
- `subjectStats` — `useMemo` on 7 dependencies
- `getScheduleForDate` — `useCallback` on `timetableByDay`, `data.oneOffSlots`, `data.holidays`
- All 15+ action creators — wrapped in `useCallback` with `[]` dependency (since they use functional `setData`)
- `handleFirestoreError`, `forceCloudSync` — `useCallback`

In `AttendanceStats.tsx`:
- `stats` block — `useMemo` on 8 dependencies

In `WeeklyDebrief.tsx`:
- `subjectMap` and `slotMap` — `useMemo` (duplicating what's already in the context)

---

### Have you noticed unnecessary re-renders?

Almost certainly yes, but they haven't been measured. The fundamental issue is that `AppContext.Provider` receives a new `value` object on every render of `AppProvider`, which triggers re-renders of all `useApp()` consumers whenever *any* field in `data` changes — even if a specific component only uses `subjects`, it will re-render when `attendance` changes.

`React.memo` on components like `DraggableTimeSlot` (inside `Timetable.tsx`) could help, as could splitting the context into read-only vs. write contexts.

---

## 🐛 Reliability

### What's the biggest bug you've fixed in Attendly?

Per the README: the **timezone-related bug** that incorrectly marked days as holidays. The fix is visible in `utils.ts` — the `isSunday` function explicitly splits the date string and constructs a `new Date(year, month-1, day)` using the local timezone instead of parsing `"YYYY-MM-DD"` directly (which JavaScript interprets as UTC midnight, causing off-by-one errors for users in positive UTC offsets like IST +5:30). The same fix is applied in multiple places throughout the codebase.

The second major bug class was **React rendering errors from misplaced state updates** — likely state being set during render rather than in effects or event handlers.

---

### What's the hardest bug that's still unresolved?

The **Firestore write + snapshot listener interaction**. Currently, every local state change writes to Firestore, and the `onSnapshot` listener filters writes that have `hasPendingWrites: true`. But there's a race window: if the network is slow and the local write hasn't reached the server yet when `isLoaded` becomes true, or if multiple tabs are open, the listeners could conflict. The `syncStatus` indicator (idle/syncing/synced/error) helps surface this, but the underlying data could momentarily be out of sync.

---

### What's the feature that took the longest to implement?

The **reschedule/postpone system** — given the complexity of the three-function chain (`rescheduleClass`, `undoPostpone`, `deleteOneOffSlot`), the `previousStatus` state preservation, and the UI that shows where a class was moved to. The README specifically calls out "a fail-safe mechanism to delete accidentally duplicated postponed classes" as a late addition, suggesting the initial implementation had edge case bugs.

---

### Which feature was much harder than you expected?

**The `processRawSlots` function** for AI timetable processing. What seemed like a simple "take AI output and display it" turned into a 140-line algorithm handling:
- 12h/24h format normalization
- Dots-as-colons typos from AI
- AM/PM ambiguity heuristics
- End-time inference from schedule gaps
- Hardcoded lunch break rules
- Consecutive slot merging
- Structural entry filtering

This is the portion where the AI's non-deterministic output required the most defensive client-side engineering.

---

## 🏆 Product Thinking

### Which feature are you most proud of from an engineering perspective?

**The `subjectStats` memoized computation** in `useAppData`. It elegantly combines: tracking start date filtering, holiday/Sunday exclusion, cancelled/postponed status exclusion, OneOffSlot merging with recurring slots, credit-weighted arithmetic, and historical data bridging — all in a single O(n) pass over attendance records that only recomputes when needed. It's the "attendance engine" and it works correctly for all the edge cases the product has.

---

### Which feature are you most proud of from a user perspective?

**The "safe to miss" calculator.** It answers the question every student actually asks: "Can I skip today's class?" A simple percentage is anxiety-inducing; knowing "you can safely miss 3 more classes" is actionable. The math is non-trivial (you're solving for a future ratio) but the output is a single friendly number.

---

### Which feature would you remove today if you had to simplify the app?

**The Firebase cloud sync** (partially). It adds significant complexity: 4 separate `useEffect`s managing auth state, Firestore listeners, persistence triggers, online/offline detection, and error handling — roughly 100 lines just for infrastructure. For a student attendance tracker, localStorage + manual JSON backup covers 95% of use cases. The feature is also gated behind Firebase environment variables and disabled if they're not set, which means it's already optional.

---

## 📈 Scalability

### If 10,000 students started using Attendly tomorrow, what would break first?

**Nothing on the front end** — it's a pure client-side app. localStorage limits are per-browser (~5–10MB), which is plenty for years of attendance data.

On the **back end**: Firestore's default rules and quotas. Each user writes a single document (`users/{uid}`) every time any state changes. With 10,000 users each updating state multiple times per day, write counts would be high but within Firestore's generous free tier (50k writes/day).

The bigger risk is **Genkit/Gemini API quotas** — if 10,000 users trigger the AI timetable import, each request sends a large Base64 image to the Gemini API. However, since the AI flow is currently in DEMO MODE (returning hardcoded data), this isn't an actual bottleneck right now.

---

### If a university wanted to adopt Attendly officially, what would need to change architecturally?

Major changes needed:
1. **Multi-user data model**: Currently `users/{uid}` is a single document. For institutional use, you'd need a proper database schema with shared course catalogs, professor-controlled timetables, and read-only attendance verification.
2. **Server-side authentication and authorization**: Students should only be able to modify their own records; professors need admin views.
3. **Batch operations**: Logging holidays for an entire department, pushing timetable updates to all enrolled students.
4. **Audit trail**: Attendance records would need to be immutable with an edit history for official purposes.
5. **Reporting/export**: Bulk CSV/PDF exports for the registrar's office.
6. **Remove localStorage as source of truth**: For official records, server-side storage must be canonical.

Essentially, the current architecture is right for a personal tool but wrong for institutional software — the trust model is completely different.

---

## 🔧 Code Quality

### If you had one month with no new features, what would you refactor first?

**Priority order:**

1. **Extract attendance math to pure functions** in `lib/attendanceCalculations.ts` and write unit tests. The `subjectStats` and `safeToMiss` logic is the heart of the app and currently untested.
2. **Fix the `APP_DATA_KEY` typo** (`'attdendlyData'`) with a localStorage migration on first load.
3. **Split `useAppData.ts`** into domain hooks.
4. **Unify the duplicate stats calculation** between `useAppData.ts` and `AttendanceStats.tsx`.
5. **Add schema validation** on localStorage load and backup import (using Zod, which is already a project dependency via Genkit).
6. **Re-enable the actual AI model** in `extract-timetable-flow.ts` — remove the DEMO MODE and wire up the real Gemini Vision prompt.

---

### If another developer joined the project tomorrow, which part of the codebase would be hardest for them to understand?

**The postpone/reschedule system** — specifically the data flow between `rescheduleClass`, `undoPostpone`, and `deleteOneOffSlot`, and how `previousStatus` is used to restore state. There is no documentation or comments explaining *why* the three-function approach was chosen over simpler alternatives, and no tests to demonstrate the expected behavior.

Second hardest: the **Firestore sync logic**, specifically why there are two separate `useEffect`s for loading (one for localStorage, one for Firestore), when each fires relative to auth state, and why `isLoaded` is set by the Firestore listener rather than the localStorage one for logged-in users.

---

## 🎤 Interview

### If an interviewer opened a random file from Attendly, which file would you be most nervous about explaining?

**[`useAppData.ts`](file:///c:/Users/Karthikeya Dusi/Desktop/Artifacts/Attendly/src/hooks/useAppData.ts)** — specifically the Firestore sync effects (lines 136–183). An interviewer would immediately notice:
- The potential write loop between the persistence effect and the snapshot listener
- The `success` variable hack in `undoPostpone` (line 419) — using a variable outside `setData`'s closure to conditionally show a toast *after* the state update, which is a code smell
- The `deleteSubject` logic bug (line 292)
- The fact that `BACKUP_VERSION` is defined here and also in `settings/page.tsx`

---

### Which file would you be most confident explaining?

**[`src/types/index.ts`](file:///c:/Users/Karthikeya Dusi/Desktop/Artifacts/Attendly/src/types/index.ts)** — It's clean, well-structured, and tells the story of the entire app in 119 lines. Every design decision (why `OneOffSlot` exists separately from `TimeSlot`, why `AttendanceRecord.previousStatus` is needed, how `AppCoreData` vs. `AppData` vs. `BackupData` differ) can be explained from reading just the types. It's the best entry point to understanding the architecture.

Second choice: **[`AppProvider.tsx`](file:///c:/Users/Karthikeya Dusi/Desktop/Artifacts/Attendly/src/components/AppProvider.tsx)** — 22 lines that perfectly implement the Context + custom hook pattern. `type AppContextType = ReturnType<typeof useAppData>` is an elegant way to avoid duplicating the hook's return type signature.
