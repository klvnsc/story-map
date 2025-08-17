// GPS Correlation Service Utilities
// Handles GPS track correlation and regional tag generation

import { createTag, TagWithMetadata } from '@/lib/tags'

export interface GPSCorrelationData {
  track_number: number
  track_title: string
  date_range: {
    start: string
    end: string
  }
  expedition_phase: string
  region: string
  cities: string[]
  regional_tags: TagWithMetadata[]
  classification: 'moving' | 'rest'
  distance_km?: number
  confidence: 'high' | 'medium' | 'low'
}

export interface StoryGPSContext {
  story_id: string
  collection_name: string
  collection_index: number
  estimated_date?: string
  current_location?: {
    location_name?: string
    latitude?: number
    longitude?: number
    location_confidence?: string
  }
  current_tags?: string[]
  tag_source?: string
}

// Collection-to-GPS-Track mapping (based on collections-manifest.json)
// NEW: Collections in ASCENDING chronological order (1=earliest, 61=latest)
export const EXPEDITION_COLLECTION_MAPPING = {
  pre_expedition: {
    collection_range: [1, 8],
    tracks: [], // No GPS tracking for pre-expedition content
    date_range: { start: "2022-06-01", end: "2023-12-31" },
    regions: ["India", "Indonesia", "Japan"],
    excluded: true // Not part of main expedition
  },
  north_china: {
    collection_range: [9, 11],
    tracks: [1, 2], // Limited GPS data for expedition preparation
    date_range: { start: "2024-02-24", end: "2024-07-20" },
    regions: ["Mongolia", "China"]
  },
  central_asia: { 
    collection_range: [12, 21], 
    tracks: [3, 4, 5, 6, 7, 8, 9],
    date_range: { start: "2024-07-18", end: "2024-09-25" },
    regions: ["Kyrgyzstan", "Kazakhstan", "Uzbekistan", "Russia", "Tajikistan", "Central Asia"]
  },
  middle_east_caucasus: { 
    collection_range: [22, 30], 
    tracks: [10, 11, 12, 13, 14, 15, 16, 17, 18, 19],
    date_range: { start: "2024-10-06", end: "2024-11-27" },
    regions: ["Georgia", "Armenia", "Turkey", "Middle East", "Caucasus"]
  },
  europe_part1: { 
    collection_range: [31, 41], 
    tracks: [20, 21, 22, 23, 24],
    date_range: { start: "2024-12-06", end: "2025-02-07" },
    regions: ["Bulgaria", "Greece", "Italy", "France", "Spain", "Europe"]
  },
  africa: {
    collection_range: [42, 50],
    tracks: [25, 26], // Limited GPS data for Africa segment
    date_range: { start: "2025-01-17", end: "2025-04-06" },
    regions: ["Morocco", "Africa"]
  },
  europe_uk_scotland: { 
    collection_range: [51, 61], 
    tracks: [27, 28, 29],
    date_range: { start: "2025-04-24", end: "2025-07-31" },
    regions: ["Germany", "England", "Wales", "Scotland", "UK", "Britain"]
  }
} as const

/**
 * Get GPS correlation data for a specific date
 */
export async function getGPSTrackForDate(
  date: string, 
  collectionIndex?: number
): Promise<GPSCorrelationData | null> {
  try {
    const params = new URLSearchParams({ date })
    if (collectionIndex) {
      params.append('collection_index', collectionIndex.toString())
    }
    
    const response = await fetch(`/api/gps-track-for-date?${params}`)
    
    if (!response.ok) {
      console.warn(`GPS correlation failed for date ${date}:`, response.statusText)
      return null
    }
    
    const result = await response.json()
    return result.success ? result.data : null
    
  } catch (error) {
    console.error('GPS correlation service error:', error)
    return null
  }
}

/**
 * Get expedition phase for a collection index
 */
export function getExpeditionPhaseByCollection(collectionIndex: number): keyof typeof EXPEDITION_COLLECTION_MAPPING | null {
  for (const [phase, config] of Object.entries(EXPEDITION_COLLECTION_MAPPING)) {
    if (collectionIndex >= config.collection_range[0] && collectionIndex <= config.collection_range[1]) {
      return phase as keyof typeof EXPEDITION_COLLECTION_MAPPING
    }
  }
  return null
}

/**
 * Check if a collection is within expedition scope (Collections 9-61)
 * Collections 1-8 are pre-expedition content (excluded)
 */
export function isExpeditionCollection(collectionIndex: number): boolean {
  return collectionIndex >= 9 && collectionIndex <= 61
}

/**
 * Get suggested regional tags for a collection
 */
