# Unified Tag System Requirements

## Overview

### Problem Statement
The current story tagging system uses a complex dual-array structure (`regional_tags` + `tags`) that creates synchronization issues, lacks manual input capabilities, and doesn't support the planned integration of three data sources: GPS expedition data, story content analysis, and daily journal emotions.

### Solution Approach
Implement a unified tag system using a single array with metadata to track tag type, source, and other attributes. This approach simplifies data management while providing extensibility for future data sources and improved user experience.

## Data Architecture

### Current Structure (To Be Replaced)
```typescript
// Current problematic dual-array system
regional_tags: string[]     // ["Wales", "UK"]
tags: string[]             // ["Wales", "UK", "hiking", "mountain"]
tag_source: string         // "manual" | "gps_estimated" | "mixed"
```

### New Unified Structure
```typescript
// New unified tag system with metadata
tags: TagWithMetadata[]    // Single source of truth

interface TagWithMetadata {
  name: string;            // "Wales", "hiking", "peaceful"
  type: TagType;          // "regional" | "activity" | "emotion"  
  source: TagSource;      // "gps" | "manual" | "journal" | "ai"
  confidence?: number;    // 0.0-1.0 for AI/GPS generated tags
  created_at: string;     // ISO timestamp
  created_by?: string;    // User ID for manual tags
}

type TagType = "regional" | "activity" | "emotion";
type TagSource = "gps" | "manual" | "journal" | "ai";
```

## Tag Types & Sources

### Tag Types

#### Regional Tags
- **Purpose**: Geographic and location context
- **Examples**: "Wales", "UK", "Spain", "Central Asia", "Europe", "Morocco"
- **Usage**: Collection filtering, map display, expedition phase organization
- **Source Priority**: GPS > Manual > Collection inference

#### Activity Tags  
- **Purpose**: Activities and actions visible in story content
- **Examples**: "hiking", "mechanic", "food", "camping", "photography", "border-crossing"
- **Usage**: Content discovery, thematic browsing, activity-based filtering
- **Source Priority**: Manual > AI content analysis > Collection inference

#### Emotion Tags (Future)
- **Purpose**: Emotional and narrative context from daily journal
- **Examples**: "adventure", "struggle", "joy", "reflection", "homesickness", "achievement"
- **Usage**: Emotional journey visualization, mood-based story discovery
- **Source Priority**: Journal > Manual > AI sentiment analysis

### Tag Sources

#### GPS Source
- **Generated From**: GPS expedition data, track analysis, waypoint correlation
- **Tag Types**: Regional only
- **Confidence**: Based on GPS accuracy and temporal correlation
- **Examples**: Auto-tagging "Spain" for stories with Spanish GPS coordinates

#### Manual Source  
- **Generated From**: User input via story detail page interface
- **Tag Types**: All types (regional, activity, emotion)
- **Confidence**: 1.0 (user certainty)
- **Examples**: User manually adds "hiking" tag to mountain story

#### Journal Source (Future)
- **Generated From**: Daily journal entries with emotion analysis
- **Tag Types**: Emotion primarily, some activity
- **Confidence**: Based on text analysis confidence
- **Examples**: Auto-tagging "struggle" from journal entry about difficult day

#### AI Source (Future)
- **Generated From**: Computer vision analysis of story images/videos
- **Tag Types**: Activity primarily, some regional
- **Confidence**: Based on AI model confidence scores
- **Examples**: Auto-tagging "food" from image recognition of meal photos

## Database Schema Changes

### Migration Strategy

#### Phase 1: Add New Column
```sql
-- Add new unified tags column
ALTER TABLE stories ADD COLUMN tags_unified JSONB DEFAULT '[]'::jsonb;

-- Create index for tag queries
CREATE INDEX idx_stories_tags_unified_gin ON stories USING GIN (tags_unified);
CREATE INDEX idx_stories_tags_name ON stories USING GIN ((tags_unified -> 'name'));
CREATE INDEX idx_stories_tags_type ON stories USING GIN ((tags_unified -> 'type'));
```

