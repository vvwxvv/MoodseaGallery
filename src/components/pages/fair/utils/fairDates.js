/**
 * fairDates.js
 * Pure utility functions for classifying fairs as current/past.
 * Uses Fair model fields: date_start, date_end, status, year.
 *
 * Same tolerant (EN + CN) parsing + current/past rule as exhibitions
 * (`@/utils/looseDate`), so fairs behave identically.
 */

import { parseLooseDate, isCurrentEntry } from "@/utils/looseDate";

const MS_PER_DAY = 86400000;

/**
 * Parse a fair date string (EN or CN). Returns a Date or null.
 */
export function parseFairDate(dateStr) {
  return parseLooseDate(dateStr);
}

/**
 * Check if a fair is currently active.
 * Smart rule (see isCurrentEntry): status override → end-date range →
 * start-only → `year` fallback (this year or later = current).
 */
export function isCurrentFair(fair) {
  return isCurrentEntry(fair);
}

/**
 * Check if a fair is past.
 */
export function isPastFair(fair) {
  return !isCurrentFair(fair);
}

/**
 * Classify an array of fairs into { current, past }.
 * Each group is sorted by order field ascending.
 */
export function classifyFairs(fairs) {
  const current = [];
  const past = [];

  for (const f of fairs || []) {
    if (isCurrentFair(f)) {
      current.push(f);
    } else {
      past.push(f);
    }
  }

  const sortByOrder = (a, b) => (Number(a?.order) || 0) - (Number(b?.order) || 0);

  return {
    current: current.sort(sortByOrder),
    past: past.sort(sortByOrder),
  };
}

/**
 * Format a date string for display.
 * @param {string} dateStr - date string
 * @param {boolean} isCn - Chinese format
 * @returns {string} formatted date
 */
export function formatFairDate(dateStr, isCn = false) {
  const d = parseFairDate(dateStr);
  if (!d) return dateStr || "";

  const months = isCn
    ? ["1月", "2月", "3月", "4月", "5月", "6月", "7月", "8月", "9月", "10月", "11月", "12月"]
    : ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  const day = d.getDate();
  const month = months[d.getMonth()];
  const year = d.getFullYear();

  return isCn ? `${year}年${month}${day}日` : `${day} ${month} ${year}`;
}

/**
 * Get a sortable timestamp for a fair.
 * Prefers date_start, falls back to date_end, then 0 (unknown dates sink to the bottom).
 */
function getFairTime(fair) {
  const start = parseFairDate(fair?.date_start);
  if (start) return start.getTime();

  const end = parseFairDate(fair?.date_end);
  if (end) return end.getTime();

  return 0;
}

/**
 * Sort an array of fairs by year/date.
 * @param {Array} fairs
 * @param {"desc"|"asc"} direction - "desc" (default) = newest first, "asc" = oldest first
 * @returns {Array} a new sorted array (does not mutate the input)
 */
export function sortFairsByDate(fairs, direction = "desc") {
  const sorted = [...(fairs || [])].sort(
    (a, b) => getFairTime(b) - getFairTime(a)
  );
  return direction === "asc" ? sorted.reverse() : sorted;
}

/**
 * Build a date range string from start/end dates.
 */
export function formatDateRange(fair, isCn = false) {
  const start = formatFairDate(fair?.date_start, isCn);
  const end = formatFairDate(fair?.date_end, isCn);

  if (start && end) return isCn ? `${start} – ${end}` : `${start} – ${end}`;
  if (start) return start;
  if (end) return isCn ? `至 ${end}` : `Until ${end}`;
  return "";
}