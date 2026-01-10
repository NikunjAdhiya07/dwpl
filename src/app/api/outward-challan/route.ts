import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { OutwardChallan } from '@/models/OutwardChallan';
import { PartyMaster } from '@/models/PartyMaster';
import { ItemMaster } from '@/models/ItemMaster';

export async function GET() {
  try {
    await connectDB();
    
    const challans = await OutwardChallan.find()
      .populate('party')
      .populate('finishSize')
      .populate('originalSize')
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
