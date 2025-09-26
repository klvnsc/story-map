// Timeline Location Types
// Types for database-backed location management with Google Places API integration

export interface TimelineLocation {
  id: string;
  name: string;
  coordinates: {
    lat: number;
    lng: number;
  };
  place_id?: string;
  formatted_address?: string;
  place_name?: string;
  is_place_id_validated: boolean;
  // Timeline-specific fields (added for dynamic location creation)
  timeline_day_number?: number;    // Which day (1-6) for timeline locations
  timeline_sequence?: number;      // Position within day for ordering
  is_timeline_location: boolean;   // Flag to distinguish timeline vs general locations
  created_at: string;
  updated_at: string;
}

export interface CreateTimelineLocationRequest {
  name: string;
  coordinates: {
    lat: number;
    lng: number;
  };
  place_id?: string;
  formatted_address?: string;
  place_name?: string;
  is_place_id_validated?: boolean;
}

export interface UpdateTimelineLocationRequest {
  name?: string;
  coordinates?: {
    lat: number;
    lng: number;
  };
  place_id?: string;
  formatted_address?: string;
  place_name?: string;
  is_place_id_validated?: boolean;
}

export interface ValidatePlaceIdRequest {
  locationId: string;
  placeName: string;
}

export interface ValidatePlaceIdResponse {
  valid: boolean;
  placeData?: GooglePlaceResult;
  error?: string;
}

export interface GooglePlaceResult {
  placeId: string;
  name: string;
  formattedAddress: string;
  coordinates: {
    lat: number;
    lng: number;
  };
  types: string[];
  confidence: 'high' | 'medium' | 'low';
}

export interface LocationActionsMenuProps {
  location: TimelineLocation;
  onEdit: (location: TimelineLocation) => void;
  onValidate: (location: TimelineLocation) => void;
  onMarkAsArea: (location: TimelineLocation) => void;
  onDelete?: (location: TimelineLocation) => void;
}

export interface LocationEditModalProps {
  location: TimelineLocation | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updatedLocation: UpdateTimelineLocationRequest) => Promise<void>;
  onValidate: (placeName: string) => Promise<GooglePlaceResult | null>;
}

// API Response types
export interface LocationsApiResponse {
  success: boolean;
  data?: TimelineLocation[];
  error?: string;
}

export interface LocationApiResponse {
  success: boolean;
  data?: TimelineLocation;
  error?: string;
}

export interface ValidationApiResponse {
  success: boolean;
  data?: ValidatePlaceIdResponse;
  error?: string;
}

// Timeline-specific API types (for dynamic location creation)
export interface CreateTimelineLocationApiRequest {
  name: string;                    // Display name ("The Secret Garden Restaurant")
  place_name?: string;             // Google Places search name
  day_number: number;              // Which day (1-6)
  coordinates?: {                  // Optional if place_name provided
    lat: number;
    lng: number;
  };
}

export interface CreateTimelineLocationApiResponse {
  success: boolean;
  location?: TimelineLocation;
  error?: string;
}

export interface GetTimelineLocationsApiResponse {
  success: boolean;
  locations?: TimelineLocation[];
  error?: string;
}

// Timeline Modal Component Props (for add location modal)
export interface AddLocationModalProps {
  isOpen: boolean;
  dayNumber: number;
  dayDate: string;                    // "Friday, Sept 26" for context
  existingLocations: { name: string; sequence: number; }[]; // Current locations in day
  onClose: () => void;
  onSave: (newLocation: CreateTimelineLocationApiRequest) => Promise<void>;
  onValidate: (placeName: string) => Promise<GooglePlaceResult | null>;
}