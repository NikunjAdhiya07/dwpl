import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { connectDB } from '@/lib/db';
import { BOM } from '@/models/BOM';
import { ItemMaster } from '@/models/ItemMaster';

export async function GET(request: NextRequest) {
  try {
    await connectDB();
    const { searchParams } = new URL(request.url);
    const fgSize = searchParams.get('fgSize');
    
    const filter = fgSize ? { fgSize, status: 'Active' } : {};
    const boms = await BOM.find(filter).sort({ fgSize: 1, rmSize: 1 });
    
    return NextResponse.json({ success: true, data: boms });
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
    
    // Check if autoCreateFG flag is set (from frontend)
    const autoCreateFG = body.autoCreateFG !== false; // Default to true
    
    // Check RM size exists (can be _id or size string)
    const rmQuery = mongoose.isValidObjectId(body.rmSize) 
      ? { _id: body.rmSize } 
      : { size: body.rmSize, category: 'RM' };
    const rmItem = await ItemMaster.findOne(rmQuery);
    
    if (!rmItem) {
      return NextResponse.json(
        { success: false, error: `RM item "${body.rmSize}" not found in Item Master. Please add it first.` },
        { status: 400 }
      );
    }
    
    // Check if FG size exists (can be _id or size string)
    const fgQuery = mongoose.isValidObjectId(body.fgSize)
      ? { _id: body.fgSize }
      : { size: body.fgSize, category: 'FG' };
    let fgItem = await ItemMaster.findOne(fgQuery);
    
    if (!fgItem) {
      if (autoCreateFG) {
        // Auto-create the FG item using RM item's grade
        try {
          fgItem = await ItemMaster.create({
            category: 'FG',
            size: body.fgSize,
            grade: body.grade || rmItem.grade,
            hsnCode: rmItem.hsnCode || '7223',
            status: 'Active'
          });
          console.log(`✅ Auto-created FG item: ${body.fgSize} (Grade: ${fgItem.grade})`);
        } catch (createError: any) {
          // If it already exists with different attributes, try to find it
          fgItem = await ItemMaster.findOne({ size: body.fgSize, category: 'FG' });
          if (!fgItem) {
            return NextResponse.json(
              { success: false, error: `Failed to create FG item "${body.fgSize}": ${createError.message}` },
              { status: 400 }
            );
          }
        }
      } else {
        return NextResponse.json(
          { success: false, error: `FG size "${body.fgSize}" not found in Item Master` },
          { status: 400 }
        );
      }
    }
    
    const bom = await BOM.create(body);
    return NextResponse.json(
      { 
        success: true, 
        data: bom,
        fgItemCreated: !fgItem ? false : true,
        message: `BOM created successfully${fgItem ? ` (FG item ${body.fgSize} was auto-created)` : ''}`
      },
      { status: 201 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 400 }
    );
  }
}
