# DWPL System - Quick Reference Card

## 🚀 Quick Start

### Starting the Application
```bash
# Development Mode
npm run dev
# Access at: http://localhost:3000

# Production Mode
npm run build
npm run start
```

### Environment Setup
```env
# .env.local
MONGODB_URI=mongodb://localhost:27017/dwpl
```

---

## 📋 Common Workflows

### 1. Adding a New Party
```
Dashboard → Masters → Party Master → + Add Party
├─ General Tab: Name, GST, Contact, Address
├─ Charges Tab: Annealing & Draw charges
└─ Click "Create Party"
```

### 2. Adding New Items (RM/FG)
```
Dashboard → Masters → Item Master → + Add Item
├─ Select Category (RM or FG)
├─ Enter Size, Grade, Mill, HSN Code
└─ Click "Create Item"
```

### 3. Creating BOM Entry
```
Dashboard → Masters → BOM & Routing → + Add BOM
├─ Select FG Size
├─ Select RM Size
├─ Set Annealing Range (0-10)
├─ Set Draw Pass Range (0-8)
└─ Click "Create BOM"
```

### 4. Recording Material Receipt (GRN)
```
Dashboard → GRN → Create GRN
├─ Select Sending Party
├─ Enter Party Challan Number
├─ Add Items (RM only)
│   ├─ Select RM Size
│   ├─ Enter Quantity
│   └─ Enter Rate
└─ Click "Create GRN"
Result: RM Stock increases automatically
```

### 5. Creating Outward Challan
```
Dashboard → Outward Challan → Create Challan
├─ Select Party
├─ Add Items
│   ├─ Select FG Size (RM auto-fills from BOM)
│   │   OR
│   ├─ Select RM Size (FG auto-fills from BOM)
│   ├─ Set Annealing Count (0-10)
│   ├─ Set Draw Pass Count (0-8)
│   ├─ Enter Quantity
│   └─ Rate auto-fills from Party
├─ Add Transport Details (optional)
└─ Click "Create Challan"
Result: RM Stock decreases, FG Stock increases
```

### 6. Generating Tax Invoice
```
Dashboard → Tax Invoice → Create Invoice
├─ Select Outward Challan
│   (Party, Items, Amounts auto-fill)
├─ GST auto-calculates from HSN codes
└─ Click "Create Invoice"
```

---

## 🔍 Search & Filter

### Search Tips
- **Party Master**: Search by name, GST, contact
- **Item Master**: Search by size, grade, mill, HSN
- **BOM**: Search by FG size, RM size, grade
- **GST Master**: Search by HSN code, percentage

### Filter Options
- **Item Master**: Filter by ALL / RM / FG
- **Stock**: Filter by RM / FG category

---

## 📊 Stock Management

### How Stock Works
```
GRN Created:
  RM Stock += Quantity

Outward Challan Created:
  RM Stock -= Quantity
  FG Stock += Quantity

Stock Display:
  Shows real-time available quantity
  Prevents negative stock
```

### Checking Stock
```
Method 1: Direct URL
  http://localhost:3000/stock

Method 2: Outward Challan Page
  Stock displays when selecting RM item

Method 3: API Diagnostic
  http://localhost:3000/api/stock/diagnostic
```

---

## 📄 PDF Export

### Outward Challan PDF
```
Outward Challan List → Actions → Export PDF
Generates: 3 copies (Original, Duplicate, Triplicate)
Format: Challan_<Number>_<Date>.pdf
```

### Tax Invoice PDF
```
Tax Invoice List → Actions → Export PDF
Generates: 3 copies (Original, Duplicate, Triplicate)
Format: Invoice_<Number>_<Date>.pdf
```

---

## ⚙️ Business Rules

### BOM Validation
- FG and RM combination must exist in BOM
- Annealing count must be within BOM range
- Draw pass count must be within BOM range

### Stock Rules
- Stock cannot go negative
- GRN only affects RM stock
- Outward Challan affects both RM (↓) and FG (↑)

### Charge Calculation
```
Item Total = (Quantity × Rate) + 
             (Quantity × Annealing Charge × Annealing Count) +
             (Quantity × Draw Charge × Draw Pass Count)
```

### GST Calculation
```
For each item:
  GST Amount = Item Total × (GST% / 100)

Invoice Total:
  Subtotal = Sum of all Item Totals
  Total GST = Sum of all GST Amounts
  Grand Total = Subtotal + Total GST
```

