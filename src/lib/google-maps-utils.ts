// Google Maps utilities for timeline integration
import { TimelineLocation } from '@/types/timeline-locations';

// Day-based color scheme for markers
export const DAY_COLORS = {
  1: '#3B82F6', // Blue
  2: '#10B981', // Emerald
  3: '#F59E0B', // Amber
  4: '#EF4444', // Red
  5: '#8B5CF6', // Violet
  6: '#F97316', // Orange
  default: '#6B7280' // Gray
};

// Get color for a specific day number
export function getDayColor(dayNumber: number): string {
  return DAY_COLORS[dayNumber as keyof typeof DAY_COLORS] || DAY_COLORS.default;
}

// Create SVG for numbered marker
export function createNumberedMarkerSVG(number: number, color: string, isSelected = false): string {
  const strokeWidth = isSelected ? 3 : 2;
  const strokeColor = isSelected ? '#1F2937' : '#FFFFFF';

  return `
    <svg width="32" height="40" viewBox="0 0 32 40" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <filter id="shadow" x="-50%" y="-50%" width="200%" height="200%">
          <feDropShadow dx="0" dy="2" stdDeviation="2" flood-opacity="0.3"/>
        </filter>
      </defs>

      <!-- Marker shape -->
      <path d="M16 0C7.163 0 0 7.163 0 16c0 8.837 7.163 16 16 16s16-7.163 16-16C32 7.163 24.837 0 16 0z"
            fill="${color}"
            stroke="${strokeColor}"
            stroke-width="${strokeWidth}"
            filter="url(#shadow)"/>

      <!-- Pointer -->
      <path d="M16 32l-4-8h8l-4 8z"
            fill="${color}"
            stroke="${strokeColor}"
            stroke-width="${strokeWidth}"/>

      <!-- Number text -->
      <text x="16" y="20"
            text-anchor="middle"
            dominant-baseline="central"
            fill="white"
            font-family="Arial, sans-serif"
            font-size="${number < 10 ? '14' : '12'}"
            font-weight="bold">
        ${number}
      </text>
    </svg>
  `;
}

// Interface for timeline map marker data
export interface TimelineMapMarker {
  id: string;
  position: google.maps.LatLngLiteral;
  title: string;
  sequence: number;
  dayNumber: number;
  location: TimelineLocation;
  isSelected?: boolean;
}

