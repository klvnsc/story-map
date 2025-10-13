// Timeline Location Types
// Types for Google Maps integration with timeline data

export interface TimelineLocation {
  id: string;
  name: string;
  coordinates: {
    lat: number;
    lng: number;
  };
  timeline_day_number?: number;
  timeline_sequence?: number;
  place_id?: string;
  formatted_address?: string;
  created_at: string;
  updated_at: string;
}