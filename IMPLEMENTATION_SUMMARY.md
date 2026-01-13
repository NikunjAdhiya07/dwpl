# Implementation Summary - Outward Challan Updates

## ✅ Completed Changes

### 1. Item Code Format Updated
**Changed from**: `A0001, A0002, ...`  
**Changed to**: `FG-0001, FG-0002, ...` for Finished Goods and `RM-0001, RM-0002, ...` for Raw Materials

**File**: `src/models/ItemMaster.ts`
- Item codes now include category prefix
- Separate numbering for FG and RM categories
- Auto-generated on item creation

### 2. Party Master Enhanced
**Added Fields**:
- `annealingMax`: Maximum annealing count (1-10) - defines the upper limit for annealing processes
- `drawMax`: Maximum draw count (1-8) - defines the upper limit for draw processes

**Files Modified**:
- `src/models/PartyMaster.ts` - Schema updated
- `src/types/index.ts` - Interface updated

**Purpose**: Each party can now have different process limits based on their requirements.

### 3. Transport Master Enhanced
**Added Field**:
- `transporterName`: Company/transporter name

**Files Modified**:
- `src/models/TransportMaster.ts` - Schema updated
- `src/types/index.ts` - Interface updated

**Structure Now**:
```typescript
{
  vehicleNumber: string;      // e.g., "GJ01AB1234"
  transporterName: string;    // e.g., "ABC Transport Co."
  ownerName: string;          // e.g., "John Doe"
}
```

### 4. Outward Challan - Multi-Item Support
**Major Restructure**: Changed from single-item to multi-item per challan

**Old Structure**:
```typescript
{
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

**New Structure**:
```typescript
{
  party: string;
  items: [
    {
      finishSize: string;      // FG Item ID (displays as "FG-0001 - 2.5mm - SS304")
      originalSize: string;    // RM Item ID (displays as "RM-0001 - 3.0mm - SS304")
      annealingCount: number;  // 1 to party.annealingMax
      drawPassCount: number;   // 1 to party.drawMax
      quantity: number;
      rate: number;
      annealingCharge: number; // auto-calculated
      drawCharge: number;      // auto-calculated
      itemTotal: number;       // auto-calculated
    }
  ];
  totalAmount: number;         // sum of all item totals
  vehicleNumber: string;
  transportName: string;
  ownerName: string;
}
```

**Files Modified**:
- `src/models/OutwardChallan.ts` - Complete schema restructure
- `src/types/index.ts` - New `IOutwardChallanItem` interface added

**Key Features**:
- ✅ Multiple items per challan
- ✅ Each item shows item code (FG-0001, RM-0001)
- ✅ Annealing range: 1 to party's annealingMax
- ✅ Draw range: 1 to party's drawMax
- ✅ Auto-calculation of item totals and challan total
- ✅ Validation: At least one item required

## 🔄 Next Steps - UI Implementation

### Required UI Changes

#### 1. Update Outward Challan Page (`src/app/outward-challan/page.tsx`)

**Changes Needed**:

1. **Add Transport Master Dropdown**
   - Fetch transport masters from API
   - Dropdown to select transporter
   - Auto-populate: transporterName, vehicleNumber, ownerName

2. **Multi-Item Form**
   - Replace single item fields with dynamic item list
   - "Add Item" button to add new items
   - Each item row shows:
     - FG selector (with item code display)
     - RM selector (with item code display)
     - Annealing dropdown (1 to party.annealingMax)
     - Draw dropdown (1 to party.drawMax)
     - Quantity input
     - Rate input
     - Calculated total (read-only)
     - Remove button
   
3. **Item Code Display**
   - Show item codes in selectors: "FG-0001 - 2.5mm - SS304"
   - Make it easy to identify items

4. **Dynamic Process Ranges**
   - Annealing dropdown: Generate options from 1 to selectedParty.annealingMax
   - Draw dropdown: Generate options from 1 to selectedParty.drawMax
   - Update ranges when party changes

5. **Total Calculation**
   - Display running total of all items
   - Update in real-time as items are added/modified

#### 2. Update API Routes

**File**: `src/app/api/outward-challan/route.ts`
- Update POST handler to accept items array
- Update stock deduction logic for multiple items
- Validate each item's FG and RM

**File**: `src/app/api/outward-challan/[id]/route.ts`
- Update PUT handler for multi-item structure
- Update DELETE handler to restore stock for all items

#### 3. Update PDF Export

**File**: `src/app/outward-challan/page.tsx` (PDF export function)
- Update to show multiple items in table
- Each row shows item details
- Subtotal for each item
- Grand total at bottom

#### 4. Update Tax Invoice

**File**: `src/app/tax-invoice/page.tsx`
- Handle multi-item challans
- Display all items from selected challan
- Calculate GST on total amount

## 📋 Implementation Checklist

- [x] Item code format changed to FG-0001, RM-0001
- [x] Party Master: Added annealingMax and drawMax
- [x] Transport Master: Added transporterName
- [x] Outward Challan: Schema updated for multi-item
- [x] Types: All interfaces updated
- [ ] Outward Challan UI: Multi-item form
- [ ] Outward Challan UI: Transport dropdown
- [ ] Outward Challan UI: Item code display
- [ ] Outward Challan UI: Dynamic process ranges
- [ ] API: POST handler for multi-item
- [ ] API: PUT handler for multi-item
- [ ] API: DELETE handler for multi-item
- [ ] PDF Export: Multi-item support
- [ ] Tax Invoice: Multi-item challan support
- [ ] Testing: Create multi-item challan
- [ ] Testing: Stock updates for multiple items
- [ ] Testing: Edit multi-item challan
- [ ] Testing: Delete multi-item challan

## 🎯 Current Status

**Completed**: Backend schema and type definitions (40%)  
**In Progress**: UI implementation needed (60%)

**Next Action**: Implement the multi-item UI in `src/app/outward-challan/page.tsx`

## ⚠️ Important Notes

1. **Data Migration**: Existing single-item challans in the database will need migration to the new format
2. **Backward Compatibility**: Consider creating a migration script
3. **Stock Management**: Ensure stock deduction works correctly for multiple items
4. **Validation**: Each item must have valid FG-RM BOM mapping
5. **Testing**: Thoroughly test with multiple items before production deployment

## 🔧 Technical Details

### Item Code Display Format
```
FG-0001 - 2.5mm - SS304
RM-0001 - 3.0mm - SS304
```

### Annealing/Draw Dropdowns
```typescript
// Generate annealing options based on party
const annealingOptions = Array.from(
  { length: selectedParty.annealingMax },
  (_, i) => i + 1
);

// Generate draw options based on party
const drawOptions = Array.from(
  { length: selectedParty.drawMax },
  (_, i) => i + 1
);
```

### Transport Selection
```typescript
interface TransportMaster {
  _id: string;
  vehicleNumber: string;
  transporterName: string;
  ownerName: string;
}

// On transport selection:
setFormData({
  ...formData,
  vehicleNumber: transport.vehicleNumber,
  transportName: transport.transporterName,
  ownerName: transport.ownerName,
});
```

---

**Last Updated**: 2026-01-13  
**Status**: Schema Complete, UI Implementation Pending
