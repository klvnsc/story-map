# Add New Location to Timeline - Feature Specification

## Overview

Enable users to dynamically add new locations to any day within the timeline interface. This feature integrates with the existing location database management system and maintains the timeline's sequence numbering and directions generation.

## User Experience Flow

### 1. Location Discovery
- User expands any day section in timeline
- "Add Location" button appears at bottom of location list
- Button is contextual: "Add location to Day {dayNumber}"

### 2. Location Creation Workflow
- Click button opens "Add New Location" modal
- Modal provides guided workflow for location entry
- Real-time Google Places API integration for validation
- Immediate visual feedback and error handling

### 3. Timeline Integration
- New location appears instantly in timeline (optimistic update)
- Sequence numbers automatically adjust
- Directions URLs regenerate for affected locations
- Database persists changes with rollback on failure

## Technical Architecture

### Database Integration

#### Existing Schema Compatibility
Uses existing `timeline_locations` table with no schema changes required:

```sql
-- Existing table structure (no changes needed)
CREATE TABLE timeline_locations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  coordinates JSONB NOT NULL,
  place_id VARCHAR(255),
  formatted_address TEXT,
  place_name VARCHAR(255),
  is_place_id_validated BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

#### Timeline-Day Association Strategy

Since the current system uses embedded static data (`SHARON_TRIP_DATA`), we need a hybrid approach:

**Phase 1: Database + Static Data**
- Store timeline-specific locations in `timeline_locations` table
- Add metadata fields to distinguish timeline locations:
  - `timeline_day_number: INTEGER` - Which day this location belongs to
  - `timeline_sequence: INTEGER` - Position within the day
  - `is_timeline_location: BOOLEAN` - Flag to identify timeline vs. general locations

**Schema Addition (SQL to run manually):**
```sql
-- Add timeline-specific columns
ALTER TABLE timeline_locations
ADD COLUMN timeline_day_number INTEGER,
ADD COLUMN timeline_sequence INTEGER,
ADD COLUMN is_timeline_location BOOLEAN DEFAULT false;

-- Create index for timeline queries
CREATE INDEX idx_timeline_locations_day_sequence
ON timeline_locations(timeline_day_number, timeline_sequence)
WHERE is_timeline_location = true;
```

### API Endpoints

#### New Timeline Location Creation
**Endpoint**: `POST /api/locations/timeline`

**Request Body**:
```typescript
interface CreateTimelineLocationRequest {
  name: string;                    // Display name ("The Secret Garden Restaurant")
  place_name?: string;             // Google Places search name
  day_number: number;              // Which day (1-6)
  // Note: Phase 1 always adds to end, no position selection needed
  coordinates?: {                  // Optional if place_name provided
    lat: number;
    lng: number;
  };
}
```

**Response**:
```typescript
interface CreateTimelineLocationResponse {
  success: boolean;
  location?: TimelineLocation;
  timeline?: Timeline;  // Updated timeline data
  error?: string;
}
```

#### Timeline Data Enhancement
**Endpoint**: `GET /api/timeline-data` (Enhanced existing endpoint)

**Changes**:
- Query `timeline_locations` for user-added locations
- Merge with embedded `SHARON_TRIP_DATA`
- Maintain sequence numbering across combined dataset
- Generate directions URLs for all locations

**Enhanced Logic**:
```typescript
async function mergeTimelineData(staticData: TripDay[], dbLocations: TimelineLocation[]): Promise<TripDay[]> {
  // Group database locations by day
  const dbLocationsByDay = groupBy(dbLocations, 'timeline_day_number');

  // Merge each day's static and database locations
  return staticData.map(day => {
    const dayDbLocations = dbLocationsByDay[day.dayNumber] || [];
    const allLocations = [...day.locations, ...dayDbLocations];

    // Re-sequence all locations
    const sortedLocations = allLocations.sort((a, b) =>
      (a.timeline_sequence || a.sequence) - (b.timeline_sequence || b.sequence)
    );

    // Update sequence numbers
    sortedLocations.forEach((loc, index) => {
      loc.sequence = index + 1;
    });

    return {
      ...day,
      locations: sortedLocations
    };
  });
}
```

## UI Components

### Add Location Button

**Placement**: Inside expandable day section, after existing locations

**Design**:
```tsx
{/* Add Location Button - Inside TimelineView DaySection */}
{isExpanded && (
  <div className="px-6 pb-4 border-t border-gray-100">
    <div className="pt-4">
      {day.locations.map((location, index) => (
        <LocationItem key={`${day.dayNumber}-${index}`} />
      ))}

      {/* Add Location Button */}
      <div className="pt-3 mt-3 border-t border-gray-50">
        <button
          onClick={() => handleAddLocation(day.dayNumber)}
          className="flex items-center w-full p-3 text-sm text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 rounded-lg transition-colors duration-200 group"
        >
          <PlusIcon className="w-4 h-4 mr-3 group-hover:scale-110 transition-transform" />
          <span className="font-medium">Add location to Day {day.dayNumber}</span>
          <span className="ml-auto text-xs text-gray-400">Click to add</span>
        </button>
      </div>
    </div>
  </div>
)}
```

### Add Location Modal

**Component**: `AddLocationModal.tsx`

**Features**:
- Extends existing `LocationEditModal` patterns
- Google Places API integration
- Real-time validation feedback
- Position selection within day

**Interface**:
```typescript
interface AddLocationModalProps {
  isOpen: boolean;
  dayNumber: number;
  dayDate: string;                    // "Friday, Sept 26" for context
  existingLocations: Location[];      // Current locations in day
  onClose: () => void;
  onSave: (newLocation: CreateTimelineLocationRequest) => Promise<void>;
  onValidate: (placeName: string) => Promise<GooglePlaceResult | null>;
}
```

**Modal Sections**:

1. **Header**
   - "Add Location to Day {dayNumber}"
   - Day context: "Friday, Sept 26 (Arrival & District 1)"

2. **Location Details**
   - Display name field (required)
   - Google Places search field (optional)
   - Real-time validation with visual feedback

3. **Position Selection** *(Phase 1: Simplified)*
   - All new locations automatically added to end of day
   - No position selection needed in initial implementation

4. **Place Validation**
   - "Validate Place" button (same as existing modal)
   - Coordinates display when validated
   - Visual indicators (green filled vs outline)

5. **Actions**
   - Save & Add Another
   - Save & Close
   - Cancel

### Position Selection Logic *(Phase 1: Simplified)*

**Add to End Only**:
```typescript
// Phase 1: Simple end-of-day insertion
function calculateNewSequence(dayLocations: Location[]): number {
  if (dayLocations.length === 0) {
    return 1;
  }
  return Math.max(...dayLocations.map(l => l.sequence)) + 1;
}
```

**Future Enhancement** *(Phase 2)*: Drag-to-reorder functionality will provide flexible positioning after initial implementation is stable.

## State Management & Data Flow

### Timeline State Updates

**Optimistic Updates**: Add location immediately to UI
**Rollback Strategy**: Remove location if API call fails

```tsx
const [timeline, setTimeline] = useState<Timeline>();
const [isAddingLocation, setIsAddingLocation] = useState(false);

