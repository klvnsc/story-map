import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase';
import { TagWithMetadata } from '@/types';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = createClient();
    const { tags_unified }: { tags_unified: TagWithMetadata[] } = await request.json();
    const resolvedParams = await params;
    
    if (!resolvedParams.id) {
      return NextResponse.json(
        { error: 'Story ID is required' },
        { status: 400 }
      );
    }

    // Validate tags structure
    if (!Array.isArray(tags_unified)) {
      return NextResponse.json(
        { error: 'tags_unified must be an array' },
        { status: 400 }
      );
    }

    // Validate each tag
    for (const tag of tags_unified) {
      if (!tag.name || !tag.type || !tag.source || !tag.created_at) {
        return NextResponse.json(
          { error: 'Each tag must have name, type, source, and created_at' },
          { status: 400 }
        );
      }

      if (!['regional', 'activity', 'emotion'].includes(tag.type)) {
        return NextResponse.json(
          { error: 'Invalid tag type. Must be regional, activity, or emotion' },
          { status: 400 }
        );
      }

      if (!['gps', 'manual', 'journal', 'ai'].includes(tag.source)) {
        return NextResponse.json(
          { error: 'Invalid tag source. Must be gps, manual, journal, or ai' },
          { status: 400 }
        );
      }
    }

    // Update the story with new tags
    const { data, error } = await supabase
      .from('stories')
      .update({ 
        tags_unified,
        updated_at: new Date().toISOString()
      })
      .eq('id', resolvedParams.id)
      .select()
      .single();

    if (error) {
      console.error('Supabase error:', error);
      return NextResponse.json(
        { error: 'Failed to update story tags' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, story: data });

  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = createClient();
    const resolvedParams = await params;
    
    if (!resolvedParams.id) {
      return NextResponse.json(
        { error: 'Story ID is required' },
        { status: 400 }
      );
    }

    // Get the story with its tags
    const { data, error } = await supabase
      .from('stories')
      .select('tags_unified')
      .eq('id', resolvedParams.id)
      .single();

    if (error) {
      console.error('Supabase error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch story tags' },
        { status: 500 }
      );
    }

    return NextResponse.json({ 
      tags_unified: data.tags_unified || [] 
    });

  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}