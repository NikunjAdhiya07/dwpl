import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { PartyMaster } from '@/models/PartyMaster';
import { ItemMaster } from '@/models/ItemMaster';
import { OutwardChallan } from '@/models/OutwardChallan';
import { TaxInvoice } from '@/models/TaxInvoice';
import { GRN } from '@/models/GRN';
import { BOM } from '@/models/BOM';
import { GSTMaster } from '@/models/GSTMaster';

export async function GET() {
  try {
    await connectDB();
    
    // Count totals
    const totalParties = await PartyMaster.countDocuments();
    const totalItems = await ItemMaster.countDocuments();
    const totalChallans = await OutwardChallan.countDocuments();
    const totalInvoices = await TaxInvoice.countDocuments();
    const totalGRNs = await GRN.countDocuments();
    const totalBOMs = await BOM.countDocuments();
    const totalGSTs = await GSTMaster.countDocuments();
    
    return NextResponse.json({
      success: true,
      data: {
        totalParties,
        totalItems,
        totalChallans,
        totalInvoices,
        totalGRNs,
        totalBOMs,
        totalGSTs,
        pendingChallans: 0,
        pendingInvoices: 0,
      },
    });
  } catch (error: any) {
    console.error('Dashboard stats error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
