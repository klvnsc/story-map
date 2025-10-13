# Location Database Management Feature Specification

## Overview

Replace the static Vietnam locations database (`/src/lib/vietnam-locations.ts`) with a dynamic Supabase database system that supports Place ID validation and inline editing within the timeline interface.

## Database Schema

### `timeline_locations` Table

```sql
CREATE TABLE timeline_locations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- UNIVERSAL: Both APIs need these
  name VARCHAR(255) NOT NULL,             -- Human-readable name ("District 1 Hotel Area")
  coordinates JSONB NOT NULL,             -- {lat, lng} - works with both APIs

  -- API-SPECIFIC: Optional enrichment data
  place_id VARCHAR(255),                  -- Google Places specific
  formatted_address TEXT,                 -- Google Places specific
  place_name VARCHAR(255),                -- For Google Places search ("District 1")

  -- VALIDATION: For our business logic
  is_place_id_validated BOOLEAN DEFAULT false,

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create index for fast lookups by name
CREATE INDEX idx_timeline_locations_name ON timeline_locations(name);
CREATE INDEX idx_timeline_locations_place_id ON timeline_locations(place_id);
```

## Field Definitions

| Field | Type | Purpose | Example |
|-------|------|---------|---------|
| `name` | VARCHAR(255) | Timeline display name | "District 1 Hotel Area" |
| `place_name` | VARCHAR(255) | Google Places searchable name | "District 1" |
| `coordinates` | JSONB | Lat/lng for both Google Places and Mapbox | `{"lat": 10.7753, "lng": 106.7028}` |
| `place_id` | VARCHAR(255) | Google Places unique identifier | "ChIJe4jt-TgvdTERiYl2A1ftrRQ" |
| `formatted_address` | TEXT | Google Places formatted address | "District 1, Ho Chi Minh City, Vietnam" |
| `is_place_id_validated` | BOOLEAN | Controls visual indicators | `true` = green filled, `false` = green outline |

## API Endpoints

### Location Management

#### `GET /api/locations`
- **Purpose**: List all timeline locations
- **Response**: Array of location objects
- **Authentication**: Required

#### `POST /api/locations`
- **Purpose**: Create new location
- **Body**: Location object without `id`, `created_at`, `updated_at`
- **Response**: Created location object
- **Authentication**: Required

#### `PUT /api/locations/[id]`
- **Purpose**: Update existing location
- **Body**: Partial location object
- **Response**: Updated location object
- **Authentication**: Required

#### `POST /api/locations/validate-place-id`
- **Purpose**: Validate place ID using Google Places API
- **Body**: `{ locationId: UUID, placeName: string }`
- **Response**: `{ valid: boolean, placeData?: GooglePlaceResult }`
- **Authentication**: Required

### Timeline Integration

#### Update `GET /api/timeline-data`
- Replace static data lookup with database queries
- Join location data with timeline structure
- Maintain existing response format for compatibility

## UI Components

### Timeline Visual Indicators

#### Sequence Circles
- **Validated locations**: `bg-green-500 text-white` (green filled)
- **Unvalidated locations**: `border-2 border-green-500 bg-white text-green-500` (green outline)

#### Inline Actions Menu

Each location row includes a three-dot menu (⋯) with actions:

```typescript
interface LocationActionsMenuProps {
  location: TimelineLocation;
  onEdit: (location: TimelineLocation) => void;
  onValidate: (location: TimelineLocation) => void;
  onMarkAsArea: (location: TimelineLocation) => void;
}
```

**Menu Options:**
1. **"Edit Place Details"** - Opens modal for editing `place_name` and searching Place ID
2. **"Validate Place ID"** - Runs Google Places API validation
3. **"Mark as Area"** - For conceptual locations that don't need Place IDs

### Location Edit Modal

```typescript
interface LocationEditModalProps {
  location: TimelineLocation | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updatedLocation: Partial<TimelineLocation>) => Promise<void>;
  onValidate: (placeName: string) => Promise<GooglePlaceResult | null>;
}
```

