import * as fs from 'fs';
import * as path from 'path';
import { parseStorySaverHTML, storiesToCsv, validateStoryCount, validateCdnUrls, ParsedStory } from '../utils/html-parser';
import { getCollectionInfo } from '../utils/collection-mapping';

export interface ParseOptions {
  validateUrls?: boolean;
  urlValidationDelay?: number;
  skipUrlValidation?: boolean;
  timeAdded?: string;
}

const DEFAULT_OPTIONS: Required<ParseOptions> = {
  validateUrls: false, // Disabled by default for speed
  urlValidationDelay: 100,
  skipUrlValidation: true,
  timeAdded: new Date().toISOString().split('T')[0] // Today's date in YYYY-MM-DD format
};

/**
 * Parse HTML file and generate updated CSV for a collection
 */
export async function parseCollectionHtml(
  collectionNumber: number,
  options: ParseOptions = {}
): Promise<ParsedStory[]> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  
  // Get collection info
  const collectionInfo = getCollectionInfo(collectionNumber);
  
  console.log(`Parsing HTML for collection ${collectionNumber} (${collectionInfo.name})...`);
  console.log(`Expected story count: ${collectionInfo.storyCount}`);
  
  // Read HTML file
  const htmlPath = path.join(process.cwd(), 'data-story-collection', `${collectionNumber}.html`);
  
  if (!fs.existsSync(htmlPath)) {
    throw new Error(`HTML file not found: ${htmlPath}. Run step 1 first to fetch HTML.`);
  }
  
  const htmlContent = fs.readFileSync(htmlPath, 'utf8');
  console.log(`HTML file size: ${(htmlContent.length / 1024).toFixed(1)} KB`);
  
  // Parse HTML to extract stories
  const stories = parseStorySaverHTML(htmlContent, opts.timeAdded);
  console.log(`Parsed ${stories.length} stories from HTML`);
  
  // Validate story count
  try {
    validateStoryCount(stories, collectionInfo.storyCount);
    console.log(`✅ Story count validation passed`);
  } catch (error) {
    console.warn(`⚠️ Story count validation failed: ${error}`);
    console.warn(`   Expected: ${collectionInfo.storyCount}, Found: ${stories.length}`);
    console.warn(`   Continuing with found stories...`);
  }
  
  // Validate URLs if requested
  if (opts.validateUrls && !opts.skipUrlValidation) {
    console.log(`Validating ${stories.length} CDN URLs...`);
    const urlValidation = await validateCdnUrls(
      stories.map(s => s.cdn_url),
      opts.urlValidationDelay
    );
    
    const validUrls = Object.values(urlValidation).filter(isValid => isValid).length;
    const invalidUrls = stories.length - validUrls;
    
    console.log(`URL validation results:`);
    console.log(`   ✅ Valid: ${validUrls}`);
    console.log(`   ❌ Invalid: ${invalidUrls}`);
    
    if (invalidUrls > 0) {
      console.warn(`Warning: ${invalidUrls} URLs are not accessible`);
      
      // Log invalid URLs
      const invalid = Object.entries(urlValidation)
        .filter(([_, isValid]) => !isValid)
        .map(([url, _]) => url);
      
      console.warn(`Invalid URLs:`, invalid.slice(0, 5)); // Show first 5
      if (invalid.length > 5) {
        console.warn(`... and ${invalid.length - 5} more`);
      }
    }
  }
  
  // Generate CSV content
  const csvContent = storiesToCsv(stories);
  
  // Save updated CSV
  const csvPath = path.join(process.cwd(), 'data-story-collection', `${collectionNumber}.csv`);
  
  // Backup existing CSV if it exists
  if (fs.existsSync(csvPath)) {
    const backupPath = `${csvPath}.backup.${Date.now()}`;
    fs.copyFileSync(csvPath, backupPath);
    console.log(`📋 Backed up existing CSV to ${path.basename(backupPath)}`);
  }
  
  // Write new CSV
  fs.writeFileSync(csvPath, csvContent, 'utf8');
  console.log(`✅ Updated CSV saved to ${csvPath}`);
  console.log(`   Stories: ${stories.length}`);
  console.log(`   Videos: ${stories.filter(s => s.media_type === 'video').length}`);
  console.log(`   Images: ${stories.filter(s => s.media_type === 'image').length}`);
  
  return stories;
}

/**
 * Parse HTML for multiple collections
 */
export async function parseMultipleCollections(
  collectionNumbers: number[],
  options: ParseOptions = {}
): Promise<{ [collectionNumber: number]: ParsedStory[] }> {
  const results: { [collectionNumber: number]: ParsedStory[] } = {};
  
  console.log(`Parsing HTML for ${collectionNumbers.length} collections...`);
  if (options.validateUrls && !options.skipUrlValidation) {
    console.log(`URL validation enabled with ${options.urlValidationDelay || 100}ms delay`);
  }
  console.log('');
  
  for (const collectionNumber of collectionNumbers) {
    try {
      const stories = await parseCollectionHtml(collectionNumber, options);
      results[collectionNumber] = stories;
      console.log(''); // Add spacing between collections
      
    } catch (error) {
      console.error(`❌ Failed to parse collection ${collectionNumber}: ${error}`);
      console.log(''); // Add spacing between collections
    }
  }
  
  // Summary
  const successCount = Object.keys(results).length;
  const failedCount = collectionNumbers.length - successCount;
  const totalStories = Object.values(results).reduce((sum, stories) => sum + stories.length, 0);
  
  console.log(`📊 Parse Summary:`);
  console.log(`   ✅ Successful collections: ${successCount}`);
  console.log(`   ❌ Failed collections: ${failedCount}`);
  console.log(`   📝 Total stories parsed: ${totalStories}`);
  
  return results;
}

/**
 * Get media type breakdown for stories
 */
export function getMediaTypeBreakdown(stories: ParsedStory[]): { videos: number; images: number } {
  const videos = stories.filter(s => s.media_type === 'video').length;
  const images = stories.filter(s => s.media_type === 'image').length;
  return { videos, images };
}

/**
 * Check if parsed stories have valid CDN URLs format
 */
export function validateCdnUrlFormats(stories: ParsedStory[]): { valid: number; invalid: string[] } {
  const invalid: string[] = [];
  let valid = 0;
  
  for (const story of stories) {
    // Basic URL format validation
    try {
      new URL(story.cdn_url);
      
      // Check if it's an Instagram CDN URL
      if (story.cdn_url.includes('cdninstagram.com') || story.cdn_url.includes('scontent')) {
        valid++;
      } else {
        invalid.push(`Story ${story.id}: Not an Instagram CDN URL`);
      }
    } catch {
      invalid.push(`Story ${story.id}: Invalid URL format - ${story.cdn_url.substring(0, 50)}...`);
    }
  }
  
  return { valid, invalid };
}