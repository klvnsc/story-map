import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Timeline Location Creation API
// Handles adding new locations to specific timeline days

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export interface CreateTimelineLocationRequest {
  name: string;                    // Display name ("The Secret Garden Restaurant")
  place_name?: string;             // Google Places search name
  day_number: number;              // Which day (1-6)
  coordinates?: {                  // Optional if place_name provided
    lat: number;
    lng: number;
  };
}

export interface CreateTimelineLocationResponse {
  success: boolean;
  location?: TimelineLocationResult;
  error?: string;
}

interface TimelineLocationResult {
  id: string;
  name: string;
  coordinates: {
    lat: number;
    lng: number;
  };
  place_id?: string;
  formatted_address?: string;
  place_name?: string;
  is_place_id_validated: boolean;
  timeline_day_number: number;
  timeline_sequence: number;
  is_timeline_location: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Calculate next sequence number for a timeline day
 */
async function getNextSequenceForDay(dayNumber: number): Promise<number> {
  const { data, error } = await supabase
    .from('timeline_locations')
    .select('timeline_sequence')
    .eq('is_timeline_location', true)
    .eq('timeline_day_number', dayNumber)
    .order('timeline_sequence', { ascending: false })
    .limit(1);

  if (error) {
    console.error('Error fetching max sequence:', error);
    throw new Error('Failed to calculate sequence number');
  }

  // If no locations for this day, start with sequence 1
  if (!data || data.length === 0) {
    return 1;
  }

  // Add to end: max sequence + 1
  return (data[0].timeline_sequence || 0) + 1;
}

/**
 * Validate request data
 */
function validateRequest(request: CreateTimelineLocationRequest): string | null {
  if (!request.name?.trim()) {
    return 'Location name is required';
  }

  if (!request.day_number || request.day_number < 1 || request.day_number > 6) {
    return 'Day number must be between 1 and 6';
  }

  // If no place_name provided, coordinates are required
  if (!request.place_name && !request.coordinates) {
    return 'Either place_name or coordinates must be provided';
  }

  if (request.coordinates) {
    const { lat, lng } = request.coordinates;
    if (typeof lat !== 'number' || typeof lng !== 'number') {
      return 'Coordinates must be valid numbers';
    }
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      return 'Coordinates must be valid latitude/longitude values';
    }
  }

  return null; // Valid
}

/**
 * Create timeline location
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body: CreateTimelineLocationRequest = await request.json();

    // Validate request
    const validationError = validateRequest(body);
    if (validationError) {
      return NextResponse.json({
        success: false,
        error: validationError
      }, { status: 400 });
    }

    // Calculate next sequence number for the day
    const nextSequence = await getNextSequenceForDay(body.day_number);

    // Prepare location data
    const locationData = {
      name: body.name.trim(),
      place_name: body.place_name?.trim() || null,
      coordinates: body.coordinates || { lat: 0, lng: 0 }, // Default coordinates if none provided
      timeline_day_number: body.day_number,
      timeline_sequence: nextSequence,
      is_timeline_location: true,
      is_place_id_validated: false, // Will be updated if place validation is performed
      place_id: null,              // Will be updated if place validation is performed
      formatted_address: null      // Will be updated if place validation is performed
    };

    // Insert into database
    const { data: newLocation, error: insertError } = await supabase
      .from('timeline_locations')
      .insert([locationData])
      .select()
      .single();

    if (insertError) {
      console.error('Database insert error:', insertError);
      return NextResponse.json({
        success: false,
        error: 'Failed to create timeline location'
      }, { status: 500 });
    }

    // Format response
    const result: TimelineLocationResult = {
      id: newLocation.id,
      name: newLocation.name,
      coordinates: newLocation.coordinates,
      place_id: newLocation.place_id,
      formatted_address: newLocation.formatted_address,
      place_name: newLocation.place_name,
      is_place_id_validated: newLocation.is_place_id_validated,
      timeline_day_number: newLocation.timeline_day_number,
      timeline_sequence: newLocation.timeline_sequence,
      is_timeline_location: newLocation.is_timeline_location,
      created_at: newLocation.created_at,
      updated_at: newLocation.updated_at
    };

    return NextResponse.json({
      success: true,
      location: result
    });

  } catch (error) {
    console.error('Timeline location creation error:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 });
  }
}

/**
 * Get timeline locations for a specific day
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url);
    const dayNumber = searchParams.get('day');

    if (!dayNumber) {
      return NextResponse.json({
        success: false,
        error: 'Day number is required'
      }, { status: 400 });
    }

    const dayNum = parseInt(dayNumber);
    if (dayNum < 1 || dayNum > 6) {
      return NextResponse.json({
        success: false,
        error: 'Day number must be between 1 and 6'
      }, { status: 400 });
    }

    // Fetch timeline locations for the day
    const { data: locations, error } = await supabase
      .from('timeline_locations')
      .select('*')
      .eq('is_timeline_location', true)
      .eq('timeline_day_number', dayNum)
      .order('timeline_sequence', { ascending: true });

    if (error) {
      console.error('Error fetching timeline locations:', error);
      return NextResponse.json({
        success: false,
        error: 'Failed to fetch timeline locations'
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      locations: locations || []
    });

  } catch (error) {
    console.error('Timeline locations fetch error:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 });
  }
}

export interface ReorderLocationRequest {
  locationId: string;
  newSequence: number;
  dayNumber: number;
}

export interface DeleteLocationRequest {
  locationId: string;
}

/**
 * Update sequence order for timeline locations (reorder)
 */
