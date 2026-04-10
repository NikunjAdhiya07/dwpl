# System Maintenance & Future-Proofing Guide

**Purpose:** Keep the software stable, reliable, and maintainable for future changes

---

## 📊 System Overview

### Architecture Layers
```
┌─────────────────────────────────────────────────────────┐
│  UI/Frontend (React Components)                          │
│  - Displays data                                         │
│  - Accepts user input                                    │
│  - Performs frontend calculations                        │
└─────────────────────────────────────────────────────────┘
                          ↕
┌─────────────────────────────────────────────────────────┐
│  API Layer (Next.js Routes)                              │
│  - Validates input                                       │
│  - Checks references                                     │
│  - Creates/updates/deletes data                          │
└─────────────────────────────────────────────────────────┘
                          ↕
┌─────────────────────────────────────────────────────────┐
│  Database (MongoDB)                                      │
│  - Stores data                                           │
│  - Enforces schemas                                      │
│  - Runs pre-save hooks                                   │
└─────────────────────────────────────────────────────────┘
```

### Critical Data Flows

**Challan Flow:**
```
PartyMaster (charges) → OutwardChallan Item
                       (Rate = RM Rate + Job Work)
                       → Stock Management
```

**Invoice Flow:**
```
OutwardChallan → TaxInvoice
                 (Rate = Job Work only)
                 → GST Master (lookup)
                 → Calculation Hook (tax)
                 → Final Amount
```

---

## 🔧 Key Components to Monitor

### 1. Calculation Engines

#### Challan Rate
**Location:** `src/app/outward-challan/page.tsx` line 419
```javascript
// MUST keep in sync everywhere
challanRate = S + (A × EA) + (P × EP)
// S = RM Rate, A = Annealing Charge, P = Draw Charge
// EA = Annealing Count, EP = Draw Pass Count
```

**Where Used:**
- Frontend display
- Backend calculation
- PDF export
- Reports

**If Changed:**
- Update in all 4 places above
- Run calculation tests
- Verify PDF values
- Check report totals

#### Invoice Rate
**Location:** `src/models/TaxInvoice.ts` line 216
```javascript
// MUST be different from challan rate
invoiceRate = (A × EA) + (P × EP)
// No RM Rate included
```

**Where Used:**
- Invoice PDF
- Invoice amounts
- Reports

**If Changed:**
- Ensure challan rate NOT affected
- Update pre-save hook
- Verify totals change correctly

### 2. GST Module

**Files:**
- `src/models/GSTMaster.ts` - Schema with unique index
- `src/app/api/gst-master/route.ts` - Create/Read
- `src/app/api/gst-master/[id]/route.ts` - Update/Delete
- `src/app/masters/gst/page.tsx` - UI

**Critical Rules:**
- One GST entry per party (enforced by unique index)
- CGST + SGST for intra-state, IGST for inter-state
- All percentages must be between 0-100
- Cannot have both CGST/SGST and IGST at same time

**If Changed:**
- Verify unique index still works
- Check invoice GST calculations
- Test with old records
- Validate UI dropdown updates

### 3. Coil Weight System

**Location:** `src/models/OutwardChallan.ts` CoilEntrySchema
```javascript
{
  coilNumber: String,
  coilWeight: Number  // Critical field
}
```

**Usage:**
- Coil entries array in items
- Auto-calculates quantity
- Displayed in challan PDF
- Preserved in invoice

**If Changed:**
- Update PDF display
- Verify quantity calculation
- Check invoice coil references
- Test weight precision

### 4. Data References

**Critical References:**
```
Invoice → Challan → Items → Finish Size & Original Size
      ↓
    Party → GST Master
```

**If Changed:**
- Check for orphaned records
- Verify population queries
- Test delete cascades
- Update validation checks

---

## 🛡️ Daily Maintenance Tasks

### Morning Check (Daily)
```bash
# Run health checks
curl http://localhost:3000/api/health/checks

# Check logs for errors
tail -f logs/error.log

# Verify database connection
npm run db:status
```

### Weekly Tasks (Every Monday)
```bash
# Verify calculations on sample invoices
npm run scripts:verify-calculations

# Check for orphaned references
npm run scripts:check-orphans

# Backup database
npm run db:backup

# Review error logs
grep ERROR logs/*.log
```

### Monthly Tasks (1st of month)
```bash
# Full data integrity check
npm run scripts:comprehensive-validation

# Performance analysis
npm run scripts:analyze-performance

# Audit recent changes
git log --oneline -30 | head -10

# Check for unused code
npm run lint:unused
```

---

## 🚨 Early Warning Signs