// Create Google Maps marker from timeline location
export function createTimelineMarker(
  markerData: TimelineMapMarker,
  map: google.maps.Map
): google.maps.Marker {
  const { position, title, sequence, dayNumber, isSelected = false } = markerData;

  const color = getDayColor(dayNumber);
  const svgIcon = createNumberedMarkerSVG(sequence, color, isSelected);

  const marker = new google.maps.Marker({
    position,
    map,
    title,
    icon: {
      url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svgIcon)}`,
      scaledSize: new google.maps.Size(32, 40),
      anchor: new google.maps.Point(16, 40), // Bottom center of marker
      labelOrigin: new google.maps.Point(16, 16)
    },
    animation: google.maps.Animation.DROP,
    optimized: true // Enable optimization for better performance
  });

  return marker;
}

// Create info window content for timeline location
export function createInfoWindowContent(location: TimelineLocation, dayNumber: number, sequence: number): string {
  const dayColor = getDayColor(dayNumber);

  return `
    <div class="p-3 max-w-xs">
      <!-- Header -->
      <div class="flex items-center mb-2">
        <div class="w-6 h-6 rounded-full flex items-center justify-center text-white text-sm font-bold mr-2"
             style="background-color: ${dayColor}">
          ${sequence}
        </div>
        <div class="text-xs text-gray-500">Day ${dayNumber}</div>
      </div>

      <!-- Location name -->
      <h3 class="font-semibold text-gray-900 mb-1">${location.name}</h3>

      <!-- Address if available -->
      ${location.formatted_address ? `
        <p class="text-sm text-gray-600 mb-2">${location.formatted_address}</p>
      ` : ''}

      <!-- Coordinates -->
      <div class="text-xs text-gray-500 mb-3">
        ${location.coordinates.lat.toFixed(6)}, ${location.coordinates.lng.toFixed(6)}
      </div>

      <!-- Actions -->
      <div class="flex space-x-2">
        <button onclick="window.open('https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location.name + ' Ho Chi Minh City')}')"
                class="text-xs bg-blue-500 text-white px-2 py-1 rounded hover:bg-blue-600">
          View in Maps
        </button>
        ${location.place_id ? `
          <button onclick="window.open('https://www.google.com/maps/place/?q=place_id:${location.place_id}')"
                  class="text-xs bg-green-500 text-white px-2 py-1 rounded hover:bg-green-600">
            Place Details
          </button>
        ` : ''}
      </div>
    </div>
  `;
}

// Update marker selection state
export function updateMarkerSelection(
  marker: google.maps.Marker,
  markerData: TimelineMapMarker,
  isSelected: boolean
): void {
  const color = getDayColor(markerData.dayNumber);
  const svgIcon = createNumberedMarkerSVG(markerData.sequence, color, isSelected);

  marker.setIcon({
    url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svgIcon)}`,
    scaledSize: new google.maps.Size(32, 40),
    anchor: new google.maps.Point(16, 40),
    labelOrigin: new google.maps.Point(16, 16)
  });

  // Add bounce animation for selection
  if (isSelected) {
    marker.setAnimation(google.maps.Animation.BOUNCE);
    setTimeout(() => marker.setAnimation(null), 1500); // Stop bouncing after 1.5s
  } else {
    marker.setAnimation(null);
  }
}

// Convert timeline locations to map markers data
export function timelineLocationsToMarkers(
  locations: TimelineLocation[],
  selectedLocationId?: string
): TimelineMapMarker[] {
  // Group locations by day and sort by sequence
  const locationsByDay = locations.reduce((acc, location) => {
    const day = location.timeline_day_number || 1;
    if (!acc[day]) acc[day] = [];
    acc[day].push(location);
    return acc;
  }, {} as Record<number, TimelineLocation[]>);

  // Convert to marker data with proper sequencing
  const markers: TimelineMapMarker[] = [];

  Object.entries(locationsByDay).forEach(([day, dayLocations]: [string, TimelineLocation[]]) => {
    const dayNumber = parseInt(day);

    // Sort by timeline sequence
    dayLocations.sort((a: TimelineLocation, b: TimelineLocation) => (a.timeline_sequence || 0) - (b.timeline_sequence || 0));

    dayLocations.forEach((location: TimelineLocation, index: number) => {
      markers.push({
        id: location.id,
        position: {
          lat: location.coordinates.lat,
          lng: location.coordinates.lng
        },
        title: `Day ${dayNumber}, Stop ${index + 1}: ${location.name}`,
        sequence: index + 1,
        dayNumber,
        location,
        isSelected: location.id === selectedLocationId
      });
    });
  });

  return markers;
}

// Fit map bounds to include all markers with padding
export function fitMapToMarkers(
  map: google.maps.Map,
  markers: google.maps.Marker[],
  padding = 50
): void {
  if (markers.length === 0) return;

  const bounds = new google.maps.LatLngBounds();

  markers.forEach(marker => {
    const position = marker.getPosition();
    if (position) bounds.extend(position);
  });

  map.fitBounds(bounds, padding);

  // Set minimum zoom for single marker
  if (markers.length === 1) {
    map.setZoom(Math.max(map.getZoom() || 15, 15));
  }
}

// Filter markers by day
export function filterMarkersByDay(
  allMarkers: TimelineMapMarker[],
  visibleDays: number[]
): TimelineMapMarker[] {
  if (visibleDays.length === 0) return allMarkers;
  return allMarkers.filter(marker => visibleDays.includes(marker.dayNumber));
}