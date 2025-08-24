-- Current Database Schema Review
-- Run this in your Supabase SQL editor to understand the current state

-- ============================================================================
-- PART 1: Check current table structures
-- ============================================================================

-- Check story_collections table structure
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'story_collections'
ORDER BY ordinal_position;

-- Check stories table structure  
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'stories'
ORDER BY ordinal_position;

-- Check gps_waypoints table structure
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'gps_waypoints'
ORDER BY ordinal_position;

-- ============================================================================
-- PART 2: Check current data state
-- ============================================================================

-- Count total collections and check for collection_index field
SELECT 
  COUNT(*) as total_collections,
  COUNT(CASE WHEN collection_index IS NOT NULL THEN 1 END) as collections_with_index,
  MIN(collection_index) as min_index,
  MAX(collection_index) as max_index
FROM story_collections;

-- Sample collection data to understand current structure
SELECT 
  id,
  highlight_id,
  name,
  story_count,
  estimated_date,
  expedition_phase,
  collection_index,
  is_expedition_scope,
  expedition_exclude_reason
FROM story_collections 
ORDER BY 
  CASE WHEN collection_index IS NOT NULL THEN collection_index ELSE 999 END,
  created_at
LIMIT 10;

-- Count total stories and check date fields
SELECT 
  COUNT(*) as total_stories,
  COUNT(CASE WHEN estimated_date IS NOT NULL THEN 1 END) as stories_with_estimated_date,
  COUNT(CASE WHEN collection_default_date IS NOT NULL THEN 1 END) as stories_with_collection_default_date,
  COUNT(CASE WHEN user_assigned_date IS NOT NULL THEN 1 END) as stories_with_user_assigned_date
FROM stories;

-- Check expedition scope distribution
SELECT 
  is_expedition_scope,
  expedition_exclude_reason,
  COUNT(*) as collection_count
FROM story_collections
GROUP BY is_expedition_scope, expedition_exclude_reason
ORDER BY is_expedition_scope DESC NULLS LAST;

-- Check expedition phase distribution
SELECT 
  expedition_phase,
  COUNT(*) as collection_count,
  MIN(collection_index) as first_collection,
  MAX(collection_index) as last_collection
FROM story_collections
WHERE expedition_phase IS NOT NULL
GROUP BY expedition_phase
ORDER BY MIN(collection_index) NULLS LAST;

-- ============================================================================
-- PART 3: Check for missing fields that should exist
-- ============================================================================

-- Check if essential columns exist
SELECT 
  'story_collections' as table_name,
  'collection_index' as column_name,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'story_collections' AND column_name = 'collection_index'
    ) THEN 'EXISTS' 
    ELSE 'MISSING' 
  END as status

UNION ALL

SELECT 
  'story_collections' as table_name,
  'is_expedition_scope' as column_name,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'story_collections' AND column_name = 'is_expedition_scope'
    ) THEN 'EXISTS' 
    ELSE 'MISSING' 
  END as status

UNION ALL

SELECT 
  'stories' as table_name,
  'collection_default_date' as column_name,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'stories' AND column_name = 'collection_default_date'
    ) THEN 'EXISTS' 
    ELSE 'MISSING' 
  END as status

UNION ALL

SELECT 
  'stories' as table_name,
  'user_assigned_date' as column_name,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'stories' AND column_name = 'user_assigned_date'
    ) THEN 'EXISTS' 
    ELSE 'MISSING' 
  END as status

UNION ALL

SELECT 
  'stories' as table_name,
  'regional_tags' as column_name,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'stories' AND column_name = 'regional_tags'
    ) THEN 'EXISTS' 
    ELSE 'MISSING' 
  END as status;

-- ============================================================================
-- PART 4: Summary and next steps
-- ============================================================================

-- Overall database status summary
SELECT 
  'DATABASE STATUS SUMMARY' as info,
  (SELECT COUNT(*) FROM story_collections) as total_collections,
  (SELECT COUNT(*) FROM stories) as total_stories,
  (SELECT COUNT(*) FROM gps_waypoints) as total_gps_waypoints,
  (
    SELECT CASE 
      WHEN EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'story_collections' AND column_name = 'collection_index'
      ) THEN 'COLLECTION_INDEX_EXISTS'
      ELSE 'COLLECTION_INDEX_MISSING'
    END
  ) as collection_index_status,
  (
    SELECT CASE 
      WHEN EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'story_collections' AND column_name = 'is_expedition_scope'
      ) THEN 'EXPEDITION_SCOPE_EXISTS'
      ELSE 'EXPEDITION_SCOPE_MISSING'
    END
  ) as expedition_scope_status;