const handleAddLocation = async (locationData: CreateTimelineLocationRequest) => {
  // Optimistic update
  const optimisticLocation = createOptimisticLocation(locationData);
  const updatedTimeline = insertLocationIntoTimeline(timeline, optimisticLocation);
  setTimeline(updatedTimeline);

  try {
    // Persist to database
    const response = await createTimelineLocation(locationData);

    if (response.success) {
      // Replace optimistic with real data
      setTimeline(response.timeline);
    } else {
      throw new Error(response.error);
    }
  } catch (error) {
    // Rollback optimistic update
    setTimeline(timeline); // Restore original state
    showErrorMessage(error.message);
  }
};
```

### Sequence Number Management *(Phase 1: Simplified)*

**Algorithm**: Simple append to end of day

```typescript
// Phase 1: Always add to end of day
function calculateNewSequence(dayLocations: Location[]): number {
  if (dayLocations.length === 0) {
    return 1; // First location in day
  }

  // Add to end: find highest sequence + 1
  const maxSequence = Math.max(...dayLocations.map(l => l.sequence));
  return maxSequence + 1;
}
```

**Future Enhancement**: Phase 2 will add drag-to-reorder functionality, eliminating the need for complex insertion algorithms.

## Integration Points

### Google Places API

**Validation Workflow**:
1. User enters place name
2. Client calls `POST /api/locations/validate-place-id`
3. Server queries Google Places API
4. Returns place data with coordinates
5. Modal updates with validated information

**API Key Management**:
```env
# Required in .env.local
GOOGLE_PLACES_API_KEY=your_api_key_here
```

### Directions URL Regeneration

**Impact Analysis**:
- New location affects directions URLs for itself and next location
- Timeline API regenerates all directions for affected day
- Uses existing three-tier fallback system (Place ID → Coordinates → Address)

**Performance Optimization**:
- Only regenerate directions for affected day
- Cache location database queries during regeneration
- Background update for unaffected days

## Error Handling

### Validation Errors

**Client-Side**:
- Required field validation
- Location name uniqueness within day
- Google Places API response validation

**Server-Side**:
- Database constraint validation
- Duplicate location detection
- Sequence number conflicts

### Failure Scenarios

1. **Google Places API Failure**
   - Allow creation with manual coordinates
   - Mark as unvalidated (green outline indicator)
   - Enable later validation via existing menu

2. **Database Failure**
   - Rollback optimistic UI update
   - Show error message with retry option
   - Maintain user form data for retry

3. **Timeline Regeneration Failure**
   - Location still created successfully
   - Warning message about directions URLs
   - Background retry for directions

## User Experience Enhancements

### Visual Feedback

**Adding Location State**:
```tsx
// Loading state while creating
<div className="animate-pulse bg-gray-100 rounded-lg p-3 flex items-center">
  <div className="w-8 h-8 bg-gray-300 rounded-full mr-4"></div>
  <div className="flex-1">
    <div className="h-4 bg-gray-300 rounded mb-2"></div>
    <div className="h-3 bg-gray-200 rounded w-24"></div>
  </div>
