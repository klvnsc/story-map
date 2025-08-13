# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

# Story Map Project - Development Context

## Project Overview

### Purpose
- Organize and browse 4,438 Instagram stories from Cyrus's 13-month overland expedition
- Correlate stories with GPS tracking data from 40,674km journey across 7 regions
- Enable efficient story discovery and location-based organization

### Current Status
- **Phase 1 Complete**: All story data extracted and organized (61 collections)
- **Phase 2 Active**: Rapid MVP development (2-3 days)
- **Approach**: Rapid prototyping for single-user development environment

## Data Structure

### Story Collections
- **Total**: 4,438 Instagram stories across 61 highlight collections
- **Location**: `/data-story-collection/` (ig-data.csv + 1.csv through 61.csv)
- **Format**: CSV files with id, media_type, cdn_url, duration, time_added
- **Collections**: Named by region (Wales, England, Scotland, etc.)

### GPS Expedition Data
- **Total**: 40,674km expedition with 9,731 GPS points across 29 tracks
- **Location**: `/data-cy-gps/garmin.md` (detailed track analysis)
- **Route**: Hong Kong → China → Central Asia → Middle East → Africa → Europe → Scotland
- **Timespan**: June 2024 - July 2025

### Key Constraints
- Stories missing individual timestamps and location data
- Same-date strategy: stories within same collection likely occurred on same day
- GPS data used for regional context, not precise story correlation

## Technology Stack

### Core Technologies
- **Frontend**: Next.js 14 with App Router + TypeScript + TailwindCSS
- **Backend**: Supabase (PostgreSQL + Storage)
- **Authentication**: Simple username/password (admin/123) for development
- **Mapping**: Mapbox GL JS + React Map GL
- **Deployment**: Local development only (rapid prototyping)

### Database Schema (3 Tables)
- **story_collections**: 61 highlight collections with metadata
- **stories**: 4,438 individual stories with collection references  
- **gps_waypoints**: 9,731 GPS points from 29 expedition tracks

## ⚠️ Database Field Naming Status

**Current Implementation** (TypeScript Code):
- `user_assigned_date`: Manual user input (highest accuracy)
- `collection_default_date`: Collection-based fallback estimate

**Database Schema** (Supabase):  
- `estimated_date_gps`: Contains manual user input → mapped to `user_assigned_date`
- `estimated_date`: Contains collection estimates → mapped to `collection_default_date`

**Date Precedence Logic**: Use `getBestAvailableDate()` utility function for proper field precedence handling across the transition period.

## Architecture & Key Patterns

### Type System
- **Primary Types**: Defined in `/src/types/index.ts`
- **Database Types**: Auto-generated Supabase types in `/src/lib/supabase.ts`
- **Type Safety**: Full TypeScript coverage with strict mode enabled

### Data Flow Architecture
1. **CSV Import Pipeline**: Raw data → Scripts → Supabase → TypeScript interfaces
2. **Same-Date Strategy**: All stories in a collection share the collection's estimated date
3. **Phase Mapping**: ⚠️ **IMPORTANT**: Collections are in DESCENDING chronological order (1=latest, 61=earliest)

### Authentication Pattern
- Simple localStorage-based auth for development (admin/123)
- Session check in `/src/lib/auth.ts`
- Protected routes via Next.js middleware (not complex OAuth flow)

### Component Architecture
- **App Router Structure**: `/src/app/` for pages, `/src/components/` for reusable UI
- **Supabase Client**: Single instance exported from `/src/lib/supabase.ts`
- **Story Browser**: Main interface component with collection filtering

## Development Commands

### Core Commands
- **Development**: `npm run dev` (runs on port 8000 with Turbopack)
- **Build**: `npm run build`
- **Linting**: `npm run lint`
- **Data Import**: `npm run import-data` (imports CSV data to Supabase)

### Database Operations
- **Schema**: Run `database/schema.sql` in Supabase SQL editor
- **Import Scripts**: Located in `/scripts/` directory
  - `import-csv-data.ts` - Main CSV import (collections + stories)
  - `import-track-data.ts` - GPS waypoint import
  - `update-collection-order.ts` - Collection ordering utilities

### Environment Setup
Required environment variables in `.env.local`:
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN=your_mapbox_access_token
```

## GPS-Story Correlation Strategy

### 🚨 CRITICAL EXPEDITION SCOPE CORRECTION

**MAJOR DISCOVERY**: Collections 52-61 are **NOT part of the 13-month Land Rover expedition**. These contain pre-expedition content that occurred BEFORE the expedition started in July 2024.

### ✅ Corrected Expedition Mapping

**13-Month Expedition Collections (1-51 only)**:

```typescript
// CORRECTED EXPEDITION MAPPING (Collections 1-51 only)
const EXPEDITION_PHASES = {
  // Phase 1: UK/Scotland Finale (Collections 1-15)
  'uk_scotland': { 
    collection_range: [1, 15], 
    tracks: [25, 26, 27, 28, 29],
    date_range: "May-July 2025",
    regions: ["Wales", "England", "Scotland", "UK"]
  },
  
  // Phase 2: Europe/Mediterranean (Collections 16-35)  
  'europe_mediterranean': { 
    collection_range: [16, 35], 
    tracks: [20, 21, 22, 23, 24],
    date_range: "March-May 2025",
    regions: ["Germany", "Morocco", "Spain", "France", "Italy", "Greece", "Bulgaria"]
  },
  
  // Phase 3: Middle East/Caucasus (Collections 36-45)
  'middle_east_caucasus': { 
    collection_range: [36, 45], 
    tracks: [10, 11, 12, 13, 14, 15, 16, 17, 18, 19],
    date_range: "October 2024 - March 2025",
    regions: ["Georgia", "Armenia", "Turkey", "Middle East", "Caucasus"]
  },
  
  // Phase 4: Central Asia (Collections 46-51)
  'central_asia': { 
    collection_range: [46, 51], 
    tracks: [3, 4, 5, 6, 7, 8, 9], // Track 3 has NO collection correlation
    date_range: "July-October 2024",
    regions: ["Tajikistan", "Russia", "Kazakhstan", "Uzbekistan", "Kyrgyzstan"]
  }
};

