'use client';

import { useEffect, useState, useRef } from 'react';
import Map, { Marker, Popup, Source, Layer, type MapRef } from 'react-map-gl/mapbox';
import { supabase } from '@/lib/supabase';
import { Story } from '@/types';

// Extended Story type for MapView with nested collection data
interface StoryWithCollection extends Story {
  story_collections?: {
    name?: string;
    expedition_phase?: string;
    collection_index?: number;
    is_expedition_scope?: boolean;
    collection_start_date?: string;
  };
}
import { getProxiedImageUrl, getBestAvailableDateString, getBestAvailableDate, getExpeditionPhaseForDate } from '@/lib/utils';
import 'mapbox-gl/dist/mapbox-gl.css';

interface ExpeditionTrack {
  id: string;
  track_number: number;
  title: string;
  classification: 'moving' | 'rest';
  region: string;
  expedition_phase: string;
  distance_km: number;
  gps_point_count: number;
}

interface MapViewProps {
  selectedPhase?: string;
}

export default function MapView({ selectedPhase }: MapViewProps) {
  const [allStories, setAllStories] = useState<StoryWithCollection[]>([]);
  const [expeditionTracks, setExpeditionTracks] = useState<ExpeditionTrack[]>([]);
  const [selectedStory, setSelectedStory] = useState<StoryWithCollection | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [viewState, setViewState] = useState({
    longitude: 20, // Central Europe/Asia view
    latitude: 40,
    zoom: 2
  });

  const mapRef = useRef<MapRef | null>(null);

  // Filter stories based on selected phase (client-side filtering)
  const filteredStories = selectedPhase 
    ? allStories.filter(story => {
        const storyWithCollection = story as Story & { story_collections?: { expedition_phase?: string } };
        return storyWithCollection.story_collections?.expedition_phase === selectedPhase;
      })
    : allStories;

  // Determine expedition phase for a story (prioritize individual GPS data over collection data)
  const getStoryExpeditionPhase = (story: StoryWithCollection): string => {
    // If story has manual user-assigned date, calculate phase from date using dynamic manifest data
    const storyWithDates = story as Story & { 
      user_assigned_date?: string; 
      estimated_date_gps?: string; 
      story_collections?: { expedition_phase?: string };
    };
    const manualDate = storyWithDates.user_assigned_date || storyWithDates.estimated_date_gps; // Support both new and legacy fields
    if (manualDate && story.tag_source === 'manual') {
      const date = new Date(manualDate);
      
      // Use dynamic expedition phase detection from collections-manifest.json
      return getExpeditionPhaseForDate(date);
    }
    
    // Fall back to collection expedition phase
    return story.story_collections?.expedition_phase || 'unknown';
  };

  // Load ALL stories with locations (no filtering - do this once)
  const loadAllStoriesWithLocations = async () => {
    const { data, error } = await supabase
      .from('stories')
      .select(`
        *,
        story_collections (
          name,
          expedition_phase,
          collection_index,
          is_expedition_scope,
          collection_start_date
        )
      `)
      .not('latitude', 'is', null)
      .not('longitude', 'is', null)
      .order('user_assigned_date', { ascending: true, nullsFirst: false });

    if (error) {
      console.error('Error loading stories:', error);
      return;
    }

    setAllStories((data as unknown as StoryWithCollection[]) || []);
  };

  // Load expedition tracks for context
  const loadExpeditionTracks = async () => {
    const { data, error } = await supabase
      .from('expedition_tracks')
      .select('*')
      .order('track_number', { ascending: true });

    if (error) {
      console.error('Error loading expedition tracks:', error);
      return;
    }

    setExpeditionTracks((data as unknown as ExpeditionTrack[]) || []);
  };

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      await Promise.all([
        loadAllStoriesWithLocations(),
        loadExpeditionTracks()
      ]);
      setIsLoading(false);
    };

    loadData();
  }, []); // Only load once on mount

  // Fit map to show all stories
  useEffect(() => {
    if (filteredStories.length > 0 && mapRef.current) {
      // Calculate bounds manually
      let minLng = Infinity, maxLng = -Infinity;
      let minLat = Infinity, maxLat = -Infinity;
      
      filteredStories.forEach(story => {
        if (story.latitude && story.longitude) {
          minLng = Math.min(minLng, story.longitude);
          maxLng = Math.max(maxLng, story.longitude);
          minLat = Math.min(minLat, story.latitude);
          maxLat = Math.max(maxLat, story.latitude);
        }
      });

      if (minLng !== Infinity) {
        // Add padding to bounds
        const padding = 0.5;
        const bounds: [number, number, number, number] = [
          minLng - padding, // West
          minLat - padding, // South
          maxLng + padding, // East
          maxLat + padding  // North
        ];
        
        mapRef.current?.getMap().fitBounds(bounds, {
          padding: 50,
          maxZoom: 10
        });
      }
    }
  }, [filteredStories]);

  const getMarkerColor = (expeditionPhase: string) => {
    const colors = {
      // Expedition phases from collections-manifest.json
      'pre_expedition': '#6B7280',           // Gray
      'north_china': '#EC4899',              // Pink  
      'central_asia': '#10B981',             // Emerald
      'middle_east_caucasus': '#F59E0B',     // Amber
      'europe_part1': '#3B82F6',             // Blue
      'africa': '#EF4444',                   // Red
      'europe_uk_scotland': '#8B5CF6',       // Purple
      'post_expedition': '#374151',          // Dark Gray
      'unknown': '#6B7280',                  // Gray    
    };
    return colors[expeditionPhase as keyof typeof colors] || '#6B7280';
  };

  const handleStoryClick = (story: StoryWithCollection) => {
    setSelectedStory(story);
    if (story.latitude && story.longitude) {
      setViewState({
        ...viewState,
        longitude: story.longitude,
        latitude: story.latitude,
        zoom: 8
      });
    }
  };

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  // Show message when no stories have locations yet
  const hasStoriesWithLocations = filteredStories.length > 0;

  return (
    <div className="h-full relative">
      <Map
        ref={mapRef}
        {...viewState}
        onMove={evt => setViewState(evt.viewState)}
        mapboxAccessToken={process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN}
        mapStyle="mapbox://styles/mapbox/satellite-v9"
        style={{ width: '100%', height: '100%' }}
      >
        {/* Story Markers */}
        {filteredStories.map((story) => (
          <Marker
            key={story.id}
            longitude={story.longitude!}
            latitude={story.latitude!}
            onClick={(e) => {
              e.originalEvent.stopPropagation();
              handleStoryClick(story);
            }}
          >
            <div
              className="w-4 h-4 rounded-full border-2 border-white cursor-pointer hover:scale-125 transition-transform shadow-lg"
              style={{ 
                backgroundColor: getMarkerColor(getStoryExpeditionPhase(story))
              }}
            />
          </Marker>
        ))}

        {/* Trip Route Line */}
        {filteredStories.length > 1 && (
          <Source
            type="geojson" 
            data={{
              type: 'Feature',
              properties: {},
              geometry: {
                type: 'LineString',
                coordinates: filteredStories
                  .filter(s => s.latitude != null && s.longitude != null)
                  .sort((a, b) => {
                    // Transform story data to match getBestAvailableDate expectation
                    const storyA = { ...a, collection: a.story_collections };
                    const storyB = { ...b, collection: b.story_collections };
                    const dateA = getBestAvailableDateString(storyA);
                    const dateB = getBestAvailableDateString(storyB);
                    return dateA.localeCompare(dateB);
                  })
                  .map(s => [s.longitude!, s.latitude!])
              }
            }}
          >
            <Layer
              type="line"
              paint={{
                'line-color': '#3B82F6',
                'line-width': 3,
                'line-opacity': 0.7,
                'line-dasharray': [2, 2]
              }}
            />
          </Source>
        )}

        {/* Story Popup */}
        {selectedStory && selectedStory.latitude && selectedStory.longitude && (
          <Popup
            longitude={selectedStory.longitude}
            latitude={selectedStory.latitude}
            onClose={() => setSelectedStory(null)}
            closeButton={true}
            closeOnClick={false}
            className="story-popup"
          >
            <div className="p-2 max-w-xs">
              <div className="flex items-center space-x-2 mb-2">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ 
                    backgroundColor: getMarkerColor(getStoryExpeditionPhase(selectedStory))
                  }}
                />
                <span className="text-sm font-medium">
                  {(selectedStory as Story & { story_collections?: { name?: string } }).story_collections?.name || 'Unknown Collection'}
                </span>
              </div>
              
              {selectedStory.location_name && (
                <p className="text-sm text-gray-600 mb-2">📍 {selectedStory.location_name}</p>
              )}
              
              <div className="mb-3">
                {selectedStory.media_type === 'image' ? (
                  <img
                    src={getProxiedImageUrl(selectedStory.cdn_url)}
                    alt="Story"
                    className="w-full h-24 object-cover rounded"
                    loading="lazy"
                  />
                ) : (
                  <video
                    src={selectedStory.cdn_url}
                    className="w-full h-24 object-cover rounded"
                    muted
                    loop
                    playsInline
                    crossOrigin="anonymous"
                  />
                )}
              </div>
              
              <div className="flex justify-between items-center text-xs text-gray-500">
                <span>{selectedStory.media_type}</span>
                {(() => {
                  // Transform story data to match getBestAvailableDate expectation
                  const storyWithCollection = { ...selectedStory, collection: selectedStory.story_collections };
                  const bestDate = getBestAvailableDate(storyWithCollection);
                  return bestDate ? (
                    <span>{bestDate.toLocaleDateString()}</span>
                  ) : null;
                })()}
              </div>
            </div>
          </Popup>
        )}
      </Map>

      {/* Legend */}
      <div className="absolute top-4 right-4 bg-white p-3 rounded-lg shadow-lg text-sm max-w-xs">
        <h4 className="font-semibold mb-2">Expedition Phases</h4>
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#EC4899' }} />
            <span>North China</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#10B981' }} />
            <span>Central Asia</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#F59E0B' }} />
            <span>Middle East & Caucasus</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#3B82F6' }} />
            <span>Europe Part 1</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#EF4444' }} />
            <span>Africa</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#8B5CF6' }} />
            <span>Europe & UK/Scotland</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#6B7280' }} />
            <span>Pre/Post Expedition</span>
          </div>
        </div>
      </div>

      {/* No Stories Message */}
      {!hasStoriesWithLocations && (
        <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 z-10">
          <div className="bg-white p-6 rounded-lg shadow-lg max-w-md mx-4 text-center">
            <div className="text-4xl mb-4">🗺️</div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Story Map Ready for Locations
            </h3>
            <p className="text-gray-600 mb-4">
              No stories have location data yet. Use the location tagging feature to add coordinates to your stories and see them plotted on the expedition route.
            </p>
            <div className="text-sm text-gray-500">
              <div>📊 <strong>{expeditionTracks.length}</strong> expedition tracks loaded</div>
              <div>🌍 <strong>{expeditionTracks.reduce((sum, track) => sum + (track.distance_km || 0), 0).toFixed(0)}</strong> km total distance</div>
              <div>📍 Ready for <strong>4,438</strong> story locations</div>
            </div>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="absolute bottom-4 left-4 bg-white p-3 rounded-lg shadow-lg text-sm">
        <div className="space-y-1">
          <div>📍 <strong>{filteredStories.length}</strong> stories with locations</div>
          <div>🛣️ <strong>{expeditionTracks.length}</strong> expedition tracks</div>
          <div>📊 <strong>{expeditionTracks.reduce((sum, track) => sum + (track.gps_point_count || 0), 0)}</strong> total GPS points</div>
          <div>🌍 <strong>{expeditionTracks.reduce((sum, track) => sum + (track.distance_km || 0), 0).toFixed(0)}</strong> km total distance</div>
          {selectedPhase && (
            <div className="text-xs text-gray-500 mt-2">
              Filtered by expedition phase: {selectedPhase}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}