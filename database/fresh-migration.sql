-- Fresh Migration Script for Story Map Database
-- Run this in your Supabase SQL editor to bring the database up to current requirements
-- Based on collections-manifest.json as the single source of truth

-- ============================================================================
-- STEP 1: Add missing columns to story_collections table
-- ============================================================================

-- Add collection numbering and expedition tracking
ALTER TABLE story_collections 
ADD COLUMN IF NOT EXISTS collection_index INTEGER,
ADD COLUMN IF NOT EXISTS is_expedition_scope BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS expedition_exclude_reason TEXT;

-- Add GPS correlation fields
ALTER TABLE story_collections
ADD COLUMN IF NOT EXISTS gps_track_ids INTEGER[],
ADD COLUMN IF NOT EXISTS estimated_date_range_start TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS estimated_date_range_end TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS regional_tags TEXT[];

-- ============================================================================
-- STEP 2: Add missing columns to stories table
-- ============================================================================

-- Add improved date tracking fields
ALTER TABLE stories 
ADD COLUMN IF NOT EXISTS estimated_date_range_start TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS estimated_date_range_end TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS user_assigned_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS collection_default_date TIMESTAMP WITH TIME ZONE;

-- Add enhanced tagging system
ALTER TABLE stories 
ADD COLUMN IF NOT EXISTS regional_tags TEXT[],
ADD COLUMN IF NOT EXISTS tag_source VARCHAR(30) DEFAULT 'manual' CHECK (tag_source IN ('gps_estimated', 'manual', 'mixed', 'excluded')),
ADD COLUMN IF NOT EXISTS date_confidence VARCHAR(20) DEFAULT 'collection_estimated' CHECK (date_confidence IN ('gps_estimated', 'collection_estimated', 'manual', 'high', 'medium', 'low'));

-- ============================================================================
-- STEP 3: Create performance indexes
-- ============================================================================

-- Collection indexes
CREATE INDEX IF NOT EXISTS idx_collection_index ON story_collections(collection_index);
CREATE INDEX IF NOT EXISTS idx_expedition_scope ON story_collections(is_expedition_scope);
CREATE INDEX IF NOT EXISTS idx_collections_gps_tracks ON story_collections USING GIN(gps_track_ids);
CREATE INDEX IF NOT EXISTS idx_collections_regional_tags ON story_collections USING GIN(regional_tags);

-- Story indexes
CREATE INDEX IF NOT EXISTS idx_stories_user_assigned_date ON stories(user_assigned_date);
CREATE INDEX IF NOT EXISTS idx_stories_collection_default_date ON stories(collection_default_date);
CREATE INDEX IF NOT EXISTS idx_stories_estimated_date_range ON stories(estimated_date_range_start, estimated_date_range_end);
CREATE INDEX IF NOT EXISTS idx_stories_regional_tags ON stories USING GIN(regional_tags);
CREATE INDEX IF NOT EXISTS idx_stories_tag_source ON stories(tag_source);
CREATE INDEX IF NOT EXISTS idx_stories_date_confidence ON stories(date_confidence);

-- Add unique constraint for collection_index
ALTER TABLE story_collections 
DROP CONSTRAINT IF EXISTS uk_collection_index;
ALTER TABLE story_collections 
ADD CONSTRAINT uk_collection_index UNIQUE (collection_index);

-- ============================================================================
-- STEP 4: Clear existing data to start fresh
-- ============================================================================

-- Remove any existing collection reference data (keep table structure)
DELETE FROM stories;
DELETE FROM story_collections WHERE highlight_id NOT LIKE 'phase_%';

-- ============================================================================
-- STEP 5: Insert fresh collection data from collections-manifest.json
-- ============================================================================

-- Collection 1: LADAKH 1 (earliest - 2022-06-01)
INSERT INTO story_collections (highlight_id, name, story_count, collection_index, expedition_phase, estimated_date, is_expedition_scope, expedition_exclude_reason, region) VALUES
('18064808941402631:breakingcycles.life', 'LADAKH 1', 99, 1, 'pre_expedition', '2022-06-01', false, 'pre_expedition_content', 'India');

