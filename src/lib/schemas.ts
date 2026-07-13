/**
 * @fileoverview Zod schemas for all Attendly data types.
 *
 * These schemas are the single source of truth for data validation.
 * Used at all trust boundaries:
 *   - localStorage read (useAppData.ts)
 *   - Firestore snapshot read (useAppData.ts)
 *   - Backup file import (settings/page.tsx)
 *   - OCR parser output (ocrParser.ts)
 *
 * Design note: Schemas are intentionally lenient where backwards compatibility
 * is required (e.g., using .default() for fields added in later versions).
 */

import { z } from 'zod';

// ---------------------------------------------------------------------------
// Constants — single source of truth
// ---------------------------------------------------------------------------

export const BACKUP_VERSION = 1 as const;

// ---------------------------------------------------------------------------
// Primitive schemas
// ---------------------------------------------------------------------------

const DayOfWeekSchema = z.enum(['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']);

const AttendanceStatusSchema = z.enum(['Attended', 'Absent', 'Cancelled', 'Postponed']);

const TimeStringSchema = z
  .string()
  .regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Expected HH:MM format');

const DateStringSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Expected YYYY-MM-DD format');

// ---------------------------------------------------------------------------
// Entity schemas
// ---------------------------------------------------------------------------

export const SubjectSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  type: z.enum(['Lecture', 'Lab']),
});

export const TimeSlotSchema = z.object({
  id: z.string().min(1),
  day: DayOfWeekSchema,
  startTime: TimeStringSchema,
  endTime: TimeStringSchema,
  subjectId: z.string().min(1),
  credits: z.number().int().min(0).default(1),
});

export const OneOffSlotSchema = z.object({
  id: z.string().min(1),
  date: DateStringSchema,
  startTime: TimeStringSchema,
  endTime: TimeStringSchema,
  subjectId: z.string().min(1),
  credits: z.number().int().min(0).default(1),
  originalSlotId: z.string().min(1),
  originalDate: DateStringSchema,
});

export const AttendanceRecordSchema = z.object({
  id: z.string().min(1),
  slotId: z.string().min(1),
  date: DateStringSchema,
  status: AttendanceStatusSchema,
  // previousStatus was added later; use .nullish() for backwards compatibility
  previousStatus: AttendanceStatusSchema.nullish(),
});

export const HistoricalDataSchema = z.object({
  conductedCredits: z.number().min(0),
  attendedCredits: z.number().min(0),
});

export const SemesterSummarySchema = z.object({
  attendance: z.array(AttendanceRecordSchema),
  oneOffSlots: z.array(OneOffSlotSchema).default([]),
  holidays: z.array(DateStringSchema).default([]),
  historicalData: HistoricalDataSchema.nullable().default(null),
  trackingStartDate: DateStringSchema.nullable().default(null),
  minAttendancePercentage: z.number().min(0).max(100).default(75),
  subjects: z.array(SubjectSchema).default([]),
  timetable: z.array(TimeSlotSchema).default([]),
});

export const ArchivedSemesterSchema = SemesterSummarySchema.extend({
  name: z.string().min(1),
  archivedAt: z.string(),
});

// ---------------------------------------------------------------------------
// Root app data schema
// ---------------------------------------------------------------------------

/**
 * Schema for the persisted application state.
 * All fields use .default() so that older stored data without newer fields
 * is automatically backfilled rather than rejected.
 */
export const AppCoreDataSchema = z.object({
  subjects: z.array(SubjectSchema).default([]),
  timetable: z.array(TimeSlotSchema).default([]),
  attendance: z.array(AttendanceRecordSchema).default([]),
  oneOffSlots: z.array(OneOffSlotSchema).default([]),
  holidays: z.array(DateStringSchema).default([]),
  minAttendancePercentage: z.number().min(0).max(100).default(75),
  historicalData: HistoricalDataSchema.nullable().default(null),
  trackingStartDate: DateStringSchema.nullable().default(null),
  userName: z.string().nullable().default(null),
  archives: z.array(ArchivedSemesterSchema).default([]),
});

// ---------------------------------------------------------------------------
// Backup file schema
// ---------------------------------------------------------------------------

export const BackupDataSchema = AppCoreDataSchema.extend({
  version: z.literal(BACKUP_VERSION),
  exportedAt: z.string(),
});

// ---------------------------------------------------------------------------
// OCR output schema (raw slots before processRawSlots)
// ---------------------------------------------------------------------------

export const RawOcrSlotSchema = z.object({
  day: DayOfWeekSchema,
  startTime: z.string().min(1), // not yet normalised
  subjectName: z.string().min(1),
});

export const RawOcrOutputSchema = z.object({
  slots: z.array(RawOcrSlotSchema),
});

// ---------------------------------------------------------------------------
// Inferred types (re-exported for convenience)
// ---------------------------------------------------------------------------

export type ValidatedAppCoreData = z.infer<typeof AppCoreDataSchema>;
export type ValidatedBackupData = z.infer<typeof BackupDataSchema>;
