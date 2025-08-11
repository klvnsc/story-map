'use client';

import { useEffect, useState, useRef } from 'react';
import Map, { Marker, Popup } from 'react-map-gl/mapbox';
import mapboxgl from 'mapbox-gl';
import { supabase } from '@/lib/supabase';
import { Story } from '@/types';
import { getProxiedImageUrl } from '@/lib/utils';
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
  selectedCollectionId?: string;
}

export default function MapView({ selectedCollectionId }: MapViewProps) {
  const [stories, setStories] = useState<Story[]>([]);
  const [expeditionTracks, setExpeditionTracks] = useState<ExpeditionTrack[]>([]);
  const [selectedStory, setSelectedStory] = useState<Story | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [viewState, setViewState] = useState({
    longitude: 20, // Central Europe/Asia view
    latitude: 40,
    zoom: 2
  });

  const mapRef = useRef<mapboxgl.Map | null>(null);

  // Determine expedition phase for a story (prioritize individual GPS data over collection data)
  const getStoryExpeditionPhase = (story: Story & { story_collections?: { expedition_phase?: string } }): string => {
    // If story has manual GPS date, calculate phase from date
    if (story.estimated_date_gps && story.tag_source === 'manual') {
      const date = new Date(story.estimated_date_gps);
      const dateStr = date.toISOString().split('T')[0]; // YYYY-MM-DD
      
      // Map dates to expedition phases (matches GPS correlation logic)
      if (dateStr >= '2025-05-25' && dateStr <= '2025-07-02') return 'uk_scotland';
      if (dateStr >= '2025-03-14' && dateStr <= '2025-05-25') return 'europe_mediterranean';
      if (dateStr >= '2024-10-17' && dateStr <= '2025-03-12') return 'middle_east_caucasus';
      if (dateStr >= '2024-07-01' && dateStr <= '2024-10-16') return 'central_asia';
      
      // Pre-expedition or post-expedition
      if (dateStr < '2024-07-01') return 'pre_expedition';
      if (dateStr > '2025-07-02') return 'post_expedition';
    }
    
    // Fall back to collection expedition phase
    return story.story_collections?.expedition_phase || 'unknown';
  };

  // Load stories with locations
  const loadStoriesWithLocations = async () => {
    let query = supabase
      .from('stories')
      .select(`
        *,
        story_collections (
          name,
          expedition_phase,
          collection_index,
          is_expedition_scope
        )
      `)
      .not('latitude', 'is', null)
      .not('longitude', 'is', null);

    if (selectedCollectionId) {
      query = query.eq('collection_id', selectedCollectionId);
    }

    const { data, error } = await query.order('estimated_date', { ascending: true });

    if (error) {
      console.error('Error loading stories:', error);
      return;
    }

    setStories(data || []);
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

    setExpeditionTracks(data || []);
  };

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      await Promise.all([
        loadStoriesWithLocations(),
        loadExpeditionTracks()
      ]);
      setIsLoading(false);
    };

    loadData();
  }, [selectedCollectionId]);

  // Fit map to show all stories
  useEffect(() => {
    if (stories.length > 0 && mapRef.current) {
      // Calculate bounds manually
      let minLng = Infinity, maxLng = -Infinity;
      let minLat = Infinity, maxLat = -Infinity;
      
      stories.forEach(story => {
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
        const bounds = [
          [minLng - padding, minLat - padding], // Southwest
          [maxLng + padding, maxLat + padding]  // Northeast
        ];
        
        mapRef.current.fitBounds(bounds, {
          padding: 50,
          maxZoom: 10
        });
      }
    }
  }, [stories]);

  const getMarkerColor = (expeditionPhase: string) => {
    const colors = {
      // Updated phase names (GPS correlation format)
      'uk_scotland': '#8B5CF6',      // Purple
      'europe_mediterranean': '#3B82F6', // Blue  
      'middle_east_caucasus': '#F59E0B', // Amber
      'central_asia': '#10B981',     // Emerald
      'pre_expedition': '#6B7280',   // Gray
      'post_expedition': '#374151',  // Dark Gray
      
      // Legacy phase names (for backward compatibility)
      'scotland': '#8B5CF6',         // Purple
      'europe': '#3B82F6',           // Blue  
      'africa': '#EF4444',           // Red
      'middle_east': '#F59E0B',      // Amber
      'north_china': '#EC4899'       // Pink
    };
    return colors[expeditionPhase as keyof typeof colors] || '#6B7280';
  };

  const handleStoryClick = (story: Story) => {
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
  const hasStoriesWithLocations = stories.length > 0;

  return (
    <div className="h-full relative">
      <Map
        ref={mapRef}
        {...viewState}
        onMove={evt => setViewState(evt.viewState)}
        mapboxAccessToken={process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN}
        mapStyle="mapbox://styles/mapbox/satellite-v9"
        className="w-full h-full"
      >
        {/* Story Markers */}
        {stories.map((story) => (
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
                {selectedStory.estimated_date && (
                  <span>{new Date(selectedStory.estimated_date).toLocaleDateString()}</span>
                )}
              </div>
            </div>
          </Popup>
        )}
      </Map>

      {/* Legend */}
      <div className="absolute top-4 right-4 bg-white p-3 rounded-lg shadow-lg text-sm">
        <h4 className="font-semibold mb-2">Expedition Phases</h4>
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 rounded-full bg-purple-500" />
            <span>Scotland</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 rounded-full bg-blue-500" />
            <span>Europe</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 rounded-full bg-red-500" />
            <span>Africa</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 rounded-full bg-amber-500" />
            <span>Middle East</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 rounded-full bg-emerald-500" />
            <span>Central Asia</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 rounded-full bg-pink-500" />
            <span>North China</span>
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
          <div>📍 <strong>{stories.length}</strong> stories with locations</div>
          <div>🛣️ <strong>{expeditionTracks.length}</strong> expedition tracks</div>
          <div>📊 <strong>{expeditionTracks.reduce((sum, track) => sum + (track.gps_point_count || 0), 0)}</strong> total GPS points</div>
          <div>🌍 <strong>{expeditionTracks.reduce((sum, track) => sum + (track.distance_km || 0), 0).toFixed(0)}</strong> km total distance</div>
          {selectedCollectionId && (
            <div className="text-xs text-gray-500 mt-2">
              Filtered by collection
            </div>
          )}
        </div>
      </div>
    </div>
  );
}