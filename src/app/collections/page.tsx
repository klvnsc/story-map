'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { isAuthenticated, getCurrentUser } from '@/lib/auth';
import Navigation from '@/components/Navigation';
import { supabase } from '@/lib/supabase';

interface Collection {
  id: string;
  name: string;
  story_count: number;
  region?: string;
  expedition_phase?: string;
  collection_start_date?: string;
  is_expedition_scope?: boolean;
}

export default function Collections() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<{ username: string } | null>(null);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [collectionsLoading, setCollectionsLoading] = useState(true);
  const [actualStoryCount, setActualStoryCount] = useState<number>(0);

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
    const fetchCollections = async () => {
      console.log('🔍 Starting to fetch collections...');
      try {
        console.log('📡 Supabase URL:', process.env.NEXT_PUBLIC_SUPABASE_URL?.substring(0, 30));
        console.log('🔑 Has Supabase key:', !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
        
        const { data, error } = await supabase
          .from('story_collections')
          .select('*')
          .order('collection_start_date', { ascending: true });

        console.log('📊 Query result:', { data: data?.length || 0, error });
        if (error) throw error;
        
        console.log('✅ Collections fetched:', data?.length || 0);
        setCollections((data as unknown as Collection[]) || []);
      } catch (error) {
        console.error('❌ Error fetching collections:', error);
      } finally {
        setCollectionsLoading(false);
      }
    };

    const fetchActualStoryCount = async () => {
      try {
        const { count, error } = await supabase
          .from('stories')
          .select('*', { count: 'exact', head: true });

        if (error) throw error;
        setActualStoryCount(count || 0);
      } catch (error) {
        console.error('Error fetching actual story count:', error);
      }
    };

    if (user) {
      console.log('👤 User authenticated, fetching data...');
      fetchCollections();
      fetchActualStoryCount();
    } else {
      console.log('🚫 No user found, skipping data fetch');
    }
  }, [user]);

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

  // Use actual story count from database instead of stale metadata
  const totalStories = actualStoryCount;
  const uniqueRegions = [...new Set(collections.map(c => c.region).filter(Boolean))];
  const uniquePhases = [...new Set(collections.map(c => c.expedition_phase).filter(Boolean))];

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation user={user} />
      
      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Story Collections</h1>
            <p className="mt-2 text-gray-600">
              Browse {collections.length} highlight collections from Cyrus&apos;s 13-month expedition
            </p>
          </div>

          {/* Stats Overview */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Total Collections
              </h3>
              <p className="text-3xl font-bold text-indigo-600">{collections.length}</p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Total Stories
              </h3>
              <p className="text-3xl font-bold text-green-600">{totalStories.toLocaleString()}</p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Regions Covered
              </h3>
              <p className="text-3xl font-bold text-orange-600">{uniqueRegions.length}</p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Expedition Phases
              </h3>
              <p className="text-3xl font-bold text-purple-600">{uniquePhases.length}</p>
            </div>
          </div>

          {/* Collections Grid */}
          {collectionsLoading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {collections.map((collection) => (
                <div
                  key={collection.id}
                  onClick={() => router.push(`/stories?collection=${collection.id}`)}
                  className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow duration-200 cursor-pointer overflow-hidden"
                >
                  <div className="p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      {collection.name}
                    </h3>
                    
                    <div className="space-y-2 text-sm text-gray-600">
                      <div className="flex items-center justify-between">
                        <span>Stories:</span>
                        <span className="font-medium text-indigo-600">
                          {collection.story_count}
                        </span>
                      </div>
                      
                      {collection.region && (
                        <div className="flex items-center justify-between">
                          <span>Region:</span>
                          <span className="font-medium">{collection.region}</span>
                        </div>
                      )}
                      
                      {collection.expedition_phase && (
                        <div className="flex items-center justify-between">
                          <span>Phase:</span>
                          <span className="font-medium">{collection.expedition_phase}</span>
                        </div>
                      )}
                      
                      {collection.collection_start_date && (
                        <div className="flex items-center justify-between">
                          <span>Date:</span>
                          <span className="font-medium">
                            {new Date(collection.collection_start_date).toLocaleDateString()}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="px-6 py-3 bg-gray-50 border-t border-gray-200">
                    <div className="text-xs text-gray-500 text-center">
                      Click to view stories
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}