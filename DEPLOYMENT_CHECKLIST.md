# Pre-Deployment Checklist

**Purpose:** Verify all changes maintain system integrity before deploying to production

---

## ✅ Phase 1: Code Review (Before Merging PR)

### 1.1 File Changes Review
- [ ] No unnecessary files added (no `node_modules`, `.env`, test artifacts)
- [ ] All changed files are committed
- [ ] No commented-out code left
- [ ] No console.log or debug statements in production code
- [ ] All TypeScript errors resolved (no `any` types unless necessary)
- [ ] ESLint passes: `npm run lint`

### 1.2 Related Files Check
- [ ] Database model updated → API route updated → UI component updated
- [ ] Calculation formula: Frontend formula matches backend pre-save hook formula
- [ ] API response includes all fields shown in UI
- [ ] UI sends all fields required by API
- [ ] PDF shows correct values from database

**Verification Command:**
```bash
# Search for related changes
git diff HEAD~1 --name-only | grep -E "(models|api|components|pages)"

# Check for TypeScript errors
npm run type-check

# Check for lint errors
npm run lint
```

---

## ✅ Phase 2: Data Consistency (Local Testing)

### 2.1 Create Test Data
```javascript
// Create test party
const testParty = {
  partyName: 'Test Company',
  gstNumber: '27AABCT1234A1Z0',
  annealingCharge: 10,
  drawCharge: 5,
  sappdRate: 100,
};

// Create test GST
const testGST = {
  party: testParty._id,
  cgstPercentage: 9,
  sgstPercentage: 9,
  igstPercentage: 0,
};

// Create test challan
const testChallan = {
  party: testParty._id,
  items: [{
    finishSize: fgItemId,
    originalSize: rmItemId,
    quantity: 100,
    annealingCount: 2,
    drawPassCount: 3,
    // Expected rate: 100 + (10*2) + (5*3) = 135
  }],
};
```

### 2.2 Verify Calculations Match
```
Frontend Calculation:
- Rate = 100 + (10×2) + (5×3) = 135
- Item Total = 100 × 135 = 13,500

Database Verification:
- Query item from database
- Verify rate = 135
- Verify itemTotal = 13,500

PDF Export Verification:
- Generate PDF
- Verify PDF shows rate = 135
- Verify PDF shows amount = 13,500
```

### 2.3 Check Data Integrity
- [ ] All required fields present (not null/undefined)
- [ ] No NaN values in any calculations
- [ ] Quantity always > 0
- [ ] Rates and amounts always >= 0
- [ ] GST percentages between 0-100
- [ ] References (party, items) exist in database

---

## ✅ Phase 3: API Testing

### 3.1 Test All Affected Endpoints

**For Challan Changes:**
```bash
# Create
POST /api/outward-challan
{
  "party": "partyId",
  "items": [{ ... }],
  "challanDate": "2024-01-15"
}
# Expected: 201, challan created with correct rate

# Read
GET /api/outward-challan/challanId
# Expected: 200, all fields populated

# Update
PUT /api/outward-challan/challanId
{ ... updated data ... }
# Expected: 200, updated values correct

# Delete
DELETE /api/outward-challan/challanId
# Expected: 200, stock reversed correctly
```

**For Invoice Changes:**
```bash
# Create (critical test)
POST /api/tax-invoice
{
  "outwardChallan": "challanId",
  "cgstPercentage": 9,
  "sgstPercentage": 9,
  "igstPercentage": 0,
  "items": [{ ... }]
}
# Expected: 201, GST amounts calculated correctly
# Check: totalAmount = baseAmount + (CGST + SGST)

# Verify calculation
GET /api/tax-invoice/invoiceId
# Expected: gstAmount = baseAmount × (9+9) / 100
# Expected: totalAmount includes GST
```

