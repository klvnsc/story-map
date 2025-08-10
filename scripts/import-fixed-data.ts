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

// Expedition phase mapping based on collection index
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

async function importStoriesCorrectly() {
  console.log('🚀 Starting corrected story import...');
  
  // Read ig-data.csv to get the correct collection order
  const csvPath = path.join(process.cwd(), './data-story-collection/ig-data.csv');
  const csvContent = fs.readFileSync(csvPath, 'utf-8');
  const collectionsFromCSV = parse(csvContent, { 
    columns: true, 
    skip_empty_lines: true 
  }) as CSVCollection[];

  console.log(`Found ${collectionsFromCSV.length} collections in ig-data.csv`);

  // Get existing collections from database (should be 61)
  const { data: dbCollections, error: collectionsError } = await supabase
    .from('story_collections')
    .select('*')
    .order('created_at');

  if (collectionsError) {
    console.error('Error fetching collections:', collectionsError);
    return;
  }

  console.log(`Found ${dbCollections.length} collections in database`);

  if (dbCollections.length !== 61) {
    console.error(`Expected 61 collections, found ${dbCollections.length}`);
    return;
  }

  // Map CSV file number to collection by matching highlight_id
  const csvToCollectionMap = new Map<number, any>();
  
  for (let csvIndex = 0; csvIndex < collectionsFromCSV.length; csvIndex++) {
    const csvCollection = collectionsFromCSV[csvIndex];
    const dbCollection = dbCollections.find(db => db.highlight_id === csvCollection['Highlight ID']);
    
    if (dbCollection) {
      csvToCollectionMap.set(csvIndex + 1, dbCollection); // CSV files are 1-indexed
      console.log(`✅ Mapped ${csvIndex + 1}.csv → Collection: ${dbCollection.name}`);
    } else {
      console.log(`⚠️ No database collection found for CSV ${csvIndex + 1}: ${csvCollection['Collection Name']}`);
    }
  }

  console.log(`\n📊 Processing ${csvToCollectionMap.size} CSV files...`);

  let totalStoriesImported = 0;

  // Import stories for each mapped CSV file
  for (const [csvFileNumber, collection] of csvToCollectionMap.entries()) {
    const csvFileName = `${csvFileNumber}.csv`;
    const csvFilePath = path.join(process.cwd(), `./data-story-collection/${csvFileName}`);
    
    if (!fs.existsSync(csvFilePath)) {
      console.log(`⚠️ CSV file not found: ${csvFileName}`);
      continue;
    }

    console.log(`\nProcessing ${csvFileName} → ${collection.name}`);
    
    const storyCsvContent = fs.readFileSync(csvFilePath, 'utf-8');
    const stories = parse(storyCsvContent, { 
      columns: true, 
      skip_empty_lines: true 
    }) as CSVStory[];

    console.log(`  Found ${stories.length} stories in ${csvFileName}`);

    // Calculate expedition phase based on CSV file number
    const expeditionPhase = getExpeditionPhase(csvFileNumber);
    const estimatedDate = getPhaseDate(expeditionPhase);

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
          estimated_date: estimatedDate,
          // Add expedition phase as a tag for smart filtering
          content_type: [story.media_type], // Basic content type
          tags: [expeditionPhase] // Add expedition phase as tag
        });

      if (error) {
        console.error(`❌ Error inserting story ${story.id}:`, error);
      }
    }
    
    totalStoriesImported += stories.length;
    console.log(`  ✅ Imported ${stories.length} stories (Total: ${totalStoriesImported})`);
  }

  console.log(`\n🎉 Import completed! Total stories imported: ${totalStoriesImported}`);
}

async function main() {
  try {
    await importStoriesCorrectly();
  } catch (error) {
    console.error('❌ Error during import:', error);
  }
}

if (require.main === module) {
  main();
}