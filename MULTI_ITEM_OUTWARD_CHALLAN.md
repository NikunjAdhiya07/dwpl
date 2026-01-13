# Outward Challan Multi-Item Implementation

## Overview
This document tracks the implementation of multi-item support for Outward Challans with the following requirements:

## Requirements Implemented

### 1. ✅ Item Code Format: FG-0001, RM-0001
- Changed from `A0001` format to category-prefixed format
- FG items: `FG-0001`, `FG-0002`, etc.
- RM items: `RM-0001`, `RM-0002`, etc.
- **File Modified**: `src/models/ItemMaster.ts`

### 2. ✅ Party Master Enhancements
- Added `annealingMax` field (1-10)
- Added `drawMax` field (1-8)
- These define the maximum values for annealing and draw processes per party
- **Files Modified**: 
  - `src/models/PartyMaster.ts`
  - `src/types/index.ts`

### 3. ✅ Transport Master Enhancement
- Added `transporterName` field
- Now stores: Vehicle Number, Transporter Name, Owner Name
- **Files Modified**:
  - `src/models/TransportMaster.ts`
  - `src/types/index.ts`

### 4. ✅ Multi-Item Outward Challan
- Restructured to support multiple items per challan
- Each item has:
  - Finish Size (FG) with item code display
  - Original Size (RM) with item code display
  - Annealing Count (1 to party's annealingMax)
  - Draw Count (1 to party's drawMax)
  - Quantity
  - Rate
  - Auto-calculated charges and item total
- **Files Modified**:
  - `src/models/OutwardChallan.ts`
  - `src/types/index.ts`

### 5. 🔄 Transport Dropdown (In Progress)
- Will use Transport Master for dropdown selection
- Auto-populate transporter name, vehicle number, and owner name
- **File to Modify**: `src/app/outward-challan/page.tsx`

## Data Structure Changes

### Old Structure (Single Item)
```typescript
{
  challanNumber: string;
  party: string;
  finishSize: string;
  originalSize: string;
  annealingCount: number;
  drawPassCount: number;
  quantity: number;
  rate: number;
  totalAmount: number;
}
```

### New Structure (Multiple Items)
```typescript
{
  challanNumber: string;
  party: string;
  items: [
    {
      finishSize: string;      // with item code FG-0001
      originalSize: string;    // with item code RM-0001
      annealingCount: number;  // 1 to party.annealingMax
      drawPassCount: number;   // 1 to party.drawMax
      quantity: number;
      rate: number;
      annealingCharge: number; // auto-calculated
      drawCharge: number;      // auto-calculated
      itemTotal: number;       // auto-calculated
    }
  ];
  totalAmount: number; // sum of all item totals
  vehicleNumber: string;
  transportName: string;
  ownerName: string;
}
```

## UI Changes Needed

### Form Layout
1. **Party Selection** - Dropdown with party details
2. **Transport Selection** - NEW: Dropdown from Transport Master
3. **Items Section** - NEW: Dynamic item list
   - Add Item button
   - Each item shows:
     - FG selector (shows item code)
     - RM selector (shows item code)
     - Annealing dropdown (1 to party.annealingMax)
     - Draw dropdown (1 to party.drawMax)
     - Quantity input
     - Rate input
     - Calculated total display
   - Remove item button
4. **Total Display** - Shows sum of all items

### Display Changes
- Item codes displayed in format: `FG-0001 - 2.5mm - SS304`
- Annealing range: 1 to selected party's annealingMax
- Draw range: 1 to selected party's drawMax

## Next Steps
1. Update Outward Challan page UI to support multiple items
2. Add Transport Master dropdown
3. Update PDF export to show multiple items
4. Update Tax Invoice to handle multi-item challans
5. Test stock updates for multiple items

## Migration Notes
- Existing single-item challans will need migration
- Consider backward compatibility for existing data
- May need a migration script to convert old format to new format

## Status
- ✅ Schema updates complete
- ✅ Type definitions updated
- 🔄 UI implementation in progress
- ⏳ API updates pending
- ⏳ PDF export updates pending
