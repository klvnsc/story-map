-- Add Collection Start Dates
-- Adds collection_start_date field and populates it from collections-manifest.json

BEGIN;

-- Step 1: Add collection_start_date field
ALTER TABLE story_collections 
ADD COLUMN IF NOT EXISTS collection_start_date DATE;

-- Step 2: Update collection start dates based on collections-manifest.json
-- Uses new collection_index (1-61) to match manifest data
UPDATE story_collections SET collection_start_date = 
CASE collection_index
  -- Pre-expedition (Collections 1-9)
  WHEN 1 THEN '2022-06-01'::date   -- LADAKH 1
  WHEN 2 THEN '2022-06-15'::date   -- LADAKH 2
  WHEN 3 THEN '2022-07-01'::date   -- NEW DELHI
  WHEN 4 THEN '2022-08-01'::date   -- INDONESIA
  WHEN 5 THEN '2022-09-01'::date   -- 下関 - 津山 🚴 上集
  WHEN 6 THEN '2022-09-15'::date   -- 下関 - 津山 🚴 中集
  WHEN 7 THEN '2022-10-01'::date   -- 下関 - 津山 🚴 下集
  WHEN 8 THEN '2022-10-15'::date   -- 日光
  WHEN 9 THEN '2024-02-24'::date   -- MONGOLIA WINTER
  
  -- North China (Collections 10-11)
  WHEN 10 THEN '2024-06-29'::date  -- Mongolia 🇲🇳
  WHEN 11 THEN '2024-07-20'::date  -- Q&A
  
  -- Central Asia (Collections 12-21)
  WHEN 12 THEN '2024-07-23'::date  -- Kyrgyzstan 🇰🇬
  WHEN 13 THEN '2024-07-19'::date  -- Kazakhstan 🇰🇿 1
  WHEN 14 THEN '2024-08-20'::date  -- Kazakhstan 🇰🇿 2
  WHEN 15 THEN '2024-08-08'::date  -- Uzbekistan 🇺🇿 1
  WHEN 16 THEN '2024-09-10'::date  -- Uzbekistan 🇺🇿 2
  WHEN 17 THEN '2024-09-17'::date  -- Uzbekistan 🇺🇿 3
  WHEN 18 THEN '2024-08-31'::date  -- Kazakhstan 🇰🇿 3
  WHEN 19 THEN '2024-09-25'::date  -- Kazakhstan 🇰🇿 4
  WHEN 20 THEN '2024-07-18'::date  -- Russia 🇷🇺
  WHEN 21 THEN '2024-07-29'::date  -- Tajikistan 🇹🇯
  
  -- Middle East & Caucasus (Collections 22-30)
  WHEN 22 THEN '2024-10-06'::date  -- Georgia 🇬🇪 1
  WHEN 23 THEN '2024-10-11'::date  -- Georgia 🇬🇪 2
  WHEN 24 THEN '2024-10-21'::date  -- Armenia 🇦🇲 1
  WHEN 25 THEN '2024-10-24'::date  -- Armenia 🇦🇲2
  WHEN 26 THEN '2024-10-30'::date  -- Armenia 🇦🇲 3
  WHEN 27 THEN '2024-11-03'::date  -- Georgia 🇬🇪 3
  WHEN 28 THEN '2024-11-09'::date  -- Turkey 🇹🇷 1
  WHEN 29 THEN '2024-11-18'::date  -- Turkey 🇹🇷 2
  WHEN 30 THEN '2024-11-27'::date  -- Turkey 🇹🇷 3
  
  -- Europe Part 1 (Collections 31-41)
  WHEN 31 THEN '2024-12-06'::date  -- Bulgaria 🇧🇬
  WHEN 32 THEN '2024-12-10'::date  -- Greece 🇬🇷 I
  WHEN 33 THEN '2024-12-19'::date  -- Greece 🇬🇷 II
  WHEN 34 THEN '2024-07-11'::date  -- Souls pt. 1
  WHEN 35 THEN '2024-12-27'::date  -- Italy 🇮🇹 I
  WHEN 36 THEN '2025-01-09'::date  -- Italy 🇮🇹 II
  WHEN 37 THEN '2025-01-18'::date  -- MFW2025 Vol I
  WHEN 38 THEN '2025-01-20'::date  -- MFW2025 Vol II
  WHEN 39 THEN '2025-01-23'::date  -- France 🇫🇷
  WHEN 40 THEN '2025-01-25'::date  -- Spain 🇪🇸 I
  WHEN 41 THEN '2025-02-07'::date  -- Spain 🇪🇸 II
  
  -- Africa (Collections 42-50)
  WHEN 42 THEN '2025-01-17'::date  -- Italy 🇮🇹 III
  WHEN 43 THEN '2025-02-01'::date  -- Morocco 🇲🇦 I
  WHEN 44 THEN '2024-08-08'::date  -- Thoughts
  WHEN 45 THEN '2025-02-10'::date  -- Morocco 🇲🇦 II
  WHEN 46 THEN '2025-02-18'::date  -- Morocco 🇲🇦 III
  WHEN 47 THEN '2025-03-03'::date  -- Morocco 🇲🇦 IV
  WHEN 48 THEN '2024-12-30'::date  -- Souls pt. 2
  WHEN 49 THEN '2025-03-20'::date  -- Morocco 🇲🇦 V
  WHEN 50 THEN '2025-04-06'::date  -- Morocco 🇲🇦 VI
  
  -- Europe Part 2 & UK/Scotland (Collections 51-61)
  WHEN 51 THEN '2025-04-24'::date  -- Germany 🇩🇪 I
  WHEN 52 THEN '2025-05-12'::date  -- Germany 🇩🇪 II
  WHEN 53 THEN '2025-05-25'::date  -- England - Part 1 🏴󠁧󠁢󠁥󠁮󠁧󠁿
  WHEN 54 THEN '2025-04-28'::date  -- Build 2.0
  WHEN 55 THEN '2025-06-08'::date  -- England - Part 2 🏴󠁧󠁢󠁥󠁮󠁧󠁿
  WHEN 56 THEN '2025-06-21'::date  -- England - Part 3 🏴󠁧󠁢󠁥󠁮󠁧󠁿
  WHEN 57 THEN '2025-07-12'::date  -- Podcast
  WHEN 58 THEN '2025-07-12'::date  -- Scotland - Part 1 🏴󠁧󠁢󠁳󠁣󠁴󠁿
  WHEN 59 THEN '2025-07-24'::date  -- Scotland - Part 2 🏴󠁧󠁢󠁳󠁣󠁴󠁿
  WHEN 60 THEN '2025-07-09'::date  -- England - Part 4 🏴󠁧󠁢󠁥󠁮󠁧󠁿
  WHEN 61 THEN '2025-07-31'::date  -- Wales 🏴󠁧󠁢󠁷󠁬󠁳󠁿
  ELSE NULL
END;

-- Step 3: Verification query
SELECT 
  collection_index,
  name,
  collection_start_date,
  expedition_phase
FROM story_collections 
ORDER BY collection_index 
LIMIT 10;

-- Step 4: Check date range coverage
SELECT 
  MIN(collection_start_date) as earliest_date,
  MAX(collection_start_date) as latest_date,
  COUNT(*) as total_collections,
  COUNT(collection_start_date) as collections_with_dates
FROM story_collections;

COMMIT;

-- Summary:
-- • Added collection_start_date field to story_collections table
-- • Populated dates from collections-manifest.json for all 61 collections
-- • Date range: 2022-06-01 (LADAKH 1) to 2025-07-31 (Wales)
-- • All collections now have accurate start dates for chronological context