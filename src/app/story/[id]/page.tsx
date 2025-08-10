'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { isAuthenticated, getCurrentUser } from '@/lib/auth';
import Navigation from '@/components/Navigation';
import { supabase } from '@/lib/supabase';
import { getProxiedImageUrl } from '@/lib/utils';

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
  collection?: {
    id: string;
    name: string;
    story_count: number;
    collection_index: number;
    region?: string;
    expedition_phase?: string;
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
    notes: ''
  });

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
            story_collections!inner(
              id,
              name,
              story_count,
              collection_index,
              region,
              expedition_phase
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
        notes: '' // Add notes field to Story interface if needed
      });
    }
  }, [story]);

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

  // Save story updates
  const handleSave = async () => {
    if (!story) return;
    
    setIsSaving(true);
    try {
      const updates: Partial<Story> = {
        location_name: editForm.location_name || null,
        latitude: editForm.latitude ? parseFloat(editForm.latitude) : null,
        longitude: editForm.longitude ? parseFloat(editForm.longitude) : null,
        location_confidence: editForm.location_confidence as Story['location_confidence'] || null,
        tags: editForm.tags.length > 0 ? editForm.tags : null
      };

      const { error } = await supabase
        .from('stories')
        .update(updates)
        .eq('id', story.id);

      if (error) {
        console.error('Error updating story:', error);
        alert('Failed to save changes: ' + error.message);
        return;
      }

      // Update local story state
      setStory(prevStory => prevStory ? { ...prevStory, ...updates } : null);
      setIsEditing(false);
      alert('Story updated successfully!');
      
    } catch (error) {
      console.error('Error saving story:', error);
      alert('Failed to save changes');
    } finally {
      setIsSaving(false);
    }
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
        notes: ''
      });
    }
    setIsEditing(false);
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

                  {story.estimated_date && (
                    <div>
                      <label className="block text-xs font-medium text-gray-700">
                        Estimated Date
                      </label>
                      <div className="text-sm text-gray-900">
                        {new Date(story.estimated_date).toLocaleDateString()}
                      </div>
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

                {/* Tags and Notes */}
                <div className="border-t border-gray-200 pt-6">
                  <h3 className="text-sm font-medium text-gray-900 mb-3">
                    Tags & Notes
                  </h3>
                  
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-700">
                        Tags
                      </label>
                      <div className="mt-1 flex flex-wrap gap-1 min-h-[2rem] p-2 border border-gray-300 rounded-md">
                        {story.tags && story.tags.length > 0 ? (
                          story.tags.map((tag, index) => (
                            <span
                              key={index}
                              className="inline-flex items-center px-2 py-1 rounded text-xs bg-blue-100 text-blue-800"
                            >
                              {tag}
                            </span>
                          ))
                        ) : (
                          <span className="text-xs text-gray-500">No tags yet</span>
                        )}
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-700">
                        Notes
                      </label>
                      <textarea
                        rows={4}
                        value={isEditing ? editForm.notes : ''}
                        placeholder="Add notes about this story..."
                        onChange={(e) => setEditForm(prev => ({ ...prev, notes: e.target.value }))}
                        className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md text-sm disabled:bg-gray-50"
                        disabled={!isEditing}
                      />
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="border-t border-gray-200 pt-6 mt-6">
                  {isEditing ? (
                    <div className="space-y-3">
                      <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
                        <div className="text-sm text-blue-800">
                          <strong>Editing Mode:</strong> Make your changes above and click &quot;Save&quot; to update the story location data for map display.
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
                    >
                      Edit Location Data
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