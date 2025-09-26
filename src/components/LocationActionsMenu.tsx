'use client';

import { useState, useRef, useEffect } from 'react';
import { LocationActionsMenuProps } from '@/types/timeline-locations';

export default function LocationActionsMenu({
  location,
  onEdit,
  onValidate,
  onMarkAsArea,
  onDelete
}: LocationActionsMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleMenuAction = (action: () => void) => {
    action();
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={menuRef}>
      {/* Three-dot button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-1 text-gray-400 hover:text-gray-600 focus:outline-none focus:text-gray-600 transition-colors"
        aria-label="Location actions"
      >
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
          <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
        </svg>
      </button>

      {/* Dropdown menu */}
      {isOpen && (
        <div className="absolute right-0 mt-1 w-48 bg-white border border-gray-200 rounded-md shadow-lg z-20">
          <div className="py-1">
            {/* Edit Place Details */}
            <button
              onClick={() => handleMenuAction(() => onEdit(location))}
              className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-gray-900 transition-colors"
            >
              <div className="flex items-center">
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                Edit Place Details
              </div>
            </button>

            {/* Validate Place ID */}
            <button
              onClick={() => handleMenuAction(() => onValidate(location))}
              className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-gray-900 transition-colors"
              disabled={location.is_place_id_validated && !!location.place_id}
            >
              <div className="flex items-center">
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {location.is_place_id_validated ? 'Re-validate Place ID' : 'Validate Place ID'}
              </div>
            </button>

            {/* Mark as Area (only show for unvalidated locations) */}
            {!location.is_place_id_validated && (
              <>
                <div className="border-t border-gray-100 my-1" />
                <button
                  onClick={() => handleMenuAction(() => onMarkAsArea(location))}
                  className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-gray-900 transition-colors"
                >
                  <div className="flex items-center">
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    Mark as Area (No Place ID)
                  </div>
                  <p className="text-xs text-gray-500 ml-6 mt-1">
                    For conceptual locations that don&apos;t have specific Place IDs
                  </p>
                </button>
              </>
            )}

            {/* Delete Location */}
            <div className="border-t border-gray-100 my-1" />
            <button
              onClick={() => handleMenuAction(() => onDelete && onDelete(location))}
              className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 hover:text-red-800 transition-colors"
            >
              <div className="flex items-center">
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                Delete Location
              </div>
            </button>

            {/* Show validation status */}
            <div className="border-t border-gray-100 my-1" />
            <div className="px-4 py-2 text-xs text-gray-500">
              <div className="flex items-center">
                <div className={`w-2 h-2 rounded-full mr-2 ${
                  location.is_place_id_validated
                    ? 'bg-green-500'
                    : 'border border-green-500 bg-white'
                }`} />
                Status: {location.is_place_id_validated ? 'Validated' : 'Unvalidated'}
              </div>
              {location.place_id && (
                <div className="mt-1 font-mono text-xs break-all">
                  ID: {location.place_id.substring(0, 20)}...
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}