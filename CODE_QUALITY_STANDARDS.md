# Code Quality & Synchronization Standards

**Purpose:** Ensure all changes maintain code integrity, data consistency, and system stability across all modules.

---

## 1. CRITICAL SYNCHRONIZATION REQUIREMENTS

### 1.1 Model ↔ API ↔ UI Data Flow Sync

Every data structure must be synchronized across three layers:

```
DATABASE MODEL (Schema)
    ↓
API ENDPOINTS (Create/Read/Update/Delete)
    ↓
FRONTEND COMPONENTS (Display/Input)
```

**Sync Checklist:**
- [ ] Database field defined in Model
- [ ] API accepts the field in POST/PUT
- [ ] API returns the field in GET
- [ ] Frontend displays the field correctly
- [ ] Frontend sends the field when creating/updating
- [ ] No field is missing or renamed without updating all layers

### 1.2 Calculation Logic Sync

Every calculation must be synchronized across:

**Frontend Calculations (UI Display):**
- Real-time display while user enters data
- Must match backend calculations exactly

**Backend Calculations (API/Pre-save Hooks):**
- Must match frontend calculations
- Used for persistent storage

**PDF Export:**
- Must display values as stored in database
- Must match both frontend and backend logic

**Reports:**
- Must use database values consistently

**Validation:** If `rate = A + B + C`, this formula must be:
- Used in frontend JS
- Used in backend pre-save hook
- Documented in comments
- Tested with unit tests

### 1.3 Status Field Sync

Every status field must have consistent values across:
- [ ] Database enum/allowed values
- [ ] API validation
- [ ] Frontend dropdown/radio options
- [ ] Display logic
- [ ] Filtering logic

---

## 2. CHANGE IMPACT ANALYSIS (Required Before Coding)

Before making ANY change, analyze impact on:

### 2.1 Direct Impact
- [ ] Which model fields are affected?
- [ ] Which APIs need changes?
- [ ] Which UI components display this data?
- [ ] Which calculations depend on this?

### 2.2 Indirect Impact
- [ ] What exports depend on this field?
- [ ] What reports use this data?
- [ ] What validations reference this?
- [ ] What other modules depend on this?

### 2.3 Data Consistency Impact
- [ ] Will existing data break?
- [ ] Do we need data migrations?
- [ ] Will old records still load correctly?
- [ ] Are there any orphaned references?

### 2.4 Calculation Impact
- [ ] Will totals change?
- [ ] Will formulas be affected?
- [ ] Are there rounding/precision issues?
- [ ] Do tax calculations stay consistent?

---

## 3. MANDATORY VALIDATION CHECKLIST

Every feature/fix MUST include these validations:

### 3.1 Data Validation
```javascript
// ✅ REQUIRED: Validate before saving
if (!partyId || typeof partyId !== 'string') {
  throw new Error('Invalid party ID');
}

if (quantity <= 0 || isNaN(quantity)) {
  throw new Error('Quantity must be positive number');
}

if (rate < 0) {
  throw new Error('Rate cannot be negative');
}

// Check for null/undefined that could cause NaN
const total = (quantity || 0) * (rate || 0);
```

### 3.2 Reference Validation
```javascript
// ✅ REQUIRED: Verify references exist before saving
const party = await PartyMaster.findById(partyId);
if (!party) {
  return NextResponse.json(
    { success: false, error: 'Party not found' },
    { status: 404 }
  );
}

// ✅ REQUIRED: Check for orphaned references after deletes
const orphanedInvoices = await TaxInvoice.find({ party: deletedPartyId });
if (orphanedInvoices.length > 0) {
  // Handle or warn about orphaned records
}
```

### 3.3 Calculation Validation
```javascript
// ✅ REQUIRED: Verify calculations are accurate
const itemTotal = item.quantity * item.rate;
if (Math.abs(itemTotal - expectedTotal) > 0.01) {
  console.error('Calculation mismatch detected!');
  // Log detailed error for debugging
}

// ✅ REQUIRED: Prevent NaN values
const baseAmount = items.reduce((sum, item) => {
  return sum + (item.itemTotal || 0); // Fallback to 0
}, 0);
```

### 3.4 Sync Validation
```javascript
// ✅ REQUIRED: Verify frontend and backend match
const frontendTotal = 12044.00; // From UI
const databaseTotal = invoice.cgstAmount; // From DB
if (Math.abs(frontendTotal - databaseTotal) > 0.01) {
  console.warn('Data sync issue: Frontend and DB amounts differ');
}
```

---