---

## 🐛 Troubleshooting

### Issue: Stock Showing 0
**Solution**: 
1. Check if GRN was created successfully
2. Refresh the page (Ctrl + Shift + R)
3. Check browser console for errors
4. Visit `/api/stock/diagnostic` for details

### Issue: Validation Error on Challan
**Common Causes**:
- Annealing/Draw count outside BOM range
- Insufficient RM stock
- Missing BOM entry for FG-RM combination

**Solution**:
1. Check BOM entry exists
2. Verify stock availability
3. Ensure counts within allowed range

### Issue: PDF Not Generating
**Solution**:
1. Check browser console for errors
2. Ensure all data is loaded
3. Try refreshing the page
4. Check if popup blocker is active

### Issue: GST Not Calculating
**Solution**:
1. Ensure HSN code exists in GST Master
2. Check if GST percentage is set
3. Verify item has correct HSN code

---

## 📱 Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `ESC` | Close modal dialog |
| `Tab` | Move to next field |
| `Shift + Tab` | Move to previous field |
| `Enter` | Submit form (when in field) |
| `Ctrl + Shift + R` | Hard refresh page |

---

## 🔗 Quick Links

### Navigation
- Dashboard: `/`
- Party Master: `/masters/party`
- Item Master: `/masters/item`
- BOM & Routing: `/masters/bom`
- GST Master: `/masters/gst`
- Transport Master: `/masters/transport`
- GRN: `/grn`
- Stock: `/stock`
- Outward Challan: `/outward-challan`
- Tax Invoice: `/tax-invoice`

### API Endpoints
- Dashboard Stats: `/api/dashboard`
- Stock View: `/api/stock?category=RM`
- Stock Diagnostic: `/api/stock/diagnostic`
- BOM by RM: `/api/bom/by-rm?rmSize=<size>`

---

## 📞 Support

### Getting Help
1. Check this quick reference
2. Review `USER_GUIDE.md`
3. Check `COMPREHENSIVE_SYSTEM_REVIEW.md`
4. Review error messages in browser console
5. Contact development team

### Reporting Issues
Include:
- Page name
- Action attempted
- Error message (screenshot)
- Steps to reproduce

---

## ✅ Daily Operations Checklist

### Morning
- [ ] Check system status on dashboard
- [ ] Review pending GRNs
- [ ] Check stock levels

### During Operations
- [ ] Record GRNs as materials arrive
- [ ] Create outward challans for dispatches
- [ ] Generate tax invoices as needed

### End of Day
- [ ] Verify all GRNs recorded
- [ ] Verify all challans created
- [ ] Check stock accuracy
- [ ] Backup database (if manual)

---

## 🎯 Best Practices

### Data Entry
1. Search before adding (avoid duplicates)
2. Use consistent naming conventions
3. Verify data before saving
4. Keep party charges updated

### Stock Management
1. Record GRNs immediately upon receipt
2. Create challans before dispatch
3. Monitor stock levels regularly
4. Investigate discrepancies promptly

### Document Management
1. Export PDFs for record-keeping
2. Maintain physical copies as needed
3. Follow company document retention policy

---

## 📊 System Limits

| Item | Limit | Notes |
|------|-------|-------|
| Annealing Count | 0-10 | Configurable per party |
| Draw Pass Count | 0-8 | Configurable per party |
| Items per Challan | Unlimited | Performance tested up to 50 |
| Items per GRN | Unlimited | Performance tested up to 50 |
| Stock Quantity | No limit | Cannot go negative |
| GST Percentage | 0-100% | Typically 5%, 12%, 18%, 28% |

---

## 🔐 Data Validation

### Required Fields
- **Party**: Name, GST, Contact, Address
- **Item**: Category, Size, Grade, HSN Code
- **BOM**: FG Size, RM Size, Grade
- **GRN**: Party, Challan Number, Items
- **Challan**: Party, Items, Date
- **Invoice**: Challan reference

### Format Validation
- **GST Number**: 15 characters (e.g., 24AAQCP2416F1ZD)
- **Item Code**: Auto-generated (e.g., RM-3000-10B21-MK3W39A3)
- **Challan Number**: Auto-generated (e.g., OC-001)
- **Invoice Number**: Auto-generated (e.g., INV-001)

---

**Quick Reference v1.0 | DWPL Manufacturing System**
