-- Migration: Chronological Collection Renumbering
-- Updates collections from old numbering (1-61 descending) to new chronological numbering (1-61 ascending)
-- Based on collections-manifest.json with 7-phase expedition structure

BEGIN;

-- Step 1: Create temporary table for the renumbering mapping
CREATE TEMP TABLE collection_renumbering (
    old_id INTEGER,
    new_id INTEGER,
    new_name TEXT,
    new_phase TEXT,
    new_date TEXT,
    new_region TEXT,
    instagram_id TEXT
);

-- Step 2: Insert all the collection mappings
INSERT INTO collection_renumbering (old_id, new_id, new_name, new_phase, new_date, new_region, instagram_id) VALUES
-- Pre-expedition (Collections 1-9 new)
(61, 1, 'LADAKH 1', 'pre_expedition', '2022-06-01', 'India', '18064808941402631:breakingcycles.life'),
(60, 2, 'LADAKH 2', 'pre_expedition', '2022-06-15', 'India', '17984999519177523:breakingcycles.life'),
(59, 3, 'NEW DELHI', 'pre_expedition', '2022-07-01', 'India', '17909494379698894:breakingcycles.life'),
(58, 4, 'INDONESIA', 'pre_expedition', '2022-08-01', 'Indonesia', '18001194349870466:breakingcycles.life'),
(57, 5, '下関 - 津山 🚴 上集', 'pre_expedition', '2022-09-01', 'Japan', '17893662158920583:breakingcycles.life'),
(56, 6, '下関 - 津山 🚴 中集', 'pre_expedition', '2022-09-15', 'Japan', '17847537087090006:breakingcycles.life'),
(55, 7, '下関 - 津山 🚴 下集', 'pre_expedition', '2022-10-01', 'Japan', '18048074443469949:breakingcycles.life'),
(54, 8, '日光', 'pre_expedition', '2022-10-15', 'Japan', '18202733329277692:breakingcycles.life'),
(53, 9, 'MONGOLIA WINTER', 'pre_expedition', '2024-02-24', 'Mongolia', '17958474221619709:breakingcycles.life'),

-- North China & Mongolia (Collections 10-11 new)
(52, 10, 'Mongolia 🇲🇳', 'north_china', '2024-06-29', 'Mongolia', '17977584701709245:breakingcycles.life'),
(51, 11, 'Q&A', 'north_china', '2024-07-20', 'General', '18447928921046336:breakingcycles.life'),

-- Central Asia (Collections 12-21 new)
(50, 12, 'Kyrgyzstan 🇰🇬', 'central_asia', '2024-07-23', 'Central Asia', '18450623119021935:breakingcycles.life'),
(49, 13, 'Kazakhstan 🇰🇿 1', 'central_asia', '2024-07-19', 'Central Asia', '18008045279547582:breakingcycles.life'),
(48, 14, 'Kazakhstan 🇰🇿 2', 'central_asia', '2024-08-20', 'Central Asia', '18058314775659069:breakingcycles.life'),
(47, 15, 'Uzbekistan 🇺🇿 1', 'central_asia', '2024-08-08', 'Central Asia', '18122776447372808:breakingcycles.life'),
(46, 16, 'Uzbekistan 🇺🇿 2', 'central_asia', '2024-09-10', 'Central Asia', '18075540595554032:breakingcycles.life'),
(45, 17, 'Uzbekistan 🇺🇿 3', 'central_asia', '2024-09-17', 'Central Asia', '17952841943822134:breakingcycles.life'),
(44, 18, 'Kazakhstan 🇰🇿 3', 'central_asia', '2024-08-31', 'Central Asia', '18053779645660840:breakingcycles.life'),
(43, 19, 'Kazakhstan 🇰🇿 4', 'central_asia', '2024-09-25', 'Central Asia', '18103024393441878:breakingcycles.life'),
(42, 20, 'Russia 🇷🇺', 'central_asia', '2024-07-18', 'Russia', '17965710818773208:breakingcycles.life'),
(41, 21, 'Tajikistan 🇹🇯', 'central_asia', '2024-07-29', 'Central Asia', '18040006774818828:breakingcycles.life'),

