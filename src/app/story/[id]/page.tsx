'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { isAuthenticated, getCurrentUser } from '@/lib/auth';
import Navigation from '@/components/Navigation';
import { supabase } from '@/lib/supabase';
import { getProxiedImageUrl, getBestAvailableDate, getBestAvailableDateString, getDateConfidenceLevel } from '@/lib/utils';
import { 
  getStoryGPSContext, 
  cacheLastManualDate,
  getLastManualDate,
  formatDisplayDate,
  type GPSCorrelationData 
} from '@/lib/gps-correlation';
import { TagWithMetadata } from '@/types';
import { getRegionalTags, unifiedTagsToLegacy, legacyTagsToUnified } from '@/lib/tags';
import RegionalTagInput from '@/components/RegionalTagInput';

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
  // UNIFIED TAG SYSTEM
  tags_unified?: TagWithMetadata[];
  // LEGACY TAG FIELDS (for backward compatibility)
  tags?: string[];
  regional_tags?: string[];
  tag_source?: 'manual' | null;
  time_added?: string;
  collection_id: string;
  // GPS correlation fields
  user_assigned_date?: string;
  collection?: {
    id: string;
    name: string;
    story_count: number;
    collection_index: number;
    region?: string;
    expedition_phase?: string;
    is_expedition_scope?: boolean;
    collection_start_date?: string;
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
    // UNIFIED TAG SYSTEM
    tags_unified: [] as TagWithMetadata[],
    // LEGACY FIELDS (for backward compatibility)
    tags: [] as string[],
    user_assigned_date: '',
    regional_tags: [] as string[]
  });
  
  // GPS suggestions state
  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsSuggestions, setGpsSuggestions] = useState<GPSCorrelationData | null>(null);
  const [suggestedTags, setSuggestedTags] = useState<TagWithMetadata[]>([]);
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
            tags_unified,
            tags,
            time_added,
            collection_id,
            user_assigned_date,
            regional_tags,
            tag_source,
            story_collections!inner(
              id,
              name,
              story_count,
              collection_index,
              region,
              expedition_phase,
              is_expedition_scope,
              collection_start_date
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
          ...(data as unknown as Story),
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
          
          setCollectionStories((collectionStoriesData as unknown as { id: string; story_index: number; }[]) || []);
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
      // Get unified tags or convert legacy tags if needed
      const unifiedTags = story.tags_unified || 
        (story.tags ? legacyTagsToUnified(story.tags, 'regional', 'manual') : []);
      
      setEditForm({
        location_name: story.location_name || '',
        latitude: story.latitude?.toString() || '',
        longitude: story.longitude?.toString() || '',
        location_confidence: story.location_confidence || '',
        // UNIFIED TAG SYSTEM
        tags_unified: unifiedTags,
        // LEGACY FIELDS (for backward compatibility)
        tags: story.tags || [],
        user_assigned_date: story.user_assigned_date || '',
        regional_tags: unifiedTagsToLegacy(getRegionalTags(unifiedTags))
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
          estimated_date: getBestAvailableDateString(story),
          current_location: {
            location_name: story.location_name,
            latitude: story.latitude,
            longitude: story.longitude,
            location_confidence: story.location_confidence
          },
          current_tags: story.tags,
          tag_source: story.tag_source || undefined
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

  // Save story updates using unified tag system
  const handleSave = async () => {
    if (!story) return;
    
    setIsSaving(true);
    try {
      // Save location data using existing API
      const locationUpdatePayload = {
        location_name: editForm.location_name || undefined,
        latitude: editForm.latitude ? parseFloat(editForm.latitude) : undefined,
        longitude: editForm.longitude ? parseFloat(editForm.longitude) : undefined,
        location_confidence: editForm.location_confidence || undefined,
        user_assigned_date: editForm.user_assigned_date || undefined
      };

      const locationResponse = await fetch(`/api/story/${story.id}/location`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(locationUpdatePayload)
      });

      if (!locationResponse.ok) {
        const errorData = await locationResponse.json();
        throw new Error(errorData.error || 'Failed to update story location');
      }

      // Save unified tags using new API
      const tagsResponse = await fetch(`/api/story/${story.id}/tags`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tags_unified: editForm.tags_unified })
      });

      if (!tagsResponse.ok) {
        const errorData = await tagsResponse.json();
        throw new Error(errorData.error || 'Failed to update story tags');
      }

      const locationResult = await locationResponse.json();
      const tagsResult = await tagsResponse.json();
      
      if (locationResult.success && tagsResult.success) {
        // Update local story state with returned data
        setStory(prevStory => prevStory ? { 
          ...prevStory, 
          ...locationResult.data,
          tags_unified: editForm.tags_unified
        } : null);
        
        // Cache manual date if provided
        if (editForm.user_assigned_date) {
          cacheLastManualDate(editForm.user_assigned_date);
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
    const manuallyChangedDate = editForm.user_assigned_date && 
      editForm.user_assigned_date !== story.user_assigned_date;
    
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
      originalDate: story.user_assigned_date,
      currentDate: editForm.user_assigned_date
    });
    
    if (manuallyChangedDate || tagsWereModified || wasAlreadyManual) {
      return 'manual';
    }
    
    const hasGpsRegional = getRegionalTags(editForm.tags_unified).some(tag => tag.source === 'gps');
    const hasManualTags = editForm.tags_unified.some(tag => tag.source === 'manual');
    
    if (hasGpsRegional && hasManualTags) return 'mixed';
    if (hasGpsRegional) return 'gps_estimated';
    return 'manual';
  };

  // Cancel editing
  const handleCancel = () => {
    if (story) {
      // Get unified tags or convert legacy tags if needed
      const unifiedTags = story.tags_unified || 
        (story.tags ? legacyTagsToUnified(story.tags, 'regional', 'manual') : []);
      
      setEditForm({
        location_name: story.location_name || '',
        latitude: story.latitude?.toString() || '',
        longitude: story.longitude?.toString() || '',
        location_confidence: story.location_confidence || '',
        // UNIFIED TAG SYSTEM
        tags_unified: unifiedTags,
        // LEGACY FIELDS (for backward compatibility)
        tags: story.tags || [],
        user_assigned_date: story.user_assigned_date || '',
        regional_tags: unifiedTagsToLegacy(getRegionalTags(unifiedTags))
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
        user_assigned_date: gpsSuggestions.date_range.start
      }));
    }
    
    if (type === 'tags' || type === 'both') {
      setEditForm(prev => {
        // Use GPS regional tags from suggestions (already TagWithMetadata[])
        const newGpsTags = suggestedTags;
        
        // Merge with existing tags, avoiding duplicates
        const existingTagNames = prev.tags_unified.map(tag => tag.name);
        const uniqueNewTags = newGpsTags.filter(tag => !existingTagNames.includes(tag.name));
        const updatedUnifiedTags = [...prev.tags_unified, ...uniqueNewTags];
        
        return {
          ...prev,
          tags_unified: updatedUnifiedTags,
          // Update legacy fields for backward compatibility
          regional_tags: unifiedTagsToLegacy(getRegionalTags(updatedUnifiedTags)),
          tags: unifiedTagsToLegacy(updatedUnifiedTags)
        };
      });
    }
    
    if (type === 'both' && gpsSuggestions) {
      setEditForm(prev => {
        // Use GPS regional tags from suggestions (already TagWithMetadata[])
        const newGpsTags = suggestedTags;
        
        // Merge with existing tags, avoiding duplicates
        const existingTagNames = prev.tags_unified.map(tag => tag.name);
        const uniqueNewTags = newGpsTags.filter(tag => !existingTagNames.includes(tag.name));
        const updatedUnifiedTags = [...prev.tags_unified, ...uniqueNewTags];
        
        return {
          ...prev,
          user_assigned_date: gpsSuggestions.date_range.start,
          tags_unified: updatedUnifiedTags,
          // Update legacy fields for backward compatibility
          regional_tags: unifiedTagsToLegacy(getRegionalTags(updatedUnifiedTags)),
          tags: unifiedTagsToLegacy(updatedUnifiedTags)
        };
      });
    }
  };
  
  // Use last manual date
  const useLastManualDate = () => {
    const lastDate = getLastManualDate();
    if (lastDate) {
      setEditForm(prev => ({ ...prev, user_assigned_date: lastDate }));
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
                      src={getProxiedImageUrl(story.cdn_url)}
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

                  {(() => {
                    const bestDate = getBestAvailableDate(story);
                    if (!bestDate) return null;
                    
                    const confidence = getDateConfidenceLevel(story);
                    const label = confidence.level === 'high' ? 'Date' : 'Date (estimated)';
                    
                    return (
                      <div>
                        <label className="block text-xs font-medium text-gray-700">
                          {label}
                        </label>
                        <div className="text-sm text-gray-900">
                          {formatDisplayDate(bestDate.toISOString())}
                        </div>
                      </div>
                    );
                  })()}

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
                {isEditing && story?.collection?.is_expedition_scope && (
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
                        {/* Debug info */}
                        <div className="text-xs text-gray-600 mb-2 p-2 bg-gray-100 rounded">
                          Debug: GPS={!!gpsSuggestions}, Tags={suggestedTags.length}, Show={showGpsSuggestions}
                        </div>
                        
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
                                <span key={`${tag.name}-${tag.source}`} className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                                  {tag.name}
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
                        
                        {!gpsSuggestions && suggestedTags.length === 0 && (
                          <div className="bg-yellow-50 border border-yellow-200 rounded p-3">
                            <div className="text-xs font-medium text-yellow-800 mb-1">No GPS Data Found</div>
                            <div className="text-xs text-yellow-700">
                              No GPS correlation available for this collection/date combination.
                              Collection: {story?.collection?.collection_index}, Date: {story?.collection?.collection_start_date || 'None'}
                            </div>
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
                            value={editForm.user_assigned_date?.split('T')[0] || ''}
                            onChange={async (e) => {
                              const dateValue = e.target.value ? e.target.value + 'T12:00:00.000Z' : '';
                              setEditForm(prev => ({ ...prev, user_assigned_date: dateValue }));
                              
                              // Auto-update regional tags when date changes
                              if (dateValue && story?.collection) {
                                try {
                                  const gpsContext = await getStoryGPSContext({
                                    story_id: story.id,
                                    collection_name: story.collection.name,
                                    collection_index: story.collection.collection_index
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
                                  
                                  // Update regional tags based on new date - Unified Tag System
                                  setEditForm(prev => {
                                    // Use GPS regional tags from suggestions (already TagWithMetadata[])
                                    const newGpsTags = gpsContext.suggested_regional_tags;
                                    
                                    // Remove old GPS regional tags and add new ones
                                    const nonGpsRegionalTags = prev.tags_unified.filter(tag => 
                                      !(tag.type === 'regional' && tag.source === 'gps')
                                    );
                                    const updatedUnifiedTags = [...nonGpsRegionalTags, ...newGpsTags];
                                    
                                    return {
                                      ...prev,
                                      tags_unified: updatedUnifiedTags,
                                      // Update legacy fields for backward compatibility
                                      regional_tags: unifiedTagsToLegacy(gpsContext.suggested_regional_tags),
                                      tags: [
                                        ...prev.tags.filter(tag => !prev.regional_tags.includes(tag)), // Remove old regional tags
                                        ...unifiedTagsToLegacy(gpsContext.suggested_regional_tags) // Add new regional tags
                                      ]
                                    };
                                  });
                                  
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
                              if (editForm.user_assigned_date && story?.collection) {
                                setGpsLoading(true);
                                try {
                                  // Refresh GPS context to update suggestions panel
                                  const gpsContext = await getStoryGPSContext({
                                    story_id: story.id,
                                    collection_name: story.collection.name,
                                    collection_index: story.collection.collection_index,
                                    estimated_date: editForm.user_assigned_date,
                                    current_location: {
                                      location_name: story.location_name,
                                      latitude: story.latitude,
                                      longitude: story.longitude,
                                      location_confidence: story.location_confidence
                                    },
                                    current_tags: story.tags,
                                    tag_source: story.tag_source || undefined
                                  });
                                  
                                  // Update suggestions in the GPS Smart Suggestions panel
                                  setGpsSuggestions(gpsContext.gps_suggestions || null);
                                  setSuggestedTags(gpsContext.suggested_regional_tags);
                                  
                                  console.log('GPS suggestions refreshed:', {
                                    gps_suggestions: gpsContext.gps_suggestions,
                                    suggested_regional_tags: gpsContext.suggested_regional_tags
                                  });
                                  
                                } catch (error) {
                                  console.error('Failed to refresh GPS suggestions:', error);
                                } finally {
                                  setGpsLoading(false);
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
                              // Clear all regional tags for pre-expedition dates - Unified Tag System
                              setEditForm(prev => {
                                // Remove all regional tags from unified tags
                                const nonRegionalTags = prev.tags_unified.filter(tag => tag.type !== 'regional');
                                
                                return {
                                  ...prev,
                                  tags_unified: nonRegionalTags,
                                  // Update legacy fields for backward compatibility
                                  regional_tags: [],
                                  tags: unifiedTagsToLegacy(nonRegionalTags)
                                };
                              });
                            }}
                            className="text-xs bg-red-100 hover:bg-red-200 text-red-700 px-2 py-1 rounded"
                            title="Clear regional tags (for pre-expedition dates)"
                          >
                            Clear Tags
                          </button>
                        </div>
                        
                        {story.collection?.collection_start_date && (
                          <div className="text-xs text-gray-500 mt-1">
                            Collection estimate: {formatDisplayDate(story.collection.collection_start_date)}
                          </div>
                        )}
                      </div>
                      
                      <div>
                        <label className="block text-xs font-medium text-gray-700">
                          Date Confidence
                        </label>
                        <div className="text-sm text-gray-600">
                          {getDateConfidenceLevel(story).description}
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

                {/* Tags - Unified Tag System */}
                <div className="border-t border-gray-200 pt-6">
                  <h3 className="text-sm font-medium text-gray-900 mb-3">
                    Tags
                  </h3>
                  
                  {isEditing ? (
                    <RegionalTagInput
                      tags={editForm.tags_unified}
                      onChange={(newTags) => {
                        setEditForm(prev => ({
                          ...prev,
                          tags_unified: newTags,
                          // Update legacy fields for backward compatibility
                          tags: unifiedTagsToLegacy(newTags),
                          regional_tags: unifiedTagsToLegacy(getRegionalTags(newTags))
                        }));
                      }}
                      disabled={false}
                    />
                  ) : (
                    // Display mode - show unified tags or legacy tags
                    <div className="space-y-3">
                      <div className="flex flex-wrap gap-2">
                        {(story.tags_unified?.length || 0) > 0 ? (
                          story.tags_unified!.map((tag, index) => (
                            <div
                              key={`${tag.name}-${index}`}
                              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                                tag.type === 'regional'
                                  ? 'bg-blue-100 text-blue-800 border-blue-200'
                                  : tag.type === 'activity'
                                  ? 'bg-green-100 text-green-800 border-green-200'
                                  : 'bg-orange-100 text-orange-800 border-orange-200'
                              }`}
                            >
                              <span className="text-xs opacity-60 mr-1">
                                {tag.source === 'gps' ? '📍' : 
                                 tag.source === 'manual' ? '✏️' : 
                                 tag.source === 'journal' ? '📔' : '🤖'}
                              </span>
                              {tag.name}
                            </div>
                          ))
                        ) : story.tags?.length ? (
                          // Fallback to legacy tags if no unified tags
                          story.tags.map((tag, index) => (
                            <span
                              key={index}
                              className="inline-flex items-center px-2 py-1 rounded text-xs bg-gray-100 text-gray-800"
                            >
                              {tag}
                            </span>
                          ))
                        ) : (
                          <span className="text-xs text-gray-500">No tags yet</span>
                        )}
                      </div>
                      
                      {/* Tag Source Information */}
                      {story.tag_source && (
                        <div className="text-xs text-gray-600">
                          Legacy Source: 
                          <span className="ml-1 font-medium">
                            {story.tag_source === 'manual' ? 'Manual' :
                              story.tag_source === null ? 'Auto' :
                              story.tag_source || 'N/A'}
                          </span>
                        </div>
                      )}
                    </div>
                  )}
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