</div>
```

**Success Animation**:
- New location slides into position
- Brief highlight effect (green background fade)
- Updated sequence numbers animate into place

### Accessibility

**Keyboard Navigation**:
- Add Location button keyboard accessible
- Modal supports tab navigation
- Screen reader announcements for state changes

**ARIA Labels**:
```tsx
<button
  aria-label={`Add new location to Day ${day.dayNumber}, ${day.date}`}
  aria-describedby={`day-${day.dayNumber}-description`}
>
```

## Testing Strategy

### Unit Tests

**Components**:
- AddLocationModal form validation
- Position selection logic
- Optimistic update behavior

**Services**:
- Timeline location creation API
- Sequence number calculation
- Timeline data merging

### Integration Tests

**API Endpoints**:
- Location creation with Google Places validation
- Timeline data enhancement with database locations
- Error handling for various failure scenarios

**UI Workflow**:
- Complete add location workflow
- Rollback on API failure
- Multiple location addition to same day

### Manual Testing Checklist

- [ ] Add location to beginning of day
- [ ] Add location to middle of day
- [ ] Add location to end of day
- [ ] Add multiple locations to same day
- [ ] Test with Google Places validation
- [ ] Test without Places validation (manual coordinates)
- [ ] Test error scenarios (network failure, API failure)
- [ ] Test sequence renumbering
- [ ] Test directions URL generation
- [ ] Verify database persistence across page refresh

## Performance Considerations

### Database Queries

**Optimization**:
- Single query to fetch all timeline locations
- Batch location details lookup for directions
- Index on `(timeline_day_number, timeline_sequence)` for fast sorting

**Caching**:
- Client-side timeline data caching
- Google Places API response caching
- Location database lookup caching

### UI Responsiveness

**Optimistic Updates**:
- Immediate UI response (< 50ms)
- Background persistence
- Rollback on failure

**Progressive Enhancement**:
- Core functionality works without JavaScript
- Enhanced UX with real-time validation
- Graceful degradation for API failures

## Success Criteria

### Functional Requirements
- [ ] Users can add locations to any timeline day
- [ ] Sequence numbers automatically adjust
- [ ] Google Places integration provides validation
- [ ] Directions URLs generate correctly
- [ ] Database persistence works reliably

### User Experience Requirements
- [ ] Intuitive button placement and labeling
- [ ] Responsive modal with clear workflow
- [ ] Immediate visual feedback
- [ ] Error messages are helpful and actionable
- [ ] New locations visually integrate seamlessly

### Technical Requirements
- [ ] No breaking changes to existing timeline functionality
- [ ] API maintains backward compatibility
- [ ] Database schema additions are non-destructive
- [ ] Performance impact < 200ms for location addition
- [ ] Rollback strategies handle all failure scenarios

## Future Enhancements

### Bulk Operations
- Add multiple locations at once
- Import locations from CSV/KML files
- Duplicate day or location templates

### Phase 2: Drag-to-Reorder (Next Priority)
- Drag and drop reordering within day sections
- Visual drag handles on location items
- Real-time sequence updates during drag operations
- Auto-save position changes to database

### Collaborative Features
- Share timeline with others for location suggestions
- Comment system for location recommendations
- Version history and change tracking

## Implementation Priority

### Phase 1: Core Functionality (MVP)
1. Database schema additions
2. Add location button in timeline
3. Basic modal for location creation
4. API endpoint for timeline location creation
5. Optimistic UI updates with rollback

### Phase 2: Enhanced UX
1. Google Places API integration
2. Position selection within day
3. Real-time validation feedback
4. Success animations and visual polish

### Phase 3: Advanced Features
1. Bulk location operations
2. Enhanced error handling
3. Performance optimizations
4. Comprehensive testing suite

This specification provides a complete roadmap for implementing the "Add New Location to Timeline" feature while maintaining system integrity and user experience excellence.