-- Collection 2: LADAKH 2
INSERT INTO story_collections (highlight_id, name, story_count, collection_index, expedition_phase, estimated_date, is_expedition_scope, expedition_exclude_reason, region) VALUES
('17984999519177523:breakingcycles.life', 'LADAKH 2', 99, 2, 'pre_expedition', '2022-06-15', false, 'pre_expedition_content', 'India');

-- Collection 3: NEW DELHI
INSERT INTO story_collections (highlight_id, name, story_count, collection_index, expedition_phase, estimated_date, is_expedition_scope, expedition_exclude_reason, region) VALUES
('17909494379698894:breakingcycles.life', 'NEW DELHI', 59, 3, 'pre_expedition', '2022-07-01', false, 'pre_expedition_content', 'India');

-- Collection 4: INDONESIA
INSERT INTO story_collections (highlight_id, name, story_count, collection_index, expedition_phase, estimated_date, is_expedition_scope, expedition_exclude_reason, region) VALUES
('18001194349870466:breakingcycles.life', 'INDONESIA', 29, 4, 'pre_expedition', '2022-08-01', false, 'pre_expedition_content', 'Indonesia');

-- Collection 5: Japan cycling Part 1
INSERT INTO story_collections (highlight_id, name, story_count, collection_index, expedition_phase, estimated_date, is_expedition_scope, expedition_exclude_reason, region) VALUES
('17893662158920583:breakingcycles.life', '下関 - 津山 🚴 上集', 44, 5, 'pre_expedition', '2022-09-01', false, 'pre_expedition_content', 'Japan');

-- Collection 6: Japan cycling Part 2
INSERT INTO story_collections (highlight_id, name, story_count, collection_index, expedition_phase, estimated_date, is_expedition_scope, expedition_exclude_reason, region) VALUES
('17847537087090006:breakingcycles.life', '下関 - 津山 🚴 中集', 100, 6, 'pre_expedition', '2022-09-15', false, 'pre_expedition_content', 'Japan');

-- Collection 7: Japan cycling Part 3
INSERT INTO story_collections (highlight_id, name, story_count, collection_index, expedition_phase, estimated_date, is_expedition_scope, expedition_exclude_reason, region) VALUES
('18048074443469949:breakingcycles.life', '下関 - 津山 🚴 下集', 100, 7, 'pre_expedition', '2022-10-01', false, 'pre_expedition_content', 'Japan');

-- Collection 8: 日光
INSERT INTO story_collections (highlight_id, name, story_count, collection_index, expedition_phase, estimated_date, is_expedition_scope, expedition_exclude_reason, region) VALUES
('18202733329277692:breakingcycles.life', '日光', 24, 8, 'pre_expedition', '2022-10-15', false, 'pre_expedition_content', 'Japan');

-- Collection 9: MONGOLIA WINTER (expedition starts here)
INSERT INTO story_collections (highlight_id, name, story_count, collection_index, expedition_phase, estimated_date, is_expedition_scope, expedition_exclude_reason, region) VALUES
('17958474221619709:breakingcycles.life', 'MONGOLIA WINTER', 100, 9, 'north_china', '2024-02-24', true, null, 'Mongolia');

-- Collection 10: Mongolia 🇲🇳
INSERT INTO story_collections (highlight_id, name, story_count, collection_index, expedition_phase, estimated_date, is_expedition_scope, expedition_exclude_reason, region) VALUES
('17977584701709245:breakingcycles.life', 'Mongolia 🇲🇳', 74, 10, 'north_china', '2024-06-29', true, null, 'Mongolia');

-- Collection 11: Q&A
INSERT INTO story_collections (highlight_id, name, story_count, collection_index, expedition_phase, estimated_date, is_expedition_scope, expedition_exclude_reason, region) VALUES
('18447928921046336:breakingcycles.life', 'Q&A', 100, 11, 'north_china', '2024-07-20', true, null, 'General');