If you see these, investigate immediately:

### ⚠️ Warning Signs
1. **NaN in invoice amounts** → Calculation error
2. **Zero grand totals** → GST not saved
3. **Missing coil weights** → Database corruption
4. **Slow API responses** → Index missing or N+1 query
5. **Duplicate GST errors** → Index issue
6. **Orphaned invoices** → Reference broken

### Critical Issues
| Issue | Cause | Fix | Impact |
|-------|-------|-----|--------|
| NaN totals | Null calculation | Check pre-save hook | High |
| Zero GST | Not passed to API | Verify handleSubmit | High |
| Slow queries | Missing index | Add index, rebuild | Medium |
| Duplicates | Unique constraint | Drop + recreate | High |
| Orphans | Delete cascade | Restore backup | High |

---

## 📈 Scaling Considerations

### When Database Gets Large (100K+ records)

**Performance Issues:**
```javascript
// BAD: This will be slow with large data
const invoices = await TaxInvoice.find();

// GOOD: Use pagination
const invoices = await TaxInvoice.find()
  .skip((page - 1) * pageSize)
  .limit(pageSize)
  .sort({ createdAt: -1 });
```

**Index Strategy:**
```javascript
// Required indexes for performance
TaxInvoice.index({ party: 1, invoiceDate: -1 });
TaxInvoice.index({ outwardChallan: 1 });
GSTMaster.index({ party: 1 }, { unique: true });
OutwardChallan.index({ party: 1, challanDate: -1 });
```

**Archiving Old Records:**
```javascript
// Archive invoices older than 2 years
const archiveDate = new Date();
archiveDate.setFullYear(archiveDate.getFullYear() - 2);

const oldInvoices = await TaxInvoice.find({ invoiceDate: { $lt: archiveDate } });
// Move to archive collection or export to file
```

---

## 🔄 Change Management Process

### Before Making ANY Change

1. **Analyze Impact**
   ```
   What fields changed? → Which files use this field?
   What calculations changed? → Where are they used?
   Is this backward compatible? → Will old data break?
   ```

2. **Create Test Case**
   ```javascript
   // Test with known values
   const testData = { ... };
   const result = performChange(testData);
   assert(result === expectedValue);
   ```

3. **Update All Locations**
   - Model (if schema changed)
   - API (if data changed)
   - UI (if display changed)
   - Tests (if logic changed)
   - Documentation (always)

4. **Verify Sync**
   ```bash
   # Run sync check
   curl http://localhost:3000/api/health/checks
   
   # Should show all OK
   ```

5. **Deploy with Checklist**
   - [ ] All tests pass
   - [ ] No type errors
   - [ ] Data integrity verified
   - [ ] Backward compatible
   - [ ] Documentation updated
   - [ ] Team notified

---

## 📚 Documentation To Maintain

### Always Update:
1. **Code Comments** - Explain WHY, not WHAT
2. **Commit Messages** - Detailed description of changes
3. **CHANGELOG.md** - What changed and why
4. **README.md** - How to set up and run
5. **This Guide** - System architecture and flows

### Example Comment:
```javascript
// ✅ GOOD
// Rate for job work invoice must exclude RM cost.
// This is critical for financial accuracy in invoicing.
// Formula: (Annealing Charge × Count) + (Draw Charge × Count)
const invoiceRate = (annealingCharge * count) + (drawCharge * drawPassCount);

// ❌ BAD
// Calculate rate
const rate = a + b;
```

---

## 🧪 Testing Strategy

### Unit Tests (Quick)
```bash
npm run test:unit
```
- Calculate: Rate = S + (A×EA) + (P×EP) ✓
- Validate: Quantity > 0 ✓
- Format: Currency rounds correctly ✓

### Integration Tests (Thorough)
```bash
npm run test:integration
```
- Create challan with items ✓
- Create invoice from challan ✓
- Verify GST calculation ✓
- Export PDF and verify ✓

### End-to-End Tests (Production-like)
```bash
npm run test:e2e
```
- User creates party ✓
- User adds GST ✓
- User creates challan ✓
- User creates invoice ✓
- PDF generated and correct ✓

---

## 🔐 Data Backup Strategy

### Daily Backup
```bash
# Automated daily backup at 2 AM
0 2 * * * npm run db:backup

# Store in
/backups/daily/invoice-db-$(date +%Y%m%d).dump
```

### Weekly Backup
```bash
# Full backup every Sunday
0 3 * * 0 npm run db:full-backup
```

### Recovery Procedure
```bash
# If disaster occurs:
mongorestore --archive=/backups/daily/invoice-db-20240115.dump

# Verify restore
npm run scripts:verify-data-integrity

# Check health
curl http://localhost:3000/api/health/checks
```

