# Timeline Feature with Google Maps Integration

## Overview
Interactive timeline page that displays Sharon's Vietnam trip itinerary with Google Maps directions and export functionality.

## Travel Context
- **Location**: Ho Chi Minh City, Vietnam
- **Area**: Primarily District 1 and surrounding areas
- **Transport Mode**: Walking directions between locations
- **Duration**: 6-day Vietnam itinerary (Sept 26 - Oct 1)

## Data Source
- **File**: `/data/sharon-trip.txt`
- **Format**: Plain text with day headers and location lists
- **Content**: 6-day Vietnam itinerary with District 1 as central location

## Core Features

### 1. Timeline Display
- **Route**: `/timeline`
- **Layout**: Collapsible date sections matching provided mockup
- **Structure**: Day headers with expandable location lists
- **Styling**: Consistent with existing TailwindCSS theme

### 2. Google Maps Directions Integration
- **Feature**: Blue "Directions" links for each location
- **Functionality**: Generate point-to-point navigation URLs
- **URL Format**: `https://maps.google.com/directions/?api=1&origin=[prev_location]&destination=[current_location]`
- **Logic**: Link each location to the previous location in sequence
- **Special Cases**:
  - First location of each day: Directions from last location of previous day
  - Airport locations: Handle as special waypoints

### 3. Google My Maps Export
- **Feature**: Export entire itinerary to Google My Maps
- **Format**: CSV or KML file generation
- **Content**: All locations with day/sequence numbering
- **Metadata**: Include location names, day numbers, and descriptions
- **User Workflow**: Download file → Import to Google My Maps

## Technical Implementation

### Data Structure
```typescript
interface TripDay {
  dayNumber: number;
  date: string;
  description: string;
  locations: Location[];
}

interface Location {
  name: string;
  sequence: number;
  dayNumber: number;
  directionsUrl?: string;
}
```

### Component Hierarchy
```
TimelinePage
├── TimelineHeader (with export button)
├── ExportControls
└── DaySection[] (collapsible)
    ├── DayHeader
    └── LocationItem[] (with directions links)
```

### File Processing
- Parse sharon-trip.txt line by line
- Extract day headers (Day X - Date format)
- Group locations under each day
- Generate sequence numbers and directions URLs

## UI/UX Requirements

### Visual Design
- Match mockup layout exactly
- Collapsible sections with arrow indicators
- Numbered waypoints (green circular badges)
- Blue "Directions" links
- Clean typography and spacing

### Responsive Design
- Mobile-friendly collapsible sections
- Readable typography on small screens
- Touch-friendly buttons and links

### Navigation Integration
- Add "Timeline" to existing Navigation component
- Icon: 🗓️
- Position: Between existing nav items

## Google Maps Integration

### Directions URLs
- No API key required for basic Google Maps URLs
- Handle URL encoding for location names
- Support both walking and driving directions
- Fallback to location search if directions fail

### Export Functionality
- Generate downloadable CSV/KML files
- Include coordinates if available (future enhancement)
- Compatible with Google My Maps import format
- Error handling for export failures

## Development Notes

### Dependencies
- No additional npm packages required initially
- Use existing Next.js and TailwindCSS setup
- File system API for reading sharon-trip.txt

### Testing
- Test with sharon-trip.txt data
- Verify Google Maps URL generation
- Test export file format compatibility
- Mobile responsive testing

### Future Enhancements
- Add coordinates to location data
- Support multiple trip files
- Integration with main story map data
- Real-time directions API integration