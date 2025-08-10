import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse/sync';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

interface CSVCollection {
  'Collection Name': string;
  'Highlight ID': string;
  'Story Count': string;
  'Status': string;
}

async function updateCollectionOrder() {
  console.log('Starting collection order update...');
  
  try {
    // Read ig-data.csv to get the correct order (1-61)
    const csvPath = path.join(process.cwd(), 'data-story-collection', 'ig-data.csv');
    const csvContent = fs.readFileSync(csvPath, 'utf-8');
    
    const collections = parse(csvContent, {
      columns: true,
      skip_empty_lines: true
    }) as CSVCollection[];

    console.log(`Found ${collections.length} collections in ig-data.csv`);

    // Update each collection with its index (1-61)
    for (let i = 0; i < collections.length; i++) {
      const collection = collections[i];
      const collectionIndex = i + 1; // 1-based index
      
      console.log(`Updating collection ${collectionIndex}: ${collection['Collection Name']}`);
      
      // Use country_code field temporarily to store collection_index
      const { error } = await supabase
        .from('story_collections')
        .update({ 
          country_code: collectionIndex.toString()
        })
        .eq('highlight_id', collection['Highlight ID']);

      if (error) {
        console.error(`Error updating collection ${collection['Collection Name']}:`, error);
        continue;
      }
      
      console.log(`✅ Updated collection ${collectionIndex}`);
    }

    console.log('Collection order update completed successfully!');
    
    // Verify the update
    const { data: verifyData, error: verifyError } = await supabase
      .from('story_collections')
      .select('name, country_code')
      .order('country_code::integer');
      
    if (verifyError) {
      console.error('Error verifying update:', verifyError);
      return;
    }
    
    console.log('\nVerification - Collections in order:');
    verifyData?.forEach((collection, index) => {
      console.log(`${collection.country_code}: ${collection.name}`);
    });

  } catch (error) {
    console.error('Error updating collection order:', error);
  }
}

updateCollectionOrder();