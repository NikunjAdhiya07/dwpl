import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { Stock } from '@/models/Stock';
import { ItemMaster } from '@/models/ItemMaster';

/**
 * Diagnostic endpoint to check stock status
 * Usage: GET /api/stock/diagnostic?itemId=<item_id>
 */
export async function GET(request: NextRequest) {
  try {
    await connectDB();
    const { searchParams } = new URL(request.url);
    const itemId = searchParams.get('itemId');
    
    if (!itemId) {
      // Return all stocks with populated item details
      const allStocks = await Stock.find().populate('size');
      return NextResponse.json({
        success: true,
        totalStocks: allStocks.length,
        stocks: allStocks.map(s => ({
          _id: s._id,
          category: s.category,
          sizeId: s.size,
          quantity: s.quantity,
          lastUpdated: s.lastUpdated
        }))
      });
    }
    
    // Check specific item
    const item = await ItemMaster.findById(itemId);
    if (!item) {
      return NextResponse.json({
        success: false,
        error: 'Item not found',
        itemId
      }, { status: 404 });
    }
    
    const stock = await Stock.findOne({ 
      category: item.category, 
      size: itemId 
    });
    
    return NextResponse.json({
      success: true,
      item: {
        _id: item._id,
        itemCode: item.itemCode,
        size: item.size,
        grade: item.grade,
        category: item.category
      },
      stock: stock ? {
        _id: stock._id,
        category: stock.category,
        sizeId: stock.size,
        quantity: stock.quantity,
        lastUpdated: stock.lastUpdated
      } : null,
      hasStock: !!stock,
      stockQuantity: stock?.quantity || 0
    });
  } catch (error: any) {
    return NextResponse.json(
      { 
        success: false, 
        error: error.message,
        stack: error.stack 
      },
      { status: 500 }
    );
  }
}
