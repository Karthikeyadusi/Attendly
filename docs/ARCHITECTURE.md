# Attendly — Architecture Reference

> Engineering documentation for the Attendly codebase.
> Not a user guide. Not a README. A reference for engineers.

---

## System Overview

```
User Action
    │
    ▼
React Component
    │  calls action creator (e.g. logAttendance)
    ▼
useApp() hook  ──► AppContext.Provider
    │                  (single object value)
    ▼
useAppData.ts  ──► AppCoreData state (useState)
    │
    ├──► localStorage  (always, offline-first)
    │
    └──► Firestore     (optional, signed-in users only)
```

Attendly is a **client-side-first application**. localStorage is always written to. Firestore is a secondary, optional sync layer.

---

## State Architecture

### Single Root State

All application data lives in a single `AppCoreData` object managed by `useState` in [`useAppData.ts`](../src/hooks/useAppData.ts).

```typescript
interface AppCoreData {
  subjects:                Subject[];
  timetable:               TimeSlot[];
  attendance:              AttendanceRecord[];
  oneOffSlots:             OneOffSlot[];
  holidays:                string[];           // "YYYY-MM-DD"
  minAttendancePercentage: number;
  historicalData:          HistoricalData | null;
  trackingStartDate:       string | null;      // "YYYY-MM-DD"
  userName:                string | null;
  archives:                ArchivedSemester[];
}
```

All state transitions follow the pattern:
```typescript
setData(prev => ({ ...prev, ...changes }));
```

### Context + Hook Pattern

[`AppProvider.tsx`](../src/components/AppProvider.tsx) wraps the app in a single context:
```typescript
type AppContextType = ReturnType<typeof useAppData>;
const AppContext = createContext<AppContextType | undefined>(undefined);
```

Using `ReturnType<typeof useAppData>` means the context type is **always in sync with the hook** — no separate type definition to maintain.

Any component calls:
```typescript
const { attendance, logAttendance, subjectStats, ... } = useApp();
```

### Derived Data (Memoized)

Four Maps are computed from raw state via `useMemo` in `useAppData`:

| Name | Type | Source |
|------|------|--------|
| `subjectMap` | `Map<subjectId, Subject>` | `subjects[]` |
| `timetableByDay` | `Map<DayOfWeek, TimeSlot[]>` | `timetable[]` |
| `attendanceByDate` | `Map<dateString, AttendanceRecord[]>` | `attendance[]` |
| `subjectStats` | `Map<subjectId, SubjectStats>` | Engine function |

`subjectStats` is computed by `computeSubjectStats()` from the Attendance Engine — see below.

---

## Attendance Engine

All attendance math lives in [`src/lib/attendanceEngine.ts`](../src/lib/attendanceEngine.ts).

**These are pure functions. No React. No side effects. Fully unit-testable.**

```
computeSubjectStats(subjects, allSlots, attendance, trackingStart, holidays)
  → Map<subjectId, { attendedClasses, conductedClasses, percentage }>

computeOverallStats(subjectStats, historicalData, allSlots, attendance, ...)
  → { totalAttendedCredits, totalConductedCredits, percentage, safeMissClasses, classesNeeded, cancelledCount }

computeSafeToMiss(attended, conducted, minPct, avgCredits)
  → number  (classes that can be missed)

computeClassesNeeded(attended, conducted, minPct, avgCredits)
  → number  (classes that must be attended)

computeWeeklyStats(attendance, allSlots, subjects, weekStart, weekEnd, holidays)
  → { attended, absent, cancelled, postponed, percentage, subjectBreakdown[] }
```

### Key Rules Applied

1. **Cancelled** and **Postponed** records → excluded from `conductedClasses`.
2. **Holidays** and **Sundays** → entire date excluded.
3. Records before **`trackingStartDate`** → excluded.
4. **Credits** (not raw class count) are used for all arithmetic. Labs = 2–3 credits.
5. **Historical data** merges pre-tracking credits into the overall total.

### Why Credits, Not Class Count?

