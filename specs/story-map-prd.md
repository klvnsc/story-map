# Mini PRD: Cyrus Instagram Story Archive Tool

## Problem
Travel content creator Cyrus has **4,438 Instagram stories** (across 61 highlight collections) from his epic 13-month expedition (China→Africa→Europe→Scotland) with no organization system. Instagram Highlights contain the real travel content (destinations, food, behind-scenes) but are impossible to browse, search, or repurpose efficiently. GPS data shows he covered incredible ground, but the **Instagram Highlights hold the actual content value**.

## Solution
Custom web tool to organize and make Cyrus's **Instagram Highlight archives** easily browsable and searchable, with GPS expedition data providing geographical context for better organization.

## Target User
**Primary:** Cyrus - Content creator (5K+ followers) who documented entire 13-month overland expedition through **Instagram Highlights** (4,438 stories across 61 collections) but needs to unlock this content archive for repurposing

## Core Features (MVP - Day 1-3)

### 1. Instagram Story Archive Import
- ✅ **COMPLETED**: Extracted ALL 4,438 Instagram story links and metadata
- ✅ **COMPLETED**: Handled all stories across 61 collections without performance issues
- ✅ **COMPLETED**: Preserved story content data via StorySaver.net API
- ✅ **COMPLETED**: Extracted metadata: collection organization, story counts
- ⚠️ **DATA LIMITATION**: Instagram stories missing individual timestamps and location data

### 2. Simple Authentication System 🆕
- **Basic Login**: Username/password authentication for development access
- **Default Credentials**: Username: `admin`, Password: `123`
- **Session Management**: Simple localStorage-based session handling
- **Protected Routes**: Basic middleware for route protection
- **Development-Only**: Simple auth suitable for rapid prototyping

### 3. Smart Story Organization  
- **Same-Date Strategy**: Stories within same collection assigned same date (most likely scenario for 4,438 stories)
- ✅ **COMPLETED**: Collection organization by expedition phases (61 highlight collections)
- **Date estimation**: Collection-based date assignment with manual override capability
- **Content type separation**: Photos vs videos identification from CSV data
- **Chronological browsing**: Timeline view using estimated collection dates

### 4. Story Browser & Search
- **Visual grid**: Story thumbnails with key metadata for 4,438 stories
- **Collection filtering**: Browse by expedition phase and highlight collection
- **Date-based search**: Find stories by estimated date ranges
- **Quick preview**: Click to view full story content from CSV data
- **GPS context**: Show related GPS track information for location reference

### 5. GPS Data Integration 🆕
- **GPS Import**: Import and process 40,674km expedition GPS tracking data (29 tracks, 9,731 points)
- **Expedition Route**: Hong Kong → North China → Central Asia → Middle East → Africa → Mediterranean → Europe → UK → Scotland
- **Collection-to-Phase Mapping**: Associate story collections with GPS expedition phases:
  - Collections 1-15 → North China phase (July 2024)
  - Collections 16-35 → Central Asia phase (Aug-Oct 2024)
  - Collections 36-45 → Middle East phase (Oct-Dec 2024)
  - Collections 46-55 → Africa phase (Jan-Mar 2025)
  - Collections 56-60 → Europe phase (Mar-May 2025)
  - Collection 61 → Scotland finale (May-July 2025)
- **Geographic Context**: Use GPS waypoints to suggest story locations
- **Manual Location Input**: GPS-assisted location tagging for individual stories

## Enhanced Features (Future Development)
**Post-MVP enhancements based on user feedback:**

**Option A: Content Management Focus**
- **Advanced story search**: Filter by location, content type, date ranges
- **Story tagging system**: Custom tags for content repurposing
- **Batch export tools**: Download multiple stories for content creation
- **Content analytics**: Most popular locations, content gaps, posting patterns

**Option B: Journey Visualization Focus** 🎯 *Recommended with GPS context*
- **Interactive Story Timeline**: 4,438 Instagram stories plotted on expedition timeline
- **GPS Route Visualization**: Full expedition route display with story overlay
- **Location clustering**: See all stories from specific destinations using GPS context + manual location data
- **Trip highlights**: Best content from each expedition phase (China→Africa→Europe→Scotland)

## Success Metrics
- ✅ **Technical:** Successfully imported and organized 4,438 Instagram stories across 61 collections
- **User:** Find specific story content in <30 seconds
- **Business:** Validate market for **travel content organization tools**

## Tech Stack
- **Frontend:** Next.js 14 + TypeScript + TailwindCSS + App Router
- **Backend:** Supabase (PostgreSQL + Storage) 
- **Authentication:** Simple username/password (admin/123) for development
- **Mapping:** Mapbox GL JS + React Map GL
- **Data Processing:** CSV import and GPS data migration scripts
- **Deployment:** Local development only (rapid prototyping)

