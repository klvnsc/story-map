export interface StoryCollection {
  id: string;
  highlight_id: string;
  name: string;
  story_count: number;
  estimated_date?: Date;
  region?: string;
  country_code?: string;
  expedition_phase?: string;
}

export interface Story {
  id: string;
  collection_id: string;
  story_index: number;
  media_type: 'image' | 'video';
  cdn_url: string;
  duration?: number;
  location_name?: string;
  latitude?: number;
  longitude?: number;
  location_confidence?: 'high' | 'medium' | 'low' | 'estimated';
  content_type?: string[];
  tags?: string[];
  estimated_date?: Date;
  time_added?: string;
}

export interface GPSWaypoint {
  id: string;
  recorded_at: Date;
  latitude: number;
  longitude: number;
  altitude?: number;
  country_code?: string;
  region?: string;
  expedition_phase?: string;
}

export interface User {
  username: string;
  isAuthenticated: boolean;
}