import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { GRN } from '@/models/GRN';
import { ItemMaster } from '@/models/ItemMaster';
import { updateStockAfterGRN } from '@/lib/stockManager';

export async function GET() {
  try {
    await connectDB();
    const grns = await GRN.find()
      .populate('sendingParty')
      .populate('items.rmSize')
      .sort({ grnDate: -1 });
    
    return NextResponse.json({ success: true, data: grns });
  } catch (error: any) {
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
    
    // Validate that items array exists and has at least one item
    if (!body.items || !Array.isArray(body.items) || body.items.length === 0) {
      return NextResponse.json(
        { success: false, error: 'At least one item is required' },
        { status: 400 }
      );
    }
    
    // Validate each item
    for (const item of body.items) {
      const rmItem = await ItemMaster.findById(item.rmSize);
      if (!rmItem) {
        return NextResponse.json(
          { success: false, error: `RM Size not found in Item Master: ${item.rmSize}` },
          { status: 400 }
        );
      }
      
      if (rmItem.category !== 'RM') {
        return NextResponse.json(
          { success: false, error: `Selected item must be Raw Material (RM): ${rmItem.size}` },
          { status: 400 }
        );
      }
    }
    
    // Check for duplicate challan number for this party
    const existingGRN = await GRN.findOne({
      sendingParty: body.sendingParty,
      partyChallanNumber: body.partyChallanNumber
    });
    
    if (existingGRN) {
      return NextResponse.json(
        { 
          success: false, 
          error: `Challan number "${body.partyChallanNumber}" already exists for this party. Each party can have only one challan with the same number.` 
        },
        { status: 400 }
      );
    }
    
    // Create GRN
    const grn = await GRN.create(body);
    
    // Update stock for each item
    for (const item of body.items) {
      await updateStockAfterGRN(item.rmSize, item.quantity);
    }
    
    // Populate and return
    const populatedGRN = await GRN.findById(grn._id)
      .populate('sendingParty')
      .populate('items.rmSize');
    
    return NextResponse.json(
      { success: true, data: populatedGRN },
      { status: 201 }
    );
  } catch (error: any) {
    // Handle duplicate key error from MongoDB
    if (error.code === 11000) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'This challan number already exists for this party. Each party can have only one challan with the same number.' 
        },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 400 }
    );
  }
}
