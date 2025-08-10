/**
 * Utility functions for the story map application
 */

/**
 * Convert Instagram CDN URLs to use proxy to avoid CORS issues
 * @param url - The Instagram CDN URL 
 * @param preferDirect - Try direct URL first for better performance (ignored for images due to CORS)
 * @param isVideo - Whether this is a video (videos can work direct)
 * @returns Proxied URL that bypasses CORS restrictions
 */
export function getProxiedImageUrl(url: string, _preferDirect: boolean = false, _isVideo: boolean = false): string {
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