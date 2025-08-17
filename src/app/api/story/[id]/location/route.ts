import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { validateCoordinates } from '@/lib/gps-correlation'

// Story Location Update API Endpoint
// PUT /api/story/{id}/location

interface StoryLocationUpdateRequest {
  location_name?: string
  latitude?: number  // -90 to 90
  longitude?: number // -180 to 180
  location_confidence?: 'high' | 'medium' | 'low' | 'estimated'
  
  // GPS correlation fields
  user_assigned_date?: string // ISO timestamp (manual user input)
  regional_tags?: string[]
  tag_source?: 'manual' | null
  
  // Manual tags (separate from regional)
  manual_tags?: string[]
}

interface StoryLocationUpdateResponse {
  success: boolean
  data?: {
    id: string
    location_name: string | null
    latitude: number | null
    longitude: number | null
    location_confidence: string | null
    regional_tags: string[]
    tags: string[] // Combined regional + manual tags
    tag_source: string | null
    estimated_date_gps: string | null
    updated_at: string
  }
  error?: string
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const storyId = resolvedParams.id
    
    if (!storyId) {
      return NextResponse.json({
        success: false,
        error: 'Story ID is required'
      }, { status: 400 })
    }

    const body: StoryLocationUpdateRequest = await request.json()
    
    // Validate coordinates if provided
    if (body.latitude !== undefined && body.longitude !== undefined) {
      const coordinateValidation = validateCoordinates(body.latitude, body.longitude)
      if (!coordinateValidation.valid) {
        return NextResponse.json({
          success: false,
          error: 'Invalid coordinates',
          details: { validation_errors: coordinateValidation.errors }
        }, { status: 422 })
      }
    }

    // Validate required fields for location input
    if ((body.latitude || body.longitude) && !body.location_name) {
      return NextResponse.json({
        success: false,
        error: 'Location name is required when coordinates are provided'
      }, { status: 422 })
    }

    // Validate date formats
    if (body.user_assigned_date) {
      try {
        new Date(body.user_assigned_date).toISOString()
      } catch {
        return NextResponse.json({
          success: false,
          error: 'Invalid date format for user_assigned_date'
        }, { status: 422 })
      }
    }

    // First, get the current story to check its collection status
    const { data: currentStory, error: fetchError } = await supabase
      .from('stories')
      .select(`
        *,
        story_collections!inner(
          collection_index,
          is_expedition_scope,
          name
        )
      `)
      .eq('id', storyId)
      .single()

    if (fetchError || !currentStory) {
      return NextResponse.json({
        success: false,
        error: 'Story not found'
      }, { status: 404 })
    }

    // Prevent updates to excluded collections unless explicitly allowing it
    if (!currentStory.story_collections.is_expedition_scope && body.tag_source !== 'excluded') {
      return NextResponse.json({
        success: false,
        error: 'Cannot update location for excluded collection (pre-expedition content)'
      }, { status: 422 })
    }

    // Prepare update data
    const updateData: Record<string, unknown> = {}
    
    // Location fields
    if (body.location_name !== undefined) updateData.location_name = body.location_name
    if (body.latitude !== undefined) updateData.latitude = body.latitude
    if (body.longitude !== undefined) updateData.longitude = body.longitude
    if (body.location_confidence !== undefined) updateData.location_confidence = body.location_confidence
    
    // GPS correlation fields
    if (body.user_assigned_date !== undefined) updateData.user_assigned_date = body.user_assigned_date
    if (body.regional_tags !== undefined) updateData.regional_tags = body.regional_tags
    if (body.tag_source !== undefined) updateData.tag_source = body.tag_source
    
    // Handle combined tags (regional + manual)
    if (body.regional_tags || body.manual_tags) {
      const regionalTags = body.regional_tags || currentStory.regional_tags || []
      const manualTags = body.manual_tags || []
      
      // Combine regional and manual tags, removing duplicates
      const combinedTags = [...new Set([...regionalTags, ...manualTags])]
      updateData.tags = combinedTags
    }

    // Update the story
    const { data: updatedStory, error: updateError } = await supabase
      .from('stories')
      .update(updateData)
      .eq('id', storyId)
      .select(`
        id,
        location_name,
        latitude,
        longitude,
        location_confidence,
        regional_tags,
        tags,
        tag_source,
        user_assigned_date,
        updated_at
      `)
      .single()

    if (updateError) {
      console.error('Story location update error:', updateError)
      return NextResponse.json({
        success: false,
        error: 'Failed to update story location'
      }, { status: 500 })
    }

    const response: StoryLocationUpdateResponse = {
      success: true,
      data: {
        id: updatedStory.id,
        location_name: updatedStory.location_name,
        latitude: updatedStory.latitude ? parseFloat(updatedStory.latitude) : null,
        longitude: updatedStory.longitude ? parseFloat(updatedStory.longitude) : null,
        location_confidence: updatedStory.location_confidence,
        regional_tags: updatedStory.regional_tags || [],
        tags: updatedStory.tags || [],
        tag_source: updatedStory.tag_source,
        estimated_date_gps: updatedStory.user_assigned_date,
        updated_at: updatedStory.updated_at
      }
    }

    return NextResponse.json(response)

  } catch (error) {
    console.error('Story location update error:', error)
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 })
  }
}