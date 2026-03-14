import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { GSTMaster } from '@/models/GSTMaster';

export async function GET() {
  try {
    await connectDB();
    const gstRates = await GSTMaster.find().populate('party').sort({ createdAt: -1 });
    return NextResponse.json({ success: true, data: gstRates });
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
    
    const gstRate = await GSTMaster.create(body);
    return NextResponse.json(
      { success: true, data: gstRate },
      { status: 201 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 400 }
    );
  }
}
