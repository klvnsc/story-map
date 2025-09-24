import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

export interface Location {
  name: string;
  sequence: number;
  dayNumber: number;
  directionsUrl?: string;
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

function generateDirectionsUrl(origin: string, destination: string): string {
  const baseUrl = 'https://maps.google.com/directions/';
  const params = new URLSearchParams({
    api: '1',
    origin: origin,
    destination: destination,
    travelmode: 'walking'
  });

  return `${baseUrl}?${params.toString()}`;
}

function addDirectionsUrls(days: TripDay[]): void {
  let previousLocation: Location | null = null;

  for (const day of days) {
    for (const location of day.locations) {
      if (previousLocation) {
        location.directionsUrl = generateDirectionsUrl(previousLocation.name, location.name);
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

    // Generate directions URLs
    addDirectionsUrls(days);

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