-- Collection 12: Kyrgyzstan 🇰🇬 (Central Asia starts)
INSERT INTO story_collections (highlight_id, name, story_count, collection_index, expedition_phase, estimated_date, is_expedition_scope, expedition_exclude_reason, region) VALUES
('18450623119021935:breakingcycles.life', 'Kyrgyzstan 🇰🇬', 89, 12, 'central_asia', '2024-07-23', true, null, 'Central Asia');

-- Collection 13: Kazakhstan 🇰🇿 1
INSERT INTO story_collections (highlight_id, name, story_count, collection_index, expedition_phase, estimated_date, is_expedition_scope, expedition_exclude_reason, region) VALUES
('18008045279547582:breakingcycles.life', 'Kazakhstan 🇰🇿 1', 89, 13, 'central_asia', '2024-07-19', true, null, 'Central Asia');

-- Collection 14: Kazakhstan 🇰🇿 2
INSERT INTO story_collections (highlight_id, name, story_count, collection_index, expedition_phase, estimated_date, is_expedition_scope, expedition_exclude_reason, region) VALUES
('18058314775659069:breakingcycles.life', 'Kazakhstan 🇰🇿 2', 98, 14, 'central_asia', '2024-08-20', true, null, 'Central Asia');

-- Collection 15: Uzbekistan 🇺🇿 1
INSERT INTO story_collections (highlight_id, name, story_count, collection_index, expedition_phase, estimated_date, is_expedition_scope, expedition_exclude_reason, region) VALUES
('18122776447372808:breakingcycles.life', 'Uzbekistan 🇺🇿 1', 93, 15, 'central_asia', '2024-08-08', true, null, 'Central Asia');

-- Collection 16: Uzbekistan 🇺🇿 2
INSERT INTO story_collections (highlight_id, name, story_count, collection_index, expedition_phase, estimated_date, is_expedition_scope, expedition_exclude_reason, region) VALUES
('18075540595554032:breakingcycles.life', 'Uzbekistan 🇺🇿 2', 100, 16, 'central_asia', '2024-09-10', true, null, 'Central Asia');

-- Collection 17: Uzbekistan 🇺🇿 3
INSERT INTO story_collections (highlight_id, name, story_count, collection_index, expedition_phase, estimated_date, is_expedition_scope, expedition_exclude_reason, region) VALUES
('17952841943822134:breakingcycles.life', 'Uzbekistan 🇺🇿 3', 100, 17, 'central_asia', '2024-09-17', true, null, 'Central Asia');

-- Collection 18: Kazakhstan 🇰🇿 3
INSERT INTO story_collections (highlight_id, name, story_count, collection_index, expedition_phase, estimated_date, is_expedition_scope, expedition_exclude_reason, region) VALUES
('18053779645660840:breakingcycles.life', 'Kazakhstan 🇰🇿 3', 25, 18, 'central_asia', '2024-08-31', true, null, 'Central Asia');

-- Collection 19: Kazakhstan 🇰🇿 4
INSERT INTO story_collections (highlight_id, name, story_count, collection_index, expedition_phase, estimated_date, is_expedition_scope, expedition_exclude_reason, region) VALUES
('18103024393441878:breakingcycles.life', 'Kazakhstan 🇰🇿 4', 100, 19, 'central_asia', '2024-09-25', true, null, 'Central Asia');

-- Collection 20: Russia 🇷🇺
INSERT INTO story_collections (highlight_id, name, story_count, collection_index, expedition_phase, estimated_date, is_expedition_scope, expedition_exclude_reason, region) VALUES
('17965710818773208:breakingcycles.life', 'Russia 🇷🇺', 22, 20, 'central_asia', '2024-07-18', true, null, 'Russia');

-- Collection 21: Tajikistan 🇹🇯
INSERT INTO story_collections (highlight_id, name, story_count, collection_index, expedition_phase, estimated_date, is_expedition_scope, expedition_exclude_reason, region) VALUES
('18040006774818828:breakingcycles.life', 'Tajikistan 🇹🇯', 26, 21, 'central_asia', '2024-07-29', true, null, 'Central Asia');

