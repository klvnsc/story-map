# Database Field Renaming Plan

## Problem Statement

The current database schema has misleading field names that cause confusion:

- `estimated_date_gps`: **Actually contains MANUAL user input** (most accurate)
- `estimated_date`: Contains collection-based default dates (less accurate fallback)

## Current Workaround

Since the Supabase instance is in read-only mode, we've implemented:

1. **Clear JSDoc comments** in TypeScript interfaces explaining field meanings
2. **Utility functions** with proper precedence logic (`getBestAvailableDate()`)
3. **Field aliases** for clearer code (`getUserAssignedDate()`, `getCollectionDefaultDate()`)

## Future Migration Plan

When database write access is available, execute this migration:

```sql
-- Phase 1: Add new columns with clear names
ALTER TABLE stories ADD COLUMN collection_default_date TIMESTAMP WITH TIME ZONE;
ALTER TABLE stories ADD COLUMN user_assigned_date TIMESTAMP WITH TIME ZONE;

-- Phase 2: Copy data
UPDATE stories SET collection_default_date = estimated_date;
UPDATE stories SET user_assigned_date = estimated_date_gps;

-- Phase 3: Verify integrity
-- (See full migration script in utils.ts comments)

-- Phase 4: Update application code
-- Phase 5: Drop old columns
ALTER TABLE stories DROP COLUMN estimated_date;
ALTER TABLE stories DROP COLUMN estimated_date_gps;
```

## Recommended Field Names

| Current (Misleading) | Proposed (Clear) | Description |
|---------------------|------------------|-------------|
| `estimated_date` | `collection_default_date` | Collection-based date estimate |
| `estimated_date_gps` | `user_assigned_date` | Manual user input (most accurate) |

## Current Implementation

Until migration is possible:

- **Use utility functions**: `getBestAvailableDate()` prioritizes `estimated_date_gps` over `estimated_date`
- **Follow JSDoc comments**: TypeScript interfaces clearly document field meanings
- **Trust the precedence logic**: Manual dates (`estimated_date_gps`) always take priority

## Impact Analysis

- **Trip Route Visualization**: Fixed to use correct date precedence
- **Type Safety**: Added comprehensive TypeScript interfaces
- **Code Clarity**: Utility functions provide semantic aliases
- **Future Migration**: Ready with comprehensive plan when write access available