-- Story Map Database Schema
-- Run this in your Supabase SQL editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Collections table (61 highlight collections)
CREATE TABLE story_collections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  highlight_id TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  story_count INTEGER NOT NULL,
  estimated_date DATE,
  region TEXT,
  country_code TEXT,
  expedition_phase TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Individual stories table (4,438 stories)
CREATE TABLE stories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  collection_id UUID REFERENCES story_collections(id) ON DELETE CASCADE,
  story_index INTEGER NOT NULL,
  media_type TEXT CHECK (media_type IN ('image', 'video')) NOT NULL,
  cdn_url TEXT NOT NULL,
  duration INTEGER,
  
  -- Manual location input (required due to Instagram limitations)
  location_name TEXT,
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  location_confidence TEXT CHECK (location_confidence IN ('high', 'medium', 'low', 'estimated')),
  
  -- Content categorization
  content_type TEXT[],
  tags TEXT[],
  
  -- Date estimation
  estimated_date TIMESTAMP WITH TIME ZONE,
  time_added TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- GPS reference data (for location context)
CREATE TABLE gps_waypoints (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  recorded_at TIMESTAMP WITH TIME ZONE NOT NULL,
  latitude DECIMAL(10, 8) NOT NULL,
  longitude DECIMAL(11, 8) NOT NULL,
  altitude DECIMAL(8, 2),
  country_code TEXT,
  region TEXT,
  expedition_phase TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_stories_collection_id ON stories(collection_id);
CREATE INDEX idx_stories_media_type ON stories(media_type);
CREATE INDEX idx_stories_estimated_date ON stories(estimated_date);
CREATE INDEX idx_stories_location ON stories(latitude, longitude) WHERE latitude IS NOT NULL;
CREATE INDEX idx_gps_recorded_at ON gps_waypoints(recorded_at);
CREATE INDEX idx_gps_expedition_phase ON gps_waypoints(expedition_phase);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers to automatically update updated_at
CREATE TRIGGER update_story_collections_updated_at 
  BEFORE UPDATE ON story_collections 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_stories_updated_at 
  BEFORE UPDATE ON stories 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert expedition phases for reference
INSERT INTO story_collections (highlight_id, name, story_count, expedition_phase, estimated_date) VALUES
  ('phase_1', 'North China Phase', 0, 'north_china', '2024-07-01'),
  ('phase_2', 'Central Asia Phase', 0, 'central_asia', '2024-08-31'),
  ('phase_3', 'Middle East Phase', 0, 'middle_east', '2024-10-17'),
  ('phase_4', 'Africa Phase', 0, 'africa', '2025-01-06'),
  ('phase_5', 'Europe Phase', 0, 'europe', '2025-03-14'),
  ('phase_6', 'Scotland Finale', 0, 'scotland', '2025-06-24')
ON CONFLICT (highlight_id) DO NOTHING;