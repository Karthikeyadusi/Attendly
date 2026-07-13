
"use client";

import { useMemo } from 'react';
import { useApp } from '@/components/AppProvider';
import { subDays, format } from 'date-fns';
import { BarChart2, TrendingUp, TrendingDown, Minus, CheckCircle2, XCircle, Ban } from 'lucide-react';
import { Progress } from '../ui/progress';
import { computeWeeklyStats, computeSafeToMiss, computeAvgCredits } from '@/lib/attendanceEngine';

// ---------------------------------------------------------------------------
// Deterministic motivational message — no LLM required
// ---------------------------------------------------------------------------

function getMotivationalMessage(pct: number, name?: string | null): { headline: string; body: string } {
  const first = name ? `${name.split(' ')[0]}` : 'You';
  if (pct === 100) return {
    headline: `Spotless week${name ? `, ${first}` : ''}! 🌟`,
    body: 'Every class attended. Your consistency is your competitive edge.',
  };
  if (pct >= 90) return {
    headline: 'Excellent week 🎯',
    body: 'Nearly perfect. Stay consistent and the semester will take care of itself.',
  };
  if (pct >= 75) return {
    headline: 'Good week 👍',
    body: `You're on track. Keep attending and the numbers will stay in the green.`,
  };
  if (pct >= 50) return {
    headline: 'Needs attention ⚠️',
    body: `A few more misses and you'll feel it in the semester total. Time to course-correct.`,
  };
  return {
    headline: `Rough week${name ? `, ${first}` : ''} 🔴`,
    body: 'This week pulled your numbers down. Use this summary to figure out which subjects need your focus.',
  };
}

// ---------------------------------------------------------------------------
// Trend indicator
// ---------------------------------------------------------------------------