## 4. TESTING REQUIREMENTS

### 4.1 Unit Tests Required

Every calculation and validation must have a test:

```javascript
// test/calculations.test.ts
describe('Rate Calculations', () => {
  test('Challan rate = RM Rate + Job Work Rate', () => {
    const rmRate = 100;
    const annealingCharge = 10;
    const drawCharge = 5;
    const annealingCount = 2;
    const drawPassCount = 3;
    
    const expectedRate = rmRate + (annealingCharge * annealingCount) + (drawCharge * drawPassCount);
    expect(expectedRate).toBe(145);
  });

  test('Invoice rate = Job Work Rate only', () => {
    const annealingCharge = 10;
    const drawCharge = 5;
    const annealingCount = 2;
    const drawPassCount = 3;
    
    const expectedRate = (annealingCharge * annealingCount) + (drawCharge * drawPassCount);
    expect(expectedRate).toBe(35);
  });
});
```

### 4.2 Integration Tests Required

Every API endpoint must be tested with:
- Valid data
- Invalid data
- Edge cases
- Reference validation

```javascript
// test/api.test.ts
describe('Tax Invoice API', () => {
  test('Creates invoice with correct GST amounts', async () => {
    const response = await POST('/api/tax-invoice', {
      outwardChallan: challanId,
      cgstPercentage: 9,
      sgstPercentage: 9,
      igstPercentage: 0,
    });
    
    expect(response.data.cgstAmount).toBe(baseAmount * 0.09);
    expect(response.data.totalAmount).toBeGreaterThan(0);
  });

  test('Rejects invoice without GST configuration', async () => {
    const response = await POST('/api/tax-invoice', {
      outwardChallan: challanIdWithoutGST,
    });
    
    expect(response.success).toBe(false);
    expect(response.error).toContain('GST');
  });
});
```

### 4.3 Data Integrity Tests Required

```javascript
describe('Data Integrity', () => {
  test('GST duplicate index prevents duplicates', async () => {
    await POST('/api/gst-master', { party: partyId, cgst: 9, sgst: 9 });
    
    const secondAttempt = await POST('/api/gst-master', { party: partyId, cgst: 9, sgst: 9 });
    expect(secondAttempt.success).toBe(false);
  });

  test('Coil weight auto-calculates quantity', async () => {
    const item = {
      coilEntries: [
        { coilNumber: 'C1', coilWeight: 100 },
        { coilNumber: 'C2', coilWeight: 200 },
      ]
    };
    
    const expectedQuantity = 300;
    expect(item.coilEntries.reduce((s, c) => s + c.coilWeight, 0)).toBe(expectedQuantity);
  });
});
```

---

## 5. PRE-DEPLOYMENT CHECKLIST

Before deploying ANY change to production:

### 5.1 Code Review
- [ ] All files using the changed field have been updated
- [ ] No console.error or unhandled warnings
- [ ] No TypeScript errors or warnings
- [ ] No linting errors (eslint)
- [ ] Code follows project conventions

### 5.2 Data Consistency
- [ ] Existing records still load without errors
- [ ] Calculations match between frontend/backend/PDF
- [ ] No NaN, null, or undefined in outputs
- [ ] All required fields have defaults or validation
- [ ] No orphaned references exist

### 5.3 Calculation Verification
```javascript
// Before deployment, manually verify:
// 1. Create a test challan with known values
const testChallan = {
  quantity: 100,
  rate: 50, // RM Rate (30) + Job Work (20)
  expectedTotal: 5000
};

// 2. Create an invoice from it
const testInvoice = {
  // Invoice rate should be Job Work only (20)
  expectedRate: 20,
  expectedBaseAmount: 2000
};

// 3. Verify PDF shows correct values
// 4. Verify Report shows correct values
```

### 5.4 Test Coverage
- [ ] All calculation tests passing
- [ ] All validation tests passing
- [ ] All integration tests passing
- [ ] All data integrity tests passing
- [ ] No regression in existing functionality

### 5.5 Performance
- [ ] No N+1 query problems
- [ ] API responses < 500ms for typical requests
- [ ] PDF generation completes < 5 seconds
- [ ] No memory leaks in calculations

---

## 6. DOCUMENTATION REQUIREMENTS

Every change must include:

### 6.1 Code Comments
```javascript
// ✅ REQUIRED: Explain the calculation
// In Challan: Rate = RM Rate (S) + Annealing Charge (A×EA) + Draw Charge (P×EP)
// Example: 100 + (10×2) + (5×3) = 135
const challanRate = rmRate + (annealingCharge * annealingCount) + (drawCharge * drawPassCount);

// ✅ REQUIRED: Explain why this matters
// This field is critical for stock tracking and must be kept in sync
```

