import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

// Load environment variables
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

interface TrackData {
  track_number: number;
  start_date: string;
  end_date: string;
  title: string;
  classification: string;
  region: string;
  cities: string;
  distance_km: number;
  duration_hours: number;
  gps_point_count: number;
  expedition_phase: string;
  max_elevation?: number;
  max_speed?: number;
  avg_speed?: number;
}

// Expedition phase mapping based on track dates
function getExpeditionPhase(trackNumber: number): string {
  if (trackNumber <= 2) return 'hongkong_prep';
  if (trackNumber <= 8) return 'north_china';
  if (trackNumber <= 9) return 'central_asia';
  if (trackNumber <= 15) return 'middle_east';
  if (trackNumber <= 19) return 'africa';
  if (trackNumber <= 24) return 'europe';
  return 'scotland';
}

// Parse duration string like "16:16:47:45" or "1:06:00" to hours
function parseDurationToHours(duration: string): number {
  const parts = duration.split(':').map(p => parseFloat(p));
  if (parts.length === 4) {
    // Days:Hours:Minutes:Seconds
    return parts[0] * 24 + parts[1] + parts[2] / 60 + parts[3] / 3600;
  } else if (parts.length === 3) {
    // Hours:Minutes:Seconds
    return parts[0] + parts[1] / 60 + parts[2] / 3600;
  }
  return 0;
}

// Normalize date strings to proper YYYY-MM-DD format
function normalizeDate(dateStr: string): string {
  dateStr = dateStr.trim();
  
  // If already in full format, return as-is
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr) || /^[A-Z][a-z]+ \d{1,2}, \d{4}$/.test(dateStr)) {
    return dateStr;
  }
  
  // Handle partial dates like "July 21", "Aug 31", etc.
  const monthMappings: Record<string, string> = {
    'Jan': '01', 'January': '01',
    'Feb': '02', 'February': '02', 
    'Mar': '03', 'March': '03',
    'Apr': '04', 'April': '04',
    'May': '05',
    'Jun': '06', 'June': '06',
    'Jul': '07', 'July': '07',
    'Aug': '08', 'August': '08',
    'Sep': '09', 'September': '09',
    'Oct': '10', 'October': '10',
    'Nov': '11', 'November': '11',
    'Dec': '12', 'December': '12'
  };
  
  // Parse patterns like "July 21" or "Aug 31" and assign year based on expedition timeline
  for (const [monthName, monthNum] of Object.entries(monthMappings)) {
    if (dateStr.startsWith(monthName)) {
      const dayMatch = dateStr.match(new RegExp(`${monthName}\\s+(\\d{1,2})`));
      if (dayMatch) {
        const day = dayMatch[1].padStart(2, '0');
        // Assign year based on month (expedition timeline: June 2024 - July 2025)
        const year = ['Jan', 'January', 'Feb', 'February', 'Mar', 'March', 'Apr', 'April', 'May', 'Jun', 'June', 'Jul', 'July'].includes(monthName) ? '2025' : '2024';
        return `${year}-${monthNum}-${day}`;
      }
    }
  }
  
  // If can't parse, return original
  return dateStr;
}

