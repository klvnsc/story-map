import * as fs from 'fs';
import * as path from 'path';
import { getHighlightId, getCollectionInfo } from '../utils/collection-mapping';

export interface FetchOptions {
  retries?: number;
  retryDelay?: number;
  timeout?: number;
}

const DEFAULT_OPTIONS: Required<FetchOptions> = {
  retries: 3,
  retryDelay: 2000, // 2 seconds
  timeout: 30000 // 30 seconds
};

/**
 * Fetch HTML from StorySaver API for a collection
 */
export async function fetchCollectionHtml(
  collectionNumber: number,
  options: FetchOptions = {}
): Promise<string> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  
  // Get highlight ID for the collection
  const collectionInfo = getCollectionInfo(collectionNumber);
  const highlightId = collectionInfo.highlightId;
  
  console.log(`Fetching HTML for collection ${collectionNumber} (${collectionInfo.name})...`);
  console.log(`Highlight ID: ${highlightId}`);
  
  let lastError: Error | null = null;
  
  // Retry logic
  for (let attempt = 1; attempt <= opts.retries; attempt++) {
    try {
      const html = await fetchWithRetry(highlightId, opts.timeout);
      
      // Save HTML to file
      const outputPath = path.join(process.cwd(), 'data-story-collection', `${collectionNumber}.html`);
      fs.writeFileSync(outputPath, html, 'utf8');
      
      console.log(`✅ HTML saved to ${outputPath}`);
      console.log(`   Size: ${(html.length / 1024).toFixed(1)} KB`);
      
      return html;
      
    } catch (error) {
      lastError = error as Error;
      console.warn(`❌ Attempt ${attempt}/${opts.retries} failed: ${lastError.message}`);
      
      if (attempt < opts.retries) {
        console.log(`   Retrying in ${opts.retryDelay / 1000} seconds...`);
        await new Promise(resolve => setTimeout(resolve, opts.retryDelay));
      }
    }
  }
  
  throw new Error(`Failed to fetch HTML after ${opts.retries} attempts: ${lastError?.message}`);
}

/**
 * Internal function to make the actual HTTP request
 */
async function fetchWithRetry(highlightId: string, timeout: number): Promise<string> {
  const url = 'https://www.storysaver.net/highlightProcess.php';
  const payload = `sid=${highlightId}`;
  
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      },
      body: payload,
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const html = await response.text();
    
    // Basic validation - check if response looks like valid HTML
    if (!html.includes('<li class="stylestory">')) {
      throw new Error('Invalid response: no story elements found');
    }
    
    return html;
    
  } catch (error) {
    clearTimeout(timeoutId);
    
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        throw new Error(`Request timeout after ${timeout / 1000} seconds`);
      }
      throw error;
    }
    
    throw new Error(`Unknown error: ${error}`);
  }
}

/**
 * Fetch HTML for multiple collections with rate limiting
 */
export async function fetchMultipleCollections(
  collectionNumbers: number[],
  rateLimitMs: number = 1000,
  options: FetchOptions = {}
): Promise<{ [collectionNumber: number]: string }> {
  const results: { [collectionNumber: number]: string } = {};
  
  console.log(`Fetching HTML for ${collectionNumbers.length} collections...`);
  console.log(`Rate limit: ${rateLimitMs / 1000} seconds between requests\n`);
  
  for (let i = 0; i < collectionNumbers.length; i++) {
    const collectionNumber = collectionNumbers[i];
    
    try {
      const html = await fetchCollectionHtml(collectionNumber, options);
      results[collectionNumber] = html;
      
      // Rate limiting (except for last request)
      if (i < collectionNumbers.length - 1) {
        console.log(`Waiting ${rateLimitMs / 1000} seconds before next request...\n`);
        await new Promise(resolve => setTimeout(resolve, rateLimitMs));
      }
      
    } catch (error) {
      console.error(`❌ Failed to fetch collection ${collectionNumber}: ${error}`);
      // Continue with other collections even if one fails
    }
  }
  
  const successCount = Object.keys(results).length;
  const failedCount = collectionNumbers.length - successCount;
  
  console.log(`\n📊 Fetch Summary:`);
  console.log(`   ✅ Successful: ${successCount}`);
  console.log(`   ❌ Failed: ${failedCount}`);
  
  return results;
}

/**
 * Check if HTML file already exists for a collection
 */
export function htmlFileExists(collectionNumber: number): boolean {
  const filePath = path.join(process.cwd(), 'data-story-collection', `${collectionNumber}.html`);
  return fs.existsSync(filePath);
}

/**
 * Get existing HTML content if file exists
 */
export function getExistingHtml(collectionNumber: number): string | null {
  if (!htmlFileExists(collectionNumber)) {
    return null;
  }
  
  const filePath = path.join(process.cwd(), 'data-story-collection', `${collectionNumber}.html`);
  return fs.readFileSync(filePath, 'utf8');
}