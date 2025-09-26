# Story Map Application - System Architecture

## Overview

The Story Map application is a Next.js-based web application designed to organize and browse 4,438 Instagram stories from Cyrus's 13-month overland expedition. The system correlates stories with GPS tracking data from a 40,674km journey across 7 regions, enabling efficient story discovery and location-based organization.

## System Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENT TIER                              │
├─────────────────────────────────────────────────────────────────┤
│ Next.js 14 App Router │ React Components │ TailwindCSS        │
│ TypeScript            │ Location Services │ Authentication      │
└─────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────┐
│                       API LAYER                                 │
├─────────────────────────────────────────────────────────────────┤
│ Next.js API Routes    │ Timeline API     │ Location Management │
│ Google Places API     │ Image Proxy      │ Authentication      │
└─────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────┐
│                      DATABASE TIER                              │
├─────────────────────────────────────────────────────────────────┤
│ Supabase PostgreSQL   │ Story Collections │ GPS Waypoints      │
│ Timeline Locations    │ File Storage     │ Real-time Updates   │
└─────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────┐
│                    EXTERNAL SERVICES                            │
├─────────────────────────────────────────────────────────────────┤
│ Google Places API     │ Google Maps URL API │ Mapbox GL JS     │
│ Instagram CDN         │ Vercel Deployment   │                  │
└─────────────────────────────────────────────────────────────────┘
```

### Technology Stack

| Layer | Technologies | Purpose |
|-------|-------------|---------|
| **Frontend** | Next.js 14, React 18, TypeScript, TailwindCSS | User interface and client-side logic |
| **Backend** | Next.js API Routes, Node.js | Server-side API endpoints |
| **Database** | Supabase (PostgreSQL), Row Level Security | Data persistence and real-time features |
| **Authentication** | Simple localStorage (development) | User session management |
| **Mapping** | Mapbox GL JS, React Map GL | Interactive mapping interface |
| **External APIs** | Google Places API, Google Maps URL API | Location validation and navigation |
| **Deployment** | Vercel, GitHub Actions | Continuous deployment pipeline |

## Component Breakdown

### Core Application Components

```
src/
├── app/                          # Next.js App Router
│   ├── (auth)/                   # Authentication routes
│   ├── api/                      # API endpoints
│   │   ├── timeline-data/        # Timeline data API
│   │   ├── locations/            # Location management API
│   │   └── proxy-image/          # Image proxy for Instagram CDN
│   ├── stories/                  # Story browser page
│   ├── timeline/                 # Timeline interface
│   └── map/                      # Interactive map view
├── components/                   # Reusable UI components
│   ├── StoryGrid.tsx            # Story display grid
│   ├── TimelineView.tsx         # Timeline interface
│   ├── LocationEditModal.tsx    # Location editing modal
│   ├── MapView.tsx              # Interactive map component
│   └── AuthGuard.tsx            # Authentication wrapper
├── lib/                         # Core business logic
│   ├── supabase.ts             # Database client and types
│   ├── timeline-locations-db.ts # Location database service
│   ├── location-service.ts     # Client-side location API
│   ├── google-places.ts        # Google Places integration
│   ├── auth.ts                 # Authentication utilities
│   └── utils.ts                # Expedition phase utilities
└── types/                      # TypeScript type definitions
    ├── index.ts                # Core application types
    └── timeline-locations.ts   # Location-specific types
