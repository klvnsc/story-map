import { TagWithMetadata, TagType, TagSource } from '@/types';

/**
 * Utility functions for the unified tag system
 */

/**
 * Create a new tag with metadata
 */
export function createTag(
  name: string,
  type: TagType,
  source: TagSource,
  confidence?: number,
  created_by?: string
): TagWithMetadata {
  return {
    name: name.trim(),
    type,
    source,
    confidence,
    created_at: new Date().toISOString(),
    created_by,
  };
}

/**
 * Get tags by type from unified tags array
 */
export function getTagsByType(
  tags: TagWithMetadata[],
  type: TagType
): TagWithMetadata[] {
  return tags.filter(tag => tag.type === type);
}

/**
 * Get tags by source from unified tags array
 */
export function getTagsBySource(
  tags: TagWithMetadata[],
  source: TagSource
): TagWithMetadata[] {
  return tags.filter(tag => tag.source === source);
}

/**
 * Get regional tags (convenience function)
 */
export function getRegionalTags(tags: TagWithMetadata[]): TagWithMetadata[] {
  return getTagsByType(tags, 'regional');
}

/**
 * Get activity tags (convenience function)
 */
export function getActivityTags(tags: TagWithMetadata[]): TagWithMetadata[] {
  return getTagsByType(tags, 'activity');
}

/**
 * Get emotion tags (convenience function)
 */
export function getEmotionTags(tags: TagWithMetadata[]): TagWithMetadata[] {
  return getTagsByType(tags, 'emotion');
}

/**
 * Add a tag to the tags array (avoiding duplicates)
 */
export function addTag(
  tags: TagWithMetadata[],
  newTag: TagWithMetadata
): TagWithMetadata[] {
  // Check for existing tag with same name and type
  const exists = tags.some(
    tag => tag.name === newTag.name && tag.type === newTag.type
  );
  
  if (exists) {
    return tags;
  }
  
  return [...tags, newTag];
}

/**
 * Remove a tag from the tags array
 */
export function removeTag(
  tags: TagWithMetadata[],
  tagToRemove: { name: string; type: TagType }
): TagWithMetadata[] {
  return tags.filter(
    tag => !(tag.name === tagToRemove.name && tag.type === tagToRemove.type)
  );
}

/**
 * Update a tag in the tags array
 */
export function updateTag(
  tags: TagWithMetadata[],
  oldTag: { name: string; type: TagType },
  newTag: TagWithMetadata
): TagWithMetadata[] {
  return tags.map(tag => {
    if (tag.name === oldTag.name && tag.type === oldTag.type) {
      return newTag;
    }
    return tag;
  });
}

/**
 * Convert legacy tags array to unified format (for backward compatibility)
 */
export function legacyTagsToUnified(
  legacyTags: string[],
  type: TagType = 'regional',
  source: TagSource = 'manual'
): TagWithMetadata[] {
  return legacyTags.map(tagName => createTag(tagName, type, source));
}

/**
 * Convert unified tags to legacy format (for backward compatibility)
 */
export function unifiedTagsToLegacy(
  unifiedTags: TagWithMetadata[],
  type?: TagType
): string[] {
  const filteredTags = type 
    ? unifiedTags.filter(tag => tag.type === type)
    : unifiedTags;
  
  return filteredTags.map(tag => tag.name);
}

/**
 * Get tag style classes based on type
 */
export function getTagStyles(type: TagType): string {
  const baseClasses = "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border";
  
  const typeStyles = {
    regional: "bg-blue-100 text-blue-800 border-blue-200",
    activity: "bg-green-100 text-green-800 border-green-200", 
    emotion: "bg-orange-100 text-orange-800 border-orange-200"
  };
  
  return `${baseClasses} ${typeStyles[type]}`;
}

/**
 * Get source icon for display
 */
export function getSourceIcon(source: TagSource): string {
  const sourceIcons = {
    gps: "📍",
    manual: "✏️", 
    journal: "📔",
    ai: "🤖"
  };
  
  return sourceIcons[source];
}

/**
 * Predefined regional tags from expedition route
 */
export const REGIONAL_TAG_OPTIONS = [
  'Wales',
  'England', 
  'Scotland',
  'UK',
  'Germany',
  'Spain',
  'France',
  'Italy',
  'Morocco',
  'Greece',
  'Bulgaria',
  'Turkey',
  'Georgia',
  'Armenia',
  'Kazakhstan',
  'Uzbekistan',
  'Kyrgyzstan',
  'Tajikistan',
  'Russia',
  'Europe',
  'Central Asia',
  'Middle East',
  'Caucasus',
  'Mediterranean'
];