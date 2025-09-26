# Migration Plan: Static Timeline Data to Database

## Problem
Currently Sharon's timeline data exists in two places:
- **Static Data**: Hardcoded in `/src/app/api/timeline-data/route.ts` (5-15 locations)
- **Database Data**: User-added locations in `timeline_locations` table (3 locations)

This hybrid approach causes:
- Drag-and-drop errors (trying to drag static locations)
- Data inconsistency
- Complex merging logic
- Only some locations are editable/deletable

## Solution
Move ALL timeline data to the database for consistent management.

## Migration Steps

### Step 1: Run Database Migration
```sql
-- Execute the migration script
\i database/migrate-static-timeline-to-db.sql
```

This will:
- Insert all of Sharon's static timeline data into `timeline_locations`
- Use sequence numbers 101+ to avoid conflicts
- Then resequence everything to be consecutive (1, 2, 3...)
- Provide verification queries

### Step 2: Update API Endpoint
Replace the current hybrid API with database-only version:

```bash
# Backup current file
cp src/app/api/timeline-data/route.ts src/app/api/timeline-data/route.ts.backup

# Replace with database-only version
cp src/app/api/timeline-data/route-database-only.ts src/app/api/timeline-data/route.ts
```

### Step 3: Test the Migration
1. **Verify Data**: Check that all locations appear correctly
2. **Test Drag-and-Drop**: ALL locations should now be draggable
3. **Test Delete**: ALL locations should be deletable (with confirmation)
4. **Test Add**: New locations should work as before

## Expected Results

### Before Migration
- **Day 1**: 5 static + 3 database = 8 total locations
- **Draggable**: Only 3 database locations
- **Deletable**: Only 3 database locations
- **Error**: "Location not found in this day" when dragging static locations

### After Migration
- **Day 1**: 8 database locations total
- **Draggable**: ALL 8 locations ✅
- **Deletable**: ALL 8 locations ✅
- **Error**: No more drag-and-drop errors ✅

## Architecture Benefits

### Clean Data Model
- **Single Source**: All timeline data in database
- **Consistent API**: All operations work on all locations
- **No Merging**: Eliminates complex static/database merging logic

### Enhanced Features
- **Full Drag-and-Drop**: Reorder any location within any day
- **Full CRUD**: Create, Read, Update, Delete for all locations
- **Backup/Restore**: Easy database backup of entire timeline
- **Version Control**: Track changes to all locations

### User Experience
- **Predictable**: All locations behave consistently
- **Flexible**: Can modify Sharon's original timeline if needed
- **Reliable**: No more "some locations work, some don't" confusion

## Rollback Plan
If issues arise, restore original hybrid system:

```bash
# Restore original API
cp src/app/api/timeline-data/route.ts.backup src/app/api/timeline-data/route.ts

# Remove migrated static data from database
DELETE FROM timeline_locations
WHERE is_timeline_location = true
  AND created_at > '2025-09-26';
```

## Files Modified
- `database/migrate-static-timeline-to-db.sql` - Migration script
- `src/app/api/timeline-data/route.ts` - Simplified database-only API
- `database/MIGRATION-PLAN.md` - This documentation

## Next Steps
After successful migration, the drag-and-drop system will work perfectly for ALL timeline locations, eliminating the current data consistency issues.