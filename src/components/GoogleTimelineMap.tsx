'use client';

import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { useGoogleMapsSimple } from '@/hooks/useGoogleMapsSimple';
import { useTimelineMapSync } from '@/hooks/useTimelineMapSync';
import { TimelineLocation } from '@/types/timeline-locations';
import {
  timelineLocationsToMarkers,
  createTimelineMarker,
  updateMarkerSelection,
  createInfoWindowContent,
  fitMapToMarkers,
  type TimelineMapMarker
} from '@/lib/google-maps-utils';

interface GoogleTimelineMapProps {
  locations: TimelineLocation[];
  className?: string;
  onLocationSelect?: (locationId: string | null, location?: TimelineLocation) => void;
}

export function GoogleTimelineMap({
  locations,
  className = '',
  onLocationSelect
}: GoogleTimelineMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const markersRef = useRef<Map<string, google.maps.Marker>>(new Map());
  const infoWindowRef = useRef<google.maps.InfoWindow | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  // Initialize Google Maps using container ref
  const { map, isLoaded, isError, error } = useGoogleMapsSimple({
    containerRef: mapContainerRef,
    center: { lat: 10.8231, lng: 106.6297 }, // Ho Chi Minh City center
    zoom: 12,
    options: {
      styles: [
        {
          featureType: 'poi',
          elementType: 'labels',
          stylers: [{ visibility: 'on' }]
        }
      ]
    }
  });

  // Timeline-map synchronization
  const {
    syncState,
    selectLocation,
    toggleDayVisibility,
    setVisibleDays,
    updateMapViewport,
    clearSelection,
    resetMapView,
    getVisibleLocations,
    isDayVisible,
    getAllDayNumbers
  } = useTimelineMapSync();

  // Create info window for marker details
  const createInfoWindow = useCallback(() => {
    if (!map || infoWindowRef.current) return;

    infoWindowRef.current = new google.maps.InfoWindow({
      maxWidth: 300,
      pixelOffset: new google.maps.Size(0, -10)
    });
  }, [map]);

  // Handle marker click
  const handleMarkerClick = useCallback((marker: google.maps.Marker, markerData: TimelineMapMarker) => {
    const { location, dayNumber, sequence } = markerData;

    // Update selection state
    selectLocation(location.id, location);

    // Notify parent component
    onLocationSelect?.(location.id, location);

    // Show info window
    if (infoWindowRef.current) {
      const content = createInfoWindowContent(location, dayNumber, sequence);
      infoWindowRef.current.setContent(content);
      infoWindowRef.current.open(map, marker);
    }

    // Center map on selected marker and zoom in for detail view
    const position = marker.getPosition();
    if (position && map) {
      map.panTo(position);

      // Zoom in for detailed view if not already zoomed in enough
      const currentZoom = map.getZoom() || 12;
      const detailZoom = 16; // Street-level detail zoom

      if (currentZoom < detailZoom) {
        console.log(`🔍 Zooming from ${currentZoom} to ${detailZoom} for location: ${location.name}`);
        map.setZoom(detailZoom);
      } else {
        console.log(`🔍 Already zoomed in (${currentZoom}) for location: ${location.name}`);
      }
    }
  }, [map, selectLocation, onLocationSelect]);

  // Create or update markers based on visible locations
  const updateMarkers = useCallback(() => {
    if (!map || !isLoaded) return;

    // Get visible locations based on day filter
    const visibleLocations = getVisibleLocations(locations);
    const markerData = timelineLocationsToMarkers(visibleLocations, syncState.selectedLocationId || undefined);

    // Clear existing markers
    markersRef.current.forEach(marker => marker.setMap(null));
    markersRef.current.clear();

    // Create new markers
    markerData.forEach(data => {
      const marker = createTimelineMarker(data, map);

      // Add click listener
      marker.addListener('click', () => handleMarkerClick(marker, data));

      // Store marker reference
      markersRef.current.set(data.id, marker);
    });

    // Fit map to show all markers if we have any
    const markerArray = Array.from(markersRef.current.values());
    if (markerArray.length > 0) {
      fitMapToMarkers(map, markerArray, 50);
    }

  }, [map, isLoaded, locations, syncState.selectedLocationId, getVisibleLocations, handleMarkerClick]);

  // Update marker selection states
  const updateMarkerSelections = useCallback(() => {
    if (!map || !isLoaded) return;

    const visibleLocations = getVisibleLocations(locations);
    const markerData = timelineLocationsToMarkers(visibleLocations, syncState.selectedLocationId || undefined);

    markerData.forEach(data => {
      const marker = markersRef.current.get(data.id);
      if (marker) {
        updateMarkerSelection(marker, data, data.isSelected || false);
      }
    });
  }, [map, isLoaded, locations, syncState.selectedLocationId, getVisibleLocations]);

  // Initialize map and create info window
  useEffect(() => {
    if (map && isLoaded && !isInitialized) {
      createInfoWindow();
      setIsInitialized(true);
    }
  }, [map, isLoaded, isInitialized, createInfoWindow]);

  // Update markers when locations or visibility changes
  useEffect(() => {
    console.log('🔥 GoogleTimelineMap: Locations effect triggered', {
      isInitialized,
      locationCount: locations.length,
      isLoaded,
      isError
    });

    if (isInitialized) {
      console.log('🔥 GoogleTimelineMap: Updating markers...');
      updateMarkers();
    }
  }, [isInitialized, updateMarkers, locations.length, isLoaded, isError]);

  // Update selection states when selected location changes
  useEffect(() => {
    if (isInitialized) {
      updateMarkerSelections();
    }
  }, [isInitialized, updateMarkerSelections]);

  // Handle map viewport changes
  useEffect(() => {
    if (!map || !isLoaded) return;

    const handleBoundsChanged = () => {
      const center = map.getCenter();
      const zoom = map.getZoom();

      if (center && zoom) {
        updateMapViewport(
          { lat: center.lat(), lng: center.lng() },
          zoom
        );
      }
    };

    const listener = map.addListener('bounds_changed', handleBoundsChanged);

    return () => {
      google.maps.event.removeListener(listener);
    };
  }, [map, isLoaded, updateMapViewport]);

  // Cleanup markers on unmount
  useEffect(() => {
    // Copy ref values to variables inside effect for cleanup
    const markers = markersRef.current;
    const infoWindow = infoWindowRef.current;

    return () => {
      markers.forEach(marker => marker.setMap(null));
      markers.clear();
      if (infoWindow) {
        infoWindow.close();
      }
    };
  }, []); // Intentionally empty - cleanup should only run on unmount

  // Expose control functions for external use
  const mapControls = useMemo(() => ({
    selectLocation,
    toggleDayVisibility,
    setVisibleDays,
    clearSelection,
    resetMapView,
    isDayVisible,
    getAllDayNumbers: () => getAllDayNumbers(locations),
    syncState
  }), [
    selectLocation,
    toggleDayVisibility,
    setVisibleDays,
    clearSelection,
    resetMapView,
    isDayVisible,
    getAllDayNumbers,
    locations,
    syncState
  ]);

  // Add controls to window for external access (development helper)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (window as any).timelineMapControls = mapControls;
    }
  }, [mapControls]);

  return (
    <div className={`relative ${className}`}>
      {/* Status Overlay - Show over map container, not instead of it */}
      {(isError || !isLoaded) && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/95 backdrop-blur-sm rounded-lg">
          {isError ? (
            <div className="text-center p-6">
              <div className="text-red-600 mb-2">⚠️ Map Loading Error</div>
              <div className="text-sm text-red-500 mb-4">{error}</div>
              <button
                onClick={() => window.location.reload()}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 text-sm"
              >
                Retry
              </button>
            </div>
          ) : (
            <div className="text-center p-6">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-3"></div>
              <div className="text-gray-600">Loading Google Maps...</div>
              <div className="text-xs text-gray-500 mt-1">
                {locations.length} locations ready
              </div>
              <div className="text-xs text-gray-400 mt-2">
                This may take 10-30 seconds on first load
              </div>
              <div className="flex space-x-2 mt-4">
                <button
                  onClick={() => window.location.reload()}
                  className="px-3 py-1 text-xs bg-gray-200 hover:bg-gray-300 rounded transition-colors"
                >
                  Reload
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Map Container - Always Rendered */}
      <div
        ref={mapContainerRef}
        className="w-full h-full rounded-lg overflow-hidden"
        style={{ minHeight: '400px' }}
      />

      {/* Map Controls Overlay - Only show when map is loaded */}
      {isLoaded && !isError && (
        <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-sm rounded-lg shadow-lg p-2 space-y-2">
          {/* Reset View Button */}
          <button
            onClick={() => {
              resetMapView();
              // Also fit map to show all markers when resetting
              if (map && markersRef.current.size > 0) {
                const markerArray = Array.from(markersRef.current.values());
                fitMapToMarkers(map, markerArray, 50);
              }
            }}
            className="w-full px-3 py-2 text-xs bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors"
            title="Reset map to show all locations"
          >
            Reset View
          </button>

          {/* Show Day Button */}
          {syncState.selectedDayNumber && (
            <button
              onClick={() => {
                // Filter locations for the selected day
                const dayLocations = locations.filter(loc => loc.timeline_day_number === syncState.selectedDayNumber);
                if (dayLocations.length > 0 && map) {
                  // Get markers for this day
                  const dayMarkers = Array.from(markersRef.current.entries())
                    .filter(([id]) => {
                      const location = locations.find(loc => loc.id === id);
                      return location?.timeline_day_number === syncState.selectedDayNumber;
                    })
                    .map(([, marker]) => marker);

                  if (dayMarkers.length > 0) {
                    console.log(`📍 Showing ${dayMarkers.length} locations for Day ${syncState.selectedDayNumber}`);
                    fitMapToMarkers(map, dayMarkers, 100);
                  }
                }
              }}
              className="w-full px-3 py-2 text-xs bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
              title={`Show all locations for Day ${syncState.selectedDayNumber}`}
            >
              Show Day {syncState.selectedDayNumber}
            </button>
          )}

          {/* Clear Selection Button */}
          {syncState.selectedLocationId && (
            <button
              onClick={clearSelection}
              className="w-full px-3 py-2 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
              title="Clear current selection"
            >
              Clear Selection
            </button>
          )}

          {/* Location Count */}
          <div className="text-xs text-gray-600 text-center pt-1 border-t border-gray-200">
            {markersRef.current.size} locations
          </div>
        </div>
      )}

      {/* Selection Info - Only show when map is loaded */}
      {isLoaded && !isError && syncState.selectedLocationId && (
        <div className="absolute bottom-4 left-4 bg-white/90 backdrop-blur-sm rounded-lg shadow-lg p-3 max-w-xs">
          <div className="text-sm font-medium text-gray-900">
            {locations.find(l => l.id === syncState.selectedLocationId)?.name}
          </div>
          {syncState.selectedDayNumber && (
            <div className="text-xs text-gray-600 mt-1">
              Day {syncState.selectedDayNumber}
            </div>
          )}
        </div>
      )}
    </div>
  );
}