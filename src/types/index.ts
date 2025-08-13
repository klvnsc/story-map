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
  
  // DATE FIELDS (UPDATED WITH CLEAR NAMES)
  /** Collection-based default date (fallback estimate) */
  collection_default_date?: Date;
  /** User-assigned date (manual input - most accurate) */
  user_assigned_date?: Date;
  /** GPS-correlated date range start */
  estimated_date_range_start?: Date;
  /** GPS-correlated date range end */
  estimated_date_range_end?: Date;
  
  // LEGACY FIELDS (TO BE REMOVED)
  /** @deprecated Use collection_default_date instead */
  estimated_date?: Date;
  /** @deprecated Use user_assigned_date instead */
  estimated_date_gps?: Date;
  
  // METADATA FIELDS
  /** Confidence level: 'manual' = user input (highest), 'collection_estimated' = fallback */
  date_confidence?: 'manual' | 'collection_estimated' | 'high' | 'medium' | 'low';
  /** Source of tags: 'manual' = user input, 'gps_estimated' = computed */
  tag_source?: string;
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