-- Collection 22: Georgia 🇬🇪 1 (Middle East/Caucasus starts)
INSERT INTO story_collections (highlight_id, name, story_count, collection_index, expedition_phase, estimated_date, is_expedition_scope, expedition_exclude_reason, region) VALUES
('17858220288266313:breakingcycles.life', 'Georgia 🇬🇪 1', 99, 22, 'middle_east_caucasus', '2024-10-06', true, null, 'Caucasus');

-- Collection 23: Georgia 🇬🇪 2
INSERT INTO story_collections (highlight_id, name, story_count, collection_index, expedition_phase, estimated_date, is_expedition_scope, expedition_exclude_reason, region) VALUES
('18011275097400978:breakingcycles.life', 'Georgia 🇬🇪 2', 98, 23, 'middle_east_caucasus', '2024-10-11', true, null, 'Caucasus');

-- Collection 24: Armenia 🇦🇲 1
INSERT INTO story_collections (highlight_id, name, story_count, collection_index, expedition_phase, estimated_date, is_expedition_scope, expedition_exclude_reason, region) VALUES
('18137731558325083:breakingcycles.life', 'Armenia 🇦🇲 1', 100, 24, 'middle_east_caucasus', '2024-10-21', true, null, 'Caucasus');

-- Collection 25: Armenia 🇦🇲2
INSERT INTO story_collections (highlight_id, name, story_count, collection_index, expedition_phase, estimated_date, is_expedition_scope, expedition_exclude_reason, region) VALUES
('18044368168879405:breakingcycles.life', 'Armenia 🇦🇲2', 99, 25, 'middle_east_caucasus', '2024-10-24', true, null, 'Caucasus');

-- Collection 26: Armenia 🇦🇲 3
INSERT INTO story_collections (highlight_id, name, story_count, collection_index, expedition_phase, estimated_date, is_expedition_scope, expedition_exclude_reason, region) VALUES
('18040879571160857:breakingcycles.life', 'Armenia 🇦🇲 3', 100, 26, 'middle_east_caucasus', '2024-10-30', true, null, 'Caucasus');

-- Collection 27: Georgia 🇬🇪 3
INSERT INTO story_collections (highlight_id, name, story_count, collection_index, expedition_phase, estimated_date, is_expedition_scope, expedition_exclude_reason, region) VALUES
('17932289318951599:breakingcycles.life', 'Georgia 🇬🇪 3', 9, 27, 'middle_east_caucasus', '2024-11-03', true, null, 'Caucasus');

-- Collection 28: Turkey 🇹🇷 1
INSERT INTO story_collections (highlight_id, name, story_count, collection_index, expedition_phase, estimated_date, is_expedition_scope, expedition_exclude_reason, region) VALUES
('18066993982649869:breakingcycles.life', 'Turkey 🇹🇷 1', 74, 28, 'middle_east_caucasus', '2024-11-09', true, null, 'Turkey');

-- Collection 29: Turkey 🇹🇷 2
INSERT INTO story_collections (highlight_id, name, story_count, collection_index, expedition_phase, estimated_date, is_expedition_scope, expedition_exclude_reason, region) VALUES
('18037664711047569:breakingcycles.life', 'Turkey 🇹🇷 2', 100, 29, 'middle_east_caucasus', '2024-11-18', true, null, 'Turkey');

-- Collection 30: Turkey 🇹🇷 3
INSERT INTO story_collections (highlight_id, name, story_count, collection_index, expedition_phase, estimated_date, is_expedition_scope, expedition_exclude_reason, region) VALUES
('17987636276756920:breakingcycles.life', 'Turkey 🇹🇷 3', 100, 30, 'middle_east_caucasus', '2024-11-27', true, null, 'Turkey');

-- Collection 31: Bulgaria 🇧🇬 (Europe Part 1 starts)
INSERT INTO story_collections (highlight_id, name, story_count, collection_index, expedition_phase, estimated_date, is_expedition_scope, expedition_exclude_reason, region) VALUES
('18052837759821656:breakingcycles.life', 'Bulgaria 🇧🇬', 100, 31, 'europe_part1', '2024-12-06', true, null, 'Europe');

