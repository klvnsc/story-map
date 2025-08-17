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
 * @returns Confidence level based on data source
 */
export function getDateConfidenceLevel(story: Story): 'high' | 'medium' | 'low' {
  // Manual user input = highest confidence
  if (story.user_assigned_date && story.date_confidence === 'manual') {
    return 'high';
  }
  
  // Collection estimated date = medium confidence
  if (story.collection_default_date && story.date_confidence === 'collection_estimated') {
    return 'medium';
  }
  
  // Legacy support
  if (story.estimated_date_gps && story.date_confidence === 'manual') {
    return 'high';
  }
  
  if (story.estimated_date && story.date_confidence === 'collection_estimated') {
    return 'medium';
  }
  
  // Any other case = low confidence
  return 'low';
}

/**
 * Check if story uses manual date (user-assigned)
 * @param story - The story object
 * @returns True if story has manual date
 */
export function hasManualDate(story: Story): boolean {
  return !!(
    (story.user_assigned_date && story.tag_source === 'manual') ||
    // Legacy support
    (story.estimated_date_gps && story.tag_source === 'manual')
  );
}

// =============================================================================
// FIELD NAME ALIASES (for clarity)
// =============================================================================

/**
 * Get user-assigned date (manual input)
 * @param story - The story object
 * @returns User-assigned date or null
 */
export function getUserAssignedDate(story: Story): Date | null {
  // Use new field first, fallback to legacy
  return story.user_assigned_date ? new Date(story.user_assigned_date) : 
         story.estimated_date_gps ? new Date(story.estimated_date_gps) : null;
}

/**
 * Get collection default date (automatic estimate)
 * @param story - The story object  
 * @returns Collection default date or null
 */
export function getCollectionDefaultDate(story: Story): Date | null {
  // Use new field first, fallback to legacy
  return story.collection_default_date ? new Date(story.collection_default_date) : 
         story.estimated_date ? new Date(story.estimated_date) : null;
}