# Tax Invoice Format Fix - Analysis

## Issues Identified from Images

Comparing the reference images (Image 2 & 3) with current implementation:

### Current Problems:
1. **Company Name**: Shows "DWPL INDUSTRIES" instead of "PINNACLE FASTENER"
2. **Address**: Wrong address (Vatva, Ahmedabad instead of Wadhwancity, Surendranagar)
3. **GSTIN**: Wrong GSTIN number
4. **Layout**: Not matching the exact spacing and alignment
5. **Table Height**: Item table row needs fixed height for consistent pagination
6. **Font Sizes**: Inconsistent font sizing
7. **Border Styles**: Need precise border styling

### Required Format (from Images):

#### Header Section:
- IRN on left, Copy type on right
- "Tax Invoice" centered below
- Two-column layout: Company details (left) | Invoice meta (right)

#### Company Details (Left Column - 55% width):
```
PINNACLE FASTENER
Plot No. 1005/B1, Phase-III, G.I.D.C.,
Wadhwancity, Surendranagar, Gujarat, India - 363035
GSTIN: 24AAQCP2416F1ZD
PAN No: AAQCP2416F
State: Gujarat
State Code: 24
```

#### Invoice Meta (Right Column - 45% width):
- Invoice No & Date (bold)
- P.O. No & P.O. Date
- Payment Term
- Supplier Code
- Vehicle No/LR No
- E-Way Bill No
- Dispatched Through

#### Parties Section:
- Two columns: Billed To (left) | Shipped To (right)
- Fixed minimum height for consistency

#### Item Table:
- Fixed row height (280px) for consistent pagination
- Columns: Sr. No. | Description | HSN/SAC | Packing | Qty | Rate | Amount
- Description includes: Wire size, grade, RM details, process counts

#### Summary Section:
- Left (60%): Amount in words + Net Total
- Right (40%): Transport, Ass Value, CGST, SGST, IGST, TCS, Net Payable

#### Footer:
- Declaration text
- Date & time of issue
- Signature block (Customer | Prepared By | Verified By | Authorised Signatory)
- Jurisdiction notice
- Computer generated notice

## Fix Strategy:

1. Update company details to PINNACLE FASTENER
2. Fix all static company information
3. Ensure proper grid layouts with exact percentages
4. Set fixed heights for table rows
5. Match font sizes exactly (9px base, 8px small, 10-11px headers)
6. Ensure proper page breaks between copies
7. Test pagination with print preview

## Implementation:
Will update the tax-invoice page.tsx with corrected format.
