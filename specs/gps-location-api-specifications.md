# GPS Location Editing API Specifications

## Overview

API endpoints for GPS-powered story location editing system. These endpoints provide GPS track correlation, regional tag suggestion, and enhanced story location management.

## Base Configuration

**Base URL**: `/api`
**Authentication**: Required (existing session-based auth)
**Content-Type**: `application/json`
**Rate Limiting**: 100 requests per minute per user

## Core Endpoints

### 1. GPS Track Correlation

#### `GET /api/gps-track-for-date`

Get GPS track information for a specific date to enable regional tag suggestions.

**Parameters:**
```typescript
interface GPSTrackQueryParams {
  date: string; // ISO date string (YYYY-MM-DD)
  collection_index?: number; // Optional: collection index for context
}
```

**Request Example:**
```
GET /api/gps-track-for-date?date=2025-07-02&collection_index=1
```

**Response:**
```typescript
interface GPSTrackResponse {
  success: boolean;
  data: {
    track_number: number;
    track_title: string;
    date_range: {
      start: string; // ISO date
      end: string;   // ISO date
    };
    expedition_phase: string;
    region: string;
    cities: string[];
    regional_tags: string[];
    classification: 'moving' | 'rest';
    distance_km?: number;
    confidence: 'high' | 'medium' | 'low';
  } | null;
  error?: string;
}
```

**Success Response Example:**
```json
{
  "success": true,
  "data": {
    "track_number": 29,
    "track_title": "Scotland Finale",
    "date_range": {
      "start": "2025-06-24",
      "end": "2025-07-02"
    },
    "expedition_phase": "uk_scotland",
    "region": "Scotland/UK",
    "cities": ["Edinburgh", "Glasgow", "Inverness"],
    "regional_tags": ["Scotland", "UK", "Wales", "Britain"],
    "classification": "moving",
    "distance_km": 1012.84,
    "confidence": "high"
  }
}
```

**Error Responses:**
- `400`: Invalid date format
- `404`: No GPS track found for date
- `500`: GPS correlation service error

---

### 2. Collection GPS Context

#### `GET /api/collection/{id}/gps-context`

Get GPS correlation context for an entire collection to assist with batch operations.

**Parameters:**
```typescript
interface CollectionGPSParams {
  id: string; // Collection UUID
}
```

**Response:**
```typescript
interface CollectionGPSResponse {
  success: boolean;
  data: {
    collection: {
      id: string;
      name: string;
      collection_index: number;
      story_count: number;
    };
    gps_correlation: {
      primary_tracks: Array<{
        track_number: number;
        track_title: string;
        date_range: { start: string; end: string; };
        weight: number; // 0-1, how much this track applies to collection
      }>;
      suggested_regional_tags: string[];
      estimated_date_range: {
        start: string;
        end: string;
      };
      confidence: 'high' | 'medium' | 'low';
    };
  };
  error?: string;
}
```

**Request Example:**
```
GET /api/collection/550e8400-e29b-41d4-a716-446655440000/gps-context
```

---

### 3. Story Location Update

#### `PUT /api/story/{id}/location`

Update location data for a specific story with GPS correlation support.

**Parameters:**
```typescript
interface StoryLocationUpdateRequest {
  location_name?: string;
  latitude?: number;  // -90 to 90
  longitude?: number; // -180 to 180
  location_confidence?: 'high' | 'medium' | 'low' | 'estimated';
  
  // GPS correlation fields
  estimated_date_gps?: string; // ISO timestamp
  estimated_date_range_start?: string;
  estimated_date_range_end?: string;
  regional_tags?: string[];
  tag_source?: 'gps_estimated' | 'manual' | 'mixed' | 'excluded';
  date_confidence?: 'gps_estimated' | 'collection_estimated' | 'manual' | 'high' | 'medium' | 'low';
  
  // Manual tags (separate from regional)
  manual_tags?: string[];
}
```

**Response:**
```typescript
interface StoryLocationUpdateResponse {
  success: boolean;
  data: {
    id: string;
    location_name: string | null;
    latitude: number | null;
    longitude: number | null;
    location_confidence: string | null;
    regional_tags: string[];
    tags: string[]; // Combined regional + manual tags
    tag_source: string;
    estimated_date_gps: string | null;
    date_confidence: string;
    updated_at: string;
  };
  error?: string;
}
```