### 3.2 Test Edge Cases
```bash
# Test with null GST (should work with defaults)
POST /api/tax-invoice { outwardChallan: id }
# Expected: Works, uses GST Master fallback

# Test with zero quantities
POST /api/outward-challan { items: [{ quantity: 0 }] }
# Expected: 400 error, quantity validation

# Test with negative rate
POST /api/outward-challan { items: [{ rate: -50 }] }
# Expected: 400 error, rate validation
```

---

## ✅ Phase 4: UI/UX Testing

### 4.1 Frontend Data Flow
- [ ] Load page, verify data displays
- [ ] Refresh page, data still shows
- [ ] Create new record, calculation updates in real-time
- [ ] Edit record, validation works
- [ ] Save record, success message appears
- [ ] Load saved record, values match what was entered

### 4.2 Calculation Display
```
Before saving:
- Quantity input: 100
- Rate input: 50
- Total shows: 5,000

After saving and refreshing:
- Load from database
- Total still shows: 5,000
```

### 4.3 PDF Export
```
Generate PDF:
- Select invoice
- Click "Export PDF"
- PDF opens/downloads
- Verify values match database
- Check: Grand Total is populated
- Check: GST breakdown shows correct amounts
```

### 4.4 Form Validation
- [ ] Required fields validation works
- [ ] Number fields reject invalid input
- [ ] References (party selection) work
- [ ] GST data loads when party selected
- [ ] Calculations update when data changes

---

## ✅ Phase 5: Database Integrity

### 5.1 Verify No Orphaned References
```javascript
// Check for invoices without valid challan references
const orphaned = await TaxInvoice.find()
  .populate('outwardChallan')
  .then(invoices => invoices.filter(i => !i.outwardChallan));

if (orphaned.length > 0) {
  console.error('❌ Found orphaned invoices:', orphaned);
}
```

### 5.2 Verify No Duplicates
```javascript
// Check for duplicate GST entries per party
const duplicates = await GSTMaster.aggregate([
  { $group: { _id: '$party', count: { $sum: 1 } } },
  { $match: { count: { $gt: 1 } } }
]);

if (duplicates.length > 0) {
  console.error('❌ Found duplicate GST entries:', duplicates);
}
```

### 5.3 Verify Data Types
```javascript
// Check all amounts are numbers, not strings
const badTypes = await TaxInvoice.find({
  $or: [
    { baseAmount: { $type: 'string' } },
    { gstAmount: { $type: 'string' } },
    { totalAmount: { $type: 'string' } },
  ]
});

if (badTypes.length > 0) {
  console.error('❌ Found wrong data types:', badTypes);
}
```

---

## ✅ Phase 6: Backward Compatibility

### 6.1 Test Existing Data
- [ ] Load page with existing records
- [ ] Old invoices display correctly
- [ ] Old calculations still work
- [ ] Can still edit old records
- [ ] Can still generate PDF from old invoices
- [ ] Old data exports correctly

### 6.2 Test Mixed Old and New Data
- [ ] View list with both old and new records
- [ ] Search works across both
- [ ] Reports include both
- [ ] Export includes both

---

## ✅ Phase 7: Performance

### 7.1 API Response Times
- [ ] Create endpoint: < 500ms
- [ ] Get list endpoint: < 1000ms for 100+ records
- [ ] Update endpoint: < 500ms
- [ ] Delete endpoint: < 500ms

```bash
# Test with curl
time curl -X GET http://localhost:3000/api/tax-invoice
# Should show < 1000ms
```

### 7.2 PDF Generation
- [ ] Generate PDF: < 5 seconds
- [ ] Large document (50+ items): < 10 seconds
- [ ] No memory leaks: RAM returns to baseline after generation

### 7.3 Database Queries
- [ ] No N+1 queries (use populate wisely)
- [ ] Indexes are created and used
- [ ] Large operations paginated

---

## ✅ Phase 8: Error Handling

### 8.1 Graceful Degradation
```javascript
// If GST Master missing, should:
// 1. Show warning, not error
// 2. Allow continue with manual GST entry
// 3. Not crash the application

// If coil weight missing, should:
// 1. Use 0 as default
// 2. Show validation message
// 3. Allow user to fix it
```

