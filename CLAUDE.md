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

### Collections Manifest (Master Metadata)
- **Location**: `/data/collections-manifest.json` (authoritative collection metadata)
- **Version**: 1.1.0 (created 2025-08-15)
- **Content**: Complete expedition structure with 7 phases, collection metadata, and number mapping
- **Expedition Phases**: pre_expedition (1-8), north_china (9-11), central_asia (12-21), middle_east_caucasus (22-30), europe_part1 (31-41), africa (42-50), europe_uk_scotland (51-61)
- **Collection Mapping**: old_to_new and new_to_old number mapping system for chronological ordering

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

### Date Priority Logic for Stories
**Simplified 3-tier system** for story dates with clear confidence levels:

1. **`user_assigned_date`** - Manual user input (highest confidence)
2. **`gps_estimated_date`** - GPS correlation (medium confidence, future implementation)
3. **`collection.collection_start_date`** - Collection fallback (lowest confidence)

**Implementation**: Use `getBestAvailableDate()` utility function for consistent date precedence across all components.

**Tag Source Values**:
- `'manual'` - User manual input (for stories with location data)
- `null` - Default/auto (for all CSV imported stories)

## Architecture & Key Patterns

### Type System
- **Primary Types**: Defined in `/src/types/index.ts`
- **Database Types**: Auto-generated Supabase types in `/src/lib/supabase.ts`
- **Type Safety**: Full TypeScript coverage with strict mode enabled

### Data Flow Architecture
1. **CSV Import Pipeline**: Raw data → Scripts → Supabase → TypeScript interfaces
2. **Same-Date Strategy**: All stories in a collection share the collection's estimated date
3. **Phase Mapping**: ⚠️ **IMPORTANT**: Collections are in ASCENDING chronological order (1=earliest, 61=latest) based on collections-manifest.json
4. **Unified Tag System**: Three data sources integrated via single tag array with metadata

### Unified Tag System Architecture
**Tag Structure**: Single JSONB array with metadata instead of dual-array system
```typescript
tags: [
  { name: "Wales", type: "regional", source: "gps", created_at: "2025-08-15T10:30:00Z" },
  { name: "hiking", type: "activity", source: "manual", created_at: "2025-08-15T10:31:00Z" },
  { name: "adventure", type: "emotion", source: "journal", created_at: "2025-08-15T10:32:00Z" }
]
```

**Data Sources Integration**:
- **GPS Expedition Data** → Regional tags (Wales, UK, Spain, Central Asia)
- **Story Content Analysis** → Activity tags (hiking, mechanic, food, camping)  
- **Daily Journal Emotions** → Emotion tags (adventure, struggle, joy, reflection)

**Tag Types**:
- `regional` - Geographic context for filtering and map display
- `activity` - Content-based tags for story discovery
- `emotion` - Emotional context from journal integration (future)

**Tag Sources**:
- `gps` - Auto-generated from GPS expedition data
- `manual` - User input via story detail interface
- `journal` - Auto-generated from daily journal analysis (future)
- `ai` - Auto-generated from AI content analysis (future)

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

### CDN URL Renewal Script
**⚠️ IMPORTANT**: Use direct script execution, NOT `npm run renew-cdn-urls` (argument passing issues)

**Correct Usage**:
```bash
npx ts-node --project scripts/tsconfig.json scripts/renew-cdn-urls.ts [command] [options]
```

**Commands**:
- `collection <number>` - Renew single collection
- `collections <numbers>` - Renew multiple (comma-separated: 1,5,10)
- `all` - Renew all collections
- `validate <number>` - Validate only (no updates)

**Key Options**:
- `--dry-run` - Preview changes without updating database
- `--step <1|2|3>` - Run specific step only (1=fetch, 2=parse, 3=update)
- `--skip-fetch` - Use existing HTML files
- `--skip-parse` - Use existing CSV files
- `--rate-limit <ms>` - API rate limiting (default: 1000ms)

**Examples**:
```bash
# Dry run for collection 1
npx ts-node --project scripts/tsconfig.json scripts/renew-cdn-urls.ts collection 1 --dry-run

# Real update for multiple collections
npx ts-node --project scripts/tsconfig.json scripts/renew-cdn-urls.ts collections 1,5,10

# All collections with rate limiting
npx ts-node --project scripts/tsconfig.json scripts/renew-cdn-urls.ts all --rate-limit 2000
```

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

### ✅ Expedition Structure from Collections Manifest

**7-Phase Expedition Structure** (based on collections-manifest.json):

