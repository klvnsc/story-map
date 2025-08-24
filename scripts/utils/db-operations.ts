import { createClient } from '@supabase/supabase-js';
import { Database } from '../../src/lib/supabase';

// Load environment variables
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase environment variables. Check .env.local file.');
}

export const supabase = createClient<Database>(supabaseUrl, supabaseKey);

export interface StoryUpdate {
  story_index: number;
  cdn_url: string;
}

/**
 * Get collection UUID from collection number
 */
export async function getCollectionId(collectionNumber: number): Promise<string> {
  // Get highlight ID from collection mapping, then find in database by highlight_id
  const { getHighlightId } = await import('./collection-mapping');
  const highlightId = getHighlightId(collectionNumber);
  
  const { data, error } = await supabase
    .from('story_collections')
    .select('id')
    .eq('highlight_id', highlightId)
    .single();
  
  if (error) {
    throw new Error(`Failed to find collection ${collectionNumber} (${highlightId}): ${error.message}`);
  }
  
  if (!data) {
    throw new Error(`Collection ${collectionNumber} not found in database`);
  }
  
  return data.id;
}

/**
 * Get current stories for a collection
 */
export async function getStoriesForCollection(collectionId: string): Promise<{ id: string; story_index: number; cdn_url: string }[]> {
  const { data, error } = await supabase
    .from('stories')
    .select('id, story_index, cdn_url')
    .eq('collection_id', collectionId)
    .order('story_index');
  
  if (error) {
    throw new Error(`Failed to fetch stories for collection: ${error.message}`);
  }
  
  return data || [];
}

/**
 * Update CDN URLs for stories in a collection
 */
export async function updateStoryCdnUrls(collectionId: string, updates: StoryUpdate[]): Promise<{ updated: number; failed: number }> {
  let updated = 0;
  let failed = 0;
  
  // Process updates in batches of 100
  const batchSize = 100;
  for (let i = 0; i < updates.length; i += batchSize) {
    const batch = updates.slice(i, i + batchSize);
    
    // Create individual updates for each story
    const updatePromises = batch.map(async (update) => {
      try {
        const { error } = await supabase
          .from('stories')
          .update({ 
            cdn_url: update.cdn_url,
            updated_at: new Date().toISOString()
          })
          .eq('collection_id', collectionId)
          .eq('story_index', update.story_index);
        
        if (error) {
          console.error(`Failed to update story ${update.story_index}:`, error.message);
          failed++;
        } else {
          updated++;
        }
      } catch (err) {
        console.error(`Error updating story ${update.story_index}:`, err);
        failed++;
      }
    });
    
    await Promise.all(updatePromises);
    
    // Small delay between batches
    if (i + batchSize < updates.length) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }
  
  return { updated, failed };
}

/**
 * Backup current CDN URLs before updating
 */
export async function backupCdnUrls(collectionId: string): Promise<{ story_index: number; old_cdn_url: string }[]> {
  const stories = await getStoriesForCollection(collectionId);
  return stories.map(story => ({
    story_index: story.story_index,
    old_cdn_url: story.cdn_url
  }));
}

/**
 * Validate that all expected stories exist in database
 */
export async function validateCollectionStories(collectionId: string, expectedCount: number): Promise<void> {
  const stories = await getStoriesForCollection(collectionId);
  
  if (stories.length !== expectedCount) {
    throw new Error(`Story count mismatch in database: expected ${expectedCount}, found ${stories.length}`);
  }
  
  // Check for missing story indexes
  const storyIndexes = stories.map(s => s.story_index).sort((a, b) => a - b);
  const expectedIndexes = Array.from({ length: expectedCount }, (_, i) => i + 1);
  
  const missing = expectedIndexes.filter(index => !storyIndexes.includes(index));
  if (missing.length > 0) {
    throw new Error(`Missing story indexes in database: ${missing.join(', ')}`);
  }
}

/**
 * Get collection info by collection number
 */
export async function getCollectionInfo(collectionNumber: number): Promise<{ id: string; name: string; story_count: number }> {
  // Get highlight ID from collection mapping, then find in database by highlight_id
  const { getHighlightId } = await import('./collection-mapping');
  const highlightId = getHighlightId(collectionNumber);
  
  const { data, error } = await supabase
    .from('story_collections')
    .select('id, name, story_count')
    .eq('highlight_id', highlightId)
    .single();
  
  if (error) {
    throw new Error(`Failed to find collection ${collectionNumber} (${highlightId}): ${error.message}`);
  }
  
  if (!data) {
    throw new Error(`Collection ${collectionNumber} not found in database`);
  }
  
  return data;
}