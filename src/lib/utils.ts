/**
 * Utility functions for the story map application
 */

import { Story } from '@/types';

/**
 * Convert Instagram CDN URLs to use proxy to avoid CORS issues
 * @param url - The Instagram CDN URL 
 * @returns Proxied URL that bypasses CORS restrictions
 */
export function getProxiedImageUrl(url: string): string {
  if (!url) return url;
  
  // Check if it's an Instagram CDN URL that needs proxying
  if (url.includes('cdninstagram.com') || url.includes('scontent')) {
    // ALWAYS route through proxy due to CORS restrictions
    // Both images and videos fail with ERR_BLOCKED_BY_RESPONSE.NotSameOrigin
    return `/api/proxy-image?url=${encodeURIComponent(url)}`;
  }
  
  // For non-Instagram URLs, return as-is
  return url;
}

/**
 * Get direct CDN URL (for fallback when proxy is slow)
 */
export function getDirectImageUrl(url: string): string {
  return url;
}

/**
 * Format a date string for display
 * @param dateString - ISO date string
 * @returns Formatted date string
 */
export function formatDate(dateString: string): string {
  try {
    return new Date(dateString).toLocaleDateString();
  } catch {
    return 'Invalid date';
  }
}

/**
 * Truncate text to a specified length
 * @param text - Text to truncate
 * @param maxLength - Maximum length
 * @returns Truncated text
 */
