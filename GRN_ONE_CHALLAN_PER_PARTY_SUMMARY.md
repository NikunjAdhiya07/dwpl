# GRN One Challan Per Party - Implementation Summary

## Overview
Implemented a unique constraint to ensure that each party can have only one GRN with the same challan number. This prevents duplicate entries and ensures data integrity.

## Changes Made

### 1. **Database Model** (`src/models/GRN.ts`)
- ✅ Added compound unique index: `{ sendingParty: 1, partyChallanNumber: 1 }`
- ✅ This ensures that the combination of party + challan number is unique
- ✅ MongoDB will automatically reject duplicate entries

### 2. **GRN API Route** (`src/app/api/grn/route.ts`)
- ✅ Added pre-validation check before creating GRN
- ✅ Checks if challan number already exists for the selected party
- ✅ Returns user-friendly error message if duplicate found
- ✅ Added MongoDB duplicate key error handler (error code 11000)
- ✅ Provides clear error message explaining the constraint

### 3. **GRN Page UI** (`src/app/grn/page.tsx`)
- ✅ Added informational note explaining the one-challan-per-party rule
- ✅ Clarifies that multiple items can be added to a single GRN
- ✅ Helps users understand the constraint before submission

## How It Works

### **Constraint Logic:**
```
Unique Key = sendingParty + partyChallanNumber

Examples:
✅ Party A + Challan CH-001 → Allowed (first entry)
❌ Party A + Challan CH-001 → Rejected (duplicate)
✅ Party A + Challan CH-002 → Allowed (different challan)
✅ Party B + Challan CH-001 → Allowed (different party)
```

### **Database Index:**
```javascript
{
  sendingParty: ObjectId("party1"),
  partyChallanNumber: "CH-001"
} → Unique combination
```

## User Experience

### **Creating a GRN:**

1. **Select Party:** Choose sending party
2. **Enter Challan Number:** Enter party's challan number
3. **Add Items:** Add multiple RM items with different sizes
4. **Submit:** System validates uniqueness

### **If Duplicate Detected:**

**Error Message:**
```
Challan number "CH-001" already exists for this party. 
Each party can have only one challan with the same number.
```

**User Action:**
- Check if the challan was already entered
- Use a different challan number
- Or add items to the existing GRN (if editing is enabled)

### **Info Box Display:**
```
Note: Each party can have only one GRN with the same challan number.
You can add multiple items (different sizes) to this single GRN.
```

## Benefits

### 1. **Data Integrity**
- Prevents accidental duplicate entries
- Ensures one-to-one mapping: Party + Challan → GRN
- Maintains accurate records

### 2. **Business Logic Enforcement**
- Reflects real-world scenario: one physical challan = one GRN
- Multiple items from same challan grouped together
- Easier tracking and auditing

### 3. **Better Organization**
- All items from same delivery in one GRN
- Single challan number reference
- Simplified reporting

### 4. **Size Tracking**
- Each item in the GRN has its own size (rmSize)
- Multiple sizes can be included in one GRN
- Complete visibility of all items received

## Example Scenarios

### ✅ **Valid Scenario:**
```
GRN 1:
- Party: ABC Suppliers
- Challan: CH-2026-001
- Items:
  - 8mm MS (100 units)
  - 10mm MS (50 units)
  - 12mm SS (25 units)

GRN 2:
- Party: ABC Suppliers
- Challan: CH-2026-002  ← Different challan
- Items:
  - 6mm MS (200 units)
```

### ❌ **Invalid Scenario:**
```
GRN 1:
- Party: ABC Suppliers
- Challan: CH-2026-001
- Items: [8mm MS]

GRN 2 (REJECTED):
- Party: ABC Suppliers
- Challan: CH-2026-001  ← Same party + same challan
- Items: [10mm MS]

Error: Challan number already exists for this party
```

### ✅ **Correct Approach:**
```
GRN 1:
- Party: ABC Suppliers
- Challan: CH-2026-001
- Items:
  - 8mm MS (100 units)
  - 10mm MS (50 units)  ← Add all items to same GRN
```

## Technical Implementation

### **Validation Flow:**

```
User Submits GRN
    ↓
API Receives Request
    ↓
Check: Does (Party + Challan) exist?
    ↓
    ├─ Yes → Return Error
    │         "Challan already exists for this party"
    │
    └─ No → Continue
           ↓
       Validate Items
           ↓
       Create GRN
           ↓
       Update Stock
           ↓
       Return Success
```

### **Error Handling:**

1. **Pre-validation Check:**
   - Queries database before attempting to create
   - Returns user-friendly error message
   - Prevents unnecessary processing

2. **MongoDB Unique Constraint:**
   - Catches duplicates at database level
   - Handles race conditions
   - Returns error code 11000

3. **Custom Error Messages:**
   - Clear explanation of the constraint
   - Helps users understand what went wrong
   - Suggests corrective action

## Migration Notes

### **For Existing Data:**

If you have existing GRNs that violate this constraint:

```javascript
// Find duplicates
db.grns.aggregate([
  {
    $group: {
      _id: { 
        sendingParty: "$sendingParty", 
        partyChallanNumber: "$partyChallanNumber" 
      },
      count: { $sum: 1 },
      docs: { $push: "$$ROOT" }
    }
  },
  { $match: { count: { $gt: 1 } } }
]);

// Manually review and resolve duplicates
// Options:
// 1. Merge items into one GRN
// 2. Change challan numbers to make them unique
// 3. Delete duplicate entries
```

## Testing Checklist

- [ ] Create GRN with unique challan - verify success
- [ ] Try to create duplicate (same party + challan) - verify error
- [ ] Verify error message is clear and helpful
- [ ] Create GRN with same challan but different party - verify success
- [ ] Create GRN with different challan but same party - verify success
- [ ] Add multiple items to single GRN - verify all sizes tracked
- [ ] Verify info box displays on form
- [ ] Test MongoDB unique constraint (direct database insert)

## Files Modified

1. `src/models/GRN.ts` - Added unique compound index
2. `src/app/api/grn/route.ts` - Added duplicate validation and error handling
3. `src/app/grn/page.tsx` - Added informational note

## Total Changes
- **3 files modified**
- **~30 lines added** (validation and error handling)
- **New constraint:** One challan per party

---

**Status:** ✅ **Complete**  
**Date:** 2026-01-01  
**Developer:** Antigravity AI Assistant

## Summary

The GRN system now enforces a one-challan-per-party rule through database constraints and API validation. This ensures data integrity, prevents duplicates, and reflects real-world business logic where one physical challan corresponds to one GRN entry. Multiple items with different sizes can still be added to a single GRN, providing flexibility while maintaining data consistency.

## Key Points

✅ **One Challan Per Party** - Unique constraint enforced  
✅ **Multiple Items Supported** - Different sizes in same GRN  
✅ **Clear Error Messages** - User-friendly validation feedback  
✅ **Database-Level Protection** - MongoDB unique index  
✅ **Informational UI** - Users understand the rule before submission
