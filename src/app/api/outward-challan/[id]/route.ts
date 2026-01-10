import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { OutwardChallan } from '@/models/OutwardChallan';
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
    const challan = await OutwardChallan.findById(id)
      .populate('party')
      .populate('finishSize')
      .populate('originalSize');
    
    if (!challan) {
      return NextResponse.json(
        { success: false, error: 'Outward Challan not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({ success: true, data: challan });
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
    
    // First, find the challan to get the quantities
    const challan = await OutwardChallan.findById(id)
      .populate('finishSize')
      .populate('originalSize');
    
    if (!challan) {
      return NextResponse.json(
        { success: false, error: 'Outward Challan not found' },
        { status: 404 }
      );
    }
    
    console.log('Deleting challan:', challan.challanNumber);
    console.log('Quantity to reverse:', challan.quantity);
    
    // Reverse stock changes:
    // 1. Add back to RM stock (was deducted when challan was created)
    const rmStock = await Stock.findOneAndUpdate(
      { size: challan.originalSize._id || challan.originalSize, category: 'RM' },
      { $inc: { quantity: challan.quantity } },
      { new: true }
    );
    console.log('RM Stock restored:', rmStock?.quantity);
    
    // 2. Deduct from FG stock (was added when challan was created)
    const fgStock = await Stock.findOneAndUpdate(
      { size: challan.finishSize._id || challan.finishSize, category: 'FG' },
      { $inc: { quantity: -challan.quantity } },
      { new: true }
    );
    console.log('FG Stock reduced:', fgStock?.quantity);
    
    // 3. Delete the challan
    await OutwardChallan.findByIdAndDelete(id);
    
    return NextResponse.json({ 
      success: true, 
      message: `Challan ${challan.challanNumber} deleted successfully. Stock has been reversed.`,
      data: {
        challan: challan.challanNumber,
        rmStockRestored: challan.quantity,
        fgStockRemoved: challan.quantity
      }
    });
  } catch (error: any) {
    console.error('Error deleting challan:', error);
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
    
    // Find the existing challan to get old values
    const existingChallan = await OutwardChallan.findById(id);
    
    if (!existingChallan) {
      return NextResponse.json(
        { success: false, error: 'Outward Challan not found' },
        { status: 404 }
      );
    }
    
    const oldQuantity = existingChallan.quantity;
    const newQuantity = body.quantity;
    const quantityDiff = newQuantity - oldQuantity;
    
    console.log('Updating challan:', existingChallan.challanNumber);
    console.log('Old quantity:', oldQuantity, 'New quantity:', newQuantity, 'Diff:', quantityDiff);
    
    // If quantity changed, adjust stock
    if (quantityDiff !== 0) {
      // Adjust RM stock (deduct more or restore some)
      await Stock.findOneAndUpdate(
        { size: existingChallan.originalSize, category: 'RM' },
        { $inc: { quantity: -quantityDiff } },
        { new: true }
      );
      
      // Adjust FG stock (add more or reduce some)
      await Stock.findOneAndUpdate(
        { size: existingChallan.finishSize, category: 'FG' },
        { $inc: { quantity: quantityDiff } },
        { new: true }
      );
    }
    
    // Update the challan
    const updatedChallan = await OutwardChallan.findByIdAndUpdate(
      id,
      {
        party: body.party,
        finishSize: body.finishSize,
        originalSize: body.originalSize,
        annealingCount: body.annealingCount,
        drawPassCount: body.drawPassCount,
        quantity: body.quantity,
        rate: body.rate,
        annealingCharge: body.annealingCharge,
        drawCharge: body.drawCharge,
        totalAmount: body.totalAmount,
        challanDate: body.challanDate,
      },
      { new: true }
    ).populate('party').populate('finishSize').populate('originalSize');
    
    return NextResponse.json({ 
      success: true, 
      data: updatedChallan,
      message: 'Challan updated successfully'
    });
  } catch (error: any) {
    console.error('Error updating challan:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
