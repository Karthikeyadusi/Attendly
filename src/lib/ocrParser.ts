/**
 * @fileoverview OCR Parser — pure functions for converting Tesseract OCR text
 * into structured timetable slot objects.
 *
 * This module is the OCR equivalent of the old AI extract-timetable-flow.
 * It is fully deterministic, dependency-free, and unit-testable.
 *
 * Pipeline:
 *   Tesseract.js raw text
 *     → parseOcrText()         → RawExtractedSlot[]
 *     → processRawSlots()      → ExtractedSlot[]
 *     → review/edit UI         → (unchanged)
 *     → importTimetable()      → (unchanged)
 */

import type { DayOfWeek, ExtractedSlot } from '@/types';
import { addMinutes, format as formatDate, parse } from 'date-fns';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type RawExtractedSlot = {
  day: DayOfWeek;
  startTime: string;
  subjectName: string;
};

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DAYS_ORDERED: DayOfWeek[] = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/** Full day names and abbreviations that OCR might produce. */
const DAY_ALIASES: Record<string, DayOfWeek> = {
  // Full names
  monday: 'Mon', tuesday: 'Tue', wednesday: 'Wed',
  thursday: 'Thu', friday: 'Fri', saturday: 'Sat',
  // Standard abbreviations
  mon: 'Mon', tue: 'Tue', tues: 'Tue', wed: 'Wed',
  thu: 'Thu', thurs: 'Thu', fri: 'Fri', sat: 'Sat',
  // Common OCR misreads
  'mon.': 'Mon', 'tue.': 'Tue', 'wed.': 'Wed',
  'thu.': 'Thu', 'fri.': 'Fri', 'sat.': 'Sat',
};

const STRUCTURAL_KEYWORDS = ['lunch', 'break', 'recess', 'interval', 'prayer'];

const LUNCH_CUTOFF = '12:20';

// ---------------------------------------------------------------------------
// Time normalization (extracted from original processRawSlots)
// ---------------------------------------------------------------------------

/**
 * Normalises a time string from various OCR-produced formats into HH:MM (24h).
 * Handles: "09:00", "9:00", "9.00", "9:00 AM", "9:00am", "1:00 PM"
 */
export function normalizeTime(timeStr: string): string {
  try {
    if (!timeStr) return '00:00';
    // Replace dot-as-colon OCR artefact
    timeStr = timeStr.replace(/\.(?=\d{2}\b)/, ':').trim();
    const isPM = /pm/i.test(timeStr);
    const isAM = /am/i.test(timeStr);
    timeStr = timeStr.replace(/am|pm/gi, '').trim();

    const [hourStr, minuteStr] = timeStr.split(':');
    if (!hourStr || minuteStr === undefined) return timeStr;

    let hour = parseInt(hourStr, 10);
    if (isNaN(hour)) return timeStr;

    // Heuristic for implicit 12h: small numbers (1–7) in a college timetable are PM
    if (!isPM && !isAM && hour >= 1 && hour <= 7) {
      hour += 12;
    } else if (isPM && hour < 12) {
      hour += 12;
    } else if (isAM && hour === 12) {
      hour = 0;
    }

    const minute = parseInt(minuteStr, 10);
    if (isNaN(minute)) return timeStr;

    return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
  } catch {
    return timeStr;
  }
}

// ---------------------------------------------------------------------------
// Grid-based OCR text parser
// ---------------------------------------------------------------------------

/**
 * Attempts to resolve a token to a known day of week.
 */
function resolveDay(token: string): DayOfWeek | null {
  const normalized = token.toLowerCase()
    .replace(/0/g, 'o')
    .replace(/1/g, 'i')
    .replace(/3/g, 'e')
    .replace(/4/g, 'a')
    .replace(/5/g, 's')
    .replace(/8/g, 'b')
    .replace(/[^a-z.]/g, '');
  return DAY_ALIASES[normalized] ?? null;
}

/**
 * Returns true if a string looks like a time (e.g. "09:00", "9.30", "10:00am").
 */
function looksLikeTime(str: string): boolean {
  return /^\d{1,2}[:.]\d{2}(\s*[ap]m)?$/i.test(str.trim());
}

/**
 * Parses raw Tesseract OCR text into RawExtractedSlot array.
 *
 * Strategy: The timetable is typically laid out as a grid. We look for:
 *   1. Lines that start with a day name (row-based layout)
 *   2. Alternatively, a repeating `DAY TIME SUBJECT` token sequence
 *
 * The function is intentionally lenient — it returns whatever it can find.
 * The subsequent processRawSlots() step normalizes and validates.
 */
