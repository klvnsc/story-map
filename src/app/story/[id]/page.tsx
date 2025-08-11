'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { isAuthenticated, getCurrentUser } from '@/lib/auth';
import Navigation from '@/components/Navigation';
import { supabase } from '@/lib/supabase';
import { getProxiedImageUrl } from '@/lib/utils';
import { 
  getStoryGPSContext, 
  cacheLastManualDate,
  getLastManualDate,
  formatDisplayDate,
  type GPSCorrelationData 
} from '@/lib/gps-correlation';

interface Story {
  id: string;
  story_index: number;
  media_type: 'image' | 'video';
  cdn_url: string;
  duration?: number;
  location_name?: string;
  latitude?: number;
  longitude?: number;
  location_confidence?: 'high' | 'medium' | 'low' | 'estimated';
  content_type?: string[];
  tags?: string[];
  estimated_date?: string;
  time_added?: string;
  collection_id: string;
  // GPS correlation fields
  estimated_date_gps?: string;
  estimated_date_range_start?: string;
  estimated_date_range_end?: string;
  regional_tags?: string[];
  tag_source?: 'gps_estimated' | 'manual' | 'mixed' | 'excluded';
  date_confidence?: 'gps_estimated' | 'collection_estimated' | 'manual' | 'high' | 'medium' | 'low';
  collection?: {
    id: string;
    name: string;
    story_count: number;
    collection_index: number;
    region?: string;
    expedition_phase?: string;
    is_expedition_scope?: boolean;
  };
}

