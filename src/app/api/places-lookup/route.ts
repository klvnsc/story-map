import { NextResponse } from 'next/server';
import { enhancedLocationLookup, getCacheStats } from '@/lib/google-places';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');
    const action = searchParams.get('action');

    // Handle cache stats request
    if (action === 'cache-stats') {
      const stats = getCacheStats();
      return NextResponse.json({
        success: true,
        data: stats
      });
    }

    if (!query) {
      return NextResponse.json({
        success: false,
        error: 'Query parameter "q" is required'
      }, { status: 400 });
    }

    console.log(`Places API lookup request: "${query}"`);

    // Use enhanced lookup (static + dynamic fallback)
    const result = await enhancedLocationLookup(query);

    if (!result) {
      return NextResponse.json({
        success: false,
        error: `No place found for query: ${query}`,
        query
      }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: result,
      query,
      source: result.confidence === 'high' && !result.rating ? 'static_database' : 'google_places_api'
    });

  } catch (error) {
    console.error('Places lookup API error:', error);

    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { locations, rateLimitMs = 200 } = body;

    if (!Array.isArray(locations) || locations.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Request body must contain a "locations" array'
      }, { status: 400 });
    }

    console.log(`Batch places lookup for ${locations.length} locations`);

    const { batchLocationLookup } = await import('@/lib/google-places');
    const results = await batchLocationLookup(locations, rateLimitMs);

    // Convert Map to Object for JSON response
    const resultsObj = Object.fromEntries(results);

    return NextResponse.json({
      success: true,
      data: resultsObj,
      processed: locations.length,
      found: Array.from(results.values()).filter(result => result !== null).length
    });

  } catch (error) {
    console.error('Batch places lookup API error:', error);

    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    }, { status: 500 });
  }
}