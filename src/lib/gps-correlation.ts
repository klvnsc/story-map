// GPS Correlation Service Utilities
// Handles GPS track correlation and regional tag generation

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
  regional_tags: string[]
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

// Collection-to-GPS-Track mapping (matches API endpoint)
export const EXPEDITION_COLLECTION_MAPPING = {
  uk_scotland: { 
    collection_range: [1, 15], 
    tracks: [25, 26, 27, 28, 29],
    date_range: { start: "2025-05-25", end: "2025-07-02" },
    regions: ["Wales", "England", "Scotland", "UK", "Britain"]
  },
  europe_mediterranean: { 
    collection_range: [16, 35], 
    tracks: [20, 21, 22, 23, 24],
    date_range: { start: "2025-03-14", end: "2025-05-25" },
    regions: ["Germany", "Morocco", "Spain", "France", "Italy", "Greece", "Bulgaria", "Mediterranean", "Europe"]
  },
  middle_east_caucasus: { 
    collection_range: [36, 45], 
    tracks: [10, 11, 12, 13, 14, 15, 16, 17, 18, 19],
    date_range: { start: "2024-10-17", end: "2025-03-12" },
    regions: ["Georgia", "Armenia", "Turkey", "Middle East", "Caucasus"]
  },
  central_asia: { 
    collection_range: [46, 51], 
    tracks: [3, 4, 5, 6, 7, 8, 9],
    date_range: { start: "2024-07-01", end: "2024-10-16" },
    regions: ["Tajikistan", "Russia", "Kazakhstan", "Uzbekistan", "Kyrgyzstan", "Central Asia"]
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
 * Check if a collection is within expedition scope (Collections 1-51)
 */
export function isExpeditionCollection(collectionIndex: number): boolean {
  return collectionIndex >= 1 && collectionIndex <= 51
}

/**
 * Get suggested regional tags for a collection
 */
export function getSuggestedRegionalTags(collectionIndex: number): string[] {
  if (!isExpeditionCollection(collectionIndex)) {
    return []
  }
  
  const phase = getExpeditionPhaseByCollection(collectionIndex)
  return phase ? [...EXPEDITION_COLLECTION_MAPPING[phase].regions] : []
}

/**
 * Estimate story date based on collection chronology
 * Collections are in DESCENDING order (1=latest, 61=earliest)
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
  
  // Since collections are in DESCENDING order, invert the progress
  const invertedProgress = 1 - collectionProgress
  
  const phaseDuration = phaseEnd.getTime() - phaseStart.getTime()
  const estimatedTime = phaseStart.getTime() + (phaseDuration * invertedProgress)
  
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
  suggested_regional_tags: string[]
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