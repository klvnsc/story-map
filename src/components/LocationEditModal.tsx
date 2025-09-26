'use client';

import { useState, useEffect } from 'react';
import { LocationEditModalProps, GooglePlaceResult } from '@/types/timeline-locations';

export default function LocationEditModal({
  location,
  isOpen,
  onClose,
  onSave,
  onValidate
}: LocationEditModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    place_name: ''
  });
  const [isValidating, setIsValidating] = useState(false);
  const [validationResult, setValidationResult] = useState<GooglePlaceResult | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Update form data when location changes
  useEffect(() => {
    if (location) {
      setFormData({
        name: location.name || '',
        place_name: location.place_name || ''
      });
      setValidationResult(null);
      setValidationError(null);
    }
  }, [location]);

  if (!isOpen || !location) {
    return null;
  }

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear validation results when place_name changes
    if (field === 'place_name') {
      setValidationResult(null);
      setValidationError(null);
    }
  };

  const handleValidate = async () => {
    if (!formData.place_name.trim()) {
      setValidationError('Please enter a place name to validate');
      return;
    }

    setIsValidating(true);
    setValidationError(null);
    setValidationResult(null);

    try {
      const result = await onValidate(formData.place_name.trim());
      if (result) {
        setValidationResult(result);
        setValidationError(null);
      } else {
        setValidationError('No matching place found in Google Places API');
        setValidationResult(null);
      }
    } catch (error) {
      console.error('Validation error:', error);
      setValidationError('Validation failed - please try again');
      setValidationResult(null);
    } finally {
      setIsValidating(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const updateData = {
        name: formData.name.trim(),
        place_name: formData.place_name.trim() || undefined,
        // Include validation results if available
        ...(validationResult && {
          place_id: validationResult.placeId,
          formatted_address: validationResult.formattedAddress,
          coordinates: validationResult.coordinates,
          is_place_id_validated: true
        })
      };

      await onSave(updateData);
      onClose();
    } catch (error) {
      console.error('Save error:', error);
      // Error handling could be improved with user feedback
    } finally {
      setIsSaving(false);
    }
  };

  const handleClose = () => {
    if (!isSaving && !isValidating) {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-gray-900">Edit Location</h2>
          <button
            onClick={handleClose}
            disabled={isSaving || isValidating}
            className="text-gray-400 hover:text-gray-600 disabled:opacity-50"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Form Fields */}
        <div className="space-y-4">
          {/* Display Name */}
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
              Display Name
            </label>
            <input
              type="text"
              id="name"
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              placeholder="Name shown in timeline"
            />
            <p className="text-xs text-gray-500 mt-1">This is what appears in the timeline</p>
          </div>

          {/* Place Name for Google Places Search */}
          <div>
            <label htmlFor="place_name" className="block text-sm font-medium text-gray-700 mb-1">
              Place Name (for validation)
            </label>
            <div className="flex space-x-2">
              <input
                type="text"
                id="place_name"
                value={formData.place_name}
                onChange={(e) => handleInputChange('place_name', e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                placeholder="Name to search in Google Places"
              />
              <button
                onClick={handleValidate}
                disabled={isValidating || !formData.place_name.trim()}
                className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
              >
                {isValidating ? 'Validating...' : 'Validate'}
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-1">Search term for Google Places API</p>
          </div>

          {/* Validation Results */}
          {validationResult && (
            <div className="bg-green-50 border border-green-200 rounded-md p-3">
              <div className="flex items-center">
                <svg className="w-5 h-5 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span className="text-sm font-medium text-green-800">Place Found!</span>
              </div>
              <div className="mt-2 text-sm text-green-700">
                <p><strong>Name:</strong> {validationResult.name}</p>
                <p><strong>Address:</strong> {validationResult.formattedAddress}</p>
                <p><strong>Coordinates:</strong> {validationResult.coordinates.lat.toFixed(6)}, {validationResult.coordinates.lng.toFixed(6)}</p>
                <p><strong>Confidence:</strong> {validationResult.confidence}</p>
              </div>
            </div>
          )}

          {/* Validation Error */}
          {validationError && (
            <div className="bg-red-50 border border-red-200 rounded-md p-3">
              <div className="flex items-center">
                <svg className="w-5 h-5 text-red-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-sm font-medium text-red-800">Validation Failed</span>
              </div>
              <p className="mt-1 text-sm text-red-700">{validationError}</p>
            </div>
          )}

          {/* Current Location Status */}
          <div className="bg-gray-50 border border-gray-200 rounded-md p-3">
            <div className="flex items-center">
              <div className={`w-4 h-4 rounded-full mr-2 ${
                location.is_place_id_validated
                  ? 'bg-green-500'
                  : 'border-2 border-green-500 bg-white'
              }`} />
              <span className="text-sm font-medium text-gray-700">
                Current Status: {location.is_place_id_validated ? 'Validated' : 'Unvalidated'}
              </span>
            </div>
            {location.place_id && (
              <p className="text-xs text-gray-500 mt-1">Place ID: {location.place_id}</p>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end space-x-3 mt-6">
          <button
            onClick={handleClose}
            disabled={isSaving || isValidating}
            className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving || isValidating || !formData.name.trim()}
            className="px-4 py-2 bg-indigo-500 text-white rounded-md hover:bg-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSaving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}