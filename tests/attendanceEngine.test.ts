/**
 * @fileoverview Tests for the Attendance Engine.
 *
 * These tests cover every calculation path:
 *   - Standard attendance percentage
 *   - Safe bunk calculation
 *   - Classes needed to recover
 *   - Cancelled classes (must not count as conducted)
 *   - Postponed classes (must not count as conducted)
 *   - Holiday exclusion
 *   - Historical attendance merging
 *   - Tracking start date filtering
 *   - Credit weighting (labs vs. lectures)
 *   - Empty semester (no attendance yet)
 *   - Perfect attendance (100%)
 *   - Zero attendance (0%)
 *   - Threshold edge cases (exactly at threshold)
 *   - Weekly stats computation
 */

import { describe, it, expect } from 'vitest';
import {
  computeSubjectStats,
  computeOverallStats,
  computeSafeToMiss,
  computeClassesNeeded,
  computeWeeklyStats,
  computeAvgCredits,
} from '../src/lib/attendanceEngine';
import type { Subject, TimeSlot, AttendanceRecord, OneOffSlot, HistoricalData } from '../src/types';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const SUBJECT_A: Subject = { id: 's-a', name: 'Mathematics', type: 'Lecture' };
const SUBJECT_B: Subject = { id: 's-b', name: 'Physics Lab', type: 'Lab' };

const SLOT_A: TimeSlot = {
  id: 'slot-a', day: 'Mon', startTime: '09:00', endTime: '09:50',
  subjectId: 's-a', credits: 1,
};
const SLOT_B: TimeSlot = {
  id: 'slot-b', day: 'Tue', startTime: '10:00', endTime: '11:40',
  subjectId: 's-b', credits: 2,
};
const SLOT_C: TimeSlot = {
  id: 'slot-c', day: 'Wed', startTime: '09:00', endTime: '09:50',
  subjectId: 's-a', credits: 1,
};

const makeRecord = (
  slotId: string,
  date: string,
  status: AttendanceRecord['status']
): AttendanceRecord => ({
  id: `${date}-${slotId}`,
  slotId,
  date,
  status,
});

// ---------------------------------------------------------------------------
// computeAvgCredits
// ---------------------------------------------------------------------------

describe('computeAvgCredits', () => {
  it('returns 1 for an empty timetable', () => {
    expect(computeAvgCredits([])).toBe(1);
  });

  it('computes the average correctly for uniform credits', () => {
    expect(computeAvgCredits([SLOT_A, SLOT_C])).toBe(1);
  });

  it('computes the average correctly for mixed credits', () => {
    // SLOT_A = 1, SLOT_B = 2, SLOT_C = 1 → average = 4/3
    expect(computeAvgCredits([SLOT_A, SLOT_B, SLOT_C])).toBeCloseTo(4 / 3, 5);
  });
});

// ---------------------------------------------------------------------------
// computeSafeToMiss
// ---------------------------------------------------------------------------

