-- Database Schema Updates for GPS-Powered Story Location Editing
-- Run this in your Supabase SQL editor BEFORE implementing the code

-- ============================================================================
-- STEP 1: Add GPS correlation and date tracking fields to stories table
-- ============================================================================

-- Add GPS correlation date fields
ALTER TABLE stories 
ADD COLUMN estimated_date_range_start TIMESTAMP WITH TIME ZONE,
ADD COLUMN estimated_date_range_end TIMESTAMP WITH TIME ZONE,
ADD COLUMN estimated_date_gps TIMESTAMP WITH TIME ZONE;

-- Add regional tags array (separate from general tags)
ALTER TABLE stories 
ADD COLUMN regional_tags TEXT[];

-- Add tag source tracking to distinguish GPS vs manual tags
ALTER TABLE stories 
ADD COLUMN tag_source VARCHAR(30) DEFAULT 'manual' CHECK (tag_source IN ('gps_estimated', 'manual', 'mixed', 'excluded'));

-- Add date confidence tracking
ALTER TABLE stories 
ADD COLUMN date_confidence VARCHAR(20) DEFAULT 'collection_estimated' CHECK (date_confidence IN ('gps_estimated', 'collection_estimated', 'manual', 'high', 'medium', 'low'));

-- ============================================================================
-- STEP 2: Add GPS track correlation metadata to story_collections table  
-- ============================================================================

-- Add GPS track correlation fields to collections
ALTER TABLE story_collections
ADD COLUMN gps_track_ids INTEGER[],
ADD COLUMN estimated_date_range_start TIMESTAMP WITH TIME ZONE,
ADD COLUMN estimated_date_range_end TIMESTAMP WITH TIME ZONE,
ADD COLUMN regional_tags TEXT[];

-- CRITICAL: Add expedition scope tracking (Collections 52-61 are NOT part of 13-month expedition)
ALTER TABLE story_collections
ADD COLUMN is_expedition_scope BOOLEAN DEFAULT true,
ADD COLUMN expedition_exclude_reason TEXT;

-- ============================================================================
-- STEP 3: Create indexes for performance
-- ============================================================================

-- Index for GPS date correlation queries
CREATE INDEX idx_stories_estimated_date_gps ON stories(estimated_date_gps);
CREATE INDEX idx_stories_estimated_date_range ON stories(estimated_date_range_start, estimated_date_range_end);

-- Index for regional tag filtering (GIN index for array operations)
CREATE INDEX idx_stories_regional_tags ON stories USING GIN(regional_tags);

-- Index for tag source filtering
CREATE INDEX idx_stories_tag_source ON stories(tag_source);

-- Index for date confidence filtering
CREATE INDEX idx_stories_date_confidence ON stories(date_confidence);

-- Index for collection GPS track correlation
CREATE INDEX idx_collections_gps_tracks ON story_collections USING GIN(gps_track_ids);
CREATE INDEX idx_collections_regional_tags ON story_collections USING GIN(regional_tags);

-- Index for expedition scope filtering
CREATE INDEX idx_collections_expedition_scope ON story_collections(is_expedition_scope);

-- ============================================================================
-- STEP 4: Update existing stories with default values
-- ============================================================================

-- Set default tag_source for existing stories
UPDATE stories 
SET tag_source = 'manual' 
WHERE tag_source IS NULL;

-- Set default date_confidence for existing stories  
UPDATE stories 
SET date_confidence = 'collection_estimated'
WHERE date_confidence IS NULL;

-- Copy existing estimated_date to estimated_date_gps for stories that have it
UPDATE stories 
SET estimated_date_gps = estimated_date
WHERE estimated_date IS NOT NULL AND estimated_date_gps IS NULL;

-- CRITICAL: Mark Collections 52-61 as excluded from expedition scope (pre-expedition content)
UPDATE story_collections 
SET is_expedition_scope = false,
    expedition_exclude_reason = 'pre_expedition_content'
WHERE collection_index BETWEEN 52 AND 61;

-- Mark stories in excluded collections to prevent GPS correlation
UPDATE stories 
SET tag_source = 'excluded'
WHERE collection_id IN (
    SELECT id FROM story_collections 
    WHERE is_expedition_scope = false
);

-- ============================================================================
-- STEP 5: Add comments for documentation
-- ============================================================================

COMMENT ON COLUMN stories.estimated_date_range_start IS 'Start of GPS-correlated date range for story estimation';
COMMENT ON COLUMN stories.estimated_date_range_end IS 'End of GPS-correlated date range for story estimation';  
COMMENT ON COLUMN stories.estimated_date_gps IS 'GPS-correlated estimated date for the story';
COMMENT ON COLUMN stories.regional_tags IS 'GPS-derived regional tags (separate from manual tags)';
COMMENT ON COLUMN stories.tag_source IS 'Source of tags: gps_estimated, manual, or mixed';
COMMENT ON COLUMN stories.date_confidence IS 'Confidence level of date estimation';

