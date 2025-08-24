-- Update Expedition Phases to 7-Phase Structure
-- Updates expedition_phase field from current 4-phase to new 7-phase structure
-- Based on collections-manifest.json phase definitions

BEGIN;

-- Update expedition phases based on new collection_index ranges
-- From: 4 phases (uk_scotland, europe_mediterranean, middle_east_caucasus, central_asia, pre_expedition)
-- To: 7 phases (pre_expedition, north_china, central_asia, middle_east_caucasus, europe_part1, africa, europe_uk_scotland)

UPDATE story_collections SET expedition_phase = 
CASE 
  -- Pre-expedition (Collections 1-9)
  WHEN collection_index BETWEEN 1 AND 9 THEN 'pre_expedition'
  
  -- North China & Mongolia - Expedition Start (Collections 10-11)
  WHEN collection_index BETWEEN 10 AND 11 THEN 'north_china'
  
  -- Central Asia (Collections 12-21)
  WHEN collection_index BETWEEN 12 AND 21 THEN 'central_asia'
  
  -- Middle East & Caucasus (Collections 22-30)
  WHEN collection_index BETWEEN 22 AND 30 THEN 'middle_east_caucasus'
  
  -- Europe Part 1 (Collections 31-41)
  WHEN collection_index BETWEEN 31 AND 41 THEN 'europe_part1'
  
  -- Africa (Collections 42-50)
  WHEN collection_index BETWEEN 42 AND 50 THEN 'africa'
  
  -- Europe Part 2 & UK/Scotland - Expedition End (Collections 51-61)
  WHEN collection_index BETWEEN 51 AND 61 THEN 'europe_uk_scotland'
  
  ELSE expedition_phase -- Keep existing phase if not in expected range
END;

-- Verification: Check phase distribution
SELECT 
  expedition_phase,
  COUNT(*) as collection_count,
  MIN(collection_index) as start_index,
  MAX(collection_index) as end_index,
  MIN(collection_start_date) as start_date,
  MAX(collection_start_date) as end_date
FROM story_collections 
GROUP BY expedition_phase 
ORDER BY MIN(collection_index);

-- Verification: Check specific phase transitions
SELECT 
  collection_index,
  name,
  expedition_phase,
  collection_start_date
FROM story_collections 
WHERE collection_index IN (1, 9, 10, 11, 12, 21, 22, 30, 31, 41, 42, 50, 51, 61)
ORDER BY collection_index;

COMMIT;

-- Summary of 7-Phase Structure:
-- 1. pre_expedition (1-9): 2022-2024 adventures before main expedition
-- 2. north_china (10-11): Mongolia & expedition start (2024-06-29 to 2024-07-20)
-- 3. central_asia (12-21): Kyrgyzstan → Kazakhstan → Uzbekistan → Russia → Tajikistan (2024-07-18 to 2024-09-25)
-- 4. middle_east_caucasus (22-30): Georgia → Armenia → Turkey (2024-10-06 to 2024-11-27)
-- 5. europe_part1 (31-41): Bulgaria → Greece → Italy → MFW → France → Spain (2024-12-06 to 2025-02-07)
-- 6. africa (42-50): Morocco expedition with Italy crossings (2025-01-17 to 2025-04-06)
-- 7. europe_uk_scotland (51-61): Germany → England → Wales → Scotland - Expedition finale (2025-04-24 to 2025-07-31)