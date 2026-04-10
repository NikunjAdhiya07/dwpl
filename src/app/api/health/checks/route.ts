/**
 * Health Check Endpoint
 *
 * Runs daily data quality checks to detect issues:
 * - NaN values in critical fields
 * - Orphaned references
 * - Duplicate GST entries
 * - Calculation mismatches
 * - Null required fields
 *
 * Usage: GET /api/health/checks
 */

import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { TaxInvoice } from '@/models/TaxInvoice';
import { OutwardChallan } from '@/models/OutwardChallan';
import { GSTMaster } from '@/models/GSTMaster';
import { PartyMaster } from '@/models/PartyMaster';

export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const checks = {
      timestamp: new Date().toISOString(),
      checks: {} as Record<string, any>,
      overallHealth: 'GOOD' as 'GOOD' | 'WARNING' | 'CRITICAL',
      issues: [] as string[],
    };

    // Check 1: NaN values in invoices
    const invoicesWithNaN = await TaxInvoice.countDocuments({
      $or: [
        { baseAmount: { $exists: true, $ne: NaN } },
        { gstAmount: { $exists: true, $ne: NaN } },
        { totalAmount: { $exists: true, $ne: NaN } },
      ],
    }).then(total => {
      // Count NaN values (MongoDB way)
      return TaxInvoice.find({
        $expr: {
          $or: [
            { $isNaN: '$baseAmount' },
            { $isNaN: '$gstAmount' },
            { $isNaN: '$totalAmount' },
          ],
        },
      }).countDocuments();
    });

    checks.checks.nanValuesInInvoices = {
      count: invoicesWithNaN,
      severity: invoicesWithNaN > 0 ? 'CRITICAL' : 'OK',
    };

    if (invoicesWithNaN > 0) {
      checks.issues.push(`❌ CRITICAL: ${invoicesWithNaN} invoices have NaN values`);
      checks.overallHealth = 'CRITICAL';
    }

    // Check 2: Duplicate GST entries
    const gstByParty = await GSTMaster.aggregate([
      {
        $group: {
          _id: '$party',
          count: { $sum: 1 },
        },
      },
      {
        $match: { count: { $gt: 1 } },
      },
    ]);

    checks.checks.duplicateGSTEntries = {
      count: gstByParty.length,
      partiesAffected: gstByParty.length,
      severity: gstByParty.length > 0 ? 'WARNING' : 'OK',
    };

    if (gstByParty.length > 0) {
      checks.issues.push(`⚠️  WARNING: ${gstByParty.length} parties have duplicate GST entries`);
      if (checks.overallHealth === 'GOOD') checks.overallHealth = 'WARNING';
    }

    // Check 3: Orphaned invoices (references to missing challans)
    const allInvoices = await TaxInvoice.find().select('invoiceNumber outwardChallan').lean();
    const allChallanIds = new Set((await OutwardChallan.find().select('_id').lean()).map(c => c._id.toString()));

    const orphanedInvoices = allInvoices.filter(
      inv => !allChallanIds.has((inv.outwardChallan as any)?.toString())
    );

    checks.checks.orphanedInvoices = {
      count: orphanedInvoices.length,
      severity: orphanedInvoices.length > 0 ? 'WARNING' : 'OK',
      examples: orphanedInvoices.slice(0, 3).map(inv => inv.invoiceNumber),
    };

    if (orphanedInvoices.length > 0) {
      checks.issues.push(`⚠️  WARNING: ${orphanedInvoices.length} invoices reference missing challans`);
      if (checks.overallHealth === 'GOOD') checks.overallHealth = 'WARNING';
    }

    // Check 4: Invoices without GST configuration
    const invoicesWithoutGST = await TaxInvoice.countDocuments({
      $and: [
        { $or: [{ cgstPercentage: { $in: [null, undefined, 0] } }, { cgstPercentage: { $exists: false } }] },
        { $or: [{ sgstPercentage: { $in: [null, undefined, 0] } }, { sgstPercentage: { $exists: false } }] },
        { $or: [{ igstPercentage: { $in: [null, undefined, 0] } }, { igstPercentage: { $exists: false } }] },
      ],
    });

    checks.checks.invoicesWithoutGST = {
      count: invoicesWithoutGST,
      severity: invoicesWithoutGST > 0 ? 'WARNING' : 'OK',
    };

    if (invoicesWithoutGST > 0) {
      checks.issues.push(`⚠️  WARNING: ${invoicesWithoutGST} invoices have no GST configuration`);
      if (checks.overallHealth === 'GOOD') checks.overallHealth = 'WARNING';
    }

    // Check 5: Calculation consistency (sample check)
    const sampleInvoices = await TaxInvoice.find().limit(20).lean();
    let calculationMismatches = 0;

    for (const inv of sampleInvoices) {
      // Recalculate from items
      const recalculatedBase = (inv.items || []).reduce((sum: number, item: any) => sum + (item.itemTotal || 0), 0);

      if (Math.abs(recalculatedBase - (inv.baseAmount || 0)) > 0.01) {
        calculationMismatches++;
      }

      // Check GST calculation
      if ((inv.cgstPercentage || 0) > 0 || (inv.sgstPercentage || 0) > 0) {
        const expectedGST = ((inv.baseAmount || 0) * ((inv.cgstPercentage || 0) + (inv.sgstPercentage || 0))) / 100;
        if (Math.abs(expectedGST - (inv.gstAmount || 0)) > 0.01) {
          calculationMismatches++;
        }
      }
    }

    checks.checks.calculationMismatches = {
      count: calculationMismatches,
      sampleSize: sampleInvoices.length,
      severity: calculationMismatches > 0 ? 'WARNING' : 'OK',
    };

    if (calculationMismatches > 0) {
      checks.issues.push(`⚠️  WARNING: ${calculationMismatches} calculation mismatches detected in sample`);
      if (checks.overallHealth === 'GOOD') checks.overallHealth = 'WARNING';
    }

    // Check 6: Data completeness
    const totalInvoices = await TaxInvoice.countDocuments();
    const totalChallans = await OutwardChallan.countDocuments();
    const totalGST = await GSTMaster.countDocuments();
    const totalParties = await PartyMaster.countDocuments();

    checks.checks.dataCompleteness = {
      totalInvoices,
      totalChallans,
      totalGSTEntries: totalGST,
      totalParties,
      invoiceToPartyRatio: totalParties > 0 ? (totalInvoices / totalParties).toFixed(2) : 'N/A',
    };

    // Summary
    checks.checks.summary = {
      status: checks.overallHealth,
      issuesFound: checks.issues.length,
      lastChecked: new Date().toISOString(),
    };

    // Log issues for monitoring
    if (checks.issues.length > 0) {
      console.warn('🚨 Health Check Issues Detected:', checks.issues);
    } else {
      console.log('✅ All health checks passed!');
    }

    return NextResponse.json({
      success: true,
      data: checks,
    });
  } catch (error: any) {
    console.error('Error running health checks:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message,
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/health/checks - Force immediate checks
 * Can be used for manual verification
 */
export async function POST(request: NextRequest) {
  // Same as GET, just forced
  return GET(request);
}