### 6.2 Commit Message
```
fix: issue title

## Problem
What was broken and why

## Root Cause
Why it happened

## Solution
What was changed and how

## Affected Areas
- Model: fields changed
- API: endpoints affected
- UI: components affected
- Calculations: formulas verified

## Testing
- Unit tests: ✅ Passing
- Integration tests: ✅ Passing
- Manual testing: ✅ Verified
- Existing records: ✅ Working

Co-Authored-By: Claude Haiku 4.5 <noreply@anthropic.com>
```

### 6.3 CHANGELOG Entry
```markdown
## [Date] - Change Title

### Added
- New field/feature with detailed description

### Changed
- Modified field/feature with before/after explanation

### Fixed
- Issue with impact analysis

### Affected Modules
- Module 1: specific impact
- Module 2: specific impact

### Testing Results
- ✅ All tests passing
- ✅ Data consistency verified
- ✅ No breaking changes
```

---

## 7. CONTINUOUS MONITORING

### 7.1 Data Quality Checks (Run Daily)
```javascript
// scripts/daily-checks.ts
export async function runDailyQualityChecks() {
  const checks = {
    // Check for NaN values
    nanInvoiceAmounts: await TaxInvoice.countDocuments({ totalAmount: NaN }),
    
    // Check for orphaned references
    orphanedInvoices: await checkOrphanedReferences(),
    
    // Check for duplicate GST entries
    duplicateGST: await checkDuplicateGST(),
    
    // Check calculation consistency
    mismatchedCalculations: await checkCalculationSync(),
    
    // Check for null required fields
    nullRequiredFields: await checkNullFields(),
  };
  
  // Alert if issues found
  if (Object.values(checks).some(count => count > 0)) {
    sendAlert('Data quality issues detected!', checks);
  }
  
  return checks;
}
```

### 7.2 Calculation Verification (Run Weekly)
```javascript
// scripts/verify-calculations.ts
export async function verifyAllCalculations() {
  const invoices = await TaxInvoice.find().limit(100);
  
  for (const invoice of invoices) {
    // Recalculate from scratch
    const expectedTotal = calculateTotalFromItems(invoice.items, invoice.cgstPercentage, invoice.sgstPercentage);
    
    // Compare with stored value
    if (Math.abs(expectedTotal - invoice.totalAmount) > 0.01) {
      console.error(`Calculation mismatch in invoice ${invoice.invoiceNumber}:`, {
        expected: expectedTotal,
        actual: invoice.totalAmount,
        difference: expectedTotal - invoice.totalAmount
      });
    }
  }
}
```

### 7.3 Sync Verification (Run on Every Deploy)
```javascript
// scripts/verify-sync.ts
export async function verifySyncAcrossLayers() {
  // Test 1: Model → API Sync
  const testData = { party: validPartyId, cgst: 9, sgst: 9 };
  const created = await POST('/api/gst-master', testData);
  const retrieved = await GET(`/api/gst-master/${created.data._id}`);
  assertDeepEqual(created.data, retrieved.data);
  
  // Test 2: API → UI Sync
  const uiData = await fetchFromUI();
  const apiData = await GET('/api/gst-master');
  assertDataMatches(uiData, apiData);
  
  // Test 3: Calculation Sync
  const frontendCalc = calculateInFrontend(testItem);
  const backendCalc = await POST('/api/calculate', testItem);
  assertNumbersEqual(frontendCalc, backendCalc.result, 0.01);
  
  console.log('✅ All sync checks passed!');
}
```

---

## 8. BRANCHING & MERGE STRATEGY

### 8.1 Branch Naming
```
feature/module-description    # New features
fix/issue-description         # Bug fixes
refactor/component-name       # Code refactoring
test/feature-description      # Tests only
docs/section-name             # Documentation
```

### 8.2 Merge Requirements
Before merging to main:
- [ ] All tests passing (locally + CI/CD)
- [ ] Code review approved by at least 1 person
- [ ] Pre-deployment checklist completed
- [ ] No conflicts with main branch
- [ ] Commit message follows standards
- [ ] Data migration (if needed) tested

