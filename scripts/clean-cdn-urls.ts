#!/usr/bin/env npx tsx

/**
 * Script to clean CDN URLs by removing unnecessary tracking parameters
 * 
 * This script removes parameters like:
 * - &dl=1 (download parameter)
 * - &_nc_gid= (tracking)
 * - &_nc_ohc= (tracking)  
 * - &_nc_sid= (tracking)
 * - &edm= (tracking)
 * 
 * While preserving essential parameters needed for image/video loading.
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

interface Story {
  id: string;
  cdn_url: string;
}

/**
 * Clean a single CDN URL by removing unnecessary parameters
 */
function cleanCdnUrl(url: string): string {
  try {
    const urlObj = new URL(url);
    
    // Parameters to remove (tracking/download parameters)
    const paramsToRemove = [
      'dl',           // Download parameter
      '_nc_gid',      // Tracking
      '_nc_ohc',      // Tracking
      '_nc_sid',      // Tracking
      'edm',          // Tracking
    ];
    
    // Remove unwanted parameters
    paramsToRemove.forEach(param => {
      urlObj.searchParams.delete(param);
    });
    
    return urlObj.toString();
  } catch (error) {
    console.warn(`Failed to parse URL: ${url}`, error);
    return url; // Return original if parsing fails
  }
}

async function cleanAllUrls() {
  console.log('🧹 Starting CDN URL cleanup...');
  
  try {
    // Get all stories with CDN URLs
    const { data: stories, error } = await supabase
      .from('stories')
      .select('id, cdn_url')
      .not('cdn_url', 'is', null);
    
    if (error) {
      console.error('Error fetching stories:', error);
      return;
    }
    
    if (!stories || stories.length === 0) {
      console.log('No stories found');
      return;
    }
    
    console.log(`Found ${stories.length} stories to check`);
    
    let cleanedCount = 0;
    let errorCount = 0;
    
    // Process stories in batches
    const batchSize = 100;
    for (let i = 0; i < stories.length; i += batchSize) {
      const batch = stories.slice(i, i + batchSize);
      
      console.log(`Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(stories.length / batchSize)}`);
      
      for (const story of batch) {
        const originalUrl = story.cdn_url;
        const cleanedUrl = cleanCdnUrl(originalUrl);
        
        // Only update if URL changed
        if (cleanedUrl !== originalUrl) {
          const { error: updateError } = await supabase
            .from('stories')
            .update({ cdn_url: cleanedUrl })
            .eq('id', story.id);
          
          if (updateError) {
            console.error(`Error updating story ${story.id}:`, updateError);
            errorCount++;
          } else {
            cleanedCount++;
            if (cleanedCount <= 5) {
              // Show first few examples
              console.log(`✅ Cleaned URL for story ${story.id}`);
              console.log(`   Before: ${originalUrl.substring(0, 100)}...`);
              console.log(`   After:  ${cleanedUrl.substring(0, 100)}...`);
            }
          }
        }
      }
      
      // Small delay between batches
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    console.log(`\n🎉 Cleanup complete!`);
    console.log(`   Cleaned URLs: ${cleanedCount}`);
    console.log(`   Errors: ${errorCount}`);
    console.log(`   Total processed: ${stories.length}`);
    
  } catch (error) {
    console.error('Script error:', error);
  }
}

// Run the cleanup
cleanAllUrls().then(() => {
  console.log('Script finished');
  process.exit(0);
}).catch(error => {
  console.error('Script failed:', error);
  process.exit(1);
});