**Modal Features:**
- Edit `name` (timeline display)
- Edit `place_name` (Google Places search term)
- Real-time Place ID validation with visual feedback
- Coordinate display (read-only, populated from Place ID validation)
- Save/Cancel actions

## Validation Logic

### Google Places API Integration

```typescript
interface GooglePlaceResult {
  placeId: string;
  name: string;
  formattedAddress: string;
  coordinates: {
    lat: number;
    lng: number;
  };
  types: string[];
  confidence: 'high' | 'medium' | 'low';
}
```

### Validation Workflow

1. User edits `place_name` field
2. Click "Validate Place ID" triggers API call
3. If valid: Update `place_id`, `formatted_address`, `coordinates`, set `is_place_id_validated = true`
4. If invalid: Show error message, keep `is_place_id_validated = false`
5. Visual indicator updates immediately

### Caching Strategy

- Cache successful validations in memory for session
- Avoid repeated API calls for same `place_name`
- Clear cache on page refresh

## Three-Tier Directions URL Fallback System

### Priority Hierarchy

The system generates Google Maps directions URLs using a three-tier fallback approach prioritizing human readability while maintaining reliability:

#### 1. **Primary: Place IDs + Names** (Most Readable)
**When**: Both origin and destination have validated Place IDs (`place_id` is not null)

**URL Format**:
```
https://www.google.com/maps/dir/?api=1&travelmode=walking&origin_place_id=ChIJ4_KiYaAmdTERXGibhagKoRU&destination_place_id=ChIJe4jt-TgvdTERiYl2A1ftrRQ&origin=Tan+Son+Nhat+Airport&destination=District+1
```

**Benefits**:
- **Human Readable**: URLs show clear place names ("Tan Son Nhat Airport → District 1")
- **SEO Friendly**: Place names appear in URL parameters
- **Bookmarkable**: Self-documenting URLs for easy sharing
- **Google Integration**: Better integration with Google services and search history

**Requirements**:
- Both locations must have `place_id` field populated
- Both locations must have `is_place_id_validated = true`

#### 2. **Secondary: Coordinates** (Most Reliable)
**When**: Either origin or destination lacks a valid Place ID

**URL Format**:
```
https://www.google.com/maps/dir/?api=1&travelmode=walking&origin=10.8186%2C106.6524&destination=10.7753%2C106.7028
```

**Benefits**:
- **Maximum Reliability**: Direct coordinate routing never fails
- **No External Dependencies**: Works regardless of Place ID database status
- **Consistent Performance**: Same coordinates always produce same route
- **Precision**: Exact location targeting from database coordinates

**Trade-offs**:
- **Opaque URLs**: Numbers don't indicate destination meaning
- **Less User-Friendly**: Harder to understand or share URLs

#### 3. **Tertiary: Address Strings** (Final Fallback)
**When**: Coordinates are unavailable (rare edge case)

**URL Format**:
```
https://www.google.com/maps/dir/?api=1&travelmode=walking&origin=District+1%2C+Ho+Chi+Minh+City%2C+Vietnam&destination=Notre+Dame+Cathedral%2C+Ho+Chi+Minh+City%2C+Vietnam
```

**Benefits**:
- **Readable**: Clear address-based routing
- **Universal**: Works for any textual address
- **Graceful Degradation**: System never fails to provide directions

**Limitations**:
- **Address Resolution**: Relies on Google's geocoding accuracy
- **Ambiguity**: Multiple locations with same name can cause routing errors

### Implementation Logic

