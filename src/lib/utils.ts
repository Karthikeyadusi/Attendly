
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Checks if a given date string (YYYY-MM-DD) is a Sunday in the user's local timezone.
 * @param dateString The date string to check.
 * @returns True if the date is a Sunday, false otherwise.
 */
export function isSunday(dateString: string): boolean {
  // Use getDay() which is based on the local time zone. 
  // getUTCDay() was causing issues where a Monday in one timezone could be a Sunday in UTC.
  const date = new Date(dateString);
  // We split and reconstruct the date to ensure the browser interprets it in the local timezone,
  // avoiding any automatic UTC conversion from the YYYY-MM-DD format.
  const [year, month, day] = dateString.split('-').map(Number);
  const localDate = new Date(year, month - 1, day);
  return localDate.getDay() === 0;
}
