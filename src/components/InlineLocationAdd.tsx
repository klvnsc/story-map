'use client';

import { useState, useEffect, useRef } from 'react';
import { CreateTimelineLocationApiRequest } from '@/types/timeline-locations';

interface GooglePlaceResult {
  placeId: string;
  name: string;
  formattedAddress: string;
  coordinates: {
    lat: number;
    lng: number;
  };
  types: string[];
}

interface InlineLocationAddProps {
  dayNumber: number;
  onAdd: (newLocation: CreateTimelineLocationApiRequest) => Promise<void>;
  onCancel: () => void;
  existingLocations: { name: string; sequence: number; }[];
}

export default function InlineLocationAdd({
  dayNumber,
  onAdd,
  onCancel,
  existingLocations
}: InlineLocationAddProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<GooglePlaceResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [error, setError] = useState('');

  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (query.length >= 2) {
        searchPlaces(query);
      } else {
        setResults([]);
        setShowDropdown(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  // Click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        !inputRef.current?.contains(event.target as Node)
      ) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const searchPlaces = async (searchQuery: string) => {
    setIsLoading(true);
    setError('');

    try {
      // For now, use mock data until Google Places API is set up
      // This will be replaced with actual API calls
      const mockResults: GooglePlaceResult[] = [
        {
          placeId: 'mock_1',
          name: `${searchQuery} Restaurant`,
          formattedAddress: `${searchQuery} Restaurant, District 1, Ho Chi Minh City, Vietnam`,
          coordinates: { lat: 10.7753, lng: 106.7028 },
          types: ['restaurant', 'food', 'point_of_interest']
        },
        {
          placeId: 'mock_2',
          name: `${searchQuery} Cafe`,
          formattedAddress: `${searchQuery} Cafe, District 1, Ho Chi Minh City, Vietnam`,
          coordinates: { lat: 10.7740, lng: 106.7010 },
          types: ['cafe', 'food', 'point_of_interest']
        },
        {
          placeId: 'mock_3',
          name: `${searchQuery} Hotel`,
          formattedAddress: `${searchQuery} Hotel, District 1, Ho Chi Minh City, Vietnam`,
          coordinates: { lat: 10.7760, lng: 106.7020 },
          types: ['lodging', 'point_of_interest']
        }
      ];

      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 200));

      setResults(mockResults);
      setShowDropdown(true);
      setSelectedIndex(-1);

    } catch (error) {
      console.error('Places search error:', error);
      setError('Search failed. Please try again.');
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);
    setError('');

    if (value.length === 0) {
      setResults([]);
      setShowDropdown(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showDropdown || results.length === 0) {
      if (e.key === 'Escape') {
        onCancel();
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => Math.min(prev + 1, results.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => Math.max(prev - 1, -1));
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && selectedIndex < results.length) {
          handleSelectPlace(results[selectedIndex]);
        } else if (query.trim()) {
          handleManualAdd();
        }
        break;
      case 'Escape':
        e.preventDefault();
        if (showDropdown) {
          setShowDropdown(false);
          setSelectedIndex(-1);
        } else {
          onCancel();
        }
        break;
    }
  };

  const handleSelectPlace = async (place: GooglePlaceResult) => {
    // Check for duplicate names
    const isDuplicate = existingLocations.some(
      loc => loc.name.toLowerCase() === place.name.toLowerCase()
    );

    if (isDuplicate) {
      setError(`"${place.name}" already exists in Day ${dayNumber}`);
      return;
    }

    try {
      await onAdd({
        name: place.name,
        place_name: place.name,
        day_number: dayNumber,
        coordinates: place.coordinates
      });
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to add location');
    }
  };

  const handleManualAdd = async () => {
    const trimmedQuery = query.trim();

    if (!trimmedQuery) {
      setError('Please enter a location name');
      return;
    }

    // Check for duplicate names
    const isDuplicate = existingLocations.some(
      loc => loc.name.toLowerCase() === trimmedQuery.toLowerCase()
    );

    if (isDuplicate) {
      setError(`"${trimmedQuery}" already exists in Day ${dayNumber}`);
      return;
    }

    try {
      await onAdd({
        name: trimmedQuery,
        day_number: dayNumber,
        coordinates: { lat: 10.7753, lng: 106.7028 } // Default coordinates
      });
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to add location');
    }
  };

  return (
    <div className="relative">
      {/* Input Field */}
      <div className="flex items-center space-x-2">
        <div className="flex-1 relative">
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder={`Add location to Day ${dayNumber}...`}
            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm ${
              error ? 'border-red-300 focus:ring-red-500' : 'border-gray-300'
            }`}
          />
          {isLoading && (
            <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
              <div className="animate-spin w-4 h-4 border-2 border-indigo-600 border-t-transparent rounded-full"></div>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <button
          onClick={handleManualAdd}
          disabled={!query.trim() || isLoading}
          className="px-3 py-2 bg-indigo-600 text-white text-xs rounded-md hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
          title="Add manually"
        >
          Add
        </button>
        <button
          onClick={onCancel}
          className="px-3 py-2 bg-gray-200 text-gray-700 text-xs rounded-md hover:bg-gray-300"
          title="Cancel"
        >
          ✕
        </button>
      </div>

      {/* Error Message */}
      {error && (
        <p className="text-xs text-red-600 mt-1">{error}</p>
      )}

      {/* Help Text */}
      <p className="text-xs text-gray-500 mt-1">
        Type to search • Enter to add • Escape to cancel
      </p>

      {/* Dropdown Results */}
      {showDropdown && results.length > 0 && (
        <div
          ref={dropdownRef}
          className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-50 max-h-60 overflow-y-auto"
        >
          {results.map((place, index) => (
            <div
              key={place.placeId}
              onClick={() => handleSelectPlace(place)}
              className={`px-4 py-3 cursor-pointer border-b border-gray-100 last:border-b-0 hover:bg-gray-50 ${
                index === selectedIndex ? 'bg-indigo-50 border-indigo-200' : ''
              }`}
            >
              <div className="font-medium text-sm text-gray-900">{place.name}</div>
              <div className="text-xs text-gray-500 mt-1">{place.formattedAddress}</div>
              <div className="flex items-center mt-1">
                {place.types.slice(0, 3).map(type => (
                  <span
                    key={type}
                    className="inline-block px-2 py-1 bg-gray-100 text-xs text-gray-600 rounded mr-2"
                  >
                    {type}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}