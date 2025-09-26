import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { TimelineLocation, CreateTimelineLocationRequest } from '@/types/timeline-locations';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// GET /api/locations - List all timeline locations
export async function GET() {
  try {
    const { data: locations, error } = await supabase
      .from('timeline_locations')
      .select('*')
      .order('name');

    if (error) {
      console.error('Error fetching locations:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch locations' },
        { status: 500 }
      );
    }

    // Transform database results to match TypeScript interface
    const transformedLocations: TimelineLocation[] = locations.map(location => ({
      id: location.id,
      name: location.name,
      coordinates: location.coordinates,
      place_id: location.place_id,
      formatted_address: location.formatted_address,
      place_name: location.place_name,
      is_place_id_validated: location.is_place_id_validated,
      is_timeline_location: location.is_timeline_location,
      created_at: location.created_at,
      updated_at: location.updated_at
    }));

    return NextResponse.json({
      success: true,
      data: transformedLocations
    });

  } catch (error) {
    console.error('Unexpected error in GET /api/locations:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/locations - Create new timeline location
export async function POST(request: NextRequest) {
  try {
    const body: CreateTimelineLocationRequest = await request.json();

    // Validate required fields
    if (!body.name || !body.coordinates || !body.coordinates.lat || !body.coordinates.lng) {
      return NextResponse.json(
        { success: false, error: 'Name and coordinates are required' },
        { status: 400 }
      );
    }

    const { data: location, error } = await supabase
      .from('timeline_locations')
      .insert([{
        name: body.name,
        coordinates: body.coordinates,
        place_id: body.place_id || null,
        formatted_address: body.formatted_address || null,
        place_name: body.place_name || null,
        is_place_id_validated: body.is_place_id_validated || false
      }])
      .select()
      .single();

    if (error) {
      console.error('Error creating location:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to create location' },
        { status: 500 }
      );
    }

    // Transform database result to match TypeScript interface
    const transformedLocation: TimelineLocation = {
      id: location.id,
      name: location.name,
      coordinates: location.coordinates,
      place_id: location.place_id,
      formatted_address: location.formatted_address,
      place_name: location.place_name,
      is_place_id_validated: location.is_place_id_validated,
      is_timeline_location: location.is_timeline_location,
      created_at: location.created_at,
      updated_at: location.updated_at
    };

    return NextResponse.json({
      success: true,
      data: transformedLocation
    });

  } catch (error) {
    console.error('Unexpected error in POST /api/locations:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}