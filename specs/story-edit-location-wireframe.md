# Story Edit Location Wireframe

## Overview

Interactive wireframe design for the intelligent story location editing interface. This system leverages GPS track correlation to provide smart location suggestions while preserving user control for precise manual input.

## User Journey Context: Wales Collection Example

**Story**: One of 32 stories from "Wales 🏴󠁧󠁢󠁷󠁬󠁳󠁿" collection (Collection #1)
**GPS Correlation**: July 2025 → GPS Track 29 (June 24 - July 2, 2025)
**Regional Context**: Scotland/UK finale with bounding box [50.7°N, -3.3°W, 54.6°N, 0.2°E]
**Auto-suggested Tags**: ["Scotland", "UK", "Wales"]

## Interface Layout

### Header Section
```
┌─────────────────────────────────────────────────────────────┐
│ Edit Story Location                                    [×]  │
│ Wales Collection • Story 15/32 • July 2, 2025 (estimated) │
└─────────────────────────────────────────────────────────────┘
```

### Story Preview Panel
```
┌─────────────────────────────────────────────────────────────┐
│ ┌─────────────────┐  Story Preview                         │
│ │                 │  • Media: Image                        │
│ │   [Story Image] │  • Duration: N/A                       │
│ │                 │  • Collection: Wales 🏴󠁧󠁢󠁷󠁬󠁳󠁿                │
│ └─────────────────┘  • Estimated Date: July 2, 2025       │
│                      • GPS Track: Track 29 (Scotland/UK)   │
└─────────────────────────────────────────────────────────────┘
```

### GPS-Powered Smart Suggestions
```
┌─────────────────────────────────────────────────────────────┐
│ 🎯 Smart Location Suggestions                               │
│ Based on July 2025 GPS Track 29 correlation                │
│                                                             │
│ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐            │
│ │ 🏴󠁧󠁢󠁷󠁬󠁳󠁿 Wales    │ │ 🏴󠁧󠁢󠁳󠁣󠁴󠁿 Scotland │ │ 🇬🇧 UK       │            │
│ │ Auto-Tagged │ │ From Track  │ │ Regional    │            │
│ └─────────────┘ └─────────────┘ └─────────────┘            │
│                                                             │
│ Confidence: GPS-Estimated • Source: Track 29 correlation   │
└─────────────────────────────────────────────────────────────┘
```

### Manual Location Input
```
┌─────────────────────────────────────────────────────────────┐
│ 📍 Manual Location Input                                   │
│                                                             │
│ Location Name                                               │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ Snowdonia National Park, Wales                          │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ Coordinates                                                 │
│ ┌─────────────────────────┐  ┌────────────────────────────┐ │
│ │ Latitude: 53.0685       │  │ Longitude: -3.9044         │ │
│ └─────────────────────────┘  └────────────────────────────┘ │
│                                                             │
│ Location Confidence                                         │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ ◉ High    ○ Medium    ○ Low    ○ Estimated              │ │
│ └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

### Regional Tags Management
```
┌─────────────────────────────────────────────────────────────┐
│ 🏷️ Regional Tags                                           │
│                                                             │
│ Auto-populated from GPS Track 29:                          │
│ ┌─────────┐ ┌─────────┐ ┌─────────┐                        │
│ │ Wales ✓ │ │ UK ✓    │ │Scotland │  [Remove All GPS Tags] │
│ └─────────┘ └─────────┘ └─────────┘                        │
│                                                             │
│ Manual Tags:                                                │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ + Add custom tag...                                     │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐            │
│ │ Snowdonia   │ │ Hiking      │ │ Mountains   │            │
│ └─────────────┘ └─────────────┘ └─────────────┘            │
└─────────────────────────────────────────────────────────────┘
```

### Data Source Transparency
```
┌─────────────────────────────────────────────────────────────┐
│ ℹ️ Data Sources & Confidence                                │
│                                                             │
│ • Estimated Date: Collection chronology (Collection #1)    │
│ • GPS Track: Track 29 correlation (June 24 - July 2, 2025) │
│ • Regional Tags: Auto-populated from GPS track metadata    │
│ • Location: Manual input required (Instagram data limited) │
│                                                             │
│ Tag Source: ◉ Mixed    ○ GPS-Estimated    ○ Manual         │
└─────────────────────────────────────────────────────────────┘
```

### Action Buttons
```
┌─────────────────────────────────────────────────────────────┐
│                    [Cancel]  [Save Changes]                │
└─────────────────────────────────────────────────────────────┘
```

## User Interaction Flows

### Flow 1: GPS-Assisted Quick Tagging
1. **User opens Wales story for editing**
   - System displays estimated date: July 2, 2025
   - GPS correlation identifies Track 29 context

2. **Smart suggestions appear automatically**
   - Tags: Wales, UK, Scotland displayed as clickable options
   - Confidence indicator: "GPS-Estimated"

3. **User accepts GPS suggestions**
   - One-click to accept all regional tags
   - Individual tag removal/addition possible

4. **Manual location refinement**
   - User adds specific location: "Snowdonia National Park"
   - Coordinates auto-suggested or manually entered

5. **Save with mixed data source**
   - Tag source marked as "Mixed" (GPS + Manual)
   - High confidence location data preserved

### Flow 2: Manual Override Workflow
1. **User disagrees with GPS suggestions**
   - Removes auto-populated regional tags
   - GPS context still visible for reference

2. **Full manual input**
   - Custom location name and coordinates
   - Manual regional tags
   - Confidence level selection

3. **Data source tracking**
   - Tag source: "Manual"
   - Original GPS correlation preserved for history

### Flow 3: Bulk Processing Mode (Future Enhancement)
1. **Collection-level editing**
   - Apply GPS tags to entire Wales collection
   - Review and override individual stories as needed

2. **Batch operations**
   - Accept all GPS suggestions for collection
   - Individual story refinement workflow

## Technical Integration Points

### GPS Correlation Service Integration
```typescript
// API endpoint for GPS track correlation
GET /api/gps-track-for-date?date=2025-07-02

Response:
{
  "track_id": 29,
  "date_range": "2025-06-24 to 2025-07-02",
  "regional_tags": ["Scotland", "UK", "Wales"],
  "bounding_box": [50.7, -3.3, 54.6, 0.2],
  "confidence": "gps_estimated"
}
```

### Story Update API
```typescript
// Update story with location data
PUT /api/story/{id}/location

Request:
{
  "location_name": "Snowdonia National Park, Wales",
  "latitude": 53.0685,
  "longitude": -3.9044,
  "location_confidence": "high",
  "regional_tags": ["Wales", "UK", "Snowdonia"],
  "tag_source": "mixed"
}
```

## Mobile Responsive Considerations

### Tablet Layout (768px+)
- Side-by-side story preview and editing panels
- Collapsible GPS suggestions panel
- Touch-friendly tag selection

### Mobile Layout (< 768px)
- Stacked vertical layout
- Collapsible sections with expand/collapse
- Swipe navigation between stories in collection

## Accessibility Features

- **Screen Reader Support**: ARIA labels for all interactive elements
- **Keyboard Navigation**: Tab order through all form fields
- **High Contrast Mode**: Clear visual distinction between data sources
- **Focus Indicators**: Visible focus states for all interactive elements

## Error States & Validation

### GPS Correlation Failures
```
┌─────────────────────────────────────────────────────────────┐
│ ⚠️ GPS Track Correlation Unavailable                       │
│ Unable to load regional suggestions for July 2025.         │
│ Please proceed with manual location input.                 │
│ [Retry GPS Correlation]  [Continue Manually]               │
└─────────────────────────────────────────────────────────────┘
```

### Validation Errors
```
┌─────────────────────────────────────────────────────────────┐
│ ❌ Location Input Validation                               │
│ • Latitude must be between -90 and 90                     │
│ • Longitude must be between -180 and 180                  │
│ • Location name is required when coordinates are provided │
└─────────────────────────────────────────────────────────────┘
```

### Success Confirmations
```
┌─────────────────────────────────────────────────────────────┐
│ ✅ Location Updated Successfully                           │
│ Story location saved with GPS-assisted regional tags.      │
│ [Edit Another Story]  [Return to Collection]               │
└─────────────────────────────────────────────────────────────┘
```

## Performance Considerations

- **GPS Track Caching**: Cache track correlation data for collection-level operations
- **Debounced Input**: Coordinate validation with 500ms debounce
- **Progressive Enhancement**: Core functionality works without JavaScript
- **Lazy Loading**: Load GPS track data only when editing interface is opened

## Future Enhancements

### Phase 2 Features
- **Batch Location Editor**: Edit multiple stories in collection simultaneously
- **Geographic Clustering**: Group similar locations for bulk operations
- **Location History**: Remember frequently used locations for quick selection

### Phase 3 Features
- **Map Integration**: Visual location picker with Mapbox integration
- **Photo Analysis**: AI-powered location suggestions from image content
- **Community Validation**: User-submitted location corrections and verification

---

**Design Status**: Ready for implementation
**Dependencies**: GPS Correlation Service, Story Location API endpoints
**Estimated Development**: 2-3 days for full implementation