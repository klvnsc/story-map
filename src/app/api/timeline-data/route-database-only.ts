import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import {
  batchGetLocationDetailsFromDb,
  generateEnhancedDirectionsUrl
} from '@/lib/timeline-locations-db';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Database-only timeline API (no more static data)

interface TimelineLocationDB {
  id: string;
  name: string;
  coordinates: { lat: number; lng: number };
  timeline_day_number: number;
  timeline_sequence: number;
  is_timeline_location: boolean;
  place_id?: string;
  formatted_address?: string;
  place_name?: string;
  is_place_id_validated: boolean;
  created_at: string;
  updated_at: string;
}

export interface Location {
  name: string;
  sequence: number;
  dayNumber: number;
  directionsUrl?: string;
  walkingTime?: string;
  travelMode?: 'walking' | 'driving';
}

export interface TripDay {
  dayNumber: number;
  date: string;
  description: string;
  locations: Location[];
}

export interface Timeline {
  title: string;
  days: TripDay[];
  totalLocations: number;
}

// Enhanced directions URL generation with Google Places API lookup
async function addDirectionsUrls(days: TripDay[]): Promise<void> {
  let previousLocation: Location | null = null;

  // Collect all unique location names for batch database lookup
  const locationNames = days
    .flatMap(day => day.locations)
    .map(location => location.name);
  const uniqueNames = Array.from(new Set(locationNames));

  // Batch fetch location data from database
  const locationDetailsMap = await batchGetLocationDetailsFromDb(uniqueNames);

  for (const day of days) {
    for (const location of day.locations) {
      if (previousLocation) {
        try {
          // Use enhanced database-backed directions URL generation
          location.directionsUrl = await generateEnhancedDirectionsUrl(
            previousLocation.name,
            location.name,
            'walking'
          );

          // Calculate distance for travel time if coordinates available
          const prevLocationDetails = locationDetailsMap.get(previousLocation.name);
          const currentLocationDetails = locationDetailsMap.get(location.name);

          if (prevLocationDetails?.coordinates && currentLocationDetails?.coordinates) {
            // Calculate distance using Haversine formula
            const distance = calculateDistance(
              prevLocationDetails.coordinates.lat,
              prevLocationDetails.coordinates.lng,
              currentLocationDetails.coordinates.lat,
              currentLocationDetails.coordinates.lng
            );

            // Determine travel mode and time based on distance
            const travelMode = distance < 2.0 ? 'walking' : 'driving';
            location.travelMode = travelMode;

            const timeHours = distance / (travelMode === 'walking' ? 5 : 30); // 5kmh walking, 30kmh driving
            const timeMinutes = Math.round(timeHours * 60);
            location.walkingTime = `${timeMinutes} min • ${distance.toFixed(2)} km`;
          } else {
            // Fallback to default estimate
            location.walkingTime = '~15 min';
            location.travelMode = 'walking';
          }

        } catch (error) {
          console.error('Error generating enhanced directions:', error);

          // Fallback to simple directions URL
          const baseUrl = 'https://www.google.com/maps/dir/';
          const params = new URLSearchParams({
            api: '1',
            origin: previousLocation.name,
            destination: location.name,
            travelmode: 'walking'
          });
          location.directionsUrl = `${baseUrl}?${params.toString()}`;
          location.walkingTime = '~15 min';
          location.travelMode = 'walking';
        }
      }

      previousLocation = location;
    }
  }
}

// Calculate distance between two coordinates using Haversine formula
function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371; // Earth's radius in kilometers
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a =
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng/2) * Math.sin(dLng/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  const distance = R * c;
  return distance;
}

// Day descriptions for Sharon's Vietnam trip
const DAY_DESCRIPTIONS = {
  1: "Friday, Sept 26 (Arrival & District 1)",
  2: "Saturday, Sept 27 (Museums & Culture)",
  3: "Sunday, Sept 28 (Mekong Delta Tour)",
  4: "Monday, Sept 29 (Cu Chi & City Sights)",
  5: "Tuesday, Sept 30 (Relaxation & Farewell)",
  6: "Wednesday, Oct 1 (Departure)"
};

export async function GET() {
  try {
    console.log('Loading timeline data from database only');

    // Fetch all timeline locations from database
    const { data: timelineLocations, error } = await supabase
      .from('timeline_locations')
      .select('*')
      .eq('is_timeline_location', true)
      .order('timeline_day_number', { ascending: true })
      .order('timeline_sequence', { ascending: true });

    if (error) {
      console.error('Error fetching timeline locations:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch timeline locations' },
        { status: 500 }
      );
    }

    if (!timelineLocations || timelineLocations.length === 0) {
      console.log('No timeline locations found in database');
      return NextResponse.json(
        { success: false, error: 'No timeline locations found' },
        { status: 404 }
      );
    }

    // Group locations by day
    const locationsByDay = new Map<number, TimelineLocationDB[]>();
    timelineLocations.forEach(loc => {
      const dayNum = loc.timeline_day_number;
      if (!locationsByDay.has(dayNum)) {
        locationsByDay.set(dayNum, []);
      }
      locationsByDay.get(dayNum)!.push(loc);
    });

    // Create days array from database data
    const days: TripDay[] = [];
    const dayNumbers = Array.from(locationsByDay.keys()).sort((a, b) => a - b);

    for (const dayNumber of dayNumbers) {
      const dayLocations = locationsByDay.get(dayNumber) || [];

      const locations: Location[] = dayLocations.map(dbLoc => ({
        name: dbLoc.name,
        sequence: dbLoc.timeline_sequence,
        dayNumber: dayNumber
      }));

      const day: TripDay = {
        dayNumber,
        date: DAY_DESCRIPTIONS[dayNumber as keyof typeof DAY_DESCRIPTIONS] || `Day ${dayNumber}`,
        description: DAY_DESCRIPTIONS[dayNumber as keyof typeof DAY_DESCRIPTIONS] || `Day ${dayNumber}`,
        locations
      };

      days.push(day);
    }

    // Generate directions URLs with Google Places API lookup
    await addDirectionsUrls(days);

    const timeline: Timeline = {
      title: "Sharon's Vietnam Trip",
      days,
      totalLocations: timelineLocations.length
    };

    return NextResponse.json({ success: true, data: timeline });

  } catch (error) {
    console.error('Error loading timeline data:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to load timeline data' },
      { status: 500 }
    );
  }
}