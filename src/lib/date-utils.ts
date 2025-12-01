/**
 * Timezone utilities for consistent UTC+7 (Jakarta/Bangkok/Hanoi) handling
 */

const JAKARTA_OFFSET = 7 * 60; // UTC+7 in minutes

/**
 * Convert a Date object to datetime-local format string in UTC+7 timezone
 * Used for populating datetime-local input fields
 * @param date - Date object from database or any Date
 * @returns String in format "YYYY-MM-DDTHH:mm" in UTC+7 timezone
 */
export function toDateTimeLocalString(date: Date | string): string {
    const d = typeof date === 'string' ? new Date(date) : date;

    // Get UTC time in milliseconds
    const utcTime = d.getTime();

    // Add Jakarta offset (UTC+7)
    const jakartaTime = new Date(utcTime + JAKARTA_OFFSET * 60 * 1000);

    // Format to datetime-local format
    return jakartaTime.toISOString().slice(0, 16);
}

/**
 * Convert datetime-local string to Date object
 * Treats the input as UTC+7 timezone
 * @param dateTimeLocal - String from datetime-local input
 * @returns Date object representing the same moment in time
 */
export function fromDateTimeLocalString(dateTimeLocal: string): Date {
    // datetime-local format: "2025-12-01T14:30"
    // We need to treat this as UTC+7, then convert to UTC for storage

    // Parse as if it's UTC first
    const naive = new Date(dateTimeLocal + ':00.000Z');

    // Subtract Jakarta offset to get the actual UTC time
    const utcTime = naive.getTime() - JAKARTA_OFFSET * 60 * 1000;

    return new Date(utcTime);
}

/**
 * Format a Date object for display in UTC+7 timezone
 * @param date - Date object
 * @param format - Optional format string (default: "YYYY-MM-DD HH:mm")
 * @returns Formatted string in UTC+7 timezone
 */
export function formatDateJakarta(date: Date | string): string {
    const d = typeof date === 'string' ? new Date(date) : date;

    // Get UTC time in milliseconds
    const utcTime = d.getTime();

    // Add Jakarta offset (UTC+7)
    const jakartaTime = new Date(utcTime + JAKARTA_OFFSET * 60 * 1000);

    return jakartaTime.toISOString().slice(0, 19).replace('T', ' ');
}