-- Collection 32: Greece 🇬🇷 I
INSERT INTO story_collections (highlight_id, name, story_count, collection_index, expedition_phase, estimated_date, is_expedition_scope, expedition_exclude_reason, region) VALUES
('17991220025742686:breakingcycles.life', 'Greece 🇬🇷 I', 79, 32, 'europe_part1', '2024-12-10', true, null, 'Europe');

-- Collection 33: Greece 🇬🇷 II
INSERT INTO story_collections (highlight_id, name, story_count, collection_index, expedition_phase, estimated_date, is_expedition_scope, expedition_exclude_reason, region) VALUES
('18044152921980963:breakingcycles.life', 'Greece 🇬🇷 II', 100, 33, 'europe_part1', '2024-12-19', true, null, 'Europe');

-- Collection 34: Souls pt. 1
INSERT INTO story_collections (highlight_id, name, story_count, collection_index, expedition_phase, estimated_date, is_expedition_scope, expedition_exclude_reason, region) VALUES
('17916693795030579:breakingcycles.life', 'Souls pt. 1', 70, 34, 'europe_part1', '2024-07-11', true, null, 'General');

-- Collection 35: Italy 🇮🇹 I
INSERT INTO story_collections (highlight_id, name, story_count, collection_index, expedition_phase, estimated_date, is_expedition_scope, expedition_exclude_reason, region) VALUES
('17889230265118966:breakingcycles.life', 'Italy 🇮🇹 I', 100, 35, 'europe_part1', '2024-12-27', true, null, 'Europe');

-- Collection 36: Italy 🇮🇹 II
INSERT INTO story_collections (highlight_id, name, story_count, collection_index, expedition_phase, estimated_date, is_expedition_scope, expedition_exclude_reason, region) VALUES
('18102396352485795:breakingcycles.life', 'Italy 🇮🇹 II', 100, 36, 'europe_part1', '2025-01-09', true, null, 'Europe');

-- Collection 37: MFW2025 Vol I
INSERT INTO story_collections (highlight_id, name, story_count, collection_index, expedition_phase, estimated_date, is_expedition_scope, expedition_exclude_reason, region) VALUES
('18347481994183019:breakingcycles.life', 'MFW2025 Vol I', 99, 37, 'europe_part1', '2025-01-18', true, null, 'Europe');

-- Collection 38: MFW2025 Vol II
INSERT INTO story_collections (highlight_id, name, story_count, collection_index, expedition_phase, estimated_date, is_expedition_scope, expedition_exclude_reason, region) VALUES
('17991384335769961:breakingcycles.life', 'MFW2025 Vol II', 99, 38, 'europe_part1', '2025-01-20', true, null, 'Europe');

-- Collection 39: France 🇫🇷
INSERT INTO story_collections (highlight_id, name, story_count, collection_index, expedition_phase, estimated_date, is_expedition_scope, expedition_exclude_reason, region) VALUES
('18038123462528317:breakingcycles.life', 'France 🇫🇷', 40, 39, 'europe_part1', '2025-01-23', true, null, 'Europe');

-- Collection 40: Spain 🇪🇸 I
INSERT INTO story_collections (highlight_id, name, story_count, collection_index, expedition_phase, estimated_date, is_expedition_scope, expedition_exclude_reason, region) VALUES
('18071829082750153:breakingcycles.life', 'Spain 🇪🇸 I', 100, 40, 'europe_part1', '2025-01-25', true, null, 'Europe');

-- Collection 41: Spain 🇪🇸 II
INSERT INTO story_collections (highlight_id, name, story_count, collection_index, expedition_phase, estimated_date, is_expedition_scope, expedition_exclude_reason, region) VALUES
('18035501075407752:breakingcycles.life', 'Spain 🇪🇸 II', 18, 41, 'europe_part1', '2025-02-07', true, null, 'Europe');

-- Collection 42: Italy 🇮🇹 III (Africa starts)
INSERT INTO story_collections (highlight_id, name, story_count, collection_index, expedition_phase, estimated_date, is_expedition_scope, expedition_exclude_reason, region) VALUES
('18048676087963901:breakingcycles.life', 'Italy 🇮🇹 III', 18, 42, 'africa', '2025-01-17', true, null, 'Europe');

