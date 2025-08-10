# Story Map App

A Next.js application for organizing and browsing 4,438 Instagram stories from Cyrus's 13-month overland expedition with GPS context.

## Project Overview

- **Stories**: 4,438 Instagram stories across 61 collections
- **GPS Data**: 40,674km expedition with 9,731 waypoints
- **Route**: Hong Kong → China → Central Asia → Middle East → Africa → Europe → Scotland
- **Tech Stack**: Next.js 14, TypeScript, Supabase, Mapbox

## Quick Start

### 1. Environment Setup

1. Create a Supabase project at [supabase.com](https://supabase.com)
2. Get a Mapbox access token at [mapbox.com](https://mapbox.com)
3. Update `.env.local` with your credentials:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN=your_mapbox_access_token
```

### 2. Database Setup

1. Copy the contents of `database/schema.sql`
2. Run it in your Supabase SQL editor
3. This creates the 3-table schema (collections, stories, gps_waypoints)

### 3. Data Import

Import the CSV data:

```bash
# Make sure you're in the story-map-app directory
cd story-map-app

# Run the import script
npm run import-data
```

### 4. Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Open http://localhost:3000
```

### 5. Login

- **Username**: admin
- **Password**: 123

## Project Structure

```
story-map-app/
├── src/
│   ├── app/                 # Next.js App Router pages
│   ├── components/          # React components
│   ├── lib/                 # Utilities (auth, supabase)
│   └── types/              # TypeScript definitions
├── database/
│   └── schema.sql          # Database schema
├── scripts/
│   └── import-csv-data.ts  # Data import script
└── .env.local              # Environment variables
```

## Database Schema

### story_collections
- 61 highlight collections with expedition phases
- Maps collections to GPS expedition phases

### stories  
- 4,438 individual stories
- Same-date strategy: all stories in collection get same date
- Manual location tagging capability

### gps_waypoints
- 9,731 GPS points from expedition
- Used for location context and suggestions

## Expedition Phases

- **Collections 1-15**: North China (July 2024)
- **Collections 16-35**: Central Asia (Aug-Oct 2024)  
- **Collections 36-45**: Middle East (Oct-Dec 2024)
- **Collections 46-55**: Africa (Jan-Mar 2025)
- **Collections 56-60**: Europe (Mar-May 2025)
- **Collection 61**: Scotland (May-July 2025)

## Development Commands

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run lint         # Run ESLint
npm run import-data  # Import CSV data to Supabase
```

## Features

- ✅ Simple authentication (admin/123)
- ✅ Story collection browsing
- ✅ GPS expedition context
- 🚧 Interactive story map
- 🚧 Location tagging system
- 🚧 Story search and filtering

## Data Sources

- **Story Data**: `../data-story-collection/` (ig-data.csv + 1-61.csv)
- **GPS Data**: `../data-cy-gps/garmin.md` (expedition analysis)
