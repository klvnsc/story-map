# Collection Chronological Reordering Requirements

## Overview

Restructure the story collection ordering system to use ascending chronological order (1 = earliest, 61 = latest) based on collections-manifest.json as the authoritative source of truth.

## Current State

### Database Schema
- **Table**: `story_collections`
- **Ordering Field**: `collection_index` (integer)
- **Current Order**: Descending chronological (1 = latest, 61 = earliest)
- **Current Phases**: 4-phase structure (uk_scotland, europe_mediterranean, middle_east_caucasus, central_asia)

### Current Collection Range
- Collection 1: "Wales" (latest, July 2025)
- Collection 61: "LADAKH 1" (earliest, 2022)

## Requirements

### REQ-01: Collection Index Reordering
**Priority**: High  
**Description**: Transform collection_index from descending to ascending chronological order  
**Implementation**: 
- Collection 1 → LADAKH 1 (earliest, 2022-06-01)
- Collection 61 → Wales (latest, 2025-07-31)
- Use collections-manifest.json `old_to_new` mapping for transformation

### REQ-02: Add Story Collection Start Date
**Priority**: High  
**Description**: Add estimated start date for each collection based on collections-manifest.json  
**Implementation**:
- Add new field: `collection_start_date` (date)
- Source: collections-manifest.json `estimated_date` field for each collection
- Format: YYYY-MM-DD

### REQ-03: Update to 7-Phase Structure  
**Priority**: Medium  
**Description**: Replace current 4-phase structure with new 7-phase expedition structure  
**Current Phases**:
- uk_scotland
- europe_mediterranean  
- middle_east_caucasus
- central_asia

**New Phases**:
- pre_expedition (Collections 1-9)
- north_china (Collections 10-11)
- central_asia (Collections 12-21)
- middle_east_caucasus (Collections 22-30)
- europe_part1 (Collections 31-41)
- africa (Collections 42-50)
- europe_uk_scotland (Collections 51-61)

### REQ-04: Collections-Manifest.json as Source of Truth
**Priority**: High  
**Description**: Use collections-manifest.json as the authoritative metadata source  
**Implementation**:
- Replace ig-data.csv dependency
- Use manifest for collection names, dates, phases, and ordering
- Maintain backward compatibility during transition

## Data Sources

### Primary Source
- **File**: `/data/collections-manifest.json`
- **Version**: 1.1.0
- **Contains**: Complete metadata with 7-phase structure and accurate dates

### Legacy Source (Deprecated)
- **File**: `/data-story-collection/ig-data.csv`
- **Status**: To be replaced by collections-manifest.json

## Implementation Plan

### Phase 1: Database Schema Updates
1. **Collection Index Reordering**
   - Apply SQL transformation using old_to_new mapping
   - Update all collection_index values in single transaction
   - Verify ordering: SELECT * FROM story_collections ORDER BY collection_index

2. **Add Collection Start Date Field**
   - Add `collection_start_date` field to story_collections table
   - Populate from collections-manifest.json estimated_date values
   - Set NOT NULL constraint after population

### Phase 2: Expedition Phase Updates
1. **Update Expedition Phase Field**
   - Update existing expedition_phase values to new 7-phase structure
   - Use collections-manifest.json phase mappings
   - Verify phase distribution across collection ranges

### Phase 3: Application Logic Updates
1. **Update Import Scripts**
   - Modify data import logic to use collections-manifest.json
   - Update collection ordering logic in application code
   - Test import pipeline with new structure

2. **Frontend Updates**
   - Update StoryBrowser component to handle new ordering
   - Update collection filtering logic
   - Test collection navigation and display

### Phase 4: Testing & Validation
1. **Data Integrity Verification**
   - Verify all 61 collections maintain proper chronological order
   - Confirm story counts remain consistent
   - Validate phase assignments match expedition timeline

2. **Application Testing**
   - Test collection browsing with new chronological order
   - Verify story display maintains proper sequence
   - Test phase-based filtering functionality

## Technical Specifications

### Database Changes
```sql
-- Add collection start date field
ALTER TABLE story_collections 
ADD COLUMN collection_start_date DATE;

-- Update collection_index values (see update-collection-ordering.sql)
UPDATE story_collections SET collection_index = [mapping];

-- Update expedition phases
UPDATE story_collections SET expedition_phase = [new_phase];

-- Populate collection start dates
UPDATE story_collections SET collection_start_date = [manifest_date];
```

### Collections-Manifest.json Structure Reference
```json
{
  "metadata": {
    "version": "1.1.0",
    "total_collections": 61
  },
  "collection_mapping": {
    "old_to_new": { "61": 1, "60": 2, ... "1": 61 }
  },
  "expedition_phases": {
    "pre_expedition": { "collections": [1,2,3,4,5,6,7,8,9] },
    "north_china": { "collections": [10,11] },
    // ... etc
  },
  "collections": {
    "1": {
      "name": "LADAKH 1",
      "estimated_date": "2022-06-01",
      "expedition_phase": "pre_expedition"
    }
  }
}
```

## Success Criteria

### Data Consistency
- [ ] All 61 collections properly reordered (1 = earliest, 61 = latest)
- [ ] Collection start dates populated for all collections
- [ ] Expedition phases updated to 7-phase structure
- [ ] Story collection relationships maintained (no orphaned stories)

### Application Functionality
- [ ] Collection browsing displays proper chronological sequence
- [ ] Phase-based filtering works with new 7-phase structure
- [ ] Story detail pages maintain proper collection context
- [ ] Import scripts successfully use collections-manifest.json

### Performance
- [ ] Collection queries maintain optimal performance
- [ ] No degradation in story browsing speed
- [ ] Database indexes remain effective with new ordering

## Risk Mitigation

### Data Backup
- Create database backup before applying collection index changes
- Maintain original ig-data.csv as fallback reference
- Test transformation on development branch first

### Rollback Plan
- Maintain reverse mapping (new_to_old) for potential rollback
- Document all schema changes for reversal if needed
- Keep original migration files as reference

## Dependencies

### Required Files
- `/data/collections-manifest.json` (source of truth)
- `/database/update-collection-ordering.sql` (transformation script)

### Affected Components
- Database: story_collections table
- Backend: Collection query logic
- Frontend: StoryBrowser, collection navigation
- Scripts: Data import pipeline

## Timeline

### Immediate (Step-by-Step Implementation)
1. Apply collection index reordering SQL
2. Add and populate collection_start_date field  
3. Update expedition phases to 7-phase structure
4. Update application logic to use new ordering
5. Test and validate all functionality

### Post-Implementation
- Monitor application performance with new ordering
- Update documentation to reflect new structure
- Plan deprecation of ig-data.csv dependency