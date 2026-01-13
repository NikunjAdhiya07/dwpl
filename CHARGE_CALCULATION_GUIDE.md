# Annealing & Draw Charge Calculation Guide

## How Charges Are Calculated

### Overview
The Outward Challan system automatically calculates charges based on:
1. **Party Master** - Stores the charge rates per party
2. **Process Counts** - Annealing and Draw counts selected for each item
3. **Quantity** - Amount being processed

---

## Charge Formula

### For Each Item:

```
Material Cost = Quantity × Rate

Annealing Cost = Annealing Charge × Quantity × Annealing Count

Draw Cost = Draw Charge × Quantity × Draw Pass Count

Item Total = Material Cost + Annealing Cost + Draw Cost
```

### Example Calculation:

**Party**: ABC Industries
- Rate: ₹50/unit
- Annealing Charge: ₹2/unit
- Draw Charge: ₹1.5/pass

**Item Details**:
- Quantity: 100 units
- Annealing Count: 5
- Draw Pass Count: 3

**Calculation**:
```
Material Cost = 100 × 50 = ₹5,000
Annealing Cost = 2 × 100 × 5 = ₹1,000
Draw Cost = 1.5 × 100 × 3 = ₹450
Item Total = 5,000 + 1,000 + 450 = ₹6,450
```

---

## How to Use

### Step 1: Set Up Party Master

1. Go to **Masters → Party Master**
2. Add or Edit a party
3. Set these fields:
   - **Rate**: Base rate per unit (e.g., ₹50)
   - **Annealing Charge**: Charge per unit per annealing pass (e.g., ₹2)
   - **Draw Charge**: Charge per unit per draw pass (e.g., ₹1.5)
   - **Annealing Max**: Maximum annealing count allowed (1-10)
   - **Draw Max**: Maximum draw count allowed (1-8)

### Step 2: Create Outward Challan

1. Go to **Outward Challan**
2. Click **Create Challan**
3. **Select Party** - This is REQUIRED first
   - Charges are automatically pulled from Party Master
   - Annealing and Draw limits are set based on party

4. **Add Items**:
   - Click "Add Item"
   - Each item automatically gets:
     - Rate from party
     - Annealing Charge from party
     - Draw Charge from party
   
5. **For Each Item**:
   - Select Finish Size (FG)
   - Select Original Size (RM)
   - **Select Annealing Count** (1 to party's max)
   - **Select Draw Count** (1 to party's max)
   - Enter Quantity
   - Rate is pre-filled (can be changed if needed)
   - **Item Total is calculated automatically**

6. **Review Grand Total** - Sum of all items

7. **Submit** - Stock is updated automatically

---

## Dropdown Behavior

### Annealing Count Dropdown
- **Range**: 1 to party's `annealingMax`
- **Default**: If party has `annealingMax = 7`, dropdown shows 1, 2, 3, 4, 5, 6, 7
- **Fallback**: If party doesn't have `annealingMax`, defaults to 1-10

### Draw Pass Count Dropdown
- **Range**: 1 to party's `drawMax`
- **Default**: If party has `drawMax = 5`, dropdown shows 1, 2, 3, 4, 5
- **Fallback**: If party doesn't have `drawMax`, defaults to 1-8

---

## Troubleshooting

### Issue: Dropdowns are empty

**Solution**:
1. **Select a party first** - Dropdowns won't populate until a party is selected
2. **Check Party Master** - Ensure the party has `annealingMax` and `drawMax` set
3. **Update existing parties**:
   - Go to Party Master
   - Edit each party
   - Set Annealing Max (e.g., 10)
   - Set Draw Max (e.g., 8)
   - Save

### Issue: Charges are not calculating

**Solution**:
1. **Check Party Master** - Ensure party has:
   - Annealing Charge set (e.g., ₹2)
   - Draw Charge set (e.g., ₹1.5)
2. **Check item details** - Ensure:
   - Quantity > 0
   - Annealing Count selected
   - Draw Count selected

### Issue: Can't add items

**Solution**:
- **Select a party first** - The "Add Item" button is disabled until a party is selected
- This ensures charges are available for calculation

---

## Visual Indicators

### In the Form:

**Party Selection**:
```
Party: ABC Industries
Helper text: Annealing Max: 10 | Draw Max: 8
```

**Each Item**:
```
Item 1
Annealing: ₹2/unit | Draw: ₹1.5/pass

[FG Selector] [RM Selector]
[Annealing Count (1-10)] [Draw Count (1-8)]
[Quantity] [Rate]

Item Total: ₹6,450
```

**Grand Total**:
```
Grand Total: ₹12,900
(Sum of all items)
```

---

## Best Practices

### 1. Set Up Parties Correctly
- Always set Annealing Charge and Draw Charge
- Set realistic Annealing Max and Draw Max values
- Different parties can have different limits

### 2. Verify Calculations
- Check the item total after entering quantity
- Verify the formula: Material + Annealing + Draw
- Grand total should match sum of all items

### 3. Use Appropriate Process Counts
- Annealing Count: Depends on material and process
- Draw Count: Depends on wire drawing requirements
- Stay within party's max limits

### 4. Update Existing Parties
- If you have old parties without max values:
  - Edit each party
  - Set Annealing Max = 10 (or appropriate value)
  - Set Draw Max = 8 (or appropriate value)
  - This ensures dropdowns work correctly

---

## Example Workflow

### Creating a Multi-Item Challan

**Party**: XYZ Manufacturing
- Rate: ₹45/unit
- Annealing Charge: ₹1.8/unit
- Draw Charge: ₹1.2/pass
- Annealing Max: 7
- Draw Max: 5

**Item 1**:
- FG: FG-0001 (2.5mm SS304)
- RM: RM-0001 (3.0mm SS304)
- Annealing: 5
- Draw: 3
- Quantity: 150
- Rate: ₹45

**Calculation**:
```
Material: 150 × 45 = ₹6,750
Annealing: 1.8 × 150 × 5 = ₹1,350
Draw: 1.2 × 150 × 3 = ₹540
Item 1 Total: ₹8,640
```

**Item 2**:
- FG: FG-0002 (2.0mm SS304)
- RM: RM-0002 (2.5mm SS304)
- Annealing: 4
- Draw: 2
- Quantity: 200
- Rate: ₹45

**Calculation**:
```
Material: 200 × 45 = ₹9,000
Annealing: 1.8 × 200 × 4 = ₹1,440
Draw: 1.2 × 200 × 2 = ₹480
Item 2 Total: ₹10,920
```

**Grand Total**: ₹8,640 + ₹10,920 = **₹19,560**

---

## Summary

✅ **Charges are party-specific** - Set in Party Master  
✅ **Dropdowns are party-limited** - Based on annealingMax and drawMax  
✅ **Calculations are automatic** - Real-time updates  
✅ **Multiple items supported** - Each with own process counts  
✅ **Stock managed automatically** - For all items  

**Remember**: Always select a party first before adding items!

---

**Last Updated**: 2026-01-13  
**System**: Multi-Item Outward Challan  
**Status**: Live and Running
