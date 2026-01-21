# Outward Challan - Bill To & Ship To Feature

## Summary
Added separate "Bill To" and "Ship To" fields to the Outward Challan module, allowing users to specify different billing and shipping addresses from the Party Master. These fields are optional and default to the main party if not specified.

## Changes Made

### 1. Database Schema Updates

#### `src/types/index.ts`
- Added `billTo?: string` and `shipTo?: string` fields to `IOutwardChallan` interface
- Both fields reference PartyMaster and are optional
- Default to the main `party` field if not specified

#### `src/models/OutwardChallan.ts`
- Added `billTo` and `shipTo` schema fields
- Both reference 'PartyMaster' model
- Optional fields with no validation requirements

### 2. API Updates

#### `src/app/api/outward-challan/route.ts`
- **GET**: Added `.populate('billTo')` and `.populate('shipTo')` to fetch party details
- **POST**: 
  - Added `billTo: body.billTo || body.party` (defaults to main party)
  - Added `shipTo: body.shipTo || body.party` (defaults to main party)
  - Added `eWayBillNo` field support

#### `src/app/api/outward-challan/[id]/route.ts`
- **GET**: Added population of `billTo` and `shipTo` fields
- **PUT**: 
  - Added `billTo` and `shipTo` to update payload
  - Defaults to main party if not provided
  - Added `eWayBillNo` field support

### 3. Frontend Form Updates

#### `src/app/outward-challan/page.tsx`

**Interface Updates:**
- Added `address` and `gstNumber` to `Party` interface
- Added `billTo?: string` and `shipTo?: string` to `ChallanForm` interface
- Added optional `billTo` and `shipTo` party objects to `OutwardChallan` interface

**State Management:**
- Added `billTo: ''` and `shipTo: ''` to initial `formData` state
- Updated `resetForm()` to include billTo and shipTo
- Updated `handleEdit()` to populate billTo and shipTo from existing challan

**UI Components:**
- Added new "Billing & Shipping Details (Optional)" section with indigo styling
- Two `ItemSelector` components for Bill To and Ship To
- Displays party name and address in dropdown options
- Helper text explains that fields default to main party
- Placeholder shows "Same as Party (Default)"

### 4. Print View Updates

#### `src/components/ChallanPrintView.tsx`
- Added `billTo` and `shipTo` optional fields to `OutwardChallan` interface
- Updated "Bill To" section to display: `challan.billTo?.partyName || challan.party.partyName`
- Updated "Ship To" section to display: `challan.shipTo?.partyName || challan.party.partyName`
- Both sections fall back to main party if billTo/shipTo not specified
- GSTIN displayed for Bill To address

## User Experience

### Creating a New Challan
1. User selects main **Party** (required)
2. Optionally selects different **Bill To** party
3. Optionally selects different **Ship To** party
4. If Bill To/Ship To not selected, they default to the main party

### Print/PDF Output
- **Bill To** section shows the billing party (or main party if not specified)
- **Ship To** section shows the shipping party (or main party if not specified)
- Both sections include full party name, address, and GSTIN (for Bill To)

### Editing Existing Challans
- Bill To and Ship To fields are populated if they were previously set
- Can be changed or cleared during edit

## Backward Compatibility
✅ **Fully backward compatible**
- Existing challans without billTo/shipTo will display the main party in both sections
- No data migration required
- Optional fields ensure existing functionality is not affected

## Technical Notes
- All party references use MongoDB ObjectId with population
- API automatically defaults billTo and shipTo to main party during creation
- Frontend validation ensures main party is always selected
- Print view uses optional chaining (`?.`) for safe access to billTo/shipTo

## Testing Checklist
- [x] Create new challan with same party for all three fields
- [x] Create new challan with different Bill To party
- [x] Create new challan with different Ship To party
- [x] Create new challan with different parties for all three
- [x] Edit existing challan and change Bill To/Ship To
- [x] Print preview shows correct addresses
- [x] PDF export shows correct addresses
- [x] Existing challans display correctly (backward compatibility)
