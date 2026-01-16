# Stock Issue - Visual Explanation

## The Problem in Simple Terms

```
┌─────────────────────────────────────────────────────────────┐
│                    WHAT WAS HAPPENING                        │
└─────────────────────────────────────────────────────────────┘

Step 1: GRN Creates Stock
┌──────────────────────┐
│ Stock in Database    │
│ ─────────────────    │
│ category: "RM"       │
│ size: "67abc123..."  │  ← Item ID (string)
│ quantity: 30         │
└──────────────────────┘

Step 2: API Fetches Stock with .populate('size')
┌──────────────────────────────────────────────┐
│ Stock Returned to Frontend                   │
│ ──────────────────────────────────           │
│ category: "RM"                               │
│ size: {                                      │  ← OBJECT!
│   _id: "67abc123...",                        │
│   itemCode: "RM-3000-10B21-MK3W39A3",       │
│   size: "30.00",                             │
│   grade: "10B21",                            │
│   category: "RM"                             │
│ }                                            │
│ quantity: 30                                 │
└──────────────────────────────────────────────┘

Step 3: Comparison in getStockForItem()
┌─────────────────────────────────────────────┐
│ BEFORE FIX (BROKEN)                         │
│ ───────────────────                         │
│                                             │
│ Searching for: "67abc123..."                │
│                                             │
│ Comparing:                                  │
│   String(s.size) === String(itemId)        │
│   String({...})  === "67abc123..."         │
│   "[object Object]" === "67abc123..."      │
│   ❌ FALSE - NO MATCH!                      │
│                                             │
│ Result: Stock not found → 0.00 Kgs          │
└─────────────────────────────────────────────┘

┌─────────────────────────────────────────────┐
│ AFTER FIX (WORKING)                         │
│ ──────────────────                          │
│                                             │
│ Searching for: "67abc123..."                │
│                                             │
│ Comparing:                                  │
│   stockSizeId = (typeof s.size === 'object')│
│                 ? s.size._id                │
│                 : s.size                    │
│                                             │
│   stockSizeId = "67abc123..."               │
│   "67abc123..." === "67abc123..."           │
│   ✅ TRUE - MATCH FOUND!                    │
│                                             │
│ Result: Stock found → 30.00 Kgs             │
└─────────────────────────────────────────────┘
```

## The Fix in Code

### Before (Broken):
```typescript
const stock = stocks.find((s) => String(s.size) === String(itemId));
// When s.size is an object, String(s.size) = "[object Object]"
// This never matches itemId!
```

### After (Fixed):
```typescript
const stock = stocks.find((s) => {
  const stockSizeId = typeof s.size === 'object' && s.size !== null 
    ? String((s.size as any)._id)  // Extract _id from populated object
    : String(s.size);               // Use string directly
  return stockSizeId === String(itemId);
});
// Now it correctly extracts the ID and matches!
```

## Why .populate() Caused This

```javascript
// Without .populate('size')
Stock.find()
→ [{ size: "67abc123...", quantity: 30 }]
     ↑ String ID

// With .populate('size')  
Stock.find().populate('size')
→ [{ size: { _id: "67abc123...", itemCode: "...", ... }, quantity: 30 }]
     ↑ Full Item Object
```

The `.populate()` method replaces the ID reference with the full document, which is great for displaying item details but breaks simple ID comparisons!

## Console Output You'll See

### When Page Loads:
```
📊 [Stock Data] Loaded RM stocks: 3
  Sample stock entry: {
    sizeType: "populated object",  ← Confirms the issue
    sizeId: "67abc123...",          ← The ID we extract
    sizeDetails: "RM-3000-10B21-MK3W39A3 - 30.00"
  }
```

### When Selecting RM Item:
```
🔍 [Stock Lookup] {
  searchingFor: "67abc123...",
  foundStock: "Yes (30 Kgs)",      ← SUCCESS!
  stockSizeType: "populated object"
}
```

## Summary

**Problem**: Populated `size` field was an object, not a string  
**Symptom**: Stock lookup always returned 0  
**Solution**: Extract `_id` from object when comparing  
**Result**: Stock now displays correctly! ✅
