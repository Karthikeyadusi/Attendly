
"use client";

import { useState, useEffect, useCallback, useMemo } from 'react';
import type { AppData, Subject, TimeSlot, AttendanceRecord, DayOfWeek, AttendanceStatus, ExtractedSlot, HistoricalData } from '@/types';
import { useIsClient } from './useIsClient';

const APP_DATA_KEY = 'classCompassData';

const getInitialData = (): AppData => ({
  subjects: [],
  timetable: [],
  attendance: [],
  minAttendancePercentage: 75,
  historicalData: null,
  trackingStartDate: null,
  // Derived data will be calculated by the hook
  subjectMap: new Map(),
  timetableByDay: new Map(),
  attendanceByDate: new Map(),
});

export function useAppData() {
  const isClient = useIsClient();
  const [data, setData] = useState<Omit<AppData, 'subjectMap' | 'timetableByDay' | 'attendanceByDate'>>(getInitialData());
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    if (isClient) {
      try {
        const storedData = localStorage.getItem(APP_DATA_KEY);
        if (storedData) {
          const parsedData = JSON.parse(storedData);
          
          if (Array.isArray(parsedData.historicalData)) {
            parsedData.historicalData = null;
          }
          if (typeof parsedData.historicalData === 'undefined') {
            parsedData.historicalData = null;
          }
          if (typeof parsedData.trackingStartDate === 'undefined') {
            parsedData.trackingStartDate = null;
          }
          if (parsedData.subjects && parsedData.subjects.some((s: Subject) => s.credits === undefined)) {
            parsedData.subjects = parsedData.subjects.map((s: Subject) => ({...s, credits: s.credits ?? 1}));
          }
          setData(parsedData);
        }
      } catch (error) {
        console.error("Failed to load data from localStorage", error);
      } finally {
        setIsLoaded(true);
      }
    }
  }, [isClient]);

  useEffect(() => {
    if (isClient && isLoaded) {
      try {
        localStorage.setItem(APP_DATA_KEY, JSON.stringify(data));
      } catch (error) {
        console.error("Failed to save data to localStorage", error);
      }
    }
  }, [data, isClient, isLoaded]);

  const addSubject = useCallback((subject: Omit<Subject, 'id'>) => {
    setData(prev => ({ ...prev, subjects: [...prev.subjects, { ...subject, id: crypto.randomUUID() }] }));
  }, []);

  const updateSubject = useCallback((updatedSubject: Subject) => {
    setData(prev => ({
      ...prev,
      subjects: prev.subjects.map(s => s.id === updatedSubject.id ? updatedSubject : s),
    }));
  }, []);

  const deleteSubject = useCallback((subjectId: string) => {
    setData(prev => {
      const newTimetable = prev.timetable.filter(slot => slot.subjectId !== subjectId);
      const newAttendance = prev.attendance.filter(record => !newTimetable.find(slot => slot.id === record.slotId));
      return {
        ...prev,
        subjects: prev.subjects.filter(s => s.id !== subjectId),
        timetable: newTimetable,
        attendance: newAttendance,
      };
    });
  }, []);

  const addTimetableSlot = useCallback((slot: Omit<TimeSlot, 'id'>) => {
    setData(prev => ({ ...prev, timetable: [...prev.timetable, { ...slot, id: crypto.randomUUID() }] }));
  }, []);

  const updateTimetableSlot = useCallback((updatedSlot: TimeSlot) => {
    setData(prev => ({
      ...prev,
      timetable: prev.timetable.map(s => s.id === updatedSlot.id ? updatedSlot : s),
    }));
  }, []);
  
  const deleteTimetableSlot = useCallback((slotId: string) => {
    setData(prev => ({
        ...prev,
        timetable: prev.timetable.filter(slot => slot.id !== slotId)
    }));
  }, []);

  const logAttendance = useCallback((slot: TimeSlot, date: string, status: AttendanceStatus) => {
    setData(prev => {
      if (prev.trackingStartDate && date < prev.trackingStartDate) {
        console.warn(`Cannot log attendance for dates before ${prev.trackingStartDate}`);
        return prev;
      }

      const subject = prev.subjects.find(s => s.id === slot.subjectId);
      if (!subject) return prev;
      
      const record: AttendanceRecord = {
        id: `${date}-${slot.id}`,
        slotId: slot.id,
        date: date,
        status: status,
      };

      const existingRecordIndex = prev.attendance.findIndex(r => r.id === record.id);
      const newAttendance = [...prev.attendance];
      if (existingRecordIndex > -1) {
        newAttendance[existingRecordIndex] = record;
      } else {
        newAttendance.push(record);
      }
      return { ...prev, attendance: newAttendance };
    });
  }, []);

  const setMinAttendancePercentage = useCallback((percentage: number) => {
    setData(prev => ({ ...prev, minAttendancePercentage: percentage }));
  }, []);
  
  const importTimetable = useCallback((extractedSlots: ExtractedSlot[]) => {
    setData(prev => {
        const newSubjects = [...prev.subjects];
        const newTimetable = [...prev.timetable];
        const existingSubjectNames = new Set(prev.subjects.map(s => s.name.toLowerCase()));

        extractedSlots.forEach(slot => {
            if (slot.subjectName && !existingSubjectNames.has(slot.subjectName.toLowerCase())) {
                const newSubject: Subject = {
                    id: crypto.randomUUID(),
                    name: slot.subjectName,
                    type: 'Lecture',
                    credits: 1,
                };
                newSubjects.push(newSubject);
                existingSubjectNames.add(newSubject.name.toLowerCase());
            }
        });

        const subjectNameToIdMap = new Map(newSubjects.map(s => [s.name.toLowerCase(), s.id]));

        extractedSlots.forEach(slot => {
            if (!slot.subjectName || !slot.day || !slot.startTime || !slot.endTime) return;
            
            const subjectId = subjectNameToIdMap.get(slot.subjectName.toLowerCase());
            if (subjectId) {
                const slotExists = newTimetable.some(
                    ts => ts.day === slot.day && ts.startTime === slot.startTime && ts.subjectId === subjectId
                );

                if (!slotExists) {
                    const newSlot: TimeSlot = {
                        id: crypto.randomUUID(),
                        day: slot.day,
                        startTime: slot.startTime,
                        endTime: slot.endTime,
                        subjectId: subjectId,
                    };
                    newTimetable.push(newSlot);
                }
            }
        });
        
        return {
            ...prev,
            subjects: newSubjects,
            timetable: newTimetable,
        };
    });
  }, []);

  const saveHistoricalData = useCallback((data: { startDate: string; conductedCredits: number; attendedCredits: number; }) => {
    setData(prev => ({
      ...prev,
      trackingStartDate: data.startDate,
      historicalData: {
        conductedCredits: data.conductedCredits,
        attendedCredits: data.attendedCredits,
      },
    }));
  }, []);
  
  // Memoized derived data for performance
  const subjectMap = useMemo(() => new Map(data.subjects.map(s => [s.id, s])), [data.subjects]);
  
  const timetableByDay = useMemo(() => {
    return data.timetable.reduce((acc, slot) => {
      const daySlots = acc.get(slot.day) || [];
      daySlots.push(slot);
      acc.set(slot.day, daySlots);
      return acc;
    }, new Map<DayOfWeek, TimeSlot[]>());
  }, [data.timetable]);

  const attendanceByDate = useMemo(() => {
    return data.attendance.reduce((acc, record) => {
      const records = acc.get(record.date) || [];
      records.push(record);
      acc.set(record.date, records);
      return acc;
    }, new Map<string, AttendanceRecord[]>());
  }, [data.attendance]);


  return {
    ...data,
    isLoaded,
    addSubject,
    updateSubject,
    deleteSubject,
    addTimetableSlot,
    updateTimetableSlot,
    deleteTimetableSlot,
    logAttendance,
    setMinAttendancePercentage,
    importTimetable,
    saveHistoricalData,
    // Provide memoized data
    subjectMap,
    timetableByDay,
    attendanceByDate,
  };
}
