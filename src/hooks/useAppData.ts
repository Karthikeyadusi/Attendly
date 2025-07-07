
"use client";

import { useState, useEffect, useCallback, useMemo } from 'react';
import type { AppCoreData, BackupData, ExtractedSlot, Subject, TimeSlot, AttendanceStatus, AttendanceRecord, DayOfWeek, SubjectStatsMap, OneOffSlot } from '@/types';
import { useIsClient } from './useIsClient';
import { getAuth, onAuthStateChanged, GoogleAuthProvider, signInWithPopup, signOut, type User } from 'firebase/auth';
import { getFirestore, doc, setDoc, getDoc, onSnapshot } from 'firebase/firestore';
import { app as firebaseApp, firebaseEnabled } from '@/lib/firebase';
import { getDay } from 'date-fns';
import { useToast } from './use-toast';

const APP_DATA_KEY = 'attdendlyData';
const BACKUP_VERSION = 1;

const dayMap: { [key: number]: DayOfWeek | undefined } = {
    1: 'Mon', 2: 'Tue', 3: 'Wed', 4: 'Thu', 5: 'Fri', 6: 'Sat'
};

const getInitialData = (): AppCoreData => ({
  subjects: [],
  timetable: [],
  attendance: [],
  oneOffSlots: [],
  holidays: [],
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
  const { toast } = useToast();

  const handleFirestoreError = useCallback((error: any) => {
    console.error("Firestore error:", error);
    let description = "An unknown error occurred while saving your data.";
    if (error.code === 'permission-denied') {
        description = "This is likely due to incorrect Firestore security rules. Please ensure they allow writes for authenticated users.";
    } else if (error.code === 'unauthenticated') {
        description = "You are not authenticated. Please sign in again.";
    } else if (error.code === 'unavailable') {
        description = "Could not connect to the cloud. Please check your internet connection.";
    }
    
    toast({
        variant: "destructive",
        title: "Cloud Sync Failed",
        description: description,
    });
  }, [toast]);

  // Effect to load initial data from localStorage (for signed-out users)
  useEffect(() => {
    if (isClient) {
      try {
        const storedData = localStorage.getItem(APP_DATA_KEY);
        if (storedData) {
          const parsed = JSON.parse(storedData);
          // Backwards compatibility for old data
          if (!parsed.oneOffSlots) parsed.oneOffSlots = [];
          if (!parsed.holidays) parsed.holidays = [];
          setData(parsed);
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
        // User logged out, ensure local data is loaded and defaults are set
        const storedData = localStorage.getItem(APP_DATA_KEY);
        if (storedData) {
          const parsed = JSON.parse(storedData);
          if (!parsed.oneOffSlots) parsed.oneOffSlots = [];
          if (!parsed.holidays) parsed.holidays = [];
          setData(parsed);
        } else {
          setData(getInitialData());
        }
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
        // Backwards compatibility
        if (!cloudData.oneOffSlots) cloudData.oneOffSlots = [];
        if (!cloudData.holidays) cloudData.holidays = [];
        setData(cloudData);
      }
      setIsLoaded(true); // Data is loaded (or we know it doesn't exist)
    }, (error) => {
      handleFirestoreError(error)
    });

    return () => unsubscribe();
  }, [user, handleFirestoreError]);

  // Effect to save data to localStorage and Firestore
  useEffect(() => {
    if (!isLoaded || !isClient) return;
    
    // Always save to localStorage for offline access and signed-out state
    localStorage.setItem(APP_DATA_KEY, JSON.stringify(data));

    // If user is logged in, save to Firestore
    if (user && firebaseEnabled && firebaseApp) {
      const db = getFirestore(firebaseApp);
      const userDocRef = doc(db, 'users', user.uid);
      setDoc(userDocRef, data).catch(handleFirestoreError);
    }
  }, [data, user, isClient, isLoaded, handleFirestoreError]);


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
            await setDoc(userDocRef, localData).catch(handleFirestoreError);
            setData(localData); // Ensure local state reflects this
        } else {
            // Existing user: onSnapshot will handle fetching the data.
            const cloudData = docSnap.data() as AppCoreData;
            if (!cloudData.oneOffSlots) cloudData.oneOffSlots = [];
            if (!cloudData.holidays) cloudData.holidays = [];
            setData(cloudData);
        }

    } catch (error: any) {
        console.error("Google Sign-in failed:", error);
        let description = "An unknown error occurred.";
        if (error.code === 'auth/popup-closed-by-user') {
            description = "The sign-in window was closed before completing."
        } else if (error.code === 'auth/network-request-failed') {
            description = "A network error occurred. Please check your connection."
        }
        toast({
            variant: "destructive",
            title: "Sign-in Failed",
            description: description
        });
    }
  };

  const signOutUser = async () => {
      if (!firebaseEnabled || !firebaseApp) return;
      const auth = getAuth(firebaseApp);
      await signOut(auth);
      // The onAuthStateChanged listener will handle state reset
  };

  const forceCloudSync = useCallback(async () => {
    if (!user || !firebaseEnabled || !firebaseApp) {
        toast({
            variant: "destructive",
            title: "Not Signed In",
            description: "You must be signed in to sync with the cloud.",
        });
        return;
    }
    
    toast({
        title: "Syncing...",
        description: "Forcing a sync with the cloud.",
    });

    try {
        const db = getFirestore(firebaseApp);
        const userDocRef = doc(db, 'users', user.uid);
        await setDoc(userDocRef, data);
        toast({
            title: "Sync Complete",
            description: "Your data is up-to-date in the cloud.",
        });
    } catch (error) {
        handleFirestoreError(error);
    }
  }, [user, data, toast, handleFirestoreError]);

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
      const newOneOffSlots = (prev.oneOffSlots || []).filter(slot => slot.subjectId !== subjectId);
      
      return {
        ...prev,
        subjects: prev.subjects.filter(s => s.id !== subjectId),
        timetable: newTimetable,
        attendance: newAttendance,
        oneOffSlots: newOneOffSlots,
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

  const logAttendance = useCallback((slot: TimeSlot | OneOffSlot, date: string, status: AttendanceStatus) => {
    setData(prev => {
      if (prev.trackingStartDate && date < prev.trackingStartDate) {
        console.warn(`Cannot log attendance for dates before ${prev.trackingStartDate}`);
        return prev;
      }
      if ((prev.holidays || []).includes(date)) {
        console.warn(`Cannot log attendance on a holiday.`);
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

      const newAttendance = [...prev.attendance];
      const existingRecordIndex = newAttendance.findIndex(r => r.id === record.id);
      if (existingRecordIndex > -1) {
        newAttendance[existingRecordIndex] = record;
      } else {
        newAttendance.push(record);
      }
      return { ...prev, attendance: newAttendance };
    });
  }, []);
  
  const rescheduleClass = useCallback((slot: TimeSlot | OneOffSlot, originalDate: string, newDate: string, newStartTime: string, newEndTime: string) => {
    setData(prev => {
      // Find previous status before postponing
      const existingRecord = prev.attendance.find(r => r.id === `${originalDate}-${slot.id}`);
      const previousStatus = existingRecord ? existingRecord.status : null;

      // 1. Mark original class as Postponed, saving previous state
      const record: AttendanceRecord = {
          id: `${originalDate}-${slot.id}`,
          slotId: slot.id,
          date: originalDate,
          status: 'Postponed',
          previousStatus: previousStatus
      };
      const newAttendance = [...prev.attendance];
      const existingRecordIndex = newAttendance.findIndex(r => r.id === record.id);
      if (existingRecordIndex > -1) {
          newAttendance[existingRecordIndex] = record;
      } else {
          newAttendance.push(record);
      }

      // 2. Create a new one-off slot for the new date and time
      const newOneOffSlot: OneOffSlot = {
          id: crypto.randomUUID(),
          date: newDate,
          startTime: newStartTime,
          endTime: newEndTime,
          subjectId: slot.subjectId,
          originalSlotId: 'originalSlotId' in slot ? slot.originalSlotId : slot.id,
          originalDate: originalDate,
      };
      const newOneOffSlots = [...(prev.oneOffSlots || []), newOneOffSlot];
      
      return { ...prev, attendance: newAttendance, oneOffSlots: newOneOffSlots };
    });
  }, []);

  const undoPostpone = useCallback((oneOffSlotId: string) => {
    let toastShown = false;
    setData(prev => {
        const oneOffs = prev.oneOffSlots || [];
        const slotToUndo = oneOffs.find(s => s.id === oneOffSlotId);
        if (!slotToUndo) return prev;

        const originalAttendanceId = `${slotToUndo.originalDate}-${slotToUndo.originalSlotId}`;
        const originalRecord = prev.attendance.find(
            r => r.id === originalAttendanceId && r.status === 'Postponed'
        );
        if (!originalRecord) return prev;

        const newOneOffSlots = oneOffs.filter(s => s.id !== oneOffSlotId);
        
        let newAttendance = [...prev.attendance];
        if (originalRecord.previousStatus) {
            const restoredRecord: AttendanceRecord = { ...originalRecord, status: originalRecord.previousStatus };
            delete restoredRecord.previousStatus;
            newAttendance = newAttendance.map(r => r.id === originalRecord.id ? restoredRecord : r);
        } else {
            newAttendance = newAttendance.filter(r => r.id !== originalRecord.id);
        }

        if (!toastShown) {
            toast({
                title: "Postponement Undone",
                description: "The class has been restored to its original schedule.",
            });
            toastShown = true;
        }

        return { ...prev, oneOffSlots: newOneOffSlots, attendance: newAttendance };
    });
  }, [toast]);

  const deleteOneOffSlot = useCallback((oneOffSlotId: string) => {
    setData(prev => {
      const oneOffs = prev.oneOffSlots || [];
      const slotToDelete = oneOffs.find(s => s.id === oneOffSlotId);
      if (!slotToDelete) return prev;

      // 1. Remove the one-off slot
      const newOneOffSlots = oneOffs.filter(s => s.id !== oneOffSlotId);

      // 2. Find and remove the original 'Postponed' record to reset its state
      const originalAttendanceId = `${slotToDelete.originalDate}-${slotToDelete.originalSlotId}`;
      const newAttendance = prev.attendance.filter(r => r.id !== originalAttendanceId);
      
      toast({
          title: "Postponement Deleted",
          description: "The rescheduled class has been removed and the original class slot is available again.",
      });

      return { ...prev, oneOffSlots: newOneOffSlots, attendance: newAttendance };
    });
  }, [toast]);

  const toggleHoliday = useCallback((dateString: string) => {
    setData(prev => {
        const isHoliday = (prev.holidays || []).includes(dateString);
        let newHolidays: string[];
        let newAttendance = [...prev.attendance];

        if (isHoliday) {
            // It was a holiday, now it's not. Remove it.
            newHolidays = (prev.holidays || []).filter(h => h !== dateString);
        } else {
            // It was not a holiday, now it is. Add it.
            newHolidays = [...(prev.holidays || []), dateString];
            // Remove any attendance records for this date as they are no longer relevant.
            newAttendance = newAttendance.filter(r => r.date !== dateString);
        }

        return {
            ...prev,
            holidays: newHolidays,
            attendance: newAttendance,
        };
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
                    type: slot.subjectName.toLowerCase().includes('lab') ? 'Lab' : 'Lecture',
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
    const finalData = { ...initialData, ...restOfData, oneOffSlots: restOfData.oneOffSlots || [], holidays: restOfData.holidays || [] };
    setData(finalData);
  }, []);

  const setUserName = useCallback((name: string) => {
    setData(prev => ({ ...prev, userName: name.trim() }));
  }, []);

  const clearAllData = useCallback(() => {
    setData(getInitialData());
    toast({
        variant: "destructive",
        title: "Data Cleared",
        description: "All application data has been wiped.",
    });
  }, [toast]);

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

  const getScheduleForDate = useCallback((dateString: string): (TimeSlot | OneOffSlot)[] => {
    if (!dateString || !isClient) return [];
    if ((data.holidays || []).includes(dateString)) return [];
    
    const dateObj = new Date(dateString + 'T00:00:00'); // Avoid timezone issues
    const dayOfWeek = dayMap[dateObj.getDay()];

    const regularSlots = dayOfWeek ? (timetableByDay.get(dayOfWeek) || []) : [];
    const oneOffs = (data.oneOffSlots || []).filter(s => s.date === dateString);

    const allSlots = [...regularSlots, ...oneOffs];
    allSlots.sort((a, b) => a.startTime.localeCompare(b.startTime));
    
    return allSlots;
  }, [isClient, timetableByDay, data.oneOffSlots, data.holidays]);

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

    const allSlots = [...data.timetable, ...(data.oneOffSlots || [])];
    const slotSubjectMap = new Map(allSlots.map(slot => [slot.id, slot.subjectId]));

    for (const subject of data.subjects) {
      stats.set(subject.id, { attendedClasses: 0, conductedClasses: 0, percentage: 100 });
    }

    const filteredAttendance = data.trackingStartDate
      ? data.attendance.filter(r => r.date >= data.trackingStartDate!)
      : data.attendance;

    for (const record of filteredAttendance) {
      if ((data.holidays || []).includes(record.date)) continue;
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
  }, [data.subjects, data.timetable, data.oneOffSlots, data.attendance, data.trackingStartDate, data.holidays, isLoaded]);

  return {
    ...data,
    isLoaded,
    user,
    signIn,
    signOutUser,
    forceCloudSync,
    addSubject,
    updateSubject,
    deleteSubject,
    addTimetableSlot,
    updateTimetableSlot,
    deleteTimetableSlot,
    logAttendance,
    rescheduleClass,
    undoPostpone,
    deleteOneOffSlot,
    toggleHoliday,
    setMinAttendancePercentage,
    importTimetable,
    saveHistoricalData,
    getBackupData,
    restoreFromBackup,
    setUserName,
    clearAllData,
    // Provide memoized data
    subjectMap,
    timetableByDay,
    attendanceByDate,
    subjectStats,
    getScheduleForDate,
  };
}