-- Middle East & Caucasus (Collections 22-30 new)
(40, 22, 'Georgia 🇬🇪 1', 'middle_east_caucasus', '2024-10-06', 'Caucasus', '17858220288266313:breakingcycles.life'),
(39, 23, 'Georgia 🇬🇪 2', 'middle_east_caucasus', '2024-10-11', 'Caucasus', '18011275097400978:breakingcycles.life'),
(38, 24, 'Armenia 🇦🇲 1', 'middle_east_caucasus', '2024-10-21', 'Caucasus', '18137731558325083:breakingcycles.life'),
(37, 25, 'Armenia 🇦🇲2', 'middle_east_caucasus', '2024-10-24', 'Caucasus', '18044368168879405:breakingcycles.life'),
(36, 26, 'Armenia 🇦🇲 3', 'middle_east_caucasus', '2024-10-30', 'Caucasus', '18040879571160857:breakingcycles.life'),
(35, 27, 'Georgia 🇬🇪 3', 'middle_east_caucasus', '2024-11-03', 'Caucasus', '17932289318951599:breakingcycles.life'),
(34, 28, 'Turkey 🇹🇷 1', 'middle_east_caucasus', '2024-11-09', 'Turkey', '18066993982649869:breakingcycles.life'),
(33, 29, 'Turkey 🇹🇷 2', 'middle_east_caucasus', '2024-11-18', 'Turkey', '18037664711047569:breakingcycles.life'),
(32, 30, 'Turkey 🇹🇷 3', 'middle_east_caucasus', '2024-11-27', 'Turkey', '17987636276756920:breakingcycles.life'),

-- Europe Part 1 (Collections 31-41 new)
(31, 31, 'Bulgaria 🇧🇬', 'europe_part1', '2024-12-06', 'Europe', '18052837759821656:breakingcycles.life'),
(30, 32, 'Greece 🇬🇷 I', 'europe_part1', '2024-12-10', 'Europe', '17991220025742686:breakingcycles.life'),
(29, 33, 'Greece 🇬🇷 II', 'europe_part1', '2024-12-19', 'Europe', '18044152921980963:breakingcycles.life'),
(28, 34, 'Souls pt. 1', 'europe_part1', '2024-07-11', 'General', '17916693795030579:breakingcycles.life'),
(27, 35, 'Italy 🇮🇹 I', 'europe_part1', '2024-12-27', 'Europe', '17889230265118966:breakingcycles.life'),
(26, 36, 'Italy 🇮🇹 II', 'europe_part1', '2025-01-09', 'Europe', '18102396352485795:breakingcycles.life'),
(25, 37, 'MFW2025 Vol I', 'europe_part1', '2025-01-18', 'Europe', '18347481994183019:breakingcycles.life'),
(24, 38, 'MFW2025 Vol II', 'europe_part1', '2025-01-20', 'Europe', '17991384335769961:breakingcycles.life'),
(23, 39, 'France 🇫🇷', 'europe_part1', '2025-01-23', 'Europe', '18038123462528317:breakingcycles.life'),
(22, 40, 'Spain 🇪🇸 I', 'europe_part1', '2025-01-25', 'Europe', '18071829082750153:breakingcycles.life'),
(21, 41, 'Spain 🇪🇸 II', 'europe_part1', '2025-02-07', 'Europe', '18035501075407752:breakingcycles.life'),

-- Africa (Collections 42-50 new)
(20, 42, 'Italy 🇮🇹 III', 'africa', '2025-01-17', 'Europe', '18048676087963901:breakingcycles.life'),
(19, 43, 'Morocco 🇲🇦 I', 'africa', '2025-02-01', 'Africa', '18079492300619829:breakingcycles.life'),
(18, 44, 'Thoughts', 'africa', '2024-08-08', 'General', '18030793766230793:breakingcycles.life'),
(17, 45, 'Morocco 🇲🇦 II', 'africa', '2025-02-10', 'Africa', '18077175703725858:breakingcycles.life'),
(16, 46, 'Morocco 🇲🇦 III', 'africa', '2025-02-18', 'Africa', '17908767675094414:breakingcycles.life'),
(15, 47, 'Morocco 🇲🇦 IV', 'africa', '2025-03-03', 'Africa', '17949446570943474:breakingcycles.life'),
(14, 48, 'Souls pt. 2', 'africa', '2024-12-30', 'General', '17975341163805031:breakingcycles.life'),
(13, 49, 'Morocco 🇲🇦 V', 'africa', '2025-03-20', 'Africa', '17932045244897253:breakingcycles.life'),
(12, 50, 'Morocco 🇲🇦 VI', 'africa', '2025-04-06', 'Africa', '17973374066841093:breakingcycles.life'),

