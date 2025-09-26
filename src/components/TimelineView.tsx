'use client';

import { useState, useEffect } from 'react';
import { Timeline, TripDay, Location } from '@/lib/timeline-data';
import { TimelineLocation, UpdateTimelineLocationRequest, GooglePlaceResult, CreateTimelineLocationApiRequest } from '@/types/timeline-locations';
import { locationService } from '@/lib/location-service';
import LocationActionsMenu from './LocationActionsMenu';
import LocationEditModal from './LocationEditModal';
import InlineLocationAdd from './InlineLocationAdd';

import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import {
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface TimelineViewProps {
  timeline: Timeline;
}

interface DaySectionProps {
  day: TripDay;
  isExpanded: boolean;
  onToggle: () => void;
  dbLocations: Map<string, TimelineLocation>;
  onLocationUpdated: (locationName: string) => void;
  onStartAddingLocation: (dayNumber: number) => void;
  showingAddLocationFor: number | null;
  onCancelAddLocation: () => void;
  onSaveNewLocation: (newLocation: CreateTimelineLocationApiRequest) => Promise<void>;
}

interface LocationItemProps {
  location: Location & { travelMode?: 'walking' | 'driving' };
  dbLocation?: TimelineLocation;
  onLocationUpdated: (locationName: string) => void;
  onLocationDeleted?: (location: TimelineLocation) => void;
  isDragDisabled?: boolean;
}

function SortableLocationItem({ location, dbLocation, onLocationUpdated, onLocationDeleted, isDragDisabled }: LocationItemProps) {
  const [editingLocation, setEditingLocation] = useState<TimelineLocation | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: dbLocation?.id || `static-${location.name}`, // Only use database ID for sortable items
    disabled: isDragDisabled || !dbLocation // Only allow dragging database locations
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const handleDirectionsClick = () => {
    if (location.directionsUrl) {
      window.open(location.directionsUrl, '_blank');
    }
  };

  const handleEdit = (timelineLocation: TimelineLocation) => {
    setEditingLocation(timelineLocation);
  };

  const handleValidate = async (timelineLocation: TimelineLocation) => {
    if (!timelineLocation.place_name) {
      console.warn('No place name to validate for location:', timelineLocation.name);
      return;
    }

    try {
      await locationService.validatePlaceId(timelineLocation.id, timelineLocation.place_name);
      onLocationUpdated(timelineLocation.name);
    } catch (error) {
      console.error('Failed to validate place ID:', error);
    }
  };

  const handleMarkAsArea = async (timelineLocation: TimelineLocation) => {
    try {
      await locationService.markAsArea(timelineLocation.id);
      onLocationUpdated(timelineLocation.name);
    } catch (error) {
      console.error('Failed to mark as area:', error);
    }
  };

  const handleDelete = async (timelineLocation: TimelineLocation) => {
    if (!confirm(`Are you sure you want to delete "${timelineLocation.name}"? This action cannot be undone.`)) {
      return;
    }

    setIsDeleting(true);
    try {
      // Call API to delete location
      const response = await fetch('/api/locations/timeline', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ locationId: timelineLocation.id }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to delete location');
      }

      // Notify parent component
      if (onLocationDeleted) {
        onLocationDeleted(timelineLocation);
      }
    } catch (error) {
      console.error('Failed to delete location:', error);
      alert(`Failed to delete location: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSaveEdit = async (updateData: UpdateTimelineLocationRequest) => {
    if (!editingLocation) return;

    try {
      await locationService.updateLocation(editingLocation.id, updateData);
      onLocationUpdated(editingLocation.name);
    } catch (error) {
      console.error('Failed to update location:', error);
      throw error;
    }
  };

  const handleValidateInModal = async (placeName: string): Promise<GooglePlaceResult | null> => {
    if (!editingLocation) return null;

    try {
      return await locationService.validatePlaceId(editingLocation.id, placeName);
    } catch (error) {
      console.error('Failed to validate place ID in modal:', error);
      throw error;
    }
  };

  // Determine validation status for visual indicator
  const isValidated = dbLocation?.is_place_id_validated ?? true; // Default to validated if no db location

  return (
    <>
      <div
        ref={setNodeRef}
        style={style}
        className={`flex items-center py-2 ${isDragging ? 'z-10' : ''} ${isDeleting ? 'opacity-50' : ''}`}
      >
        {/* Drag Handle (only for database locations) */}
        {dbLocation && !isDragDisabled && (
          <div
            className="cursor-grab active:cursor-grabbing mr-2 p-1 text-gray-400 hover:text-gray-600"
            {...attributes}
            {...listeners}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
            </svg>
          </div>
        )}

        {/* Numbered Waypoint with validation indicator */}
        <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium mr-4 ${
          isValidated
            ? 'bg-green-500 text-white'                    // Green filled (validated)
            : 'border-2 border-green-500 bg-white text-green-500'  // Green outline (unvalidated)
        }`}>
          {location.sequence}
        </div>

        {/* Location Details */}
        <div className="flex-1">
          <h3 className="text-sm font-medium text-gray-900">{location.name}</h3>

          {/* Directions Link */}
          {location.directionsUrl && (
            <div className="mt-1 flex items-center space-x-4">
              <div className="flex items-center text-xs text-gray-500">
                <span className="mr-1">{location.travelMode === 'driving' ? '🚗' : '🚶'}</span>
                <span>{location.walkingTime || '~15 min'}</span>
              </div>
              <button
                onClick={handleDirectionsClick}
                className="text-blue-600 hover:text-blue-800 text-xs font-medium"
              >
                Directions
              </button>
            </div>
          )}
        </div>

        {/* Actions Menu (only show if database location exists) */}
        {dbLocation && (
          <LocationActionsMenu
            location={dbLocation}
            onEdit={handleEdit}
            onValidate={handleValidate}
            onMarkAsArea={handleMarkAsArea}
            onDelete={handleDelete}
          />
        )}
      </div>

      {/* Location Edit Modal */}
      <LocationEditModal
        location={editingLocation}
        isOpen={!!editingLocation}
        onClose={() => setEditingLocation(null)}
        onSave={handleSaveEdit}
        onValidate={handleValidateInModal}
      />
    </>
  );
}

function DaySection({
  day,
  isExpanded,
  onToggle,
  dbLocations,
  onLocationUpdated,
  onStartAddingLocation,
  showingAddLocationFor,
  onCancelAddLocation,
  onSaveNewLocation
}: DaySectionProps) {
  const [dayLocations, setDayLocations] = useState(day.locations);
  const [isReordering, setIsReordering] = useState(false);

  // Update local state when day locations change
  useEffect(() => {
    setDayLocations(day.locations);
  }, [day.locations]);

  // Collect database location IDs for this day for sortable context
  // Only include locations that actually exist in the database
  const databaseLocationIds = dayLocations
    .map(location => {
      const dbLoc = dbLocations.get(location.name);
      return dbLoc?.id;
    })
    .filter((id): id is string => Boolean(id));


  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || active.id === over.id) {
      setIsReordering(false);
      return;
    }

    // Find the actual locations in dayLocations array that correspond to the dragged items
    const activeLocationIndex = dayLocations.findIndex(loc => {
      const dbLoc = dbLocations.get(loc.name);
      return dbLoc?.id === active.id;
    });

    const overLocationIndex = dayLocations.findIndex(loc => {
      const dbLoc = dbLocations.get(loc.name);
      return dbLoc?.id === over.id;
    });

    if (activeLocationIndex === -1 || overLocationIndex === -1) {
      console.error('Could not find dragged locations in day locations');
      setIsReordering(false);
      return;
    }

    setIsReordering(true);

    try {
      // Calculate the new sequence number based on database locations only
      const databaseLocations = dayLocations.filter(loc => dbLocations.get(loc.name));
      const activeDbIndex = databaseLocations.findIndex(loc => dbLocations.get(loc.name)?.id === active.id);
      const overDbIndex = databaseLocations.findIndex(loc => dbLocations.get(loc.name)?.id === over.id);

      if (activeDbIndex === -1 || overDbIndex === -1) {
        throw new Error('Could not find database location indices');
      }

      // Call API to reorder

      const response = await fetch('/api/locations/timeline', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          locationId: active.id,
          newSequence: overDbIndex + 1, // 1-based sequence for database locations only
          dayNumber: day.dayNumber
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to reorder location');
      }

      // Optimistically update the local state
      const newLocationOrder = arrayMove(dayLocations, activeLocationIndex, overLocationIndex);
      const resequencedLocations = newLocationOrder.map((loc, index) => ({
        ...loc,
        sequence: index + 1
      }));
      setDayLocations(resequencedLocations);

      // Notify parent to refresh data
      onLocationUpdated('reorder-complete');

    } catch (error) {
      console.error('Failed to reorder location:', error);

      // If location not found, refresh the timeline data
      if (error instanceof Error && error.message.includes('Location not found in this day')) {
        console.log('Location not found - refreshing timeline data');
        onLocationUpdated('refresh-after-error');
        alert('Location data was out of sync. Timeline has been refreshed. Please try again.');
      } else {
        alert(`Failed to reorder location: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    } finally {
      setIsReordering(false);
    }
  };

  const handleLocationDeleted = (deletedLocation: TimelineLocation) => {
    // Remove from local state optimistically
    const updatedLocations = dayLocations.filter(loc => {
      const dbLoc = dbLocations.get(loc.name);
      return !dbLoc || dbLoc.id !== deletedLocation.id;
    });

    // Resequence remaining locations
    const resequencedLocations = updatedLocations.map((loc, index) => ({
      ...loc,
      sequence: index + 1
    }));

    setDayLocations(resequencedLocations);

    // Notify parent to refresh full timeline data
    onLocationUpdated('delete-complete');
  };

  return (
    <div className="bg-white shadow rounded-lg mb-4">
      {/* Day Header */}
      <button
        onClick={onToggle}
        className="w-full px-6 py-4 text-left flex items-center justify-between hover:bg-gray-50 transition-colors duration-200"
        disabled={isReordering}
      >
        <div>
          <h2 className="text-lg font-semibold text-gray-900">
            Day {day.dayNumber} - {day.date}
          </h2>
          <p className="text-sm text-gray-600 mt-1">
            {dayLocations.length} location{dayLocations.length !== 1 ? 's' : ''}
            {isReordering && <span className="text-indigo-600 ml-2">(Reordering...)</span>}
          </p>
        </div>

        {/* Expand/Collapse Arrow */}
        <div className={`transform transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}>
          <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {/* Expandable Content */}
      {isExpanded && (
        <div className="px-6 pb-4 border-t border-gray-100">
          <div className="pt-4">
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={databaseLocationIds}
                strategy={verticalListSortingStrategy}
              >
                {dayLocations.map((location, index) => (
                  <SortableLocationItem
                    key={`${day.dayNumber}-${location.name}-${index}`}
                    location={location}
                    dbLocation={dbLocations.get(location.name)}
                    onLocationUpdated={onLocationUpdated}
                    onLocationDeleted={handleLocationDeleted}
                    isDragDisabled={isReordering}
                  />
                ))}
              </SortableContext>
            </DndContext>

            {/* Add Location - Inline or Button */}
            <div className="pt-3 mt-3 border-t border-gray-50">
              {showingAddLocationFor === day.dayNumber ? (
                <InlineLocationAdd
                  dayNumber={day.dayNumber}
                  onAdd={onSaveNewLocation}
                  onCancel={onCancelAddLocation}
                  existingLocations={dayLocations.map(loc => ({
                    name: loc.name,
                    sequence: loc.sequence
                  }))}
                />
              ) : (
                <button
                  onClick={() => onStartAddingLocation(day.dayNumber)}
                  className="flex items-center w-full p-3 text-sm text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 rounded-lg transition-colors duration-200 group"
                  disabled={isReordering}
                >
                  <svg className="w-4 h-4 mr-3 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  <span className="font-medium">Add location to Day {day.dayNumber}</span>
                  <span className="ml-auto text-xs text-gray-400">Type to search</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function TimelineView({ timeline }: TimelineViewProps) {
  const [expandedDays, setExpandedDays] = useState<Set<number>>(new Set([1])); // First day expanded by default
  const [dbLocations, setDbLocations] = useState<Map<string, TimelineLocation>>(new Map());
  const [, setIsLoadingLocations] = useState(true);
  const [showingAddLocationFor, setShowingAddLocationFor] = useState<number | null>(null);

  // Load database locations on component mount
  useEffect(() => {
    const loadDbLocations = async () => {
      try {
        // Get all unique location names from timeline
        const locationNames = timeline.days
          .flatMap(day => day.locations)
          .map(location => location.name);
        const uniqueNames = Array.from(new Set(locationNames));

        // Fetch database locations
        const locationMap = await locationService.getLocationsByNames(uniqueNames);
        setDbLocations(locationMap);
      } catch (error) {
        console.error('Failed to load database locations:', error);
      } finally {
        setIsLoadingLocations(false);
      }
    };

    loadDbLocations();
  }, [timeline]);

  const handleLocationUpdated = async (locationName: string) => {
    try {
      // Reload the specific location from database
      const updatedLocation = await locationService.getLocationByName(locationName);
      if (updatedLocation) {
        setDbLocations(prev => new Map(prev).set(locationName, updatedLocation));
      }
    } catch (error) {
      console.error('Failed to reload location:', error);
    }
  };

  const toggleDay = (dayNumber: number) => {
    const newExpanded = new Set(expandedDays);
    if (newExpanded.has(dayNumber)) {
      newExpanded.delete(dayNumber);
    } else {
      newExpanded.add(dayNumber);
    }
    setExpandedDays(newExpanded);
  };

  const expandAll = () => {
    setExpandedDays(new Set(timeline.days.map(day => day.dayNumber)));
  };

  const collapseAll = () => {
    setExpandedDays(new Set());
  };

  const handleStartAddingLocation = (dayNumber: number) => {
    setShowingAddLocationFor(dayNumber);
  };

  const handleCancelAddLocation = () => {
    setShowingAddLocationFor(null);
  };

  const handleSaveNewLocation = async (newLocationData: CreateTimelineLocationApiRequest) => {
    try {
      // Call the timeline location API
      const response = await fetch('/api/locations/timeline', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newLocationData),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to create location');
      }

      console.log('New timeline location created:', result.location);

      // Close inline add form
      setShowingAddLocationFor(null);

      // Refresh timeline data to include new location
      // Note: In a production app, this would trigger a timeline refresh
      // For now, we'll show a success message and rely on page refresh
      alert(`Location "${newLocationData.name}" added to Day ${newLocationData.day_number}! Refresh the page to see the update.`);

    } catch (error) {
      console.error('Error creating timeline location:', error);
      alert(`Failed to add location: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };


  return (
    <div>
      {/* Timeline Controls */}
      <div className="mb-6 flex justify-between items-center">
        <div className="flex space-x-3">
          <button
            onClick={expandAll}
            className="text-sm text-indigo-600 hover:text-indigo-800 font-medium"
          >
            Expand All
          </button>
          <span className="text-gray-300">•</span>
          <button
            onClick={collapseAll}
            className="text-sm text-indigo-600 hover:text-indigo-800 font-medium"
          >
            Collapse All
          </button>
        </div>

        <div className="text-sm text-gray-500">
          {expandedDays.size} of {timeline.days.length} days expanded
        </div>
      </div>

      {/* Day Sections */}
      <div className="space-y-4">
        {timeline.days.map((day) => (
          <DaySection
            key={day.dayNumber}
            day={day}
            isExpanded={expandedDays.has(day.dayNumber)}
            onToggle={() => toggleDay(day.dayNumber)}
            dbLocations={dbLocations}
            onLocationUpdated={handleLocationUpdated}
            onStartAddingLocation={handleStartAddingLocation}
            showingAddLocationFor={showingAddLocationFor}
            onCancelAddLocation={handleCancelAddLocation}
            onSaveNewLocation={handleSaveNewLocation}
          />
        ))}
      </div>


      {/* Summary Footer */}
      <div className="mt-8 bg-gray-50 rounded-lg p-4">
        <div className="text-center">
          <h3 className="text-lg font-medium text-gray-900">Trip Summary</h3>
          <div className="mt-2 flex justify-center space-x-8 text-sm text-gray-600">
            <div>
              <span className="font-medium">{timeline.days.length}</span> Days
            </div>
            <div>
              <span className="font-medium">{timeline.totalLocations}</span> Locations
            </div>
            <div>
              <span className="font-medium">Vietnam</span> Country
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}