export function truncateText(text: string, maxLength: number): string {
  if (!text || text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
}

// =============================================================================
// DATE UTILITIES
// =============================================================================

/**
 * Get the best available date for a story with simplified 3-tier precedence
 * 
 * **Priority Order:**
 * 1. user_assigned_date (manual input) - HIGHEST CONFIDENCE
 * 2. gps_estimated_date (GPS correlation) - MEDIUM CONFIDENCE (future)
 * 3. collection.collection_start_date (collection fallback) - LOWEST CONFIDENCE
 * 
 * @param story - The story object with optional collection data
 * @returns Date object or null if no date available
 */
export function getBestAvailableDate(story: Story & { collection?: { collection_start_date?: string } }): Date | null {
  // Priority 1: User-assigned date (manual input, highest confidence)
  if (story.user_assigned_date) {
    return new Date(story.user_assigned_date);
  }
  
  // Priority 2: GPS-estimated date (future implementation)
  if (story.gps_estimated_date) {
    return new Date(story.gps_estimated_date);
  }
  
  // Priority 3: Collection start date (fallback from collection table)
  if (story.collection?.collection_start_date) {
    return new Date(story.collection.collection_start_date);
  }
  
  return null;
}

/**
 * Get the best available date as ISO string for sorting
 * @param story - The story object
 * @returns ISO date string or fallback for sorting
 */
export function getBestAvailableDateString(story: Story): string {
  const date = getBestAvailableDate(story);
  return date ? date.toISOString() : '1970-01-01T00:00:00.000Z';
}

/**
 * Get date confidence level for a story
 * @param story - The story object
 * @returns Confidence level and description based on data source
 */
export function getDateConfidenceLevel(story: Story & { collection?: { collection_start_date?: string } }): {
  level: 'high' | 'medium' | 'low';
  description: string;
} {
  // Manual user input = highest confidence
  if (story.user_assigned_date) {
    return { level: 'high', description: 'Manually Set' };
  }
  
  // GPS estimated date = medium confidence (future)
  if (story.gps_estimated_date) {
    return { level: 'medium', description: 'GPS Estimated' };
  }
  
  // Collection fallback = lowest confidence
  if (story.collection?.collection_start_date) {
    return { level: 'low', description: 'Collection Estimated' };
  }
  
  return { level: 'low', description: 'No Date Available' };
}

/**
 * Check if story uses manual date (user-assigned)
 * @param story - The story object
 * @returns True if story has manual date
 */
export function hasManualDate(story: Story): boolean {
  return !!(story.user_assigned_date);
}

// =============================================================================
// EXPEDITION PHASE UTILITIES
// =============================================================================

// Hardcoded expedition phases from collections-manifest.json to avoid import issues
const expeditionPhasesData: Record<string, {
  name: string;
  date_range: string;
  description: string;
  collections: number[];
  story_count: number;
}> = {
  "pre_expedition": {
    "name": "Pre-Expedition Adventures",
    "date_range": "2022-01-01_2023-12-31",
    "description": "Adventures before the main expedition: India/Ladakh, Indonesia, Japan cycling",
    "collections": [1, 2, 3, 4, 5, 6, 7, 8, 9],
    "story_count": 453
  },
  "north_china": {
    "name": "North China & Mongolia - Expedition Start",
    "date_range": "2024-06-29_2024-07-18",
    "description": "Mongolia Winter, Mongolia, and expedition Q&A preparation",
    "collections": [10, 11],
    "story_count": 274
  },
  "central_asia": {
    "name": "Central Asia",
    "date_range": "2024-07-18_2024-09-25",
    "description": "Kyrgyzstan → Kazakhstan → Uzbekistan → Russia → Tajikistan",
    "collections": [12, 13, 14, 15, 16, 17, 18, 19, 20, 21],
    "story_count": 707
  },
  "middle_east_caucasus": {
    "name": "Middle East & Caucasus",
    "date_range": "2024-10-06_2024-11-27",
    "description": "Georgia → Armenia → Turkey",
    "collections": [22, 23, 24, 25, 26, 27, 28, 29, 30],
    "story_count": 674
  },
  "europe_part1": {
    "name": "Europe Part 1",
    "date_range": "2024-12-06_2025-02-07",
    "description": "Bulgaria → Greece → Italy → MFW → France → Spain",
    "collections": [31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41],
    "story_count": 798
  },
  "africa": {
    "name": "Africa",
    "date_range": "2025-02-01_2025-04-24",
    "description": "Morocco expedition with Italy crossings",
    "collections": [42, 43, 44, 45, 46, 47, 48, 49, 50],
    "story_count": 262
  },
  "europe_uk_scotland": {
    "name": "Europe Part 2 & UK/Scotland - Expedition End",
    "date_range": "2025-04-24_2025-10-30",
    "description": "Germany → England → Wales → Scotland - Expedition finale",
    "collections": [51, 52, 53, 54, 55, 56, 57, 58, 59, 60, 61],
    "story_count": 120
  }
};

interface ParsedExpeditionPhase {
  key: string;
  name: string;
  startDate: Date;
  endDate: Date;
  description: string;
}

/**
 * Parse expedition phases from hardcoded data (derived from collections-manifest.json)
 * @returns Array of parsed expedition phases with date objects
 */
export function getExpeditionPhases(): ParsedExpeditionPhase[] {
  return Object.entries(expeditionPhasesData).map(([key, phase]) => {
    // Parse date range from "2024-06-29_2024-07-18" format
    const [startDateStr, endDateStr] = phase.date_range.split('_');
    
    return {
      key,
      name: phase.name,
      startDate: new Date(startDateStr),
      endDate: new Date(endDateStr),
      description: phase.description
    };
  });
}

/**
 * Determine expedition phase for a given date
 * @param date - Date object or date string to check
 * @returns Expedition phase key or 'unknown' if no match
 */
export function getExpeditionPhaseForDate(date: Date | string): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  const phases = getExpeditionPhases();
  
  for (const phase of phases) {
    if (dateObj >= phase.startDate && dateObj <= phase.endDate) {
      return phase.key;
    }
  }
  
  // Check if date is before earliest expedition
  const earliestPhase = phases.reduce((earliest, current) => 
    current.startDate < earliest.startDate ? current : earliest
  );
  
  if (dateObj < earliestPhase.startDate) {
    return 'pre_expedition';
  }
  
  // Check if date is after latest expedition
  const latestPhase = phases.reduce((latest, current) => 
    current.endDate > latest.endDate ? current : latest
  );
  
  if (dateObj > latestPhase.endDate) {
    return 'post_expedition';
  }
  
  return 'unknown';
}