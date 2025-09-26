import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { TimelineLocation, UpdateTimelineLocationRequest } from '@/types/timeline-locations';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// PUT /api/locations/[id] - Update existing timeline location
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: locationId } = await params;
    const body: UpdateTimelineLocationRequest = await request.json();

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(locationId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid location ID format' },
        { status: 400 }
      );
    }

    // Build update object with only provided fields
    const updateData: Record<string, unknown> = {};
    if (body.name !== undefined) updateData.name = body.name;
    if (body.coordinates !== undefined) updateData.coordinates = body.coordinates;
    if (body.place_id !== undefined) updateData.place_id = body.place_id;
    if (body.formatted_address !== undefined) updateData.formatted_address = body.formatted_address;
    if (body.place_name !== undefined) updateData.place_name = body.place_name;
    if (body.is_place_id_validated !== undefined) updateData.is_place_id_validated = body.is_place_id_validated;

    // Always update the updated_at timestamp
    updateData.updated_at = new Date().toISOString();

    const { data: location, error } = await supabase
      .from('timeline_locations')
      .update(updateData)
      .eq('id', locationId)
      .select()
      .single();

    if (error) {
      console.error('Error updating location:', error);
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { success: false, error: 'Location not found' },
          { status: 404 }
        );
      }
      return NextResponse.json(
        { success: false, error: 'Failed to update location' },
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
    console.error('Unexpected error in PUT /api/locations/[id]:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET /api/locations/[id] - Get specific timeline location
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: locationId } = await params;

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(locationId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid location ID format' },
        { status: 400 }
      );
    }

    const { data: location, error } = await supabase
      .from('timeline_locations')
      .select('*')
      .eq('id', locationId)
      .single();

    if (error) {
      console.error('Error fetching location:', error);
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { success: false, error: 'Location not found' },
          { status: 404 }
        );
      }
      return NextResponse.json(
        { success: false, error: 'Failed to fetch location' },
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
    console.error('Unexpected error in GET /api/locations/[id]:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}