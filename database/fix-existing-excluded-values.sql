-- Fix existing 'excluded_non_expedition' values before applying new constraint
-- Run this to clean up existing data

-- ============================================================================
-- STEP 1: Update existing excluded values to match new constraint
-- ============================================================================

-- First, check what tag_source values currently exist
SELECT tag_source, COUNT(*) 
FROM stories 
WHERE tag_source IS NOT NULL
GROUP BY tag_source
ORDER BY tag_source;

-- Update any existing 'excluded_non_expedition' values to 'excluded'
UPDATE stories 
SET tag_source = 'excluded'
WHERE tag_source = 'excluded_non_expedition';

-- ============================================================================
-- VERIFICATION: Check the update worked
-- ============================================================================

-- Verify no more 'excluded_non_expedition' values exist
SELECT 
  tag_source, 
  COUNT(*) as count
FROM stories 
GROUP BY tag_source
ORDER BY tag_source;

-- Check if any values would still violate the constraint
SELECT DISTINCT tag_source
FROM stories 
WHERE tag_source NOT IN ('gps_estimated', 'manual', 'mixed', 'excluded')
  AND tag_source IS NOT NULL;

DO $$ 
BEGIN
    RAISE NOTICE 'Existing excluded values updated. Ready to retry Step 4.';
END $$;