# CDN URL Renewal Requirements

## Overview

Instagram CDN URLs for story highlights expire over time, causing broken media links in the application. This document defines requirements for a 3-step CDN URL renewal system using the StorySaver.net API to refresh expired URLs on a per-collection basis.

## Problem Statement

- **Issue**: Instagram CDN URLs contain expiration tokens that invalidate over time
- **Impact**: Stories display broken media links when CDN URLs expire
- **Scope**: 4,438 stories across 61 collections need URL renewal capability
- **Current Data**: Collections stored as CSV files (`1.csv` through `61.csv`) with expired `cdn_url` fields

## Solution Architecture

### 3-Step Renewal Process

#### Step 1: Fetch Fresh Story Data from StorySaver API
- **Input**: Collection number (e.g., Wales = collection 1)
- **Process**: 
  1. Map collection number to Highlight ID from `ig-data.csv`
  2. Call StorySaver API with Highlight ID
  3. Save raw HTML response to `data/{collection}.html`
- **Output**: HTML file containing fresh story data

#### Step 2: Parse HTML to Extract CDN URLs
- **Input**: `data/{collection}.html` file
- **Process**:
  1. Parse HTML response to extract story metadata
  2. Extract fresh CDN URLs from video/image source tags
  3. Match story order with existing collection data
- **Output**: Updated CSV file `{collection}.csv` with fresh CDN URLs

#### Step 3: Update Database
- **Input**: Updated CSV file with fresh CDN URLs
- **Process**:
  1. Load CSV data for specified collection
  2. Match stories by collection_id and story_index
  3. Bulk update `cdn_url` field in stories table
- **Output**: Database updated with fresh CDN URLs for collection

## Technical Requirements

### Step 1 Requirements: API Integration

#### Collection-to-Highlight ID Mapping
```csv
Collection #, Collection Name, Highlight ID
1, "Wales 🏴󠁧󠁢󠁷󠁬󠁳󠁿", "18011241530716717:breakingcycles.life"
2, "England 🏴󠁧󠁢󠁥󠁮󠁧󠁿", "18068925452490325:breakingcycles.life"
3, "Scotland 🏴󠁧󠁢󠁳󠁣󠁴󠁿", "18077415214744071:breakingcycles.life"
...
```

#### StorySaver API Specification
- **Endpoint**: `https://www.storysaver.net/highlightProcess.php`
- **Method**: POST
- **Headers**:
  - `Content-Type: application/x-www-form-urlencoded`
  - `User-Agent: Mozilla/5.0`
- **Payload**: `sid={highlight_id}` (e.g., `sid=18068925452490325:breakingcycles.life`)
- **Response**: HTML containing story data with fresh CDN URLs

#### File Output Requirements
- **Location**: `data/{collection}.html` (e.g., `data/1.html`)
- **Content**: Raw HTML response from StorySaver API
- **Overwrite**: Replace existing HTML files for fresh data

### Step 2 Requirements: HTML Parsing

#### HTML Structure to Parse
```html
<li class="stylestory">
  <video controls>
    <source src="https://scontent-ams2-1.cdninstagram.com/o1/v/t2/f2/m78/..." type="video/mp4">
  </video>
  <div class="storytime">duration: 16 second</div>
  <div class="storytime">added about 1 month ago</div>
</li>
```

#### Extraction Requirements
- **CDN URLs**: Extract from `<source src="...">` tags
- **Duration**: Parse from `duration: X second` text
- **Story Index**: Maintain sequential order (1, 2, 3, ...)
- **Media Type**: Determine from source tag (video/image)

#### CSV Output Format
```csv
id,media_type,cdn_url,duration,time_added
1,video,https://scontent-ams2-1.cdninstagram.com/...,16,2025-08-03
2,video,https://scontent-ams4-1.cdninstagram.com/...,9,2025-08-03
...
```

#### Data Validation
- **URL Validation**: Verify CDN URLs are accessible (HTTP 200 response)
- **Count Verification**: Ensure parsed story count matches expected count from `ig-data.csv`
- **Format Consistency**: Maintain existing CSV structure and field types

### Step 3 Requirements: Database Updates

#### Database Schema
```sql
-- Target table: stories
-- Key fields to update: cdn_url
-- Matching criteria: collection_id + story_index
```

