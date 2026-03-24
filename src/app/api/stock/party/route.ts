import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { GRN } from '@/models/GRN';
import { OutwardChallan } from '@/models/OutwardChallan';

/**
 * GET /api/stock/party?partyId=xxx
 * Returns party-specific stock computed from GRN (inward) minus OC (outward) for a specific party.
 */
export async function GET(request: NextRequest) {
  try {
    await connectDB();
    const { searchParams } = new URL(request.url);
    const partyId = searchParams.get('partyId');

    if (!partyId) {
      return NextResponse.json({ success: false, error: 'partyId is required' }, { status: 400 });
    }

    // Fetch all GRNs for the party (RM inward)
    const grns = await GRN.find({ sendingParty: partyId })
      .populate('items.rmSize')
      .lean();

    // Fetch all OCs for the party (RM outward)
    const ocs = await OutwardChallan.find({ party: partyId })
      .populate('items.originalSize')
      .populate('items.finishSize')
      .lean();

    // Build a map: itemId -> { item info, rmQty, fgQty }
    const stockMap: Record<string, { 
      itemId: string;
      itemCode: string;
      size: string;
      grade: string;
      category: 'RM' | 'FG';
      quantity: number;
    }> = {};

    // Add GRN quantities (RM inward)
    for (const grn of grns) {
      for (const item of (grn as any).items || []) {
        const rmSize = item.rmSize;
        if (!rmSize || typeof rmSize !== 'object') continue;
        const id = String(rmSize._id);
        if (!stockMap[id]) {
          stockMap[id] = {
            itemId: id,
            itemCode: rmSize.itemCode || '',
            size: rmSize.size || '',
            grade: rmSize.grade || '',
            category: 'RM',
            quantity: 0,
          };
        }
        stockMap[id].quantity += item.quantity || 0;
      }
    }

    // Subtract OC quantities (RM outward) and add FG quantities
    for (const oc of ocs) {
      for (const item of (oc as any).items || []) {
        const rmSize = item.originalSize;
        const fgSize = item.finishSize;

        // Deduct RM
        if (rmSize && typeof rmSize === 'object') {
          const rmId = String(rmSize._id);
          if (stockMap[rmId]) {
            stockMap[rmId].quantity -= item.quantity || 0;
          }
        }

        // Add FG
        if (fgSize && typeof fgSize === 'object') {
          const fgId = String(fgSize._id);
          if (!stockMap[fgId]) {
            stockMap[fgId] = {
              itemId: fgId,
              itemCode: fgSize.itemCode || '',
              size: fgSize.size || '',
              grade: fgSize.grade || '',
              category: 'FG',
              quantity: 0,
            };
          }
          stockMap[fgId].quantity += item.quantity || 0;
        }
      }
    }

    const stockList = Object.values(stockMap).filter(s => s.quantity > 0);

    return NextResponse.json({ success: true, data: stockList });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