#### Phase 2: Data Migration
```sql
-- Migrate existing data to unified format
UPDATE stories SET tags_unified = (
  SELECT jsonb_agg(
    jsonb_build_object(
      'name', tag_name,
      'type', CASE 
        WHEN tag_name = ANY(regional_tags) THEN 'regional'
        ELSE 'activity'
      END,
      'source', COALESCE(tag_source, 'manual'),
      'created_at', COALESCE(updated_at, created_at)::text
    )
  )
  FROM unnest(tags) AS tag_name
  WHERE tags IS NOT NULL AND array_length(tags, 1) > 0
);
```

#### Phase 3: Backward Compatibility
- Keep old columns during transition period
- Create database views/functions to maintain old API compatibility
- Gradually migrate frontend to use new structure
- Remove old columns after successful migration

### Database Constraints
```sql
-- Ensure tag structure validation
ALTER TABLE stories ADD CONSTRAINT valid_tags_structure 
  CHECK (jsonb_typeof(tags_unified) = 'array');

-- Ensure valid tag types
ALTER TABLE stories ADD CONSTRAINT valid_tag_types
  CHECK (NOT EXISTS (
    SELECT 1 FROM jsonb_array_elements(tags_unified) AS tag
    WHERE tag->>'type' NOT IN ('regional', 'activity', 'emotion')
  ));

-- Ensure valid tag sources  
ALTER TABLE stories ADD CONSTRAINT valid_tag_sources
  CHECK (NOT EXISTS (
    SELECT 1 FROM jsonb_array_elements(tags_unified) AS tag
    WHERE tag->>'source' NOT IN ('gps', 'manual', 'journal', 'ai')
  ));
```

## UI Requirements

### Tag Input Interface

#### Regional Tag Input
- **Component**: Dropdown/autocomplete with predefined expedition regions
- **Options**: Wales, England, Scotland, UK, Germany, Spain, France, Italy, Morocco, etc.
- **Validation**: Must be from expedition route or common geographic terms
- **Visual**: Blue background with location icon

#### Activity Tag Input  
- **Component**: Free text input with autocomplete suggestions
- **Suggestions**: Common activity terms from existing tags + predefined list
- **Validation**: Free text, no restrictions
- **Visual**: Green background with activity icon

#### Emotion Tag Input (Future)
- **Component**: Dropdown with predefined emotion categories
- **Options**: adventure, struggle, joy, reflection, homesickness, achievement, etc.
- **Validation**: Must be from predefined emotion taxonomy
- **Visual**: Orange background with emotion icon

### Tag Display

#### Visual Distinction
```typescript
// Tag styling by type
const tagStyles = {
  regional: "bg-blue-100 text-blue-800 border-blue-200",
  activity: "bg-green-100 text-green-800 border-green-200", 
  emotion: "bg-orange-100 text-orange-800 border-orange-200"
};

// Source indicators
const sourceIcons = {
  gps: "📍",
  manual: "✏️", 
  journal: "📔",
  ai: "🤖"
};
```

#### Tag Management
- **Add Tags**: Separate input sections by type
- **Remove Tags**: × button on individual tags
- **Edit Tags**: Click to edit name, type cannot be changed
- **Source Display**: Small icon indicating tag source
- **Confidence Display**: Opacity/styling for AI-generated tags based on confidence

### Filtering & Search

#### Collection Browser
- **Regional Filter**: "Show stories from [Wales]" using regional tags
- **Activity Filter**: "Show [hiking] stories" using activity tags  
- **Emotion Filter**: "Show [adventure] stories" using emotion tags (future)
- **Combined Filter**: "Show [hiking] stories from [Wales]" 

#### Search Interface
- **Tag-based Search**: Search within tag names across all types
- **Type-specific Search**: Filter by tag type (regional/activity/emotion)
- **Source-specific Search**: Filter by tag source (manual/gps/journal)

## API Specifications

### Updated Endpoints

#### GET /api/story/[id]
```typescript
// Response includes unified tags
interface StoryResponse {
  id: string;
  // ... other fields
  tags: TagWithMetadata[];
  
  // Deprecated - for backward compatibility only
  regional_tags?: string[];
  tags_legacy?: string[];
  tag_source?: string;
}
```

#### PUT /api/story/[id]/location
```typescript
// Request payload for tag updates
interface LocationUpdateRequest {
  // ... other fields
  tags?: TagUpdateOperation[];
  
  // Deprecated - for backward compatibility only  
  regional_tags?: string[];
  manual_tags?: string[];
}

interface TagUpdateOperation {
  action: "add" | "remove" | "update";
  tag: TagWithMetadata;
}
```

