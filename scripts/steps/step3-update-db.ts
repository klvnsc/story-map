import * as fs from 'fs';
import * as path from 'path';
import { parse } from 'csv-parse/sync';
import {
  getCollectionId,
  updateStoryCdnUrls,
  backupCdnUrls,
  validateCollectionStories,
  getCollectionInfo as getDbCollectionInfo,
  StoryUpdate
} from '../utils/db-operations';
import { getCollectionInfo } from '../utils/collection-mapping';

export interface UpdateOptions {
  dryRun?: boolean;
  batchSize?: number;
  backupUrls?: boolean;
}

const DEFAULT_OPTIONS: Required<UpdateOptions> = {
  dryRun: false,
  batchSize: 100,
  backupUrls: true
};

interface CsvStory {
  id: string;
  media_type: string;
  cdn_url: string;
  duration: string;
  time_added: string;
}

/**
 * Update database with fresh CDN URLs from CSV for a collection
 */
export async function updateCollectionDatabase(
  collectionNumber: number,
  options: UpdateOptions = {}
): Promise<{ updated: number; failed: number; skipped: number }> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  
  // Get collection info
  const mappingInfo = getCollectionInfo(collectionNumber);
  
  console.log(`Updating database for collection ${collectionNumber} (${mappingInfo.name})...`);
  if (opts.dryRun) {
    console.log(`🔍 DRY RUN MODE - No database changes will be made`);
  }
  
  // Read updated CSV file
  const csvPath = path.join(process.cwd(), 'data-story-collection', `${collectionNumber}.csv`);
  
  if (!fs.existsSync(csvPath)) {
    throw new Error(`CSV file not found: ${csvPath}. Run steps 1-2 first to generate CSV.`);
  }
  
  const csvContent = fs.readFileSync(csvPath, 'utf8');
  const csvRecords = parse(csvContent, {
    columns: true,
    skip_empty_lines: true
  }) as CsvStory[];
  
  console.log(`Read ${csvRecords.length} stories from CSV`);
  
  // Get collection ID from database
  const collectionId = await getCollectionId(collectionNumber);
  const dbCollectionInfo = await getDbCollectionInfo(collectionNumber);
  
  console.log(`Database collection: ${dbCollectionInfo.name} (${collectionId.substring(0, 8)}...)`);
  console.log(`Expected story count: ${dbCollectionInfo.story_count}`);
  
  // Validate collection exists and check story counts (allow for mismatches)
  try {
    await validateCollectionStories(collectionId, dbCollectionInfo.story_count);
    console.log(`✅ Database validation passed`);
  } catch (error) {
    console.warn(`⚠️ Database validation warning: ${error}`);
    console.warn(`   This may be due to outdated collection metadata or Instagram changes`);
    console.warn(`   Continuing with available data...`);
  }
  
  // Check CSV vs database count
  if (csvRecords.length !== dbCollectionInfo.story_count) {
    console.warn(`⚠️ Story count mismatch:`);
    console.warn(`   CSV: ${csvRecords.length}`);
    console.warn(`   Database: ${dbCollectionInfo.story_count}`);
    console.warn(`   Continuing with CSV data...`);
  }
  
  // Backup existing URLs if requested and not dry run
  if (opts.backupUrls && !opts.dryRun) {
    console.log(`📋 Backing up existing CDN URLs...`);
    const backup = await backupCdnUrls(collectionId);
    
    const backupPath = path.join(process.cwd(), 'logs', `cdn-backup-${collectionNumber}-${Date.now()}.json`);
    
    // Ensure logs directory exists
    const logsDir = path.dirname(backupPath);
    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir, { recursive: true });
    }
    
    fs.writeFileSync(backupPath, JSON.stringify(backup, null, 2), 'utf8');
    console.log(`   Backup saved to ${backupPath}`);
  }
  
  // Prepare updates
  const updates: StoryUpdate[] = csvRecords.map(record => ({
    story_index: parseInt(record.id),
    cdn_url: record.cdn_url
  }));
  
  console.log(`Preparing to update ${updates.length} stories...`);
  
  if (opts.dryRun) {
    console.log(`🔍 DRY RUN - Would update the following:`);
    console.log(`   Collection: ${mappingInfo.name}`);
    console.log(`   Stories: ${updates.length}`);
    console.log(`   Batch size: ${opts.batchSize}`);
    console.log(`   Sample updates:`);
    
    updates.slice(0, 3).forEach(update => {
      console.log(`     Story ${update.story_index}: ${update.cdn_url.substring(0, 60)}...`);
    });
    
    return { updated: 0, failed: 0, skipped: updates.length };
  }
  
  // Perform updates
  console.log(`🔄 Updating CDN URLs in database...`);
  const result = await updateStoryCdnUrls(collectionId, updates);
  
  console.log(`✅ Database update completed:`);
  console.log(`   ✅ Updated: ${result.updated}`);
  console.log(`   ❌ Failed: ${result.failed}`);
  console.log(`   📊 Success rate: ${((result.updated / updates.length) * 100).toFixed(1)}%`);
  
  if (result.failed > 0) {
    console.warn(`⚠️ ${result.failed} updates failed. Check logs for details.`);
  }
  
  return { ...result, skipped: 0 };
}