export function parseOcrText(rawText: string): RawExtractedSlot[] {
  const results: RawExtractedSlot[] = [];
  const lines = rawText.split('\n').map(l => l.trim()).filter(Boolean);

  // Strategy 1: row-per-day layout
  // Example line: "Monday  09:00 Mathematics  10:00 Physics Lab  12:20 Lunch"
  let currentDay: DayOfWeek | null = null;

  for (const line of lines) {
    // Check if the line is just a day header (e.g. "Monday")
    const tokens = line.split(/\s+/).map(t => t.trim()).filter(Boolean);
    if (tokens.length === 1) {
      const dayFromToken = resolveDay(tokens[0]);
      if (dayFromToken) {
        currentDay = dayFromToken;
        continue;
      }
    }

    // Find all times in the line
    const timeRegex = /\b(0?[1-9]|1[0-2]|2[0-3])[:.][0-5][0-9]\s*(?:am|pm)?\b/gi;
    const timesInLine = Array.from(line.matchAll(timeRegex));

    if (timesInLine.length === 1) {
      // Single class on this line
      const timeStr = timesInLine[0][0];
      const timeIndex = line.indexOf(timeStr);
      const beforeTime = line.substring(0, timeIndex).trim();
      const dayFromBefore = resolveDay(beforeTime);
      if (dayFromBefore) {
        currentDay = dayFromBefore;
      }
      if (currentDay) {
        const subjectName = line.substring(timeIndex + timesInLine[0][0].length).trim();
        if (subjectName) {
          results.push({
            day: currentDay,
            startTime: timeStr.trim(),
            subjectName: subjectName,
          });
        }
      }
    } else if (timesInLine.length > 1) {
      // Multiple classes on this line, split by double spaces or tabs
      const splitTokens = line.split(/\s{2,}|\t+/).map(t => t.trim()).filter(Boolean);
      const dayFromToken = resolveDay(splitTokens[0]);
      let localDay = currentDay;
      if (dayFromToken) {
        localDay = dayFromToken;
        splitTokens.shift();
        currentDay = dayFromToken;
      }
      
      if (localDay) {
        let i = 0;
        while (i < splitTokens.length) {
          const token = splitTokens[i];
          if (looksLikeTime(token)) {
            const subjectName = splitTokens[i + 1] || '';
            if (subjectName && !looksLikeTime(subjectName)) {
              results.push({
                day: localDay,
                startTime: token.trim(),
                subjectName: subjectName.trim(),
              });
              i += 2;
              continue;
            }
          }
          i++;
        }
      }
    }
  }

  // Strategy 2: flat token sequence (fallback for compact table exports)
  // Scan the entire text for "DAY TIME SUBJECT" triples
  if (results.length === 0) {
    const allTokens = lines.flatMap(l => l.split(/\s+/)).filter(Boolean);
    for (let i = 0; i < allTokens.length - 2; i++) {
      const day = resolveDay(allTokens[i]);
      if (day && looksLikeTime(allTokens[i + 1])) {
        const subjectName = allTokens.slice(i + 2, i + 5)
          .filter(t => !looksLikeTime(t) && !resolveDay(t))
          .join(' ')
          .trim();
        if (subjectName) {
          results.push({ day, startTime: allTokens[i + 1], subjectName });
          i += 2;
        }
      }
    }
  }

  // Strategy 3: Grid-based parser for tables (e.g. column headers are times, row starts with day)
  if (results.length === 0) {
    // 1. Extract and normalize column start times
    // We look for times that are likely starts of intervals (followed by a dash or slash)
    const timeIntervalRegex = /\b(0?[1-9]|1[0-2]|2[0-3])[:.][0-5][0-9]\s*(?:am|pm)?\s*(?=[-–—/])/gi;
    const intervalMatches = Array.from(rawText.matchAll(timeIntervalRegex));
    let extractedStartTimes = intervalMatches.map(m => normalizeTime(m[0]));

    // Fallback: if we didn't find times with hyphens, extract all unique times
    if (extractedStartTimes.length < 3) {
      const allTimesRegex = /\b(0?[1-9]|1[0-2]|2[0-3])[:.][0-5][0-9]\s*(?:am|pm)?\b/gi;
      const allMatches = Array.from(rawText.matchAll(allTimesRegex));
      const uniqueNormalized = Array.from(new Set(allMatches.map(m => normalizeTime(m[0])))).sort();
      if (uniqueNormalized.length > 2) {
        // Exclude the very last time which is usually the end of the last period (e.g., 16:00)
        extractedStartTimes = uniqueNormalized.slice(0, -1);
      }
    }

    // Secondary fallback: standard university timetable start times
    if (extractedStartTimes.length < 3) {
      extractedStartTimes = ['09:00', '09:50', '10:40', '11:30', '13:30', '14:20', '15:10'];
    }

    // Partition start times into morning vs afternoon by the 13:00 threshold
    // (keeping 12:20/lunch-start on the morning side)
    const morningTimes = extractedStartTimes.filter(t => t < '13:00');
    const afternoonTimes = extractedStartTimes.filter(t => t >= '13:00');

    // 2. Scan lines for row days
    for (const line of lines) {
      const firstWord = line.split(/\s+/)[0];
      if (!firstWord) continue;

      const day = resolveDay(firstWord);
      if (!day) continue;

      const remainingLine = line.substring(line.indexOf(firstWord) + firstWord.length).trim();
      if (!remainingLine) continue;

      // Adaptive splitting: split by double-or-more spaces if available, otherwise fallback to single space
      const splitPattern = remainingLine.includes('  ') ? /\s{2,}|\t+/ : /\s+/;
      let rawTokens = remainingLine.split(splitPattern).map(t => t.trim()).filter(Boolean);

      // Filter out tokens that look like times or days, and strip/filter noise punctuation
      rawTokens = rawTokens
        .filter(t => !looksLikeTime(t) && !resolveDay(t))
        .map(t => t.replace(/^[|\[\](),.\s]+|[|\[\](),.\s]+$/g, '').trim())
        .filter(t => {
          if (!t) return false;
          // Discard single-character symbols that are not alphanumeric
          if (t.length === 1 && !/^[a-zA-Z0-9]$/.test(t)) return false;
          return true;
        });

      if (rawTokens.length === 0) continue;

      // Heuristic token combiner for single-spaced lines
      const combineTokens = (tokens: string[]): string[] => {
        const combined: string[] = [];
        let i = 0;
        while (i < tokens.length) {
          let token = tokens[i];

          // 1. "AAP" + "LAB" + "1"/"2"
          if (token.toUpperCase() === 'AAP' && tokens[i + 1]?.toUpperCase() === 'LAB') {
            token = token + ' ' + tokens[i + 1];
            i++;
            if (tokens[i + 1] && /^[12]$/.test(tokens[i + 1])) {
              token = token + ' ' + tokens[i + 1];
              i++;
            }
          }
          // 2. "I" + "4.0"
          else if (token.toUpperCase() === 'I' && tokens[i + 1] === '4.0') {
            token = 'I 4.0';
            i++;
          }
          // 3. "LIBRARY/SELF" + "STUDY"
          else if (token.toUpperCase() === 'LIBRARY/SELF' && tokens[i + 1]?.toUpperCase() === 'STUDY') {
            token = 'LIBRARY/SELF STUDY';
            i++;
          }
          // 4. "LUNCH" + "BREAK"
          else if (token.toUpperCase() === 'LUNCH' && tokens[i + 1]?.toUpperCase() === 'BREAK') {
            token = 'LUNCH BREAK';
            i++;
          }
          // 5. "SELF" + "STUDY"
          else if (token.toUpperCase() === 'SELF' && tokens[i + 1]?.toUpperCase() === 'STUDY') {
            token = 'SELF STUDY';
            i++;
          }

          combined.push(token);
          i++;
        }
        return combined;
      };

      const subjectTokens = remainingLine.includes('  ') ? rawTokens : combineTokens(rawTokens);

      // Look for a lunch break token to partition the row
      const lunchIndex = subjectTokens.findIndex(t => 
        /lunch|break/i.test(t) || t.toLowerCase() === 'l' || t.toLowerCase() === 'b'
      );

      if (lunchIndex !== -1) {
        const morningSubs = subjectTokens.slice(0, lunchIndex);
        const afternoonSubs = subjectTokens.slice(lunchIndex + 1);

        // Map morning subjects
        morningSubs.forEach((sub, index) => {
          const startTime = morningTimes[index];
          if (startTime) {
            results.push({ day, startTime, subjectName: sub });
          }
        });

        // Map afternoon subjects
        afternoonSubs.forEach((sub, index) => {
          const startTime = afternoonTimes[index];
          if (startTime) {
            results.push({ day, startTime, subjectName: sub });
          }
        });
      } else {
        // Map all subjects sequentially to all start times
        subjectTokens.forEach((sub, index) => {
          const startTime = extractedStartTimes[index];
          if (startTime) {
            results.push({ day, startTime, subjectName: sub });
          }
        });
      }
    }
  }

  return results;
}

