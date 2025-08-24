import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import { parse } from 'csv-parse/sync';

// Load environment variables
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

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

async function importStoriesFromCSV() {
  console.log('🚀 Starting fresh story import from CSV files...');
  
  // Get all collections from database ordered by collection_index
  const { data: collections, error: collectionsError } = await supabase
    .from('story_collections')
    .select('*')
    .order('collection_index');

  if (collectionsError) {
    console.error('❌ Error fetching collections:', collectionsError);
    return;
  }

  console.log(`📋 Found ${collections.length} collections in database`);

  let totalImported = 0;
  let totalErrors = 0;

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
      console.log(`⚠️ CSV file not found: ${csvFileName} for collection ${collection.collection_index} (${collection.name})`);
      continue;
    }

    console.log(`\n📁 Processing ${csvFileName} → Collection ${collection.collection_index}: ${collection.name}`);
    
    try {
      const csvContent = fs.readFileSync(csvPath, 'utf-8');
      const stories = parse(csvContent, { 
        columns: true, 
        skip_empty_lines: true 
      }) as CSVStory[];

      console.log(`   📊 Found ${stories.length} stories in CSV`);

      let collectionImported = 0;
      let collectionErrors = 0;

      for (const story of stories) {
        try {
          const { error } = await supabase
            .from('stories')
            .insert({
              collection_id: collection.id,
              story_index: parseInt(story.id),
              media_type: story.media_type as 'image' | 'video',
              cdn_url: story.cdn_url,
              duration: story.duration ? parseInt(story.duration) : null,
              time_added: story.time_added,
              // NEW: Use collection_default_date instead of estimated_date
              collection_default_date: collection.estimated_date,
              // Set tag_source based on expedition scope
              tag_source: collection.is_expedition_scope ? 'manual' : 'excluded',
              date_confidence: 'collection_estimated'
            });

          if (error) {
            console.error(`   ❌ Error inserting story ${story.id}:`, error.message);
            collectionErrors++;
          } else {
            collectionImported++;
          }
        } catch (storyError) {
          console.error(`   ❌ Exception inserting story ${story.id}:`, storyError);
          collectionErrors++;
        }
      }
      
      console.log(`   ✅ Imported ${collectionImported} stories, ${collectionErrors} errors`);
      totalImported += collectionImported;
      totalErrors += collectionErrors;

    } catch (csvError) {
      console.error(`❌ Error processing CSV ${csvFileName}:`, csvError);
      totalErrors++;
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('📊 IMPORT SUMMARY');
  console.log('='.repeat(60));
  console.log(`✅ Total stories imported: ${totalImported}`);
  console.log(`❌ Total errors: ${totalErrors}`);
  console.log(`📋 Collections processed: ${collections.length}`);
  
  if (totalErrors === 0) {
    console.log('\n🎉 Import completed successfully!');
  } else {
    console.log(`\n⚠️ Import completed with ${totalErrors} errors.`);
  }
}

async function verifyImport() {
  console.log('\n🔍 Verifying import...');
  
  // Check total story count
  const { data: storyCount, error: countError } = await supabase
    .from('stories')
    .select('count()', { count: 'exact' });
    
  if (countError) {
    console.error('❌ Error counting stories:', countError);
    return;
  }

  console.log(`📊 Total stories in database: ${storyCount[0]?.count || 0}`);

  // Check stories by expedition scope
  const { data: storyStats, error: statsError } = await supabase
    .rpc('get_story_stats_by_expedition_scope');

  if (!statsError && storyStats) {
    console.log('📈 Stories by expedition scope:');
    for (const stat of storyStats) {
      console.log(`   ${stat.expedition_scope ? 'Expedition' : 'Pre-expedition'}: ${stat.story_count} stories`);
    }
  }

  // Check date field usage
  const { data: dateStats, error: dateError } = await supabase
    .from('stories')
    .select('collection_default_date, user_assigned_date')
    .limit(1000);

  if (!dateError && dateStats) {
    const collectionDefaultCount = dateStats.filter(s => s.collection_default_date).length;
    const userAssignedCount = dateStats.filter(s => s.user_assigned_date).length;
    
    console.log('📅 Date field usage (sample of 1000):');
    console.log(`   collection_default_date: ${collectionDefaultCount}`);
    console.log(`   user_assigned_date: ${userAssignedCount}`);
  }
}

async function main() {
  console.log('🏁 Starting fresh story import process...');
  console.log('Supabase URL:', supabaseUrl);
  
  try {
    await importStoriesFromCSV();
    await verifyImport();
    console.log('\n🎯 Process completed!');
  } catch (error) {
    console.error('💥 Fatal error during import:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}