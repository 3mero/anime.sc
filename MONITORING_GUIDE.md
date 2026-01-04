# Monitoring Guide for AniList API Fixes

## How to Verify the Fix is Working

### 1. Open Browser Developer Console
- Press `F12` or right-click and select "Inspect"
- Go to the "Console" tab

### 2. Watch for Error Messages

**Before the fix**, you would see:
```
[ERROR] AniList API request failed: 500 {"error":"Anilist API error: Internal Server Error","details":"{\"error\":{\"status\":500,\"messages\":[\"Bad request\"]}}"}
```

**After the fix**, if any 500 errors still occur, you'll see detailed information:
```
[500 Error] Possible malformed request - check variables
{
  status: 500,
  attempts: 1,
  errorBody: "...",
  variables: {
    genre_not_in: [...],  // Should be an array of strings
    tag_not_in: [...]      // Should be an array of strings
  },
  operationName: "..."
}
```

### 3. Check Network Tab (Optional)
- Go to "Network" tab in Developer Tools
- Filter by "Fetch/XHR"
- Look for requests to `/api/anilist/search`
- Check the request payload to see `genre_not_in` and `tag_not_in` values

### 4. Test Different Scenarios

#### Scenario A: Clear and Reset
1. Open Developer Tools → Application → Storage → IndexedDB
2. Delete the `animesync_local_list_data` database
3. Refresh the page
4. Navigate through the app → Should work without 500 errors

#### Scenario B: With Hidden Genres
1. Go to Settings
2. Configure some hidden genres
3. Navigate the app → Should work without 500 errors

#### Scenario C: Sensitive Content
1. Go to Settings
2. Toggle "Sensitive Content" settings
3. Navigate the app → Should work without 500 errors

### 5. What to Do if 500 Errors Persist

If you still see 500 errors after the fix:

1. **Check the error details** in console for the `variables` object
2. **Clear IndexedDB** completely and try again
3. **Report the issue** with:
   - Screenshot of the console error
   - The operation name that failed
   - The variables that were sent
   - Steps to reproduce

## Expected Behavior

✅ **No 500 "Bad request" errors**
✅ **All API requests complete successfully**  
✅ **Pages load without errors**
✅ **Search and filtering work correctly**

## Notes

- The fix ensures that `genre_not_in` and `tag_not_in` are always valid string arrays
- Even if IndexedDB data is corrupted, the app will safely default to SENSITIVE_GENRES
- Enhanced logging helps identify any edge cases we might have missed
