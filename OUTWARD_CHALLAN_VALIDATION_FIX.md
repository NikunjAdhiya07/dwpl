# Outward Challan Validation Error - Fixed

## Error Message
```
OutwardChallan validation failed: 
items.0.annealingCount: Annealing count must be at least 1, 
items.1.annealingCount: Annealing count must be at least 1
```

## Root Cause

The `OutwardChallan` model had strict validation requiring:
- **Annealing Count**: minimum value of **1**
- **Draw Pass Count**: minimum value of **1**

However, in real-world scenarios:
- Some items don't require annealing (annealing count = 0)
- Some items don't require draw passes (draw pass count = 0)

The UI allows users to select **0** for these fields, but the database validation was rejecting it.

## The Fix

Changed the validation in `src/models/OutwardChallan.ts`:

### Before (Lines 16-27):
```typescript
annealingCount: {
  type: Number,
  required: [true, 'Annealing count is required'],
  min: [1, 'Annealing count must be at least 1'],  ❌
  max: [10, 'Annealing count cannot exceed 10'],
},
drawPassCount: {
  type: Number,
  required: [true, 'Draw pass count is required'],
  min: [1, 'Draw pass count must be at least 1'],  ❌
  max: [8, 'Draw pass count cannot exceed 8'],
},
```

### After (Fixed):
```typescript
annealingCount: {
  type: Number,
  required: [true, 'Annealing count is required'],
  min: [0, 'Annealing count cannot be negative'],  ✅
  max: [10, 'Annealing count cannot exceed 10'],
},
drawPassCount: {
  type: Number,
  required: [true, 'Draw pass count is required'],
  min: [0, 'Draw pass count cannot be negative'],  ✅
  max: [8, 'Draw pass count cannot exceed 8'],
},
```

## What Changed

- **Annealing Count**: `min: 1` → `min: 0`
- **Draw Pass Count**: `min: 1` → `min: 0`
- Error messages updated to reflect "cannot be negative" instead of "must be at least 1"

## Impact

### Before Fix:
- ❌ Could not create challan with 0 annealing count
- ❌ Could not create challan with 0 draw pass count
- ❌ Validation error prevented saving

### After Fix:
- ✅ Can create challan with 0 annealing count
- ✅ Can create challan with 0 draw pass count
- ✅ Still prevents negative values
- ✅ Still enforces maximum limits (10 for annealing, 8 for draw)

## Business Logic

This fix aligns with real manufacturing processes where:

1. **No Annealing Required**: Some materials or specifications don't need heat treatment
2. **No Drawing Required**: Some items are already at the correct size
3. **Flexible Processing**: Different items have different processing requirements

The validation now correctly allows:
- `annealingCount: 0` (no annealing)
- `drawPassCount: 0` (no drawing)
- But still prevents negative values

## Testing

### Test Case 1: Zero Annealing
- Annealing Count: **0**
- Draw Pass Count: **2**
- **Result**: ✅ Should save successfully

### Test Case 2: Zero Draw Pass
- Annealing Count: **3**
- Draw Pass Count: **0**
- **Result**: ✅ Should save successfully

### Test Case 3: Both Zero
- Annealing Count: **0**
- Draw Pass Count: **0**
- **Result**: ✅ Should save successfully

### Test Case 4: Negative Values (Should Fail)
- Annealing Count: **-1**
- **Result**: ❌ Should show error: "Annealing count cannot be negative"

## How to Test

1. Go to **Outward Challan** page
2. Click **Create Challan**
3. Select a party
4. Add an item
5. Set **Annealing Count** to **0**
6. Set **Draw Pass Count** to **0** (or any valid value)
7. Fill in other required fields
8. Click **Submit**
9. **Expected**: Challan should be created successfully! ✅

## Files Modified

- ✅ `src/models/OutwardChallan.ts` (Lines 19, 25)

## Status

✅ **FIXED** - Outward Challan can now be created with 0 annealing or draw pass counts.

---

**Note**: The dev server is running, so changes are live. Just try creating the challan again!
