import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import { parse } from 'csv-parse/sync';

// Load environment variables
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

interface CSVCollection {
  'Collection Name': string;
  'Highlight ID': string;
  'Story Count': string;
  'Status': string;
}

interface CSVStory {
  id: string;
  media_type: string;
  cdn_url: string;
  duration: string;
  time_added: string;
}

// Load collections manifest as source of truth
const manifestPath = path.join(__dirname, '../data/collections-manifest.json');
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

// Extract phase definitions from manifest
const EXPEDITION_PHASES = manifest.expedition_phases;

// Removed old functions - now using manifest directly

async function importCollections() {
  console.log('Importing collections from collections-manifest.json...');
  
  // Use manifest data instead of CSV for accurate collection metadata
  const collections = manifest.collections;

  for (const [collectionIndex, collectionData] of Object.entries(collections)) {
    const index = parseInt(collectionIndex);
    const data = collectionData as any;
    
    // Determine expedition scope
    const isExpeditionScope = index >= 9; // Collections 1-8 are pre-expedition
    const expeditionExcludeReason = index <= 8 ? 'pre_expedition_content' : null;
    
    const { error } = await supabase
      .from('story_collections')
      .insert({
        highlight_id: data.instagram_id,
        name: data.name,
        story_count: data.story_count,
        collection_index: index,
        expedition_phase: data.expedition_phase,
        estimated_date: data.estimated_date,
        is_expedition_scope: isExpeditionScope,
        expedition_exclude_reason: expeditionExcludeReason,
        region: data.region
      });

    if (error) {
      console.error(`Error inserting collection ${data.name}:`, error);
    } else {
      console.log(`✅ Imported collection ${index}: ${data.name} (${data.expedition_phase})`);
    }
  }
}

async function importStories() {
  console.log('Importing individual stories...');
  
  // Get all collections from database ordered by collection_index
  const { data: collections, error: collectionsError } = await supabase
    .from('story_collections')
    .select('*')
    .order('collection_index');

  if (collectionsError) {
    console.error('Error fetching collections:', collectionsError);
    return;
  }

  for (const collection of collections) {
    if (!collection.collection_index) {
      console.log(`⚠️ Collection ${collection.name} missing collection_index, skipping`);
      continue;
    }

    // Map collection_index to old CSV file naming (using original_index from manifest)
    const manifestData = manifest.collections[collection.collection_index.toString()];
    const originalIndex = manifestData?.original_index || collection.collection_index;
    const csvFileName = `${originalIndex}.csv`;
    const csvPath = path.join(process.cwd(), `./data-story-collection/${csvFileName}`);
    
    if (!fs.existsSync(csvPath)) {
      console.log(`⚠️ CSV file not found: ${csvFileName} for collection ${collection.collection_index}`);
      continue;
    }

    console.log(`Processing ${csvFileName} (collection ${collection.collection_index}): ${collection.name}`);
    
    const csvContent = fs.readFileSync(csvPath, 'utf-8');
    const stories = parse(csvContent, { 
      columns: true, 
      skip_empty_lines: true 
    }) as CSVStory[];

    for (const story of stories) {
      const { error } = await supabase
        .from('stories')
        .insert({
          collection_id: collection.id,
          story_index: parseInt(story.id),
          media_type: story.media_type as 'image' | 'video',
          cdn_url: story.cdn_url,
          duration: story.duration ? parseInt(story.duration) : null,
          time_added: story.time_added,
          collection_default_date: collection.estimated_date, // Use new field name
          tag_source: collection.is_expedition_scope ? 'manual' : 'excluded'
        });

      if (error) {
        console.error(`Error inserting story ${story.id}:`, error);
      }
    }
    
    console.log(`✅ Imported ${stories.length} stories for collection ${collection.collection_index}: ${collection.name}`);
  }
}

async function main() {
  console.log('🚀 Starting CSV data import...');
  console.log('Supabase URL:', supabaseUrl);
  
  try {
    await importCollections();
    await importStories();
    console.log('🎉 Data import completed successfully!');
  } catch (error) {
    console.error('❌ Error during import:', error);
  }
}

if (require.main === module) {
  main();
}