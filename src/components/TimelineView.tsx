'use client';

import { useState } from 'react';
import { Timeline, TripDay, Location } from '@/lib/timeline-data';

interface TimelineViewProps {
  timeline: Timeline;
}

interface DaySectionProps {
  day: TripDay;
  isExpanded: boolean;
  onToggle: () => void;
}

interface LocationItemProps {
  location: Location;
}

function LocationItem({ location }: LocationItemProps) {
  const handleDirectionsClick = () => {
    if (location.directionsUrl) {
      window.open(location.directionsUrl, '_blank');
    }
  };

  return (
    <div className="flex items-center py-2">
      {/* Numbered Waypoint */}
      <div className="flex-shrink-0 w-8 h-8 bg-green-500 text-white rounded-full flex items-center justify-center text-sm font-medium mr-4">
        {location.sequence}
      </div>

      {/* Location Details */}
      <div className="flex-1">
        <h3 className="text-sm font-medium text-gray-900">{location.name}</h3>

        {/* Directions Link */}
        {location.directionsUrl && (
          <div className="mt-1 flex items-center space-x-4">
            <div className="flex items-center text-xs text-gray-500">
              <span className="mr-1">🚶</span>
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
    </div>
  );
}

function DaySection({ day, isExpanded, onToggle }: DaySectionProps) {
  return (
    <div className="bg-white shadow rounded-lg mb-4">
      {/* Day Header */}
      <button
        onClick={onToggle}
        className="w-full px-6 py-4 text-left flex items-center justify-between hover:bg-gray-50 transition-colors duration-200"
      >
        <div>
          <h2 className="text-lg font-semibold text-gray-900">
            Day {day.dayNumber} - {day.date}
          </h2>
          <p className="text-sm text-gray-600 mt-1">
            {day.locations.length} location{day.locations.length !== 1 ? 's' : ''}
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
            {day.locations.map((location, index) => (
              <LocationItem key={`${day.dayNumber}-${index}`} location={location} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function TimelineView({ timeline }: TimelineViewProps) {
  const [expandedDays, setExpandedDays] = useState<Set<number>>(new Set([1])); // First day expanded by default

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