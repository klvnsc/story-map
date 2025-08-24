#!/usr/bin/env ts-node

import { Command } from 'commander';
import { fetchCollectionHtml, fetchMultipleCollections } from './steps/step1-fetch-html';
import { parseCollectionHtml, parseMultipleCollections } from './steps/step2-parse-html';
import { updateCollectionDatabase, updateMultipleCollections, validateCsvForUpdate } from './steps/step3-update-db';
import { validateCollectionNumbers, getAllCollectionNumbers } from './utils/collection-mapping';

// Load environment variables
require('dotenv').config({ path: '.env.local' });

const program = new Command();

program
  .name('renew-cdn-urls')
  .description('Renew expired Instagram CDN URLs for story collections using StorySaver API')
  .version('1.0.0');

// Single collection command
program
  .command('collection <number>')
  .description('Renew CDN URLs for a single collection')
  .option('--step <step>', 'Run specific step only (1, 2, or 3)', '0')
  .option('--dry-run', 'Validate without making database changes')
  .option('--skip-fetch', 'Skip fetching HTML (use existing)', false)
  .option('--skip-parse', 'Skip parsing HTML (use existing CSV)', false)
  .option('--validate-urls', 'Validate CDN URLs accessibility', false)
  .option('--rate-limit <ms>', 'Rate limit between API calls (ms)', '1000')
  .action(async (numberStr: string, options) => {
    try {
      const collectionNumber = parseInt(numberStr);
      
      if (isNaN(collectionNumber)) {
        console.error('❌ Collection number must be a valid integer');
        process.exit(1);
      }
      
      validateCollectionNumbers([collectionNumber]);
      
      const step = parseInt(options.step);
      const rateLimitMs = parseInt(options.rateLimit);
      
      console.log(`🔄 Renewing CDN URLs for collection ${collectionNumber}`);
      console.log(`Configuration:`);
      console.log(`   Step: ${step === 0 ? 'All' : step}`);
      console.log(`   Dry run: ${options.dryRun ? 'Yes' : 'No'}`);
      console.log(`   Skip fetch: ${options.skipFetch ? 'Yes' : 'No'}`);
      console.log(`   Skip parse: ${options.skipParse ? 'Yes' : 'No'}`);
      console.log(`   Validate URLs: ${options.validateUrls ? 'Yes' : 'No'}`);
      console.log(`   Rate limit: ${rateLimitMs}ms`);
      console.log('');
      
      // Step 1: Fetch HTML
      if ((step === 0 || step === 1) && !options.skipFetch) {
        console.log('🌐 STEP 1: Fetching HTML from StorySaver API...');
        await fetchCollectionHtml(collectionNumber, {
          retries: 3,
          retryDelay: 2000,
          timeout: 30000
        });
        console.log('');
      }
      
      // Step 2: Parse HTML and generate CSV
      if ((step === 0 || step === 2) && !options.skipParse) {
        console.log('📝 STEP 2: Parsing HTML and generating CSV...');
        await parseCollectionHtml(collectionNumber, {
          validateUrls: options.validateUrls,
          urlValidationDelay: 100
        });
        console.log('');
      }
      
      // Step 3: Update database
      if (step === 0 || step === 3) {
        console.log('🗄️ STEP 3: Updating database...');
        
        // Validate CSV first
        const validation = await validateCsvForUpdate(collectionNumber);
        if (!validation.valid) {
          console.error('❌ CSV validation failed:');
          validation.issues.forEach(issue => console.error(`   • ${issue}`));
          process.exit(1);
        }
        
        await updateCollectionDatabase(collectionNumber, {
          dryRun: options.dryRun,
          batchSize: 100,
          backupUrls: true
        });
      }
      
      console.log(`✅ CDN URL renewal completed for collection ${collectionNumber}`);
      
    } catch (error) {
      console.error('❌ Error:', error);
      process.exit(1);
    }
  });

// Multiple collections command
program
  .command('collections <numbers>')
  .description('Renew CDN URLs for multiple collections (comma-separated)')
  .option('--step <step>', 'Run specific step only (1, 2, or 3)', '0')
  .option('--dry-run', 'Validate without making database changes')
  .option('--skip-fetch', 'Skip fetching HTML (use existing)', false)
  .option('--skip-parse', 'Skip parsing HTML (use existing CSV)', false)
  .option('--validate-urls', 'Validate CDN URLs accessibility', false)
  .option('--rate-limit <ms>', 'Rate limit between API calls (ms)', '1000')
  .action(async (numbersStr: string, options) => {
    try {
      const collectionNumbers = numbersStr.split(',').map(n => parseInt(n.trim()));
      
      const invalidNumbers = collectionNumbers.filter(n => isNaN(n));
      if (invalidNumbers.length > 0) {
        console.error('❌ Invalid collection numbers:', invalidNumbers);
        process.exit(1);
      }
      
      validateCollectionNumbers(collectionNumbers);
      
      const step = parseInt(options.step);
      const rateLimitMs = parseInt(options.rateLimit);
      
      console.log(`🔄 Renewing CDN URLs for ${collectionNumbers.length} collections`);
      console.log(`Collections: ${collectionNumbers.join(', ')}`);
      console.log(`Configuration:`);
      console.log(`   Step: ${step === 0 ? 'All' : step}`);
      console.log(`   Dry run: ${options.dryRun ? 'Yes' : 'No'}`);
      console.log(`   Skip fetch: ${options.skipFetch ? 'Yes' : 'No'}`);
      console.log(`   Skip parse: ${options.skipParse ? 'Yes' : 'No'}`);
      console.log(`   Validate URLs: ${options.validateUrls ? 'Yes' : 'No'}`);
      console.log(`   Rate limit: ${rateLimitMs}ms`);
      console.log('');
      
      // Step 1: Fetch HTML
      if ((step === 0 || step === 1) && !options.skipFetch) {
        console.log('🌐 STEP 1: Fetching HTML from StorySaver API...');
        await fetchMultipleCollections(collectionNumbers, rateLimitMs, {
          retries: 3,
          retryDelay: 2000,
          timeout: 30000
        });
        console.log('');
      }
      
      // Step 2: Parse HTML and generate CSV
      if ((step === 0 || step === 2) && !options.skipParse) {
        console.log('📝 STEP 2: Parsing HTML and generating CSV...');
        await parseMultipleCollections(collectionNumbers, {
          validateUrls: options.validateUrls,
          urlValidationDelay: 100
        });
        console.log('');
      }
      
      // Step 3: Update database
      if (step === 0 || step === 3) {
        console.log('🗄️ STEP 3: Updating database...');
        await updateMultipleCollections(collectionNumbers, {
          dryRun: options.dryRun,
          batchSize: 100,
          backupUrls: true
        });
      }
      
      console.log(`✅ CDN URL renewal completed for ${collectionNumbers.length} collections`);
      
    } catch (error) {
      console.error('❌ Error:', error);
      process.exit(1);
    }
  });

