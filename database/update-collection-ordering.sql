-- Update Collection Chronological Ordering
-- Transforms collection_index from old descending order to new ascending chronological order
-- Based on collections-manifest.json mapping

BEGIN;

-- Update collection_index values based on collections-manifest.json mapping
-- Old collection 61 -> New collection 1 (earliest)
-- Old collection 1 -> New collection 61 (latest)

UPDATE story_collections SET collection_index = 
CASE collection_index
  WHEN 1 THEN 61   -- Wales -> 61 (latest)
  WHEN 2 THEN 60   -- England -> 60
  WHEN 3 THEN 59   -- Scotland -> 59
  WHEN 4 THEN 58   -- Scotland -> 58
  WHEN 5 THEN 57   -- Podcast -> 57
  WHEN 6 THEN 56   -- England -> 56
  WHEN 7 THEN 55   -- England -> 55
  WHEN 8 THEN 54   -- Build 2.0 -> 54
  WHEN 9 THEN 53   -- England -> 53
  WHEN 10 THEN 52  -- Germany II -> 52
  WHEN 11 THEN 51  -- Germany I -> 51
  WHEN 12 THEN 50  -- Morocco VI -> 50
  WHEN 13 THEN 49  -- Morocco V -> 49
  WHEN 14 THEN 48  -- Souls pt. 2 -> 48
  WHEN 15 THEN 47  -- Morocco IV -> 47
  WHEN 16 THEN 46  -- Morocco III -> 46
  WHEN 17 THEN 45  -- Morocco II -> 45
  WHEN 18 THEN 44  -- Thoughts -> 44
  WHEN 19 THEN 43  -- Morocco I -> 43
  WHEN 20 THEN 42  -- Italy III -> 42
  WHEN 21 THEN 41  -- Spain II -> 41
  WHEN 22 THEN 40  -- Spain I -> 40
  WHEN 23 THEN 39  -- France -> 39
  WHEN 24 THEN 38  -- MFW2025 Vol II -> 38
  WHEN 25 THEN 37  -- MFW2025 Vol I -> 37
  WHEN 26 THEN 36  -- Italy II -> 36
  WHEN 27 THEN 35  -- Italy I -> 35
  WHEN 28 THEN 34  -- Souls pt. 1 -> 34
  WHEN 29 THEN 33  -- Greece II -> 33
  WHEN 30 THEN 32  -- Greece I -> 32
  WHEN 31 THEN 31  -- Bulgaria -> 31
  WHEN 32 THEN 30  -- Turkey 3 -> 30
  WHEN 33 THEN 29  -- Turkey 2 -> 29
  WHEN 34 THEN 28  -- Turkey 1 -> 28
  WHEN 35 THEN 27  -- Georgia 3 -> 27
  WHEN 36 THEN 26  -- Armenia 3 -> 26
  WHEN 37 THEN 25  -- Armenia 2 -> 25
  WHEN 38 THEN 24  -- Armenia 1 -> 24
  WHEN 39 THEN 23  -- Georgia 2 -> 23
  WHEN 40 THEN 22  -- Georgia 1 -> 22
  WHEN 41 THEN 21  -- Tajikistan -> 21
  WHEN 42 THEN 20  -- Russia -> 20
  WHEN 43 THEN 19  -- Kazakhstan 4 -> 19
  WHEN 44 THEN 18  -- Kazakhstan 3 -> 18
  WHEN 45 THEN 17  -- Uzbekistan 3 -> 17
  WHEN 46 THEN 16  -- Uzbekistan 2 -> 16
  WHEN 47 THEN 15  -- Uzbekistan 1 -> 15
  WHEN 48 THEN 14  -- Kazakhstan 2 -> 14
  WHEN 49 THEN 13  -- Kazakhstan 1 -> 13
  WHEN 50 THEN 12  -- Kyrgyzstan -> 12
  WHEN 51 THEN 11  -- Q&A -> 11
  WHEN 52 THEN 10  -- Mongolia -> 10
  WHEN 53 THEN 9   -- Mongolia Winter -> 9
  WHEN 54 THEN 8   -- 日光 -> 8
  WHEN 55 THEN 7   -- 下関-津山 下集 -> 7
  WHEN 56 THEN 6   -- 下関-津山 中集 -> 6
  WHEN 57 THEN 5   -- 下関-津山 上集 -> 5
  WHEN 58 THEN 4   -- Indonesia -> 4
  WHEN 59 THEN 3   -- New Delhi -> 3
  WHEN 60 THEN 2   -- Ladakh 2 -> 2
  WHEN 61 THEN 1   -- Ladakh 1 -> 1 (earliest)
  ELSE collection_index
END;

-- Verification query
SELECT 
  collection_index,
  name,
  expedition_phase,
  estimated_date
FROM story_collections 
ORDER BY collection_index 
LIMIT 10;

COMMIT;

-- Summary:
-- Collection 1: LADAKH 1 (earliest, 2022)
-- Collection 61: Wales (latest, 2025)
-- This creates proper ascending chronological order