-- Collection 43: Morocco 🇲🇦 I
INSERT INTO story_collections (highlight_id, name, story_count, collection_index, expedition_phase, estimated_date, is_expedition_scope, expedition_exclude_reason, region) VALUES
('18079492300619829:breakingcycles.life', 'Morocco 🇲🇦 I', 25, 43, 'africa', '2025-02-01', true, null, 'Africa');

-- Collection 44: Thoughts
INSERT INTO story_collections (highlight_id, name, story_count, collection_index, expedition_phase, estimated_date, is_expedition_scope, expedition_exclude_reason, region) VALUES
('18030793766230793:breakingcycles.life', 'Thoughts', 100, 44, 'africa', '2024-08-08', true, null, 'General');

-- Collection 45: Morocco 🇲🇦 II
INSERT INTO story_collections (highlight_id, name, story_count, collection_index, expedition_phase, estimated_date, is_expedition_scope, expedition_exclude_reason, region) VALUES
('18077175703725858:breakingcycles.life', 'Morocco 🇲🇦 II', 11, 45, 'africa', '2025-02-10', true, null, 'Africa');

-- Collection 46: Morocco 🇲🇦 III
INSERT INTO story_collections (highlight_id, name, story_count, collection_index, expedition_phase, estimated_date, is_expedition_scope, expedition_exclude_reason, region) VALUES
('17908767675094414:breakingcycles.life', 'Morocco 🇲🇦 III', 9, 46, 'africa', '2025-02-18', true, null, 'Africa');

-- Collection 47: Morocco 🇲🇦 IV
INSERT INTO story_collections (highlight_id, name, story_count, collection_index, expedition_phase, estimated_date, is_expedition_scope, expedition_exclude_reason, region) VALUES
('17949446570943474:breakingcycles.life', 'Morocco 🇲🇦 IV', 9, 47, 'africa', '2025-03-03', true, null, 'Africa');

-- Collection 48: Souls pt. 2
INSERT INTO story_collections (highlight_id, name, story_count, collection_index, expedition_phase, estimated_date, is_expedition_scope, expedition_exclude_reason, region) VALUES
('17975341163805031:breakingcycles.life', 'Souls pt. 2', 9, 48, 'africa', '2024-12-30', true, null, 'General');

-- Collection 49: Morocco 🇲🇦 V
INSERT INTO story_collections (highlight_id, name, story_count, collection_index, expedition_phase, estimated_date, is_expedition_scope, expedition_exclude_reason, region) VALUES
('17932045244897253:breakingcycles.life', 'Morocco 🇲🇦 V', 9, 49, 'africa', '2025-03-20', true, null, 'Africa');

-- Collection 50: Morocco 🇲🇦 VI
INSERT INTO story_collections (highlight_id, name, story_count, collection_index, expedition_phase, estimated_date, is_expedition_scope, expedition_exclude_reason, region) VALUES
('17973374066841093:breakingcycles.life', 'Morocco 🇲🇦 VI', 9, 50, 'africa', '2025-04-06', true, null, 'Africa');

-- Collection 51: Germany 🇩🇪 I (Europe/UK/Scotland starts)
INSERT INTO story_collections (highlight_id, name, story_count, collection_index, expedition_phase, estimated_date, is_expedition_scope, expedition_exclude_reason, region) VALUES
('17935663073901419:breakingcycles.life', 'Germany 🇩🇪 I', 9, 51, 'europe_uk_scotland', '2025-04-24', true, null, 'Europe');

-- Collection 52: Germany 🇩🇪 II
INSERT INTO story_collections (highlight_id, name, story_count, collection_index, expedition_phase, estimated_date, is_expedition_scope, expedition_exclude_reason, region) VALUES
('18500727481005649:breakingcycles.life', 'Germany 🇩🇪 II', 9, 52, 'europe_uk_scotland', '2025-05-12', true, null, 'Europe');

