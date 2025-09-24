// Timeline Data Client Utilities
// Client-side utilities for timeline data and export functionality

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

/**
 * Fetch timeline data from API
 */
export async function fetchTimelineData(): Promise<Timeline> {
  try {
    const response = await fetch('/api/timeline-data');

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const result = await response.json();

    if (!result.success) {
      throw new Error(result.error || 'Unknown error');
    }

    return result.data;

  } catch (error) {
    console.error('Error fetching timeline data:', error);
    throw new Error('Failed to fetch timeline data');
  }
}

/**
 * Generate CSV data for Google My Maps export
 */
export function generateCSVExport(timeline: Timeline): string {
  const headers = ['Name', 'Description', 'Day', 'Sequence'];
  const rows = [headers.join(',')];

  for (const day of timeline.days) {
    for (const location of day.locations) {
      const row = [
        `"${location.name}"`,
        `"Day ${day.dayNumber} - ${day.date}"`,
        day.dayNumber.toString(),
        location.sequence.toString()
      ];
      rows.push(row.join(','));
    }
  }

  return rows.join('\n');
}

/**
 * Generate KML data for Google My Maps export
 */
export function generateKMLExport(timeline: Timeline): string {
  const kmlHeader = `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <name>${timeline.title}</name>
    <description>Vietnam trip itinerary</description>`;

  const kmlFooter = `  </Document>
</kml>`;

  let kmlPlacemarks = '';

  for (const day of timeline.days) {
    for (const location of day.locations) {
      kmlPlacemarks += `
    <Placemark>
      <name>${location.name}</name>
      <description>Day ${day.dayNumber} - ${day.date} (Stop #${location.sequence})</description>
      <Point>
        <coordinates>0,0,0</coordinates>
      </Point>
    </Placemark>`;
    }
  }

  return kmlHeader + kmlPlacemarks + kmlFooter;
}