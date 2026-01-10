import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { GRN } from '@/models/GRN';
import { PartyMaster } from '@/models/PartyMaster';
import { ItemMaster } from '@/models/ItemMaster';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    const { id } = await params;
    const grn = await GRN.findById(id)
      .populate('sendingParty')
      .populate('rmSize');
    
    if (!grn) {
      return NextResponse.json(
        { success: false, error: 'GRN not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({ success: true, data: grn });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    const { id } = await params;
    
    // Note: Deleting GRN should ideally reverse stock, but for now we'll just delete
    // In production, you might want to prevent deletion or implement stock reversal
    const grn = await GRN.findByIdAndDelete(id);
    
    if (!grn) {
      return NextResponse.json(
        { success: false, error: 'GRN not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({ success: true, data: grn });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
