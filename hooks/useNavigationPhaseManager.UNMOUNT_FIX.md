# Navigation Phase Manager Unmount Fix

## Problem
The navigation phase manager was throwing "Component is unmounted, cannot transition" errors when:
1. The component cleanup was called prematurely during re-renders
2. Transitions were attempted after the component was unmounted
3. Race conditions occurred between cleanup and transition attempts

## Root Cause
The original implementation had several issues:
1. **Premature cleanup**: The cleanup function was being called during re-renders due to dependency arrays in useEffect
2. **Incorrect unmount detection**: The cleanup function was setting `isMountedRef.current = false`, which prevented reinitializing even when the component was still mounted
3. **No recovery mechanism**: Once cleaned up, the phase manager couldn't reinitialize itself

## Solution

### 1. Fixed Cleanup Logic
```typescript
// Before: Cleanup was called on every dependency change
useEffect(() => {
  return () => {
    cleanupGeofencing();
    cleanupPhaseManager();
  };
}, [cleanupGeofencing, cleanupPhaseManager]); // Dependencies caused premature cleanup

// After: Cleanup only on unmount
useEffect(() => {
  return () => {
    cleanupGeofencing();
    cleanupPhaseManager();
  };
}, []); // Empty dependencies - only run on unmount
```

### 2. Separated Cleanup from Unmount Detection
```typescript
// Before: Cleanup marked component as unmounted
const cleanup = useCallback((): void => {
  isCleanedUpRef.current = true;
  isMountedRef.current = false; // ❌ This was wrong
  // ...
}, []);

// After: Cleanup only cleans resources, doesn't affect mount state
const cleanup = useCallback((): void => {
  isCleanedUpRef.current = true;
  // isMountedRef is only managed by mount/unmount useEffect
  // ...
}, []);
```

### 3. Added Reinitialize Logic
```typescript
// Check if component is still mounted before proceeding
if (!isMountedRef.current) {
  return { success: false, error: 'Component is unmounted' };
}

// If cleaned up but still mounted, reinitialize
if (isCleanedUpRef.current && isMountedRef.current) {
  console.log('🔄 Reinitializing phase manager...');
  isCleanedUpRef.current = false;
  // Reinitialize executor...
}
```

### 4. Improved Error Handling
- Graceful handling of transitions after unmount
- Clear error messages for different failure scenarios
- No more crashes, just failed transition results

## Testing
Added comprehensive tests in `useNavigationPhaseManager.unmount.test.ts` to verify:
- Transitions after cleanup are handled gracefully
- Transitions after unmount return proper error results
- Reinitializing works when component is still mounted
- No crashes or unhandled errors

## Result
- ✅ No more "Component is unmounted" crashes
- ✅ Phase manager can recover from premature cleanup
- ✅ Proper error handling for all edge cases
- ✅ Maintains all existing functionality
- ✅ All tests pass