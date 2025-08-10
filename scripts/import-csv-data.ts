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

// Expedition phase mapping
const EXPEDITION_PHASES = {
  'north_china': { start: 1, end: 15, date: '2024-07-01' },
  'central_asia': { start: 16, end: 35, date: '2024-08-31' },
  'middle_east': { start: 36, end: 45, date: '2024-10-17' },
  'africa': { start: 46, end: 55, date: '2025-01-06' },
  'europe': { start: 56, end: 60, date: '2025-03-14' },
  'scotland': { start: 61, end: 61, date: '2025-06-24' }
};

function getExpeditionPhase(collectionIndex: number): string {
  for (const [phase, range] of Object.entries(EXPEDITION_PHASES)) {
    if (collectionIndex >= range.start && collectionIndex <= range.end) {
      return phase;
    }
  }
  return 'unknown';
}

function getPhaseDate(phase: string): string {
  const phaseInfo = Object.entries(EXPEDITION_PHASES).find(([p]) => p === phase);
  return phaseInfo ? phaseInfo[1].date : '2024-07-01';
}

async function importCollections() {
  console.log('Importing collections from ig-data.csv...');
  
  const csvPath = path.join(process.cwd(), './data-story-collection/ig-data.csv');
  const csvContent = fs.readFileSync(csvPath, 'utf-8');
  const collections = parse(csvContent, { 
    columns: true, 
    skip_empty_lines: true 
  }) as CSVCollection[];

  for (let i = 0; i < collections.length; i++) {
    const collection = collections[i];
    const collectionIndex = i + 1;
    const expeditionPhase = getExpeditionPhase(collectionIndex);
    const estimatedDate = getPhaseDate(expeditionPhase);
    
    const { error } = await supabase
      .from('story_collections')
      .insert({
        highlight_id: collection['Highlight ID'],
        name: collection['Collection Name'],
        story_count: parseInt(collection['Story Count'].replace(' stories', '')),
        expedition_phase: expeditionPhase,
        estimated_date: estimatedDate
      });

    if (error) {
      console.error(`Error inserting collection ${collection['Collection Name']}:`, error);
    } else {
      console.log(`✅ Imported collection: ${collection['Collection Name']} (${expeditionPhase})`);
    }
  }
}

async function importStories() {
  console.log('Importing individual stories...');
  
  // Get all collections from database
  const { data: collections, error: collectionsError } = await supabase
    .from('story_collections')
    .select('*')
    .order('created_at');

  if (collectionsError) {
    console.error('Error fetching collections:', collectionsError);
    return;
  }

  for (let i = 0; i < collections.length; i++) {
    const collection = collections[i];
    const csvFileName = `${i + 1}.csv`;
    const csvPath = path.join(process.cwd(), `./data-story-collection/${csvFileName}`);
    
    if (!fs.existsSync(csvPath)) {
      console.log(`⚠️ CSV file not found: ${csvFileName}`);
      continue;
    }

    console.log(`Processing ${csvFileName} for collection: ${collection.name}`);
    
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
          estimated_date: collection.estimated_date // Same date as collection
        });

      if (error) {
        console.error(`Error inserting story ${story.id}:`, error);
      }
    }
    
    console.log(`✅ Imported ${stories.length} stories for collection: ${collection.name}`);
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