### 8.3 Pull Request Template
```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Related Issues
Fixes #123

## Changes Made
- Change 1
- Change 2

## Modules Affected
- Model: [list]
- API: [list]
- UI: [list]

## Testing Done
- [ ] Unit tests
- [ ] Integration tests
- [ ] Manual testing
- [ ] Data consistency verified

## Screenshots/Logs
[If applicable]

## Checklist
- [ ] My changes follow the style guide
- [ ] I have updated documentation
- [ ] My changes do not introduce new warnings
- [ ] I have added tests that prove my fix/feature works
- [ ] New and existing unit tests pass locally
- [ ] Calculations verified with manual testing
```

---

## 9. ISSUE DETECTION & PREVENTION

### 9.1 Common Issues Checklist
Before completing any work, verify these issues won't occur:

- [ ] **NaN Calculations**: All calculations have fallbacks `|| 0`
- [ ] **Null References**: All references validated before use
- [ ] **Missing Fields**: All fields sent to API are received and used
- [ ] **Stale Data**: Frontend data matches database after refresh
- [ ] **Orphaned Records**: Deletes don't break references
- [ ] **Duplicate Entries**: Unique constraints properly set
- [ ] **Wrong Types**: All data types match (string vs ObjectId)
- [ ] **Rounding Issues**: Tax calculations use consistent precision
- [ ] **API Timeouts**: Large queries paginated or optimized
- [ ] **PDF Blank Values**: All displayed values have null checks

### 9.2 Red Flags During Development
Stop and review if you see:
- ⚠️ A field in database but not in API response
- ⚠️ A calculation in frontend but different in backend
- ⚠️ No validation before saving data
- ⚠️ A value that could be NaN or null
- ⚠️ A reference that isn't checked for existence
- ⚠️ A change in one file that doesn't update related files
- ⚠️ A PDF showing different value than database
- ⚠️ An API endpoint returning old calculated value

---

## 10. ROLLBACK PROCEDURE

If a deployment breaks production:

### 10.1 Immediate Actions
```bash
# 1. Identify the breaking commit
git log --oneline -10

# 2. Revert to last good commit
git revert <breaking-commit>
git push origin main

# 3. Notify team
# Send message with: what broke, when, what's being rolled back

# 4. Check data consistency
npm run scripts:verify-sync
npm run scripts:daily-checks
```

### 10.2 Post-Mortem
```markdown
## What Broke
[Description of issue]

## Root Cause
[Why it happened]

## Impact
[How long it was down, what was affected]

## Prevention
[What process would have caught this]

## Action Items
- [ ] Item 1
- [ ] Item 2
```

---

## 11. QUICK REFERENCE - BEFORE YOU CODE

**Always ask yourself:**

1. **Is this field used elsewhere?**
   - Search codebase for field name
   - Update all occurrences

2. **Will this calculation change?**
   - Update frontend formula
   - Update backend pre-save hook
   - Verify PDF shows correct value
   - Test with known values

3. **Am I breaking existing data?**
   - Test with old records
   - Ensure backward compatibility
   - Plan migrations if needed

4. **Is this validated everywhere?**
   - Check input validation
   - Check database validation
   - Check reference validation
   - Check calculation validation

5. **Did I update documentation?**
   - Add code comments
   - Update CHANGELOG
   - Document breaking changes
   - Provide migration guide

---

## 12. MONITORING DASHBOARD

Create a simple dashboard to monitor:

```javascript
// components/HealthCheck.tsx
export function HealthCheckDashboard() {
  const [health, setHealth] = useState({
    gstDuplicates: 0,
    orphanedRecords: 0,
    calculationMismatches: 0,
    nanValues: 0,
    nullRequired: 0,
    lastChecked: null,
  });

  useEffect(() => {
    // Run checks every hour
    const interval = setInterval(async () => {
      const result = await fetch('/api/health/checks');
      setHealth(await result.json());
    }, 3600000);
    
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="grid grid-cols-3 gap-4 p-4">
      <Metric label="GST Duplicates" value={health.gstDuplicates} />
      <Metric label="Orphaned Records" value={health.orphanedRecords} />
      <Metric label="Calc Mismatches" value={health.calculationMismatches} />
      <Metric label="NaN Values" value={health.nanValues} />
      <Metric label="Null Required" value={health.nullRequired} />
      <Metric label="Last Checked" value={health.lastChecked} />
    </div>
  );
}
```

---

## Summary

**Every change must ensure:**
✅ Model, API, and UI are in sync  
✅ Calculations are consistent everywhere  
✅ Data is validated before saving  
✅ No NaN, null, or undefined values  
✅ All tests pass  
✅ Documentation is updated  
✅ Existing records still work  
✅ No orphaned references exist  

**This prevents issues and maintains software stability in production.**
