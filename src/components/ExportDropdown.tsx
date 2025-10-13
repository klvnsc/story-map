'use client';

import { useState, useRef, useEffect } from 'react';

interface ExportDropdownProps {
  onExport: (format: 'csv' | 'kml') => void;
  className?: string;
}

export function ExportDropdown({ onExport, className = '' }: ExportDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleExport = (format: 'csv' | 'kml') => {
    onExport(format);
    setIsOpen(false);
  };

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      {/* Main Export Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors duration-200 flex items-center space-x-2"
      >
        <span>📤</span>
        <span>Export</span>
        <svg
          className={`w-4 h-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg ring-1 ring-black ring-opacity-5 z-50">
          <div className="py-1">
            <button
              onClick={() => handleExport('csv')}
              className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900 transition-colors"
            >
              <span className="mr-3">📄</span>
              <div className="text-left">
                <div className="font-medium">Download CSV</div>
                <div className="text-xs text-gray-500">Spreadsheet format</div>
              </div>
            </button>

            <button
              onClick={() => handleExport('kml')}
              className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900 transition-colors"
            >
              <span className="mr-3">🗺️</span>
              <div className="text-left">
                <div className="font-medium">Download KML</div>
                <div className="text-xs text-gray-500">Google Earth format</div>
              </div>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}