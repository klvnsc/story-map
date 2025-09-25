// Google Places API Integration Service
// Dynamic location lookup with Place ID search and caching

export interface GooglePlaceResult {
  placeId: string;
  name: string;
  formattedAddress: string;
  coordinates: {
    lat: number;
    lng: number;
  };
  types: string[];
  rating?: number;
  priceLevel?: number;
  confidence: 'high' | 'medium' | 'low';
}

export interface PlaceSearchOptions {
  query: string;
  location?: string; // Optional location bias (e.g., "Ho Chi Minh City, Vietnam")
  radius?: number; // Search radius in meters
  language?: string; // Language code (default: 'en')
  region?: string; // Region bias (default: 'vn' for Vietnam)
}

// In-memory cache for API results (reset on server restart)
const placeCache = new Map<string, { result: GooglePlaceResult; timestamp: number }>();
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

/**
 * Generate cache key for consistent caching
 */
function generateCacheKey(options: PlaceSearchOptions): string {
  return `${options.query}_${options.location || ''}_${options.radius || ''}`;
}

/**
 * Check if cached result is still valid
 */
function isCacheValid(timestamp: number): boolean {
  return Date.now() - timestamp < CACHE_DURATION;
}

/**
 * Search for a place using Google Places API Text Search
 */
export async function searchPlace(options: PlaceSearchOptions): Promise<GooglePlaceResult | null> {
  const cacheKey = generateCacheKey(options);

  // Check cache first
  const cached = placeCache.get(cacheKey);
  if (cached && isCacheValid(cached.timestamp)) {
    return cached.result;
  }

  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) {
    console.warn('Google Places API key not configured, skipping API search');
    return null;
  }

  try {
    // Build search query with location bias for Vietnam
    const searchQuery = options.location
      ? `${options.query} in ${options.location}`
      : `${options.query} Ho Chi Minh City Vietnam`; // Default to Ho Chi Minh City

    const params = new URLSearchParams({
      query: searchQuery,
      key: apiKey,
      language: options.language || 'en',
      region: options.region || 'vn'
    });

    // Add location bias if coordinates are available
    if (options.location === 'Ho Chi Minh City, Vietnam') {
      params.set('location', '10.7769,106.7009'); // Ho Chi Minh City center
      params.set('radius', (options.radius || 50000).toString()); // 50km default
    }

    const url = `https://maps.googleapis.com/maps/api/place/textsearch/json?${params.toString()}`;
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Google Places API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    if (data.status !== 'OK') {
      console.warn(`Google Places API status: ${data.status} - ${data.error_message || 'No details'}`);
      return null;
    }

    if (!data.results || data.results.length === 0) {
      console.warn(`No results found for: ${searchQuery}`);
      return null;
    }

    // Get the best result (first result is usually most relevant)
    const place = data.results[0];

    // Determine confidence based on result quality
    let confidence: 'high' | 'medium' | 'low' = 'medium';
    if (place.rating && place.rating >= 4.0) {
      confidence = 'high';
    } else if (!place.rating || place.user_ratings_total < 10) {
      confidence = 'low';
    }

    const result: GooglePlaceResult = {
      placeId: place.place_id,
      name: place.name,
      formattedAddress: place.formatted_address,
      coordinates: {
        lat: place.geometry.location.lat,
        lng: place.geometry.location.lng
      },
      types: place.types || [],
      rating: place.rating,
      priceLevel: place.price_level,
      confidence
    };

    // Cache the result
    placeCache.set(cacheKey, {
      result,
      timestamp: Date.now()
    });

    return result;

  } catch (error) {
    console.error('Google Places API error:', error);
    return null;
  }
}

/**
 * Enhanced location lookup with static database fallback
 */
export async function enhancedLocationLookup(locationName: string): Promise<GooglePlaceResult | null> {
  // First try static database (for known good results)
  const { getLocationDetails } = await import('./vietnam-locations');
  const staticLocation = getLocationDetails(locationName);

  if (staticLocation?.placeId) {
    // Convert static data to GooglePlaceResult format
    return {
      placeId: staticLocation.placeId,
      name: staticLocation.name,
      formattedAddress: staticLocation.fullAddress,
      coordinates: staticLocation.coordinates || { lat: 0, lng: 0 },
      types: [],
      confidence: 'high' // Static data is considered high confidence
    };
  }

  // Fallback to dynamic Google Places API search
  return await searchPlace({
    query: locationName,
    location: 'Ho Chi Minh City, Vietnam',
    radius: 25000 // 25km search radius
  });
}

/**
 * Batch lookup multiple locations (with rate limiting)
 */
export async function batchLocationLookup(
  locationNames: string[],
  rateLimitMs: number = 100
): Promise<Map<string, GooglePlaceResult | null>> {
  const results = new Map<string, GooglePlaceResult | null>();

  for (let i = 0; i < locationNames.length; i++) {
    const locationName = locationNames[i];

    try {
      const result = await enhancedLocationLookup(locationName);
      results.set(locationName, result);

      // Rate limiting to respect Google Places API limits
      if (i < locationNames.length - 1) {
        await new Promise(resolve => setTimeout(resolve, rateLimitMs));
      }
    } catch (error) {
      console.error(`Failed to lookup "${locationName}":`, error);
      results.set(locationName, null);
    }
  }

  return results;
}

/**
 * Clear the place cache (useful for testing or manual refresh)
 */
export function clearPlaceCache(): void {
  placeCache.clear();
}

/**
 * Get cache statistics
 */
export function getCacheStats(): { size: number; entries: string[] } {
  return {
    size: placeCache.size,
    entries: Array.from(placeCache.keys())
  };
}