```

### Component Responsibilities

#### **Frontend Components**

- **StoryGrid**: Displays story thumbnails with collection filtering and pagination
- **TimelineView**: Shows chronological story progression with location context
- **LocationEditModal**: Provides inline editing for location details and Place ID validation
- **MapView**: Interactive mapping interface with story location visualization
- **AuthGuard**: Protects routes and manages authentication state

#### **API Endpoints**

- **`/api/timeline-data`**: Serves structured timeline data with location correlations
- **`/api/locations`**: CRUD operations for location management
- **`/api/locations/validate-place-id`**: Google Places API validation endpoint
- **`/api/proxy-image`**: Proxies Instagram CDN images to handle CORS

#### **Service Layer**

- **timeline-locations-db.ts**: Server-side database operations for location management
- **location-service.ts**: Client-side API wrapper for location operations
- **google-places.ts**: Google Places API integration with caching
- **auth.ts**: Simple authentication utilities for development

## Database Schema Details

### Core Tables

#### `story_collections` (64 collections)
```sql
CREATE TABLE story_collections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  collection_number INTEGER UNIQUE NOT NULL,
  collection_name VARCHAR(255) NOT NULL,
  story_count INTEGER DEFAULT 0,
  collection_start_date DATE,
  collection_end_date DATE,
  expedition_phase VARCHAR(50),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

**Purpose**: Metadata for Instagram highlight collections with expedition phase mapping

#### `stories` (4,438+ individual stories)
```sql
CREATE TABLE stories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  story_id VARCHAR(255) UNIQUE NOT NULL,
  collection_id UUID REFERENCES story_collections(id),
  media_type VARCHAR(20) NOT NULL,
  cdn_url TEXT NOT NULL,
  duration INTEGER,
  time_added TIMESTAMP,
  user_assigned_date DATE,
  gps_estimated_date DATE,
  tags JSONB DEFAULT '[]',
  regional_tags VARCHAR(255)[],
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

**Purpose**: Individual story records with unified tag system and date priority logic

#### `timeline_locations` (Location database)
```sql
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

**Purpose**: Dynamic location database with Google Places API integration

#### `gps_waypoints` (9,731 GPS points)
```sql
CREATE TABLE gps_waypoints (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  track_name VARCHAR(255) NOT NULL,
  waypoint_name VARCHAR(255),
  latitude DECIMAL(10, 8) NOT NULL,
  longitude DECIMAL(11, 8) NOT NULL,
  elevation INTEGER,
  timestamp_utc TIMESTAMP,
  track_segment INTEGER,
  created_at TIMESTAMP DEFAULT NOW()
);
```

**Purpose**: GPS expedition data for regional context and location suggestions

### Database Relationships

```
story_collections (1) ──→ (many) stories
                 │
                 └─→ expedition_phase mapping

timeline_locations ←──→ Google Places API
                 │
                 └─→ directions URL generation

gps_waypoints ──→ regional_tags correlation
```

### Data Flow Architecture

1. **CSV Import Pipeline**: Raw data → Import Scripts → Supabase → TypeScript interfaces
2. **Same-Date Strategy**: All stories in collection share collection's estimated date
3. **Phase Mapping**: Collections ordered chronologically (1=earliest, 64=latest)
4. **Unified Tag System**: Single JSONB array with metadata instead of dual-array system

## Key Features Implemented

### 1. Location Database Management System

**Architecture**: Three-tier fallback system for directions URL generation

- **Primary**: Place IDs + Names (most readable)
- **Secondary**: Coordinates (most reliable)
- **Tertiary**: Address strings (final fallback)

**Implementation**: `/src/lib/timeline-locations-db.ts`

```typescript
if (originLocation.placeId && destinationLocation.placeId) {
  // PRIMARY: Human-readable URLs with Place IDs
  params.set('origin_place_id', originLocation.placeId);
  params.set('destination_place_id', destinationLocation.placeId);
  params.set('origin', originLocation.name);
  params.set('destination', destinationLocation.name);
} else if (originLocation.coordinates && destinationLocation.coordinates) {
  // SECONDARY: Reliable coordinate-based routing
  params.set('origin', `${originLocation.coordinates.lat},${originLocation.coordinates.lng}`);
  params.set('destination', `${destinationLocation.coordinates.lat},${destinationLocation.coordinates.lng}`);
} else {
  // TERTIARY: Address string fallback
  params.set('origin', originLocation.fullAddress);
  params.set('destination', destinationLocation.fullAddress);
}
```

