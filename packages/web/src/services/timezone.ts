import { fromZonedTime } from 'date-fns-tz';
import { DateTime } from 'luxon';

/**
 * Timezone utilities for converting birth times to UTC
 */

/**
 * Validate a Date is reasonable for astrological calculations (1900-2100)
 */
function validateDate(date: Date): boolean {
  if (!date || isNaN(date.getTime())) {
    return false;
  }
  const year = date.getUTCFullYear();
  return year >= 1900 && year <= 2100;
}

/**
 * Convert a local date/time string in a specific timezone to UTC Date object
 * @param dateString Date in YYYY-MM-DD format
 * @param timeString Time in HH:MM format (24-hour)
 * @param timeZone IANA timezone name (e.g., 'America/New_York')
 * @returns Date object in UTC
 */
/**
 * Manual timezone conversion using Intl API for offset calculation
 * This is a fallback when date-fns-tz fails
 */
function convertToUTCManual(
  dateString: string,
  timeString: string,
  timeZone: string
): Date {
  console.log('Using manual timezone conversion for:', { dateString, timeString, timeZone });
  
  try {
    // Parse date components
    const dateParts = dateString.split('-');
    const timeParts = timeString.split(':');
    
    if (dateParts.length < 3 || timeParts.length < 2) {
      throw new Error('Invalid date or time format');
    }
    
    const yearStr = dateParts[0] || '1970';
    const monthStr = dateParts[1] || '1';
    const dayStr = dateParts[2] || '1';
    const hourStr = timeParts[0] || '0';
    const minuteStr = timeParts[1] || '0';
    const secondStr = timeParts[2] || '0';
    
    const year = parseInt(yearStr, 10);
    const month = parseInt(monthStr, 10) - 1; // 0-11
    const day = parseInt(dayStr, 10);
    const hour = parseInt(hourStr, 10);
    const minute = parseInt(minuteStr, 10);
    const second = parseInt(secondStr, 10);
    
    if (isNaN(year) || isNaN(month) || isNaN(day) || isNaN(hour) || isNaN(minute) || isNaN(second)) {
      throw new Error('Failed to parse date/time components');
    }
    
    // Initial guess: treat input as UTC
    const guess = new Date(Date.UTC(year, month, day, hour, minute, second));
    
    // Get offset at this UTC time (offset = UTC - local, so local = UTC - offset)
    let offset = getTimezoneOffset(timeZone, guess);
    
    // Apply offset: local = UTC + offset => UTC = local - offset
    let utc = new Date(guess.getTime() - offset * 60000);
    
    // Refine: get offset at the new UTC time (should be more accurate for DST boundaries)
    offset = getTimezoneOffset(timeZone, utc);
    utc = new Date(guess.getTime() - offset * 60000);
    
    console.log('Manual conversion result:', utc.toISOString(), 'offset:', offset, 'minutes');
    
    if (!validateDate(utc)) {
      throw new Error('Manual conversion produced invalid year');
    }
    
    return utc;
  } catch (error) {
    console.error('Manual conversion failed:', error);
    throw error;
  }
}

