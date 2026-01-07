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
    console.log('Deleting tax invoice:', id);
    
    const deletedInvoice = await TaxInvoice.findByIdAndDelete(id);
    
    if (!deletedInvoice) {
      return NextResponse.json(
        { success: false, error: 'Invoice not found' },
        { status: 404 }
      );
    }
    
    console.log('Successfully deleted invoice:', deletedInvoice.invoiceNumber);
    
    return NextResponse.json({
      success: true,
      message: `Invoice ${deletedInvoice.invoiceNumber} deleted successfully`,
      data: deletedInvoice
    });
  } catch (error: any) {
    console.error('Error deleting invoice:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
