# Outward Challan PDF Export Implementation

## Overview
Creating PDF export functionality for Outward Challan that matches the Tax Invoice layout with "Job Work Invoice" heading.

## Changes Required

### 1. Update Outward Challan Page
- Add PDF export function similar to Tax Invoice
- Change heading to "Job Work Invoice"
- Remove Print button, keep only PDF Export
- Match Tax Invoice layout format
- Support multi-item display

### 2. PDF Layout Structure
```
- Top Header: "Job Work Invoice" (instead of "Delivery Challan")
- Company Details (PINNACLE FASTENER)
- Challan Number and Date
- Transport Details
- Party Details (Billed To / Shipped To)
- Items Table with multiple items support
- Process Parameters (Annealing, Draw)
- Totals Section
- Declaration
- Signature Block
```

### 3. Multi-Item Support
Each item in the challan should show:
- Item Code (FG-0001, RM-0001)
- FG Size and RM Size
- Annealing Count
- Draw Pass Count
- Quantity
- Rate
- Charges breakdown
- Item Total

### 4. Implementation Steps
1. Add PDF export button to each challan row
2. Create PDF generation function
3. Render multi-item layout
4. Export as PDF with proper formatting
5. Remove Print functionality

## Status
Ready to implement