export default function StoryDetail() {
  const router = useRouter();
  const params = useParams();
  const storyId = params.id as string;
  
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<{ username: string } | null>(null);
  const [story, setStory] = useState<Story | null>(null);
  const [storyLoading, setStoryLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [collectionStories, setCollectionStories] = useState<{id: string, story_index: number}[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editForm, setEditForm] = useState({
    location_name: '',
    latitude: '',
    longitude: '',
    location_confidence: '',
    tags: [] as string[],
    estimated_date_gps: '',
    regional_tags: [] as string[]
  });
  
  // GPS suggestions state
  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsSuggestions, setGpsSuggestions] = useState<GPSCorrelationData | null>(null);
  const [suggestedTags, setSuggestedTags] = useState<string[]>([]);
  const [showGpsSuggestions, setShowGpsSuggestions] = useState(false);
  const [manualTagSourceOverride, setManualTagSourceOverride] = useState<string | null>(null);

  useEffect(() => {
    const checkAuth = () => {
      if (!isAuthenticated()) {
        router.push('/');
        return;
      }
      
      const currentUser = getCurrentUser();
      setUser(currentUser);
      setIsLoading(false);
    };

    checkAuth();
  }, [router]);

  useEffect(() => {
    const fetchStory = async () => {
      if (!storyId) return;
      
      setStoryLoading(true);
      setError(null);
      
      try {
        console.log('Fetching story with ID:', storyId);
        
        const { data, error } = await supabase
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
            location_confidence,
            content_type,
            tags,
            estimated_date,
            time_added,
            collection_id,
            estimated_date_gps,
            estimated_date_range_start,
            estimated_date_range_end,
            regional_tags,
            tag_source,
            date_confidence,
            story_collections!inner(
              id,
              name,
              story_count,
              collection_index,
              region,
              expedition_phase,
              is_expedition_scope
            )
          `)
          .eq('id', storyId)
          .single();

        if (error) {
          console.error('Error fetching story:', error);
          throw error;
        }

        if (!data) {
          setError('Story not found');
          return;
        }

        // Format the data to match our interface
        const formattedStory: Story = {
          ...data,
          collection: Array.isArray(data.story_collections) 
            ? data.story_collections[0] 
            : data.story_collections
        };

        console.log('Story loaded:', formattedStory);
        setStory(formattedStory);
        
        // Fetch all stories in this collection for navigation
        if (formattedStory.collection_id) {
          const { data: collectionStoriesData } = await supabase
            .from('stories')
            .select('id, story_index')
            .eq('collection_id', formattedStory.collection_id)
            .order('story_index', { ascending: true });
          
          setCollectionStories(collectionStoriesData || []);
        }
        
      } catch (error) {
        console.error('Error fetching story:', error);
        setError('Failed to load story');
      } finally {
        setStoryLoading(false);
      }
    };

    if (user && storyId) {
      fetchStory();
    }
  }, [user, storyId]);

  // Initialize edit form when story loads
  useEffect(() => {
    if (story) {
      setEditForm({
        location_name: story.location_name || '',
        latitude: story.latitude?.toString() || '',
        longitude: story.longitude?.toString() || '',
        location_confidence: story.location_confidence || '',
        tags: story.tags || [],
        estimated_date_gps: story.estimated_date_gps || '',
        regional_tags: story.regional_tags || []
      });
    }
  }, [story]);

  // Load GPS suggestions when editing begins
  useEffect(() => {
    const loadGpsSuggestions = async () => {
      if (!isEditing || !story?.collection) return;
      
      setGpsLoading(true);
      try {
        const gpsContext = await getStoryGPSContext({
          story_id: story.id,
          collection_name: story.collection.name,
          collection_index: story.collection.collection_index,
          estimated_date: story.estimated_date_gps || story.estimated_date,
          current_location: {
            location_name: story.location_name,
            latitude: story.latitude,
            longitude: story.longitude,
            location_confidence: story.location_confidence
          },
          current_tags: story.tags,
          tag_source: story.tag_source
        });
        
        setGpsSuggestions(gpsContext.gps_suggestions || null);
        setSuggestedTags(gpsContext.suggested_regional_tags);
        setShowGpsSuggestions(gpsContext.gps_suggestions !== undefined || gpsContext.suggested_regional_tags.length > 0);
        
      } catch (error) {
        console.error('Failed to load GPS suggestions:', error);
      } finally {
        setGpsLoading(false);
      }
    };
    
    loadGpsSuggestions();
  }, [isEditing, story]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      // Only handle keyboard navigation if we're not in an input field
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
        return;
      }

      if (!story || collectionStories.length === 0) return;

      const currentIndex = collectionStories.findIndex(s => s.id === story.id);
      
      if (event.key === 'ArrowLeft' && currentIndex > 0) {
        event.preventDefault();
        const prevStory = collectionStories[currentIndex - 1];
        router.push(`/story/${prevStory.id}`);
      } else if (event.key === 'ArrowRight' && currentIndex < collectionStories.length - 1) {
        event.preventDefault();
        const nextStory = collectionStories[currentIndex + 1];
        router.push(`/story/${nextStory.id}`);
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [story, collectionStories, router]);

  // Save story updates using new API endpoint
  const handleSave = async () => {
    if (!story) return;
    
    setIsSaving(true);
    try {
      // Prepare update payload for new API
      const updatePayload = {
        location_name: editForm.location_name || undefined,
        latitude: editForm.latitude ? parseFloat(editForm.latitude) : undefined,
        longitude: editForm.longitude ? parseFloat(editForm.longitude) : undefined,
        location_confidence: editForm.location_confidence || undefined,
        estimated_date_gps: editForm.estimated_date_gps || undefined,
        regional_tags: editForm.regional_tags.length > 0 ? editForm.regional_tags : undefined,
        manual_tags: editForm.tags.filter(tag => !editForm.regional_tags.includes(tag)),
        tag_source: manualTagSourceOverride || determineTagSource(),
        date_confidence: editForm.estimated_date_gps ? 'manual' : story.date_confidence
      };

      const response = await fetch(`/api/story/${story.id}/location`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatePayload)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update story');
      }

      const result = await response.json();
      
      if (result.success && result.data) {
        // Update local story state with returned data
        setStory(prevStory => prevStory ? { ...prevStory, ...result.data } : null);
        
        // Cache manual date if provided
        if (editForm.estimated_date_gps) {
          cacheLastManualDate(editForm.estimated_date_gps);
        }
        
        setIsEditing(false);
        alert('Story updated successfully!');
      }
      
    } catch (error) {
      console.error('Error saving story:', error);
      alert(`Failed to save changes: ${error}`);
    } finally {
      setIsSaving(false);
    }
  };
  
  // Determine tag source based on current state
  const determineTagSource = (): 'gps_estimated' | 'manual' | 'mixed' | 'excluded' => {
    if (!story?.collection?.is_expedition_scope) return 'excluded';
    
    // If user manually changed the date, it's always manual
    const manuallyChangedDate = editForm.estimated_date_gps && 
      editForm.estimated_date_gps !== story.estimated_date_gps;
    
    // If user manually removed or modified tags, it's manual
    const originalTags = [...(story.tags || [])].sort();
    const currentTags = [...editForm.tags].sort();
    const tagsWereModified = JSON.stringify(originalTags) !== JSON.stringify(currentTags);
    
    // If current story already has manual source, keep it manual unless clearly GPS-generated
    const wasAlreadyManual = story.tag_source === 'manual';
    
    console.log('Tag source detection:', {
      manuallyChangedDate,
      tagsWereModified,
      wasAlreadyManual,
      originalTags,
      currentTags,
      originalDate: story.estimated_date_gps,
      currentDate: editForm.estimated_date_gps
    });
    
    if (manuallyChangedDate || tagsWereModified || wasAlreadyManual) {
      return 'manual';
    }
    
    const hasGpsRegional = editForm.regional_tags.length > 0;
    const hasManualTags = editForm.tags.filter(tag => !editForm.regional_tags.includes(tag)).length > 0;
    
    if (hasGpsRegional && hasManualTags) return 'mixed';
    if (hasGpsRegional) return 'gps_estimated';
    return 'manual';
  };

  // Cancel editing
  const handleCancel = () => {
    if (story) {
      setEditForm({
        location_name: story.location_name || '',
        latitude: story.latitude?.toString() || '',
        longitude: story.longitude?.toString() || '',
        location_confidence: story.location_confidence || '',
        tags: story.tags || [],
        estimated_date_gps: story.estimated_date_gps || '',
        regional_tags: story.regional_tags || []
      });
    }
    setIsEditing(false);
    setShowGpsSuggestions(false);
    setManualTagSourceOverride(null); // Clear override on cancel
  };
  
  // Apply GPS suggestions
  const applyGpsSuggestion = (type: 'date' | 'tags' | 'both') => {
    if (!gpsSuggestions && suggestedTags.length === 0) return;
    
    if (type === 'date' && gpsSuggestions) {
      setEditForm(prev => ({
        ...prev,
        estimated_date_gps: gpsSuggestions.date_range.start
      }));
    }
    
    if (type === 'tags' || type === 'both') {
      setEditForm(prev => ({
        ...prev,
        regional_tags: [...new Set([...prev.regional_tags, ...suggestedTags])],
        tags: [...new Set([...prev.tags, ...suggestedTags])]
      }));
    }
    
    if (type === 'both' && gpsSuggestions) {
      setEditForm(prev => ({
        ...prev,
        estimated_date_gps: gpsSuggestions.date_range.start,
        regional_tags: [...new Set([...prev.regional_tags, ...suggestedTags])],
        tags: [...new Set([...prev.tags, ...suggestedTags])]
      }));
    }
  };
  
  // Use last manual date
  const useLastManualDate = () => {
    const lastDate = getLastManualDate();
    if (lastDate) {
      setEditForm(prev => ({ ...prev, estimated_date_gps: lastDate }));
    }
  };



  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!user) {
    return null; // Will redirect
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation user={user} />
        <main className="max-w-4xl mx-auto py-6 sm:px-6 lg:px-8">
          <div className="px-4 py-6 sm:px-0">
            <div className="bg-red-50 border border-red-200 rounded-md p-4">
              <div className="flex">
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">
                    Error Loading Story
                  </h3>
                  <div className="mt-2 text-sm text-red-700">
                    <p>{error}</p>
                  </div>
                  <div className="mt-4">
                    <button
                      onClick={() => router.back()}
                      className="bg-red-100 hover:bg-red-200 text-red-800 px-4 py-2 rounded text-sm"
                    >
                      Go Back
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (storyLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation user={user} />
        <main className="max-w-4xl mx-auto py-6 sm:px-6 lg:px-8">
          <div className="px-4 py-6 sm:px-0">
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (!story) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation user={user} />
        <main className="max-w-4xl mx-auto py-6 sm:px-6 lg:px-8">
          <div className="px-4 py-6 sm:px-0">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                Story Not Found
              </h2>
              <button
                onClick={() => router.push('/stories')}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded"
              >
                Back to Stories
              </button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation user={user} />
      
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {/* Breadcrumb Navigation */}
          <nav className="flex mb-6" aria-label="Breadcrumb">
            <ol className="flex items-center space-x-2">
              <li>
                <button
                  onClick={() => router.push('/stories')}
                  className="text-gray-500 hover:text-gray-700"
                >
                  Stories
                </button>
              </li>
              <li>
                <span className="text-gray-400">/</span>
              </li>
              <li>
                <button
                  onClick={() => router.push('/collections')}
                  className="text-gray-500 hover:text-gray-700"
                >
                  Collections
                </button>
              </li>
              <li>
                <span className="text-gray-400">/</span>
              </li>
              <li>
                <span className="text-gray-900 font-medium">
                  {story.collection?.name}
                </span>
              </li>
              <li>
                <span className="text-gray-400">/</span>
              </li>
              <li>
                <span className="text-gray-500">
                  Story #{story.story_index}
                </span>
              </li>
            </ol>
          </nav>

          {/* Story Detail Content */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            
            {/* Story Display - Left Side (1/2 width) */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-lg shadow overflow-hidden">
                
                {/* Story Header */}
                <div className="px-6 py-4 border-b border-gray-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <h1 className="text-2xl font-bold text-gray-900">
                        {story.collection?.name} - Story #{story.story_index}
                      </h1>
                      <p className="text-sm text-gray-600 mt-1">
                        Collection #{story.collection?.collection_index || '?'} • {' '}
                        {story.media_type === 'video' 
                          ? (
                            <a 
                              href={story.cdn_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-indigo-600 hover:text-indigo-800 underline"
                            >
                              Video {story.duration ? `${story.duration}s` : ''}
                            </a>
                          )
                          : 'Image'
                        }
                      </p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => router.back()}
                        className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-2 rounded text-sm"
                      >
                        ← Back
                      </button>
                    </div>
                  </div>
                </div>

                {/* Story Media Display */}
                <div className="aspect-[9/16] bg-gray-100 flex items-center justify-center relative max-w-sm mx-auto">
                  {story.media_type === 'video' ? (
                    <video
                      src={getProxiedImageUrl(story.cdn_url, false, true)}
                      controls
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        // Fallback to placeholder on error
                        const target = e.target as HTMLVideoElement;
                        const parent = target.parentElement;
                        if (parent) {
                          parent.innerHTML = `
                            <div class="text-center">
                              <div class="text-6xl mb-4">🎥</div>
                              <div class="text-lg text-gray-600 mb-2">Video Story</div>
                              <div class="text-sm text-gray-500">Duration: ${story.duration || '?'}s</div>
                              <div class="text-xs text-gray-400 mt-2">Instagram CDN (Failed to load)</div>
                              <a href="${story.cdn_url}" target="_blank" class="text-indigo-600 hover:text-indigo-800 underline text-sm mt-2 block">Open Original</a>
                            </div>
                          `;
                        }
                      }}
                    />
                  ) : (
                    <img
                      src={getProxiedImageUrl(story.cdn_url)}
                      alt={`Story #${story.story_index}`}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        // Fallback to placeholder on error
                        const target = e.target as HTMLImageElement;
                        const parent = target.parentElement;
                        if (parent) {
                          parent.innerHTML = `
                            <div class="text-center">
                              <div class="text-6xl mb-4">📷</div>
                              <div class="text-lg text-gray-600 mb-2">Image Story #${story.story_index}</div>
                              <div class="text-xs text-gray-400 mt-2">Instagram CDN (Failed to load)</div>
                              <a href="${story.cdn_url}" target="_blank" class="text-indigo-600 hover:text-indigo-800 underline text-sm mt-2 block">Open Original</a>
                            </div>
                          `;
                        }
                      }}
                    />
                  )}
                </div>

                {/* Story Navigation */}
                <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
                  <div className="flex items-center justify-between">
                    {(() => {
                      const currentIndex = collectionStories.findIndex(s => s.id === story.id);
                      const prevStory = currentIndex > 0 ? collectionStories[currentIndex - 1] : null;
                      const nextStory = currentIndex < collectionStories.length - 1 ? collectionStories[currentIndex + 1] : null;
                      
                      return (
                        <>
                          <button
                            onClick={() => prevStory && router.push(`/story/${prevStory.id}`)}
                            className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed"
                            disabled={!prevStory}
                          >
                            <span>←</span>
                            <span>Previous Story</span>
                            {prevStory && (
                              <span className="text-xs">(#{prevStory.story_index})</span>
                            )}
                          </button>
                          
                          <div className="text-sm text-gray-500">
                            Story {story.story_index} of {story.collection?.story_count || collectionStories.length}
                            <div className="text-xs text-gray-400 mt-1">
                              {currentIndex + 1} of {collectionStories.length} in collection
                            </div>
                          </div>
                          
                          <button
                            onClick={() => nextStory && router.push(`/story/${nextStory.id}`)}
                            className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed"
                            disabled={!nextStory}
                          >
                            <span>Next Story</span>
                            {nextStory && (
                              <span className="text-xs">(#{nextStory.story_index})</span>
                            )}
                            <span>→</span>
                          </button>
                        </>
                      );
                    })()}
                  </div>
                </div>
              </div>
            </div>

            {/* Metadata Panel - Right Side (1/2 width) */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">
                  Story Metadata
                </h2>

                {/* Basic Info - 2 Columns */}
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div>
                    <label className="block text-xs font-medium text-gray-700">
                      Collection
                    </label>
                    <div className="text-sm text-gray-900">
                      {story.collection?.name}
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-xs font-medium text-gray-700">
                      Story Index
                    </label>
                    <div className="text-sm text-gray-900">
                      #{story.story_index}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700">
                      Media Type
                    </label>
                    <div className="text-sm text-gray-900">
                      {story.media_type} {story.duration && `(${story.duration}s)`}
                    </div>
                  </div>

                  {(story.estimated_date || story.estimated_date_gps) && (
                    <div>
                      <label className="block text-xs font-medium text-gray-700">
                        Estimated Date
                      </label>
                      <div className="text-sm text-gray-900">
                        {story.estimated_date_gps 
                          ? formatDisplayDate(story.estimated_date_gps)
                          : story.estimated_date 
                            ? new Date(story.estimated_date).toLocaleDateString()
                            : 'Not set'
                        }
                      </div>
                      {story.date_confidence && (
                        <div className="text-xs text-gray-500">
                          ({story.date_confidence === 'gps_estimated' ? 'GPS' :
                            story.date_confidence === 'collection_estimated' ? 'Collection' :
                            story.date_confidence === 'manual' ? 'Manual' : 
                            story.date_confidence})
                        </div>
                      )}
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-medium text-gray-700">
                      Collection #
                    </label>
                    <div className="text-sm text-gray-900">
                      #{story.collection?.collection_index || '?'}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700">
                      Region
                    </label>
                    <div className="text-sm text-gray-900">
                      {story.collection?.region || 'Not set'}
                    </div>
                  </div>
                </div>

                {/* CDN URL - Full Width */}
                <div className="mb-6">
                  <label className="block text-xs font-medium text-gray-700 mb-2">
                    CDN URL
                  </label>
                  <input
                    type="url"
                    value={getProxiedImageUrl(story.cdn_url) || ''}
                    placeholder="Enter CDN URL..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm bg-gray-50"
                    disabled
                    title="CDN URL is automatically cleaned (read-only)"
                  />
                </div>

                {/* GPS Smart Suggestions Panel */}
                {isEditing && showGpsSuggestions && story?.collection?.is_expedition_scope && (
                  <div className="border border-indigo-200 bg-indigo-50 rounded-lg p-4 mb-6">
                    <h3 className="text-sm font-medium text-indigo-900 mb-3 flex items-center">
                      <span className="w-2 h-2 bg-indigo-500 rounded-full mr-2"></span>
                      GPS Smart Suggestions
                    </h3>
                    
                    {gpsLoading ? (
                      <div className="text-sm text-indigo-700 flex items-center">
                        <div className="animate-spin h-4 w-4 border-2 border-indigo-500 border-t-transparent rounded-full mr-2"></div>
                        Loading GPS correlation data...
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {gpsSuggestions && (
                          <div className="bg-white rounded border p-3">
                            <div className="text-xs font-medium text-gray-700 mb-1">GPS Track Found</div>
                            <div className="text-sm text-gray-900 mb-2">
                              Track #{gpsSuggestions.track_number}: {gpsSuggestions.track_title}
                            </div>
                            <div className="text-xs text-gray-600 mb-2">
                              {formatDisplayDate(gpsSuggestions.date_range.start)} - {formatDisplayDate(gpsSuggestions.date_range.end)}
                            </div>
                            <div className="flex space-x-2">
                              <button
                                onClick={() => applyGpsSuggestion('date')}
                                className="text-xs bg-indigo-100 hover:bg-indigo-200 text-indigo-700 px-2 py-1 rounded"
                              >
                                Use Date
                              </button>
                            </div>
                          </div>
                        )}
                        
                        {suggestedTags.length > 0 && (
                          <div className="bg-white rounded border p-3">
                            <div className="text-xs font-medium text-gray-700 mb-2">Suggested Regional Tags</div>
                            <div className="flex flex-wrap gap-1 mb-2">
                              {suggestedTags.map(tag => (
                                <span key={tag} className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                                  {tag}
                                </span>
                              ))}
                            </div>
                            <button
                              onClick={() => applyGpsSuggestion('tags')}
                              className="text-xs bg-indigo-100 hover:bg-indigo-200 text-indigo-700 px-2 py-1 rounded"
                            >
                              Add Regional Tags
                            </button>
                          </div>
                        )}
                        
                        {gpsSuggestions && suggestedTags.length > 0 && (
                          <div className="pt-2 border-t">
                            <button
                              onClick={() => applyGpsSuggestion('both')}
                              className="text-sm bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1 rounded font-medium"
                            >
                              Apply All GPS Suggestions
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Date Information */}
                {isEditing && story?.collection?.is_expedition_scope && (
                  <div className="border-t border-gray-200 pt-6 mb-6">
                    <h3 className="text-sm font-medium text-gray-900 mb-3">
                      Date Information
                    </h3>
                    
                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-700">
                          Estimated Date (GPS)
                        </label>
                        <div className="flex space-x-2">
                          <input
                            type="date"
                            value={editForm.estimated_date_gps?.split('T')[0] || ''}
                            onChange={async (e) => {
                              const dateValue = e.target.value ? e.target.value + 'T12:00:00.000Z' : '';
                              setEditForm(prev => ({ ...prev, estimated_date_gps: dateValue }));
                              
                              // Auto-update regional tags when date changes
                              if (dateValue && story?.collection) {
                                try {
                                  const gpsContext = await getStoryGPSContext({
                                    story_id: story.id,
                                    collection_name: story.collection.name,
                                    collection_index: story.collection.collection_index,
                                    estimated_date: dateValue
                                  });
                                  
                                  // For manually set dates, override collection-based correlation
                                  // by directly calling the API with date-only (no collection index)
                                  try {
                                    const dateOnlyResponse = await fetch(`/api/gps-track-for-date?date=${dateValue.split('T')[0]}`);
                                    if (dateOnlyResponse.ok) {
                                      const dateOnlyResult = await dateOnlyResponse.json();
                                      if (dateOnlyResult.success && dateOnlyResult.data) {
                                        gpsContext.suggested_regional_tags = dateOnlyResult.data.regional_tags || [];
                                      }
                                    }
                                  } catch (error) {
                                    console.warn('Date-only GPS correlation failed:', error);
                                  }
                                  
                                  // Update regional tags based on new date
                                  setEditForm(prev => ({
                                    ...prev,
                                    regional_tags: gpsContext.suggested_regional_tags,
                                    tags: [
                                      ...prev.tags.filter(tag => !prev.regional_tags.includes(tag)), // Remove old regional tags
                                      ...gpsContext.suggested_regional_tags // Add new regional tags
                                    ]
                                  }));
                                  
                                } catch (error) {
                                  console.warn('Failed to auto-update regional tags:', error);
                                }
                              }
                            }}
                            className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm"
                          />
                          <button
                            onClick={useLastManualDate}
                            className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 px-2 py-1 rounded"
                            title="Use last manually entered date"
                          >
                            Last ↺
                          </button>
                          <button
                            onClick={async () => {
                              // Refresh GPS suggestions based on current date
                              if (editForm.estimated_date_gps) {
                                try {
                                  const dateOnlyResponse = await fetch(`/api/gps-track-for-date?date=${editForm.estimated_date_gps.split('T')[0]}`);
                                  if (dateOnlyResponse.ok) {
                                    const result = await dateOnlyResponse.json();
                                    if (result.success && result.data) {
                                      const newRegionalTags = result.data.regional_tags || [];
                                      setEditForm(prev => ({
                                        ...prev,
                                        regional_tags: newRegionalTags,
                                        tags: [
                                          ...prev.tags.filter(tag => !prev.regional_tags.includes(tag)),
                                          ...newRegionalTags
                                        ]
                                      }));
                                      alert(`Updated regional tags for ${editForm.estimated_date_gps.split('T')[0]}: ${newRegionalTags.join(', ')}`);
                                    } else {
                                      alert('No GPS correlation found for this date');
                                    }
                                  }
                                } catch (error) {
                                  alert('Failed to refresh GPS suggestions');
                                }
                              } else {
                                alert('Please set a date first');
                              }
                            }}
                            className="text-xs bg-blue-100 hover:bg-blue-200 text-blue-700 px-2 py-1 rounded"
                            title="Refresh GPS suggestions for current date"
                          >
                            Refresh GPS
                          </button>
                          <button
                            onClick={() => {
                              // Clear all regional tags for pre-expedition dates
                              setEditForm(prev => ({
                                ...prev,
                                regional_tags: [],
                                tags: prev.tags.filter(tag => !prev.regional_tags.includes(tag))
                              }));
                            }}
                            className="text-xs bg-red-100 hover:bg-red-200 text-red-700 px-2 py-1 rounded"
                            title="Clear regional tags (for pre-expedition dates)"
                          >
                            Clear Tags
                          </button>
                        </div>
                        
                        {story.estimated_date && (
                          <div className="text-xs text-gray-500 mt-1">
                            Collection estimate: {formatDisplayDate(story.estimated_date)}
                          </div>
                        )}
                      </div>
                      
                      <div>
                        <label className="block text-xs font-medium text-gray-700">
                          Date Confidence
                        </label>
                        <div className="text-sm text-gray-600">
                          {story.date_confidence === 'gps_estimated' ? 'GPS Estimated' :
                           story.date_confidence === 'collection_estimated' ? 'Collection Estimated' :
                           story.date_confidence === 'manual' ? 'Manually Set' :
                           story.date_confidence || 'Not Set'}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Location Info */}
                <div className="border-t border-gray-200 pt-6 mb-6">
                  <h3 className="text-sm font-medium text-gray-900 mb-3">
                    Location Information
                  </h3>
                  
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-700">
                        Location Name
                      </label>
                      <input
                        type="text"
                        value={isEditing ? editForm.location_name : (story.location_name || '')}
                        placeholder="Enter location name..."
                        onChange={(e) => setEditForm(prev => ({ ...prev, location_name: e.target.value }))}
                        className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md text-sm disabled:bg-gray-50"
                        disabled={!isEditing}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-700">
                          Latitude
                        </label>
                        <input
                          type="number"
                          step="any"
                          value={isEditing ? editForm.latitude : (story.latitude || '')}
                          placeholder="0.000000"
                          onChange={(e) => setEditForm(prev => ({ ...prev, latitude: e.target.value }))}
                          className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md text-sm disabled:bg-gray-50"
                          disabled={!isEditing}
                        />
                      </div>
                      
                      <div>
                        <label className="block text-xs font-medium text-gray-700">
                          Longitude
                        </label>
                        <input
                          type="number"
                          step="any"
                          value={isEditing ? editForm.longitude : (story.longitude || '')}
                          placeholder="0.000000"
                          onChange={(e) => setEditForm(prev => ({ ...prev, longitude: e.target.value }))}
                          className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md text-sm disabled:bg-gray-50"
                          disabled={!isEditing}
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-700">
                        Location Confidence
                      </label>
                      <select
                        value={isEditing ? editForm.location_confidence : (story.location_confidence || '')}
                        onChange={(e) => setEditForm(prev => ({ ...prev, location_confidence: e.target.value }))}
                        className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md text-sm disabled:bg-gray-50"
                        disabled={!isEditing}
                      >
                        <option value="">Not Set</option>
                        <option value="high">High</option>
                        <option value="medium">Medium</option>
                        <option value="low">Low</option>
                        <option value="estimated">Estimated</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Tags */}
                <div className="border-t border-gray-200 pt-6">
                  <h3 className="text-sm font-medium text-gray-900 mb-3">
                    Tags
                  </h3>
                  
                  {/* Regional Tags (separate display if editing) */}
                  {isEditing && editForm.regional_tags.length > 0 && (
                    <div className="mb-4">
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Regional Tags (GPS)
                      </label>
                      <div className="flex flex-wrap gap-1 p-2 border border-blue-200 bg-blue-50 rounded-md">
                        {editForm.regional_tags.map((tag, index) => (
                          <span
                            key={index}
                            className="inline-flex items-center px-2 py-1 rounded text-xs bg-blue-200 text-blue-800"
                          >
                            {tag}
                            {isEditing && (
                              <button
                                onClick={() => {
                                  const newRegionalTags = editForm.regional_tags.filter((_, i) => i !== index);
                                  const newAllTags = editForm.tags.filter(t => t !== tag);
                                  setEditForm(prev => ({ 
                                    ...prev, 
                                    regional_tags: newRegionalTags,
                                    tags: newAllTags
                                  }));
                                }}
                                className="ml-1 text-blue-600 hover:text-blue-800"
                              >
                                ×
                              </button>
                            )}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      {isEditing && editForm.regional_tags.length > 0 ? 'Manual Tags' : 'All Tags'}
                    </label>
                    <div className="flex flex-wrap gap-1 min-h-[2rem] p-2 border border-gray-300 rounded-md">
                      {(isEditing ? editForm.tags : story.tags || []).length > 0 ? (
                        (isEditing ? editForm.tags : story.tags || []).map((tag, index) => {
                          const isRegional = isEditing && editForm.regional_tags.includes(tag);
                          return (
                            <span
                              key={index}
                              className={`inline-flex items-center px-2 py-1 rounded text-xs ${
                                isRegional 
                                  ? 'bg-blue-200 text-blue-800' 
                                  : 'bg-gray-100 text-gray-800'
                              }`}
                            >
                              {tag}
                              {isEditing && (
                                <button
                                  onClick={() => {
                                    setEditForm(prev => ({
                                      ...prev,
                                      tags: prev.tags.filter((_, i) => i !== index),
                                      regional_tags: prev.regional_tags.filter(t => t !== tag)
                                    }));
                                  }}
                                  className="ml-1 text-gray-600 hover:text-red-600"
                                >
                                  ×
                                </button>
                              )}
                            </span>
                          );
                        })
                      ) : (
                        <span className="text-xs text-gray-500">No tags yet</span>
                      )}
                    </div>
                    
                    {/* Tag Source Information */}
                    {story.tag_source && (
                      <div className="text-xs text-gray-500 mt-1 flex items-center justify-between">
                        <span>
                          Source: {story.tag_source === 'gps_estimated' ? 'GPS Estimated' :
                                  story.tag_source === 'manual' ? 'Manually Added' :
                                  story.tag_source === 'mixed' ? 'GPS + Manual' :
                                  story.tag_source === 'excluded' ? 'Excluded Collection' :
                                  story.tag_source}
                          {manualTagSourceOverride && (
                            <span className="ml-1 text-orange-600 font-medium">(Override Active)</span>
                          )}
                        </span>
                        {isEditing && story.tag_source === 'gps_estimated' && (
                          <button
                            onClick={() => {
                              // Force tag source to manual since user is manually editing
                              const updatePayload = {
                                tag_source: 'manual' as const
                              };
                              
                              fetch(`/api/story/${story.id}/location`, {
                                method: 'PUT',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify(updatePayload)
                              }).then(() => {
                                setStory(prev => prev ? { ...prev, tag_source: 'manual' } : null);
                                setManualTagSourceOverride('manual'); // Persist the override
                                alert('Tag source updated to Manual');
                              }).catch(() => {
                                alert('Failed to update tag source');
                              });
                            }}
                            className="text-xs bg-orange-100 hover:bg-orange-200 text-orange-700 px-2 py-1 rounded ml-2"
                            title="Fix incorrect GPS Estimated source"
                          >
                            Fix Source
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Collection Status Warning */}
                {story.collection && !story.collection.is_expedition_scope && (
                  <div className="border-t border-gray-200 pt-6 mb-6">
                    <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3">
                      <div className="text-sm text-yellow-800">
                        <strong>Note:</strong> This story is from Collection #{story.collection.collection_index} which contains pre-expedition content and is excluded from GPS correlation.
                      </div>
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="border-t border-gray-200 pt-6 mt-6">
                  {isEditing ? (
                    <div className="space-y-3">
                      <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
                        <div className="text-sm text-blue-800">
                          <strong>Editing Mode:</strong> Make your changes above and click &quot;Save&quot; to update the story location data for map display.
                          {story.collection?.is_expedition_scope && (
                            <> Use GPS suggestions to auto-populate dates and regional tags based on expedition timeline.</>
                          )}
                        </div>
                      </div>
                      <div className="flex space-x-3">
                        <button
                          onClick={handleSave}
                          disabled={isSaving}
                          className="flex-1 bg-indigo-600 text-white px-4 py-2 rounded text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {isSaving ? 'Saving...' : 'Save Changes'}
                        </button>
                        <button
                          onClick={handleCancel}
                          disabled={isSaving}
                          className="flex-1 bg-gray-300 text-gray-700 px-4 py-2 rounded text-sm font-medium hover:bg-gray-400 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => setIsEditing(true)}
                      className="w-full bg-indigo-600 text-white px-4 py-2 rounded text-sm font-medium hover:bg-indigo-700"
                      disabled={story.collection && !story.collection.is_expedition_scope}
                    >
                      {story.collection && !story.collection.is_expedition_scope 
                        ? 'Editing Disabled (Excluded Collection)'
                        : 'Edit Location Data'
                      }
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}