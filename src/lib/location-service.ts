// Timeline Location Service
// Client-side API interaction layer for location management

import {
  TimelineLocation,
  CreateTimelineLocationRequest,
  UpdateTimelineLocationRequest,
  ValidatePlaceIdRequest,
  LocationsApiResponse,
  LocationApiResponse,
  ValidationApiResponse,
  GooglePlaceResult
} from '@/types/timeline-locations';

class LocationService {
  private baseUrl = '/api/locations';

  /**
   * Fetch all timeline locations
   */
  async getAllLocations(): Promise<TimelineLocation[]> {
    try {
      const response = await fetch(this.baseUrl);
      const result: LocationsApiResponse = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch locations');
      }

      return result.data || [];
    } catch (error) {
      console.error('Error fetching locations:', error);
      throw new Error('Failed to fetch locations');
    }
  }

  /**
   * Get a specific timeline location by ID
   */
  async getLocationById(id: string): Promise<TimelineLocation> {
    try {
      const response = await fetch(`${this.baseUrl}/${id}`);
      const result: LocationApiResponse = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch location');
      }

      if (!result.data) {
        throw new Error('Location not found');
      }

      return result.data;
    } catch (error) {
      console.error('Error fetching location:', error);
      throw new Error('Failed to fetch location');
    }
  }

  /**
   * Create a new timeline location
   */
  async createLocation(locationData: CreateTimelineLocationRequest): Promise<TimelineLocation> {
    try {
      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(locationData),
      });

      const result: LocationApiResponse = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to create location');
      }

      if (!result.data) {
        throw new Error('Failed to create location - no data returned');
      }

      return result.data;
    } catch (error) {
      console.error('Error creating location:', error);
      throw new Error('Failed to create location');
    }
  }

  /**
   * Update an existing timeline location
   */
  async updateLocation(id: string, locationData: UpdateTimelineLocationRequest): Promise<TimelineLocation> {
    try {
      const response = await fetch(`${this.baseUrl}/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(locationData),
      });

      const result: LocationApiResponse = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to update location');
      }

      if (!result.data) {
        throw new Error('Failed to update location - no data returned');
      }

      return result.data;
    } catch (error) {
      console.error('Error updating location:', error);
      throw new Error('Failed to update location');
    }
  }

  /**
   * Validate a place name using Google Places API and update the location
   */
  async validatePlaceId(locationId: string, placeName: string): Promise<GooglePlaceResult | null> {
    try {
      const requestData: ValidatePlaceIdRequest = {
        locationId,
        placeName
      };

      const response = await fetch(`${this.baseUrl}/validate-place-id`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData),
      });

      const result: ValidationApiResponse = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to validate place ID');
      }

      if (!result.data) {
        throw new Error('Failed to validate place ID - no data returned');
      }

      if (!result.data.valid) {
        console.warn('Place validation failed:', result.data.error);
        return null;
      }

      return result.data.placeData || null;
    } catch (error) {
      console.error('Error validating place ID:', error);
      throw new Error('Failed to validate place ID');
    }
  }

  /**
   * Mark a location as an area (no Place ID validation needed)
   */
  async markAsArea(locationId: string): Promise<TimelineLocation> {
    try {
      const updateData: UpdateTimelineLocationRequest = {
        is_place_id_validated: false,
        place_id: undefined,
        formatted_address: undefined
      };

      return await this.updateLocation(locationId, updateData);
    } catch (error) {
      console.error('Error marking location as area:', error);
      throw new Error('Failed to mark location as area');
    }
  }

  /**
   * Get locations by name (for timeline data lookup)
   */
  async getLocationByName(name: string): Promise<TimelineLocation | null> {
    try {
      const locations = await this.getAllLocations();
      return locations.find(location => location.name === name) || null;
    } catch (error) {
      console.error('Error finding location by name:', error);
      return null;
    }
  }

  /**
   * Bulk get locations by names (for timeline API performance)
   */
  async getLocationsByNames(names: string[]): Promise<Map<string, TimelineLocation>> {
    try {
      const locations = await this.getAllLocations();
      const locationMap = new Map<string, TimelineLocation>();

      locations.forEach(location => {
        if (names.includes(location.name)) {
          locationMap.set(location.name, location);
        }
      });

      return locationMap;
    } catch (error) {
      console.error('Error fetching locations by names:', error);
      return new Map();
    }
  }
}

// Export singleton instance
export const locationService = new LocationService();

// Export class for testing
export { LocationService };