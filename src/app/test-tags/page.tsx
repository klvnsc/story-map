'use client';

import { useState } from 'react';
import { TagWithMetadata } from '@/types';
import RegionalTagInput from '@/components/RegionalTagInput';
import { createTag } from '@/lib/tags';

export default function TestTagsPage() {
  const [tags, setTags] = useState<TagWithMetadata[]>([
    createTag('Wales', 'regional', 'gps', 0.9),
    createTag('UK', 'regional', 'manual', 1.0),
    createTag('England', 'regional', 'gps', 0.85),
    createTag('Europe', 'regional', 'manual', 1.0),
  ]);

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">
            Regional Tag Input Test
          </h1>
          
          <div className="space-y-6">
            <RegionalTagInput 
              tags={tags}
              onChange={setTags}
            />
            
            <div className="mt-8 p-4 bg-gray-100 rounded-md">
              <h3 className="text-lg font-semibold mb-3">Test Regional Tag Filtering:</h3>
              <p className="text-sm text-gray-600 mb-4">
                The new StoryBrowser now supports filtering by regional tags from the unified tag system. 
                Try the &quot;📍 Regional Tags&quot; dropdown in the main story browser!
              </p>
              
              <h3 className="text-lg font-semibold mb-3">Current Tags (JSON):</h3>
              <pre className="text-sm bg-white p-3 rounded border overflow-auto">
                {JSON.stringify(tags, null, 2)}
              </pre>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}