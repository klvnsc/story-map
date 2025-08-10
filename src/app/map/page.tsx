'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { isAuthenticated, getCurrentUser } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { StoryCollection } from '@/types';
import MapView from '@/components/MapView';
import Navigation from '@/components/Navigation';

export default function MapPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const selectedCollectionId = searchParams.get('collection');
  
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<{ username: string } | null>(null);
  const [collections, setCollections] = useState<StoryCollection[]>([]);

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

  // Load collections for filter dropdown
  useEffect(() => {
    const loadCollections = async () => {
      const { data, error } = await supabase
        .from('story_collections')
        .select('*')
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error loading collections:', error);
        return;
      }

      setCollections(data || []);
    };

    if (user) {
      loadCollections();
    }
  }, [user]);

  const handleCollectionChange = (collectionId: string) => {
    const url = new URL(window.location.href);
    if (collectionId === 'all') {
      url.searchParams.delete('collection');
    } else {
      url.searchParams.set('collection', collectionId);
    }
    router.push(url.pathname + url.search);
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

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation user={user} />
      
      {/* Map Controls */}
      <div className="bg-white border-b border-gray-200 px-4 py-3">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold text-gray-900">Story Map</h1>
          
          <div className="flex items-center space-x-4">
            <label htmlFor="collection-filter" className="text-sm font-medium text-gray-700">
              Filter by Collection:
            </label>
            <select
              id="collection-filter"
              value={selectedCollectionId || 'all'}
              onChange={(e) => handleCollectionChange(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="all">All Collections</option>
              {collections.map((collection) => (
                <option key={collection.id} value={collection.id}>
                  {collection.name} ({collection.story_count} stories)
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Map Container */}
      <div className="h-[calc(100vh-140px)]">
        <MapView selectedCollectionId={selectedCollectionId || undefined} />
      </div>
    </div>
  );
}