describe('computeSafeToMiss', () => {
  it('returns 0 when already at the threshold', () => {
    // 75 attended, 100 conducted → exactly 75%
    expect(computeSafeToMiss(75, 100, 75, 1)).toBe(0);
  });

  it('computes correctly when well above threshold', () => {
    // 90 attended, 100 conducted, threshold 75%, avgCredits 1
    // creditsCanMiss = floor(90/0.75 - 100) = floor(120 - 100) = 20
    expect(computeSafeToMiss(90, 100, 75, 1)).toBe(20);
  });

  it('returns 0 when below threshold', () => {
    expect(computeSafeToMiss(60, 100, 75, 1)).toBe(0);
  });

  it('accounts for credit weight when avgCredits > 1', () => {
    // 90 attended, 100 conducted, 75% threshold, avgCredits 2
    // creditsCanMiss = 20, classesCanMiss = floor(20/2) = 10
    expect(computeSafeToMiss(90, 100, 75, 2)).toBe(10);
  });

  it('handles zero minPct (no attendance required)', () => {
    expect(computeSafeToMiss(0, 100, 0, 1)).toBe(Infinity);
  });

  it('handles zero conducted (fresh semester)', () => {
    // 0 attended, 0 conducted → 100% by default logic; floor(0/0.75 - 0) = 0
    expect(computeSafeToMiss(0, 0, 75, 1)).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// computeClassesNeeded
// ---------------------------------------------------------------------------

describe('computeClassesNeeded', () => {
  it('returns 0 when above threshold', () => {
    expect(computeClassesNeeded(90, 100, 75, 1)).toBe(0);
  });

  it('returns 0 when exactly at threshold', () => {
    expect(computeClassesNeeded(75, 100, 75, 1)).toBe(0);
  });

  it('computes correctly when below threshold', () => {
    // 60 attended, 100 conducted, need 75%, avgCredits 1
    // (0.75 * 100 - 60) / (1 - 0.75) = 15 / 0.25 = 60
    expect(computeClassesNeeded(60, 100, 75, 1)).toBe(60);
  });

  it('accounts for credit weight', () => {
    // same scenario but avgCredits=2 → ceil(60 credits / 2) = 30 classes
    expect(computeClassesNeeded(60, 100, 75, 2)).toBe(30);
  });

  it('handles empty semester (0 conducted)', () => {
    // 100% by default, so no classes needed
    expect(computeClassesNeeded(0, 0, 75, 1)).toBe(0);
  });

  it('handles 100% required threshold', () => {
    // denominator (1 - 1.0) = 0 → Infinity classes needed if any are missed
    expect(computeClassesNeeded(0, 1, 100, 1)).toBe(Infinity);
  });
});

// ---------------------------------------------------------------------------
// computeSubjectStats
// ---------------------------------------------------------------------------

describe('computeSubjectStats', () => {
  const subjects = [SUBJECT_A, SUBJECT_B];
  const allSlots = [SLOT_A, SLOT_B, SLOT_C];

  it('initialises all subjects with 100% when no attendance is logged', () => {
    const stats = computeSubjectStats(subjects, allSlots, [], null, []);
    expect(stats.get('s-a')).toEqual({ attendedClasses: 0, conductedClasses: 0, percentage: 100 });
    expect(stats.get('s-b')).toEqual({ attendedClasses: 0, conductedClasses: 0, percentage: 100 });
  });

  it('counts attended credits correctly', () => {
    const attendance = [
      makeRecord('slot-a', '2024-09-02', 'Attended'), // Mon
      makeRecord('slot-c', '2024-09-04', 'Attended'), // Wed
    ];
    const stats = computeSubjectStats(subjects, allSlots, attendance, null, []);
    expect(stats.get('s-a')?.attendedClasses).toBe(2); // 1 + 1 credit
    expect(stats.get('s-a')?.conductedClasses).toBe(2);
    expect(stats.get('s-a')?.percentage).toBeCloseTo(100, 5);
  });

  it('excludes cancelled classes from conducted count', () => {
    const attendance = [
      makeRecord('slot-a', '2024-09-02', 'Attended'),
      makeRecord('slot-c', '2024-09-04', 'Cancelled'),
    ];
    const stats = computeSubjectStats(subjects, allSlots, attendance, null, []);
    const statA = stats.get('s-a')!;
    // Only slot-a counts: 1 credit attended, 1 credit conducted
    expect(statA.conductedClasses).toBe(1);
    expect(statA.attendedClasses).toBe(1);
  });

  it('excludes postponed classes from conducted count', () => {
    const attendance = [
      makeRecord('slot-a', '2024-09-02', 'Postponed'),
    ];
    const stats = computeSubjectStats(subjects, allSlots, attendance, null, []);
    expect(stats.get('s-a')?.conductedClasses).toBe(0);
  });

  it('excludes records on holidays', () => {
    const attendance = [
      makeRecord('slot-a', '2024-09-02', 'Attended'),
    ];
    const stats = computeSubjectStats(subjects, allSlots, attendance, null, ['2024-09-02']);
    expect(stats.get('s-a')?.conductedClasses).toBe(0);
  });

  it('excludes records before trackingStartDate', () => {
    const attendance = [
      makeRecord('slot-a', '2024-08-01', 'Attended'), // before start
      makeRecord('slot-c', '2024-09-04', 'Attended'), // after start
    ];
    const stats = computeSubjectStats(subjects, allSlots, attendance, '2024-09-01', []);
    expect(stats.get('s-a')?.attendedClasses).toBe(1); // only slot-c
  });

  it('computes percentage correctly for partial attendance', () => {
    const attendance = [
      makeRecord('slot-a', '2024-09-02', 'Attended'),
      makeRecord('slot-c', '2024-09-04', 'Absent'),
    ];
    const stats = computeSubjectStats(subjects, allSlots, attendance, null, []);
    const statA = stats.get('s-a')!;
    expect(statA.attendedClasses).toBe(1);
    expect(statA.conductedClasses).toBe(2);
    expect(statA.percentage).toBeCloseTo(50, 5);
  });

  it('correctly weights lab credits (2 credits per slot)', () => {
    const attendance = [
      makeRecord('slot-b', '2024-09-03', 'Attended'), // Tue, 2 credits
    ];
    const stats = computeSubjectStats(subjects, allSlots, attendance, null, []);
    expect(stats.get('s-b')?.attendedClasses).toBe(2);
    expect(stats.get('s-b')?.conductedClasses).toBe(2);
  });

  it('excludes Sundays automatically', () => {
    // 2024-09-01 is a Sunday
    const attendance = [makeRecord('slot-a', '2024-09-01', 'Attended')];
    const stats = computeSubjectStats(subjects, allSlots, attendance, null, []);
    expect(stats.get('s-a')?.conductedClasses).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// computeOverallStats
// ---------------------------------------------------------------------------

describe('computeOverallStats', () => {
  const subjects = [SUBJECT_A];
  const timetable = [SLOT_A, SLOT_C];
  const allSlots = [...timetable];

  it('returns 100% with no attendance (empty semester)', () => {
    const subjectStats = computeSubjectStats(subjects, allSlots, [], null, []);
    const result = computeOverallStats(subjectStats, null, allSlots, [], null, [], 75);
    expect(result.percentage).toBe(100);
    expect(result.totalAttendedCredits).toBe(0);
    expect(result.totalConductedCredits).toBe(0);
    expect(result.safeMissClasses).toBe(0);
    expect(result.classesNeeded).toBe(0);
  });

  it('merges historical data into totals', () => {
    const historical: HistoricalData = { conductedCredits: 50, attendedCredits: 40 };
    const subjectStats = computeSubjectStats(subjects, allSlots, [], null, []);
    const result = computeOverallStats(subjectStats, historical, allSlots, [], null, [], 75);
    expect(result.totalConductedCredits).toBe(50);
    expect(result.totalAttendedCredits).toBe(40);
    expect(result.percentage).toBeCloseTo(80, 2);
  });

  it('counts cancelled classes in cancelledCount', () => {
    const attendance = [
      makeRecord('slot-a', '2024-09-02', 'Cancelled'),
      makeRecord('slot-c', '2024-09-04', 'Attended'),
    ];
    const subjectStats = computeSubjectStats(subjects, allSlots, attendance, null, []);
    const result = computeOverallStats(subjectStats, null, allSlots, attendance, null, [], 75);
    expect(result.cancelledCount).toBe(1);
  });

  it('reports classesNeeded when below threshold', () => {
    const attendance = [
      makeRecord('slot-a', '2024-09-02', 'Attended'),
      makeRecord('slot-c', '2024-09-04', 'Absent'),
      makeRecord('slot-a', '2024-09-09', 'Absent'),
      makeRecord('slot-c', '2024-09-11', 'Absent'),
    ];
    const subjectStats = computeSubjectStats(subjects, allSlots, attendance, null, []);
    const result = computeOverallStats(subjectStats, null, allSlots, attendance, null, [], 75);
    expect(result.percentage).toBeCloseTo(25, 1); // 1 attended / 4 conducted
    expect(result.classesNeeded).toBeGreaterThan(0);
    expect(result.safeMissClasses).toBe(0);
  });

  it('reports safeMissClasses when above threshold', () => {
    const attendance = [
      makeRecord('slot-a', '2024-09-02', 'Attended'),
      makeRecord('slot-c', '2024-09-04', 'Attended'),
      makeRecord('slot-a', '2024-09-09', 'Attended'),
      makeRecord('slot-c', '2024-09-11', 'Attended'),
    ];
    const subjectStats = computeSubjectStats(subjects, allSlots, attendance, null, []);
    const result = computeOverallStats(subjectStats, null, allSlots, attendance, null, [], 75);
    expect(result.percentage).toBe(100);
    expect(result.safeMissClasses).toBeGreaterThan(0);
    expect(result.classesNeeded).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// computeWeeklyStats
// ---------------------------------------------------------------------------

describe('computeWeeklyStats', () => {
  const subjects = [SUBJECT_A, SUBJECT_B];
  const allSlots: (TimeSlot | OneOffSlot)[] = [SLOT_A, SLOT_B, SLOT_C];

  const weekStart = '2024-09-02'; // Mon
  const weekEnd   = '2024-09-08'; // Sun (excluded)

  it('returns zero stats with no attendance', () => {
    const result = computeWeeklyStats([], allSlots, subjects, weekStart, weekEnd, []);
    expect(result.attended).toBe(0);
    expect(result.absent).toBe(0);
    expect(result.percentage).toBe(100);
    expect(result.subjectBreakdown).toHaveLength(0);
  });

  it('computes weekly percentage from attended+absent', () => {
    const attendance = [
      makeRecord('slot-a', '2024-09-02', 'Attended'), // Mon
      makeRecord('slot-b', '2024-09-03', 'Absent'),   // Tue
    ];
    const result = computeWeeklyStats(attendance, allSlots, subjects, weekStart, weekEnd, []);
    expect(result.attended).toBe(1);
    expect(result.absent).toBe(1);
    expect(result.percentage).toBe(50);
  });

  it('does not count cancelled or postponed in percentage', () => {
    const attendance = [
      makeRecord('slot-a', '2024-09-02', 'Cancelled'),
      makeRecord('slot-b', '2024-09-03', 'Postponed'),
    ];
    const result = computeWeeklyStats(attendance, allSlots, subjects, weekStart, weekEnd, []);
    expect(result.attended).toBe(0);
    expect(result.absent).toBe(0);
    expect(result.cancelled).toBe(1);
    expect(result.postponed).toBe(1);
    expect(result.percentage).toBe(100); // no conducted = 100%
  });

  it('excludes holiday dates', () => {
    const attendance = [
      makeRecord('slot-a', '2024-09-02', 'Attended'),
    ];
    const result = computeWeeklyStats(attendance, allSlots, subjects, weekStart, weekEnd, ['2024-09-02']);
    expect(result.attended).toBe(0);
  });

  it('does not include records outside the week range', () => {
    const attendance = [
      makeRecord('slot-a', '2024-09-09', 'Attended'), // next week
    ];
    const result = computeWeeklyStats(attendance, allSlots, subjects, weekStart, weekEnd, []);
    expect(result.attended).toBe(0);
  });

  it('includes subject breakdown for attended subjects', () => {
    const attendance = [
      makeRecord('slot-a', '2024-09-02', 'Attended'),
      makeRecord('slot-b', '2024-09-03', 'Attended'),
    ];
    const result = computeWeeklyStats(attendance, allSlots, subjects, weekStart, weekEnd, []);
    // SUBJECT_A and SUBJECT_B both have conducted > 0 this week
    expect(result.subjectBreakdown.length).toBe(2);
    const mathBreakdown = result.subjectBreakdown.find(b => b.subjectId === 's-a');
    expect(mathBreakdown?.percentage).toBe(100);
  });
});

// ---------------------------------------------------------------------------
// Edge Cases
// ---------------------------------------------------------------------------

describe('Edge cases', () => {
  it('handles a completely empty app (no subjects, no slots, no records)', () => {
    const stats = computeSubjectStats([], [], [], null, []);
    expect(stats.size).toBe(0);
  });

  it('handles 0% attendance correctly', () => {
    const attendance = [
      makeRecord('slot-a', '2024-09-02', 'Absent'),
      makeRecord('slot-a', '2024-09-09', 'Absent'),
    ];
    const subjectStats = computeSubjectStats([SUBJECT_A], [SLOT_A], attendance, null, []);
    const statA = subjectStats.get('s-a')!;
    expect(statA.percentage).toBe(0);
    expect(statA.attendedClasses).toBe(0);
    expect(statA.conductedClasses).toBe(2); // 2 × 1 credit
  });

  it('handles 100% attendance correctly', () => {
    const attendance = [
      makeRecord('slot-a', '2024-09-02', 'Attended'),
      makeRecord('slot-a', '2024-09-09', 'Attended'),
    ];
    const subjectStats = computeSubjectStats([SUBJECT_A], [SLOT_A], attendance, null, []);
    const statA = subjectStats.get('s-a')!;
    expect(statA.percentage).toBe(100);
  });

  it('safe-to-miss is 0 when exactly at the threshold', () => {
    // 3 attended out of 4, threshold = 75%
    const attendance = [
      makeRecord('slot-a', '2024-09-02', 'Attended'),
      makeRecord('slot-c', '2024-09-04', 'Attended'),
      makeRecord('slot-a', '2024-09-09', 'Attended'),
      makeRecord('slot-c', '2024-09-11', 'Absent'),
    ];
    const subjectStats = computeSubjectStats([SUBJECT_A], [SLOT_A, SLOT_C], attendance, null, []);
    const overall = computeOverallStats(subjectStats, null, [SLOT_A, SLOT_C], attendance, null, [], 75);
    expect(overall.percentage).toBeCloseTo(75, 1);
    expect(overall.safeMissClasses).toBe(0);
    expect(overall.classesNeeded).toBe(0);
  });
});
