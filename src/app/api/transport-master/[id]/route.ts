import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { TransportMaster } from '@/models/TransportMaster';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    const { id } = await params;
    const body = await request.json();

    const transport = await TransportMaster.findByIdAndUpdate(
      id,
      { $set: body },
      { new: true, runValidators: true }
    );

    if (!transport) {
      return NextResponse.json(
        { success: false, error: 'Transport record not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: transport });
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

    const transport = await TransportMaster.findByIdAndDelete(id);

    if (!transport) {
      return NextResponse.json(
        { success: false, error: 'Transport record not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: transport });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
