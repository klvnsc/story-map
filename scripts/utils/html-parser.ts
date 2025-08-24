import * as cheerio from 'cheerio';

export interface ParsedStory {
  id: number;
  media_type: 'video' | 'image';
  cdn_url: string;
  duration: number | null;
  time_added: string;
}

/**
 * Parse StorySaver HTML response to extract story data
 */
export function parseStorySaverHTML(htmlContent: string, timeAdded: string = new Date().toISOString().split('T')[0]): ParsedStory[] {
  const $ = cheerio.load(htmlContent);
  const stories: ParsedStory[] = [];
  
  // Find all story elements
  $('li.stylestory').each((index, element) => {
    const $story = $(element);
    
    // Extract CDN URL from video or image source
    let cdnUrl = '';
    let mediaType: 'video' | 'image' = 'video';
    
    // Check for video first
    const videoSource = $story.find('video source').attr('src');
    if (videoSource) {
      cdnUrl = videoSource;
      mediaType = 'video';
    } else {
      // Check for image - extract from href attribute, not img src
      const imageHref = $story.find('a').attr('href');
      if (imageHref) {
        cdnUrl = imageHref;
        mediaType = 'image';
      }
    }
    
    // Skip if no media found
    if (!cdnUrl) {
      console.warn(`No media URL found for story ${index + 1}`);
      return;
    }
    
    // Extract duration for videos
    let duration: number | null = null;
    const durationText = $story.find('.storytime').first().text();
    const durationMatch = durationText.match(/duration:\s*(\d+)\s*second/);
    if (durationMatch && mediaType === 'video') {
      duration = parseInt(durationMatch[1]);
    }
    
    stories.push({
      id: index + 1,
      media_type: mediaType,
      cdn_url: cdnUrl,
      duration,
      time_added: timeAdded
    });
  });
  
  return stories;
}

/**
 * Validate that a CDN URL is accessible
 */
export async function validateCdnUrl(url: string): Promise<boolean> {
  try {
    const response = await fetch(url, { method: 'HEAD' });
    return response.ok;
  } catch (error) {
    console.warn(`URL validation failed for ${url}:`, error);
    return false;
  }
}

/**
 * Batch validate multiple CDN URLs with rate limiting
 */
export async function validateCdnUrls(urls: string[], delayMs: number = 100): Promise<{ [url: string]: boolean }> {
  const results: { [url: string]: boolean } = {};
  
  for (const url of urls) {
    results[url] = await validateCdnUrl(url);
    
    // Add delay to avoid overwhelming the server
    if (delayMs > 0) {
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }
  
  return results;
}

/**
 * Convert parsed stories to CSV format string
 */
export function storiesToCsv(stories: ParsedStory[]): string {
  const headers = 'id,media_type,cdn_url,duration,time_added';
  const rows = stories.map(story => {
    const duration = story.duration ? story.duration.toString() : '';
    return `${story.id},${story.media_type},${story.cdn_url},${duration},${story.time_added}`;
  });
  
  return [headers, ...rows].join('\n');
}

/**
 * Validate parsed stories against expected count
 */
export function validateStoryCount(stories: ParsedStory[], expectedCount: number): void {
  if (stories.length !== expectedCount) {
    throw new Error(`Story count mismatch: expected ${expectedCount}, got ${stories.length}`);
  }
}

/**
 * Clean and normalize CDN URLs
 */
export function cleanCdnUrl(url: string): string {
  // Remove any extra whitespace or artifacts
  return url.trim();
}