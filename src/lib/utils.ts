import { format, differenceInMinutes, startOfWeek, endOfWeek } from "date-fns";
import { th } from "date-fns/locale";

/**
 * Format date to Thai locale string
 */
export function formatThaiDate(date: Date): string {
  return format(date, "d MMM yyyy HH:mm น.", { locale: th });
}

/**
 * Format duration from minutes to human-readable string
 */
export function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours === 0) return `${mins} นาที`;
  if (mins === 0) return `${hours} ชม.`;
  return `${hours} ชม. ${mins} นาที`;
}

/**
 * Calculate duration between two dates in minutes
 */
export function calcDurationMinutes(start: Date, end: Date): number {
  return differenceInMinutes(end, start);
}

/**
 * Get the start and end of the current week (Monday-based)
 */
export function getCurrentWeekRange() {
  const now = new Date();
  return {
    start: startOfWeek(now, { weekStartsOn: 1 }),
    end: endOfWeek(now, { weekStartsOn: 1 }),
  };
}

/**
 * Weekly bonus threshold in hours
 */
export const WEEKLY_BONUS_THRESHOLD = 20;

/**
 * Check if weekly hours meet bonus threshold
 */
export function isBonusEligible(totalHours: number): boolean {
  return totalHours >= WEEKLY_BONUS_THRESHOLD;
}

/**
 * Format decimal hours to HH:MM:SS string
 */
export function formatHoursToHHMMSS(decimalHours: number): string {
  const h = Math.floor(decimalHours);
  const m = Math.floor((decimalHours * 60) % 60);
  const s = Math.floor((decimalHours * 3600) % 60);
  
  const hStr = h.toString().padStart(2, '0');
  const mStr = m.toString().padStart(2, '0');
  const sStr = s.toString().padStart(2, '0');
  
  return `${hStr}:${mStr}:${sStr}`;
}
