// Vietnam Trip Location Database
// Detailed addresses and place IDs for Sharon's Vietnam trip locations

export interface LocationDetail {
  name: string;
  fullAddress: string;
  placeId?: string;
  coordinates?: {
    lat: number;
    lng: number;
  };
  district?: string;
  city: string;
  country: string;
}

// Ho Chi Minh City (Saigon) locations database
export const VIETNAM_LOCATIONS: { [key: string]: LocationDetail } = {
  // Day 1 - Arrival & District 1
  'Tan Son Nhat Airport (Arrival)': {
    name: 'Tan Son Nhat Airport',
    fullAddress: 'Tan Son Nhat Airport, Truong Son Street, Ward 2, Tan Binh District, Ho Chi Minh City, Vietnam',
    placeId: 'ChIJ4_KiYaAmdTERXGibhagKoRU',
    coordinates: { lat: 10.8186, lng: 106.6524 },
    district: 'Tan Binh',
    city: 'Ho Chi Minh City',
    country: 'Vietnam'
  },

  'District 1 Hotel Area': {
    name: 'District 1 Central Area',
    fullAddress: 'District 1, Ho Chi Minh City, Vietnam',
    placeId: 'ChIJqzLZ6ZAudTERzVzFj4sLZ1I',
    coordinates: { lat: 10.7769, lng: 106.7009 },
    district: 'District 1',
    city: 'Ho Chi Minh City',
    country: 'Vietnam'
  },

  'Notre Dame Cathedral': {
    name: 'Notre Dame Cathedral of Saigon',
    fullAddress: '01 Công xã Paris, Bến Nghé, Quận 1, Thành phố Hồ Chí Minh 70000, Vietnam',
    placeId: 'ChIJUSTY5jcvdTERRVvtbJNZT-g',
    coordinates: { lat: 10.7798, lng: 106.6990 },
    district: 'District 1',
    city: 'Ho Chi Minh City',
    country: 'Vietnam'
  },

  'Central Post Office': {
    name: 'Saigon Central Post Office',
    fullAddress: '125 Hai Ba Trung, District 1, Ho Chi Minh City 70000, Vietnam',
    placeId: 'ChIJRxocgI4udTERspsje3PV-LA',
    coordinates: { lat: 10.7796, lng: 106.6984 },
    district: 'District 1',
    city: 'Ho Chi Minh City',
    country: 'Vietnam'
  },

  'The View Rooftop Bar': {
    name: 'The View Rooftop Bar',
    fullAddress: 'Lotte Center Hanoi, 54 Lieu Giai, Ba Dinh, Hanoi, Vietnam', // Note: This might be incorrect location - needs verification
    coordinates: { lat: 10.7769, lng: 106.7009 },
    district: 'District 1',
    city: 'Ho Chi Minh City',
    country: 'Vietnam'
  },

  // Day 2 - Museums & Culture
  'War Remnants Museum': {
    name: 'War Remnants Museum',
    fullAddress: '28 Vo Van Tan, Ward 6, District 3, Ho Chi Minh City, Vietnam',
    placeId: 'ChIJ-cRjV5IudTERsJOgCJjFdHU',
    coordinates: { lat: 10.7798, lng: 106.6922 },
    district: 'District 3',
    city: 'Ho Chi Minh City',
    country: 'Vietnam'
  },

  'Tan Dinh Church (Pink Church)': {
    name: 'Tan Dinh Church',
    fullAddress: '289 Hai Ba Trung, Ward 8, District 3, Ho Chi Minh City, Vietnam',
    placeId: 'ChIJ8TY4IpgudTERoE6WKWMHJ3Y',
    coordinates: { lat: 10.7886, lng: 106.6847 },
    district: 'District 3',
    city: 'Ho Chi Minh City',
    country: 'Vietnam'
  },

  // Day 3 - Mekong Delta
  'Mekong Delta Region': {
    name: 'Mekong Delta',
    fullAddress: 'Mekong Delta, Can Tho, Vietnam',
    placeId: 'ChIJAbJLK7RHmjER4LzqCJxuFUo',
    coordinates: { lat: 10.0452, lng: 105.7469 },
    city: 'Can Tho',
    country: 'Vietnam'
  },

  // Day 4 - Cu Chi & City Sights
  'Cu Chi District': {
    name: 'Cu Chi Tunnels',
    fullAddress: 'Cu Chi Tunnels, Phu Hiep, Cu Chi, Ho Chi Minh City, Vietnam',
    placeId: 'ChIJa7P1Cs1WdDERpP1bBCkmjko',
    coordinates: { lat: 11.1581, lng: 106.4944 },
    district: 'Cu Chi',
    city: 'Ho Chi Minh City',
    country: 'Vietnam'
  },

  'Reunification Palace': {
    name: 'Independence Palace',
    fullAddress: '135 Nam Ky Khoi Nghia, District 1, Ho Chi Minh City, Vietnam',
    placeId: 'ChIJ4_YQdZAudTERLYqSoKjKa5Q',
    coordinates: { lat: 10.7768, lng: 106.6955 },
    district: 'District 1',
    city: 'Ho Chi Minh City',
    country: 'Vietnam'
  },

  'Ben Thanh Market': {
    name: 'Ben Thanh Market',
    fullAddress: 'Ben Thanh Market, Le Lai, District 1, Ho Chi Minh City, Vietnam',
    placeId: 'ChIJ-X3aJpAudTERRkLnr4uJoJs',
    coordinates: { lat: 10.7724, lng: 106.6980 },
    district: 'District 1',
    city: 'Ho Chi Minh City',
    country: 'Vietnam'
  },

  'Ben Thanh Night Market Area': {
    name: 'Ben Thanh Night Market',
    fullAddress: 'Nguyen Hue Walking Street, District 1, Ho Chi Minh City, Vietnam',
    coordinates: { lat: 10.7740, lng: 106.7010 },
    district: 'District 1',
    city: 'Ho Chi Minh City',
    country: 'Vietnam'
  },

  // Day 5 - Relaxation & Farewell
  'Apartment Cafes Building': {
    name: 'Apartment Coffee Building',
    fullAddress: '42 Nguyen Hue, District 1, Ho Chi Minh City, Vietnam',
    coordinates: { lat: 10.7740, lng: 106.7003 },
    district: 'District 1',
    city: 'Ho Chi Minh City',
    country: 'Vietnam'
  },

  'The Secret Garden': {
    name: 'Secret Garden Restaurant',
    fullAddress: '158 Bis Pasteur, District 1, Ho Chi Minh City, Vietnam',
    coordinates: { lat: 10.7731, lng: 106.6924 },
    district: 'District 1',
    city: 'Ho Chi Minh City',
    country: 'Vietnam'
  },

  'Anan Saigon': {
    name: 'Anan Saigon Restaurant',
    fullAddress: '89 Ton That Dam, District 1, Ho Chi Minh City, Vietnam',
    placeId: 'ChIJffeVmJIudTER5YzGJqzThJE',
    coordinates: { lat: 10.7734, lng: 106.6920 },
    district: 'District 1',
    city: 'Ho Chi Minh City',
    country: 'Vietnam'
  },

  // Day 6 - Departure
  'Tan Son Nhat Airport (Departure)': {
    name: 'Tan Son Nhat Airport',
    fullAddress: 'Tan Son Nhat Airport, Truong Son Street, Ward 2, Tan Binh District, Ho Chi Minh City, Vietnam',
    placeId: 'ChIJ4_KiYaAmdTERXGibhagKoRU',
    coordinates: { lat: 10.8186, lng: 106.6524 },
    district: 'Tan Binh',
    city: 'Ho Chi Minh City',
    country: 'Vietnam'
  }
};

