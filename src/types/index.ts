

import type { User } from 'firebase/auth';

export type Subject = {
  id: string;
  name: string;
  type: 'Lecture' | 'Lab';
  credits: number;
};

export type DayOfWeek = 'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri' | 'Sat';

export type TimeSlot = {
  id: string;
  day: DayOfWeek;
  startTime: string; // "HH:MM"
  endTime: string; // "HH:MM"
  subjectId: string;
};

// A rescheduled class that occurs on a specific date, not a recurring day.
export type OneOffSlot = {
  id: string; // new UUID
  date: string; // "YYYY-MM-DD"
  startTime: string; // "HH:MM"
  endTime: string; // "HH:MM"
  subjectId: string;
  originalSlotId: string; // To trace it back
  originalDate: string; // The date this class was moved FROM
};

export type AttendanceStatus = 'Attended' | 'Absent' | 'Cancelled' | 'Postponed';

export type AttendanceRecord = {
  id: string; // "YYYY-MM-DD-slotId"
  slotId: string;
  date: string; // "YYYY-MM-DD"
  status: AttendanceStatus;
  previousStatus?: AttendanceStatus | null; // To handle undoing postpones
};

export type ExtractedSlot = {
  day: DayOfWeek;
  startTime: string; // "HH:MM"
  endTime: string; // "HH:MM"
  subjectName: string;
};

export type HistoricalData = {
  conductedCredits: number;
  attendedCredits: number;
};

export type SubjectStats = {
  attendedClasses: number;
  conductedClasses: number;
  percentage: number;
};

export type SubjectMap = Map<string, Subject>;
export type TimetableByDayMap = Map<DayOfWeek, TimeSlot[]>;
export type AttendanceByDateMap = Map<string, AttendanceRecord[]>;
export type SubjectStatsMap = Map<string, SubjectStats>;

// Data that gets archived
export type SemesterSummary = {
  attendance: AttendanceRecord[];
  oneOffSlots: OneOffSlot[];
  holidays: string[];
  historicalData: HistoricalData | null;
  trackingStartDate: string | null;
  minAttendancePercentage: number;
  subjects: Subject[]; // Snapshot of subjects at time of archive
  timetable: TimeSlot[]; // Snapshot of timetable
  timetableStartDate: string | null;
};

export type ArchivedSemester = SemesterSummary & {
  name: string;
  archivedAt: string; // ISO timestamp
};

// The core data that gets stored and restored.
export type AppCoreData = {
  subjects: Subject[];
  timetable: TimeSlot[];
  attendance: AttendanceRecord[];
  oneOffSlots: OneOffSlot[];
  holidays: string[];
  minAttendancePercentage: number;
  historicalData: HistoricalData | null;
  trackingStartDate: string | null;
  userName: string | null;
  archives: ArchivedSemester[];
  timetableStartDate: string | null;
}

// The complete app state including derived data and auth state.
export interface AppData extends AppCoreData {
  user: User | null;
  
  // Derived, memoized data for performance
  subjectMap: SubjectMap;
  timetableByDay: TimetableByDayMap;
  attendanceByDate: AttendanceByDateMap;
  subjectStats: SubjectStatsMap;
}

// The structure of the backup file.
export interface BackupData extends AppCoreData {
  version: number;
  exportedAt: string;
}
