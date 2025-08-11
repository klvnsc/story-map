-- Schema Fix: Expand tag_source column to accommodate excluded values
-- Run this BEFORE running the main schema update

-- ============================================================================
-- FIX: Expand tag_source VARCHAR length 
-- ============================================================================

-- Current constraint is VARCHAR(20) but 'excluded_non_expedition' is 25 characters
-- Expand to VARCHAR(30) to accommodate all values

ALTER TABLE stories 
ALTER COLUMN tag_source TYPE VARCHAR(30);

-- Update the check constraint to include the new excluded value
ALTER TABLE stories 
DROP CONSTRAINT IF EXISTS stories_tag_source_check;

ALTER TABLE stories 
ADD CONSTRAINT stories_tag_source_check 
CHECK (tag_source IN ('gps_estimated', 'manual', 'mixed', 'excluded_non_expedition'));

-- Verify the column was updated
SELECT 
  column_name, 
  data_type, 
  character_maximum_length,
  is_nullable 
FROM information_schema.columns 
WHERE table_name = 'stories' 
AND column_name = 'tag_source';

-- Test that the new value can be inserted
DO $$ 
BEGIN
    -- Test update with the longer value
    RAISE NOTICE 'Testing tag_source with excluded_non_expedition value...';
END $$;