**Request Example:**
```json
PUT /api/story/123e4567-e89b-12d3-a456-426614174000/location
{
  "location_name": "Snowdonia National Park, Wales",
  "latitude": 53.0685,
  "longitude": -3.9044,
  "location_confidence": "high",
  "regional_tags": ["Wales", "UK", "Scotland"],
  "tag_source": "mixed",
  "manual_tags": ["hiking", "mountains", "national-park"]
}
```

**Error Responses:**
- `400`: Invalid location data (coordinates out of range, etc.)
- `404`: Story not found
- `422`: Validation errors
- `500`: Database update failed

---

### 4. Bulk Story Location Update

#### `POST /api/stories/bulk-location`

Update location data for multiple stories simultaneously.

**Parameters:**
```typescript
interface BulkLocationUpdateRequest {
  story_ids: string[];
  updates: StoryLocationUpdateRequest; // Same as single update
  apply_gps_correlation?: boolean; // Auto-apply GPS suggestions
  collection_id?: string; // Optional: limit to specific collection
}
```

**Response:**
```typescript
interface BulkLocationUpdateResponse {
  success: boolean;
  data: {
    updated_count: number;
    failed_count: number;
    updated_stories: Array<{
      id: string;
      status: 'success' | 'failed';
      error?: string;
    }>;
  };
  error?: string;
}
```

**Request Example:**
```json
POST /api/stories/bulk-location
{
  "story_ids": ["story1", "story2", "story3"],
  "updates": {
    "regional_tags": ["Wales", "UK"],
    "tag_source": "gps_estimated",
    "date_confidence": "gps_estimated"
  },
  "apply_gps_correlation": true
}
```

---

### 5. GPS Correlation Service

#### `POST /api/correlate-story-dates`

Bulk process stories to populate GPS-correlated dates and regional tags.

**Parameters:**
```typescript
interface GPSCorrelationRequest {
  collection_ids?: string[]; // Optional: specific collections
  force_recalculate?: boolean; // Override existing GPS data
  dry_run?: boolean; // Return what would be updated without saving
}
```

**Response:**
```typescript
interface GPSCorrelationResponse {
  success: boolean;
  data: {
    processed_stories: number;
    updated_stories: number;
    failed_stories: number;
    correlation_summary: Array<{
      collection_name: string;
      collection_index: number;
      story_count: number;
      gps_tracks_matched: number[];
      regional_tags_applied: string[];
      confidence: 'high' | 'medium' | 'low';
    }>;
    errors?: Array<{
      story_id: string;
      error: string;
    }>;
  };
  error?: string;
}
```

**Request Example:**
```json
POST /api/correlate-story-dates
{
  "collection_ids": ["collection1", "collection2"],
  "force_recalculate": false,
  "dry_run": false
}
```

---

### 6. Story GPS Context

#### `GET /api/story/{id}/gps-context`

Get GPS correlation context for a specific story.

**Response:**
```typescript
interface StoryGPSContextResponse {
  success: boolean;
  data: {
    story: {
      id: string;
      collection_name: string;
      collection_index: number;
      story_index: number;
    };
    current_gps_data: {
      estimated_date_gps: string | null;
      regional_tags: string[];
      tag_source: string;
      date_confidence: string;
    };
    gps_suggestions: {
      suggested_tracks: Array<{
        track_number: number;
        track_title: string;
        date_match_confidence: number;
        suggested_regional_tags: string[];
      }>;
      recommended_date: string;
      recommended_regional_tags: string[];
      confidence: 'high' | 'medium' | 'low';
    };
  };
  error?: string;
}
```

---

## Data Models

### GPS Track Data Structure
```typescript
interface GPSTrack {
  track_number: number;
  start_date: string;
  end_date: string;
  title: string;
  classification: 'moving' | 'rest';
  region: string;
  cities: string[];
  distance_km: number;
  expedition_phase: string;
  track_description: string;
}
```

