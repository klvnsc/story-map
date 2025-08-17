export interface StoryCollection {
  id: string;
  highlight_id: string;
  name: string;
  story_count: number;
  region?: string;
  country_code?: string;
  expedition_phase?: string;
  
  // NEW: Collection numbering in ASCENDING chronological order (1=earliest, 61=latest)
  collection_index: number;
  
  // NEW: Expedition scope tracking
  is_expedition_scope: boolean;
  expedition_exclude_reason?: string;
  
  
  // LEGACY: Regional tags (for backward compatibility only)
  /** @deprecated Collections should not have regional_tags. Use story-level tags_unified instead. */
  regional_tags?: string[];
  gps_track_ids?: number[];
}

export interface TagWithMetadata {
  name: string;            // "Wales", "hiking", "peaceful"
  type: TagType;          // "regional" | "activity" | "emotion"  
  source: TagSource;      // "gps" | "manual" | "journal" | "ai"
  confidence?: number;    // 0.0-1.0 for AI/GPS generated tags
  created_at: string;     // ISO timestamp
  created_by?: string;    // User ID for manual tags
}

export type TagType = "regional" | "activity" | "emotion";
export type TagSource = "gps" | "manual" | "journal" | "ai";

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
  
  // UNIFIED TAG SYSTEM
  tags_unified?: TagWithMetadata[];
  
  // LEGACY TAG FIELDS (for backward compatibility only)
  /** @deprecated Use getRegionalTags(tags_unified) instead. Maintained for API compatibility. */
  regional_tags?: string[];
  
  /** @deprecated Use tags_unified instead. Maintained for API compatibility. */
  tags?: string[];
  
  // DATE FIELDS (SIMPLIFIED)
  /** User-assigned date (manual input - highest confidence) */
  user_assigned_date?: string;
  /** Future: GPS-estimated date (not implemented yet) */
  gps_estimated_date?: string;
  
  // LEGACY METADATA FIELDS
  /** @deprecated Use per-tag source tracking in tags_unified instead. Maintained for API compatibility. */
  tag_source?: 'manual' | 'gps_estimated' | 'mixed' | 'excluded' | null;
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