// All collections command
program
  .command('all')
  .description('Renew CDN URLs for all collections (1-61)')
  .option('--step <step>', 'Run specific step only (1, 2, or 3)', '0')
  .option('--dry-run', 'Validate without making database changes')
  .option('--skip-fetch', 'Skip fetching HTML (use existing)', false)
  .option('--skip-parse', 'Skip parsing HTML (use existing CSV)', false)
  .option('--validate-urls', 'Validate CDN URLs accessibility', false)
  .option('--rate-limit <ms>', 'Rate limit between API calls (ms)', '1000')
  .option('--batch-size <size>', 'Process collections in batches', '10')
  .action(async (options) => {
    try {
      const allCollections = getAllCollectionNumbers();
      const step = parseInt(options.step);
      const rateLimitMs = parseInt(options.rateLimit);
      const batchSize = parseInt(options.batchSize);
      
      console.log(`🔄 Renewing CDN URLs for ALL ${allCollections.length} collections`);
      console.log(`Configuration:`);
      console.log(`   Step: ${step === 0 ? 'All' : step}`);
      console.log(`   Dry run: ${options.dryRun ? 'Yes' : 'No'}`);
      console.log(`   Skip fetch: ${options.skipFetch ? 'Yes' : 'No'}`);
      console.log(`   Skip parse: ${options.skipParse ? 'Yes' : 'No'}`);
      console.log(`   Validate URLs: ${options.validateUrls ? 'Yes' : 'No'}`);
      console.log(`   Rate limit: ${rateLimitMs}ms`);
      console.log(`   Batch size: ${batchSize}`);
      console.log('');
      
      // Process in batches to avoid overwhelming the API
      for (let i = 0; i < allCollections.length; i += batchSize) {
        const batch = allCollections.slice(i, i + batchSize);
        const batchNum = Math.floor(i / batchSize) + 1;
        const totalBatches = Math.ceil(allCollections.length / batchSize);
        
        console.log(`📦 Processing batch ${batchNum}/${totalBatches} (collections ${batch[0]}-${batch[batch.length - 1]})...`);
        
        // Step 1: Fetch HTML
        if ((step === 0 || step === 1) && !options.skipFetch) {
          console.log('🌐 STEP 1: Fetching HTML...');
          await fetchMultipleCollections(batch, rateLimitMs, {
            retries: 3,
            retryDelay: 2000,
            timeout: 30000
          });
        }
        
        // Step 2: Parse HTML and generate CSV
        if ((step === 0 || step === 2) && !options.skipParse) {
          console.log('📝 STEP 2: Parsing HTML...');
          await parseMultipleCollections(batch, {
            validateUrls: options.validateUrls,
            urlValidationDelay: 100
          });
        }
        
        // Step 3: Update database
        if (step === 0 || step === 3) {
          console.log('🗄️ STEP 3: Updating database...');
          await updateMultipleCollections(batch, {
            dryRun: options.dryRun,
            batchSize: 100,
            backupUrls: true
          });
        }
        
        if (i + batchSize < allCollections.length) {
          console.log(`⏸️ Waiting 5 seconds before next batch...\n`);
          await new Promise(resolve => setTimeout(resolve, 5000));
        }
      }
      
      console.log(`✅ CDN URL renewal completed for all ${allCollections.length} collections`);
      
    } catch (error) {
      console.error('❌ Error:', error);
      process.exit(1);
    }
  });

// Validate command
program
  .command('validate <number>')
  .description('Validate CSV data for a collection without updating database')
  .action(async (numberStr: string) => {
    try {
      const collectionNumber = parseInt(numberStr);
      
      if (isNaN(collectionNumber)) {
        console.error('❌ Collection number must be a valid integer');
        process.exit(1);
      }
      
      validateCollectionNumbers([collectionNumber]);
      
      console.log(`🔍 Validating collection ${collectionNumber}...`);
      
      const validation = await validateCsvForUpdate(collectionNumber);
      
      if (validation.valid) {
        console.log(`✅ Validation passed`);
        console.log(`   Stories: ${validation.storyCount}`);
      } else {
        console.log(`❌ Validation failed:`);
        validation.issues.forEach(issue => console.log(`   • ${issue}`));
        process.exit(1);
      }
      
    } catch (error) {
      console.error('❌ Error:', error);
      process.exit(1);
    }
  });

// Parse and execute
program.parse();