async function parseTrackData(): Promise<TrackData[]> {
  console.log('📖 Parsing GPS track data from garmin.md...');
  
  const garminPath = path.join(process.cwd(), '../data-cy-gps/garmin.md');
  const content = fs.readFileSync(garminPath, 'utf-8');
  
  const tracks: TrackData[] = [];
  const lines = content.split('\n');
  
  let currentTrack: Partial<TrackData> | null = null;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim().replace(/\u00A0/g, ' '); // Replace non-breaking spaces
    
    // Track header pattern: **Track N** (Date Range) - **Title**
    let trackMatch = line.match(/\*\*Track (\d+)\*\* \(([^)]+)\) - \*\*(.+)\*\*/);
    if (!trackMatch) {
      trackMatch = line.match(/\*\*Track (\d+)\*\* \(([^)]+)\) - (.+)/);
    }
    
    if (trackMatch) {
      console.log(`Found track: ${trackMatch[1]} - ${trackMatch[3]}`);
      // Save previous track if exists
      if (currentTrack && currentTrack.track_number) {
        tracks.push(currentTrack as TrackData);
      }
      
      const trackNumber = parseInt(trackMatch[1]);
      const dateRange = trackMatch[2];
      // Clean up title - remove markdown and extra formatting
      const title = trackMatch[3].replace(/\*\*/g, '').replace(/^🎯\s*|^🌍\s*|^🏁\s*/, '').trim();
      
      // Parse date range and normalize format
      let startDate = '', endDate = '';
      if (dateRange.includes(' - ')) {
        [startDate, endDate] = dateRange.split(' - ');
      } else {
        startDate = endDate = dateRange;
      }
      
      // Normalize date format for partial dates
      startDate = normalizeDate(startDate.trim());
      endDate = normalizeDate(endDate.trim());
      
      currentTrack = {
        track_number: trackNumber,
        start_date: startDate.trim(),
        end_date: endDate.trim(),
        title: title,
        classification: 'moving', // default
        region: '',
        cities: '',
        distance_km: 0,
        duration_hours: 0,
        gps_point_count: 0,
        expedition_phase: getExpeditionPhase(trackNumber)
      };
      continue;
    }
    
    // Handle combined track format: "- **Track 16**: 4.14 km, 23 points | **Track 17**: 0.43 km, 18 points | **Track 18**: 0.6 km, 8 points"
    if (line.includes('**Track 16**:') || line.includes('**Track 17**:') || line.includes('**Track 18**:')) {
      console.log('Found combined tracks 16-18 format');
      
      // Parse the combined line
      const trackMatches = line.match(/\*\*Track (\d+)\*\*:\s*([\d.]+)\s*km,\s*(\d+)\s*points/g);
      if (trackMatches) {
        // Save current track if exists
        if (currentTrack && currentTrack.track_number) {
          tracks.push(currentTrack as TrackData);
          currentTrack = null;
        }
        
        // Process each track in the combined format
        for (const match of trackMatches) {
          const trackData = match.match(/\*\*Track (\d+)\*\*:\s*([\d.]+)\s*km,\s*(\d+)\s*points/);
          if (trackData) {
            const trackNumber = parseInt(trackData[1]);
            const distance = parseFloat(trackData[2]);
            const points = parseInt(trackData[3]);
            
            // Create track with shared metadata for tracks 16-18
            const track: TrackData = {
              track_number: trackNumber,
              start_date: '2025-01-01', // Jan 1-6, 2025
              end_date: '2025-01-06',
              title: `New Year Preparation ${trackNumber}`,
              classification: 'rest', // Extended rest/preparation
              region: 'Southern Italy',
              cities: 'Italy',
              distance_km: distance,
              duration_hours: 24, // ~3 days shared / 3 tracks = ~1 day each
              gps_point_count: points,
              expedition_phase: 'africa' // Phase 5: African/Mediterranean Epic
            };
            
            tracks.push(track);
            console.log(`✅ Processed Track ${trackNumber}: ${distance}km, ${points} points`);
          }
        }
      }
      continue;
    }
    
    if (!currentTrack) continue;
    
    // Parse data from combined lines like: "- **Duration**: 16:16:47:45 | **Distance**: 3,976.68 km | **GPS Points**: 890"
    if (line.includes('**Duration**:') && line.includes('|')) {
      // Duration pattern
      const durationMatch = line.match(/\*\*Duration\*\*:\s*([^\|]+)/);
      if (durationMatch) {
        currentTrack.duration_hours = parseDurationToHours(durationMatch[1].trim());
      }
      
      // Distance pattern  
      const distanceMatch = line.match(/\*\*Distance\*\*:\s*([\d,]+\.?\d*)\s*km/);
      if (distanceMatch) {
        currentTrack.distance_km = parseFloat(distanceMatch[1].replace(/,/g, ''));
      }
      
      // GPS Points pattern
      const pointsMatch = line.match(/\*\*GPS Points\*\*:\s*\*?\*?(\d+)/);
      if (pointsMatch) {
        currentTrack.gps_point_count = parseInt(pointsMatch[1]);
      }
      continue;
    }
    
    // Parse standalone patterns
    const durationMatch = line.match(/^-\s*\*\*Duration\*\*:\s*([^\|]+?)(?:\s*\(|$)/);
    if (durationMatch) {
      currentTrack.duration_hours = parseDurationToHours(durationMatch[1].trim());
      continue;
    }
    
    const distanceMatch = line.match(/\*\*Distance\*\*:\s*([\d,]+\.?\d*)\s*km/);
    if (distanceMatch) {
      currentTrack.distance_km = parseFloat(distanceMatch[1].replace(/,/g, ''));
      continue;
    }
    
    const pointsMatch = line.match(/\*\*GPS Points\*\*:\s*\*?\*?(\d+)/);
    if (pointsMatch) {
      currentTrack.gps_point_count = parseInt(pointsMatch[1]);
      continue;
    }
    
    // Max Elevation pattern: **Max Elevation**: 2,680.34 m
    const elevationMatch = line.match(/\*\*Max Elevation\*\*:\s*([\d,]+\.?\d*)\s*m/);
    if (elevationMatch) {
      currentTrack.max_elevation = parseFloat(elevationMatch[1].replace(/,/g, ''));
      continue;
    }
    
    // Max Speed pattern: **Max Speed**: 113.08 km/h
    const maxSpeedMatch = line.match(/\*\*Max Speed\*\*:\s*([\d,]+\.?\d*)\s*km\/h/);
    if (maxSpeedMatch) {
      currentTrack.max_speed = parseFloat(maxSpeedMatch[1].replace(/,/g, ''));
      continue;
    }
    
    // Avg Speed pattern: **Avg Speed**: 12.18 km/h
    const avgSpeedMatch = line.match(/\*\*Avg Speed\*\*:\s*([\d,]+\.?\d*)\s*km\/h/);
    if (avgSpeedMatch) {
      currentTrack.avg_speed = parseFloat(avgSpeedMatch[1].replace(/,/g, ''));
      continue;
    }
    
    // Route/Location pattern: **Route**: [coordinates] or **Location**: description
    const routeMatch = line.match(/\*\*(?:Route|Location)\*\*:\s*(.+)/);
    if (routeMatch) {
      const location = routeMatch[1];
      if (location.includes('[') && location.includes(']')) {
        // Extract coordinates but use title for region info
        currentTrack.region = currentTrack.title || 'GPS Coordinates Available';
      } else {
        currentTrack.region = location;
      }
      continue;
    }
    
    // Classification patterns
    if (line.includes('🚗') && line.includes('PREPARATION')) {
      currentTrack.classification = 'preparation';
    } else if (line.includes('🏔️') || line.includes('MOUNTAIN')) {
      currentTrack.classification = 'mountain';
    } else if (line.includes('🏕️') || line.includes('REST') || line.includes('CAMPING')) {
      currentTrack.classification = 'rest';
    } else if (line.includes('🚗') && (line.includes('FAST') || line.includes('HIGH-SPEED'))) {
      currentTrack.classification = 'fast_transit';
    } else if (line.includes('🌍') || line.includes('TRANSCONTINENTAL')) {
      currentTrack.classification = 'epic_journey';
    } else if (line.includes('🌊') || line.includes('CHANNEL') || line.includes('MEDITERRANEAN')) {
      currentTrack.classification = 'water_crossing';
    }
    
    // Extract cities/regions from various description lines
    if (line.includes('**Pattern**:') || line.includes('**Significance**:')) {
      const cityMatch = line.match(/([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*(?:\s*→\s*[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)*)/g);
      if (cityMatch && !currentTrack.cities) {
        currentTrack.cities = cityMatch.join(', ');
      }
    }
  }
  
  // Add the last track
  if (currentTrack && currentTrack.track_number) {
    tracks.push(currentTrack as TrackData);
  }
  
  console.log(`✅ Parsed ${tracks.length} tracks from garmin.md`);
  return tracks;
}

async function importTrackData() {
  console.log('🚀 Starting GPS track metadata import...');
  
  try {
    const tracks = await parseTrackData();
    
    console.log(`📊 Importing ${tracks.length} tracks to expedition_tracks table...`);
    
    let importedCount = 0;
    
    for (const track of tracks) {
      // Convert cities string to array format
      const citiesArray = track.cities ? track.cities.split(',').map(c => c.trim()) : [];
      
      const { error } = await supabase
        .from('expedition_tracks')
        .insert({
          track_number: track.track_number,
          start_date: track.start_date,
          end_date: track.end_date,
          title: track.title,
          classification: track.classification === 'moving' ? 'moving' : 'rest', // Only 'moving' or 'rest' allowed
          region: track.region || 'Unknown',
          cities: citiesArray,
          distance_km: track.distance_km,
          duration_hours: track.duration_hours,
          gps_point_count: track.gps_point_count,
          expedition_phase: track.expedition_phase,
          track_description: `Max Elevation: ${track.max_elevation || 'N/A'}m, Max Speed: ${track.max_speed || 'N/A'}km/h, Avg Speed: ${track.avg_speed || 'N/A'}km/h`
        });
      
      if (error) {
        console.error(`❌ Error importing track ${track.track_number}:`, error);
      } else {
        importedCount++;
        console.log(`✅ Imported Track ${track.track_number}: ${track.title} (${track.expedition_phase})`);
      }
    }
    
    console.log(`\n🎉 Track import completed! ${importedCount}/${tracks.length} tracks imported successfully.`);
    
    // Verify import
    const { data: verifyTracks, error: verifyError } = await supabase
      .from('expedition_tracks')
      .select('*')
      .order('track_number');
      
    if (verifyError) {
      console.error('❌ Error verifying import:', verifyError);
    } else {
      console.log(`\n📊 Verification: ${verifyTracks?.length} tracks in database`);
      console.log(`Total GPS points across all tracks: ${verifyTracks?.reduce((sum, t) => sum + (t.gps_point_count || 0), 0)}`);
      console.log(`Total distance: ${verifyTracks?.reduce((sum, t) => sum + (t.distance_km || 0), 0).toFixed(2)} km`);
    }
    
  } catch (error) {
    console.error('❌ Fatal error during track import:', error);
  }
}

async function main() {
  try {
    await importTrackData();
  } catch (error) {
    console.error('❌ Error during GPS track import:', error);
  }
}

if (require.main === module) {
  main();
}