```typescript
// Located in: /src/lib/timeline-locations-db.ts:132-147
if (originLocation.placeId && destinationLocation.placeId) {
  // PRIMARY: Place IDs with readable names
  params.set('origin_place_id', originLocation.placeId);
  params.set('destination_place_id', destinationLocation.placeId);
  params.set('origin', originLocation.name);
  params.set('destination', destinationLocation.name);
} else if (originLocation.coordinates && destinationLocation.coordinates) {
  // SECONDARY: Coordinate-based routing
  params.set('origin', `${originLocation.coordinates.lat},${originLocation.coordinates.lng}`);
  params.set('destination', `${destinationLocation.coordinates.lat},${destinationLocation.coordinates.lng}`);
} else {
  // TERTIARY: Address string fallback
  params.set('origin', originLocation.fullAddress);
  params.set('destination', destinationLocation.fullAddress);
}
```

### System Behavior Examples

| Origin Status | Destination Status | URL Method | Example |
|--------------|-------------------|------------|---------|
| ✅ Has Place ID | ✅ Has Place ID | **Place IDs + Names** | `origin_place_id=ChIJ...&origin=Airport&destination=District+1` |
| ✅ Has Place ID | ❌ No Place ID | **Coordinates** | `origin=10.8186,106.6524&destination=10.7753,106.7028` |
| ❌ No Place ID | ✅ Has Place ID | **Coordinates** | `origin=10.8186,106.6524&destination=10.7753,106.7028` |
| ❌ No Place ID | ❌ No Place ID | **Coordinates** | `origin=10.8186,106.6524&destination=10.7753,106.7028` |
| ❌ No Coordinates | ❌ No Coordinates | **Addresses** | `origin=District+1,+Ho+Chi+Minh&destination=Notre+Dame` |

### Upgrade Path

The system encourages Place ID validation through:
1. **Visual Indicators**: Unvalidated locations show green outline (white fill)
2. **Inline Editing**: Three-dot menu provides "Validate Place ID" option
3. **Immediate Benefits**: Validated locations immediately get readable URLs
4. **Progressive Enhancement**: System works at any validation level

This architecture balances user experience (readable URLs) with system reliability (coordinate fallback), providing the best possible outcome regardless of data completeness.

## Migration Strategy

### Phase 1: Database Setup
- Create `timeline_locations` table in Supabase
- Manually populate with existing static data from `vietnam-locations.ts`
- Test database connectivity and queries

### Phase 2: API Development
- Implement location management API endpoints
- Add Google Places API validation endpoint
- Test all CRUD operations

### Phase 3: UI Integration
- Update `TimelineView` component with visual indicators
- Add inline actions menu and edit modal
- Implement real-time validation feedback

### Phase 4: Timeline API Migration
- Update `/api/timeline-data` to query database instead of static file
- Maintain backward compatibility during transition
- Test end-to-end timeline functionality

## Technical Requirements

### Environment Variables
```env
GOOGLE_PLACES_API_KEY=your_api_key_here
```

### Database Permissions (Supabase RLS)
```sql
-- Enable RLS
ALTER TABLE timeline_locations ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to manage locations
CREATE POLICY "Allow authenticated users to manage timeline locations" ON timeline_locations
  FOR ALL USING (auth.role() = 'authenticated');
```

### TypeScript Types

```typescript
interface TimelineLocation {
  id: string;
  name: string;
  coordinates: {
    lat: number;
    lng: number;
  };
  place_id?: string;
  formatted_address?: string;
  place_name?: string;
  is_place_id_validated: boolean;
  created_at: string;
  updated_at: string;
}
```

## Success Criteria

1. ✅ **Database Replacement**: Timeline loads locations from database instead of static file
2. ✅ **Visual Indicators**: Green filled vs outline circles show validation status
3. ✅ **Inline Editing**: Users can edit locations directly from timeline
4. ✅ **Place ID Validation**: Real-time Google Places API validation
5. ✅ **Backward Compatibility**: Existing timeline functionality unchanged
6. ✅ **Performance**: Database queries fast enough for timeline loading

## Future Enhancements

- Bulk validation of all unvalidated locations
- Import/export functionality for location data
- Integration with Mapbox Directions API for enhanced routing
- Location categories and tagging system
- Duplicate location detection and merging