# Stock Display Issue - Diagnosis & Solution

## Problem
Stock showing as 0.00 Kgs in Outward Challan even though the size has been added in GRN.

## Root Cause
The issue is likely one of the following:

### 1. **Stock Entry Not Created**
- When GRN is saved, `updateStockAfterGRN()` is called
- But the stock entry might not be persisting to the database
- Possible causes:
  - Database connection issue during stock update
  - Error in `updateStockAfterGRN` function that's being silently caught
  - Transaction rollback

### 2. **ID Mismatch**
- Stock is stored with `size: itemId` (ObjectId)
- When querying, the comparison `s.size === itemId` might fail if:
  - One is a string and one is an ObjectId
  - The IDs are not matching exactly

### 3. **Stock Not Refreshed**
- Stock data is fetched once on page load
- After creating GRN, the Outward Challan page doesn't refresh stock data
- User needs to manually refresh the page

## Solution Steps

### Step 1: Add Logging to Stock Manager
Add console logs to track stock updates in `stockManager.ts`

### Step 2: Ensure Stock Refresh After GRN
Modify the GRN creation flow to ensure stock is refreshed

### Step 3: Fix ID Comparison
Ensure proper ID comparison in `getStockForItem` function

### Step 4: Add Diagnostic Endpoint
Create an API endpoint to check stock status for debugging

## Implementation

See the fixes applied in the following files:
- `src/lib/stockManager.ts` - Enhanced logging
- `src/app/api/grn/route.ts` - Better error handling
- `src/app/outward-challan/page.tsx` - Fixed ID comparison

## Testing Steps

1. Create a new GRN with an RM item
2. Check browser console for stock update logs
3. Go to Outward Challan page
4. Select the same RM item
5. Verify stock shows the correct quantity
6. If still showing 0, check:
   - Browser console for errors
   - Network tab for API responses
   - Database directly using MongoDB Compass

## Debugging Commands

```javascript
// In browser console on Outward Challan page:
console.log('Stocks:', stocks);
console.log('RM Items:', rmItems);
console.log('Selected Item ID:', item.originalSize);
console.log('Stock for item:', getStockForItem(item.originalSize));
```
