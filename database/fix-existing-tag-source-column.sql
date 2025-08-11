-- Fix existing tag_source column: Expand from VARCHAR(20) to VARCHAR(30)
-- Run this BEFORE continuing with Step 4 of the main schema update

-- ============================================================================
-- STEP 1: Expand existing tag_source column
-- ============================================================================

-- Modify the existing column type
ALTER TABLE stories 
ALTER COLUMN tag_source TYPE VARCHAR(30);

-- ============================================================================
-- STEP 2: Update the check constraint to include new values
-- ============================================================================

-- Drop the existing constraint
ALTER TABLE stories 
DROP CONSTRAINT IF EXISTS stories_tag_source_check;

-- Add the updated constraint with all values
ALTER TABLE stories 
ADD CONSTRAINT stories_tag_source_check 
CHECK (tag_source IN ('gps_estimated', 'manual', 'mixed', 'excluded'));

-- ============================================================================
-- VERIFICATION: Check the column was updated successfully
-- ============================================================================

-- Verify column type and length
SELECT 
  column_name, 
  data_type, 
  character_maximum_length,
  column_default,
  is_nullable 
FROM information_schema.columns 
WHERE table_name = 'stories' 
AND column_name = 'tag_source';

-- Check constraints
SELECT 
  constraint_name,
  check_clause
FROM information_schema.check_constraints 
WHERE constraint_name LIKE '%tag_source%';

-- Test the new constraint works
DO $$ 
BEGIN
    RAISE NOTICE 'Column updated successfully. Ready for main schema Step 4.';
END $$;