
"use client";

import { useState, useEffect, useCallback, useMemo } from 'react';
import type { AppCoreData, BackupData, ExtractedSlot, Subject, TimeSlot, AttendanceStatus, AttendanceRecord, DayOfWeek, SubjectStatsMap } from '@/types';
import { useIsClient } from './useIsClient';
import { getAuth, onAuthStateChanged, GoogleAuthProvider, signInWithPopup, signOut, type User } from 'firebase/auth';
import { getFirestore, doc, setDoc, getDoc, onSnapshot } from 'firebase/firestore';
import { app as firebaseApp, firebaseEnabled } from '@/lib/firebase';

const APP_DATA_KEY = 'attdendlyData';
const BACKUP_VERSION = 1;

const getInitialData = (): AppCoreData => ({
  subjects: [],
  timetable: [],
  attendance: [],
  minAttendancePercentage: 75,
  historicalData: null,
  trackingStartDate: null,
  userName: null,
});

export function useAppData() {
  const isClient = useIsClient();
  const [data, setData] = useState<AppCoreData>(getInitialData());
  const [isLoaded, setIsLoaded] = useState(false);
  const [user, setUser] = useState<User | null>(null);

  // Effect to load initial data from localStorage (for signed-out users)
  useEffect(() => {
    if (isClient) {
      try {
        const storedData = localStorage.getItem(APP_DATA_KEY);
        if (storedData) {
          setData(JSON.parse(storedData));
        }
      } catch (error) {
        console.error("Failed to load data from localStorage", error);
      }
    }
  }, [isClient]);
  
  // Auth state listener
  useEffect(() => {
    if (!firebaseEnabled || !firebaseApp) {
      setIsLoaded(true); // If firebase is disabled, we are "loaded" with local data
      return;
    }
    const auth = getAuth(firebaseApp);
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (!currentUser) {
        // User logged out, ensure local data is loaded
        const storedData = localStorage.getItem(APP_DATA_KEY);
        setData(storedData ? JSON.parse(storedData) : getInitialData());
        setIsLoaded(true);
      }
      // isLoaded will be set to true by the Firestore listener for logged-in users
    });
    return () => unsubscribe();
  }, []);

  // Firestore real-time listener for logged-in users
  useEffect(() => {
    if (!user || !firebaseEnabled || !firebaseApp) return; // Only run for logged-in users

    const db = getFirestore(firebaseApp);
    const userDocRef = doc(db, 'users', user.uid);

    const unsubscribe = onSnapshot(userDocRef, (docSnap) => {
      // Ignore local changes that are just being echoed back by the server
      if (docSnap.metadata.hasPendingWrites) {
        return;
      }
      
      if (docSnap.exists()) {
        const cloudData = docSnap.data() as AppCoreData;
        setData(cloudData);
      }
      setIsLoaded(true); // Data is loaded (or we know it doesn't exist)
    });

    return () => unsubscribe();
  }, [user]);

  // Effect to save data to localStorage and Firestore
  useEffect(() => {
    if (!isLoaded || !isClient) return;
    
    // Always save to localStorage for offline access and signed-out state
    localStorage.setItem(APP_DATA_KEY, JSON.stringify(data));

    // If user is logged in, save to Firestore
    if (user && firebaseEnabled && firebaseApp) {
      const db = getFirestore(firebaseApp);
      const userDocRef = doc(db, 'users', user.uid);
      setDoc(userDocRef, data).catch(error => {
        console.error("Error writing to Firestore:", error);
      });
    }
  }, [data, user, isClient, isLoaded]);


  const signIn = async () => {
    if (!firebaseEnabled || !firebaseApp) {
        console.error("Firebase is not configured. Cannot sign in.");
        return;
    }
    const auth = getAuth(firebaseApp);
    const provider = new GoogleAuthProvider();
    try {
        const result = await signInWithPopup(auth, provider);
        const loggedInUser = result.user;

        const db = getFirestore(firebaseApp);
        const userDocRef = doc(db, 'users', loggedInUser.uid);
        const docSnap = await getDoc(userDocRef);

        if (!docSnap.exists()) {
            // New user to Firestore: push local data to cloud
            const localDataString = localStorage.getItem(APP_DATA_KEY);
            const localData = localDataString ? JSON.parse(localDataString) : getInitialData();
            await setDoc(userDocRef, localData);
            setData(localData); // Ensure local state reflects this
        } else {
            // Existing user: onSnapshot will handle fetching the data.
            setData(docSnap.data() as AppCoreData);
        }

    } catch (error) {
        console.error("Google Sign-in failed:", error);
    }
  };

  const signOutUser = async () => {
      if (!firebaseEnabled || !firebaseApp) return;
      const auth = getAuth(firebaseApp);
      await signOut(auth);
      // The onAuthStateChanged listener will handle state reset
  };

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
                    credits: 2,
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
  
  const getBackupData = useCallback((): BackupData => {
    return {
      ...data,
      version: BACKUP_VERSION,
      exportedAt: new Date().toISOString(),
    };
  }, [data]);

  const restoreFromBackup = useCallback((backupData: BackupData) => {
    const { version, exportedAt, ...restOfData } = backupData;
    const initialData = getInitialData();
    const finalData = { ...initialData, ...restOfData };
    setData(finalData);
  }, []);

  const setUserName = useCallback((name: string) => {
    setData(prev => ({ ...prev, userName: name.trim() }));
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

  const subjectStats: SubjectStatsMap = useMemo(() => {
    const stats: SubjectStatsMap = new Map();
    if (!isLoaded) return stats;

    const slotSubjectMap = new Map(data.timetable.map(slot => [slot.id, slot.subjectId]));

    for (const subject of data.subjects) {
      stats.set(subject.id, { attendedClasses: 0, conductedClasses: 0, percentage: 100 });
    }

    const filteredAttendance = data.trackingStartDate
      ? data.attendance.filter(r => r.date >= data.trackingStartDate!)
      : data.attendance;

    for (const record of filteredAttendance) {
      if (record.status === 'Cancelled' || record.status === 'Postponed') continue;
      
      const subjectId = slotSubjectMap.get(record.slotId);
      if (subjectId) {
        const subjectStat = stats.get(subjectId);
        if (subjectStat) {
          subjectStat.conductedClasses += 1;
          if (record.status === 'Attended') {
            subjectStat.attendedClasses += 1;
          }
        }
      }
    }
    
    for(const stat of stats.values()) {
      if (stat.conductedClasses > 0) {
        stat.percentage = (stat.attendedClasses / stat.conductedClasses) * 100;
      } else {
        stat.percentage = 100;
      }
    }
    
    return stats;
  }, [data.subjects, data.timetable, data.attendance, data.trackingStartDate, isLoaded]);

  return {
    ...data,
    isLoaded,
    user,
    signIn,
    signOutUser,
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
    getBackupData,
    restoreFromBackup,
    setUserName,
    // Provide memoized data
    subjectMap,
    timetableByDay,
    attendanceByDate,
    subjectStats,
  };
}
