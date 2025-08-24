import * as fs from 'fs';
import * as path from 'path';

export interface CollectionManifest {
  metadata: {
    version: string;
    created: string;
    description: string;
    total_collections: number;
    pre_expedition_collections: string;
    expedition_collections: string;
    post_expedition_collections: string;
    last_updated: string;
  };
  expedition_phases: Record<string, {
    name: string;
    date_range: string;
    description: string;
    collections: number[];
    story_count: number;
  }>;
  collection_mapping: {
    old_to_new: Record<string, number>;
    new_to_old: Record<string, number>;
  };
  collections: Record<string, {
    name: string;
    original_index: number | null;
    expedition_phase: string;
    estimated_date: string;
    region: string;
    story_count: number | null;
    instagram_id: string | null;
    description?: string;
  }>;
}

export interface CollectionInfo {
  collectionNumber: number;
  name: string;
  highlightId: string | null;
  storyCount: number | null;
  expeditionPhase: string;
  estimatedDate: string;
  region: string;
  originalIndex: number | null;
  description?: string;
}

/**
 * Load collections manifest from JSON file
 */
export function loadCollectionsManifest(): CollectionManifest {
  const manifestPath = path.join(process.cwd(), 'data', 'collections-manifest.json');
  
  if (!fs.existsSync(manifestPath)) {
    throw new Error(`collections-manifest.json not found at ${manifestPath}`);
  }
  
  const manifestContent = fs.readFileSync(manifestPath, 'utf8');
  return JSON.parse(manifestContent);
}

/**
 * Get highlight ID (Instagram ID) for a specific collection number from manifest
 */
export function getHighlightIdFromManifest(collectionNumber: number): string | null {
  const manifest = loadCollectionsManifest();
  const collection = manifest.collections[collectionNumber.toString()];
  
  if (!collection) {
    throw new Error(`Collection ${collectionNumber} not found in manifest. Valid range: 1-${manifest.metadata.total_collections}`);
  }
  
  return collection.instagram_id;
}

/**
 * Get highlight ID from old ig-data.csv using original collection index
 */
export function getHighlightIdFromLegacyCsv(originalIndex: number): string {
  const csvPath = path.join(process.cwd(), 'data-story-collection', 'ig-data.csv');
  
  if (!fs.existsSync(csvPath)) {
    throw new Error(`ig-data.csv not found at ${csvPath}`);
  }
  
  const csvContent = fs.readFileSync(csvPath, 'utf8');
  const lines = csvContent.split('\n');
  
  // Find the line with the matching collection ID (originalIndex)
  for (let i = 1; i < lines.length; i++) { // Skip header
    const line = lines[i].trim();
    if (!line) continue;
    
    // Parse CSV line (simple approach - assumes no commas in quoted fields for highlight IDs)
    const columns = line.split(',').map(col => col.replace(/"/g, ''));
    
    if (columns.length >= 3 && parseInt(columns[0]) === originalIndex) {
      return columns[2]; // Highlight ID is in column 3
    }
  }
  
  throw new Error(`Original collection index ${originalIndex} not found in ig-data.csv`);
}

/**
 * Get collection info for a specific collection number using manifest
 */
export function getCollectionInfoFromManifest(collectionNumber: number): CollectionInfo {
  const manifest = loadCollectionsManifest();
  const collection = manifest.collections[collectionNumber.toString()];
  
  if (!collection) {
    throw new Error(`Collection ${collectionNumber} not found in manifest. Valid range: 1-${manifest.metadata.total_collections}`);
  }
  
  // Get Instagram ID from manifest or fallback to legacy CSV
  let highlightId: string | null = collection.instagram_id;
  
  if (!highlightId && collection.original_index !== null) {
    try {
      highlightId = getHighlightIdFromLegacyCsv(collection.original_index);
    } catch (error) {
      console.warn(`Could not find highlight ID for collection ${collectionNumber} (original ${collection.original_index}):`, error instanceof Error ? error.message : String(error));
      highlightId = null;
    }
  }
  
  return {
    collectionNumber,
    name: collection.name,
    highlightId,
    storyCount: collection.story_count,
    expeditionPhase: collection.expedition_phase,
    estimatedDate: collection.estimated_date,
    region: collection.region,
    originalIndex: collection.original_index,
    description: collection.description
  };
}

/**
 * Get all collection numbers from manifest (1-total_collections)
 */
export function getAllCollectionNumbersFromManifest(): number[] {
  const manifest = loadCollectionsManifest();
  const numbers: number[] = [];
  
  for (let i = 1; i <= manifest.metadata.total_collections; i++) {
    if (manifest.collections[i.toString()]) {
      numbers.push(i);
    }
  }
  
  return numbers;
}

/**
 * Get collections that need Instagram data fetched (have instagram_id but no CSV files)
 */
export function getCollectionsNeedingFetch(): number[] {
  const manifest = loadCollectionsManifest();
  const needingFetch: number[] = [];
  
  Object.entries(manifest.collections).forEach(([numStr, collection]) => {
    const num = parseInt(numStr);
    
    // Check if we have Instagram ID but no CSV file yet
    const hasInstagramId = collection.instagram_id || collection.original_index;
    const csvPath = path.join(process.cwd(), 'data-story-collection', `${num}.csv`);
    const hasCsvFile = fs.existsSync(csvPath);
    
    if (hasInstagramId && !hasCsvFile) {
      needingFetch.push(num);
    }
  });
  
  return needingFetch.sort((a, b) => a - b);
}

/**
 * Validate collection numbers are within valid manifest range
 */
export function validateCollectionNumbersFromManifest(collectionNumbers: number[]): void {
  const manifest = loadCollectionsManifest();
  const maxCollection = manifest.metadata.total_collections;
  
  for (const num of collectionNumbers) {
    if (num < 1 || num > maxCollection) {
      throw new Error(`Invalid collection number ${num}. Valid range: 1-${maxCollection}`);
    }
    
    if (!manifest.collections[num.toString()]) {
      throw new Error(`Collection ${num} not defined in manifest`);
    }
  }
}

/**
 * Get mapping from old collection index to new collection index
 */
export function getOldToNewMapping(): Record<number, number> {
  const manifest = loadCollectionsManifest();
  const mapping: Record<number, number> = {};
  
  Object.entries(manifest.collections).forEach(([newIndexStr, collection]) => {
    const newIndex = parseInt(newIndexStr);
    if (collection.original_index !== null) {
      mapping[collection.original_index] = newIndex;
    }
  });
  
  return mapping;
}

/**
 * Get mapping from new collection index to old collection index  
 */
export function getNewToOldMapping(): Record<number, number> {
  const manifest = loadCollectionsManifest();
  const mapping: Record<number, number> = {};
  
  Object.entries(manifest.collections).forEach(([newIndexStr, collection]) => {
    const newIndex = parseInt(newIndexStr);
    if (collection.original_index !== null) {
      mapping[newIndex] = collection.original_index;
    }
  });
  
  return mapping;
}