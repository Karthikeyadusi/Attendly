
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Checks if a given date string (YYYY-MM-DD) is a Sunday.
 * @param dateString The date string to check.
 * @returns True if the date is a Sunday, false otherwise.
 */
export function isSunday(dateString: string): boolean {
  // Add T00:00:00 to avoid timezone issues where the date might shift
  // depending on the user's local timezone.
  const date = new Date(dateString + 'T00:00:00');
  return date.getUTCDay() === 0;
}

    