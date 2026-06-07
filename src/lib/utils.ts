import { format, differenceInMinutes } from "date-fns";
import { th } from "date-fns/locale";

export const BANGKOK_TIME_ZONE = "Asia/Bangkok";

const DAY_MS = 24 * 60 * 60 * 1000;

function getBangkokDateParts(date: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: BANGKOK_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const getPart = (type: Intl.DateTimeFormatPartTypes) => {
    const value = parts.find((part) => part.type === type)?.value;
    return value ? Number(value) : 0;
  };

  return {
    year: getPart("year"),
    month: getPart("month"),
    day: getPart("day"),
  };
}

function toBangkokWallTime(date: Date): Date {
  return new Date(date.toLocaleString("en-US", { timeZone: BANGKOK_TIME_ZONE }));
}

/**
 * Format date to Thai locale string
 */
export function formatThaiDate(date: Date): string {
  const tzDate = toBangkokWallTime(date);
  return format(tzDate, "d MMM yyyy HH:mm น.", { locale: th });
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

export function formatBangkokDateKey(date: Date): string {
  const { year, month, day } = getBangkokDateParts(date);
  return [
    year.toString().padStart(4, "0"),
    month.toString().padStart(2, "0"),
    day.toString().padStart(2, "0"),
  ].join("-");
}

/**
 * Get the start and end of a Monday-based week as UTC instants for Bangkok time.
 */
export function getBangkokWeekRange(date = new Date()) {
  const { year, month, day } = getBangkokDateParts(date);
  const bangkokCalendarDate = new Date(Date.UTC(year, month - 1, day));
  const dayOfWeek = bangkokCalendarDate.getUTCDay();
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const start = new Date(Date.UTC(year, month - 1, day + mondayOffset, -7, 0, 0, 0));

  return {
    start,
    end: new Date(start.getTime() + 7 * DAY_MS - 1),
  };
}

export function getCurrentWeekRange() {
  return getBangkokWeekRange(new Date());
}

export function getBangkokWeekStartKey(date = new Date()): string {
  return formatBangkokDateKey(getBangkokWeekRange(date).start);
}

export function getBangkokDayName(date = new Date()): string {
  const { year, month, day } = getBangkokDateParts(date);
  const bangkokCalendarDate = new Date(Date.UTC(year, month - 1, day));
  const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  return dayNames[bangkokCalendarDate.getUTCDay()];
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
