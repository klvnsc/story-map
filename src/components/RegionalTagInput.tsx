'use client';

import { useState } from 'react';
import { TagWithMetadata } from '@/types';
import { 
  createTag, 
  getRegionalTags, 
  addTag, 
  removeTag, 
  getSourceIcon,
  REGIONAL_TAG_OPTIONS 
} from '@/lib/tags';

interface RegionalTagInputProps {
  tags: TagWithMetadata[];
  onChange: (tags: TagWithMetadata[]) => void;
  disabled?: boolean;
}

export default function RegionalTagInput({ 
  tags, 
  onChange, 
  disabled = false 
}: RegionalTagInputProps) {
  const [inputValue, setInputValue] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  
  const regionalTags = getRegionalTags(tags);
  const existingTagNames = regionalTags.map(tag => tag.name);
  
  // Filter options based on input and exclude existing tags
  const filteredOptions = REGIONAL_TAG_OPTIONS.filter(option =>
    option.toLowerCase().includes(inputValue.toLowerCase()) &&
    !existingTagNames.includes(option)
  );

  const handleAddTag = (tagName: string) => {
    if (!tagName.trim() || existingTagNames.includes(tagName)) {
      return;
    }
    
    const newTag = createTag(tagName, 'regional', 'manual');
    const updatedTags = addTag(tags, newTag);
    onChange(updatedTags);
    setInputValue('');
    setShowDropdown(false);
  };

  const handleRemoveTag = (tagToRemove: TagWithMetadata) => {
    const updatedTags = removeTag(tags, { 
      name: tagToRemove.name, 
      type: tagToRemove.type 
    });
    onChange(updatedTags);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && inputValue.trim()) {
      e.preventDefault();
      handleAddTag(inputValue.trim());
    } else if (e.key === 'Escape') {
      setShowDropdown(false);
      setInputValue('');
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <label className="text-sm font-medium text-gray-700">
          📍 Regional Tags
        </label>
        <span className="text-xs text-gray-500">
          Geographic location context • Click × to remove unwanted tags
        </span>
      </div>
      
      {/* Display existing regional tags */}
      {regionalTags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {regionalTags.map((tag, index) => {
            // Enhanced styling based on source
            const baseClasses = "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border";
            const sourceSpecificStyles = tag.source === 'gps' 
              ? "bg-blue-50 text-blue-700 border-blue-300 shadow-sm" // Slightly different for GPS
              : "bg-blue-100 text-blue-800 border-blue-200"; // Standard for manual
            
            return (
              <div
                key={`${tag.name}-${tag.source}-${index}`}
                className={`${baseClasses} ${sourceSpecificStyles} flex items-center gap-1`}
              >
                <span className="text-xs opacity-60">
                  {getSourceIcon(tag.source)}
                </span>
                <span>{tag.name}</span>
                {!disabled && (tag.source === 'manual' || tag.source === 'gps') && (
                  <button
                    onClick={() => handleRemoveTag(tag)}
                    className="ml-1 text-blue-600 hover:text-red-600 text-sm font-bold transition-colors"
                    title={`Remove ${tag.source === 'gps' ? 'GPS-suggested' : 'manually added'} tag`}
                  >
                    ×
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
      
      {/* Input field */}
      {!disabled && (
        <div className="relative">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => {
              setInputValue(e.target.value);
              setShowDropdown(true);
            }}
            onKeyDown={handleKeyDown}
            onFocus={() => setShowDropdown(true)}
            placeholder="Add regional tag (e.g., Wales, Spain, Central Asia)"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
          />
          
          {/* Dropdown with suggestions */}
          {showDropdown && filteredOptions.length > 0 && (
            <div className="absolute top-full left-0 right-0 z-10 mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto">
              {filteredOptions.map((option) => (
                <button
                  key={option}
                  onClick={() => handleAddTag(option)}
                  className="w-full px-3 py-2 text-left text-sm hover:bg-blue-50 focus:bg-blue-50 focus:outline-none border-b border-gray-100 last:border-b-0"
                >
                  📍 {option}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
      
      {/* Click outside to close dropdown */}
      {showDropdown && (
        <div
          className="fixed inset-0 z-5"
          onClick={() => setShowDropdown(false)}
        />
      )}
    </div>
  );
}