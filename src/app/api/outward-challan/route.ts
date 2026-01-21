import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { OutwardChallan } from '@/models/OutwardChallan';
import { PartyMaster } from '@/models/PartyMaster';
import { ItemMaster } from '@/models/ItemMaster';
import { Stock } from '@/models/Stock';

export async function GET() {
  try {
    await connectDB();
    
    const challans = await OutwardChallan.find()
      .populate('party')
      .populate('billTo')
      .populate('shipTo')
      .populate('items.finishSize')
      .populate('items.originalSize')
      .sort({ challanDate: -1 });
    
    return NextResponse.json({ success: true, data: challans });
  } catch (error: any) {
    console.error('Error fetching outward challans:', error);
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
    
    console.log('Creating outward challan with data:', body);
    
    // Validate party exists
    const party = await PartyMaster.findById(body.party);
    if (!party) {
      return NextResponse.json(
        { success: false, error: 'Party not found' },
        { status: 404 }
      );
    }
    
    // Validate and process each item
    if (!body.items || body.items.length === 0) {
      return NextResponse.json(
        { success: false, error: 'At least one item is required' },
        { status: 400 }
      );
    }
    
    // Validate all items and check stock
    for (const item of body.items) {
      // Validate FG item
      const fgItem = await ItemMaster.findById(item.finishSize);
      if (!fgItem || fgItem.category !== 'FG') {
        return NextResponse.json(
          { success: false, error: `Invalid Finish Size item: ${item.finishSize}` },
          { status: 400 }
        );
      }
      
      // Validate RM item
      const rmItem = await ItemMaster.findById(item.originalSize);
      if (!rmItem || rmItem.category !== 'RM') {
        return NextResponse.json(
          { success: false, error: `Invalid Original Size item: ${item.originalSize}` },
          { status: 400 }
        );
      }
      
      // Check RM stock availability
      const rmStock = await Stock.findOne({ 
        size: item.originalSize, 
        category: 'RM' 
      });
      
      if (!rmStock || rmStock.quantity < item.quantity) {
        return NextResponse.json(
          { 
            success: false, 
            error: `Insufficient RM stock for ${rmItem.size}. Available: ${rmStock?.quantity || 0}, Required: ${item.quantity}` 
          },
          { status: 400 }
        );
      }
    }
    
    // Generate challan number
    const lastChallan = await OutwardChallan.findOne()
      .sort({ createdAt: -1 })
      .select('challanNumber');
    
    let nextNumber = 1;
    if (lastChallan && lastChallan.challanNumber) {
      const match = lastChallan.challanNumber.match(/OC-(\d+)/);
      if (match) {
        nextNumber = parseInt(match[1], 10) + 1;
      }
    }
    const challanNumber = `OC-${nextNumber.toString().padStart(4, '0')}`;
    
    // Create challan
    const challan = await OutwardChallan.create({
      challanNumber,
      party: body.party,
      billTo: body.billTo || body.party, // Default to party if not specified
      shipTo: body.shipTo || body.party, // Default to party if not specified
      items: body.items,
      challanDate: body.challanDate,
      vehicleNumber: body.vehicleNumber,
      transportName: body.transportName,
      ownerName: body.ownerName,
      dispatchedThrough: body.dispatchedThrough || 'By Road',
      eWayBillNo: body.eWayBillNo,
    });
    
    console.log('Challan created:', challan.challanNumber);
    
    // Update stock for each item
    for (const item of body.items) {
      // Deduct RM stock
      const rmStock = await Stock.findOneAndUpdate(
        { size: item.originalSize, category: 'RM' },
        { $inc: { quantity: -item.quantity } },
        { new: true }
      );
      console.log(`RM Stock updated for ${item.originalSize}:`, rmStock?.quantity);
      
      // Add FG stock
      const fgStock = await Stock.findOneAndUpdate(
        { size: item.finishSize, category: 'FG' },
        { 
          $inc: { quantity: item.quantity },
          $set: { lastUpdated: new Date() }
        },
        { 
          new: true, 
          upsert: true,
          setDefaultsOnInsert: true 
        }
      );
      console.log(`FG Stock updated for ${item.finishSize}:`, fgStock?.quantity);
    }
    
    // Populate and return
    const populatedChallan = await OutwardChallan.findById(challan._id)
      .populate('party')
      .populate('billTo')
      .populate('shipTo')
      .populate('items.finishSize')
      .populate('items.originalSize');
    
    return NextResponse.json({ 
      success: true, 
      data: populatedChallan,
      message: `Outward Challan ${challanNumber} created successfully`
    });
  } catch (error: any) {
    console.error('Error creating outward challan:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
