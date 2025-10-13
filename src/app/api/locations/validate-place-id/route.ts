import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { searchPlace } from '@/lib/google-places';
import { ValidatePlaceIdRequest, ValidatePlaceIdResponse } from '@/types/timeline-locations';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// POST /api/locations/validate-place-id - Validate place ID using Google Places API
export async function POST(request: NextRequest) {
  try {
    const body: ValidatePlaceIdRequest = await request.json();

    // Validate required fields
    if (!body.locationId || !body.placeName) {
      return NextResponse.json(
        { success: false, error: 'Location ID and place name are required' },
        { status: 400 }
      );
    }

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(body.locationId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid location ID format' },
        { status: 400 }
      );
    }

    // Check if location exists in database
    const { data: location, error: fetchError } = await supabase
      .from('timeline_locations')
      .select('id')
      .eq('id', body.locationId)
      .single();

    if (fetchError || !location) {
      return NextResponse.json(
        { success: false, error: 'Location not found' },
        { status: 404 }
      );
    }

    // Perform Google Places API validation
    try {
      const placeResult = await searchPlace({
        query: body.placeName,
        location: 'Ho Chi Minh City, Vietnam',
        radius: 25000 // 25km search radius
      });

      if (!placeResult) {
        // No valid place found
        const validationResponse: ValidatePlaceIdResponse = {
          valid: false,
          error: 'No matching place found in Google Places API'
        };

        return NextResponse.json({
          success: true,
          data: validationResponse
        });
      }

      // Valid place found - update location in database
      const { error: updateError } = await supabase
        .from('timeline_locations')
        .update({
          place_name: body.placeName,
          place_id: placeResult.placeId,
          formatted_address: placeResult.formattedAddress,
          coordinates: placeResult.coordinates,
          is_place_id_validated: true,
          updated_at: new Date().toISOString()
        })
        .eq('id', body.locationId);

      if (updateError) {
        console.error('Error updating location with validated data:', updateError);
        return NextResponse.json(
          { success: false, error: 'Failed to update location with validation results' },
          { status: 500 }
        );
      }

      // Return successful validation response
      const validationResponse: ValidatePlaceIdResponse = {
        valid: true,
        placeData: placeResult
      };

      return NextResponse.json({
        success: true,
        data: validationResponse
      });

    } catch (googleApiError) {
      console.error('Google Places API error:', googleApiError);

      const validationResponse: ValidatePlaceIdResponse = {
        valid: false,
        error: 'Google Places API error - please try again later'
      };

      return NextResponse.json({
        success: true,
        data: validationResponse
      });
    }

  } catch (error) {
    console.error('Unexpected error in POST /api/locations/validate-place-id:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}