import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { GRN } from '@/models/GRN';
import { PartyMaster } from '@/models/PartyMaster';
import { ItemMaster } from '@/models/ItemMaster';
import { Stock } from '@/models/Stock';

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

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    const { id } = await params;
    const body = await request.json();

    // Find the existing GRN
    const existingGRN = await GRN.findById(id);
    if (!existingGRN) {
      return NextResponse.json(
        { success: false, error: 'GRN not found' },
        { status: 404 }
      );
    }

    // 1. Reverse stock for all old items
    for (const oldItem of existingGRN.items) {
      await Stock.findOneAndUpdate(
        { size: String(oldItem.rmSize), category: 'RM' },
        { $inc: { quantity: -oldItem.quantity } },
        { new: true }
      );
    }

    // 2. Validate new items
    if (!body.items || !Array.isArray(body.items) || body.items.length === 0) {
      return NextResponse.json(
        { success: false, error: 'At least one item is required' },
        { status: 400 }
      );
    }

    // 3. Apply stock for new items
    for (const newItem of body.items) {
      await Stock.findOneAndUpdate(
        { size: String(newItem.rmSize), category: 'RM' },
        { $inc: { quantity: newItem.quantity } },
        { new: true, upsert: true, setDefaultsOnInsert: true }
      );
    }

    // 4. Update the GRN fields
    existingGRN.sendingParty = body.sendingParty;
    existingGRN.partyChallanNumber = body.partyChallanNumber;
    existingGRN.grnDate = body.grnDate;
    existingGRN.items = body.items;
    existingGRN.totalValue = body.items.reduce(
      (sum: number, item: any) => sum + item.quantity * item.rate,
      0
    );

    await existingGRN.save();

    const updatedGRN = await GRN.findById(id)
      .populate('sendingParty')
      .populate('items.rmSize');

    return NextResponse.json({
      success: true,
      data: updatedGRN,
      message: 'GRN updated successfully',
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
