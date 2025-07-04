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

export type AttendanceStatus = 'Attended' | 'Absent' | 'Cancelled';

export type AttendanceRecord = {
  id: string; // "YYYY-MM-DD-slotId"
  slotId: string;
  date: string; // "YYYY-MM-DD"
  status: AttendanceStatus;
  credits: number;
};

export type ExtractedSlot = {
  day: DayOfWeek;
  startTime: string; // "HH:MM"
  endTime: string; // "HH:MM"
  subjectName: string;
};

export type HistoricalRecord = {
  subjectId: string;
  conducted: number;
  attended: number;
};

export interface AppData {
  subjects: Subject[];
  timetable: TimeSlot[];
  attendance: AttendanceRecord[];
  minAttendancePercentage: number;
  historicalData: HistoricalRecord[];
  trackingStartDate: string | null;
}
