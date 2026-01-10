# Outward Challan Multi-Item Enhancement

## Date: 2026-01-08

## Overview
This document outlines the changes made to support multiple items in a single Outward Challan and add a transporter dropdown.

## Changes Made

### 1. **Type Definitions Updated** (`src/types/index.ts`)

**New Interface: `IOutwardChallanItem`**
```typescript
export interface IOutwardChallanItem {
  finishSize: string; // FG Item ID
  originalSize: string; // RM Item ID (from BOM)
  annealingCount: number; // 0-7
  drawPassCount: number; // 0-10
  quantity: number;
  rate: number;
  annealingCharge: number; // auto-calculated from Party Master
  drawCharge: number; // auto-calculated from Party Master
  itemTotal: number; // Total for this line item
}
```

**Updated Interface: `IOutwardChallan`**
- Changed from single item fields to `items: IOutwardChallanItem[]` array
- Added `transport?: string` field for Transport Master reference
- `totalAmount` now represents sum of all item totals

### 2. **Model Updated** (`src/models/OutwardChallan.ts`)

**Key Changes:**
- Created `OutwardChallanItemSchema` for embedded item documents
- Updated `OutwardChallanSchema` to include items array
- Added validation to ensure at least one item is present
- Modified `pre('save')` hook to:
  - Calculate `itemTotal` for each item
  - Sum all item totals to get `totalAmount`
- Added `transport` field with reference to TransportMaster

### 3. **Frontend Page** (`src/app/outward-challan/page.tsx`)

**Major Changes Required:**
- Add state for managing multiple items in the form
- Add "Add Item" and "Remove Item" functionality
- Fetch and display transporter list from Transport Master
- Add transporter dropdown with auto-fill of vehicle number and owner name
- Update form submission to send items array
- Update challan display table to show multiple items per challan

## Benefits

### Multiple Items Per Challan
- **Efficiency**: Create one challan for multiple items going to the same party
- **Better Organization**: Group related items together
- **Reduced Paperwork**: Fewer challans to manage

### Transporter Dropdown
- **Data Consistency**: Select from predefined transporters
- **Auto-Fill**: Vehicle number and owner name auto-populate
- **Centralized Management**: Maintain transporter data in one place

## Implementation Status

✅ **Completed:**
- Type definitions updated
- Model schema updated
- Auto-calculation logic implemented

⏳ **Pending:**
- Frontend page rewrite for multi-item support
- API route updates to handle new structure
- Print/PDF generation updates
- Tax Invoice integration updates

## Migration Notes

**Breaking Changes:**
- Existing Outward Challans with single item structure will need migration
- API responses will have different structure
- Frontend components consuming challan data need updates

**Migration Strategy:**
1. Create a migration script to convert existing challans
2. Transform single-item challans to multi-item format with one item in array
3. Update all dependent components (Tax Invoice, Reports, etc.)

## Next Steps

1. **Rewrite Outward Challan Page:**
   - Implement multi-item form with add/remove functionality
   - Add transporter dropdown
   - Update validation logic

2. **Update API Routes:**
   - Modify POST/PUT endpoints to handle items array
   - Update stock deduction logic for multiple items
   - Add proper validation

3. **Update Print/PDF:**
   - Modify challan print template to show all items
   - Update layout for multi-item display

4. **Update Tax Invoice:**
   - Handle challans with multiple items
   - Decide on invoice generation strategy (one invoice per challan or per item)

## Testing Checklist

- [ ] Create challan with single item
- [ ] Create challan with multiple items
- [ ] Edit existing challan
- [ ] Delete challan with multiple items
- [ ] Verify stock deduction for all items
- [ ] Test transporter dropdown and auto-fill
- [ ] Print challan with multiple items
- [ ] Generate tax invoice from multi-item challan