---

## 🎯 Performance Targets

### API Response Times
| Endpoint | Target | Current |
|----------|--------|---------|
| GET /invoices | < 1s | ? |
| POST /invoice | < 500ms | ? |
| PUT /invoice | < 500ms | ? |
| DELETE /invoice | < 500ms | ? |

### Database Queries
| Operation | Target | Current |
|-----------|--------|---------|
| Single lookup | < 10ms | ? |
| List (100) | < 100ms | ? |
| Calculation | < 50ms | ? |
| Aggregation | < 500ms | ? |

### Monitor with:
```bash
# Dashboard at localhost:3000/admin/performance
npm run start:with-monitoring
```

---

## 🚀 Deployment Automation

### Pre-deployment Script
```bash
#!/bin/bash
# scripts/pre-deploy.sh

echo "🔍 Running pre-deployment checks..."

# Tests
npm test || { echo "❌ Tests failed"; exit 1; }

# Type check
npm run type-check || { echo "❌ Type errors"; exit 1; }

# Lint
npm run lint || { echo "❌ Lint errors"; exit 1; }

# Build
npm run build || { echo "❌ Build failed"; exit 1; }

# Data validation
npm run scripts:verify-sync || { echo "❌ Data sync issues"; exit 1; }

echo "✅ All checks passed! Ready to deploy."
```

### Automated Deployment
```yaml
# .github/workflows/deploy.yml
name: Deploy to Production

on:
  push:
    branches: [ main ]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - run: npm ci
      - run: npm test
      - run: npm run build
      - run: npm run scripts:verify-sync
      - name: Deploy
        run: |
          # Deploy to production
          # Notify team
          # Run post-deploy checks
```

---

## 📖 How to Troubleshoot

### Symptom: Zero GST Amounts in Invoice

**Root Cause Investigation:**
```javascript
// 1. Check if GST was passed to API
console.log('Request body:', req.body.cgstPercentage);

// 2. Check if GST saved in database
const invoice = await TaxInvoice.findById(id);
console.log('Saved GST:', invoice.cgstPercentage);

// 3. Check pre-save hook
// In TaxInvoice model, line 232
console.log('CGSTAmount calculated:', cgstAmount);

// 4. Check PDF display
// In JobWorkInvoicePrintView, line 267
console.log('PDF shows:', invoice.cgstAmount);
```

**Solution:**
1. Verify `handleSubmit` passes GST percentages ✓
2. Verify API accepts and saves them ✓
3. Verify pre-save hook uses them ✓
4. Verify PDF displays saved values ✓

---

## 📞 Getting Help

### When Something Breaks

1. **Check the logs:** `npm run logs`
2. **Check the health:** `curl /api/health/checks`
3. **Review recent changes:** `git log --oneline -5`
4. **Identify affected module:** Model/API/UI?
5. **Run appropriate tests:** `npm run test:unit/integration`
6. **Review this guide:** Search for issue

### Contact Points
- **Code Issues:** Review code quality standards
- **Data Issues:** Check maintenance guide
- **Performance:** Check performance targets
- **Deployments:** Follow deployment checklist

---

## 🎓 Team Knowledge Transfer

### Essential Knowledge
Every team member should know:
1. System architecture (3-layer model)
2. Critical calculations (challan vs invoice rates)
3. Data flow (how data moves between layers)
4. Common issues (what can go wrong)
5. Recovery procedures (how to fix issues)

### Documentation Location
- Code standards: `CODE_QUALITY_STANDARDS.md`
- Deployment: `DEPLOYMENT_CHECKLIST.md`
- Maintenance: `MAINTENANCE_GUIDE.md` (this file)
- API docs: Run `npm run docs`
- Database schema: `src/models/`

---

## ✅ Success Metrics

Your system is healthy when:
- ✅ All health checks pass daily
- ✅ API response times < target
- ✅ Zero NaN values in calculations
- ✅ Zero orphaned references
- ✅ Zero duplicate GST entries
- ✅ All tests pass before deployment
- ✅ Zero downtime > 1 minute/month
- ✅ Zero lost data incidents

---

## 🎉 Final Checklist

- [ ] This guide is printed/bookmarked
- [ ] All team members read it
- [ ] Health check endpoint works
- [ ] Backup system is running
- [ ] Pre-deploy script configured
- [ ] Performance monitoring active
- [ ] Error alerting configured
- [ ] Documentation up to date

**Last Updated:** Today  
**Next Review:** Monthly  
**Owner:** Development Team