export function convertToUTC(
  dateString: string,
  timeString: string,
  timeZone: string
): Date {
  console.log('convertToUTC called with:', { dateString, timeString, timeZone });
  
  // Basic validation of inputs
  if (!dateString || !timeString || !timeZone) {
    console.error('Missing required parameters:', { dateString, timeString, timeZone });
    // Try fallback anyway
    const fallback = new Date(`${dateString || '1970-01-01'}T${timeString || '00:00'}:00Z`);
    
    if (!validateDate(fallback)) {
      // Last resort
      console.error('Fallback date invalid, returning current date');
      return new Date();
    }
    
    return fallback;
  }
  
  // Normalize time string to include seconds if missing
  let normalizedTime = timeString;
  const timeParts = timeString.split(':');
  if (timeParts.length === 2) {
    normalizedTime = `${timeString}:00`;
  }
  
  // Combine date and time
  const localDateTime = `${dateString}T${normalizedTime}`;
  console.log('localDateTime:', localDateTime);
  
  // Special handling for UTC
  if (timeZone === 'UTC') {
    const result = new Date(localDateTime + 'Z');
    console.log('UTC special handling, result:', result, 'isValid:', !isNaN(result.getTime()));
    
    if (!validateDate(result)) {
      // Fallback to simple parsing without Z
      const fallback = new Date(localDateTime);
      console.warn('UTC special handling invalid, trying fallback:', fallback);
      if (validateDate(fallback)) {
        return fallback;
      }
      // Last resort
      return new Date();
    }
    
    return result;
  }
  
  // Validate timezone
  if (!isValidTimezone(timeZone)) {
    console.warn(`Invalid timezone: "${timeZone}", falling back to UTC`);
    const fallback = new Date(localDateTime + 'Z');
    console.log('Fallback due to invalid timezone, result:', fallback, 'isValid:', !isNaN(fallback.getTime()));
    
    if (!validateDate(fallback)) {
      // Try without Z
      const fallback2 = new Date(localDateTime);
      console.warn('First fallback invalid, trying without Z:', fallback2);
      if (validateDate(fallback2)) {
        return fallback2;
      }
      return new Date();
    }
    
    return fallback;
  }
  
  // Try Luxon first (best for historical timezone data)
  try {
    console.log('Attempt 1: Using Luxon for timezone conversion');
    const local = DateTime.fromISO(localDateTime, { zone: timeZone });
    
    if (!local.isValid) {
      throw new Error(`Invalid date/time: ${local.invalidExplanation}`);
    }
    
    const utc = local.toUTC();
    
    if (!utc.isValid) {
      throw new Error('Failed to convert to UTC');
    }
    
    const jsDate = utc.toJSDate();
    
    if (!validateDate(jsDate)) {
      throw new Error('Luxon conversion produced invalid year');
    }
    
    console.log('Luxon conversion successful:', jsDate.toISOString());
    return jsDate;
  } catch (luxonError) {
    console.warn('Luxon conversion failed, trying date-fns-tz:', (luxonError as Error).message);
    
    // Fallback to date-fns-tz (also uses IANA timezone database)
    try {
      console.log('Attempt 2: Using date-fns-tz fromZonedTime');
      // Parse local date/time string to Date (interpreted as local time in browser's timezone)
      const localDate = new Date(localDateTime);
      if (isNaN(localDate.getTime())) {
        throw new Error(`Invalid date string: ${localDateTime}`);
      }
      console.log('Parsed localDate:', localDate.toISOString(), 'local timestamp:', localDate.getTime());
      
      const utcDate = fromZonedTime(localDate, timeZone);
      
      if (!utcDate || isNaN(utcDate.getTime())) {
        throw new Error('fromZonedTime returned invalid Date');
      }
      
      if (!validateDate(utcDate)) {
        throw new Error('date-fns-tz conversion produced invalid year');
      }
      
      console.log('date-fns-tz conversion successful:', utcDate.toISOString());
      return utcDate;
    } catch (tzError) {
      console.error('date-fns-tz also failed:', (tzError as Error).message);
      // Fallback to manual conversion (Intl API)
      try {
        console.log('Attempt 3: Using manual conversion (Intl API)');
        const manualResult = convertToUTCManual(dateString, timeString, timeZone);
        if (validateDate(manualResult)) {
          console.log('Manual conversion successful:', manualResult.toISOString());
          return manualResult;
        }
        throw new Error('Manual conversion produced invalid date');
      } catch (manualError) {
        console.error('Manual conversion failed, falling back to UTC:', (manualError as Error).message);
        // Ultimate fallback: assume UTC
        const fallback = new Date(localDateTime + 'Z');
        console.log('Fallback to UTC, result:', fallback, 'isValid:', !isNaN(fallback.getTime()));
        
        if (!validateDate(fallback)) {
          // If even this fails, return current date as last resort (should never happen)
          console.error('Even fallback UTC date invalid, returning current date');
          return new Date();
        }
        
        return fallback;
      }
    }
  }
}

/**
 * Convert a UTC Date object back to local date/time strings in a specific timezone
 * @param utcDate Date object in UTC
 * @param timeZone IANA timezone name (e.g., 'America/New_York')
 * @returns Object with dateString (YYYY-MM-DD) and timeString (HH:MM:SS)
 */
