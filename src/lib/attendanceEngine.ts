/**
 * @fileoverview Attendance Engine — pure functions for all attendance calculations.
 *
 * These functions have no side effects and no React imports.
 * They are the single source of truth for all attendance math in Attendly.
 * They are directly unit-testable without any React environment.
 *
 * Public API:
 *   computeSubjectStats    — per-subject attended/conducted/percentage
 *   computeOverallStats    — aggregate stats across all subjects + historical data
 *   computeSafeToMiss      — how many more classes can be missed
 *   computeClassesNeeded   — how many classes must be attended to recover
 *   computeWeeklyStats     — stats for a specific date range (used by weekly summary)
 *   computeAvgCredits      — helper: average credits per slot in a timetable
 */

import { isSunday } from '@/lib/utils';
import type {
  Subject,
  TimeSlot,
  OneOffSlot,
  AttendanceRecord,
  HistoricalData,
  SubjectStats,
  SubjectStatsMap,
} from '@/types';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface OverallStats {
  totalAttendedCredits: number;
  totalConductedCredits: number;
  percentage: number;
  /** Number of classes that can still be missed. Positive = can miss. */
  safeMissClasses: number;
  /** Number of classes that must be attended to recover. 0 = already above threshold. */
  classesNeeded: number;
  cancelledCount: number;
}

export interface WeeklySubjectBreakdown {
  subjectId: string;
  name: string;
  attended: number;
  conducted: number;
  percentage: number;
}

