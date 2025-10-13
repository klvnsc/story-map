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
  // 'Tan Son Nhat Airport (Arrival)' - Removed outdated static data, now uses Google Places API
  // Current Place ID: ChIJnZ-oGhEpdTER8ycbqsCc8Ng (from Google Places API)
  // Coordinates: 10.8139, 106.6538

  'District 1': {
    name: 'District 1',
    fullAddress: 'District 1, Ho Chi Minh City, Vietnam',
    placeId: 'ChIJe4jt-TgvdTERiYl2A1ftrRQ',
    coordinates: { lat: 10.7753, lng: 106.7028 },
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

  // 'The View Rooftop Bar' - Removed incorrect static data, now uses Google Places API
  // Correct location: 195 Bùi Viện, Phường Phạm Ngũ Lão, Quận 1, Hồ Chí Minh 700000
  // Place ID: ChIJyf5lrRcvdTER6_Ii1NXfYhg

  // Day 2 - Museums & Culture
  // 'War Remnants Museum' - Removed outdated static data, now uses Google Places API
  // Current Place ID: ChIJzwg3ojAvdTERqnQUK99K2Xw (from Google Places API)

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

  // 'Reunification Palace' - Removed outdated static data, now uses Google Places API
  // Current Place ID: ChIJL0dwVTgvdTERao3t8B1Jhxc (from Google Places API, aka "Independence Palace")

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

  // 'Anan Saigon' - Removed outdated static data, now uses Google Places API
  // Current Place ID: ChIJZ_dpJ0EvdTER5wOl-TLvN-8 (from Google Places API)
  // Address: 89 Tôn Thất Đạm, Bến Nghé, Ho Chi Minh City

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