/**
 * Get detailed location information by name
 */
export function getLocationDetails(locationName: string): LocationDetail | null {
  return VIETNAM_LOCATIONS[locationName] || null;
}

/**
 * Generate improved Google Maps directions URL with detailed addresses and place IDs
 */
export function generateImprovedDirectionsUrl(
  originName: string,
  destinationName: string,
  useDetailed: boolean = true,
  travelMode: 'driving' | 'walking' | 'bicycling' | 'transit' = 'walking'
): string {
  const originLocation = getLocationDetails(originName);
  const destinationLocation = getLocationDetails(destinationName);

  // Fallback to simple names if location details not found
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

  if (useDetailed) {
    // Option A: Use Place IDs when available (most accurate)
    if (originLocation.placeId && destinationLocation.placeId) {
      params.set('origin', originLocation.name);
      params.set('origin_place_id', originLocation.placeId);
      params.set('destination', destinationLocation.name);
      params.set('destination_place_id', destinationLocation.placeId);
    } else {
      // Option B: Use detailed addresses (fallback)
      params.set('origin', originLocation.fullAddress);
      params.set('destination', destinationLocation.fullAddress);
    }
  } else {
    // Simple version with just location names
    params.set('origin', originLocation.name);
    params.set('destination', destinationLocation.name);
  }

  return `${baseUrl}?${params.toString()}`;
}

/**
 * Generate walking time estimates between locations (simplified)
 */
export function estimateWalkingTime(originName: string, destinationName: string): string {
  const originLocation = getLocationDetails(originName);
  const destinationLocation = getLocationDetails(destinationName);

  if (!originLocation?.coordinates || !destinationLocation?.coordinates) {
    return '~15 min';
  }

  // Simple distance calculation (not accurate for real use, but good for demo)
  const latDiff = Math.abs(originLocation.coordinates.lat - destinationLocation.coordinates.lat);
  const lngDiff = Math.abs(originLocation.coordinates.lng - destinationLocation.coordinates.lng);
  const roughDistance = Math.sqrt(latDiff * latDiff + lngDiff * lngDiff);

  // Convert to approximate walking time (very rough estimate)
  const minutes = Math.max(3, Math.round(roughDistance * 1000)); // Rough conversion
  const distance = (roughDistance * 100).toFixed(2); // Rough km estimate

  return `${minutes} min • ${distance} km`;
}