COMMENT ON COLUMN story_collections.gps_track_ids IS 'Array of expedition track IDs that correlate with this collection';
COMMENT ON COLUMN story_collections.estimated_date_range_start IS 'GPS-correlated start date for collection';
COMMENT ON COLUMN story_collections.estimated_date_range_end IS 'GPS-correlated end date for collection';
COMMENT ON COLUMN story_collections.regional_tags IS 'GPS-derived regional tags for the collection';
COMMENT ON COLUMN story_collections.is_expedition_scope IS 'Whether collection is part of 13-month Land Rover expedition (false for Collections 52-61)';
COMMENT ON COLUMN story_collections.expedition_exclude_reason IS 'Reason for excluding from expedition scope';

-- ============================================================================
-- VERIFICATION QUERIES (run after schema update)
-- ============================================================================

-- Verify new columns exist in stories table
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'stories' 
AND column_name IN ('estimated_date_range_start', 'estimated_date_range_end', 'estimated_date_gps', 'regional_tags', 'tag_source', 'date_confidence')
ORDER BY ordinal_position;

-- Verify new columns exist in story_collections table
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'story_collections' 
AND column_name IN ('gps_track_ids', 'estimated_date_range_start', 'estimated_date_range_end', 'regional_tags', 'is_expedition_scope', 'expedition_exclude_reason')
ORDER BY ordinal_position;

-- Verify indexes created
SELECT indexname, tablename, indexdef 
FROM pg_indexes 
WHERE tablename IN ('stories', 'story_collections') 
AND indexname LIKE '%gps%' OR indexname LIKE '%regional%' OR indexname LIKE '%tag_source%' OR indexname LIKE '%date_confidence%'
ORDER BY tablename, indexname;

-- CRITICAL: Verify expedition scope exclusion (Collections 52-61 should be excluded)
SELECT 
  is_expedition_scope,
  expedition_exclude_reason,
  COUNT(*) as collection_count,
  MIN(collection_index) as min_index,
  MAX(collection_index) as max_index
FROM story_collections
GROUP BY is_expedition_scope, expedition_exclude_reason
ORDER BY is_expedition_scope DESC;

-- Count stories by expedition scope
SELECT 
  sc.is_expedition_scope,
  sc.expedition_exclude_reason,
  COUNT(s.id) as story_count,
  COUNT(CASE WHEN s.tag_source = 'excluded_non_expedition' THEN 1 END) as excluded_stories
FROM story_collections sc
LEFT JOIN stories s ON sc.id = s.collection_id
GROUP BY sc.is_expedition_scope, sc.expedition_exclude_reason
ORDER BY sc.is_expedition_scope DESC;

-- Sample query to test GPS correlation functionality
SELECT 
  sc.name as collection_name,
  sc.collection_index,
  COUNT(s.id) as story_count,
  sc.estimated_date_range_start,
  sc.estimated_date_range_end,
  sc.regional_tags,
  sc.gps_track_ids
FROM story_collections sc
LEFT JOIN stories s ON sc.id = s.collection_id  
GROUP BY sc.id, sc.name, sc.collection_index, sc.estimated_date_range_start, sc.estimated_date_range_end, sc.regional_tags, sc.gps_track_ids
ORDER BY sc.collection_index
LIMIT 5;

-- ============================================================================
-- NOTES FOR IMPLEMENTATION
-- ============================================================================

/*
CRITICAL CORRECTIONS APPLIED:

1. EXPEDITION SCOPE: Collections 52-61 EXCLUDED from GPS correlation
   - Collections 52-61 contain PRE-EXPEDITION content (Mongolia, Japan, Indonesia, India)
   - Only Collections 1-51 are part of the 13-month Land Rover expedition
   - is_expedition_scope flag added to identify expedition vs pre-expedition content
   
2. GPS CORRELATION MAPPING (CORRECTED):
   - Collections 1-15: UK/Scotland (Tracks 25-29, May-July 2025)
   - Collections 16-35: Europe/Mediterranean (Tracks 20-24, March-May 2025)  
   - Collections 36-45: Middle East/Caucasus (Tracks 10-19, Oct 2024-March 2025)
   - Collections 46-51: Central Asia (Tracks 3-9, July-Oct 2024)
   - Collections 52-61: EXCLUDED (pre-expedition, no GPS correlation)

3. GPS DATA GAPS:
   - Track 3 (North China, July 1-18, 2024): NO corresponding story collections
   - Collection 51 (Kyrgyzstan): START of Central Asia phase, not North China
   
4. GPS Data Source: Limited to high-level metadata from data-cy-gps/garmin.md
   - No access to individual GPS coordinates
   - Only track-level date ranges and regional descriptions
   
5. Collection Chronology: Collections are in DESCENDING order (1=latest, 61=earliest)
   - Data already imported with this ordering
   - GPS correlation must account for descending chronology
   
6. Expedition Statistics:
   - Expedition collections: 51 collections (Collections 1-51)
   - Excluded collections: 10 collections (Collections 52-61)
   - Estimated expedition stories: ~3,750 stories
   - Estimated excluded stories: ~687 stories
   
7. Implementation Impact:
   - GPS correlation services must filter out Collections 52-61
   - User interface should distinguish expedition vs pre-expedition content
   - API endpoints should support expedition scope filtering
*/