#### POST /api/tags/suggestions
```typescript
// New endpoint for tag suggestions
interface TagSuggestionsRequest {
  story_id: string;
  tag_type?: TagType;
  source?: TagSource;
  query?: string; // For autocomplete
}

interface TagSuggestionsResponse {
  suggestions: TagWithMetadata[];
  common_tags: string[]; // Popular tags of requested type
}
```

### Query Examples
```sql
-- Get all regional tags for collection
SELECT DISTINCT tag->>'name' as tag_name
FROM stories, jsonb_array_elements(tags_unified) as tag
WHERE collection_id = $1 AND tag->>'type' = 'regional';

-- Get stories with specific activity
SELECT * FROM stories 
WHERE tags_unified @> '[{"name": "hiking", "type": "activity"}]';

-- Get stories by tag source
SELECT * FROM stories, jsonb_array_elements(tags_unified) as tag
WHERE tag->>'source' = 'gps' AND tag->>'type' = 'regional';
```

## Implementation Phases

### Phase 1: Foundation (Week 1)
1. **Database Migration**
   - Add `tags_unified` JSONB column
   - Create indexes and constraints
   - Migrate existing data to new format

2. **Type Definitions**
   - Update TypeScript interfaces
   - Create TagWithMetadata interface
   - Update Story interface

3. **API Updates**
   - Update location endpoint to handle unified tags
   - Maintain backward compatibility with old format
   - Add tag validation

### Phase 2: Regional Tags (Week 2)
1. **UI Implementation**
   - Add regional tag input dropdown
   - Display regional tags with blue styling
   - Enable add/remove functionality

2. **GPS Integration**
   - Update GPS correlation to use new tag format
   - Auto-generate regional tags with GPS source
   - Confidence scoring for GPS-based tags

3. **Testing & Migration**
   - Test new tag system with existing data
   - Migrate collection filtering to use unified tags
   - Performance testing with tag queries

### Phase 3: Activity Tags (Week 3)
1. **Activity Input Interface**
   - Free text input with autocomplete
   - Common activity suggestions
   - Green styling for activity tags

2. **Content Analysis Preparation**
   - Design AI tag integration architecture
   - Create activity tag taxonomy
   - Prepare for future AI-generated activity tags

### Phase 4: Future Enhancements
1. **Emotion Tags** (Post Journal Integration)
   - Journal data integration
   - Emotion tag taxonomy
   - Sentiment analysis pipeline

2. **AI Content Analysis**
   - Computer vision for activity detection
   - Automated activity tag generation
   - Confidence-based tag suggestions

## Backward Compatibility

### Legacy API Support
- Maintain old `regional_tags` and `tags` fields in API responses
- Auto-generate legacy fields from unified tags structure
- Support old API request formats with automatic conversion
- Deprecation timeline: 6 months after new system is stable

### Data Migration Safety
- Keep old columns during transition
- Implement rollback mechanism
- Gradual frontend migration
- A/B testing for new tag interface

### Frontend Compatibility
- Feature flags for new vs old tag interface
- Graceful degradation for old browsers
- Progressive enhancement approach

## Success Metrics

### Technical Metrics
- **Migration Success**: 100% data migration without loss
- **Performance**: Tag queries under 100ms for 10k+ stories
- **Compatibility**: Zero breaking changes for existing API consumers

### User Experience Metrics
- **Tag Usage**: Increase in manual tag addition by 300%
- **Search Accuracy**: Improved story discovery through better tagging
- **User Satisfaction**: Positive feedback on simplified tag interface

### Data Quality Metrics
- **Tag Consistency**: Reduced duplicate/conflicting tags
- **Source Tracking**: Clear audit trail for all tag changes
- **Confidence Scoring**: Accurate confidence ratings for auto-generated tags

## Risks & Mitigation

### Technical Risks
- **Data Loss During Migration**: Comprehensive backup and rollback strategy
- **Performance Degradation**: Database indexing and query optimization
- **API Breaking Changes**: Backward compatibility layer and versioning

### User Experience Risks  
- **Learning Curve**: Progressive rollout with user training
- **Feature Confusion**: Clear UI design and user documentation
- **Tag Proliferation**: Tag suggestions and validation to maintain consistency

