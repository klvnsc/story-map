'use client';

import { useRef } from 'react';
import { useGoogleMapsSimple } from '@/hooks/useGoogleMapsSimple';

export default function TestMaps() {
  const mapContainerRef = useRef<HTMLDivElement>(null);

  // Test with a simple Ho Chi Minh City center
  const { isLoaded, isError, error } = useGoogleMapsSimple({
    containerRef: mapContainerRef,
    center: { lat: 10.8231, lng: 106.6297 }, // Ho Chi Minh City center
    zoom: 12,
    options: {
      streetViewControl: false,
      fullscreenControl: false,
      mapTypeControl: false,
      zoomControl: true,
    }
  });

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Google Maps Integration Test</h1>

          {/* Status Display */}
          <div className={`p-4 rounded-lg mb-4 ${
            isError
              ? 'bg-red-50 text-red-800'
              : isLoaded
              ? 'bg-green-50 text-green-800'
              : 'bg-blue-50 text-blue-800'
          }`}>
            {isError && (
              <div className="flex items-center">
                <span className="text-red-600 mr-2">❌</span>
                Google Maps Test Failed: {error}
              </div>
            )}
            {isLoaded && !isError && (
              <div className="flex items-center">
                <span className="text-green-600 mr-2">✅</span>
                Google Maps API loaded successfully! The timeline integration should work properly.
              </div>
            )}
            {!isLoaded && !isError && (
              <div className="flex items-center">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
                Testing Google Maps API - Loading simple map test...
              </div>
            )}
          </div>

          <div className="mt-4 flex space-x-4">
            <a
              href="/timeline"
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
            >
              Go to Timeline with Maps
            </a>
            <button
              onClick={() => window.location.reload()}
              className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
            >
              Reload Test
            </button>
          </div>
        </div>

        {/* Map Container - Always Rendered */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <div className="p-4 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">Map Display Test</h2>
            <p className="text-sm text-gray-500">
              Center: Ho Chi Minh City (10.8231, 106.6297) • Zoom: 12
            </p>
          </div>
          <div
            ref={mapContainerRef}
            className="w-full h-96"
            style={{ minHeight: '400px' }}
          />
        </div>

        <div className="mt-6 bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-3">API Status</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div>
              <span className="font-medium text-gray-700">API Key:</span>
              <span className={`ml-2 ${isError ? 'text-red-600' : 'text-green-600'}`}>
                {isError ? '❌ Invalid' : '✅ Valid'}
              </span>
            </div>
            <div>
              <span className="font-medium text-gray-700">Loading:</span>
              <span className={`ml-2 ${isError ? 'text-red-600' : isLoaded ? 'text-green-600' : 'text-blue-600'}`}>
                {isError ? '❌ Failed' : isLoaded ? '✅ Success' : '🔄 Loading'}
              </span>
            </div>
            <div>
              <span className="font-medium text-gray-700">Map Instance:</span>
              <span className={`ml-2 ${isError ? 'text-red-600' : isLoaded ? 'text-green-600' : 'text-gray-500'}`}>
                {isError ? '❌ Failed' : isLoaded ? '✅ Created' : '⏳ Pending'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}