import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseKey);

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
          estimated_date: string | null;
          time_added: string | null;
          created_at: string;
          updated_at: string;
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
          estimated_date?: string | null;
          time_added?: string | null;
          created_at?: string;
          updated_at?: string;
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
          estimated_date?: string | null;
          time_added?: string | null;
          created_at?: string;
          updated_at?: string;
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