### Collection Chronology Mapping (CORRECTED)
```typescript
// EXPEDITION ROUTE: North China → Central Asia → Middle East → Africa → Mediterranean → Europe → UK → Scotland
// CRITICAL CORRECTION: Collections are in DESCENDING order (1=latest, 61=earliest)
// Collections 52-61 are EXCLUDED from 13-month expedition (pre-expedition content)
const EXPEDITION_COLLECTION_MAPPING = {
  // Phase 1: UK/Scotland Finale (Collections 1-15)
  "uk_scotland": { 
    collection_range: [1, 15], 
    tracks: [25, 26, 27, 28, 29],
    date_range: { start: "2025-05-25", end: "2025-07-02" },
    regions: ["Wales", "England", "Scotland", "UK"]
  },
  
  // Phase 2: Europe/Mediterranean (Collections 16-35)  
  "europe_mediterranean": { 
    collection_range: [16, 35], 
    tracks: [20, 21, 22, 23, 24],
    date_range: { start: "2025-03-14", end: "2025-05-25" },
    regions: ["Germany", "Morocco", "Spain", "France", "Italy", "Greece", "Bulgaria"]
  },
  
  // Phase 3: Middle East/Caucasus (Collections 36-45)
  "middle_east_caucasus": { 
    collection_range: [36, 45], 
    tracks: [10, 11, 12, 13, 14, 15, 16, 17, 18, 19],
    date_range: { start: "2024-10-17", end: "2025-03-12" },
    regions: ["Georgia", "Armenia", "Turkey", "Middle East", "Caucasus"]
  },
  
  // Phase 4: Central Asia (Collections 46-51) - CORRECTED: Starts with Collection 51 (Kyrgyzstan)
  "central_asia": { 
    collection_range: [46, 51], 
    tracks: [3, 4, 5, 6, 7, 8, 9], // Track 3 has NO collection correlation (North China gap)
    date_range: { start: "2024-07-01", end: "2024-10-16" },
    regions: ["Tajikistan", "Russia", "Kazakhstan", "Uzbekistan", "Kyrgyzstan"]
  }
};

// EXCLUDED: Pre-expedition collections (Collections 52-61)
const EXCLUDED_COLLECTIONS = {
  "pre_expedition": {
    collection_range: [52, 61], // 10 collections, ~687 stories
    tracks: [], // NO GPS correlation - pre-expedition content
    exclude_reason: "pre_expedition_content",
    regions: [] // No GPS correlation available
  }
};
```

## Error Handling

### Standard Error Response
```typescript
interface APIError {
  success: false;
  error: string;
  details?: {
    code: string;
    field?: string;
    validation_errors?: Array<{
      field: string;
      message: string;
    }>;
  };
}
```

### Common Error Codes
- `INVALID_DATE_FORMAT`: Date parameter not in ISO format
- `GPS_SERVICE_UNAVAILABLE`: GPS correlation service is down
- `STORY_NOT_FOUND`: Story ID does not exist
- `COLLECTION_NOT_FOUND`: Collection ID does not exist
- `INVALID_COORDINATES`: Latitude/longitude out of valid range
- `VALIDATION_ERROR`: Request data validation failed
- `DATABASE_ERROR`: Database operation failed
- `RATE_LIMIT_EXCEEDED`: Too many requests

## GPS Data Source Integration

### Data Limitations
- **No individual GPS coordinates**: Only high-level track metadata available
- **Track-level granularity**: Date ranges and regional descriptions only
- **Limited precision**: Regional tags derived from track descriptions

### Data Source: `/data-cy-gps/garmin.md`
```typescript
// Example track data structure from garmin.md
interface TrackMetadata {
  track_id: number;
  date_range: string; // "July 1-18, 2024"
  title: string; // "North China Expedition Start"
  classification: string; // "Land Rover Defender Expedition"
  bounding_box?: number[]; // [lat_min, lng_min, lat_max, lng_max]
  region_description: string;
  distance_km: number;
  gps_point_count: number;
}
```

## Performance Considerations

### Caching Strategy
- **GPS Track Data**: Cache track metadata for 1 hour
- **Collection GPS Context**: Cache per collection for 30 minutes
- **Regional Tag Suggestions**: Cache based on date for 24 hours

### Optimization
- Use database indexes on `estimated_date_gps`, `regional_tags`, `tag_source`
- Batch database operations for bulk updates
- Lazy-load GPS correlation data only when editing interface is opened
- Debounce coordinate input validation (500ms)

### Rate Limiting
- 100 requests per minute per authenticated user
- Bulk operations limited to 1000 stories per request
- GPS correlation service limited to 10 requests per minute per user

## Implementation Notes

1. **Collection Chronology**: Remember collections are in DESCENDING order (1=latest, 61=earliest)
2. **GPS Data Source**: Limited to high-level metadata from `garmin.md` - no precise coordinates
3. **Tag Strategy**: Separate `regional_tags` (GPS-derived) from `tags` (manual)
4. **Date Confidence**: Track data source and confidence for transparency
5. **Validation**: Strict coordinate validation and date format checking
6. **Error Recovery**: Graceful degradation when GPS service is unavailable