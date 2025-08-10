'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { getProxiedImageUrl, getDirectImageUrl } from '@/lib/utils';

interface Story {
  id: string;
  story_index: number;
  media_type: 'image' | 'video';
  cdn_url: string;
  duration?: number;
  location_name?: string;
  latitude?: number;
  longitude?: number;
  estimated_date?: string;
  collection_id: string;
  collection?: {
    name: string;
    region?: string;
    expedition_phase?: string;
  };
}

interface StoryCollection {
  id: string;
  name: string;
  story_count: number;
  region?: string;
  expedition_phase?: string;
}

interface Filters {
  collection: string;
  region: string;
  phase: string;
  mediaType: string;
  search: string;
}

interface StoryBrowserProps {
  initialCollectionId?: string;
}

export default function StoryBrowser({ initialCollectionId = '' }: StoryBrowserProps) {
  const router = useRouter();
  const [stories, setStories] = useState<Story[]>([]);
  const [collections, setCollections] = useState<StoryCollection[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalStories, setTotalStories] = useState(0);
  const [filters, setFilters] = useState<Filters>({
    collection: initialCollectionId,
    region: '',
    phase: '',
    mediaType: '',
    search: ''
  });

  const STORIES_PER_PAGE = 12; // 4 columns x 3 rows for optimal layout

  // Fetch collections for filtering
  useEffect(() => {
    const fetchCollections = async () => {
      try {
        console.log('Fetching collections...');
        const { data, error } = await supabase
          .from('story_collections')
          .select('id, name, story_count, region, expedition_phase')
          .order('name');

        if (error) {
          console.error('Collections error:', error);
          throw error;
        }
        
        console.log('Collections loaded:', data?.length || 0);
        setCollections(data || []);
      } catch (error) {
        console.error('Error fetching collections:', error);
      }
    };

    fetchCollections();
  }, []);

  // Fetch stories with pagination and filters
  useEffect(() => {
    const fetchStories = async () => {
      setLoading(true);
      try {
        console.log('Fetching stories with filters:', filters);
        
        // First, get stories with collection info using a simpler approach
        let baseQuery = supabase
          .from('stories')
          .select(`
            id,
            story_index,
            media_type,
            cdn_url,
            duration,
            location_name,
            latitude,
            longitude,
            estimated_date,
            collection_id
          `);

        // Apply direct story filters first
        if (filters.collection) {
          baseQuery = baseQuery.eq('collection_id', filters.collection);
        }
        if (filters.mediaType) {
          baseQuery = baseQuery.eq('media_type', filters.mediaType);
        }

        // Get collection data separately for better reliability
        const { data: collectionsData } = await supabase
          .from('story_collections')
          .select('id, name, region, expedition_phase');

        // Create collection lookup map
        const collectionMap = new Map(
          collectionsData?.map(col => [col.id, col]) || []
        );

        // Determine filtering strategy
        let shouldFilterByCollection = false;
        let filteredCollectionIds: string[] = [];
        
        // If we have region/phase filters OR search term, check collections
        if (filters.region || filters.phase || filters.search) {
          filteredCollectionIds = collectionsData
            ?.filter(col => {
              if (filters.region && col.region !== filters.region) return false;
              if (filters.phase && col.expedition_phase !== filters.phase) return false;
              if (filters.search) {
                return col.name?.toLowerCase().includes(filters.search.toLowerCase());
              }
              return true;
            })
            .map(col => col.id) || [];
          
          // Only filter by collection if we have region/phase filters OR search matches collections
          shouldFilterByCollection = !!filters.region || !!filters.phase || (filters.search && filteredCollectionIds.length > 0);
        }
        
        // Apply collection-based filtering or location search
        if (filters.search && !shouldFilterByCollection) {
          // Search didn't match any collections, so search location names instead
          baseQuery = baseQuery.ilike('location_name', `%${filters.search}%`);
        }
        
        if (shouldFilterByCollection) {

          if (filteredCollectionIds.length > 0) {
            baseQuery = baseQuery.in('collection_id', filteredCollectionIds);
          } else {
            // No matching collections, return empty result
            setStories([]);
            setTotalStories(0);
            setLoading(false);
            return;
          }
        }

        // Create a separate count query that applies the same filters
        let countQuery = supabase
          .from('stories')
          .select('*', { count: 'exact', head: true });

        // Apply the same filters as baseQuery
        if (filters.collection) {
          countQuery = countQuery.eq('collection_id', filters.collection);
        }
        if (filters.mediaType) {
          countQuery = countQuery.eq('media_type', filters.mediaType);
        }
        if (filters.search && !shouldFilterByCollection) {
          countQuery = countQuery.ilike('location_name', `%${filters.search}%`);
        }
        if (shouldFilterByCollection && filteredCollectionIds.length > 0) {
          countQuery = countQuery.in('collection_id', filteredCollectionIds);
        }

        const { count, error: countError } = await countQuery;

        if (countError) {
          console.error('Count error:', countError);
          throw countError;
        }

        setTotalStories(count || 0);

        // Get paginated results
        const { data: storiesData, error } = await baseQuery
          .order('collection_id', { ascending: true })
          .order('story_index', { ascending: true })
          .range((currentPage - 1) * STORIES_PER_PAGE, currentPage * STORIES_PER_PAGE - 1);

        if (error) {
          console.error('Stories query error:', error);
          throw error;
        }

        // Add collection info to stories
        const formattedStories = storiesData?.map(story => ({
          ...story,
          collection: collectionMap.get(story.collection_id)
        })) || [];

        setStories(formattedStories);
      } catch (error) {
        console.error('Error fetching stories:', error);
        // Set empty state on error
        setStories([]);
        setTotalStories(0);
      } finally {
        setLoading(false);
      }
    };

    fetchStories();
  }, [currentPage, filters]);

  const updateFilter = (key: keyof Filters, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setCurrentPage(1); // Reset to first page when filtering
  };

  const clearFilters = () => {
    setFilters({
      collection: initialCollectionId, // Keep the initial collection from URL
      region: '',
      phase: '',
      mediaType: '',
      search: ''
    });
    setCurrentPage(1);
  };

  const totalPages = Math.ceil(totalStories / STORIES_PER_PAGE);
  const uniqueRegions = [...new Set(collections.map(c => c.region).filter(Boolean))];
  const uniquePhases = [...new Set(collections.map(c => c.expedition_phase).filter(Boolean))];

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Filter Stories</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-4">
          {/* Search */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Search
            </label>
            <input
              type="text"
              value={filters.search}
              onChange={(e) => updateFilter('search', e.target.value)}
              placeholder="Collection or location..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-900 placeholder-gray-500"
            />
          </div>

          {/* Collection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Collection
            </label>
            <select
              value={filters.collection}
              onChange={(e) => updateFilter('collection', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-900"
            >
              <option value="">All Collections</option>
              {collections.map(collection => (
                <option key={collection.id} value={collection.id}>
                  {collection.name} ({collection.story_count})
                </option>
              ))}
            </select>
          </div>

          {/* Region */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Region
            </label>
            <select
              value={filters.region}
              onChange={(e) => updateFilter('region', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-900"
            >
              <option value="">All Regions</option>
              {uniqueRegions.map(region => (
                <option key={region} value={region}>{region}</option>
              ))}
            </select>
          </div>

          {/* Expedition Phase */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Phase
            </label>
            <select
              value={filters.phase}
              onChange={(e) => updateFilter('phase', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-900"
            >
              <option value="">All Phases</option>
              {uniquePhases.map(phase => (
                <option key={phase} value={phase}>{phase}</option>
              ))}
            </select>
          </div>

          {/* Media Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Media Type
            </label>
            <select
              value={filters.mediaType}
              onChange={(e) => updateFilter('mediaType', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-900"
            >
              <option value="">All Types</option>
              <option value="image">Images</option>
              <option value="video">Videos</option>
            </select>
          </div>

          {/* Clear Filters */}
          <div className="flex items-end">
            <button
              onClick={clearFilters}
              className="w-full px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-md text-sm"
            >
              Clear All
            </button>
          </div>
        </div>

        {/* Results Summary */}
        <div className="text-sm text-gray-600">
          Showing {stories.length} of {totalStories.toLocaleString()} stories
          {totalPages > 1 && ` (Page ${currentPage} of ${totalPages})`}
        </div>
      </div>

      {/* Story Grid */}
      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-4 gap-6">
            {stories.map((story) => (
              <div
                key={story.id}
                onClick={() => router.push(`/story/${story.id}`)}
                className="group relative bg-white rounded-lg shadow hover:shadow-lg transition-shadow duration-200 cursor-pointer max-w-xs mx-auto"
              >
                <div className="aspect-square relative overflow-hidden rounded-t-lg bg-gray-100">
                  {story.media_type === 'video' ? (
                    <>
                      {/* Video loading placeholder */}
                      <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
                        <div className="text-gray-400">
                          <svg className="w-8 h-8 animate-pulse" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M2 6a2 2 0 012-2h6l2 2h6a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6zM14.553 7.106A1 1 0 0014 8v4a1 1 0 00.553.894l2 1A1 1 0 0018 13V7a1 1 0 00-1.447-.894l-2 1z" />
                          </svg>
                        </div>
                      </div>
                      
                      <video
                        src={getProxiedImageUrl(story.cdn_url, false, true)}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                        muted
                        playsInline
                        preload="metadata"
                        crossOrigin="anonymous"
                        onLoadedData={(e) => {
                          // Hide loading placeholder when video loads
                          const target = e.target as HTMLVideoElement;
                          const placeholder = target.parentElement?.querySelector('div');
                          if (placeholder) placeholder.style.display = 'none';
                        }}
                        onMouseEnter={(e) => {
                          const video = e.target as HTMLVideoElement;
                          video.currentTime = 1; // Show frame from 1 second
                        }}
                        onError={() => {
                          console.warn('Video failed to load:', story.id, story.cdn_url);
                          // Keep placeholder visible on error
                        }}
                      />
                    </>
                  ) : (
                    <>
                      {/* Loading placeholder */}
                      <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
                        <div className="text-gray-400">
                          <svg className="w-8 h-8 animate-pulse" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
                          </svg>
                        </div>
                      </div>
                      
                      <img
                        src={getProxiedImageUrl(story.cdn_url, false, false)}
                        alt={`Story ${story.story_index}`}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                        loading="lazy"
                        onLoad={(e) => {
                          // Hide loading placeholder when image loads
                          const target = e.target as HTMLImageElement;
                          const placeholder = target.parentElement?.querySelector('div');
                          if (placeholder) placeholder.style.display = 'none';
                        }}
                        onError={(e) => {
                          // Fallback to direct URL if proxy fails
                          const target = e.target as HTMLImageElement;
                          if (target.src.includes('/api/proxy-image')) {
                            console.warn('Proxy failed, using direct URL for:', story.id);
                            target.src = getDirectImageUrl(story.cdn_url);
                          }
                        }}
                      />
                    </>
                  )}
                  
                  {/* Media type indicator */}
                  <div className="absolute top-2 right-2 bg-black bg-opacity-50 text-white px-1 py-0.5 rounded text-xs">
                    {story.media_type === 'video' ? '🎥' : '📷'}
                  </div>
                </div>

                {/* Story Info */}
                <div className="p-3">
                  <div className="text-xs font-medium text-gray-900 truncate mb-1">
                    {story.collection?.name}
                  </div>
                  <div className="text-xs text-gray-500 truncate">
                    #{story.story_index}
                    {story.location_name && ` • ${story.location_name}`}
                  </div>
                  {story.collection?.region && (
                    <div className="text-xs text-indigo-600 truncate mt-1">
                      {story.collection.region}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center items-center space-x-2 mt-8">
              <button
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              
              <div className="flex items-center space-x-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (currentPage <= 3) {
                    pageNum = i + 1;
                  } else if (currentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = currentPage - 2 + i;
                  }
                  
                  return (
                    <button
                      key={pageNum}
                      onClick={() => setCurrentPage(pageNum)}
                      className={`px-3 py-2 text-sm rounded-md ${
                        pageNum === currentPage
                          ? 'bg-indigo-600 text-white'
                          : 'border border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
              </div>

              <button
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}