/**
 * Update database for multiple collections
 */
export async function updateMultipleCollections(
  collectionNumbers: number[],
  options: UpdateOptions = {}
): Promise<{ [collectionNumber: number]: { updated: number; failed: number; skipped: number } }> {
  const results: { [collectionNumber: number]: { updated: number; failed: number; skipped: number } } = {};
  
  console.log(`Updating database for ${collectionNumbers.length} collections...`);
  if (options.dryRun) {
    console.log(`🔍 DRY RUN MODE - No database changes will be made`);
  }
  console.log('');
  
  for (const collectionNumber of collectionNumbers) {
    try {
      const result = await updateCollectionDatabase(collectionNumber, options);
      results[collectionNumber] = result;
      console.log(''); // Add spacing between collections
      
    } catch (error) {
      console.error(`❌ Failed to update collection ${collectionNumber}: ${error}`);
      results[collectionNumber] = { updated: 0, failed: 0, skipped: 0 };
      console.log(''); // Add spacing between collections
    }
  }
  
  // Summary
  const successCount = Object.keys(results).length;
  const totalUpdated = Object.values(results).reduce((sum, r) => sum + r.updated, 0);
  const totalFailed = Object.values(results).reduce((sum, r) => sum + r.failed, 0);
  const totalSkipped = Object.values(results).reduce((sum, r) => sum + r.skipped, 0);
  
  console.log(`📊 Database Update Summary:`);
  console.log(`   📁 Collections processed: ${successCount}`);
  console.log(`   ✅ Stories updated: ${totalUpdated}`);
  console.log(`   ❌ Stories failed: ${totalFailed}`);
  console.log(`   ⏭️ Stories skipped: ${totalSkipped}`);
  
  if (options.dryRun) {
    console.log(`   🔍 DRY RUN - No actual changes made`);
  }
  
  return results;
}

/**
 * Validate CSV data before database update
 */
export async function validateCsvForUpdate(collectionNumber: number): Promise<{
  valid: boolean;
  issues: string[];
  storyCount: number;
}> {
  const issues: string[] = [];
  
  // Check if CSV exists
  const csvPath = path.join(process.cwd(), 'data-story-collection', `${collectionNumber}.csv`);
  if (!fs.existsSync(csvPath)) {
    issues.push(`CSV file not found: ${csvPath}`);
    return { valid: false, issues, storyCount: 0 };
  }
  
  // Read and validate CSV
  try {
    const csvContent = fs.readFileSync(csvPath, 'utf8');
    const csvRecords = parse(csvContent, {
      columns: true,
      skip_empty_lines: true
    }) as CsvStory[];
    
    // Check for required columns
    if (csvRecords.length === 0) {
      issues.push('CSV file is empty');
      return { valid: false, issues, storyCount: 0 };
    }
    
    const firstRecord = csvRecords[0];
    const requiredColumns = ['id', 'media_type', 'cdn_url', 'duration', 'time_added'];
    
    for (const column of requiredColumns) {
      if (!(column in firstRecord)) {
        issues.push(`Missing required column: ${column}`);
      }
    }
    
    // Validate story indexes are sequential
    const storyIndexes = csvRecords.map(r => parseInt(r.id)).sort((a, b) => a - b);
    const expectedIndexes = Array.from({ length: csvRecords.length }, (_, i) => i + 1);
    
    const missingIndexes = expectedIndexes.filter(index => !storyIndexes.includes(index));
    if (missingIndexes.length > 0) {
      issues.push(`Missing story indexes: ${missingIndexes.slice(0, 5).join(', ')}`);
    }
    
    // Validate CDN URLs
    let invalidUrls = 0;
    for (const record of csvRecords) {
      try {
        new URL(record.cdn_url);
      } catch {
        invalidUrls++;
      }
    }
    
    if (invalidUrls > 0) {
      issues.push(`${invalidUrls} invalid CDN URLs found`);
    }
    
    return {
      valid: issues.length === 0,
      issues,
      storyCount: csvRecords.length
    };
    
  } catch (error) {
    issues.push(`Failed to parse CSV: ${error}`);
    return { valid: false, issues, storyCount: 0 };
  }
}