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

### ⚠️ Expedition Phase Mapping Issue

**CRITICAL DATA ORDERING BUG**: The current phase mapping in `scripts/import-csv-data.ts` assumes ascending chronological order, but the actual CSV data (`ig-data.csv`) is in **DESCENDING** order:

```typescript
// CURRENT (INCORRECT) MAPPING:
const EXPEDITION_PHASES = {
  'north_china': { start: 1, end: 15, date: '2024-07-01' },     // Actually Scotland/Europe
  'central_asia': { start: 16, end: 35, date: '2024-08-31' },  // Actually Africa/Middle East
  'middle_east': { start: 36, end: 45, date: '2024-10-17' },   // Actually Central Asia  
  'africa': { start: 46, end: 55, date: '2025-01-06' },        // Actually North China
  'europe': { start: 56, end: 60, date: '2025-03-14' },        // Actually India/Ladakh
  'scotland': { start: 61, end: 61, date: '2025-06-24' }       // Actually India/Ladakh
};
```

**Actual CSV Order** (row 1 = latest, row 61 = earliest):
- Collections 1-15: Scotland/Wales/England (June-July 2025)
- Collections 16-35: Europe/Morocco/Spain (Mar-May 2025) 
- Collections 36-45: Africa/Middle East (Jan-Mar 2025)
- Collections 46-55: Central Asia/Mongolia (Aug-Dec 2024)
- Collections 56-61: North China/India/Ladakh (June-Aug 2024)

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
- Import GPS tracks as reference data, not for precise correlation
- Use for geographic context and location suggestions
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
├── scripts/                   # Data import utilities
├── database/schema.sql        # PostgreSQL schema
└── data-story-collection/     # 61 CSV files (ig-data.csv + 1.csv-61.csv)
```