export async function PATCH(request: NextRequest): Promise<NextResponse> {
  try {
    const body: ReorderLocationRequest = await request.json();

    if (!body.locationId || !body.newSequence || !body.dayNumber) {
      return NextResponse.json({
        success: false,
        error: 'locationId, newSequence, and dayNumber are required'
      }, { status: 400 });
    }

    if (body.newSequence < 1) {
      return NextResponse.json({
        success: false,
        error: 'Sequence must be positive'
      }, { status: 400 });
    }

    // Start a transaction to reorder sequences
    // First, get all locations for this day
    const { data: dayLocations, error: fetchError } = await supabase
      .from('timeline_locations')
      .select('id, timeline_sequence')
      .eq('is_timeline_location', true)
      .eq('timeline_day_number', body.dayNumber)
      .order('timeline_sequence', { ascending: true });

    if (fetchError) {
      console.error('Error fetching day locations for reorder:', fetchError);
      return NextResponse.json({
        success: false,
        error: 'Failed to fetch timeline locations'
      }, { status: 500 });
    }

    if (!dayLocations || dayLocations.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No locations found for this day'
      }, { status: 404 });
    }

    // Find the location being moved
    const locationIndex = dayLocations.findIndex(loc => loc.id === body.locationId);
    if (locationIndex === -1) {
      return NextResponse.json({
        success: false,
        error: `Location not found in this day. Looking for ID: ${body.locationId}, Available IDs: ${dayLocations.map(loc => loc.id).join(', ')}`
      }, { status: 404 });
    }

    // Reorder the array
    const reorderedLocations = [...dayLocations];
    const [movedLocation] = reorderedLocations.splice(locationIndex, 1);
    reorderedLocations.splice(body.newSequence - 1, 0, movedLocation);

    // Update sequences in database
    const updates = reorderedLocations.map((location, index) => ({
      id: location.id,
      timeline_sequence: index + 1
    }));

    // Batch update all sequences
    for (const update of updates) {
      const { error: updateError } = await supabase
        .from('timeline_locations')
        .update({ timeline_sequence: update.timeline_sequence })
        .eq('id', update.id);

      if (updateError) {
        console.error('Error updating sequence:', updateError);
        return NextResponse.json({
          success: false,
          error: 'Failed to update location sequences'
        }, { status: 500 });
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Location order updated successfully'
    });

  } catch (error) {
    console.error('Timeline location reorder error:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 });
  }
}

/**
 * Delete timeline location
 */
export async function DELETE(request: NextRequest): Promise<NextResponse> {
  try {
    const body: DeleteLocationRequest = await request.json();

    if (!body.locationId) {
      return NextResponse.json({
        success: false,
        error: 'locationId is required'
      }, { status: 400 });
    }

    // First get the location to check it exists and get its day/sequence
    const { data: location, error: fetchError } = await supabase
      .from('timeline_locations')
      .select('id, timeline_day_number, timeline_sequence')
      .eq('id', body.locationId)
      .eq('is_timeline_location', true)
      .single();

    if (fetchError || !location) {
      console.error('Location not found:', fetchError);
      return NextResponse.json({
        success: false,
        error: 'Timeline location not found'
      }, { status: 404 });
    }

    // Delete the location
    const { error: deleteError } = await supabase
      .from('timeline_locations')
      .delete()
      .eq('id', body.locationId);

    if (deleteError) {
      console.error('Error deleting location:', deleteError);
      return NextResponse.json({
        success: false,
        error: 'Failed to delete timeline location'
      }, { status: 500 });
    }

    // Now resequence remaining locations in the day
    const { data: remainingLocations, error: remainingError } = await supabase
      .from('timeline_locations')
      .select('id')
      .eq('is_timeline_location', true)
      .eq('timeline_day_number', location.timeline_day_number)
      .order('timeline_sequence', { ascending: true });

    if (remainingError) {
      console.error('Error fetching remaining locations:', remainingError);
      // Don't fail the delete operation, but log the error
    } else if (remainingLocations && remainingLocations.length > 0) {
      // Update sequences to be consecutive (1, 2, 3, ...)
      for (let i = 0; i < remainingLocations.length; i++) {
        const { error: updateError } = await supabase
          .from('timeline_locations')
          .update({ timeline_sequence: i + 1 })
          .eq('id', remainingLocations[i].id);

        if (updateError) {
          console.error('Error resequencing after delete:', updateError);
          // Continue with other updates
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Location deleted successfully'
    });

  } catch (error) {
    console.error('Timeline location delete error:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 });
  }
}