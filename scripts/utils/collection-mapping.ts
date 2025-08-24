import * as fs from 'fs';
import * as path from 'path';

export interface CollectionMapping {
  collectionNumber: number;
  name: string;
  highlightId: string;
  storyCount: number;
  expeditionPhase: string;
}

/**
 * Load collection mappings from collections-manifest.json (authoritative source)
 */
export function loadCollectionMappings(): CollectionMapping[] {
  const manifestPath = path.join(process.cwd(), 'data', 'collections-manifest.json');
  
  if (!fs.existsSync(manifestPath)) {
    throw new Error(`collections-manifest.json not found at ${manifestPath}`);
  }
  
  const manifestContent = fs.readFileSync(manifestPath, 'utf8');
  const manifest = JSON.parse(manifestContent);
  
  const mappings: CollectionMapping[] = [];
  
  // Extract collection data from manifest
  Object.keys(manifest.collections).forEach(collectionKey => {
    const collection = manifest.collections[collectionKey];
    const collectionNumber = parseInt(collectionKey);
    
    mappings.push({
      collectionNumber,
      name: collection.name,
      highlightId: collection.instagram_id,
      storyCount: collection.story_count,
      expeditionPhase: collection.expedition_phase
    });
  });
  
  // Sort by collection number
  return mappings.sort((a, b) => a.collectionNumber - b.collectionNumber);
}

/**
 * Get highlight ID for a specific collection number
 */
export function getHighlightId(collectionNumber: number): string {
  const mappings = loadCollectionMappings();
  const mapping = mappings.find(m => m.collectionNumber === collectionNumber);
  
  if (!mapping) {
    throw new Error(`Collection ${collectionNumber} not found. Valid range: 1-${mappings.length}`);
  }
  
  return mapping.highlightId;
}

/**
 * Get collection info for a specific collection number
 */
export function getCollectionInfo(collectionNumber: number): CollectionMapping {
  const mappings = loadCollectionMappings();
  const mapping = mappings.find(m => m.collectionNumber === collectionNumber);
  
  if (!mapping) {
    throw new Error(`Collection ${collectionNumber} not found. Valid range: 1-${mappings.length}`);
  }
  
  return mapping;
}

/**
 * Get all collection numbers (1-61)
 */
export function getAllCollectionNumbers(): number[] {
  const mappings = loadCollectionMappings();
  return mappings.map(m => m.collectionNumber);
}

/**
 * Validate collection numbers are within valid range
 */
export function validateCollectionNumbers(collectionNumbers: number[]): void {
  const validNumbers = getAllCollectionNumbers();
  const maxCollection = Math.max(...validNumbers);
  
  for (const num of collectionNumbers) {
    if (num < 1 || num > maxCollection) {
      throw new Error(`Invalid collection number ${num}. Valid range: 1-${maxCollection}`);
    }
  }
}