```typescript
// EXPEDITION PHASES from collections-manifest.json
const EXPEDITION_PHASES = {
  // Phase 1: Pre-Expedition Adventures (Collections 1-8) 
  'pre_expedition': {
    collection_range: [1, 8],
    date_range: "2022-2023",
    description: "India/Ladakh, Indonesia, Japan cycling - before main expedition",
    gps_correlation: "NONE - occurred before expedition start"
  },
  
  // Phase 2: North China & Mongolia (Collections 9-11)
  'north_china': {
    collection_range: [9, 11], 
    date_range: "June-July 2024",
    description: "Mongolia Winter, Mongolia, Q&A - expedition preparation",
    regions: ["Mongolia", "General"]
  },
  
  // Phase 3: Central Asia (Collections 12-21)
  'central_asia': {
    collection_range: [12, 21],
    date_range: "July-September 2024", 
    description: "Kyrgyzstan → Kazakhstan → Uzbekistan → Russia → Tajikistan",
    regions: ["Kyrgyzstan", "Kazakhstan", "Uzbekistan", "Russia", "Tajikistan"]
  },
  
  // Phase 4: Middle East & Caucasus (Collections 22-30)
  'middle_east_caucasus': {
    collection_range: [22, 30],
    date_range: "October-November 2024",
    description: "Georgia → Armenia → Turkey", 
    regions: ["Georgia", "Armenia", "Turkey", "Caucasus"]
  },
  
  // Phase 5: Europe Part 1 (Collections 31-41)
  'europe_part1': {
    collection_range: [31, 41],
    date_range: "December 2024 - February 2025",
    description: "Bulgaria → Greece → Italy → MFW → France → Spain",
    regions: ["Bulgaria", "Greece", "Italy", "France", "Spain"]
  },
  
  // Phase 6: Africa (Collections 42-50)
  'africa': {
    collection_range: [42, 50],
    date_range: "February-April 2025", 
    description: "Morocco expedition with Italy crossings",
    regions: ["Morocco", "Africa"]
  },
  
  // Phase 7: Europe Part 2 & UK/Scotland (Collections 51-61)
  'europe_uk_scotland': {
    collection_range: [51, 61],
    date_range: "April-July 2025",
    description: "Germany → England → Wales → Scotland - expedition finale",
    regions: ["Germany", "England", "Wales", "Scotland", "UK"]
  }
};
```

### 🗺️ Complete Expedition Route Sequence

**Geographic Progression** (13-month Land Rover Defender journey):
```
Mongolia → Central Asia → Middle East → Europe → Africa → Europe → UK → Scotland
```

**Collection Coverage** (CHRONOLOGICAL order from manifest):
- Collections 1-8: **Pre-Expedition** (2022-2023) - India/Ladakh, Indonesia, Japan cycling
- Collections 9-11: **North China/Mongolia** (June-July 2024) - Expedition preparation
- Collections 12-21: **Central Asia** (July-September 2024) - Main expedition start
- Collections 22-30: **Middle East/Caucasus** (October-November 2024)
- Collections 31-41: **Europe Part 1** (December 2024-February 2025)
- Collections 42-50: **Africa** (February-April 2025) - Morocco expedition
- Collections 51-61: **Europe/UK/Scotland** (April-July 2025) - Expedition finale

### 📊 Updated Expedition Statistics

Based on collections-manifest.json data:
- **Total Collections**: 61 collections → 4,438 stories
- **Pre-Expedition**: 8 collections (1-8) → ~453 stories
- **Expedition Preparation**: 3 collections (9-11) → ~274 stories  
- **Main Expedition**: 50 collections (12-61) → ~3,711 stories
- **Expedition Phases**: 7 distinct phases with clear geographic progression

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
- **Expedition scope filtering**: Collections 9-61 have GPS correlation (main expedition period, Collections 1-8 excluded as pre-expedition)
- **Regional context only**: No individual GPS coordinates available
- **Track-level granularity**: Date ranges and regional descriptions only
- Privacy-focused: no personal route display, only regional context

### Tag System Implementation
- **Current**: Dual-array system (`regional_tags` + `tags`) with complex synchronization
- **Future**: Unified tag system with metadata (see `/specs/unified-tag-system-requirements.md`)
- **Migration Strategy**: Phased approach maintaining backward compatibility
- **Tag Input**: Manual regional tag editing capability needed for improved story organization

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
- **Unified tag system implementation** (Phase 1: Regional tags, Phase 2: Activity tags, Phase 3: Emotion tags)
- Manual tag input interface for all tag types (regional, activity, emotion)
- Advanced story search and filtering by tag type and source
- Story detail views with comprehensive tag editing capabilities

### Key File Locations
```
├── src/app/                    # Next.js App Router pages
├── src/components/             # React components (StoryBrowser, etc.)
├── src/lib/supabase.ts        # Supabase client + type definitions
├── src/types/index.ts         # Main TypeScript interfaces
├── data/
│   └── collections-manifest.json          # Master collection metadata & expedition structure (v1.1.0)
├── specs/                     # Requirements, wireframes, and technical specifications
│   ├── gps-story-correlation.md           # GPS correlation system specification
│   ├── story-location-editing-requirements.md  # Location editing requirements (127 REQs)
│   ├── story-edit-location-wireframe.md         # Location editing UI wireframe
│   ├── gps-location-api-specifications.md      # API endpoints specification
│   ├── collection-gps-correlation-correction.md # Expedition scope corrections
│   └── unified-tag-system-requirements.md      # Unified tag system specification (NEW)
├── scripts/                   # Data import utilities
│   ├── import-csv-data.ts                  # Main CSV import using manifest metadata
│   └── utils/manifest-collection-mapping.ts # Collection mapping utilities
├── database/                  # Database schema and updates
│   ├── schema.sql                          # Original PostgreSQL schema
│   └── schema-updates-gps-location.sql     # GPS location feature schema updates
└── data-story-collection/     # 61 CSV files with raw story data
```