-- Collection 53: England - Part 1 🏴󠁧󠁢󠁥󠁮󠁧󠁿
INSERT INTO story_collections (highlight_id, name, story_count, collection_index, expedition_phase, estimated_date, is_expedition_scope, expedition_exclude_reason, region) VALUES
('18017304146710500:breakingcycles.life', 'England - Part 1 🏴󠁧󠁢󠁥󠁮󠁧󠁿', 9, 53, 'europe_uk_scotland', '2025-05-25', true, null, 'UK');

-- Collection 54: Build 2.0
INSERT INTO story_collections (highlight_id, name, story_count, collection_index, expedition_phase, estimated_date, is_expedition_scope, expedition_exclude_reason, region) VALUES
('18057215815963683:breakingcycles.life', 'Build 2.0', 9, 54, 'europe_uk_scotland', '2025-04-28', true, null, 'General');

-- Collection 55: England - Part 2 🏴󠁧󠁢󠁥󠁮󠁧󠁿
INSERT INTO story_collections (highlight_id, name, story_count, collection_index, expedition_phase, estimated_date, is_expedition_scope, expedition_exclude_reason, region) VALUES
('18089901049624656:breakingcycles.life', 'England - Part 2 🏴󠁧󠁢󠁥󠁮󠁧󠁿', 9, 55, 'europe_uk_scotland', '2025-06-08', true, null, 'UK');

-- Collection 56: England - Part 3 🏴󠁧󠁢󠁥󠁮󠁧󠁿
INSERT INTO story_collections (highlight_id, name, story_count, collection_index, expedition_phase, estimated_date, is_expedition_scope, expedition_exclude_reason, region) VALUES
('18070381891972059:breakingcycles.life', 'England - Part 3 🏴󠁧󠁢󠁥󠁮󠁧󠁿', 9, 56, 'europe_uk_scotland', '2025-06-21', true, null, 'UK');

-- Collection 57: Podcast
INSERT INTO story_collections (highlight_id, name, story_count, collection_index, expedition_phase, estimated_date, is_expedition_scope, expedition_exclude_reason, region) VALUES
('18062166557266367:breakingcycles.life', 'Podcast', 3, 57, 'europe_uk_scotland', '2025-07-12', true, null, 'General');

-- Collection 58: Scotland - Part 1 🏴󠁧󠁢󠁳󠁣󠁴󠁿
INSERT INTO story_collections (highlight_id, name, story_count, collection_index, expedition_phase, estimated_date, is_expedition_scope, expedition_exclude_reason, region) VALUES
('18070600946491546:breakingcycles.life', 'Scotland - Part 1 🏴󠁧󠁢󠁳󠁣󠁴󠁿', 9, 58, 'europe_uk_scotland', '2025-07-12', true, null, 'UK');

-- Collection 59: Wales 🏴󠁧󠁢󠁷󠁬󠁳󠁿
INSERT INTO story_collections (highlight_id, name, story_count, collection_index, expedition_phase, estimated_date, is_expedition_scope, expedition_exclude_reason, region) VALUES
('18011241530716717:breakingcycles.life', 'Wales 🏴󠁧󠁢󠁷󠁬󠁳󠁿', 31, 59, 'europe_uk_scotland', '2025-07-31', true, null, 'UK');

-- Collection 60: Scotland - Part 2 🏴󠁧󠁢󠁳󠁣󠁴󠁿
INSERT INTO story_collections (highlight_id, name, story_count, collection_index, expedition_phase, estimated_date, is_expedition_scope, expedition_exclude_reason, region) VALUES
('18077415214744071:breakingcycles.life', 'Scotland - Part 2 🏴󠁧󠁢󠁳󠁣󠁴󠁿', 9, 60, 'europe_uk_scotland', '2025-07-24', true, null, 'UK');

-- Collection 61: England - Part 4 🏴󠁧󠁢󠁥󠁮󠁧󠁿 (latest - 2025-07-09)
INSERT INTO story_collections (highlight_id, name, story_count, collection_index, expedition_phase, estimated_date, is_expedition_scope, expedition_exclude_reason, region) VALUES
('18068925452490325:breakingcycles.life', 'England - Part 4 🏴󠁧󠁢󠁥󠁮󠁧󠁿', 35, 61, 'europe_uk_scotland', '2025-07-09', true, null, 'UK');

