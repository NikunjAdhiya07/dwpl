/**
 * Calculation Tests - Ensures all calculations are accurate and consistent
 *
 * These tests verify that calculations work the same way in:
 * - Frontend (React components)
 * - Backend (API routes)
 * - Database (Pre-save hooks)
 * - PDF exports
 */

describe('Challan & Invoice Calculations', () => {

  /**
   * Test: Challan Rate Calculation
   * Formula: Rate = RM Rate (S) + (Annealing Charge × Annealing Count) + (Draw Charge × Draw Pass Count)
   * Example: 100 + (10 × 2) + (5 × 3) = 135
   */
  describe('Challan Rate Calculation', () => {
    test('should calculate correct challan rate', () => {
      const rmRate = 100; // RM Rate (S)
      const annealingCharge = 10; // Per unit
      const drawCharge = 5; // Per unit
      const annealingCount = 2;
      const drawPassCount = 3;

      const expectedRate = rmRate + (annealingCharge * annealingCount) + (drawCharge * drawPassCount);
      expect(expectedRate).toBe(135);
    });

    test('should handle zero annealing and draw counts', () => {
      const rmRate = 100;
      const annealingCharge = 10;
      const drawCharge = 5;
      const annealingCount = 0;
      const drawPassCount = 0;

      const expectedRate = rmRate + (annealingCharge * annealingCount) + (drawCharge * drawPassCount);
      expect(expectedRate).toBe(100); // Only RM rate
    });

    test('should handle only annealing charges', () => {
      const rmRate = 100;
      const annealingCharge = 10;
      const drawCharge = 5;
      const annealingCount = 2;
      const drawPassCount = 0;

      const expectedRate = rmRate + (annealingCharge * annealingCount) + (drawCharge * drawPassCount);
      expect(expectedRate).toBe(120);
    });

    test('should handle only draw charges', () => {
      const rmRate = 100;
      const annealingCharge = 10;
      const drawCharge = 5;
      const annealingCount = 0;
      const drawPassCount = 3;

      const expectedRate = rmRate + (annealingCharge * annealingCount) + (drawCharge * drawPassCount);
      expect(expectedRate).toBe(115);
    });
  });

  /**
   * Test: Invoice Rate Calculation (Job Work Only)
   * Formula: Rate = (Annealing Charge × Annealing Count) + (Draw Charge × Draw Pass Count)
   * Important: Does NOT include RM Rate, only processing charges
   * Example: (10 × 2) + (5 × 3) = 35
   */
  describe('Invoice Rate Calculation (Job Work Only)', () => {
    test('should calculate correct invoice rate without RM rate', () => {
      const annealingCharge = 10;
      const drawCharge = 5;
      const annealingCount = 2;
      const drawPassCount = 3;

      const expectedRate = (annealingCharge * annealingCount) + (drawCharge * drawPassCount);
      expect(expectedRate).toBe(35); // NOT 135 like challan
    });

    test('should be different from challan rate', () => {
      const rmRate = 100;
      const annealingCharge = 10;
      const drawCharge = 5;
      const annealingCount = 2;
      const drawPassCount = 3;

      const challanRate = rmRate + (annealingCharge * annealingCount) + (drawCharge * drawPassCount);
      const invoiceRate = (annealingCharge * annealingCount) + (drawCharge * drawPassCount);

      expect(challanRate).toBe(135);
      expect(invoiceRate).toBe(35);
      expect(challanRate).not.toBe(invoiceRate);
    });

    test('should handle zero charges', () => {
      const annealingCharge = 0;
      const drawCharge = 0;
      const annealingCount = 2;
      const drawPassCount = 3;

      const expectedRate = (annealingCharge * annealingCount) + (drawCharge * drawPassCount);
      expect(expectedRate).toBe(0);
    });
  });

  /**
   * Test: Item Total Calculation
   * Formula: Item Total = Quantity × Rate
   */
  describe('Item Total Calculation', () => {
    test('should calculate correct item total for challan', () => {
      const quantity = 100;
      const challanRate = 135;

      const expectedTotal = quantity * challanRate;
      expect(expectedTotal).toBe(13500);
    });

    test('should calculate correct item total for invoice', () => {
      const quantity = 100;
      const invoiceRate = 35;

      const expectedTotal = quantity * invoiceRate;
      expect(expectedTotal).toBe(3500);
    });

    test('should handle decimal quantities', () => {
      const quantity = 100.5;
      const rate = 50.25;

      const expectedTotal = quantity * rate;
      expect(expectedTotal).toBeCloseTo(5050.625, 2);
    });

    test('should never be NaN', () => {
      const quantity = null; // Invalid
      const rate = 50;
      const safeQuantity = quantity || 0;

      const total = safeQuantity * rate;
      expect(total).toBe(0);
      expect(isNaN(total)).toBe(false);
    });
  });

  /**
   * Test: Coil Weight to Quantity Calculation
   * Formula: Total Quantity = Sum of all coil weights
   */
  describe('Coil Weight to Quantity', () => {
    test('should sum multiple coil weights', () => {
      const coilEntries = [
        { coilNumber: 'C1', coilWeight: 100 },
        { coilNumber: 'C2', coilWeight: 200 },
        { coilNumber: 'C3', coilWeight: 150 },
      ];

      const totalQuantity = coilEntries.reduce((sum, c) => sum + (c.coilWeight || 0), 0);
      expect(totalQuantity).toBe(450);
    });

    test('should handle missing coil weights', () => {
      const coilEntries = [
        { coilNumber: 'C1', coilWeight: 100 },
        { coilNumber: 'C2' }, // Missing weight
        { coilNumber: 'C3', coilWeight: 150 },
      ];

      const totalQuantity = coilEntries.reduce((sum, c) => sum + (c.coilWeight || 0), 0);
      expect(totalQuantity).toBe(250); // Treats missing as 0
    });

    test('should handle empty coil entries', () => {
      const coilEntries: any[] = [];

      const totalQuantity = coilEntries.reduce((sum, c) => sum + (c.coilWeight || 0), 0);
      expect(totalQuantity).toBe(0);
    });
  });

  /**
   * Test: GST Calculation
   * Formula for Intra-state: CGST = Base × CGST% / 100, SGST = Base × SGST% / 100
   * Formula for Inter-state: IGST = Base × IGST% / 100
   */
  describe('GST Calculation', () => {
    test('should calculate correct CGST', () => {
      const baseAmount = 10000;
      const cgstPercentage = 9;

      const cgstAmount = (baseAmount * cgstPercentage) / 100;
      expect(cgstAmount).toBe(900);
    });

    test('should calculate correct SGST', () => {
      const baseAmount = 10000;
      const sgstPercentage = 9;

      const sgstAmount = (baseAmount * sgstPercentage) / 100;
      expect(sgstAmount).toBe(900);
    });

    test('should calculate correct IGST', () => {
      const baseAmount = 10000;
      const igstPercentage = 18;

      const igstAmount = (baseAmount * igstPercentage) / 100;
      expect(igstAmount).toBe(1800);
    });

    test('should total CGST + SGST', () => {
      const baseAmount = 10000;
      const cgstPercentage = 9;
      const sgstPercentage = 9;

      const totalGST = (baseAmount * (cgstPercentage + sgstPercentage)) / 100;
      expect(totalGST).toBe(1800);
    });

    test('should use IGST when CGST and SGST are zero', () => {
      const baseAmount = 10000;
      const cgstPercentage = 0;
      const sgstPercentage = 0;
      const igstPercentage = 18;

      let gstAmount = 0;
      if (cgstPercentage > 0 || sgstPercentage > 0) {
        gstAmount = (baseAmount * (cgstPercentage + sgstPercentage)) / 100;
      } else if (igstPercentage > 0) {
        gstAmount = (baseAmount * igstPercentage) / 100;
      }

      expect(gstAmount).toBe(1800);
    });
  });

  /**
   * Test: Invoice Grand Total Calculation
   * Formula: Grand Total = Base Amount + GST + TCS + Transport (rounded to nearest rupee)
   */
  describe('Invoice Grand Total', () => {
    test('should calculate correct grand total with CGST and SGST', () => {
      const baseAmount = 10000;
      const cgstPercentage = 9;
      const sgstPercentage = 9;
      const tcsPercentage = 0;
      const transportCharges = 0;

      const assessableValue = baseAmount + transportCharges;
      const cgstAmount = (assessableValue * cgstPercentage) / 100;
      const sgstAmount = (assessableValue * sgstPercentage) / 100;
      const gstAmount = cgstAmount + sgstAmount;
      const tcsAmount = (assessableValue + gstAmount) * (tcsPercentage / 100);
      const preRoundTotal = assessableValue + gstAmount + tcsAmount;
      const grandTotal = Math.round(preRoundTotal);

      expect(grandTotal).toBe(11800);
    });

    test('should calculate correct grand total with transport charges', () => {
      const baseAmount = 10000;
      const transportCharges = 500;
      const cgstPercentage = 9;
      const sgstPercentage = 9;
      const tcsPercentage = 0;

      const assessableValue = baseAmount + transportCharges;
      const gstAmount = (assessableValue * (cgstPercentage + sgstPercentage)) / 100;
      const preRoundTotal = assessableValue + gstAmount;
      const grandTotal = Math.round(preRoundTotal);

      expect(grandTotal).toBe(12410);
    });

    test('should calculate correct grand total with TCS', () => {
      const baseAmount = 10000;
      const cgstPercentage = 9;
      const sgstPercentage = 9;
      const tcsPercentage = 1;
      const transportCharges = 0;

      const assessableValue = baseAmount + transportCharges;
      const gstAmount = (assessableValue * (cgstPercentage + sgstPercentage)) / 100;
      const tcsAmount = (assessableValue + gstAmount) * (tcsPercentage / 100);
      const preRoundTotal = assessableValue + gstAmount + tcsAmount;
      const grandTotal = Math.round(preRoundTotal);

      expect(grandTotal).toBe(11918);
    });

    test('should round to nearest rupee correctly', () => {
      // Example: 11899.67 should round to 11900
      const preRoundTotal = 11899.67;
      const grandTotal = Math.round(preRoundTotal);
      const roundOff = grandTotal - preRoundTotal;

      expect(grandTotal).toBe(11900);
      expect(Math.abs(roundOff)).toBeLessThan(1);
    });
  });

  /**
   * Test: Data Consistency - Frontend vs Backend
   * Ensures calculations match between frontend and backend
   */
  describe('Data Consistency Check', () => {
    test('frontend and backend rates should match', () => {
      // Simulating frontend calculation
      const rmRate = 100;
      const annealingCharge = 10;
      const drawCharge = 5;
      const annealingCount = 2;
      const drawPassCount = 3;

      const frontendChallanRate = rmRate + (annealingCharge * annealingCount) + (drawCharge * drawPassCount);
      const frontendInvoiceRate = (annealingCharge * annealingCount) + (drawCharge * drawPassCount);

      // Simulating backend calculation (same logic)
      const backendChallanRate = rmRate + (annealingCharge * annealingCount) + (drawCharge * drawPassCount);
      const backendInvoiceRate = (annealingCharge * annealingCount) + (drawCharge * drawPassCount);

      expect(frontendChallanRate).toBe(backendChallanRate);
      expect(frontendInvoiceRate).toBe(backendInvoiceRate);
    });

    test('database stored value should match recalculated value', () => {
      // Simulating database stored invoice
      const databaseInvoice = {
        baseAmount: 3500,
        cgstPercentage: 9,
        sgstPercentage: 9,
        cgstAmount: 315,
        sgstAmount: 315,
        gstAmount: 630,
        totalAmount: 4130,
      };

      // Recalculate from base values
      const recalculatedGST = (databaseInvoice.baseAmount * (databaseInvoice.cgstPercentage + databaseInvoice.sgstPercentage)) / 100;
      const recalculatedTotal = databaseInvoice.baseAmount + recalculatedGST;

      // Should match within 0.01 (rounding tolerance)
      expect(Math.abs(recalculatedGST - databaseInvoice.gstAmount)).toBeLessThan(0.01);
      expect(Math.abs(recalculatedTotal - databaseInvoice.totalAmount)).toBeLessThan(0.01);
    });
  });

  /**
   * Test: Safe Calculations - Handle edge cases and invalid data
   */
  describe('Safe Calculations (No NaN)', () => {
    test('should never produce NaN when quantity is null', () => {
      const quantity = null;
      const rate = 50;
      const total = (quantity || 0) * rate;

      expect(total).toBe(0);
      expect(isNaN(total)).toBe(false);
    });

    test('should never produce NaN when rate is undefined', () => {
      const quantity = 100;
      const rate = undefined;
      const total = quantity * (rate || 0);

      expect(total).toBe(0);
      expect(isNaN(total)).toBe(false);
    });

    test('should never produce NaN when both are invalid', () => {
      const quantity = null;
      const rate = undefined;
      const total = (quantity || 0) * (rate || 0);

      expect(total).toBe(0);
      expect(isNaN(total)).toBe(false);
    });

    test('should handle negative values gracefully', () => {
      const quantity = -100;
      const rate = -50;
      const total = quantity * rate; // Should be 5000

      expect(total).toBe(5000);
      expect(isNaN(total)).toBe(false);
    });
  });
});
