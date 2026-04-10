/**
 * Data Validation & Consistency Checks
 *
 * This module provides validation functions to ensure data integrity
 * across the application. Run these checks before saving or updating any data.
 */

/**
 * Validates a challan item before saving
 * @param item The challan item to validate
 * @returns Object with validation result and any errors found
 */
export function validateChallanItem(item: any) {
  const errors: string[] = [];

  // Validate required fields
  if (!item.finishSize) errors.push('Finish Size is required');
  if (!item.originalSize) errors.push('Original Size is required');
  if (item.quantity === undefined || item.quantity === null) errors.push('Quantity is required');
  if (item.rate === undefined || item.rate === null) errors.push('Rate is required');

  // Validate field types and ranges
  if (item.quantity !== undefined && (typeof item.quantity !== 'number' || item.quantity <= 0)) {
    errors.push('Quantity must be a positive number');
  }

  if (item.rate !== undefined && (typeof item.rate !== 'number' || item.rate < 0)) {
    errors.push('Rate cannot be negative');
  }

  if (item.annealingCount !== undefined && (typeof item.annealingCount !== 'number' || item.annealingCount < 0)) {
    errors.push('Annealing count cannot be negative');
  }

  if (item.drawPassCount !== undefined && (typeof item.drawPassCount !== 'number' || item.drawPassCount < 0)) {
    errors.push('Draw pass count cannot be negative');
  }

  // Validate calculations
  if (item.quantity !== undefined && item.rate !== undefined) {
    const expectedTotal = item.quantity * item.rate;
    if (item.itemTotal !== undefined && Math.abs(expectedTotal - item.itemTotal) > 0.01) {
      errors.push(`Item total mismatch: expected ${expectedTotal}, got ${item.itemTotal}`);
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Validates a tax invoice before saving
 * @param invoice The tax invoice to validate
 * @returns Object with validation result and any errors found
 */
export function validateTaxInvoice(invoice: any) {
  const errors: string[] = [];

  // Validate required fields
  if (!invoice.outwardChallan) errors.push('Outward Challan reference is required');
  if (!invoice.party) errors.push('Party is required');
  if (!invoice.items || invoice.items.length === 0) errors.push('At least one item is required');

  // Validate GST configuration
  const hasGST = (invoice.cgstPercentage || 0) > 0 ||
                 (invoice.sgstPercentage || 0) > 0 ||
                 (invoice.igstPercentage || 0) > 0;
  if (!hasGST) {
    console.warn('Warning: Invoice has no GST configured. Check Party GST Master.');
  }

  // Validate items
  if (invoice.items && Array.isArray(invoice.items)) {
    invoice.items.forEach((item: any, index: number) => {
      const itemValidation = validateChallanItem(item);
      if (!itemValidation.isValid) {
        errors.push(`Item ${index + 1}: ${itemValidation.errors.join(', ')}`);
      }
    });
  }

  // Validate GST percentages are within valid range
  if (invoice.cgstPercentage !== undefined && (invoice.cgstPercentage < 0 || invoice.cgstPercentage > 100)) {
    errors.push('CGST percentage must be between 0 and 100');
  }
  if (invoice.sgstPercentage !== undefined && (invoice.sgstPercentage < 0 || invoice.sgstPercentage > 100)) {
    errors.push('SGST percentage must be between 0 and 100');
  }
  if (invoice.igstPercentage !== undefined && (invoice.igstPercentage < 0 || invoice.igstPercentage > 100)) {
    errors.push('IGST percentage must be between 0 and 100');
  }

  // Validate amounts are not NaN
  if (isNaN(invoice.baseAmount)) errors.push('Base amount is NaN');
  if (isNaN(invoice.gstAmount)) errors.push('GST amount is NaN');
  if (isNaN(invoice.totalAmount)) errors.push('Total amount is NaN');

  // Validate total amount calculation
  if (invoice.baseAmount !== undefined && invoice.gstAmount !== undefined) {
    const expectedMinTotal = invoice.baseAmount + invoice.gstAmount;
    const actualTotal = invoice.totalAmount || 0;
    if (actualTotal < expectedMinTotal) {
      errors.push(`Total amount (${actualTotal}) is less than base + GST (${expectedMinTotal})`);
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Validates GST Master entry before saving
 * @param gst The GST Master entry to validate
 * @returns Object with validation result and any errors found
 */
export function validateGSTMaster(gst: any) {
  const errors: string[] = [];

  // Validate required fields
  if (!gst.party) errors.push('Party is required');

  // Validate percentages
  if (gst.cgstPercentage === undefined || gst.cgstPercentage === null) errors.push('CGST percentage is required');
  if (gst.sgstPercentage === undefined || gst.sgstPercentage === null) errors.push('SGST percentage is required');
  if (gst.igstPercentage === undefined || gst.igstPercentage === null) errors.push('IGST percentage is required');

  // Validate ranges
  if (gst.cgstPercentage !== undefined && (gst.cgstPercentage < 0 || gst.cgstPercentage > 100)) {
    errors.push('CGST percentage must be between 0 and 100');
  }
  if (gst.sgstPercentage !== undefined && (gst.sgstPercentage < 0 || gst.sgstPercentage > 100)) {
    errors.push('SGST percentage must be between 0 and 100');
  }
  if (gst.igstPercentage !== undefined && (gst.igstPercentage < 0 || gst.igstPercentage > 100)) {
    errors.push('IGST percentage must be between 0 and 100');
  }
  if (gst.tcsPercentage !== undefined && (gst.tcsPercentage < 0 || gst.tcsPercentage > 100)) {
    errors.push('TCS percentage must be between 0 and 100');
  }

  // Validate either CGST+SGST or IGST is configured
  const hasCGSTSGST = (gst.cgstPercentage || 0) > 0 || (gst.sgstPercentage || 0) > 0;
  const hasIGST = (gst.igstPercentage || 0) > 0;
  if (!hasCGSTSGST && !hasIGST) {
    errors.push('Either CGST/SGST or IGST must be configured');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Checks if calculation results are consistent between frontend and backend
 * @param frontendResult Frontend calculated value
 * @param backendResult Backend calculated value
 * @param tolerance Maximum allowed difference (default 0.01 for currency)
 * @returns true if values match within tolerance
 */
export function checkCalculationSync(
  frontendResult: number,
  backendResult: number,
  tolerance: number = 0.01
): boolean {
  if (isNaN(frontendResult) || isNaN(backendResult)) {
    console.error('NaN detected in calculation sync check', {
      frontend: frontendResult,
      backend: backendResult,
    });
    return false;
  }

  const difference = Math.abs(frontendResult - backendResult);
  const isSynced = difference <= tolerance;

  if (!isSynced) {
    console.warn('Calculation sync issue detected!', {
      frontend: frontendResult,
      backend: backendResult,
      difference,
      tolerance,
    });
  }

  return isSynced;
}

/**
 * Checks for orphaned references (records with missing referenced documents)
 * @param record The record to check
 * @param fieldName The field containing the reference ID
 * @param referencedDocuments Set of valid referenced document IDs
 * @returns true if reference exists, false if orphaned
 */
export function checkReferenceExists(
  record: any,
  fieldName: string,
  referencedDocuments: Set<string>
): boolean {
  const referenceId = record[fieldName];
  if (!referenceId) return true; // Optional field is OK

  const referenceIdString = typeof referenceId === 'object'
    ? (referenceId as any)?._id?.toString()
    : referenceId.toString();

  const exists = referencedDocuments.has(referenceIdString);

  if (!exists) {
    console.error(`Orphaned reference detected: ${fieldName} = ${referenceIdString} not found in referenced collection`);
  }

  return exists;
}

/**
 * Checks if a value is a valid number (not NaN, null, or undefined)
 * @param value The value to check
 * @returns true if valid number, false otherwise
 */
export function isValidNumber(value: any): boolean {
  return value !== null &&
         value !== undefined &&
         typeof value === 'number' &&
         !isNaN(value);
}

/**
 * Safe calculation that always returns a number, never NaN
 * @param value The value to convert
 * @param defaultValue Default value if invalid (default 0)
 * @returns A valid number
 */
export function toSafeNumber(value: any, defaultValue: number = 0): number {
  if (isValidNumber(value)) return value;
  return defaultValue;
}

/**
 * Validates coil entries and auto-calculates quantity
 * @param coilEntries Array of coil entries with weights
 * @returns Object with total weight and validation result
 */
export function validateCoilEntries(coilEntries: any[]) {
  const errors: string[] = [];
  let totalWeight = 0;

  if (!Array.isArray(coilEntries)) {
    return { isValid: false, errors: ['Coil entries must be an array'], totalWeight: 0 };
  }

  coilEntries.forEach((entry, index) => {
    if (entry.coilWeight === undefined || entry.coilWeight === null) {
      errors.push(`Coil ${index + 1}: Weight is required`);
    } else if (typeof entry.coilWeight !== 'number' || entry.coilWeight < 0) {
      errors.push(`Coil ${index + 1}: Weight must be a positive number`);
    } else {
      totalWeight += entry.coilWeight;
    }

    if (!entry.coilNumber) {
      errors.push(`Coil ${index + 1}: Coil number is required`);
    }
  });

  return {
    isValid: errors.length === 0,
    errors,
    totalWeight: totalWeight > 0 ? totalWeight : 0,
  };
}

/**
 * Pre-save validation - Run before saving any document
 * @param documentType Type of document ('challan', 'invoice', 'gst')
 * @param data The data to validate
 * @returns Validation result
 */
export function preSaveValidation(documentType: string, data: any) {
  switch (documentType.toLowerCase()) {
    case 'challan':
      return validateChallanItem(data);
    case 'invoice':
      return validateTaxInvoice(data);
    case 'gst':
      return validateGSTMaster(data);
    default:
      return { isValid: false, errors: [`Unknown document type: ${documentType}`] };
  }
}

/**
 * Check for common data issues
 * @param data The data to check
 * @returns Array of issues found
 */
export function checkCommonDataIssues(data: any): string[] {
  const issues: string[] = [];

  // Check for NaN values
  Object.entries(data).forEach(([key, value]) => {
    if (typeof value === 'number' && isNaN(value)) {
      issues.push(`Field "${key}" contains NaN value`);
    }
  });

  // Check for null in required fields
  const requiredFields = ['party', 'items', 'quantity', 'rate'];
  requiredFields.forEach(field => {
    if (field in data && (data[field] === null || data[field] === undefined)) {
      issues.push(`Required field "${field}" is null or undefined`);
    }
  });

  // Check for negative amounts
  ['baseAmount', 'gstAmount', 'totalAmount', 'quantity', 'rate'].forEach(field => {
    if (field in data && typeof data[field] === 'number' && data[field] < 0) {
      issues.push(`Field "${field}" cannot be negative: ${data[field]}`);
    }
  });

  return issues;
}

/**
 * Comprehensive validation before deployment
 * Run this before merging changes to production
 * @param record The record to validate
 * @returns Comprehensive validation result
 */
export function comprehensiveValidation(record: any) {
  const results = {
    dataIssues: checkCommonDataIssues(record),
    customValidation: preSaveValidation(record.type, record),
    isProduction: true,
  };

  if (results.dataIssues.length > 0 || !results.customValidation.isValid) {
    results.isProduction = false;
    console.error('❌ Comprehensive validation FAILED:', results);
  } else {
    console.log('✅ Comprehensive validation PASSED');
  }

  return results;
}
