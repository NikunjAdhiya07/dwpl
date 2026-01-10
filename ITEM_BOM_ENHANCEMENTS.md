# Item Master & BOM Enhancements Summary

## Date: 2026-01-08

## Overview
Implemented three key enhancements to the Item Master and BOM modules to improve data consistency and user experience.

---

## Changes Implemented

### 1. **Auto-Generated Serial Item Codes (A0001 Format)**

**File Modified:** `src/models/ItemMaster.ts`

**Change Description:**
- Replaced the complex timestamp-based item code generation with a simple, sequential serial format
- Item codes now follow the pattern: **A0001, A0002, A0003**, etc.
- Auto-increments based on the last created item
- Cleaner and more professional item identification

**Technical Details:**
- Modified the `pre('save')` hook to be async
- Queries the database for the last item created
- Extracts the numeric portion and increments it
- Pads the number to 4 digits with leading zeros

**Example:**
```
Before: RM-8mm-MS-L5X2K9P
After:  A0001
```

---

### 2. **HSN Code Dropdown in Item Master**

**File Modified:** `src/app/masters/item/page.tsx`

**Change Description:**
- Replaced the HSN Code text input field with a dropdown/select element
- Dropdown is populated from the GST Master table
- Only shows active HSN codes
- Ensures consistency between Item Master and GST Master

**Features Added:**
- State management for HSN codes: `const [hsnCodes, setHsnCodes] = useState<string[]>([]);`
- New function `fetchHSNCodes()` to retrieve HSN codes from `/api/gst-master`
- Filters only active GST records
- Helper text guides users to add new HSN codes in GST Master if needed

**User Experience:**
- Users can only select from predefined HSN codes
- Prevents typos and ensures data consistency
- Easier to manage GST rates centrally

---

### 3. **BOM Dropdowns for RM and FG Selection**

**File Modified:** `src/app/masters/bom/page.tsx`

**Change Description:**
- Added dropdowns for selecting Raw Material (RM) and Finished Goods (FG) items
- Dropdowns are populated from the Item Master table
- Automatically filters items by category (RM or FG)
- Only shows active items

**Features Added:**
- State management for items:
  - `const [rmItems, setRmItems] = useState<ItemMaster[]>([]);`
  - `const [fgItems, setFgItems] = useState<ItemMaster[]>([]);`
- New function `fetchItems()` to retrieve items from `/api/item-master`
- Filters items by:
  - Active status (`isActive: true`)
  - Category (`RM` or `FG`)

**Form Behavior:**
- **When Creating BOM:**
  - FG field: Text input (allows multiple comma-separated sizes for bulk creation)
  - RM field: Dropdown (select from existing RM items)
- **When Editing BOM:**
  - FG field: Dropdown (select from existing FG items)
  - RM field: Dropdown (select from existing RM items)

**Dropdown Display Format:**
```
A0001 - 8mm (MS)
A0002 - 10mm (SS304)
```
Shows: Item Code - Size (Grade)

---

## Benefits

### Data Consistency
- HSN codes are centrally managed in GST Master
- BOM entries reference actual items from Item Master
- Reduces data entry errors

### User Experience
- Cleaner, more professional item codes
- Easier item selection with dropdowns
- Clear visual feedback with item codes and descriptions

### Maintainability
- Single source of truth for HSN codes
- Easier to track and audit items
- Simplified item code format

---

## Testing Recommendations

1. **Item Master:**
   - Create new items and verify serial code generation (A0001, A0002, etc.)
   - Test HSN code dropdown population
   - Verify only active HSN codes appear

2. **BOM:**
   - Create new BOM with RM dropdown
   - Edit existing BOM and verify FG dropdown
   - Test multiple FG creation with text input
   - Verify item filtering by category

3. **Integration:**
   - Add new HSN code in GST Master
   - Verify it appears in Item Master dropdown
   - Create items with new HSN code
   - Use items in BOM creation

---

## Files Modified

1. `src/models/ItemMaster.ts` - Serial item code generation
2. `src/app/masters/item/page.tsx` - HSN code dropdown
3. `src/app/masters/bom/page.tsx` - RM/FG dropdowns

---

## Notes

- The serial item code format starts with 'A' and can accommodate up to 9,999 items (A0001 to A9999)
- If more items are needed, the padding can be increased in the model
- The BOM form still allows bulk FG creation via comma-separated text input when creating new BOMs
- All dropdowns show only active items to prevent selection of inactive/deprecated items
