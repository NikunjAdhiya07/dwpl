import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import Company from '@/models/Company';

export async function GET() {
  try {
    await connectDB();
    
    // Get the active company (assuming single company setup)
    const company = await Company.findOne({ isActive: true });
    
    if (!company) {
      // Return default company data if none exists
      return NextResponse.json({
        success: true,
        data: {
          companyName: 'Drawwell Wires Pvt. Ltd.',
          address: "S'nagar–Lakhtar Highway, At. Zamar\nDist. Surendranagar",
          registeredOffice: 'Plot No. 1005/B1, Phase-III, GIDC, Wadhwan',
          cin: 'U27100GJ2020PTC118828',
          gstin: '24AAECL4523G1ZT',
          pan: '',
          state: 'Gujarat',
          stateCode: '24',
        },
      });
    }
    
    return NextResponse.json({
      success: true,
      data: company,
    });
  } catch (error: any) {
    console.error('Error fetching company:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to fetch company',
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    await connectDB();
    const body = await request.json();
    
    // Deactivate all existing companies
    await Company.updateMany({}, { isActive: false });
    
    // Create new company
    const company = await Company.create({
      ...body,
      isActive: true,
    });
    
    return NextResponse.json({
      success: true,
      data: company,
    });
  } catch (error: any) {
    console.error('Error creating company:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to create company',
      },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    await connectDB();
    const body = await request.json();
    const { _id, ...updateData } = body;
    
    if (!_id) {
      return NextResponse.json(
        {
          success: false,
          error: 'Company ID is required',
        },
        { status: 400 }
      );
    }
    
    const company = await Company.findByIdAndUpdate(
      _id,
      updateData,
      { new: true, runValidators: true }
    );
    
    if (!company) {
      return NextResponse.json(
        {
          success: false,
          error: 'Company not found',
        },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      success: true,
      data: company,
    });
  } catch (error: any) {
    console.error('Error updating company:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to update company',
      },
      { status: 500 }
    );
  }
}
