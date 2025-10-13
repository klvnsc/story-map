// Timeline Locations Database Service
// Server-side database lookup for timeline API integration

import { createClient } from '@supabase/supabase-js';
import { TimelineLocation } from '@/types/timeline-locations';

// Interface for timeline locations compatible with directions API
export interface LocationDetail {
  name: string;
  fullAddress: string;
  placeId?: string;
  coordinates?: { lat: number; lng: number; };
  city: string;
  country: string;
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

/**
 * Get location details from database by name
 */
export async function getLocationDetailsFromDb(locationName: string): Promise<LocationDetail | null> {
  try {
    const { data: dbLocation, error } = await supabase
      .from('timeline_locations')
      .select('*')
      .eq('name', locationName)
      .single();

    if (!error && dbLocation) {
      // Convert database location to LocationDetail format
      const locationDetail: LocationDetail = {
        name: dbLocation.place_name || dbLocation.name,
        fullAddress: dbLocation.formatted_address || `${dbLocation.name}, Vietnam`,
        placeId: dbLocation.place_id || undefined,
        coordinates: dbLocation.coordinates ? {
          lat: dbLocation.coordinates.lat,
          lng: dbLocation.coordinates.lng
        } : undefined,
        city: 'Ho Chi Minh City', // Default for Vietnam locations
        country: 'Vietnam'
      };

      return locationDetail;
    }

    return null;

  } catch (error) {
    console.error('Database lookup failed for location:', locationName, error);
    return null;
  }
}

/**
 * Batch lookup locations from database
 * Optimized for timeline API performance
 */
export async function batchGetLocationDetailsFromDb(locationNames: string[]): Promise<Map<string, LocationDetail>> {
  const locationMap = new Map<string, LocationDetail>();

  try {
    // Batch query database
    const { data: dbLocations, error } = await supabase
      .from('timeline_locations')
      .select('*')
      .in('name', locationNames);

    if (!error && dbLocations) {
      // Convert database results to LocationDetail format
      dbLocations.forEach(dbLocation => {
        const locationDetail: LocationDetail = {
          name: dbLocation.place_name || dbLocation.name,
          fullAddress: dbLocation.formatted_address || `${dbLocation.name}, Vietnam`,
          placeId: dbLocation.place_id || undefined,
          coordinates: dbLocation.coordinates ? {
            lat: dbLocation.coordinates.lat,
            lng: dbLocation.coordinates.lng
          } : undefined,
          city: 'Ho Chi Minh City',
          country: 'Vietnam'
        };

        locationMap.set(dbLocation.name, locationDetail);
      });
    }

    return locationMap;

  } catch (error) {
    console.error('Batch database lookup failed:', error);
    return locationMap;
  }
}

/**
 * Get enhanced directions URL using database location data
 */
export async function generateEnhancedDirectionsUrl(
  originName: string,
  destinationName: string,
  travelMode: 'driving' | 'walking' | 'bicycling' | 'transit' = 'walking'
): Promise<string> {
  try {
    // Get both locations from database
    const [originLocation, destinationLocation] = await Promise.all([
      getLocationDetailsFromDb(originName),
      getLocationDetailsFromDb(destinationName)
    ]);

    // If we don't have both locations, fallback to simple URL
    if (!originLocation || !destinationLocation) {
      const baseUrl = 'https://www.google.com/maps/dir/';
      const params = new URLSearchParams({
        api: '1',
        origin: originName,
        destination: destinationName,
        travelmode: travelMode
      });
      return `${baseUrl}?${params.toString()}`;
    }

    const baseUrl = 'https://www.google.com/maps/dir/';
    const params = new URLSearchParams();

    params.set('api', '1');
    params.set('travelmode', travelMode);

    // Use Place IDs when available (better human readability)
    if (originLocation.placeId && destinationLocation.placeId) {
      params.set('origin_place_id', originLocation.placeId);
      params.set('destination_place_id', destinationLocation.placeId);
      // Include readable names for better UX
      params.set('origin', originLocation.name);
      params.set('destination', destinationLocation.name);
    } else if (originLocation.coordinates && destinationLocation.coordinates) {
      // Fallback to coordinates (more reliable but less readable)
      params.set('origin', `${originLocation.coordinates.lat},${originLocation.coordinates.lng}`);
      params.set('destination', `${destinationLocation.coordinates.lat},${destinationLocation.coordinates.lng}`);
    } else {
      // Final fallback to addresses
      params.set('origin', originLocation.fullAddress);
      params.set('destination', destinationLocation.fullAddress);
    }

    return `${baseUrl}?${params.toString()}`;

  } catch (error) {
    console.error('Enhanced directions URL generation failed:', error);

    // Final fallback to simple URL
    const baseUrl = 'https://www.google.com/maps/dir/';
    const params = new URLSearchParams({
      api: '1',
      origin: originName,
      destination: destinationName,
      travelmode: travelMode
    });
    return `${baseUrl}?${params.toString()}`;
  }
}

/**
 * Get database location for validation status
 * Used for timeline visual indicators
 */
export async function getTimelineLocationFromDb(locationName: string): Promise<TimelineLocation | null> {
  try {
    const { data: dbLocation, error } = await supabase
      .from('timeline_locations')
      .select('*')
      .eq('name', locationName)
      .single();

    if (!error && dbLocation) {
      return {
        id: dbLocation.id,
        name: dbLocation.name,
        coordinates: dbLocation.coordinates,
        place_id: dbLocation.place_id,
        formatted_address: dbLocation.formatted_address,
        place_name: dbLocation.place_name,
        is_place_id_validated: dbLocation.is_place_id_validated,
        is_timeline_location: dbLocation.is_timeline_location,
        created_at: dbLocation.created_at,
        updated_at: dbLocation.updated_at
      };
    }

    return null;
  } catch (error) {
    console.error('Failed to get timeline location from database:', locationName, error);
    return null;
  }
}