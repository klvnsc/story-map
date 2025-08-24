-- Migration: Add Unified Tags System for Regional Tags
-- Date: 2025-08-15
-- Purpose: Implement unified tag system to replace dual-array approach

-- Add new unified tags column for implementing unified tag system
ALTER TABLE stories ADD COLUMN tags_unified JSONB DEFAULT '[]'::jsonb;

-- Create indexes for tag queries
CREATE INDEX idx_stories_tags_unified_gin ON stories USING GIN (tags_unified);
CREATE INDEX idx_stories_tags_name ON stories USING GIN ((tags_unified -> 'name'));
CREATE INDEX idx_stories_tags_type ON stories USING GIN ((tags_unified -> 'type'));

-- Additional performance indexes recommended by tech lead
CREATE INDEX idx_stories_tags_unified_source_gin ON stories 
  USING GIN ((tags_unified -> 'source'));
  
CREATE INDEX idx_stories_tags_type_name ON stories 
  USING GIN ((tags_unified -> 'type'), (tags_unified -> 'name'));

-- Ensure tag structure validation
ALTER TABLE stories ADD CONSTRAINT valid_tags_structure 
  CHECK (jsonb_typeof(tags_unified) = 'array');

-- Ensure valid tag types (regional only for now, but prepared for future)
ALTER TABLE stories ADD CONSTRAINT valid_tag_types
  CHECK (NOT EXISTS (
    SELECT 1 FROM jsonb_array_elements(tags_unified) AS tag
    WHERE tag->>'type' NOT IN ('regional', 'activity', 'emotion')
  ));

-- Ensure valid tag sources  
ALTER TABLE stories ADD CONSTRAINT valid_tag_sources
  CHECK (NOT EXISTS (
    SELECT 1 FROM jsonb_array_elements(tags_unified) AS tag
    WHERE tag->>'source' NOT IN ('gps', 'manual', 'journal', 'ai')
  ));

-- Migrate existing tags data to unified format (regional tags only for now)
UPDATE stories SET tags_unified = (
  CASE 
    WHEN tags IS NOT NULL AND array_length(tags, 1) > 0 THEN
      (
        SELECT jsonb_agg(
          jsonb_build_object(
            'name', tag_name,
            'type', 'regional',
            'source', 'manual',
            'created_at', COALESCE(updated_at, created_at)::text
          )
        )
        FROM unnest(tags) AS tag_name
      )
    ELSE '[]'::jsonb
  END
)
WHERE tags_unified = '[]'::jsonb;