-- Europe Part 2 & UK/Scotland (Collections 51-61 new)
(11, 51, 'Germany 🇩🇪 I', 'europe_uk_scotland', '2025-04-24', 'Europe', '17935663073901419:breakingcycles.life'),
(10, 52, 'Germany 🇩🇪 II', 'europe_uk_scotland', '2025-05-12', 'Europe', '18500727481005649:breakingcycles.life'),
(9, 53, 'England - Part 1 🏴󠁧󠁢󠁥󠁮󠁧󠁿', 'europe_uk_scotland', '2025-05-25', 'UK', '18017304146710500:breakingcycles.life'),
(8, 54, 'Build 2.0', 'europe_uk_scotland', '2025-04-28', 'General', '18057215815963683:breakingcycles.life'),
(7, 55, 'England - Part 2 🏴󠁧󠁢󠁥󠁮󠁧󠁿', 'europe_uk_scotland', '2025-06-08', 'UK', '18089901049624656:breakingcycles.life'),
(6, 56, 'England - Part 3 🏴󠁧󠁢󠁥󠁮󠁧󠁿', 'europe_uk_scotland', '2025-06-21', 'UK', '18070381891972059:breakingcycles.life'),
(5, 57, 'Podcast', 'europe_uk_scotland', '2025-07-12', 'General', '18062166557266367:breakingcycles.life'),
(4, 58, 'Scotland - Part 1 🏴󠁧󠁢󠁳󠁣󠁴󠁿', 'europe_uk_scotland', '2025-07-12', 'UK', '18070600946491546:breakingcycles.life'),
(1, 59, 'Wales 🏴󠁧󠁢󠁷󠁬󠁳󠁿', 'europe_uk_scotland', '2025-07-31', 'UK', '18011241530716717:breakingcycles.life'),
(3, 60, 'Scotland - Part 2 🏴󠁧󠁢󠁳󠁣󠁴󠁿', 'europe_uk_scotland', '2025-07-24', 'UK', '18077415214744071:breakingcycles.life'),
(2, 61, 'England - Part 4 🏴󠁧󠁢󠁥󠁮󠁧󠁿', 'europe_uk_scotland', '2025-07-09', 'UK', '18068925452490325:breakingcycles.life');

-- Step 3: Create temporary collections table with new numbering
CREATE TEMP TABLE story_collections_new AS
SELECT 
    r.new_id as id,
    r.new_name as name,
    r.new_phase as expedition_phase,
    r.new_date::date as estimated_date,
    sc.created_at,
    sc.updated_at,
    sc.story_count,
    sc.collection_default_date,
    sc.user_assigned_date,
    sc.tags_unified
FROM collection_renumbering r
JOIN story_collections sc ON sc.id = r.old_id;

-- Step 4: Create temporary stories table with updated collection references
CREATE TEMP TABLE stories_new AS
SELECT 
    s.id,
    r.new_id as collection_id,
    s.story_id,
    s.media_type,
    s.cdn_url,
    s.duration,
    s.time_added,
    s.created_at,
    s.updated_at,
    s.user_assigned_date,
    s.collection_default_date,
    s.estimated_location_lat,
    s.estimated_location_lng,
    s.location_accuracy_level,
    s.location_source,
    s.location_notes,
    s.tags_unified
FROM stories s
JOIN collection_renumbering r ON s.collection_id = r.old_id;

-- Step 5: Replace old data with new data
DELETE FROM stories;
DELETE FROM story_collections;

-- Step 6: Insert new data
INSERT INTO story_collections (id, name, expedition_phase, estimated_date, created_at, updated_at, story_count, collection_default_date, user_assigned_date, tags_unified)
SELECT id, name, expedition_phase, estimated_date, created_at, updated_at, story_count, collection_default_date, user_assigned_date, tags_unified
FROM story_collections_new;

INSERT INTO stories (id, collection_id, story_id, media_type, cdn_url, duration, time_added, created_at, updated_at, user_assigned_date, collection_default_date, estimated_location_lat, estimated_location_lng, location_accuracy_level, location_source, location_notes, tags_unified)
SELECT id, collection_id, story_id, media_type, cdn_url, duration, time_added, created_at, updated_at, user_assigned_date, collection_default_date, estimated_location_lat, estimated_location_lng, location_accuracy_level, location_source, location_notes, tags_unified
FROM stories_new;

-- Step 7: Update sequences to match the new highest IDs
SELECT setval('story_collections_id_seq', (SELECT MAX(id) FROM story_collections), true);
SELECT setval('stories_id_seq', (SELECT MAX(id) FROM stories), true);

-- Step 8: Verification queries (optional - run to verify)
-- SELECT 'Collections Count' as check_type, COUNT(*) as count FROM story_collections
-- UNION ALL
-- SELECT 'Stories Count' as check_type, COUNT(*) as count FROM stories
-- UNION ALL  
-- SELECT 'Collection Range' as check_type, MIN(id) || ' - ' || MAX(id) as count FROM story_collections
-- UNION ALL
-- SELECT 'Phase Distribution' as check_type, expedition_phase || ': ' || COUNT(*) as count FROM story_collections GROUP BY expedition_phase;

COMMIT;

-- Summary of changes:
-- • Renumbered collections from old numbering (descending) to new chronological numbering (ascending)
-- • Updated all collection names to match manifest
-- • Updated expedition phases to 7-phase structure (pre_expedition, north_china, central_asia, middle_east_caucasus, europe_part1, africa, europe_uk_scotland)  
-- • Applied correct estimated_date for each collection based on provided dates
-- • Updated all story records to reference new collection IDs
-- • Maintained all existing data integrity (story counts, CDN URLs, metadata, etc.)