function TrendIcon({ current, previous }: { current: number; previous: number | null }) {
  if (previous === null) return <Minus className="h-4 w-4 text-muted-foreground" />;
  const diff = current - previous;
  if (diff > 2) return <TrendingUp className="h-4 w-4 text-green-500" />;
  if (diff < -2) return <TrendingDown className="h-4 w-4 text-destructive" />;
  return <Minus className="h-4 w-4 text-muted-foreground" />;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function WeeklyDebrief() {
  const {
    userName,
    attendance,
    subjects,
    timetable,
    oneOffSlots,
    holidays,
    minAttendancePercentage,
    subjectStats,
  } = useApp();

  const today = new Date();
  const weekEndDate   = format(today, 'yyyy-MM-dd');
  const weekStartDate = format(subDays(today, 6), 'yyyy-MM-dd');
  const prevWeekEnd   = format(subDays(today, 7), 'yyyy-MM-dd');
  const prevWeekStart = format(subDays(today, 13), 'yyyy-MM-dd');

  const allSlots = useMemo(() => [...timetable, ...oneOffSlots], [timetable, oneOffSlots]);
  const avgCredits = useMemo(() => computeAvgCredits(timetable), [timetable]);

  const thisWeek = useMemo(() =>
    computeWeeklyStats(attendance, allSlots, subjects, weekStartDate, weekEndDate, holidays || []),
    [attendance, allSlots, subjects, weekStartDate, weekEndDate, holidays]
  );

  const prevWeek = useMemo(() =>
    computeWeeklyStats(attendance, allSlots, subjects, prevWeekStart, prevWeekEnd, holidays || []),
    [attendance, allSlots, subjects, prevWeekStart, prevWeekEnd, holidays]
  );

  const prevWeekPct = (prevWeek.attended + prevWeek.absent) > 0 ? prevWeek.percentage : null;

  // Aggregate safe-to-miss from live subjectStats
  const totalAttended = useMemo(() => {
    let a = 0, c = 0;
    for (const s of subjectStats.values()) { a += s.attendedClasses; c += s.conductedClasses; }
    return { a, c };
  }, [subjectStats]);

  const safeBunks = computeSafeToMiss(
    totalAttended.a, totalAttended.c, minAttendancePercentage, avgCredits
  );

  // Nothing to show if no data this week
  if (thisWeek.attended === 0 && thisWeek.absent === 0) {
    return (
      <div className="flex flex-col items-center justify-center text-center h-32 text-muted-foreground">
        <BarChart2 className="w-8 h-8 mb-2" />
        <p className="font-semibold text-card-foreground">Weekly Report</p>
        <p className="text-sm px-4">No attendance was logged in the past 7 days. Start tracking this week!</p>
      </div>
    );
  }

  const { headline, body } = getMotivationalMessage(thisWeek.percentage, userName);
  const progressColor = thisWeek.percentage >= minAttendancePercentage
    ? 'hsl(var(--primary))'
    : 'hsl(var(--destructive))';

  const bestSubject = thisWeek.subjectBreakdown.length > 0
    ? [...thisWeek.subjectBreakdown].sort((a, b) => b.percentage - a.percentage)[0]
    : null;
  const worstSubject = thisWeek.subjectBreakdown.length > 1
    ? [...thisWeek.subjectBreakdown].sort((a, b) => a.percentage - b.percentage)[0]
    : null;

  return (
    <div className="space-y-4 p-4 border rounded-lg bg-gradient-to-br from-card to-secondary">
      {/* Header */}
      <div className="text-center mb-2">
        <h4 className="font-semibold text-sm text-primary tracking-wider uppercase">Weekly Summary</h4>
      </div>

      {/* Headline + trend */}
      <div className="flex items-center justify-between gap-3">
        <h3 className="font-bold text-lg">{headline}</h3>
        <TrendIcon current={thisWeek.percentage} previous={prevWeekPct} />
      </div>

      <p className="text-muted-foreground text-sm">{body}</p>

      {/* Weekly attendance bar */}
      <div className="space-y-1">
        <div className="flex justify-between items-center text-sm font-medium">
          <span className="text-muted-foreground">Weekly Attendance</span>
          <span style={{ color: progressColor }}>{thisWeek.percentage.toFixed(1)}%</span>
        </div>
        <Progress
          value={thisWeek.percentage}
          indicatorClassName={thisWeek.percentage < minAttendancePercentage ? 'bg-destructive' : undefined}
        />
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-3 gap-2 text-center text-sm">
        <div className="rounded-lg bg-green-500/10 p-2">
          <CheckCircle2 className="h-4 w-4 text-green-500 mx-auto mb-1" />
          <span className="font-semibold">{thisWeek.attended}</span>
          <p className="text-xs text-muted-foreground">Attended</p>
        </div>
        <div className="rounded-lg bg-destructive/10 p-2">
          <XCircle className="h-4 w-4 text-destructive mx-auto mb-1" />
          <span className="font-semibold">{thisWeek.absent}</span>
          <p className="text-xs text-muted-foreground">Absent</p>
        </div>
        <div className="rounded-lg bg-muted/50 p-2">
          <Ban className="h-4 w-4 text-muted-foreground mx-auto mb-1" />
          <span className="font-semibold">{thisWeek.cancelled}</span>
          <p className="text-xs text-muted-foreground">Cancelled</p>
        </div>
      </div>

      {/* Safe bunks banner */}
      {safeBunks > 0 && (
        <div className="rounded-lg bg-primary/10 p-3 text-sm text-center">
          <span className="font-semibold text-primary">
            You can still miss {safeBunks} class{safeBunks !== 1 ? 'es' : ''} and stay above {minAttendancePercentage}%
          </span>
        </div>
      )}

      {/* Subject highlights */}
      {(bestSubject || worstSubject) && (
        <div className="space-y-1 pt-1 border-t text-sm">
          {bestSubject && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">🏆 Best this week</span>
              <span className="font-medium">{bestSubject.name} ({bestSubject.percentage.toFixed(0)}%)</span>
            </div>
          )}
          {worstSubject && worstSubject.subjectId !== bestSubject?.subjectId && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">⚠️ Needs attention</span>
              <span className="font-medium">{worstSubject.name} ({worstSubject.percentage.toFixed(0)}%)</span>
            </div>
          )}
          {prevWeekPct !== null && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">vs last week</span>
              <span className={thisWeek.percentage >= prevWeekPct ? 'text-green-500 font-medium' : 'text-destructive font-medium'}>
                {thisWeek.percentage >= prevWeekPct ? '+' : ''}{(thisWeek.percentage - prevWeekPct).toFixed(1)}%
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