export function convertFromUTC(utcDate: Date, timeZone: string): { dateString: string; timeString: string } {
  console.log('convertFromUTC called with:', { utcDate: utcDate.toISOString(), timeZone });
  
  // Validate inputs
  if (!utcDate || isNaN(utcDate.getTime()) || !timeZone) {
    console.warn('Invalid inputs to convertFromUTC, returning UTC');
    const year = utcDate.getUTCFullYear();
    const month = String(utcDate.getUTCMonth() + 1).padStart(2, '0');
    const day = String(utcDate.getUTCDate()).padStart(2, '0');
    const hours = String(utcDate.getUTCHours()).padStart(2, '0');
    const minutes = String(utcDate.getUTCMinutes()).padStart(2, '0');
    const seconds = String(utcDate.getUTCSeconds()).padStart(2, '0');
    return {
      dateString: `${year}-${month}-${day}`,
      timeString: `${hours}:${minutes}:${seconds}`,
    };
  }
  
  // Try Luxon first
  try {
    const local = DateTime.fromJSDate(utcDate).setZone('UTC').setZone(timeZone);
    
    if (!local.isValid) {
      throw new Error(`Invalid conversion: ${local.invalidExplanation}`);
    }
    
    const dateString = local.toFormat('yyyy-MM-dd');
    const timeString = local.toFormat('HH:mm:ss');
    
    console.log('convertFromUTC Luxon successful:', { dateString, timeString });
    return { dateString, timeString };
  } catch (luxonError) {
    console.warn('Luxon conversion failed in convertFromUTC:', (luxonError as Error).message);
    
    // Fallback: use Intl API to compute offset
    try {
      // Get offset at this UTC time
      const offset = getTimezoneOffset(timeZone, utcDate);
      const localMillis = utcDate.getTime() + offset * 60000;
      const localDate = new Date(localMillis);
      
      const year = localDate.getUTCFullYear();
      const month = String(localDate.getUTCMonth() + 1).padStart(2, '0');
      const day = String(localDate.getUTCDate()).padStart(2, '0');
      const hours = String(localDate.getUTCHours()).padStart(2, '0');
      const minutes = String(localDate.getUTCMinutes()).padStart(2, '0');
      const seconds = String(localDate.getUTCSeconds()).padStart(2, '0');
      
      const dateString = `${year}-${month}-${day}`;
      const timeString = `${hours}:${minutes}:${seconds}`;
      
      console.log('convertFromUTC manual fallback:', { dateString, timeString });
      return { dateString, timeString };
    } catch (manualError) {
      console.error('Manual fallback also failed, returning UTC:', (manualError as Error).message);
      // Ultimate fallback: return UTC
      const year = utcDate.getUTCFullYear();
      const month = String(utcDate.getUTCMonth() + 1).padStart(2, '0');
      const day = String(utcDate.getUTCDate()).padStart(2, '0');
      const hours = String(utcDate.getUTCHours()).padStart(2, '0');
      const minutes = String(utcDate.getUTCMinutes()).padStart(2, '0');
      const seconds = String(utcDate.getUTCSeconds()).padStart(2, '0');
      return {
        dateString: `${year}-${month}-${day}`,
        timeString: `${hours}:${minutes}:${seconds}`,
      };
    }
  }
}


/**
 * Parse offset string like "-5", "+05:30", "-05:30" into minutes
 */
function parseOffsetString(offsetStr: string): number {
  const sign = offsetStr.startsWith('-') ? -1 : 1;
  const cleanStr = offsetStr.replace(/^[+-]/, '');
  
  const [hours = '0', minutes = '0'] = cleanStr.split(':');
  const totalMinutes = parseInt(hours, 10) * 60 + parseInt(minutes, 10);
  return sign * totalMinutes;
}

/**
 * Get current offset in minutes for a given timezone
 */
export function getTimezoneOffset(timeZone: string, date: Date = new Date()): number {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone,
    timeZoneName: 'longOffset',
  });
  
  const parts = formatter.formatToParts(date);
  const offsetPart = parts.find(p => p.type === 'timeZoneName')?.value;
  
  if (offsetPart && offsetPart.startsWith('GMT')) {
    const offsetStr = offsetPart.substring(3);
    return parseOffsetString(offsetStr);
  }
  
  return 0;
}

/**
 * Common timezones for dropdown
 */
export const COMMON_TIMEZONES = [
  { value: 'UTC', label: 'UTC (Coordinated Universal Time)' },
  { value: 'Europe/London', label: 'Europe/London (GMT/BST)' },
  { value: 'Europe/Paris', label: 'Europe/Paris (CET/CEST)' },
  { value: 'Europe/Berlin', label: 'Europe/Berlin (CET/CEST)' },
  { value: 'Europe/Moscow', label: 'Europe/Moscow (MSK)' },
  { value: 'America/New_York', label: 'America/New_York (EST/EDT)' },
  { value: 'America/Chicago', label: 'America/Chicago (CST/CDT)' },
  { value: 'America/Denver', label: 'America/Denver (MST/MDT)' },
  { value: 'America/Los_Angeles', label: 'America/Los_Angeles (PST/PDT)' },
  { value: 'America/Toronto', label: 'America/Toronto (EST/EDT)' },
  { value: 'America/Sao_Paulo', label: 'America/Sao_Paulo (BRT/BRST)' },
  { value: 'Africa/Johannesburg', label: 'Africa/Johannesburg (SAST)' },
  { value: 'Asia/Kolkata', label: 'Asia/Kolkata (IST)' },
  { value: 'Asia/Shanghai', label: 'Asia/Shanghai (CST)' },
  { value: 'Asia/Tokyo', label: 'Asia/Tokyo (JST)' },
  { value: 'Australia/Sydney', label: 'Australia/Sydney (AEST/AEDT)' },
  { value: 'Pacific/Auckland', label: 'Pacific/Auckland (NZST/NZDT)' },
];

/**
 * Validate if a timezone string is a valid IANA timezone
 */
export function isValidTimezone(timeZone: string): boolean {
  try {
    Intl.DateTimeFormat('en-US', { timeZone });
    return true;
  } catch {
    return false;
  }
}