### 2. Google Places API Integration

**Features**:
- Real-time Place ID validation
- In-memory caching with 24-hour TTL
- Confidence scoring (high/medium/low)
- Rate limiting for API compliance

**Implementation**: `/src/lib/google-places.ts`

### 3. Expedition Phase Mapping

**Architecture**: Dual system synchronization for GPS correlation and date-based mapping

- **GPS Correlation System**: Collection ranges for location tagging
- **Utils Date System**: Date ranges for map color coding
- **Critical Requirement**: Both systems must stay synchronized

**Data Structure**: 8-phase expedition spanning 13 months
```typescript
const EXPEDITION_PHASES = {
  pre_expedition: { collection_range: [1, 8], date_range: "2022-2023" },
  north_china: { collection_range: [9, 11], date_range: "June-July 2024" },
  central_asia: { collection_range: [12, 21], date_range: "July-September 2024" },
  middle_east_caucasus: { collection_range: [22, 30], date_range: "October-November 2024" },
  europe_part1: { collection_range: [31, 41], date_range: "December 2024 - February 2025" },
  africa: { collection_range: [42, 50], date_range: "February-April 2025" },
  europe_uk_scotland: { collection_range: [51, 61], date_range: "April-July 2025" },
  arctic_finale: { collection_range: [62, 64], date_range: "July-August 2025" }
};
```

### 4. Unified Tag System

**Current**: Dual-array system (`regional_tags` + `tags`) with complex synchronization
**Future**: Single JSONB array with metadata

```typescript
tags: [
  { name: "Wales", type: "regional", source: "gps", created_at: "2025-08-15T10:30:00Z" },
  { name: "hiking", type: "activity", source: "manual", created_at: "2025-08-15T10:31:00Z" },
  { name: "adventure", type: "emotion", source: "journal", created_at: "2025-08-15T10:32:00Z" }
]
```

### 5. Authentication & Security

**Development Setup**:
- Simple localStorage-based authentication (admin/123)
- Row Level Security (RLS) policies in Supabase
- Protected API routes with session validation

**Production Considerations**:
- OAuth integration ready for scaling
- Environment variable management
- CORS handling for Instagram CDN

### 6. Performance Optimizations

**Database**:
- Batch operations for location lookups
- Indexed queries on collection numbers and location names
- Efficient JSON queries for tag systems

**Frontend**:
- Next.js Image optimization for story thumbnails
- Lazy loading for story grids and map components
- In-memory caching for Google Places API results

**API**:
- Request debouncing for location validation
- Rate limiting for external API calls
- Image proxy to handle Instagram CDN CORS

## Development & Deployment

### Environment Setup
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN=your_mapbox_access_token
GOOGLE_PLACES_API_KEY=your_google_places_api_key
```

### Key Commands
- **Development**: `npm run dev` (port 8000 with Turbopack)
- **Build**: `npm run build`
- **Data Import**: `npm run import-data`
- **CDN Renewal**: `npx ts-node scripts/renew-cdn-urls.ts`

### Deployment Pipeline
- **Platform**: Vercel with GitHub integration
- **Auto-deployment**: Main branch pushes
- **Production URL**: https://story-map-three.vercel.app/
- **Environment**: Development credentials (admin/123)

## Future Roadmap

### Phase 1: Enhanced Location Management
- Complete unified tag system migration
- Advanced search and filtering by tag type
- Bulk location validation tools

### Phase 2: Interactive Mapping
- Story correlation with GPS tracks
- Heat map visualization of story density
- Advanced filtering by geographic regions

### Phase 3: Story Analysis
- AI-powered content analysis for activity tags
- Daily journal integration for emotion tags
- Advanced expedition statistics and insights

This architecture supports the current rapid MVP development while providing clear paths for future enhancements and scaling.