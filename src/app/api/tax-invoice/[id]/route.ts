import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { TaxInvoice } from '@/models/TaxInvoice';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    const { id } = await params;
    const deletedInvoice = await TaxInvoice.findByIdAndDelete(id);
    if (!deletedInvoice) {
      return NextResponse.json({ success: false, error: 'Invoice not found' }, { status: 404 });
    }
    return NextResponse.json({
      success: true,
      message: `Invoice ${deletedInvoice.invoiceNumber} deleted successfully`,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// PATCH: Update transport charges for an existing invoice
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    const { id } = await params;
    const body = await request.json();

    const invoice = await TaxInvoice.findById(id);
    if (!invoice) {
      return NextResponse.json({ success: false, error: 'Invoice not found' }, { status: 404 });
    }

    // Update transport charges
    if (body.transportCharges !== undefined) {
      invoice.transportCharges = Number(body.transportCharges) || 0;
    }

    // Recalculate and save (pre-save hook will recalculate totals)
    await invoice.save();

    await invoice.populate(['party', 'billTo', 'shipTo', 'outwardChallan', 'items.finishSize', 'items.originalSize']);

    return NextResponse.json({ success: true, data: invoice });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
