'use client';

import { useState } from 'react';
import { AddLocationModalProps, GooglePlaceResult } from '@/types/timeline-locations';

export default function AddLocationModal({
  isOpen,
  dayNumber,
  dayDate,
  existingLocations,
  onClose,
  onSave,
  onValidate
}: AddLocationModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    place_name: '',
    coordinates: { lat: 0, lng: 0 }
  });
  const [isValidating, setIsValidating] = useState(false);
  const [validationResult, setValidationResult] = useState<GooglePlaceResult | null>(null);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));

    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const handleCoordinatesChange = (field: 'lat' | 'lng', value: string) => {
    const numValue = parseFloat(value) || 0;
    setFormData(prev => ({
      ...prev,
      coordinates: {
        ...prev.coordinates,
        [field]: numValue
      }
    }));
  };

  const validateForm = (): boolean => {
    const newErrors: { [key: string]: string } = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Location name is required';
    }

    // Check if name already exists in this day
    const nameExists = existingLocations.some(loc =>
      loc.name.toLowerCase() === formData.name.trim().toLowerCase()
    );
    if (nameExists) {
      newErrors.name = 'A location with this name already exists in this day';
    }

    // If no place_name provided, coordinates are required
    if (!formData.place_name.trim() && (
      formData.coordinates.lat === 0 || formData.coordinates.lng === 0
    )) {
      newErrors.coordinates = 'Either provide a place name for validation or enter coordinates manually';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleValidatePlace = async () => {
    if (!formData.place_name.trim()) {
      setErrors(prev => ({ ...prev, place_name: 'Enter a place name to validate' }));
      return;
    }

    setIsValidating(true);
    setValidationResult(null);

    try {
      const result = await onValidate(formData.place_name.trim());

      if (result) {
        setValidationResult(result);
        // Update coordinates from validation
        setFormData(prev => ({
          ...prev,
          coordinates: result.coordinates
        }));
      } else {
        setErrors(prev => ({
          ...prev,
          place_name: 'Could not validate this place. Please enter coordinates manually.'
        }));
      }
    } catch (error) {
      console.error('Place validation error:', error);
      setErrors(prev => ({
        ...prev,
        place_name: 'Validation failed. Please try again or enter coordinates manually.'
      }));
    } finally {
      setIsValidating(false);
    }
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setIsSubmitting(true);

    try {
      await onSave({
        name: formData.name.trim(),
        place_name: formData.place_name.trim() || undefined,
        day_number: dayNumber,
        coordinates: formData.coordinates
      });

      // Reset form on success
      setFormData({ name: '', place_name: '', coordinates: { lat: 0, lng: 0 } });
      setValidationResult(null);
      setErrors({});
    } catch (error) {
      console.error('Save error:', error);
      setErrors(prev => ({
        ...prev,
        submit: error instanceof Error ? error.message : 'Failed to save location'
      }));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    // Reset form state
    setFormData({ name: '', place_name: '', coordinates: { lat: 0, lng: 0 } });
    setValidationResult(null);
    setErrors({});
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              Add Location to Day {dayNumber}
            </h2>
            <p className="text-sm text-gray-600 mt-1">{dayDate}</p>
          </div>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Form */}
        <div className="p-6 space-y-4">
          {/* Location Name */}
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
              Location Name *
            </label>
            <input
              type="text"
              id="name"
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                errors.name ? 'border-red-300 focus:ring-red-500' : 'border-gray-300'
              }`}
              placeholder="e.g., The Secret Garden Restaurant"
            />
            {errors.name && (
              <p className="text-sm text-red-600 mt-1">{errors.name}</p>
            )}
          </div>

          {/* Place Name for Validation */}
          <div>
            <label htmlFor="place_name" className="block text-sm font-medium text-gray-700 mb-1">
              Place Name (for Google Places validation)
            </label>
            <div className="flex space-x-2">
              <input
                type="text"
                id="place_name"
                value={formData.place_name}
                onChange={(e) => handleInputChange('place_name', e.target.value)}
                className={`flex-1 px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                  errors.place_name ? 'border-red-300 focus:ring-red-500' : 'border-gray-300'
                }`}
                placeholder="e.g., Secret Garden District 1"
              />
              <button
                onClick={handleValidatePlace}
                disabled={isValidating || !formData.place_name.trim()}
                className="px-4 py-2 bg-green-600 text-white text-sm rounded-md hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                {isValidating ? 'Validating...' : 'Validate'}
              </button>
            </div>
            {errors.place_name && (
              <p className="text-sm text-red-600 mt-1">{errors.place_name}</p>
            )}
            {validationResult && (
              <div className="mt-2 p-2 bg-green-50 rounded-md">
                <p className="text-sm text-green-800">
                  ✓ Validated: {validationResult.name}
                </p>
                <p className="text-xs text-green-600 mt-1">
                  {validationResult.formattedAddress}
                </p>
              </div>
            )}
          </div>

          {/* Manual Coordinates */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Coordinates {!formData.place_name.trim() && <span className="text-red-500">*</span>}
            </label>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Latitude</label>
                <input
                  type="number"
                  step="any"
                  value={formData.coordinates.lat || ''}
                  onChange={(e) => handleCoordinatesChange('lat', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="10.7753"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Longitude</label>
                <input
                  type="number"
                  step="any"
                  value={formData.coordinates.lng || ''}
                  onChange={(e) => handleCoordinatesChange('lng', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="106.7028"
                />
              </div>
            </div>
            {errors.coordinates && (
              <p className="text-sm text-red-600 mt-1">{errors.coordinates}</p>
            )}
            <p className="text-xs text-gray-500 mt-1">
              Leave as 0,0 if using place validation above
            </p>
          </div>

          {/* Current Locations Context */}
          {existingLocations.length > 0 && (
            <div className="bg-gray-50 rounded-md p-3">
              <p className="text-sm font-medium text-gray-700 mb-2">
                Current locations in Day {dayNumber}:
              </p>
              <div className="space-y-1">
                {existingLocations.map((loc, index) => (
                  <div key={index} className="flex items-center text-xs text-gray-600">
                    <span className="w-5 h-5 bg-gray-300 rounded-full flex items-center justify-center text-xs font-medium mr-2">
                      {loc.sequence}
                    </span>
                    {loc.name}
                  </div>
                ))}
              </div>
              <p className="text-xs text-gray-500 mt-2">
                New location will be added as #{existingLocations.length + 1}
              </p>
            </div>
          )}

          {/* Error Message */}
          {errors.submit && (
            <div className="bg-red-50 border border-red-200 rounded-md p-3">
              <p className="text-sm text-red-600">{errors.submit}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end space-x-3 p-6 border-t bg-gray-50">
          <button
            onClick={handleClose}
            className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {isSubmitting ? 'Adding...' : 'Add Location'}
          </button>
        </div>
      </div>
    </div>
  );
}