import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { validateCoordinates } from '@/lib/gps-correlation'
import { getRegionalTags, createTag, addTag, unifiedTagsToLegacy } from '@/lib/tags'
import { TagWithMetadata } from '@/types'

// Story Location Update API Endpoint
// PUT /api/story/{id}/location

interface StoryLocationUpdateRequest {
  location_name?: string
  latitude?: number  // -90 to 90
  longitude?: number // -180 to 180
  location_confidence?: 'high' | 'medium' | 'low' | 'estimated'
  
  // GPS correlation fields
  user_assigned_date?: string // ISO timestamp (manual user input)
  regional_tags?: string[] // Legacy format - converted to unified tags internally
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
      .select('*')
      .eq('id', storyId)
      .single()
      
    if (fetchError || !currentStory) {
      return NextResponse.json({
        success: false,
        error: 'Story not found'
      }, { status: 404 })
    }

    // Get the collection data separately
    const { data: collection, error: collectionError } = await supabase
      .from('story_collections')
      .select('collection_index, is_expedition_scope, name')
      .eq('id', currentStory.collection_id as string)
      .single()

    if (collectionError || !collection) {
      return NextResponse.json({
        success: false,
        error: 'Collection not found'
      }, { status: 404 })
    }

    // Prevent updates to excluded collections unless explicitly allowing it
    if (!collection.is_expedition_scope) {
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
    if (body.tag_source !== undefined) updateData.tag_source = body.tag_source
    
    // Handle unified tags - convert legacy regional_tags to unified format
    if (body.regional_tags || body.manual_tags) {
      let currentUnifiedTags: TagWithMetadata[] = (currentStory.tags_unified as TagWithMetadata[]) || []
      
      // If regional_tags provided, update regional tags in unified format
      if (body.regional_tags !== undefined) {
        // Remove existing regional tags
        currentUnifiedTags = currentUnifiedTags.filter(tag => tag.type !== 'regional')
        
        // Add new regional tags
        body.regional_tags.forEach(tagName => {
          const newTag = createTag(tagName, 'regional', 'manual')
          currentUnifiedTags = addTag(currentUnifiedTags, newTag)
        })
      }
      
      // If manual_tags provided, update activity tags  
      if (body.manual_tags !== undefined) {
        // Remove existing manual activity tags
        currentUnifiedTags = currentUnifiedTags.filter(tag => 
          !(tag.type === 'activity' && tag.source === 'manual')
        )
        
        // Add new manual activity tags
        body.manual_tags.forEach(tagName => {
          const newTag = createTag(tagName, 'activity', 'manual')
          currentUnifiedTags = addTag(currentUnifiedTags, newTag)
        })
      }
      
      // Update unified tags
      updateData.tags_unified = currentUnifiedTags
      
      // Update legacy fields for backward compatibility
      const regionalTags = getRegionalTags(currentUnifiedTags)
      updateData.regional_tags = unifiedTagsToLegacy(regionalTags)
      updateData.tags = unifiedTagsToLegacy(currentUnifiedTags)
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
        tags_unified,
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

    // Generate legacy fields from unified tags for response
    const unifiedTags: TagWithMetadata[] = (updatedStory.tags_unified as TagWithMetadata[]) || []
    const regionalTags = getRegionalTags(unifiedTags)
    
    const response: StoryLocationUpdateResponse = {
      success: true,
      data: {
        id: updatedStory.id as string,
        location_name: updatedStory.location_name as string | null,
        latitude: updatedStory.latitude ? parseFloat(updatedStory.latitude as string) : null,
        longitude: updatedStory.longitude ? parseFloat(updatedStory.longitude as string) : null,
        location_confidence: updatedStory.location_confidence as 'high' | 'medium' | 'low' | 'estimated' | null,
        regional_tags: unifiedTagsToLegacy(regionalTags),
        tags: unifiedTagsToLegacy(unifiedTags),
        tag_source: updatedStory.tag_source as 'gps_estimated' | 'manual' | 'mixed' | 'excluded' | null,
        estimated_date_gps: updatedStory.user_assigned_date as string | null,
        updated_at: updatedStory.updated_at as string
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