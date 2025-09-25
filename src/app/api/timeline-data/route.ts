import { NextResponse } from 'next/server';
import { generateImprovedDirectionsUrl, estimateWalkingTime } from '@/lib/vietnam-locations';

// Simplified timeline API for reliable deployment

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

  for (const day of days) {
    for (const location of day.locations) {
      if (previousLocation) {
        // Use static database method for now (simplified for production)
        location.directionsUrl = generateImprovedDirectionsUrl(
          previousLocation.name,
          location.name,
          true,
          'walking'
        );

        // Use static estimate
        location.walkingTime = estimateWalkingTime(previousLocation.name, location.name);
        location.travelMode = 'walking';
      }

      previousLocation = location;
    }
  }
}

// Embedded trip data for reliable deployment
const SHARON_TRIP_DATA = `Day 1 - Friday, Sept 26 (Arrival & District 1)

Tan Son Nhat Airport
District 1
Notre Dame Cathedral
Central Post Office
The View Rooftop Bar

Day 2 - Saturday, Sept 27 (Museums & Culture)

War Remnants Museum
Tan Dinh Church (Pink Church)

Day 3 - Sunday, Sept 28 (Mekong Delta Tour)

Mekong Delta Region

Day 4 - Monday, Sept 29 (Cu Chi & City Sights)

Cu Chi District
Reunification Palace
Ben Thanh Market
Ben Thanh Night Market Area

Day 5 - Tuesday, Sept 30 (Relaxation & Farewell)

Apartment Cafes Building
The Secret Garden
Anan Saigon

Day 6 - Wednesday, Oct 1 (Departure)

Tan Son Nhat Airport`;

export async function GET() {
  try {
    console.log('Using embedded trip data for reliability');
    const fileContent = SHARON_TRIP_DATA;

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