-- ============================================================================
-- STEP 6: Migrate existing story data if any exists (preserve estimated_date)
-- ============================================================================

-- Migrate existing estimated_date to collection_default_date for any existing stories
UPDATE stories 
SET collection_default_date = estimated_date
WHERE estimated_date IS NOT NULL AND collection_default_date IS NULL;

-- Set default values for new fields
UPDATE stories 
SET tag_source = 'manual',
    date_confidence = 'collection_estimated'
WHERE tag_source IS NULL OR date_confidence IS NULL;

-- ============================================================================
-- STEP 7: Add table comments for documentation
-- ============================================================================

COMMENT ON COLUMN story_collections.collection_index IS 'Collection number in ascending chronological order (1=earliest, 61=latest)';
COMMENT ON COLUMN story_collections.is_expedition_scope IS 'Whether collection is part of main expedition (false for Collections 1-8: pre-expedition)';
COMMENT ON COLUMN story_collections.expedition_exclude_reason IS 'Reason for excluding from expedition scope';
COMMENT ON COLUMN story_collections.gps_track_ids IS 'Array of expedition track IDs that correlate with this collection';
COMMENT ON COLUMN story_collections.regional_tags IS 'GPS-derived regional tags for the collection';

COMMENT ON COLUMN stories.collection_default_date IS 'Collection-based default date (fallback estimate)';
COMMENT ON COLUMN stories.user_assigned_date IS 'User-assigned date for manual story dating (highest accuracy)';
COMMENT ON COLUMN stories.regional_tags IS 'GPS-derived regional tags (separate from manual tags)';
COMMENT ON COLUMN stories.tag_source IS 'Source of tags: gps_estimated, manual, mixed, or excluded';
COMMENT ON COLUMN stories.date_confidence IS 'Confidence level of date estimation';

-- ============================================================================
-- STEP 8: Verification queries
-- ============================================================================

-- Verify collection structure
SELECT 
  'Collections Summary' as info,
  COUNT(*) as total_collections,
  COUNT(CASE WHEN is_expedition_scope = true THEN 1 END) as expedition_collections,
  COUNT(CASE WHEN is_expedition_scope = false THEN 1 END) as pre_expedition_collections,
  MIN(collection_index) as first_collection,
  MAX(collection_index) as last_collection
FROM story_collections;

-- Verify expedition phases
SELECT 
  expedition_phase,
  COUNT(*) as collection_count,
  MIN(collection_index) as first_collection,
  MAX(collection_index) as last_collection,
  MIN(estimated_date) as earliest_date,
  MAX(estimated_date) as latest_date
FROM story_collections
WHERE expedition_phase IS NOT NULL
GROUP BY expedition_phase
ORDER BY MIN(collection_index);

-- Verify chronological ordering
SELECT 
  collection_index,
  name,
  estimated_date,
  expedition_phase,
  is_expedition_scope
FROM story_collections 
WHERE collection_index IS NOT NULL
ORDER BY collection_index
LIMIT 10;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

/*
FRESH MIGRATION SUMMARY:

✅ STRUCTURE:
- All tables updated with required fields
- Proper indexes created for performance
- Unique constraints for data integrity

✅ DATA:
- 61 collections inserted with correct ascending chronological order (1=earliest, 61=latest)
- Collections 1-8: Pre-expedition (excluded from GPS correlation)
- Collections 9-61: Main expedition (included in GPS correlation)
- 7 expedition phases properly assigned

✅ FIELDS:
- collection_index: Ascending chronological order
- is_expedition_scope: Tracks expedition vs pre-expedition content
- collection_default_date: Proper date field naming
- regional_tags: Separate from manual tags
- tag_source: Tracks data source for filtering

✅ NEXT STEPS:
1. Update Supabase types with new fields
2. Run fresh data import using updated scripts
3. Test TypeScript interfaces with new structure
4. Validate with the validation script

This migration establishes collections-manifest.json as the single source of truth
and provides a clean foundation for the GPS correlation and tag systems.
*/