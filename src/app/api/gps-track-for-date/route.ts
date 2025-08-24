import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { createTag } from '@/lib/tags'
import { TagWithMetadata } from '@/types'

// GPS Track Correlation API Endpoint
// GET /api/gps-track-for-date?date=2025-07-02&collection_index=1

interface GPSTrackResponse {
  success: boolean
  data: {
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
  } | null
  error?: string
}

// Collection-to-GPS-Track mapping (based on collections-manifest.json)
// NEW: Collections in ASCENDING chronological order (1=earliest, 61=latest)
const EXPEDITION_COLLECTION_MAPPING = {
  // Pre-expedition (Collections 1-8) - EXCLUDED from GPS correlation
  pre_expedition: {
    collection_range: [1, 8],
    tracks: [], // No GPS tracking for pre-expedition content
    date_range: { start: "2022-06-01", end: "2023-12-31" },
    regions: ["India", "Indonesia", "Japan"],
    excluded: true
  },
  
  // North China & Mongolia (Collections 9-11)
  north_china: {
    collection_range: [9, 11],
    tracks: [1, 2], // Limited GPS data for expedition preparation
    date_range: { start: "2024-02-24", end: "2024-07-20" },
    regions: ["Mongolia", "China"]
  },
  
  // Central Asia (Collections 12-21)
  central_asia: { 
    collection_range: [12, 21], 
    tracks: [3, 4, 5, 6, 7, 8, 9],
    date_range: { start: "2024-07-18", end: "2024-09-25" },
    regions: ["Kyrgyzstan", "Kazakhstan", "Uzbekistan", "Russia", "Tajikistan", "Central Asia"]
  },
  
  // Middle East & Caucasus (Collections 22-30)
  middle_east_caucasus: { 
    collection_range: [22, 30], 
    tracks: [10, 11, 12, 13, 14, 15, 16, 17, 18, 19],
    date_range: { start: "2024-10-06", end: "2024-11-27" },
    regions: ["Georgia", "Armenia", "Turkey", "Middle East", "Caucasus"]
  },
  
  // Europe Part 1 (Collections 31-41)
  europe_part1: { 
    collection_range: [31, 41], 
    tracks: [20, 21, 22, 23, 24],
    date_range: { start: "2024-12-06", end: "2025-02-07" },
    regions: ["Bulgaria", "Greece", "Italy", "France", "Spain", "Europe"]
  },
  
  // Africa (Collections 42-50)
  africa: {
    collection_range: [42, 50],
    tracks: [25, 26], // Limited GPS data for Africa segment
    date_range: { start: "2025-01-17", end: "2025-04-06" },
    regions: ["Morocco", "Africa"]
  },
  
  // Europe Part 2 & UK/Scotland (Collections 51-61)
  europe_uk_scotland: { 
    collection_range: [51, 61], 
    tracks: [27, 28, 29],
    date_range: { start: "2025-04-24", end: "2025-07-31" },
    regions: ["Germany", "England", "Wales", "Scotland", "UK", "Britain"]
  }
}

function getExpeditionPhaseByDate(date: string): keyof typeof EXPEDITION_COLLECTION_MAPPING | null {
  const targetDate = new Date(date)
  
  for (const [phase, config] of Object.entries(EXPEDITION_COLLECTION_MAPPING)) {
    const startDate = new Date(config.date_range.start)
    const endDate = new Date(config.date_range.end)
    
    if (targetDate >= startDate && targetDate <= endDate) {
      return phase as keyof typeof EXPEDITION_COLLECTION_MAPPING
    }
  }
  
  return null
}

