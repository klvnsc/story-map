'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { isAuthenticated, getCurrentUser } from '@/lib/auth';
import { fetchTimelineData, generateCSVExport, generateKMLExport, type Timeline } from '@/lib/timeline-data';
import Navigation from '@/components/Navigation';
import TimelineView from '@/components/TimelineView';

function TimelineContent() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<{ username: string } | null>(null);
  const [timeline, setTimeline] = useState<Timeline | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const checkAuthAndLoadData = async () => {
      if (!isAuthenticated()) {
        router.push('/');
        return;
      }

      const currentUser = getCurrentUser();
      setUser(currentUser);

      try {
        const timelineData = await fetchTimelineData();
        setTimeline(timelineData);
      } catch (error) {
        console.error('Failed to load timeline data:', error);
        setError('Failed to load timeline data');
      } finally {
        setIsLoading(false);
      }
    };

    checkAuthAndLoadData();
  }, [router]);

  const handleExport = (format: 'csv' | 'kml') => {
    if (!timeline) return;

    const data = format === 'csv' ? generateCSVExport(timeline) : generateKMLExport(timeline);
    const mimeType = format === 'csv' ? 'text/csv' : 'application/vnd.google-earth.kml+xml';
    const filename = `${timeline.title.toLowerCase().replace(/\s+/g, '-')}.${format}`;

    const blob = new Blob([data], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
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

  if (error || !timeline) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation user={user} />
        <main className="max-w-4xl mx-auto py-6 sm:px-6 lg:px-8">
          <div className="px-4 py-6 sm:px-0">
            <div className="bg-red-50 border border-red-200 rounded-md p-4">
              <div className="text-red-800">
                <h3 className="font-medium">Error Loading Timeline</h3>
                <p className="mt-1 text-sm">{error || 'Unknown error occurred'}</p>
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation user={user} />

      {/* Main Content */}
      <main className="max-w-4xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {/* Header */}
          <div className="mb-8">
            <div className="flex justify-between items-start">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Itinerary</h1>
                <p className="mt-2 text-gray-600">
                  {timeline.days.length} days • {timeline.totalLocations} locations
                </p>
              </div>

              {/* Export Controls */}
              <div className="flex space-x-3">
                <button
                  onClick={() => handleExport('csv')}
                  className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors duration-200"
                >
                  📄 Export CSV
                </button>
                <button
                  onClick={() => handleExport('kml')}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors duration-200"
                >
                  🗺️ Export KML
                </button>
              </div>
            </div>
          </div>

          {/* Timeline */}
          <TimelineView timeline={timeline} />
        </div>
      </main>
    </div>
  );
}

export default function Timeline() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    }>
      <TimelineContent />
    </Suspense>
  );
}