export interface WeeklyStats {
  attended: number;
  absent: number;
  cancelled: number;
  postponed: number;
  percentage: number;
  subjectBreakdown: WeeklySubjectBreakdown[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Returns the average credits per slot in a given timetable.
 * Falls back to 1 if the timetable is empty.
 */
export function computeAvgCredits(timetable: TimeSlot[]): number {
  if (timetable.length === 0) return 1;
  const total = timetable.reduce((acc, slot) => acc + slot.credits, 0);
  return total / timetable.length;
}

/**
 * Returns true if this attendance record should be excluded from calculations.
 * Cancelled and Postponed records do not count as conducted classes.
 */
function isExcludedStatus(status: AttendanceRecord['status']): boolean {
  return status === 'Cancelled' || status === 'Postponed';
}

/**
 * Returns true if this date should be excluded from all calculations.
 */
function isExcludedDate(date: string, holidays: string[]): boolean {
  return holidays.includes(date) || isSunday(date);
}

// ---------------------------------------------------------------------------
// Core calculations
// ---------------------------------------------------------------------------

/**
 * Computes per-subject attendance statistics.
 *
 * Rules applied:
 *  - Records before trackingStartDate are ignored.
 *  - Records on holidays or Sundays are ignored.
 *  - Cancelled and Postponed records are excluded from conducted count.
 *  - Credits are used instead of raw class counts.
 *
 * @returns A Map<subjectId, SubjectStats>. Every subject in `subjects` has an entry.
 */
export function computeSubjectStats(
  subjects: Subject[],
  allSlots: (TimeSlot | OneOffSlot)[],
  attendance: AttendanceRecord[],
  trackingStartDate: string | null,
  holidays: string[]
): SubjectStatsMap {
  const stats: SubjectStatsMap = new Map();

  // Initialise every subject with zero stats
  for (const subject of subjects) {
    stats.set(subject.id, { attendedClasses: 0, conductedClasses: 0, percentage: 100 });
  }

  const slotMap = new Map(allSlots.map(slot => [slot.id, slot]));

  const filteredAttendance = trackingStartDate
    ? attendance.filter(r => r.date >= trackingStartDate)
    : attendance;

  for (const record of filteredAttendance) {
    if (isExcludedDate(record.date, holidays)) continue;
    if (isExcludedStatus(record.status)) continue;

    const slot = slotMap.get(record.slotId);
    if (!slot) continue;

    const subjectStat = stats.get(slot.subjectId);
    if (!subjectStat) continue;

    subjectStat.conductedClasses += slot.credits;
    if (record.status === 'Attended') {
      subjectStat.attendedClasses += slot.credits;
    }
  }

  // Compute percentages
  for (const stat of stats.values()) {
    stat.percentage = stat.conductedClasses > 0
      ? (stat.attendedClasses / stat.conductedClasses) * 100
      : 100;
  }

  return stats;
}

/**
 * Computes how many additional classes can be safely missed while staying at or above
 * the minimum attendance threshold.
 *
 * Solving: (attended) / (conducted + x) >= minRatio
 * → x <= attended / minRatio - conducted
 * We divide by avgCredits to convert credits back to a class count.
 *
 * @returns A positive integer (classes that can be missed), or 0 if already at the edge.
 */
export function computeSafeToMiss(
  attended: number,
  conducted: number,
  minPct: number,
  avgCredits: number
): number {
  if (minPct <= 0) return Infinity;
  if (avgCredits <= 0) return 0;

  const minRatio = minPct / 100;
  const creditsCanMiss = Math.floor(attended / minRatio - conducted);
  if (creditsCanMiss <= 0) return 0;
  return Math.floor(creditsCanMiss / avgCredits);
}

/**
 * Computes how many additional classes must be attended to reach the minimum threshold.
 *
 * Solving: (attended + x) / (conducted + x) >= minRatio
 * → x >= (minRatio * conducted - attended) / (1 - minRatio)
 *
 * @returns A positive integer (classes that must be attended), or 0 if already at/above threshold.
 */
export function computeClassesNeeded(
  attended: number,
  conducted: number,
  minPct: number,
  avgCredits: number
): number {
  if (minPct <= 0) return 0;
  if (avgCredits <= 0) return 0;

  const minRatio = minPct / 100;
  const currentPct = conducted > 0 ? (attended / conducted) * 100 : 100;
  if (currentPct >= minPct) return 0;

  const denominator = 1 - minRatio;
  if (denominator <= 0) return Infinity; // minPct = 100%, impossible to miss any
  const creditsNeeded = Math.ceil((minRatio * conducted - attended) / denominator);
  if (creditsNeeded <= 0) return 0;
  return Math.ceil(creditsNeeded / avgCredits);
}

/**
 * Computes overall (cross-subject) attendance statistics, merging in historical data.
 *
 * This is the single source of truth for the dashboard's overall percentage
 * and the safe-bunk / classes-needed figures.
 */
export function computeOverallStats(
  subjectStats: SubjectStatsMap,
  historicalData: HistoricalData | null,
  allSlots: (TimeSlot | OneOffSlot)[],
  attendance: AttendanceRecord[],
  trackingStartDate: string | null,
  holidays: string[],
  minAttendancePercentage: number
): OverallStats {
  // Sum across all subjects
  let dailyAttendedCredits = 0;
  let dailyConductedCredits = 0;

  for (const stat of subjectStats.values()) {
    dailyAttendedCredits += stat.attendedClasses;
    dailyConductedCredits += stat.conductedClasses;
  }

  // Merge historical data
  const historicalConducted = historicalData?.conductedCredits ?? 0;
  const historicalAttended = historicalData?.attendedCredits ?? 0;

  const totalAttendedCredits = historicalAttended + dailyAttendedCredits;
  const totalConductedCredits = historicalConducted + dailyConductedCredits;

  const percentage = totalConductedCredits > 0
    ? (totalAttendedCredits / totalConductedCredits) * 100
    : 100;

  // Count cancelled classes (date + holiday filtered, same as subjectStats)
  const filteredForCancelled = trackingStartDate
    ? attendance.filter(r => r.date >= trackingStartDate)
    : attendance;
  const cancelledCount = filteredForCancelled.filter(
    r => r.status === 'Cancelled' && !isExcludedDate(r.date, holidays)
  ).length;

  // Compute safe-miss and needed using per-timetable average credit weight
  // We use only the recurring timetable for the credit average (not oneOffSlots)
  // because that reflects the typical class weight going forward.
  const timetableSlots = allSlots.filter((s): s is TimeSlot => !('date' in s));
  const avgCredits = computeAvgCredits(timetableSlots);

  const currentPct = percentage;
  let safeMissClasses = 0;
  let classesNeeded = 0;

  if (currentPct >= minAttendancePercentage) {
    safeMissClasses = computeSafeToMiss(
      totalAttendedCredits,
      totalConductedCredits,
      minAttendancePercentage,
      avgCredits
    );
  } else {
    classesNeeded = computeClassesNeeded(
      totalAttendedCredits,
      totalConductedCredits,
      minAttendancePercentage,
      avgCredits
    );
  }

  return {
    totalAttendedCredits,
    totalConductedCredits,
    percentage,
    safeMissClasses,
    classesNeeded,
    cancelledCount,
  };
}

/**
 * Computes attendance statistics for a given date range.
 * Used by the weekly summary component.
 *
 * @param weekStartDate - inclusive, "YYYY-MM-DD"
 * @param weekEndDate   - inclusive, "YYYY-MM-DD"
 */
export function computeWeeklyStats(
  attendance: AttendanceRecord[],
  allSlots: (TimeSlot | OneOffSlot)[],
  subjects: Subject[],
  weekStartDate: string,
  weekEndDate: string,
  holidays: string[]
): WeeklyStats {
  const slotMap = new Map(allSlots.map(s => [s.id, s]));
  const subjectMap = new Map(subjects.map(s => [s.id, s]));
  const breakdownMap = new Map<string, WeeklySubjectBreakdown>();

  // Initialise breakdown for every subject
  for (const subject of subjects) {
    breakdownMap.set(subject.id, {
      subjectId: subject.id,
      name: subject.name,
      attended: 0,
      conducted: 0,
      percentage: 100,
    });
  }

  const weeklyRecords = attendance.filter(
    r => r.date >= weekStartDate && r.date <= weekEndDate && !isExcludedDate(r.date, holidays)
  );

  let attended = 0;
  let absent = 0;
  let cancelled = 0;
  let postponed = 0;

  for (const record of weeklyRecords) {
    if (record.status === 'Cancelled') { cancelled++; continue; }
    if (record.status === 'Postponed') { postponed++; continue; }

    const slot = slotMap.get(record.slotId);
    if (!slot) continue;

    const subject = subjectMap.get(slot.subjectId);
    if (!subject) continue;

    const bd = breakdownMap.get(slot.subjectId);
    if (bd) {
      bd.conducted += slot.credits;
      if (record.status === 'Attended') {
        bd.attended += slot.credits;
        attended++;
      } else if (record.status === 'Absent') {
        absent++;
      }
    } else {
      if (record.status === 'Attended') attended++;
      else if (record.status === 'Absent') absent++;
    }
  }

  // Compute per-subject percentages
  for (const bd of breakdownMap.values()) {
    bd.percentage = bd.conducted > 0 ? (bd.attended / bd.conducted) * 100 : 100;
  }

  const totalConducted = attended + absent;
  const percentage = totalConducted > 0 ? (attended / totalConducted) * 100 : 100;

  return {
    attended,
    absent,
    cancelled,
    postponed,
    percentage,
    subjectBreakdown: Array.from(breakdownMap.values()).filter(bd => bd.conducted > 0),
  };
}
