import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { GSTMaster } from '@/models/GSTMaster';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    const body = await request.json();
    
    const { id } = await params;
    
    // Check if another GST master exists for this party
    if (body.party) {
      const existingGST = await GSTMaster.findOne({ 
        party: body.party, 
        _id: { $ne: id } 
      });
      
      if (existingGST) {
        return NextResponse.json(
          { success: false, error: 'A GST rate for this party already exists' },
          { status: 400 }
        );
      }
    }

    const gstRate = await GSTMaster.findByIdAndUpdate(
      id,
      body,
      { new: true, runValidators: true }
    ).populate('party');

    if (!gstRate) {
      return NextResponse.json(
        { success: false, error: 'GST rate not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: gstRate });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 400 }
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
    
    const gstRate = await GSTMaster.findByIdAndDelete(id);
    
    if (!gstRate) {
      return NextResponse.json(
        { success: false, error: 'GST rate not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: {} });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 400 }
    );
  }
}
