'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { isAuthenticated, getCurrentUser } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { StoryCollection } from '@/types';
import MapView from '@/components/MapView';
import Navigation from '@/components/Navigation';

function MapContent() {
  const router = useRouter();
  const [selectedPhase, setSelectedPhase] = useState<string>('all');
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

  // Load collections for expedition phase extraction
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

      setCollections((data as unknown as StoryCollection[]) || []);
    };

    if (user) {
      loadCollections();
    }
  }, [user]);

  const handlePhaseChange = (phase: string) => {
    setSelectedPhase(phase);
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
            <label htmlFor="phase-filter" className="text-sm font-medium text-gray-700">
              🗺️ Filter by Expedition Phase:
            </label>
            <select
              id="phase-filter"
              value={selectedPhase}
              onChange={(e) => handlePhaseChange(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="all">All Phases</option>
              {[...new Set(collections.map(c => c.expedition_phase).filter(Boolean))].map((phase) => (
                <option key={phase} value={phase}>
                  {phase}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Map Container */}
      <div className="h-[calc(100vh-140px)]">
        <MapView selectedPhase={selectedPhase === 'all' ? undefined : selectedPhase} />
      </div>
    </div>
  );
}

export default function MapPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    }>
      <MapContent />
    </Suspense>
  );
}