### 8.2 Error Messages
- [ ] Error messages are clear and actionable
- [ ] User knows what went wrong
- [ ] User knows how to fix it
- [ ] No technical jargon unless necessary

### 8.3 Validation Messages
```
❌ Bad: "Validation failed"
✅ Good: "Quantity must be greater than 0"

❌ Bad: "Reference error"
✅ Good: "Party not found. Please select a valid party."

❌ Bad: "GST setup not found"
✅ Good: "GST rates not configured for this party. Please set up GST in Party GST Setup first."
```

---

## ✅ Phase 9: Security

### 9.1 Input Validation
- [ ] All user inputs validated
- [ ] No SQL injection possible
- [ ] No XSS attacks possible
- [ ] Rate limits in place

### 9.2 Authentication
- [ ] User must be logged in
- [ ] User can only access own data
- [ ] No sensitive data in logs

### 9.3 Data Protection
- [ ] Passwords not stored in plain text
- [ ] No sensitive data in URLs
- [ ] HTTPS enforced (in production)

---

## ✅ Phase 10: Documentation

### 10.1 Code Documentation
- [ ] Functions have JSDoc comments
- [ ] Complex logic explained in comments
- [ ] Calculation formulas documented
- [ ] Why certain checks exist explained

### 10.2 Commit Message
```markdown
feat/fix: [Title]

## Problem
What issue was there

## Solution
What was changed

## Affected Areas
- Models: X, Y
- APIs: GET /x, POST /y
- UI: Pages affected
- Calculations: Updated formulas

## Testing
- Unit tests: ✅ Pass
- Integration tests: ✅ Pass
- Manual tests: ✅ Pass
```

### 10.3 CHANGELOG Updated
- [ ] New changes documented
- [ ] Migration instructions (if any)
- [ ] Breaking changes noted
- [ ] Known issues listed

---

## ✅ Final Verification Checklist

Before clicking "Merge to Main":

### Code
- [ ] All tests passing: `npm test`
- [ ] No TypeScript errors: `npm run type-check`
- [ ] No lint errors: `npm run lint`
- [ ] Build succeeds: `npm run build`

### Data
- [ ] Manual calculation test passed
- [ ] Database integrity verified
- [ ] No orphaned references
- [ ] All calculations match

### API
- [ ] All CRUD operations work
- [ ] Edge cases handled
- [ ] Error handling correct
- [ ] Response times acceptable

### UI
- [ ] Displays data correctly
- [ ] Validation works
- [ ] PDF exports correctly
- [ ] Mobile responsive (if applicable)

### Deployment
- [ ] Backward compatible
- [ ] No breaking changes
- [ ] Data migrations (if any) tested
- [ ] Rollback plan clear

---

## 🚨 If Anything Fails

**STOP - Do Not Merge**

Instead:
1. Fix the failing item
2. Run the check again
3. Document why it failed
4. Prevent similar issues in the future

---

## Post-Deployment

After deploying to production:

### Hour 1
- [ ] Monitor errors in logs
- [ ] Check API response times
- [ ] Verify calculations on few records

### Day 1
- [ ] Run health checks: `/api/health/checks`
- [ ] Check data consistency
- [ ] Review user feedback

### Week 1
- [ ] Monitor performance metrics
- [ ] Check for orphaned data
- [ ] Verify all features working
- [ ] Get user confirmation

---

## Quick Check Command

```bash
#!/bin/bash
# Run before deployment

echo "1. Running tests..."
npm test || exit 1

echo "2. Type checking..."
npm run type-check || exit 1

echo "3. Lint check..."
npm run lint || exit 1

echo "4. Building..."
npm run build || exit 1

echo "✅ All checks passed! Ready to deploy."
```

Save as `.github/pre-deploy.sh` and run before each deployment.

---

**Last Updated:** $(date)  
**Next Review:** After next deployment
