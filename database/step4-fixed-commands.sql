-- STEP 4: Update existing stories with default values (CORRECTED)
-- Run these exact commands instead of the original Step 4

-- ============================================================================
-- Set default tag_source for existing stories
-- ============================================================================
UPDATE stories 
SET tag_source = 'manual' 
WHERE tag_source IS NULL;

-- ============================================================================
-- Set default date_confidence for existing stories  
-- ============================================================================
UPDATE stories 
SET date_confidence = 'collection_estimated'
WHERE date_confidence IS NULL;

-- ============================================================================
-- Copy existing estimated_date to estimated_date_gps for stories that have it
-- ============================================================================
UPDATE stories 
SET estimated_date_gps = estimated_date
WHERE estimated_date IS NOT NULL AND estimated_date_gps IS NULL;

-- ============================================================================
-- Mark Collections 52-61 as excluded from expedition scope (pre-expedition content)
-- ============================================================================
UPDATE story_collections 
SET is_expedition_scope = false,
    expedition_exclude_reason = 'pre_expedition_content'
WHERE collection_index BETWEEN 52 AND 61;

-- ============================================================================
-- Mark stories in excluded collections - USE CORRECT VALUE
-- ============================================================================
UPDATE stories 
SET tag_source = 'excluded'
WHERE collection_id IN (
    SELECT id FROM story_collections 
    WHERE is_expedition_scope = false
);

-- ============================================================================
-- VERIFICATION: Check the updates worked
-- ============================================================================

-- Check tag_source distribution
SELECT 
  tag_source, 
  COUNT(*) as count
FROM stories 
GROUP BY tag_source
ORDER BY tag_source;

-- Check expedition scope
SELECT 
  is_expedition_scope,
  expedition_exclude_reason,
  COUNT(*) as collection_count
FROM story_collections
GROUP BY is_expedition_scope, expedition_exclude_reason;

DO $$ 
BEGIN
    RAISE NOTICE 'Step 4 completed successfully with correct excluded value.';
END $$;