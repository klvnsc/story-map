'use client';

import { useState, useMemo, useCallback } from 'react';
import { Timeline, TripDay, Location } from '@/lib/timeline-data';
import { TimelineLocation } from '@/types/timeline-locations';
import TimelineView from '@/components/TimelineView';
import { GoogleTimelineMap } from '@/components/GoogleTimelineMap';

interface TimelineMapLayoutProps {
  timeline: Timeline;
  isMapVisible?: boolean;
}

// Convert timeline Location to TimelineLocation for Google Maps
function convertTimelineDataToMapLocations(timeline: Timeline): TimelineLocation[] {
  const locations: TimelineLocation[] = [];

  timeline.days.forEach((day: TripDay) => {
    day.locations.forEach((location: Location) => {
      // Generate a unique ID for each location
      const id = `day-${day.dayNumber}-location-${location.sequence}`;

      // Use real Google Places coordinates when available, fallback to generated coordinates
      let coordinates;
      let placeId = undefined;
      let formattedAddress = undefined;

      if (location.coordinates) {
        // Use real Google Places coordinates from API
        coordinates = location.coordinates;
        placeId = location.placeId;
        formattedAddress = location.formattedAddress;
      } else {
        // Fallback: Generate deterministic coordinates (for locations without Google Places data)
        const hash = (str: string) => {
          let hash = 0;
          for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32-bit integer
          }
          return Math.abs(hash);
        };

        const locationHash = hash(id + location.name);
        const latOffset = ((locationHash % 1000) / 1000 - 0.5) * 0.1; // Range: -0.05 to +0.05
        const lngOffset = (((locationHash >> 10) % 1000) / 1000 - 0.5) * 0.1; // Range: -0.05 to +0.05

        coordinates = {
          lat: 10.8231 + latOffset, // Deterministic coordinates around Ho Chi Minh City
          lng: 106.6297 + lngOffset
        };
      }

      // Create TimelineLocation with real or fallback coordinates
      const timelineLocation: TimelineLocation = {
        id,
        name: location.name,
        coordinates,
        timeline_day_number: day.dayNumber,
        timeline_sequence: location.sequence,
        place_id: placeId,
        formatted_address: formattedAddress,
        is_place_id_validated: !!placeId, // true if Google Places validated the location
        is_timeline_location: true,       // this is a timeline-specific location
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      locations.push(timelineLocation);
    });
  });

  return locations;
}

export default function TimelineMapLayout({ timeline, isMapVisible = true }: TimelineMapLayoutProps) {
  const [selectedLocationId, setSelectedLocationId] = useState<string | null>(null);

  // Convert timeline data to map locations format
  const mapLocations = useMemo(() => {
    console.log('🔥 TimelineMapLayout: Converting timeline data', {
      timelineTitle: timeline.title,
      daysCount: timeline.days.length,
      totalTimelineLocations: timeline.totalLocations
    });

    const converted = convertTimelineDataToMapLocations(timeline);

    console.log('🔥 TimelineMapLayout: Converted to map locations', {
      convertedCount: converted.length,
      firstLocation: converted[0]?.name,
      lastLocation: converted[converted.length - 1]?.name,
      realCoordinatesCount: converted.filter(loc => loc.place_id).length,
      generatedCoordinatesCount: converted.filter(loc => !loc.place_id).length
    });

    return converted;
  }, [timeline]);

  // Handle location selection from map
  const handleLocationSelect = useCallback((locationId: string | null, location?: TimelineLocation) => {
    setSelectedLocationId(locationId);
    console.log('Location selected:', { locationId, location });
  }, []);

  return (
    <div className="h-full">
      {/* Clean Layout - No Headers, Maximum Space */}
      <div className="flex gap-4 h-full">
        {/* Timeline Panel (Left) */}
        <div className={`${!isMapVisible ? 'w-full' : 'w-2/5'} transition-all duration-300 overflow-hidden`}>
          <div className="h-full overflow-y-auto">
            <TimelineView timeline={timeline} />
          </div>
        </div>

        {/* Map Panel (Right) */}
        {isMapVisible && (
          <div className="w-3/5 transition-all duration-300">
            <div className="h-full border border-gray-200 rounded-lg overflow-hidden">
              <GoogleTimelineMap
                locations={mapLocations}
                className="h-full"
                onLocationSelect={handleLocationSelect}
              />
            </div>
          </div>
        )}
      </div>

      {/* Debug Information (Development Only) */}
      {process.env.NODE_ENV === 'development' && (
        <div className="mt-4 p-3 bg-gray-50 border border-gray-200 rounded text-xs text-gray-600">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <strong>Timeline Stats:</strong> {timeline.days.length} days, {timeline.totalLocations} locations
            </div>
            <div>
              <strong>Map Locations:</strong> {mapLocations.length} converted locations
            </div>
            <div>
              <strong>Selected:</strong> {selectedLocationId || 'None'}
            </div>
            <div>
              <strong>Map State:</strong> {isMapVisible ? 'Visible' : 'Hidden'}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}