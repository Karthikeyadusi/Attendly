import { describe, it, expect } from 'vitest';
import { parseOcrText, normalizeTime, processRawSlots } from '../src/lib/ocrParser';

describe('normalizeTime', () => {
  it('handles standard 24h formats', () => {
    expect(normalizeTime('09:00')).toBe('09:00');
    expect(normalizeTime('14:30')).toBe('14:30');
  });

  it('normalizes single-digit hours', () => {
    expect(normalizeTime('9:00')).toBe('09:00');
    expect(normalizeTime('9.00')).toBe('09:00');
  });

  it('normalizes AM/PM indicator formats', () => {
    expect(normalizeTime('09:00AM')).toBe('09:00');
    expect(normalizeTime('09:00 AM')).toBe('09:00');
    expect(normalizeTime('01:30PM')).toBe('13:30');
    expect(normalizeTime('1:30 PM')).toBe('13:30');
    expect(normalizeTime('12:00 AM')).toBe('00:00'); // Midnight
    expect(normalizeTime('12:00 PM')).toBe('12:00'); // Noon
  });

  it('applies PM shift heuristics for small numbers without AM/PM', () => {
    expect(normalizeTime('1:30')).toBe('13:30'); // Implicit PM (college hours)
    expect(normalizeTime('7:00')).toBe('19:00'); // Implicit PM
    expect(normalizeTime('08:00')).toBe('08:00'); // Keep morning
    expect(normalizeTime('10:45')).toBe('10:45');
  });
});

describe('parseOcrText — List-based Strategy 1 & 2', () => {
  it('extracts slots with explicit time-subject pairs', () => {
    const rawText = `
      Monday
      09:00 Mathematics
      10:40 Physics Lab
      12:20 Lunch Break
      01:30 Chemistry
    `;
    const slots = parseOcrText(rawText);
    expect(slots).toEqual([
      { day: 'Mon', startTime: '09:00', subjectName: 'Mathematics' },
      { day: 'Mon', startTime: '10:40', subjectName: 'Physics Lab' },
      { day: 'Mon', startTime: '12:20', subjectName: 'Lunch Break' },
      { day: 'Mon', startTime: '01:30', subjectName: 'Chemistry' },
    ]);
  });

  it('extracts flat triples of day-time-subject', () => {
    const rawText = `MON 09:00 DS TUE 10:40 DL`;
    const slots = parseOcrText(rawText);
    expect(slots).toEqual([
      { day: 'Mon', startTime: '09:00', subjectName: 'DS' },
      { day: 'Tue', startTime: '10:40', subjectName: 'DL' },
    ]);
  });
});

describe('parseOcrText — Grid-based Strategy 3 (Andhra University Timetable)', () => {
  it('successfully extracts grid structures where times are headers', () => {
    const rawText = `
      DEPARTMENT OF INFORMATION TECHNOLOGY & COMPUTER APPLICATIONS
      TIME ->  09:00AM-09:50AM  09:50AM-10:40AM  10:40AM-11:30AM  11:30AM-12:20PM  01:30PM-02:20PM  02:20PM-03:10PM  03:10PM-04.00PM
      MON      DS              SN              LIBRARY/SELF STUDY  LUNCH BREAK      AAP LAB 1        NCC/NSS
      TUE      CS&DF           DL              AAP LAB 2           NCC/NSS
      WED      CS&DF           IME             I 4.0               SWACHBHARAT
    `;

    const slots = parseOcrText(rawText);

    // Should find Monday subjects and map them around the lunch partition
    const monSlots = slots.filter(s => s.day === 'Mon');
    expect(monSlots.length).toBeGreaterThan(0);

    // Monday morning mapping:
    // DS -> 09:00
    // SN -> 09:50
    // LIBRARY/SELF STUDY -> 10:40
    expect(monSlots).toContainEqual({ day: 'Mon', startTime: '09:00', subjectName: 'DS' });
    expect(monSlots).toContainEqual({ day: 'Mon', startTime: '09:50', subjectName: 'SN' });
    expect(monSlots).toContainEqual({ day: 'Mon', startTime: '10:40', subjectName: 'LIBRARY/SELF STUDY' });

    // Monday afternoon mapping (after lunch break):
    // AAP LAB 1 -> 13:30
    // NCC/NSS -> 14:20
    expect(monSlots).toContainEqual({ day: 'Mon', startTime: '13:30', subjectName: 'AAP LAB 1' });
    expect(monSlots).toContainEqual({ day: 'Mon', startTime: '14:20', subjectName: 'NCC/NSS' });

    // Tuesday morning mapping (no lunch keyword, maps sequentially):
    const tueSlots = slots.filter(s => s.day === 'Tue');
    expect(tueSlots).toContainEqual({ day: 'Tue', startTime: '09:00', subjectName: 'CS&DF' });
    expect(tueSlots).toContainEqual({ day: 'Tue', startTime: '09:50', subjectName: 'DL' });
    expect(tueSlots).toContainEqual({ day: 'Tue', startTime: '10:40', subjectName: 'AAP LAB 2' });
    expect(tueSlots).toContainEqual({ day: 'Tue', startTime: '11:30', subjectName: 'NCC/NSS' });
  });
});

describe('processRawSlots integration', () => {
  it('cleans up and merges sequential same-subject slots', () => {
    const rawSlots = [
      { day: 'Mon' as const, startTime: '09:00', subjectName: 'DS' },
      { day: 'Mon' as const, startTime: '09:50', subjectName: 'DS' }, // consecutive duplicate
      { day: 'Mon' as const, startTime: '10:40', subjectName: 'SN' },
      { day: 'Mon' as const, startTime: '11:30', subjectName: 'LUNCH' }, // structural
    ];

    const processed = processRawSlots(rawSlots);

    // DS should be merged into a single slot from 09:00 to 10:40
    expect(processed).toContainEqual({
      day: 'Mon',
      startTime: '09:00',
      endTime: '10:40',
      subjectName: 'DS',
      credits: 2,
    });

    // LUNCH should be filtered out
    expect(processed.some(s => s.subjectName === 'LUNCH')).toBe(false);
  });
});
