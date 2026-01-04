# AniList API 500 Error Fix - Summary

## Changes Made

### 1. Added `ensureStringArray` Helper Function
Created a defensive helper function in three files to ensure values are always valid string arrays:
- `src/lib/anilist/requests/anime.ts`
- `src/lib/anilist/requests/search.ts`
- `src/lib/anilist/requests/manga.ts`

```typescript
function ensureStringArray(value: any): string[] {
  if (!value) return []
  if (!Array.isArray(value)) return []
  return value.filter((item) => typeof item === "string")
}
```

### 2. Fixed `getHiddenGenres` Function
Updated the function in all three files to use defensive type checking:

**Before:**
```typescript
const userHidden = data.hiddenGenres || []
// ...
const validHidden = (finalHidden as any[]).filter((g) => allGenreNames.has(g))
```

**After:**
```typescript
const userHidden = ensureStringArray(data.hiddenGenres)
// ...
finalHidden = ensureStringArray(finalHidden)
const validHidden = finalHidden.filter((g) => typeof g === "string" && allGenreNames.has(g))
```

### 3. Enhanced Error Logging in `utils.ts`
Improved error logging for 500 status codes to include:
- The actual variables being sent
- Operation name
- Clear indication that this might be a malformed request

This will help diagnose if the issue persists or if new edge cases appear.

### 4. **CRITICAL FIX**: Removed Unsupported Filter Parameters from ID-based Queries
**Problem Discovered:**
AniList GraphQL API does **NOT** support `genre_not_in` and `tag_not_in` parameters when querying media by specific IDs. These filters only work with search queries.

**Queries Fixed:**
- `MULTIPLE_ANIME_QUERY` - Removed `genre_not_in` and `tag_not_in` parameters
- `MEDIA_BY_ID_QUERY` - Removed `genre_not_in` and `tag_not_in` parameters  
- `MEDIA_RELATIONS_QUERY` - Removed `genre_not_in` and `tag_not_in` parameters

**Functions Updated:**
- `getMultipleAnimeFromAniList()` - No longer passes genre/tag filters
- `getMediaByAniListId()` - No longer passes genre/tag filters

**Rationale:**
When you request media by specific IDs (e.g., `id_in: [123, 456, 789]`), you're asking for those exact items. The API doesn't support filtering them by genre/tag after the fact - this causes 500 "Bad request" errors.

Genre/tag filtering is only supported in:
- Search queries (`SEARCH_QUERY`)
- Paginated list queries (`PAGINATED_LIST_QUERY`)
- Season queries (`SEASON_MEDIA_QUERY`)
- Home page queries (`HOME_PAGE_QUERY`)

## Root Cause Analysis

The 500 "Bad request" errors were caused by **two issues**:

### Issue 1: Malformed Array Data
1. **Malformed data in IndexedDB**: `hiddenGenres` could be stored as non-array values
2. **Type coercion issues**: The code assumed `finalHidden` was always an array using unsafe `as any[]` cast
3. **Invalid API parameters**: AniList GraphQL API expects arrays for `genre_not_in` and `tag_not_in`, but was receiving non-array values or arrays with non-string elements

### Issue 2: Unsupported Query Parameters (MAIN ISSUE)
1. **Wrong API usage**: Sending `genre_not_in` and `tag_not_in` to ID-based queries
2. **API limitation**: AniList doesn't support filtering when requesting specific IDs
3. **500 errors**: API rejected these malformed queries with "Bad request" errors

## Testing Recommendations

1. **Clear IndexedDB** and test with fresh data
2. **Monitor browser console** for the new detailed 500 error logs
3. **Test different scenarios**:
   - First-time user (no saved data)
   - User with hidden genres configured
   - User with sensitive content unlocked
   - User with corrupted/legacy data
   - **Loading tracked media (should no longer cause 500 errors)**
   - **Viewing media details by ID (should no longer cause 500 errors)**

## Verification

### Success Indicators:
✅ No more 500 errors when loading tracked media  
✅ No more 500 errors when viewing anime/manga details  
✅ Genre/tag filtering still works in search and browse pages  
✅ Hidden genres are respected where supported  

### If you see new 500 errors:
They will now include detailed debugging info:
```
[500 Error] Possible malformed request - check variables
```

With details showing:
- `variables` - All parameters sent to the query
- `operationName` - The operation that failed

This will help identify any remaining edge cases that need to be addressed.

## Files Modified

### Queries (`src/lib/anilist/queries.ts`)
- ✅ `MULTIPLE_ANIME_QUERY` - Removed genre/tag parameters
- ✅ `MEDIA_BY_ID_QUERY` - Removed genre/tag parameters
- ✅ `MEDIA_RELATIONS_QUERY` - Removed genre/tag parameters

### Request Handlers (`src/lib/anilist/requests/anime.ts`)
- ✅ `getMultipleAnimeFromAniList()` - Updated to not send filters
- ✅ `getMediaByAniListId()` - Updated to not send filters
- ✅ `getHiddenGenres()` - Added defensive type checking
- ✅ Added `ensureStringArray()` helper

### Request Handlers (`src/lib/anilist/requests/search.ts`)
- ✅ `getHiddenGenres()` - Added defensive type checking
- ✅ Added `ensureStringArray()` helper

### Request Handlers (`src/lib/anilist/requests/manga.ts`)
- ✅ `getHiddenGenres()` - Added defensive type checking
- ✅ Added `ensureStringArray()` helper

### Error Logging (`src/lib/anilist/utils.ts`)
- ✅ Enhanced 500 error logging with variables and operation name

