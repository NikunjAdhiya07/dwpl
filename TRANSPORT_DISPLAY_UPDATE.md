# Transport Information Display Update

## Objective
Update the "Dispatched Through" field to display in the format:
**"Road / XYZ (Transporter or Vehicle Owner Name)"**

## Current Status
✅ Schema updated - Both OutwardChallan and TaxInvoice models now have:
- `vehicleNumber`
- `transportName`
- `ownerName`
- `dispatchedThrough`

## Changes Required

### 1. Update Display Logic in Tax Invoice (tax-invoice/page.tsx)

**Lines to update: 307, 794**

Current:
```tsx
<span>Dispatched Through:</span>
<span>{invoice.dispatchedThrough || 'By Road'}</span>
```

New:
```tsx
<span>Dispatched Through:</span>
<span>
  {invoice.dispatchedThrough || 'By Road'}
  {(invoice.transportName || invoice.ownerName) && 
    ` / ${invoice.transportName || invoice.ownerName}`
  }
</span>
```

### 2. Update Outward Challan Form (outward-challan/page.tsx)

Need to add transport fields to the form:
- Vehicle Number (optional)
- Transport Name (optional)
- Owner Name (optional)
- Dispatched Through (default: "By Road")

### 3. Update Outward Challan Print View (outward-challan/page.tsx line ~1042)

Current:
```tsx
<span>By Road</span>
```

New:
```tsx
<span>
  {challan.dispatchedThrough || 'By Road'}
  {(challan.transportName || challan.ownerName) && 
    ` / ${challan.transportName || challan.ownerName}`
  }
</span>
```

### 4. Update Tax Invoice Creation API

When creating a tax invoice from an outward challan, copy the transport fields:
- vehicleNumber
- transportName
- ownerName
- dispatchedThrough

## Implementation Steps

1. ✅ Update types (DONE)
2. ✅ Update OutwardChallan model (DONE)
3. ⏳ Update outward challan form to include transport fields
4. ⏳ Update tax invoice display (both PDF and print modal)
5. ⏳ Update outward challan print view
6. ⏳ Update tax invoice API to copy transport fields from challan

## Notes
- Transport fields are optional
- If both transportName and ownerName are provided, prefer transportName
- Default dispatch method is "By Road"
- Format: "{dispatchMethod} / {transportName or ownerName}"