### Business Risks
- **Development Timeline**: Phased implementation with core features first
- **Resource Requirements**: Clear scope definition and realistic estimation
- **Future Extensibility**: Flexible architecture for journal and AI integration

## Implementation Status (August 2025)

### ✅ **COMPLETED - Phase 1 & 2 (Foundation + Regional Tags)**

#### Database Implementation
- ✅ `tags_unified` JSONB column added with default `'[]'::jsonb`
- ✅ GIN indexes created for efficient queries (`idx_stories_tags_unified_gin`, etc.)
- ✅ Database constraints enforcing valid tag types and sources
- ✅ **Data Migration**: 4,423 out of 4,452 stories migrated (99.3% coverage)

#### TypeScript Interfaces
- ✅ Complete `TagWithMetadata` interface implemented
- ✅ `TagType` and `TagSource` type definitions
- ✅ Story interface updated with `tags_unified` field
- ✅ Utility library `/src/lib/tags.ts` with full tag manipulation functions

#### API Implementation
- ✅ Dedicated `/api/story/[id]/tags` endpoint (GET/PUT)
- ✅ Full validation for tag structure, types, and sources
- ✅ Backward compatibility maintained in `/api/story/[id]/location`
- ✅ Legacy field population from unified tags

#### Frontend Implementation
- ✅ **RegionalTagInput component** fully implemented with:
  - Autocomplete dropdown with predefined regional options
  - Add/remove tag functionality with visual feedback
  - Source-specific styling (GPS vs Manual)
  - Real-time validation and duplicate prevention
- ✅ **StoryBrowser unified tag display** activated
- ✅ **Story detail page tag editing** fully functional
- ✅ **Regional tag filtering** working with unified system

#### Legacy Field Handling
- ✅ `tag_source` field simplified to `'manual' | null` in code
- ✅ Legacy `tags` and `regional_tags` arrays maintained for compatibility
- ✅ Automatic synchronization between unified and legacy fields

#### Current Database Schema (stories table)
```sql
-- NEW UNIFIED SYSTEM
tags_unified JSONB DEFAULT '[]'::jsonb  -- Single source of truth

-- LEGACY FIELDS (maintained for compatibility)
tags TEXT[]                              -- Original general tags
regional_tags TEXT[]                     -- GPS-derived regional tags  
tag_source VARCHAR CHECK (tag_source IN ('gps_estimated', 'manual', 'mixed', 'excluded'))

-- CONSTRAINTS
CONSTRAINT valid_tags_structure CHECK (jsonb_typeof(tags_unified) = 'array')
CONSTRAINT valid_tag_types CHECK (...)   -- Validates regional|activity|emotion
CONSTRAINT valid_tag_sources CHECK (...)  -- Validates gps|manual|journal|ai
```

### 📊 **Current Data Quality**

#### Tag Distribution
- **4,424 stories** with legacy tags (mostly auto-generated expedition phases)
- **4,423 stories** with unified tags (migrated data)
- **~10 stories** with manually added tags requiring attention

#### Data Inconsistencies Identified
- **Story `9a4b9696-c618-4369-a2af-b255088bb591`**: Legacy ["England", "Scotland"] vs Unified ["Wales", "UK"]
- **Story `5c919fe5-1422-4d54-b1b9-ada0ebf9314f`**: Incorrect "north_china" tag in England collection
- **6 stories** with `regional_tags` field populated (need manual review)

### 🔄 **IN PROGRESS - Phase 3: Legacy API Migration**

#### Regional Tags API Migration (Current Priority)
- 🔄 **IN PROGRESS**: Update `/api/story/[id]/location` to use unified tags internally
- 🔄 **PENDING**: Update story detail page forms to use unified tag functions
- 🔄 **PENDING**: Update GPS correlation system to return unified tag format
- 🔄 **PENDING**: Clean up TypeScript interfaces to remove legacy field dependencies
- 🔄 **PENDING**: Update remaining components using `regional_tags` arrays

#### Files Requiring Migration
- 🔄 `/src/app/api/story/[id]/location/route.ts` - Main API endpoint
- 🔄 `/src/app/story/[id]/page.tsx` - Story detail form components  
- 🔄 `/src/lib/gps-correlation.ts` - GPS suggestion system
- 🔄 `/src/app/api/gps-track-for-date/route.ts` - GPS correlation API
- 🔄 `/src/types/index.ts` - Type definition cleanup

