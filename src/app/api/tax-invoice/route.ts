import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { TaxInvoice } from '@/models/TaxInvoice';
import { OutwardChallan } from '@/models/OutwardChallan';
import { PartyMaster } from '@/models/PartyMaster';
import { ItemMaster } from '@/models/ItemMaster';
import { GSTMaster } from '@/models/GSTMaster';
import { generateSequentialNumber } from '@/lib/utils';

export async function GET() {
  try {
    await connectDB();
    
    console.log('Fetching tax invoices...');
    
    // Fetch all invoices without populate first to check for issues
    const rawInvoices = await TaxInvoice.find().lean();
    console.log(`Found ${rawInvoices.length} invoice(s) in database`);
    
    if (rawInvoices.length === 0) {
      return NextResponse.json({ 
        success: true, 
        data: []
      });
    }
    
    // Validate all referenced IDs exist
    const invoiceIds = rawInvoices.map(inv => inv._id);
    const partyIds = [...new Set(rawInvoices.map(inv => inv.party).filter(Boolean))];
    const challanIds = [...new Set(rawInvoices.map(inv => inv.outwardChallan).filter(Boolean))];
    
    // Collect all item reference IDs
    const finishSizeIds = new Set<string>();
    const originalSizeIds = new Set<string>();
    
    rawInvoices.forEach(inv => {
      if (inv.items && Array.isArray(inv.items)) {
        inv.items.forEach((item: any) => {
          if (item.finishSize) finishSizeIds.add(item.finishSize.toString());
          if (item.originalSize) originalSizeIds.add(item.originalSize.toString());
        });
      }
    });
    
    console.log('Validating references:', {
      parties: partyIds.length,
      challans: challanIds.length,
      finishSizes: finishSizeIds.size,
      originalSizes: originalSizeIds.size
    });
    
    // Check which references exist
    const [existingParties, existingChallans, existingFinishSizes, existingOriginalSizes] = await Promise.all([
      PartyMaster.find({ _id: { $in: partyIds } }).select('_id').lean(),
      OutwardChallan.find({ _id: { $in: challanIds } }).select('_id').lean(),
      ItemMaster.find({ _id: { $in: Array.from(finishSizeIds) } }).select('_id').lean(),
      ItemMaster.find({ _id: { $in: Array.from(originalSizeIds) } }).select('_id').lean(),
    ]);
    
    const existingPartyIds = new Set(existingParties.map(p => p._id.toString()));
    const existingChallanIds = new Set(existingChallans.map(c => c._id.toString()));
    const existingFinishSizeIds = new Set(existingFinishSizes.map(i => i._id.toString()));
    const existingOriginalSizeIds = new Set(existingOriginalSizes.map(i => i._id.toString()));
    
    // Find invoices with broken references
    const brokenInvoices: any[] = [];
    
    rawInvoices.forEach(inv => {
      let isBroken = false;
      const reasons: string[] = [];
      
      // Check party reference
      if (inv.party && !existingPartyIds.has(inv.party.toString())) {
        isBroken = true;
        reasons.push(`Missing party: ${inv.party}`);
      }
      
      // Check challan reference
      if (inv.outwardChallan && !existingChallanIds.has(inv.outwardChallan.toString())) {
        isBroken = true;
        reasons.push(`Missing challan: ${inv.outwardChallan}`);
      }
      
      // Check item references
      if (inv.items && Array.isArray(inv.items)) {
        inv.items.forEach((item: any, idx: number) => {
          if (item.finishSize && !existingFinishSizeIds.has(item.finishSize.toString())) {
            isBroken = true;
            reasons.push(`Missing finishSize in item ${idx}: ${item.finishSize}`);
          }
          if (item.originalSize && !existingOriginalSizeIds.has(item.originalSize.toString())) {
            isBroken = true;
            reasons.push(`Missing originalSize in item ${idx}: ${item.originalSize}`);
          }
        });
      }
      
      if (isBroken) {
        brokenInvoices.push({
          ...inv,
          _brokenReasons: reasons
        });
      }
    });
    
    // Auto-delete invoices with broken references
    if (brokenInvoices.length > 0) {
      console.warn('⚠️  BROKEN REFERENCES DETECTED - AUTO-CLEANING:', brokenInvoices.length);
      
      for (const inv of brokenInvoices) {
        console.log(`  🗑️  Deleting invoice with broken refs: ${inv.invoiceNumber} (ID: ${inv._id})`);
        console.log(`     Reasons: ${inv._brokenReasons.join(', ')}`);
        try {
          await TaxInvoice.findByIdAndDelete(inv._id);
          console.log(`  ✅ Successfully deleted: ${inv.invoiceNumber}`);
        } catch (deleteError) {
          console.error(`  ❌ Failed to delete ${inv.invoiceNumber}:`, deleteError);
        }
      }
      
      console.log('🧹 Cleanup complete. Fetching remaining valid invoices...');
    }
    
    // Now fetch valid invoices with populate
    let invoices;
    try {
      invoices = await TaxInvoice.find()
        .populate('party')
        .populate('billTo')
        .populate('shipTo')
        .populate('outwardChallan')
        .populate('items.finishSize')
        .populate('items.originalSize')
        .sort({ invoiceDate: -1 })
        .lean();
      
      console.log(`Successfully fetched ${invoices.length} valid invoice(s)`);
    } catch (populateError: any) {
      console.error('Error during populate:', populateError);
      // If populate still fails, return empty array with error message
      return NextResponse.json({
        success: true,
        data: [],
        message: 'Some invoices had invalid references and were removed. Please recreate them from outward challans.',
        error: populateError.message
      });
    }
    
    // Return success with info about cleaned invoices
    return NextResponse.json({ 
      success: true, 
      data: invoices,
      ...(brokenInvoices.length > 0 && {
        message: `Auto-deleted ${brokenInvoices.length} invoice(s) with broken references: ${brokenInvoices.map(i => i.invoiceNumber).join(', ')}. You can now recreate them from their outward challans.`,
        deletedInvoices: brokenInvoices.map(i => i.invoiceNumber)
      })
    });
  } catch (error: any) {
    console.error('Error fetching tax invoices:', error);
    console.error('Error stack:', error.stack);
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Failed to fetch invoices',
        details: error.stack 
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    await connectDB();
    const body = await request.json();
    
    // Validate outward challan exists
    const challan = await OutwardChallan.findById(body.outwardChallan)
      .populate('party')
      .populate('billTo')
      .populate('shipTo')
      .populate('items.finishSize')
      .populate('items.originalSize');
    
    if (!challan) {
      return NextResponse.json(
        { success: false, error: 'Outward Challan not found' },
        { status: 400 }
      );
    }
    
    // Check if invoice already exists for this challan
    const existingInvoice = await TaxInvoice.findOne({ outwardChallan: body.outwardChallan });
    if (existingInvoice) {
      return NextResponse.json(
        { success: false, error: 'Invoice already exists for this Outward Challan' },
        { status: 400 }
      );
    }
    
    // Handle both old (single item) and new (multi item) challans
    let items: Array<{
      finishSize: any;
      originalSize: any;
      annealingCount: number;
      drawPassCount: number;
      quantity: number;
      rate: number;
      annealingCharge: number;
      drawCharge: number;
      itemTotal: number;
    }> = [];
    
    if (challan.items && challan.items.length > 0) {
      items = challan.items.map((item: any) => ({
        finishSize: item.finishSize._id || item.finishSize,
        originalSize: item.originalSize._id || item.originalSize,
        annealingCount: item.annealingCount,
        drawPassCount: item.drawPassCount,
        quantity: item.quantity,
        rate: item.rate,
        annealingCharge: item.annealingCharge,
        drawCharge: item.drawCharge,
        itemTotal: item.itemTotal
      }));
    } else if ((challan as any).finishSize) {
      // Legacy support for single item challans
      items = [{
        finishSize: (challan as any).finishSize._id || (challan as any).finishSize,
        originalSize: (challan as any).originalSize._id || (challan as any).originalSize,
        annealingCount: (challan as any).annealingCount,
        drawPassCount: (challan as any).drawPassCount,
        quantity: (challan as any).quantity,
        rate: (challan as any).rate,
        annealingCharge: (challan as any).annealingCharge,
        drawCharge: (challan as any).drawCharge,
        itemTotal: (challan as any).totalAmount
      }];
    }

    if (items.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No items found in the outward challan' },
        { status: 400 }
      );
    }

    // Validate all item references exist in ItemMaster
    const finishSizeIds = items.map((item) => item.finishSize);
    const originalSizeIds = items.map((item) => item.originalSize);
    
    const [existingFinishSizes, existingOriginalSizes] = await Promise.all([
      ItemMaster.find({ _id: { $in: finishSizeIds } }).select('_id').lean(),
      ItemMaster.find({ _id: { $in: originalSizeIds } }).select('_id').lean(),
    ]);
    
    const existingFinishSizeIds = new Set(existingFinishSizes.map(i => i._id.toString()));
    const existingOriginalSizeIds = new Set(existingOriginalSizes.map(i => i._id.toString()));
    
    // Check for missing references
    const missingFinishSizes = finishSizeIds.filter(id => !existingFinishSizeIds.has(id.toString()));
    const missingOriginalSizes = originalSizeIds.filter(id => !existingOriginalSizeIds.has(id.toString()));
    
    if (missingFinishSizes.length > 0 || missingOriginalSizes.length > 0) {
      const errorMessages = [];
      if (missingFinishSizes.length > 0) {
        errorMessages.push(`Missing Finish Size items: ${missingFinishSizes.join(', ')}`);
      }
      if (missingOriginalSizes.length > 0) {
        errorMessages.push(`Missing Original Size items: ${missingOriginalSizes.join(', ')}`);
      }
      
      console.error('Cannot create invoice - missing item references:', errorMessages);
      return NextResponse.json(
        { 
          success: false, 
          error: 'Cannot create invoice: Some item references are missing from Item Master. ' + errorMessages.join('; '),
          details: {
            missingFinishSizes,
            missingOriginalSizes
          }
        },
        { status: 400 }
      );
    }

    // Get FG item to fetch HSN code (from the first item)
    const firstItemFinishSize = challan.items && challan.items.length > 0 
      ? challan.items[0].finishSize 
      : (challan as any).finishSize;

    const fgItem = firstItemFinishSize as any;
    if (!fgItem) {
      return NextResponse.json(
        { success: false, error: 'Finish Size item not found' },
        { status: 400 }
      );
    }
    
    // Get GST percentage from GST Master
    const gstMaster = await GSTMaster.findOne({ hsnCode: fgItem.hsnCode, isActive: true });
    if (!gstMaster) {
      return NextResponse.json(
        { success: false, error: `GST rate not found for HSN Code: ${fgItem.hsnCode}` },
        { status: 400 }
      );
    }
    
    // Generate invoice number
    const invoiceNumber = await generateSequentialNumber('INV', TaxInvoice, 'invoiceNumber');
    
    // Split GST into CGST and SGST (for intra-state transactions)
    const halfGST = gstMaster.gstPercentage / 2;
    
    console.log('Creating Tax Invoice with multi-items:', {
      invoiceNumber,
      itemCount: items.length,
      gstPercentage: gstMaster.gstPercentage,
      challanBillTo: (challan as any).billTo,
      challanShipTo: (challan as any).shipTo,
      challanParty: challan.party,
    });
    
    // Create tax invoice with data from outward challan
    const invoice = await TaxInvoice.create({
      invoiceNumber,
      outwardChallan: challan._id,
      party: (challan.party as any)?._id || challan.party,
      billTo: (challan as any).billTo?._id || (challan as any).billTo || (challan.party as any)?._id || challan.party,
      shipTo: (challan as any).shipTo?._id || (challan as any).shipTo || (challan.party as any)?._id || challan.party,
      items,
      gstPercentage: gstMaster.gstPercentage,
      cgstPercentage: halfGST, // Split GST equally
      sgstPercentage: halfGST, // Split GST equally
      invoiceDate: body.invoiceDate || new Date(),
      
      // Transport Details from Challan
      vehicleNumber: challan.vehicleNumber,
      transportName: challan.transportName,
      ownerName: challan.ownerName,
      dispatchedThrough: challan.dispatchedThrough || 'By Road',
    });
    
    console.log('Tax Invoice created successfully:', {
      id: invoice._id,
      baseAmount: invoice.baseAmount,
      gstAmount: invoice.gstAmount,
      totalAmount: invoice.totalAmount,
    });
    
    // Populate and return
    await invoice.populate(['party', 'billTo', 'shipTo', 'outwardChallan', 'items.finishSize', 'items.originalSize']);
    
    return NextResponse.json(
      { success: true, data: invoice },
      { status: 201 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 400 }
    );
  }
}
