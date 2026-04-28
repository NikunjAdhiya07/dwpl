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
      .populate('billTo')
      .populate('shipTo')
      .populate('items.finishSize')
      .populate('items.originalSize');
    
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
    
    // First, find the challan to get the items
    const challan = await OutwardChallan.findById(id)
      .populate('items.finishSize')
      .populate('items.originalSize');
    
    if (!challan) {
      return NextResponse.json(
        { success: false, error: 'Outward Challan not found' },
        { status: 404 }
      );
    }
    
    console.log('Deleting challan:', challan.challanNumber);
    
    // Reverse stock changes for each item:
    for (const item of challan.items) {
      console.log(`Reversing stock for item - FG: ${item.finishSize}, RM: ${item.originalSize}, Qty: ${item.quantity}`);
      
      // 1. Add back to RM stock (was deducted when challan was created)
      const rmStock = await Stock.findOneAndUpdate(
        { size: item.originalSize._id || item.originalSize, category: 'RM' },
        { $inc: { quantity: item.quantity } },
        { new: true }
      );
      console.log(`RM Stock restored for ${item.originalSize}:`, rmStock?.quantity);
      
      // 2. Deduct from FG stock (was added when challan was created)
      const fgStock = await Stock.findOneAndUpdate(
        { size: item.finishSize._id || item.finishSize, category: 'FG' },
        { $inc: { quantity: -item.quantity } },
        { new: true }
      );
      console.log(`FG Stock reduced for ${item.finishSize}:`, fgStock?.quantity);
    }
    
    // 3. Delete the challan
    await OutwardChallan.findByIdAndDelete(id);
    
    return NextResponse.json({ 
      success: true, 
      message: `Challan ${challan.challanNumber} deleted successfully. Stock has been reversed for all items.`,
      data: {
        challan: challan.challanNumber,
        itemsReversed: challan.items.length
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
    
    console.log('Updating challan:', existingChallan.challanNumber);
    
    // Reverse stock changes for old items
    for (const oldItem of existingChallan.items) {
      // Add back RM stock
      await Stock.findOneAndUpdate(
        { size: oldItem.originalSize, category: 'RM' },
        { $inc: { quantity: oldItem.quantity } },
        { new: true }
      );
      
      // Deduct FG stock
      await Stock.findOneAndUpdate(
        { size: oldItem.finishSize, category: 'FG' },
        { $inc: { quantity: -oldItem.quantity } },
        { new: true }
      );
    }
    
    // Apply stock changes for new items
    for (const newItem of body.items) {
      // Deduct RM stock
      await Stock.findOneAndUpdate(
        { size: newItem.originalSize, category: 'RM' },
        { $inc: { quantity: -newItem.quantity } },
        { new: true }
      );
      
      // Add FG stock
      await Stock.findOneAndUpdate(
        { size: newItem.finishSize, category: 'FG' },
        { 
          $inc: { quantity: newItem.quantity },
          $set: { lastUpdated: new Date() }
        },
        { 
          new: true, 
          upsert: true,
          setDefaultsOnInsert: true 
        }
      );
    }
    
    // Update the challan using .save() so pre-save hook recalculates
    // itemTotal (qty * rate) and totalAmount correctly after rate changes
    existingChallan.party = body.party;
    existingChallan.billTo = body.billTo || body.party;
    existingChallan.shipTo = body.shipTo || body.party;
    existingChallan.challanDate = body.challanDate;
    existingChallan.vehicleNumber = body.vehicleNumber;
    existingChallan.vehicles = body.vehicles || (body.vehicleNumber ? [{ vehicleNumber: body.vehicleNumber }] : []);
    existingChallan.transportName = body.transportName;
    existingChallan.ownerName = body.ownerName;
    existingChallan.dispatchedThrough = body.dispatchedThrough;
    existingChallan.eWayBillNo = body.eWayBillNo;

    // Force-recalculate itemTotal from current rate before saving
    existingChallan.items = body.items.map((item: any) => ({
      ...item,
      itemTotal: (item.quantity || 0) * (item.rate || 0),
    }));

    await existingChallan.save(); // triggers pre-save: recalculates totalAmount

    const updatedChallan = await OutwardChallan.findById(existingChallan._id)
      .populate('party')
      .populate('billTo')
      .populate('shipTo')
      .populate('items.finishSize')
      .populate('items.originalSize');
    
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
