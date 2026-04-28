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

    if (!body.party) {
      return NextResponse.json(
        { success: false, error: 'Party is required' },
        { status: 400 }
      );
    }

    // Upsert: update if party already exists, otherwise insert new
    const gstRate = await GSTMaster.findOneAndUpdate(
      { party: body.party },
      {
        $set: {
          cgstPercentage: body.cgstPercentage,
          sgstPercentage: body.sgstPercentage,
          igstPercentage: body.igstPercentage,
          tcsPercentage: body.tcsPercentage ?? 0,
          isActive: body.isActive ?? true,
        },
      },
      { new: true, upsert: true, setDefaultsOnInsert: true, runValidators: true }
    ).populate('party');

    return NextResponse.json(
      { success: true, data: gstRate },
      { status: 201 }
    );
  } catch (error: any) {
    // Surface E11000 duplicate key errors clearly
    if (error.code === 11000) {
      return NextResponse.json(
        { success: false, error: 'A GST rate already exists for this party. Use Edit to update it.' },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 400 }
    );
  }
}