### 🔄 **PENDING - Phase 4 & 5 (Activity + Emotion Tags)**

#### Activity Tag Implementation (Future)
- 🔄 Free-text input interface for activity tags
- 🔄 Activity tag taxonomy development
- 🔄 Green styling for activity tags
- 🔄 AI content analysis preparation

#### Emotion Tag Implementation (Future)  
- 🔄 Journal data integration
- 🔄 Emotion tag taxonomy
- 🔄 Orange styling for emotion tags
- 🔄 Sentiment analysis pipeline

#### Legacy System Deprecation (Final Phase)
- 🔄 Remove `tags` and `regional_tags` columns from database
- 🔄 Remove `tag_source` column from database
- 🔄 Update database constraints to remove legacy field references
- 🔄 API endpoint consolidation and legacy field removal

### 🎯 **Current Capabilities**

**Users can now:**
- ✅ View unified tags with source icons (📍 GPS, ✏️ Manual) in story browser
- ✅ Filter stories by regional tags using unified system
- ✅ Edit regional tags in story detail page with autocomplete
- ✅ Add/remove regional tags with full persistence
- ✅ See visual distinction between GPS-suggested and manually added tags

**System provides:**
- ✅ Per-tag source tracking (vs old per-story `tag_source`)
- ✅ Type safety with TypeScript interfaces
- ✅ Database integrity with proper constraints
- ✅ Backward compatibility with legacy systems
- ✅ Foundation for future activity and emotion tags

## Current Migration Strategy (December 2025)

### Phase 3: Regional Tags API Migration Approach

**Goal**: Eliminate all `regional_tags` array usage while maintaining backward compatibility

**Strategy**: 
1. **Internal Conversion**: APIs accept legacy `regional_tags` but immediately convert to unified tags
2. **Gradual Migration**: Update one component at a time to use unified tag functions
3. **Backward Compatibility**: Continue to populate legacy fields from unified tags
4. **Zero Downtime**: No breaking changes to existing APIs during transition

**Migration Order**:
1. **API Layer** (`/api/story/[id]/location`) - Convert request/response handling
2. **GPS Correlation** (`/lib/gps-correlation.ts`) - Return unified tag format  
3. **Frontend Forms** (`/app/story/[id]/page.tsx`) - Use unified tag functions
4. **Type Cleanup** (`/types/index.ts`) - Mark legacy fields as deprecated
5. **Component Updates** - Replace `regional_tags` usage with `getRegionalTags()`

**Benefits**:
- ✅ **No Breaking Changes**: Existing API consumers continue to work
- ✅ **Incremental Progress**: Can be done piece by piece 
- ✅ **Easy Rollback**: Legacy fields remain as fallback
- ✅ **Consistent Data**: All tag operations use unified system internally

### 📋 **Updated Tech Lead Review Items**

1. **Migration Strategy**: Validate Phase 3 approach for regional tags API migration
2. **Data Quality**: Review 6 identified stories with `regional_tags` inconsistencies  
3. **Performance**: Validate tag query performance with unified system at scale
4. **API Design**: Confirm backward compatibility approach for legacy field support
5. **Code Quality**: Review conversion functions between legacy/unified formats
6. **Testing Strategy**: Ensure comprehensive testing of legacy/unified tag interactions
7. **Documentation**: Update API documentation to reflect unified tag system
8. **Future Extensibility**: Validate architecture readiness for activity/emotion tags

## Conclusion

The unified tag system **foundation is complete and operational**. Phase 1 (Foundation) and Phase 2 (Regional Tags) have been successfully implemented with 99%+ data migration coverage. **Phase 3 (Legacy API Migration) is now the current priority** to eliminate remaining `regional_tags` array dependencies throughout the codebase.

**Current Status**: 
- ✅ **Database & Core System**: Fully migrated to unified tags with backward compatibility
- ✅ **UI Components**: Regional tag editing and display working with unified system  
- 🔄 **API Layer**: Needs migration from `regional_tags` arrays to unified tag functions
- 🔄 **GPS Correlation**: Needs to return unified tag format instead of string arrays

**Key Achievement**: Transformed a complex dual-array system into a clean, extensible unified structure with full backward compatibility and zero breaking changes.

**Next Phase**: Complete the regional tags API migration to achieve full system consistency while maintaining backward compatibility for external API consumers.