// ---------------------------------------------------------------------------
// processRawSlots — moved from TimetableImportDialog.tsx
// ---------------------------------------------------------------------------

/**
 * Converts an array of raw OCR-extracted slots (day, startTime, subjectName)
 * into fully-processed ExtractedSlots with:
 *  - Normalised times
 *  - Inferred end times (from next class or lunch cutoff rule)
 *  - Merged consecutive same-subject slots
 *  - Structural entries (LUNCH, BREAK) filtered out
 *  - Credits assigned (lab = 3, lecture = 2)
 */
export function processRawSlots(rawSlots: RawExtractedSlot[]): ExtractedSlot[] {
  // 1. Normalize times and filter invalid
  const normalised = rawSlots
    .map(slot => ({ ...slot, startTime: normalizeTime(slot.startTime) }))
    .filter(slot =>
      slot.day &&
      slot.startTime &&
      slot.subjectName &&
      /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(slot.startTime)
    );

  // 2. Group by day
  const slotsByDay = new Map<DayOfWeek, typeof normalised>();
  for (const slot of normalised) {
    if (!slotsByDay.has(slot.day)) slotsByDay.set(slot.day, []);
    slotsByDay.get(slot.day)!.push(slot);
  }

  // 3. Infer end times
  type TimedSlot = RawExtractedSlot & { endTime: string };
  const timedSlots: TimedSlot[] = [];

  for (const [, daySlots] of slotsByDay) {
    const sorted = [...daySlots].sort((a, b) => a.startTime.localeCompare(b.startTime));
    for (let i = 0; i < sorted.length; i++) {
      const current = sorted[i];
      const next = sorted[i + 1] ?? null;
      try {
        let endTime: string;
        if (next) {
          // Cap at lunch if crossing
          if (current.startTime < LUNCH_CUTOFF && next.startTime >= LUNCH_CUTOFF) {
            endTime = LUNCH_CUTOFF;
          } else {
            endTime = next.startTime;
          }
        } else {
          if (current.startTime < LUNCH_CUTOFF) {
            endTime = LUNCH_CUTOFF;
          } else {
            const isLab = current.subjectName.toLowerCase().includes('lab');
            const duration = isLab ? 100 : 50;
            endTime = formatDate(
              addMinutes(parse(current.startTime, 'HH:mm', new Date()), duration),
              'HH:mm'
            );
          }
        }
        timedSlots.push({ ...current, endTime });
      } catch (e) {
        console.warn('Error calculating end time for slot:', current, e);
      }
    }
  }

  // 4. Merge consecutive same-subject slots per day
  const timedByDay = new Map<DayOfWeek, TimedSlot[]>();
  for (const slot of timedSlots) {
    if (!timedByDay.has(slot.day)) timedByDay.set(slot.day, []);
    timedByDay.get(slot.day)!.push(slot);
  }

  const merged: TimedSlot[] = [];
  for (const [, daySlots] of timedByDay) {
    const sorted = [...daySlots].sort((a, b) => a.startTime.localeCompare(b.startTime));
    let i = 0;
    while (i < sorted.length) {
      const current = { ...sorted[i] };
      let j = i + 1;
      while (
        j < sorted.length &&
        sorted[j].subjectName.toLowerCase() === current.subjectName.toLowerCase() &&
        sorted[j].startTime === current.endTime
      ) {
        current.endTime = sorted[j].endTime;
        j++;
      }
      merged.push(current);
      i = j;
    }
  }

  // 5. Filter structural entries and assign credits
  return merged
    .filter(slot => !STRUCTURAL_KEYWORDS.some(kw => slot.subjectName.toLowerCase().includes(kw)))
    .map(slot => ({
      day: slot.day,
      startTime: slot.startTime,
      endTime: slot.endTime,
      subjectName: slot.subjectName.trim(),
      credits: slot.subjectName.toLowerCase().includes('lab') ? 3 : 2,
    }))
    .sort((a, b) => {
      const dayDiff = DAYS_ORDERED.indexOf(a.day) - DAYS_ORDERED.indexOf(b.day);
      if (dayDiff !== 0) return dayDiff;
      return a.startTime.localeCompare(b.startTime);
    });
}