## Data Assets Available
- ✅ **Primary**: 4,438 Instagram stories (photos/videos) with collection metadata ⚠️ *Missing individual timestamps/locations*
- ✅ **GPS Data**: 40,674km expedition with 9,731 GPS points across 29 tracks (detailed analysis available)
- **Story Collections**: 61 highlight collections organized by expedition phases
- **Story Types**: Destinations, food, behind-scenes, travel moments  
- **Expedition Route**: Hong Kong → China → Central Asia → Middle East → Africa → Europe → Scotland
- **Timespan**: 13-month journey documentation (June 2024 - July 2025)

## Data Limitations & Workarounds
⚠️ **Instagram Story Metadata Missing:**
- **No individual timestamps** → Use same-date strategy: all stories in collection get same estimated date
- **No location data** → GPS-assisted manual location input system with expedition phase context
- **No automatic geotagging** → User-driven location tagging with GPS waypoint suggestions

📍 **GPS Integration Strategy:**
- **Collection-to-Phase Mapping** → Associate story collections with GPS expedition phases by date
- **Geographic Context** → Use GPS waypoints to suggest locations during manual tagging
- **Regional Association** → Group stories by expedition regions for easier browsing

## Updated Timeline - Rapid Development Approach
✅ **Phase 1 Complete (Data Extraction)**: Story extraction and organization
- All 4,438 stories extracted across 61 collections
- Metadata and collection inventory complete
- GPS expedition data analyzed (40,674km, 29 tracks, 9,731 points)

🚀 **Phase 2 (Current - Rapid MVP Development): 2-3 days**
- Day 1: Next.js setup + Simple auth + Supabase schema + CSV migration
- Day 2: Story browser interface + GPS data import + Collection filtering
- Day 3: GPS-story correlation + Interactive map + Location input system

🎯 **Phase 3 (Enhancement - Future): Post-MVP**
- Advanced search and filtering capabilities
- Enhanced GPS route visualization  
- Story export and content management tools

## Current Project Status
✅ **Phase 1 Complete: Data Extraction & Analysis**
- All 4,438 stories extracted and organized into 61 collections
- Story metadata and counts available in CSV format
- GPS expedition data fully analyzed with track details

🚀 **Phase 2 Active: Rapid MVP Development**
- Building Next.js application with rapid prototyping approach
- Implementing simple authentication and database integration
- Creating story browser with GPS-assisted location features

## Key Constraints
- Solo builder project focused on **Instagram highlight organization**
- Single user (Cyrus) with massive story archive (4,438 stories) now ready for interface development
- ✅ **Completed**: Story data extraction and preservation
- **Primary value**: Making 4,438 stories browsable, searchable, and geographically contextualized

## Out of Scope
- Multi-user support (focus on perfecting Cyrus's story organization)
- Complex GPS analysis (GPS data is context, not primary feature)
- Real-time story capture (this is historical archive organization)
- Other social platforms (Instagram Highlights are the content goldmine)
- Advanced AI content analysis (manual organization is sufficient for MVP)

## Next Steps (Priority Order) - Rapid Development

### 🔥 Day 1 (Immediate)
1. **Next.js Project Setup**: Initialize Next.js 14 with TypeScript, TailwindCSS, App Router
2. **Simple Authentication**: Implement basic login (username: admin, password: 123)
3. **Supabase Database**: Create 3-table schema (collections, stories, gps_waypoints)
4. **CSV Data Migration**: Import story collections and individual story CSV files with same-date strategy

### 🎯 Day 2 (Core Features)  
5. **Story Browser Interface**: Grid view displaying 4,438 stories with thumbnails and metadata
6. **Collection Filtering**: Filter stories by expedition phase and highlight collection
7. **GPS Data Import**: Import and process 29 GPS tracks with 9,731 waypoints
8. **Basic Search**: Find stories by collection name or expedition phase

### 🚀 Day 3 (GPS Integration)
9. **GPS-Story Correlation**: Associate story collections with GPS expedition phases
10. **Interactive Story Map**: Mapbox display with GPS route and story location context
11. **Manual Location Input**: GPS-assisted location tagging system for individual stories
12. **Location Suggestions**: Use GPS waypoints to suggest locations during story tagging

### 📊 Success Metrics Updated
- ✅ Data extraction: 4,438 stories across 61 collections complete
- 🎯 Interface: Browse any story in <30 seconds
- 🎯 GPS Integration: View stories with GPS-referenced locations on map  
- 🎯 User Validation: CY can efficiently find and repurpose travel content