A lab slot typically spans 2+ hours. Using raw class count would underweight labs. Credits normalize the contribution: `percentage = attendedCredits / conductedCredits`.

---

## Data Model

Defined in [`src/types/index.ts`](../src/types/index.ts).

### Entity Relationships

```
Subject ──┬── TimeSlot (recurring, weekly)
          └── OneOffSlot (one-time, dated)
                  │
                  └── AttendanceRecord (per slot per date)
                              │
                              └── previousStatus? (for postpone/undo)
```

### Key Design Decisions

#### `TimeSlot` vs `OneOffSlot`

`TimeSlot` represents a **recurring weekly class** (e.g., "Maths every Monday 09:00").

`OneOffSlot` represents a **rescheduled class for a specific date** (e.g., "Maths moved to Friday 2024-09-13"). It has `originalSlotId` and `originalDate` linking it back to the `TimeSlot` that was postponed.

This design avoids mutating the weekly timetable. The original slot survives; its attendance record is marked `Postponed` and the `OneOffSlot` carries the attendance forward.

#### `AttendanceRecord.id` Convention

```
id = "YYYY-MM-DD-{slotId}"
```

This deterministic ID allows **upsert semantics**: logging attendance twice for the same slot/date overwrites the prior record without a database read.

#### `previousStatus` on AttendanceRecord

When `rescheduleClass` is called, the original record's status changes to `Postponed`, and the prior status is saved in `previousStatus`. This allows `undoPostpone` to restore exactly the prior state (e.g., `Attended → Postponed → Attended` after undo, not `Postponed → null`).

---

## Postpone / Reschedule Workflow

This is the most stateful and interconnected feature. Three functions form a chain:

```
rescheduleClass(slot, fromDate, toDate)
    → marks AttendanceRecord on fromDate as Postponed (saves previousStatus)
    → creates OneOffSlot on toDate (with originalSlotId + originalDate)

undoPostpone(oneOffSlotId)
    → validates: find OneOffSlot, find original AttendanceRecord
    → removes OneOffSlot
    → restores AttendanceRecord to previousStatus (or removes it if no previousStatus)

deleteOneOffSlot(oneOffSlotId)
    → removes OneOffSlot
    → removes original Postponed AttendanceRecord entirely
```

**Invariant:** For every `OneOffSlot` with an `originalDate`, there should be exactly one `AttendanceRecord` with `status = 'Postponed'` at `originalDate` for `originalSlotId`.

**Edge case (double reschedule):** If a `OneOffSlot` itself is rescheduled, the code resolves `originalSlotId` via `'originalSlotId' in slot ? slot.originalSlotId : slot.id`. This preserves the chain back to the original `TimeSlot`.

---

## Storage Layer

### localStorage (Always)

- Key: `'attendlyData'` (migrated from `'attdendlyData'` — legacy typo)
- Written on every `data` change via a `useEffect`
- Read once on app load
- Validated with `AppCoreDataSchema.safeParse()` — invalid data falls back to defaults
- **This is the source of truth for signed-out users.**

### Firestore (Optional)

- Enabled only when Firebase environment variables are set
- Each user has a single document at `users/{uid}`
- Written on every `data` change (when online and logged in)
- Subscribed via `onSnapshot()` — real-time updates from other devices
- `hasPendingWrites` guard prevents echo loops
- Validated with `AppCoreDataSchema.safeParse()` before applying

### Write Flow (signed-in, online)

```
User action → setData() → localStorage write → Firestore write
                                               ↓
                                          onSnapshot fires
                                               ↓
                                     hasPendingWrites = true
                                               ↓
                                          (ignored)
```

### Offline Behavior

If `navigator.onLine` is false, localStorage is written as normal. Firestore write is skipped and `syncStatus` is set to `'offline'`. On reconnect, the next state change triggers a Firestore write.

---

## OCR Pipeline