function getExpeditionPhaseByCollection(collectionIndex: number): keyof typeof EXPEDITION_COLLECTION_MAPPING | null {
  for (const [phase, config] of Object.entries(EXPEDITION_COLLECTION_MAPPING)) {
    if (collectionIndex >= config.collection_range[0] && collectionIndex <= config.collection_range[1]) {
      return phase as keyof typeof EXPEDITION_COLLECTION_MAPPING
    }
  }
  
  return null
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const date = searchParams.get('date')
    const collectionIndexParam = searchParams.get('collection_index')
    
    if (!date) {
      return NextResponse.json({
        success: false,
        error: 'Date parameter is required (YYYY-MM-DD format)'
      }, { status: 400 })
    }

    // Validate date format
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/
    if (!dateRegex.test(date)) {
      return NextResponse.json({
        success: false,
        error: 'Invalid date format. Use YYYY-MM-DD'
      }, { status: 400 })
    }

    // Check if date is before expedition start (July 1, 2024)
    const expeditionStart = new Date('2024-07-01')
    const targetDate = new Date(date)
    
    if (targetDate < expeditionStart) {
      return NextResponse.json({
        success: false,
        error: 'Date is before expedition start (July 1, 2024). No GPS correlation available.'
      }, { status: 404 })
    }

    // Try to find expedition phase by date first, then by collection if provided
    let expeditionPhase: keyof typeof EXPEDITION_COLLECTION_MAPPING | null = null
    
    if (collectionIndexParam) {
      const collectionIndex = parseInt(collectionIndexParam)
      
      // Check if collection is excluded (Collections 1-8: pre-expedition content)
      if (collectionIndex >= 1 && collectionIndex <= 8) {
        return NextResponse.json({
          success: false,
          error: 'Collection is excluded from expedition scope (pre-expedition content)'
        }, { status: 404 })
      }
      
      expeditionPhase = getExpeditionPhaseByCollection(collectionIndex)
    }
    
    // Fall back to date-based lookup if collection didn't work
    if (!expeditionPhase) {
      expeditionPhase = getExpeditionPhaseByDate(date)
    }
    
    if (!expeditionPhase) {
      return NextResponse.json({
        success: false,
        error: 'No GPS track found for the specified date'
      }, { status: 404 })
    }

    const phaseConfig = EXPEDITION_COLLECTION_MAPPING[expeditionPhase]
    
    // Find the most relevant track for the date within the phase
    const { data: expeditionTracks, error: tracksError } = await supabase
      .from('expedition_tracks')
      .select('*')
      .in('track_number', phaseConfig.tracks)
      .order('track_number')

    if (tracksError) {
      console.error('Error fetching expedition tracks:', tracksError)
      return NextResponse.json({
        success: false,
        error: 'GPS correlation service error'
      }, { status: 500 })
    }

    if (!expeditionTracks || expeditionTracks.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No GPS track data found for this period'
      }, { status: 404 })
    }

    // Find the best matching track for the specific date
    let bestTrack = expeditionTracks[0]
    let bestDistance = Infinity
    
    for (const track of expeditionTracks) {
      const trackStart = new Date(track.start_date as string)
      const trackEnd = new Date(track.end_date as string)
      
      // Exact match within track date range
      if (targetDate >= trackStart && targetDate <= trackEnd) {
        bestTrack = track
        break
      }
      
      // Find closest track by date distance
      const distanceToStart = Math.abs(targetDate.getTime() - trackStart.getTime())
      const distanceToEnd = Math.abs(targetDate.getTime() - trackEnd.getTime())
      const minDistance = Math.min(distanceToStart, distanceToEnd)
      
      if (minDistance < bestDistance) {
        bestDistance = minDistance
        bestTrack = track
      }
    }

    // Calculate confidence based on date proximity
    const trackStart = new Date(bestTrack.start_date as string)
    const trackEnd = new Date(bestTrack.end_date as string)
    let confidence: 'high' | 'medium' | 'low' = 'low'
    
    if (targetDate >= trackStart && targetDate <= trackEnd) {
      confidence = 'high'
    } else if (bestDistance <= 7 * 24 * 60 * 60 * 1000) { // Within 7 days
      confidence = 'medium'
    }

    const response: GPSTrackResponse = {
      success: true,
      data: {
        track_number: bestTrack.track_number as number,
        track_title: bestTrack.title as string,
        date_range: {
          start: bestTrack.start_date as string,
          end: bestTrack.end_date as string
        },
        expedition_phase: (bestTrack.expedition_phase as string) || expeditionPhase,
        region: (bestTrack.region as string) || phaseConfig.regions[0],
        cities: (bestTrack.cities as string[]) || [],
        regional_tags: phaseConfig.regions.map(regionName => 
          createTag(regionName, 'regional', 'gps', confidence === 'high' ? 1.0 : confidence === 'medium' ? 0.8 : 0.6)
        ),
        classification: bestTrack.classification as 'moving' | 'rest',
        distance_km: bestTrack.distance_km ? parseFloat(bestTrack.distance_km as string) : undefined,
        confidence
      }
    }

    return NextResponse.json(response)

  } catch (error) {
    console.error('GPS track correlation error:', error)
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 })
  }
}