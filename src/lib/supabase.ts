import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { TagWithMetadata } from '@/types';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Debug logging for production issues
if (typeof window !== 'undefined') {
  console.log('🔧 Supabase config debug:', {
    urlLength: supabaseUrl?.length || 0,
    keyLength: supabaseKey?.length || 0,
    urlValid: supabaseUrl?.startsWith('https://') || false,
    keyValid: supabaseKey?.length > 50 || false
  });
}

// Create client with error handling
let supabase: any;
try {
  supabase = createSupabaseClient(supabaseUrl, supabaseKey);
} catch (error) {
  console.error('❌ Failed to create Supabase client:', error);
  throw new Error('Supabase client creation failed - check environment variables');
}

export { supabase };

// Helper function to create a new client instance for API routes
export function createClient() {
  try {
    return createSupabaseClient(supabaseUrl, supabaseKey);
  } catch (error) {
    console.error('❌ Failed to create Supabase client in API route:', error);
    throw new Error('Supabase client creation failed - check environment variables');
  }
}

export type Database = {
  public: {
    Tables: {
      story_collections: {
        Row: {
          id: string;
          highlight_id: string;
          name: string;
          story_count: number;
          estimated_date: string | null;
          region: string | null;
          country_code: string | null;
          expedition_phase: string | null;
          created_at: string;
          updated_at: string;
          // NEW FIELDS
          collection_index: number;
          collection_start_date: string | null;
          is_expedition_scope: boolean;
          expedition_exclude_reason: string | null;
          gps_track_ids: number[] | null;
          estimated_date_range_start: string | null;
          estimated_date_range_end: string | null;
          regional_tags: string[] | null;
        };
        Insert: {
          id?: string;
          highlight_id: string;
          name: string;
          story_count: number;
          estimated_date?: string | null;
          region?: string | null;
          country_code?: string | null;
          expedition_phase?: string | null;
          created_at?: string;
          updated_at?: string;
          // NEW FIELDS
          collection_index: number;
          collection_start_date?: string | null;
          is_expedition_scope?: boolean;
          expedition_exclude_reason?: string | null;
          gps_track_ids?: number[] | null;
          estimated_date_range_start?: string | null;
          estimated_date_range_end?: string | null;
          regional_tags?: string[] | null;
        };
        Update: {
          id?: string;
          highlight_id?: string;
          name?: string;
          story_count?: number;
          estimated_date?: string | null;
          region?: string | null;
          country_code?: string | null;
          expedition_phase?: string | null;
          created_at?: string;
          updated_at?: string;
          // NEW FIELDS
          collection_index?: number;
          collection_start_date?: string | null;
          is_expedition_scope?: boolean;
          expedition_exclude_reason?: string | null;
          gps_track_ids?: number[] | null;
          estimated_date_range_start?: string | null;
          estimated_date_range_end?: string | null;
          regional_tags?: string[] | null;
        };
      };
      stories: {
        Row: {
          id: string;
          collection_id: string;
          story_index: number;
          media_type: 'image' | 'video';
          cdn_url: string;
          duration: number | null;
          location_name: string | null;
          latitude: number | null;
          longitude: number | null;
          location_confidence: 'high' | 'medium' | 'low' | 'estimated' | null;
          content_type: string[] | null;
          tags: string[] | null;
          tags_unified: TagWithMetadata[] | null;
          estimated_date: string | null;
          time_added: string | null;
          created_at: string;
          updated_at: string;
          // NEW FIELDS
          estimated_date_range_start: string | null;
          estimated_date_range_end: string | null;
          user_assigned_date: string | null;
          collection_default_date: string | null;
          regional_tags: string[] | null;
          tag_source: 'gps_estimated' | 'manual' | 'mixed' | 'excluded' | null;
          date_confidence: 'gps_estimated' | 'collection_estimated' | 'manual' | 'high' | 'medium' | 'low' | null;
        };
        Insert: {
          id?: string;
          collection_id: string;
          story_index: number;
          media_type: 'image' | 'video';
          cdn_url: string;
          duration?: number | null;
          location_name?: string | null;
          latitude?: number | null;
          longitude?: number | null;
          location_confidence?: 'high' | 'medium' | 'low' | 'estimated' | null;
          content_type?: string[] | null;
          tags?: string[] | null;
          tags_unified?: TagWithMetadata[] | null;
          estimated_date?: string | null;
          time_added?: string | null;
          created_at?: string;
          updated_at?: string;
          // NEW FIELDS
          estimated_date_range_start?: string | null;
          estimated_date_range_end?: string | null;
          user_assigned_date?: string | null;
          collection_default_date?: string | null;
          regional_tags?: string[] | null;
          tag_source?: 'gps_estimated' | 'manual' | 'mixed' | 'excluded' | null;
          date_confidence?: 'gps_estimated' | 'collection_estimated' | 'manual' | 'high' | 'medium' | 'low' | null;
        };
        Update: {
          id?: string;
          collection_id?: string;
          story_index?: number;
          media_type?: 'image' | 'video';
          cdn_url?: string;
          duration?: number | null;
          location_name?: string | null;
          latitude?: number | null;
          longitude?: number | null;
          location_confidence?: 'high' | 'medium' | 'low' | 'estimated' | null;
          content_type?: string[] | null;
          tags?: string[] | null;
          tags_unified?: TagWithMetadata[] | null;
          estimated_date?: string | null;
          time_added?: string | null;
          created_at?: string;
          updated_at?: string;
          // NEW FIELDS
          estimated_date_range_start?: string | null;
          estimated_date_range_end?: string | null;
          user_assigned_date?: string | null;
          collection_default_date?: string | null;
          regional_tags?: string[] | null;
          tag_source?: 'gps_estimated' | 'manual' | 'mixed' | 'excluded' | null;
          date_confidence?: 'gps_estimated' | 'collection_estimated' | 'manual' | 'high' | 'medium' | 'low' | null;
        };
      };
      gps_waypoints: {
        Row: {
          id: string;
          recorded_at: string;
          latitude: number;
          longitude: number;
          altitude: number | null;
          country_code: string | null;
          region: string | null;
          expedition_phase: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          recorded_at: string;
          latitude: number;
          longitude: number;
          altitude?: number | null;
          country_code?: string | null;
          region?: string | null;
          expedition_phase?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          recorded_at?: string;
          latitude?: number;
          longitude?: number;
          altitude?: number | null;
          country_code?: string | null;
          region?: string | null;
          expedition_phase?: string | null;
          created_at?: string;
        };
      };
    };
  };
};