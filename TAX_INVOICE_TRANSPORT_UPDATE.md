# Tax Invoice Transport Details Update

## Summary
Updated the Tax Invoice print and PDF export functionality to display transport information more clearly.

## Changes Made

### 1. Database Schema Updates

#### `src/types/index.ts`
- Added `transportName?: string` field to `ITaxInvoice` interface
- Added `ownerName?: string` field to `ITaxInvoice` interface
- Updated comment for `vehicleNumber` to clarify it's just "Vehicle No" (not "Vehicle No/LR No")

#### `src/models/TaxInvoice.ts`
- Added `transportName` field to TaxInvoice schema
- Added `ownerName` field to TaxInvoice schema

### 2. Frontend Display Updates

#### `src/app/tax-invoice/page.tsx`
Updated the invoice display in both PDF export and print modal to show:

**Before:**
```
Vehicle No/LR No: [vehicleNumber] /
E-Way Bill No: [eWayBillNo]
Dispatched Through: [dispatchedThrough]
```

**After:**
```
Transport Name: [transportName]
Vehicle No: [vehicleNumber]
Owner Name: [ownerName]
E-Way Bill No: [eWayBillNo]
Dispatched Through: [dispatchedThrough]
```

## Field Descriptions

| Field | Description | Default Value |
|-------|-------------|---------------|
| **Transport Name** | Name of the transport company/service | `-` |
| **Vehicle No** | Vehicle registration number | `EG13AW3140` |
| **Owner Name** | Name of the vehicle owner | `-` |
| **E-Way Bill No** | E-Way Bill number | `-` |
| **Dispatched Through** | Mode of dispatch | `By Road` |

## Impact

- ✅ Both printed invoices and PDF exports now clearly show transport details
- ✅ Transport Name replaces the confusing "LR No." field
- ✅ Vehicle No. and Owner Name are displayed as separate, clearly labeled fields
- ✅ All three copies (Original, Duplicate, Triplicate) show the updated format
- ✅ Backward compatible - existing invoices without these fields will show default values

## Next Steps

To populate these fields in new invoices, you may want to:
1. Add input fields in the invoice creation form to capture transport details
2. Consider integrating with the Transport Master to auto-populate vehicle and owner information
3. Update the API endpoint to accept and save these new fields