export function getSuggestedRegionalTags(collectionIndex: number): TagWithMetadata[] {
  if (!isExpeditionCollection(collectionIndex)) {
    return []
  }
  
  const phase = getExpeditionPhaseByCollection(collectionIndex)
  if (!phase) return []
  
  return EXPEDITION_COLLECTION_MAPPING[phase].regions.map(regionName => 
    createTag(regionName, 'regional', 'gps')
  )
}

/**
 * Estimate story date based on collection chronology
 * Collections are in ASCENDING chronological order (1=earliest, 61=latest)
 */
export function estimateStoryDate(
  collectionIndex: number, 
  storyIndexInCollection?: number,
  totalStoriesInCollection?: number
): string | null {
  const phase = getExpeditionPhaseByCollection(collectionIndex)
  if (!phase) return null
  
  const phaseConfig = EXPEDITION_COLLECTION_MAPPING[phase]
  const phaseStart = new Date(phaseConfig.date_range.start)
  const phaseEnd = new Date(phaseConfig.date_range.end)
  
  // Linear interpolation within collection range
  const collectionProgress = (collectionIndex - phaseConfig.collection_range[0]) / 
    (phaseConfig.collection_range[1] - phaseConfig.collection_range[0])
  
  // Collections are now in ASCENDING order, so no need to invert
  const phaseDuration = phaseEnd.getTime() - phaseStart.getTime()
  const estimatedTime = phaseStart.getTime() + (phaseDuration * collectionProgress)
  
  // If story index is provided, add sub-collection timing
  if (storyIndexInCollection && totalStoriesInCollection && totalStoriesInCollection > 1) {
    const storyProgress = storyIndexInCollection / totalStoriesInCollection
    const collectionDuration = phaseDuration / (phaseConfig.collection_range[1] - phaseConfig.collection_range[0] + 1)
    const storyOffset = collectionDuration * storyProgress
    
    return new Date(estimatedTime + storyOffset).toISOString()
  }
  
  return new Date(estimatedTime).toISOString()
}

/**
 * Get GPS context suggestions for a story
 */
export async function getStoryGPSContext(
  storyContext: StoryGPSContext
): Promise<{
  gps_suggestions?: GPSCorrelationData
  estimated_date?: string
  suggested_regional_tags: TagWithMetadata[]
  confidence: 'high' | 'medium' | 'low'
}> {
  // Check if collection is excluded
  if (!isExpeditionCollection(storyContext.collection_index)) {
    return {
      suggested_regional_tags: [],
      confidence: 'low'
    }
  }
  
  // Estimate date if not provided
  let estimatedDate = storyContext.estimated_date
  if (!estimatedDate) {
    estimatedDate = estimateStoryDate(storyContext.collection_index) || undefined
  }
  
  // Get suggested regional tags
  const suggestedRegionalTags = getSuggestedRegionalTags(storyContext.collection_index)
  
  // Try to get GPS correlation data
  let gpsData: GPSCorrelationData | null = null
  if (estimatedDate) {
    gpsData = await getGPSTrackForDate(estimatedDate, storyContext.collection_index)
  }
  
  // Calculate overall confidence
  let confidence: 'high' | 'medium' | 'low' = 'low'
  if (gpsData) {
    confidence = gpsData.confidence
  } else if (suggestedRegionalTags.length > 0) {
    confidence = 'medium'
  }
  
  return {
    gps_suggestions: gpsData || undefined,
    estimated_date: estimatedDate || undefined,
    suggested_regional_tags: suggestedRegionalTags,
    confidence
  }
}

/**
 * Date caching for manual date input (REQ-036)
 */
const DATE_CACHE_KEY = 'story_editor_last_manual_date'

export function cacheLastManualDate(date: string): void {
  try {
    localStorage.setItem(DATE_CACHE_KEY, date)
  } catch (error) {
    console.warn('Failed to cache manual date:', error)
  }
}

export function getLastManualDate(): string | null {
  try {
    return localStorage.getItem(DATE_CACHE_KEY)
  } catch (error) {
    console.warn('Failed to retrieve cached manual date:', error)
    return null
  }
}

export function clearDateCache(): void {
  try {
    localStorage.removeItem(DATE_CACHE_KEY)
  } catch (error) {
    console.warn('Failed to clear date cache:', error)
  }
}

/**
 * Coordinate validation utilities
 */
export function validateCoordinates(lat: number, lng: number): {
  valid: boolean
  errors: string[]
} {
  const errors: string[] = []
  
  if (lat < -90 || lat > 90) {
    errors.push('Latitude must be between -90 and 90')
  }
  
  if (lng < -180 || lng > 180) {
    errors.push('Longitude must be between -180 and 180')
  }
  
  return {
    valid: errors.length === 0,
    errors
  }
}

/**
 * Format date for display
 */
export function formatDisplayDate(dateString: string): string {
  try {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  } catch {
    return dateString
  }
}