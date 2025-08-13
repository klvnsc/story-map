# GPS-Story Date-to-Region Correlation System

## Problem Statement

The Story Map application currently faces a critical data correlation challenge:

- **Instagram Stories**: 4,438 stories across 61 collections are chronologically sorted but lack precise individual dates and geographic locations
- **GPS Expedition Data**: 29 GPS tracks provide detailed date ranges and regional context but are not correlated to individual stories
- **Current Limitation**: Stories can only be manually tagged with locations, making it impractical to plot all 4,438 stories on the expedition map

**Goal**: Leverage the chronological relationship between story collections and GPS track periods to automatically populate stories with estimated dates and regional tags.

## Solution Overview

### Core Logic Flow
```
Story → Collection → Estimated Date → GPS Track Period → Regional Tags
```

### Example Correlation
1. Story belongs to "Wales" collection (Collection #1)
2. Collection #1 maps to estimated date: July 2025  
3. July 2025 corresponds to GPS Track 29 (June 24 - July 2, 2025)
4. Track 29 provides regional tags: ["Scotland", "UK", "Wales"]

## Data Source Analysis

### Instagram Story Collections
- **Total**: 61 collections containing 4,438 stories
- **Ordering**: Collections are sorted in **DESCENDING chronological order** (1=latest, 61=earliest)
- **Geographic Themes**: Collections named by regions (Wales, England, Scotland, Europe, Africa, Central Asia, North China)
- **Data Available**: Collection name, story count, collection index
- **Data Missing**: Individual story timestamps, precise locations

### GPS Expedition Tracks  
- **Total**: 29 tracks spanning June 11, 2024 → July 2, 2025 (13+ months)
- **Route**: Hong Kong → North China → Central Asia → Middle East → Africa → Europe → UK → Scotland
- **Data Available**: Track date ranges, geographic bounding boxes, regional descriptions
- **Data Limitation**: Individual GPS waypoints are NOT accessible (only high-level track metadata)

## Date-to-Region Correlation Mapping

Based on GPS track analysis from `data-cy-gps/garmin.md`:

### **⚠️ CORRECTED EXPEDITION MAPPING (Collections 1-51 Only)**

**13-Month Land Rover Expedition Collections:**

| Collection Range | Estimated Date Range | GPS Tracks | Regional Tags | Expedition Phase |
|------------------|---------------------|------------|---------------|------------------|
| 1-15 | May-July 2025 | Tracks 25-29 | ["UK", "England", "Scotland", "Wales"] | uk_scotland |
| 16-35 | March-May 2025 | Tracks 20-24 | ["Europe", "Germany", "France", "Mediterranean"] | europe_mediterranean |
| 36-45 | October 2024-March 2025 | Tracks 10-19 | ["Africa", "Morocco", "Middle East", "Turkey"] | middle_east_caucasus |
| 46-51 | July-October 2024 | Tracks 3-9 | ["Central Asia", "Kazakhstan", "Kyrgyzstan"] | central_asia |

**⚠️ EXCLUDED: Collections 52-61 (Pre-Expedition Content)**
- **Collections 52-61**: Pre-expedition content (Q&A, Mongolia, Japan cycling, Indonesia, India/Ladakh)
- **NOT part of 13-month Land Rover expedition**  
- **No GPS correlation applicable**
- **Reason**: Content occurred before expedition start (July 2024)

### Key GPS Track References

**Track 3** (July 1-18, 2024) - North China Expedition Start
- Bounding Box: [40.8°N, 85.2°E, 52.5°N, 111.9°E]  
- Regional Context: North China → Central Asia transition

**Track 19** (Jan 6 - March 12, 2025) - African/Mediterranean Epic
- Bounding Box: [29.8°N, -9.6°W, 46.6°N, 17.3°E]
- Regional Context: North Africa → Atlantic coast → Mediterranean

**Track 29** (June 24 - July 2, 2025) - Scotland Finale  
- Bounding Box: [50.7°N, -3.3°W, 54.6°N, 0.2°E]
- Regional Context: England → Scotland expedition completion

## Technical Requirements

### Phase 1: Date Estimation Algorithm
- **Input**: Collection index (1-61), story index within collection
- **Output**: Estimated date for individual story
- **Logic**: Linear interpolation within collection date range based on story position

### Phase 2: Regional Tag Auto-Population
- **Service**: `GPSCorrelationService.getRegionalTags(estimatedDate)`
- **Input**: Estimated story date
- **Output**: Array of regional tags based on active GPS track
- **Database**: Update stories table with auto-populated regional tags

### Phase 3: User Review Interface
- **Bulk Review**: Interface to approve/reject suggested regional tags
- **Individual Override**: Allow manual tag editing for specific stories  
- **Confidence Indicators**: Show data source (GPS-estimated vs manually tagged)

### Phase 4: Map Integration
- **Regional Filtering**: Filter map stories by regional tags
- **Timeline Visualization**: Optional timeline slider based on estimated dates
- **Tag-based Clustering**: Group story markers by regional tags

## Database Schema Changes

### Stories Table Updates
```sql
-- Add date fields with clear naming
ALTER TABLE stories ADD COLUMN user_assigned_date TIMESTAMP WITH TIME ZONE;
ALTER TABLE stories ADD COLUMN collection_default_date TIMESTAMP WITH TIME ZONE;

-- Add regional tags from GPS correlation  
ALTER TABLE stories ADD COLUMN regional_tags TEXT[];

-- Add metadata about tag source
ALTER TABLE stories ADD COLUMN tag_source VARCHAR(20) DEFAULT 'gps_estimated';
-- Options: 'gps_estimated', 'manual', 'mixed'

-- Add indexing for performance
CREATE INDEX idx_stories_user_assigned_date ON stories(user_assigned_date);
CREATE INDEX idx_stories_collection_default_date ON stories(collection_default_date);
CREATE INDEX idx_stories_regional_tags ON stories USING GIN(regional_tags);
```

## API Endpoints

### Core Services
```typescript
POST /api/correlate-story-dates
// Bulk process all stories to estimate dates from collection chronology

GET /api/gps-track-for-date?date=2025-01-15
// Get GPS track active during specified date

POST /api/populate-regional-tags  
// Auto-populate regional tags based on estimated dates

PUT /api/story/{id}/tags
// Update individual story tags with manual overrides
```

## Implementation Phases

### Phase 1: Data Correlation Foundation
- [ ] Create date estimation algorithm based on collection position
- [ ] Build GPS track lookup service by date range
- [ ] Implement regional tag extraction from track metadata
- [ ] Populate estimated_date_gps for all stories

### Phase 2: Regional Tag System
- [ ] Auto-populate regional_tags based on estimated dates
- [ ] Create bulk processing service for all 4,438 stories  
- [ ] Add regional tag filtering to story queries
- [ ] Update story browser to support regional filtering

### Phase 3: User Review & Override
- [ ] Build bulk tag review interface
- [ ] Add individual story tag editing capability
- [ ] Implement confidence indicators for tag sources
- [ ] Create manual override workflow

### Phase 4: Map Enhancement
- [ ] Integrate regional filtering on map view
- [ ] Add timeline-based story filtering
- [ ] Implement regional clustering for story markers
- [ ] Create expedition progression visualization

## Success Criteria

### Data Quality
- [ ] All 4,438 stories have estimated_date_gps populated
- [ ] Stories tagged with appropriate regional_tags based on GPS correlation
- [ ] Clear distinction between GPS-estimated and manually verified data

### User Experience  
- [ ] Users can filter stories by region across the application
- [ ] Map displays stories clustered by regional context
- [ ] Bulk tagging reduces manual work from 4,438 individual entries to review/approval workflow
- [ ] Manual override capability preserves user control for precise locations

### System Performance
- [ ] Regional filtering queries execute efficiently with proper indexing
- [ ] Bulk processing completes within reasonable time limits
- [ ] Map rendering performs well with regional clustering

## Future Enhancements

### Advanced Correlation
- Collection theme matching (e.g., "Wales" collection → GPS tracks in Wales region)
- Story content analysis for geographic hints
- User feedback loop to improve correlation accuracy

### Timeline Features
- Interactive expedition timeline with story markers
- Animated route progression showing story chronology  
- Date-based story recommendations ("stories from the same period")

### Data Export
- Export correlated story data with estimated dates and regional tags
- Integration with external mapping services
- API for third-party expedition analysis tools

---

**Note**: This specification assumes GPS track data is limited to high-level metadata from `garmin.md`. Individual GPS waypoints are not accessible and therefore precise coordinate correlation is not feasible. The focus is on regional-level correlation that provides valuable organizational context while being honest about data limitations.