```
User uploads image
    │
    ▼
Tesseract.js (WASM, client-side)
    → raw text string
    │
    ▼
parseOcrText() in lib/ocrParser.ts
    → RawExtractedSlot[] (day, startTime, subjectName)
    │
    ▼
processRawSlots() in lib/ocrParser.ts
    → ExtractedSlot[] (with normalized times, inferred endTimes, credits)
    │
    ▼
Review/Edit UI (TimetableImportDialog.tsx)
    → user verifies, maps subjects, edits fields
    │
    ▼
importTimetable() in useAppData.ts
    → creates/merges subjects and slots
```

### Why Client-Side OCR?

- Zero API keys, zero quota, zero cost
- Works offline
- Tesseract WASM is ~4MB, cached after first load
- The parsing complexity (time normalization, end-time inference, slot merging) is in pure functions regardless of OCR provider

### AI Flow Archive

The original Genkit/Gemini flows are preserved in [`src/ai/flows/_archived/`](../src/ai/flows/_archived/). They are **not deleted** — if OCR performs poorly on certain timetable layouts, they serve as a reference implementation.

---

## Semester Archive System

When a student starts a new semester, `archiveAndReset()`:
1. Takes a snapshot of all current data (subjects, timetable, attendance, holidays, etc.)
2. Assigns a user-chosen name and timestamp
3. Appends it to `data.archives[]`
4. Resets all current-semester arrays to empty
5. Resets `trackingStartDate`, `historicalData`, `oneOffSlots`, `holidays`

Archives are persisted identically to live data — they live inside `AppCoreData.archives[]` in both localStorage and Firestore.

**Historical data** (`historicalData.conductedCredits` / `attendedCredits`) is how students bridge the gap: if they started tracking mid-semester, they manually enter their prior credits. These are merged in `computeOverallStats()`.

---

## Backup System

```typescript
BackupData = AppCoreData & { version: 1, exportedAt: string }
```

- **Export**: JSON download of current `data` + version + timestamp
- **Import**: `BackupDataSchema.safeParse()` validates the file; on success, `restoreFromBackup()` replaces current state
- **Migration**: Zod `.default()` on all fields means older backups without newer fields are automatically backfilled

`BACKUP_VERSION` is defined once in [`src/lib/schemas.ts`](../src/lib/schemas.ts) and imported everywhere.

---

## Validation Layer

All trust boundaries are validated with Zod schemas from [`src/lib/schemas.ts`](../src/lib/schemas.ts):

| Boundary | Schema | Behaviour on Failure |
|----------|--------|----------------------|
| localStorage read | `AppCoreDataSchema` | Log warning, keep defaults |
| Firestore snapshot | `AppCoreDataSchema` | Log warning, keep local state |
| Backup file import | `BackupDataSchema` | User-facing error with field path |
| OCR output | `RawOcrOutputSchema` | Parser returns empty array |

---

## Testing

Pure functions in the engine are tested in [`tests/attendanceEngine.test.ts`](../tests/attendanceEngine.test.ts) using Vitest:

```
npm test              # run once
npm run test:watch    # watch mode
npm run test:coverage # coverage report
```

**39 test cases** cover: standard percentage, safe-bunk, classes-needed, cancelled, postponed, holidays, historical data, tracking start date, credit weighting, empty semester, 100%, 0%, threshold boundary.

No UI tests. The engine logic is the highest-ROI test surface.

---

## Engineering Debt (Known)

| Item | Location | Severity |
|------|----------|----------|
| `useAppData.ts` is still large (~740 lines) | `src/hooks/useAppData.ts` | Medium |
| Credit assignment for OCR is a heuristic (`contains 'lab'`) | `lib/ocrParser.ts` line ~210 | Low |
| `signIn()` in `useAppData.ts` re-reads localStorage instead of using current `data` state | `useAppData.ts` line ~230 | Low |
| `SemesterView.tsx` re-computes attendance status independently (not using engine) | `components/calendar/SemesterView.tsx` | Low |
| Archive data does not validate on restore (only on import) | `useAppData.ts` → `archiveAndReset` | Low |
