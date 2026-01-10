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
    
    // First, try to fetch without populate to check for corrupted data
    const rawInvoices = await TaxInvoice.find().lean();
    console.log(`Found ${rawInvoices.length} invoice(s) in database`);
    
    // Check for corrupted data
    const corruptedInvoices = rawInvoices.filter(inv => {
      const isPartyCorrupted = typeof inv.party === 'string' && inv.party.includes('{');
      const isFinishSizeCorrupted = typeof inv.finishSize === 'string' && inv.finishSize.includes('{');
      const isOriginalSizeCorrupted = typeof inv.originalSize === 'string' && inv.originalSize.includes('{');
      return isPartyCorrupted || isFinishSizeCorrupted || isOriginalSizeCorrupted;
    });
    
    // Auto-delete corrupted invoices and continue instead of blocking
    if (corruptedInvoices.length > 0) {
      console.warn('⚠️  CORRUPTED INVOICES DETECTED - AUTO-CLEANING:', corruptedInvoices.length);
      
      for (const inv of corruptedInvoices) {
        console.log(`  🗑️  Deleting corrupted invoice: ${inv.invoiceNumber} (ID: ${inv._id})`);
        try {
          await TaxInvoice.findByIdAndDelete(inv._id);
          console.log(`  ✅ Successfully deleted: ${inv.invoiceNumber}`);
        } catch (deleteError) {
          console.error(`  ❌ Failed to delete ${inv.invoiceNumber}:`, deleteError);
        }
      }
      
      console.log('🧹 Cleanup complete. Fetching remaining valid invoices...');
    }
    
    // Fetch valid invoices with populate (after cleanup)
    const invoices = await TaxInvoice.find()
      .populate('party')
      .populate('outwardChallan')
      .populate('finishSize')
      .populate('originalSize')
      .sort({ invoiceDate: -1 });
    
    console.log(`Successfully fetched ${invoices.length} invoice(s)`);
    
    // Return success with info about cleaned invoices
    return NextResponse.json({ 
      success: true, 
      data: invoices,
      ...(corruptedInvoices.length > 0 && {
        message: `Auto-deleted ${corruptedInvoices.length} corrupted invoice(s): ${corruptedInvoices.map(i => i.invoiceNumber).join(', ')}. You can now recreate them from their outward challans.`,
        deletedInvoices: corruptedInvoices.map(i => i.invoiceNumber)
      })
    });
  } catch (error: any) {
    console.error('Error fetching tax invoices:', error);
    return NextResponse.json(
      { success: false, error: error.message },
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
      .populate('finishSize')
      .populate('originalSize');
    
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
    
    // Get FG item to fetch HSN code
    // challan.finishSize is already populated, so we can use it directly
    const fgItem = challan.finishSize as any;
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
    
    console.log('Creating Tax Invoice with data:', {
      invoiceNumber,
      quantity: challan.quantity,
      rate: challan.rate,
      annealingCharge: challan.annealingCharge,
      drawCharge: challan.drawCharge,
      annealingCount: challan.annealingCount,
      drawPassCount: challan.drawPassCount,
      gstPercentage: gstMaster.gstPercentage,
      cgstPercentage: halfGST,
      sgstPercentage: halfGST,
    });
    
    // Create tax invoice with data from outward challan
    // Extract IDs from populated references to avoid validation errors
    const invoice = await TaxInvoice.create({
      invoiceNumber,
      outwardChallan: challan._id,
      party: (challan.party as any)?._id || challan.party,
      finishSize: (challan.finishSize as any)?._id || challan.finishSize,
      originalSize: (challan.originalSize as any)?._id || challan.originalSize,
      annealingCount: challan.annealingCount,
      drawPassCount: challan.drawPassCount,
      quantity: challan.quantity,
      rate: challan.rate,
      annealingCharge: challan.annealingCharge,
      drawCharge: challan.drawCharge,
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
    await invoice.populate(['party', 'outwardChallan', 'finishSize', 'originalSize']);
    
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
