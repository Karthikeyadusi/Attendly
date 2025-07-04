"use client";

import { useState, useEffect, useCallback } from 'react';
import type { AppData, Subject, TimeSlot, AttendanceRecord, DayOfWeek, AttendanceStatus } from '@/types';
import { useIsClient } from './useIsClient';

const APP_DATA_KEY = 'classCompassData';

const getInitialData = (): AppData => ({
  subjects: [],
  timetable: [],
  attendance: [],
  minAttendancePercentage: 75,
});

export function useAppData() {
  const isClient = useIsClient();
  const [data, setData] = useState<AppData>(getInitialData());
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    if (isClient) {
      try {
        const storedData = localStorage.getItem(APP_DATA_KEY);
        if (storedData) {
          setData(JSON.parse(storedData));
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
  
  const deleteTimetableSlot = useCallback((slotId: string) => {
    setData(prev => ({
        ...prev,
        timetable: prev.timetable.filter(slot => slot.id !== slotId)
    }));
  }, []);

  const logAttendance = useCallback((slot: TimeSlot, date: string, status: AttendanceStatus) => {
    setData(prev => {
      const subject = prev.subjects.find(s => s.id === slot.subjectId);
      if (!subject) return prev;
      
      const record: AttendanceRecord = {
        id: `${date}-${slot.id}`,
        slotId: slot.id,
        date: date,
        status: status,
        credits: status === 'Attended' ? subject.credits : 0,
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

  return {
    ...data,
    isLoaded,
    addSubject,
    updateSubject,
    deleteSubject,
    addTimetableSlot,
    deleteTimetableSlot,
    logAttendance,
    setMinAttendancePercentage,
  };
}