#### Update Process
1. **Collection Lookup**: Get collection UUID from collection number
2. **Story Matching**: Match CSV rows to database stories by `story_index`
3. **Bulk Update**: Use batch UPDATE statements for performance
4. **Validation**: Verify update count matches expected story count

#### Error Handling
- **Missing Stories**: Log stories that exist in CSV but not in database
- **URL Validation**: Skip updates for invalid/inaccessible URLs  
- **Rollback**: Maintain backup of old URLs for recovery
- **Transaction Safety**: Use database transactions for atomic updates

## Implementation Requirements

### Script Structure
```
scripts/
├── renew-cdn-urls.ts          # Main orchestration script
├── steps/
│   ├── step1-fetch-html.ts    # StorySaver API integration
│   ├── step2-parse-html.ts    # HTML parsing and CSV generation
│   └── step3-update-db.ts     # Database update operations
└── utils/
    ├── collection-mapping.ts   # Collection number to highlight ID mapping
    ├── html-parser.ts         # HTML parsing utilities
    └── db-operations.ts       # Database update utilities
```

### Command Line Interface
```bash
# Renew single collection
npm run renew-cdn-urls -- --collection 1

# Renew multiple collections
npm run renew-cdn-urls -- --collection 1,2,3

# Renew all collections
npm run renew-cdn-urls -- --all

# Dry run (no database updates)
npm run renew-cdn-urls -- --collection 1 --dry-run
```

### Configuration
- **Rate Limiting**: Delay between API calls (default: 1 second)
- **Batch Size**: Database update batch size (default: 100)
- **Retry Logic**: Retry failed API calls (max 3 attempts)
- **Validation**: Enable/disable URL accessibility checks

## Success Criteria

### Functional Requirements
- **✅ Step 1**: Successfully fetch HTML for any collection number (1-61)
- **✅ Step 2**: Parse HTML and generate valid CSV with fresh CDN URLs
- **✅ Step 3**: Update database with fresh URLs for specified collection

### Performance Requirements
- **API Calls**: Handle rate limiting (max 1 call per second)
- **Parsing Speed**: Process 100 stories in < 5 seconds
- **Database Updates**: Bulk update 100 stories in < 2 seconds

### Quality Requirements
- **URL Validity**: 100% of renewed URLs must be accessible
- **Data Integrity**: Zero data loss during renewal process
- **Error Recovery**: Failed renewals must not corrupt existing data

### Operational Requirements
- **Logging**: Comprehensive logging of all renewal operations
- **Progress Tracking**: Real-time progress reporting for long operations
- **Error Handling**: Graceful handling of API failures and network issues

## File Structure

### Input Files
```
data-story-collection/
├── ig-data.csv                # Collection metadata with Highlight IDs
├── 1.csv                      # Current story data (potentially expired URLs)
├── 2.csv
└── ...
```

### Output Files
```
data/
├── 1.html                     # Raw StorySaver API response
├── 2.html
└── ...

Updated CSV files (overwrite existing):
├── 1.csv                      # Fresh story data with renewed URLs
├── 2.csv
└── ...
```

### Log Files
```
logs/
├── cdn-renewal.log            # Main operation log
├── failed-renewals.log        # Failed renewal attempts
└── url-validation.log         # URL accessibility check results
```

## Dependencies

### Required Packages
- **HTTP Client**: For StorySaver API calls
- **HTML Parser**: For extracting data from HTML responses  
- **CSV Parser**: For reading/writing CSV files
- **Database Client**: Supabase client for database updates

### Environment Variables
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## Risk Mitigation

### API Risks
- **Rate Limiting**: Implement delays between API calls
- **Service Unavailability**: Retry logic with exponential backoff
- **Data Format Changes**: Robust HTML parsing with fallback strategies

### Data Risks
- **URL Expiration**: Validate URLs before database updates
- **Data Corruption**: Use database transactions and backup old URLs
- **Collection Mismatches**: Verify story counts before updates

### Operational Risks
- **Long Running Operations**: Progress tracking and resumption capability
- **Network Failures**: Retry logic and partial completion handling
- **Database Connectivity**: Connection pooling and error recovery