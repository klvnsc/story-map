import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { generateImprovedDirectionsUrl, estimateWalkingTime } from '@/lib/vietnam-locations';
import { enhancedLocationLookup, GooglePlaceResult } from '@/lib/google-places';

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

// Estimate walking time based on distance
function estimateWalkingTimeFromDistance(distanceKm: number): string {
  const walkingSpeedKmh = 5; // Average walking speed
  const timeHours = distanceKm / walkingSpeedKmh;
  const timeMinutes = Math.round(timeHours * 60);
  return `${timeMinutes} min • ${distanceKm.toFixed(2)} km`;
}

// Estimate driving time based on distance
function estimateDrivingTimeFromDistance(distanceKm: number): string {
  const drivingSpeedKmh = 30; // Average city driving speed in Ho Chi Minh City
  const timeHours = distanceKm / drivingSpeedKmh;
  const timeMinutes = Math.round(timeHours * 60);
  return `${timeMinutes} min • ${distanceKm.toFixed(2)} km`;
}

export interface Location {
  name: string;
  sequence: number;
  dayNumber: number;
  directionsUrl?: string;
  walkingTime?: string;
  travelMode?: 'walking' | 'driving';
  coordinates?: {
    lat: number;
    lng: number;
  };
  placeId?: string;
  formattedAddress?: string;
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
  let previousPlaceData: GooglePlaceResult | null = null;

  for (const day of days) {
    for (const location of day.locations) {
      if (previousLocation) {
        // Look up current location using Google Places API
        const currentPlaceData = await enhancedLocationLookup(location.name);

        if (currentPlaceData && previousPlaceData) {
          // Use correct Google Maps API format with Place IDs
          const originPlaceId = previousPlaceData.placeId;
          const destPlaceId = currentPlaceData.placeId;
          // Use simple names instead of formatted addresses for better compatibility
          const originName = encodeURIComponent(previousPlaceData.name || previousLocation.name);
          const destName = encodeURIComponent(currentPlaceData.name || location.name);

          // Calculate distance to determine best travel mode
          const distance = calculateDistance(
            previousPlaceData.coordinates.lat,
            previousPlaceData.coordinates.lng,
            currentPlaceData.coordinates.lat,
            currentPlaceData.coordinates.lng
          );

          // Choose appropriate travel mode based on distance
          // Walking: < 2km, Driving: >= 2km (for practical transportation)
          const travelMode = distance < 2.0 ? 'walking' : 'driving';

          // Use working Google Maps URL format with smart travel mode
          location.directionsUrl = `https://www.google.com/maps/dir/?api=1&origin_place_id=${originPlaceId}&origin=${originName}&destination=${destName}&destination_place_id=${destPlaceId}&travelmode=${travelMode}`;

          // Store travel mode and generate travel time
          location.travelMode = travelMode;
          location.walkingTime = travelMode === 'walking'
            ? estimateWalkingTimeFromDistance(distance)
            : estimateDrivingTimeFromDistance(distance);

        } else {
          // Fallback to static database method
          location.directionsUrl = generateImprovedDirectionsUrl(
            previousLocation.name,
            location.name,
            true,
            'walking'
          );

          // Use static estimate as fallback
          location.walkingTime = estimateWalkingTime(previousLocation.name, location.name);
        }

        // Store Google Places coordinates and metadata if available
        if (currentPlaceData) {
          location.coordinates = currentPlaceData.coordinates;
          location.placeId = currentPlaceData.placeId;
          location.formattedAddress = currentPlaceData.formattedAddress;
        }

        // Store current place data for next iteration
        previousPlaceData = currentPlaceData;
      } else {
        // First location - just look it up for next iteration
        previousPlaceData = await enhancedLocationLookup(location.name);

        // Store Google Places coordinates and metadata for first location too
        if (previousPlaceData) {
          location.coordinates = previousPlaceData.coordinates;
          location.placeId = previousPlaceData.placeId;
          location.formattedAddress = previousPlaceData.formattedAddress;
        }
      }

      previousLocation = location;
    }
  }
}

export async function GET() {
  try {
    const filePath = path.join(process.cwd(), 'data', 'sharon-trip.txt');
    const fileContent = await fs.readFile(filePath, 'utf-8');

    const lines = fileContent.split('\n').map(line => line.trim()).filter(line => line);
    const days: TripDay[] = [];
    let currentDay: TripDay | null = null;
    let locationSequence = 1;

    for (const line of lines) {
      // Check if this is a day header
      const dayMatch = line.match(/^Day (\d+) - (.+)$/);

      if (dayMatch) {
        // Save previous day if it exists
        if (currentDay) {
          days.push(currentDay);
        }

        // Create new day
        const dayNumber = parseInt(dayMatch[1]);
        const dateAndDescription = dayMatch[2];

        currentDay = {
          dayNumber,
          date: dateAndDescription,
          description: dateAndDescription,
          locations: []
        };

        locationSequence = 1;
      } else {
        // This is a location line
        if (currentDay && line) {
          const location: Location = {
            name: line,
            sequence: locationSequence++,
            dayNumber: currentDay.dayNumber
          };

          currentDay.locations.push(location);
        }
      }
    }

    // Add the last day
    if (currentDay) {
      days.push(currentDay);
    }

    // Generate directions URLs with Google Places API lookup
    await addDirectionsUrls(days);

    const timeline: Timeline = {
      title: "Sharon's Vietnam Trip",
      days,
      totalLocations: days.reduce((total, day) => total + day.locations.length, 0)
    };

    return NextResponse.json({ success: true, data: timeline });

  } catch (error) {
    console.error('Error parsing timeline data:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to parse timeline data' },
      { status: 500 }
    );
  }
}