// EXCLUDED: Pre-expedition content (Collections 52-61)
const EXCLUDED_COLLECTIONS = {
  collection_range: [52, 61], // 10 collections, ~687 stories
  reason: "pre_expedition_content", 
  content: ["Q&A", "Mongolia", "Japan cycling", "Indonesia", "India/Ladakh"],
  gps_correlation: "NONE - occurred before expedition start"
};
```

### 🗺️ Complete Expedition Route Sequence

**Geographic Progression** (13-month Land Rover Defender journey):
```
North China → Central Asia → Middle East → Africa → Mediterranean → Europe → UK → Scotland
```

**Collection Coverage** (DESCENDING chronological order):
- Collections 1-15: **Scotland → UK** (finale, June-July 2025)
- Collections 16-35: **Europe → Mediterranean** (March-May 2025)  
- Collections 36-45: **Africa → Middle East** (Oct 2024-March 2025)
- Collections 46-51: **Central Asia** (July-Oct 2024, starting with Kyrgyzstan)
- **Missing**: **North China** phase (Track 3 exists but no story collections)

### 🔍 Critical Data Gaps Identified

1. **Track 3 Gap**: GPS Track 3 (North China, July 1-18, 2024) has NO corresponding story collections
   - This is the "TRUE EXPEDITION START" but no stories were captured in North China
   - Collection 51 (Kyrgyzstan) is the earliest expedition collection, not North China

2. **Expedition Statistics**:
   - **Expedition Collections**: 51 collections (Collections 1-51) → ~3,750 stories  
   - **Excluded Collections**: 10 collections (Collections 52-61) → ~687 stories
   - **GPS Track Coverage**: Tracks 3-29 (27 tracks) for expedition period only

### Key Technical Constraints
- **No Story Timestamps**: Instagram stories lack individual timestamps
- **Manual Location Input**: Stories require manual lat/lng tagging
- **Collection-Based Dating**: All stories in collection share collection's estimated date
- **GPS Reference Data**: 9,731 waypoints used for location suggestions, not precise correlation

## Code Style Preferences

### File Organization
- Use App Router structure (`/app` directory)
- Component files in `/components` with descriptive names
- Utilities in `/lib` directory
- Type definitions in `/types` directory
- **Documentation Structure**: All specs, requirements, and wireframes in `/specs/` folder

### Naming Conventions
- React components: PascalCase (StoryGrid, MapView)
- Files: kebab-case for pages, PascalCase for components
- Database tables: snake_case (story_collections, gps_waypoints)
- TypeScript interfaces: PascalCase with descriptive names

### Authentication Implementation
- Simple login form with hardcoded credentials (admin/123)
- Session management via localStorage for development
- Protected routes using basic middleware
- No complex authentication flow needed for prototype

## Key Technical Decisions

### Date Estimation Strategy
- All stories within same collection assigned same estimated date
- Date estimation based on GPS expedition phases and collection order
- Manual date override capability for individual stories

### Performance Considerations
- Implement pagination for 4,438 stories (50-100 per page)
- Use Next.js Image optimization for story thumbnails
- Lazy loading for story grid and map components

### GPS Data Handling
- **Limited to high-level metadata** from `data-cy-gps/garmin.md` only
- **Expedition scope filtering**: Only Collections 1-51 have GPS correlation
- **Regional context only**: No individual GPS coordinates available
- **Track-level granularity**: Date ranges and regional descriptions only
- Privacy-focused: no personal route display, only regional context

## Current Implementation Status

### ✅ Completed Features
- Next.js 14 + TypeScript + TailwindCSS setup
- Supabase database schema (3 tables with full type safety)
- CSV data import pipeline with expedition phase mapping
- Simple authentication (admin/123 with localStorage session)
- Story browser with collection filtering
- App Router structure with protected routes

### 🚧 In Development / Planned
- Interactive Mapbox map with story locations
- Manual location tagging interface with GPS waypoint suggestions
- Advanced story search and filtering
- Story detail views with metadata editing

### Key File Locations
```
├── src/app/                    # Next.js App Router pages
├── src/components/             # React components (StoryBrowser, etc.)
├── src/lib/supabase.ts        # Supabase client + type definitions
├── src/types/index.ts         # Main TypeScript interfaces
├── specs/                     # Requirements, wireframes, and technical specifications
│   ├── gps-story-correlation.md           # GPS correlation system specification
│   ├── story-location-editing-requirements.md  # Location editing requirements (127 REQs)
│   ├── story-edit-location-wireframe.md         # Location editing UI wireframe
│   ├── gps-location-api-specifications.md      # API endpoints specification
│   └── collection-gps-correlation-correction.md # Expedition scope corrections
├── scripts/                   # Data import utilities
├── database/                  # Database schema and updates
│   ├── schema.sql                          # Original PostgreSQL schema
│   └── schema-updates-gps-location.sql     # GPS location feature schema updates
└── data-story-collection/     # 61 CSV files (Collections 1-51: expedition, 52-61: excluded)
```
