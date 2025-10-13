import { useState, useCallback } from 'react';
import { TimelineLocation } from '@/types/timeline-locations';

// Interface for timeline-map synchronization state
export interface TimelineMapSyncState {
  selectedLocationId: string | null;
  selectedDayNumber: number | null;
  visibleDays: number[];
  mapCenter: google.maps.LatLngLiteral | null;
  mapZoom: number;
}

// Hook for managing synchronization between timeline and map
export function useTimelineMapSync() {
  const [syncState, setSyncState] = useState<TimelineMapSyncState>({
    selectedLocationId: null,
    selectedDayNumber: null,
    visibleDays: [], // Empty means show all days
    mapCenter: null,
    mapZoom: 12
  });

  // Select a specific location (from timeline click or map marker click)
  const selectLocation = useCallback((locationId: string | null, location?: TimelineLocation) => {
    setSyncState(prev => ({
      ...prev,
      selectedLocationId: locationId,
      selectedDayNumber: location?.timeline_day_number || null,
      mapCenter: location ? {
        lat: location.coordinates.lat,
        lng: location.coordinates.lng
      } : null,
      mapZoom: locationId ? 16 : prev.mapZoom // Zoom in when selecting location
    }));
  }, []);

  // Toggle day visibility
  const toggleDayVisibility = useCallback((dayNumber: number) => {
    setSyncState(prev => {
      const newVisibleDays = prev.visibleDays.includes(dayNumber)
        ? prev.visibleDays.filter(d => d !== dayNumber)
        : [...prev.visibleDays, dayNumber].sort();

      return {
        ...prev,
        visibleDays: newVisibleDays,
        // Clear selection if hiding the selected day
        selectedLocationId: prev.selectedDayNumber === dayNumber && !newVisibleDays.includes(dayNumber)
          ? null
          : prev.selectedLocationId,
        selectedDayNumber: prev.selectedDayNumber === dayNumber && !newVisibleDays.includes(dayNumber)
          ? null
          : prev.selectedDayNumber
      };
    });
  }, []);

  // Set visible days (for expand/collapse all functionality)
  const setVisibleDays = useCallback((dayNumbers: number[]) => {
    setSyncState(prev => ({
      ...prev,
      visibleDays: dayNumbers.sort(),
      // Clear selection if selected day is not visible
      selectedLocationId: prev.selectedDayNumber && !dayNumbers.includes(prev.selectedDayNumber)
        ? null
        : prev.selectedLocationId,
      selectedDayNumber: prev.selectedDayNumber && !dayNumbers.includes(prev.selectedDayNumber)
        ? null
        : prev.selectedDayNumber
    }));
  }, []);

  // Update map viewport (when user manually moves map)
  const updateMapViewport = useCallback((center: google.maps.LatLngLiteral, zoom: number) => {
    setSyncState(prev => ({
      ...prev,
      mapCenter: center,
      mapZoom: zoom
    }));
  }, []);

  // Reset selection
  const clearSelection = useCallback(() => {
    setSyncState(prev => ({
      ...prev,
      selectedLocationId: null,
      selectedDayNumber: null
    }));
  }, []);

  // Reset map to show all locations
  const resetMapView = useCallback(() => {
    setSyncState(prev => ({
      ...prev,
      mapCenter: { lat: 10.8231, lng: 106.6297 }, // Ho Chi Minh City center
      mapZoom: 12,
      selectedLocationId: null,
      selectedDayNumber: null
    }));
  }, []);

  // Get locations that should be visible based on day filter
  const getVisibleLocations = useCallback((allLocations: TimelineLocation[]): TimelineLocation[] => {
    if (syncState.visibleDays.length === 0) return allLocations;
    return allLocations.filter(location =>
      syncState.visibleDays.includes(location.timeline_day_number || 1)
    );
  }, [syncState.visibleDays]);

  // Check if a specific day is expanded/visible
  const isDayVisible = useCallback((dayNumber: number): boolean => {
    return syncState.visibleDays.length === 0 || syncState.visibleDays.includes(dayNumber);
  }, [syncState.visibleDays]);

  // Get all unique day numbers from locations
  const getAllDayNumbers = useCallback((locations: TimelineLocation[]): number[] => {
    const dayNumbers = locations
      .map(location => location.timeline_day_number || 1)
      .filter((day, index, array) => array.indexOf(day) === index)
      .sort();
    return dayNumbers;
  }, []);

  return {
    // State
    syncState,

    // Actions
    selectLocation,
    toggleDayVisibility,
    setVisibleDays,
    updateMapViewport,
    clearSelection,
    resetMapView,

    // Helpers
    getVisibleLocations,
    isDayVisible,
    getAllDayNumbers,

    // Convenience getters
    selectedLocationId: syncState.selectedLocationId,
    selectedDayNumber: syncState.selectedDayNumber,
    visibleDays: syncState.visibleDays,
    mapCenter: syncState.mapCenter,
    mapZoom: syncState.mapZoom
  };
}

// Custom hook for handling timeline day expansion state
export function useTimelineDayExpansion(allDayNumbers: number[]) {
  const [expandedDays, setExpandedDays] = useState<Set<number>>(new Set([1])); // First day expanded by default

  const toggleDay = useCallback((dayNumber: number) => {
    setExpandedDays(prev => {
      const newExpanded = new Set(prev);
      if (newExpanded.has(dayNumber)) {
        newExpanded.delete(dayNumber);
      } else {
        newExpanded.add(dayNumber);
      }
      return newExpanded;
    });
  }, []);

  const expandAll = useCallback(() => {
    setExpandedDays(new Set(allDayNumbers));
  }, [allDayNumbers]);

  const collapseAll = useCallback(() => {
    setExpandedDays(new Set());
  }, []);

  const isExpanded = useCallback((dayNumber: number): boolean => {
    return expandedDays.has(dayNumber);
  }, [expandedDays]);

  return {
    expandedDays,
    toggleDay,
    expandAll,
    collapseAll,
    isExpanded,
    expandedCount: expandedDays.size
  };
}