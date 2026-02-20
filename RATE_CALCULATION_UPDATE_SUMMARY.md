# RATE_CALCULATION_UPDATE_SUMMARY

## Overview
Implemented dynamic rate calculation logic in Outward Challan and updated Party Master with new rate fields.

## 1. Party Master Updates
- Added `sappdRate` (SAPPD Rate ₹/kg)
- Added `ppdFixedRate` (PPD Fixed Rate ₹/kg)
- Updated UI to include these fields in Add/Edit forms and the main table
- Updated Type definitions and Mongoose Schema

## 2. Dynamic Rate Calculation (Outward Challan)
- **Formula**: `Final Rate = S + (A × EA) + (P × EP)`
  - `S`: SAPPD Rate (or Base Rate if not set)
  - `A`: Annealing Charge
  - `P`: Draw/Pass Charge
  - `EA`: Extra Annealing Count
  - `EP`: Extra Pass Count

- **UI Implementation**:
  - Added "Extra Annealing (EA)" input
  - Added "Extra Pass (EP)" input
  - Rate field is now **Auto-Calculated** by default
  - Added **Override** checkbox to manually edit rate if needed
  - Added **Tooltip** (ℹ️) next to Rate label showing the live formula breakdown

## 3. Persistent Fields
- Added `extraAnnealingCount` and `extraPassCount` to `OutwardChallan` schema to persist these values.
- Updated `IOutwardChallanItem` interface.

## 4. Coil Number Input
- Removed the restrictive 5-digit 8-block input.
- Replaced with a flexible, single text input field that accepts any format/length.

## 5. Validation
- All rate fields default to 0 and must be non-negative.
- EA/EP counts default to 0.

## Files Modified
- `src/models/PartyMaster.ts`
- `src/models/OutwardChallan.ts`
- `src/types/index.ts`
- `src/app/masters/party/page.tsx`
- `src/app/outward-challan/page.tsx`
- `src/components/CoilNumberInput.tsx`
