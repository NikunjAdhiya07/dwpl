import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { TaxInvoice } from '@/models/TaxInvoice';
import { GRN } from '@/models/GRN';
import { OutwardChallan } from '@/models/OutwardChallan';
import { TransportMaster } from '@/models/TransportMaster';
import Company from '@/models/Company';

export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const reportType = searchParams.get('type') || 'sales-register';
    const fromDate = searchParams.get('from');
    const toDate = searchParams.get('to');
    const partyId = searchParams.get('party');
    const voucherNumber = searchParams.get('voucher');
    const transporterName = searchParams.get('transporterName');

    // Build date filter
    const dateFilter: Record<string, any> = {};
    if (fromDate || toDate) {
      if (fromDate) {
        const from = new Date(fromDate);
        from.setHours(0, 0, 0, 0);
        dateFilter.$gte = from;
      } else {
        dateFilter.$gte = new Date('2000-01-01');
      }
      if (toDate) {
        const to = new Date(toDate);
        to.setHours(23, 59, 59, 999);
        dateFilter.$lte = to;
      } else {
        dateFilter.$lte = new Date();
      }
    }

    // Fetch company info for header
    const company = await Company.findOne({ isActive: true }).lean();

    if (reportType === 'sales-register') {
      // Tax Invoice (Sales Register)
      const query: Record<string, any> = {};
      if (Object.keys(dateFilter).length) query.invoiceDate = dateFilter;
      if (partyId) query.party = partyId;
      if (voucherNumber) query.invoiceNumber = { $regex: voucherNumber, $options: 'i' };

      const invoices = await TaxInvoice.find(query)
        .populate('party', 'partyName address gstNumber')
        .populate('billTo', 'partyName address gstNumber')
        .sort({ invoiceDate: 1 })
        .lean();

      // Compute totals
      let totalBaseAmount = 0;
      let totalTransportCharges = 0;
      let totalAssessableValue = 0;
      let totalCgstAmount = 0;
      let totalSgstAmount = 0;
      let totalIgstAmount = 0;
      let totalTcsAmount = 0;
      let totalRoundOff = 0;
      let totalGrandTotal = 0;

      for (const inv of invoices) {
        totalBaseAmount += inv.baseAmount || 0;
        totalTransportCharges += inv.transportCharges || 0;
        totalAssessableValue += inv.assessableValue || 0;
        totalCgstAmount += inv.cgstAmount || 0;
        totalSgstAmount += inv.sgstAmount || 0;
        totalIgstAmount += inv.igstAmount || 0;
        totalTcsAmount += inv.tcsAmount || 0;
        totalRoundOff += inv.roundOff || 0;
        totalGrandTotal += inv.totalAmount || 0;
      }

      return NextResponse.json({
        success: true,
        reportType: 'sales-register',
        company,
        filters: { fromDate, toDate, partyId, voucherNumber, transporterName },
        data: invoices,
        totals: {
          totalBaseAmount,
          totalTransportCharges,
          totalAssessableValue,
          totalCgstAmount,
          totalSgstAmount,
          totalIgstAmount,
          totalTcsAmount,
          totalRoundOff,
          totalGrandTotal,
          count: invoices.length,
        },
      });
    }

    if (reportType === 'challan-register') {
      const query: Record<string, any> = {};
      if (Object.keys(dateFilter).length) query.challanDate = dateFilter;
      if (partyId) query.party = partyId;
      if (voucherNumber) query.challanNumber = { $regex: voucherNumber, $options: 'i' };

      const challans = await OutwardChallan.find(query)
        .populate('party', 'partyName address gstNumber')
        .sort({ challanDate: 1 })
        .lean();

      let totalAmount = 0;
      for (const c of challans) totalAmount += c.totalAmount || 0;

      return NextResponse.json({
        success: true,
        reportType: 'challan-register',
        company,
        filters: { fromDate, toDate, partyId, voucherNumber, transporterName },
        data: challans,
        totals: { totalAmount, count: challans.length },
      });
    }

    if (reportType === 'grn-register') {
      const query: Record<string, any> = {};
      if (Object.keys(dateFilter).length) query.grnDate = dateFilter;
      if (partyId) query.sendingParty = partyId;
      if (voucherNumber) query.partyChallanNumber = { $regex: voucherNumber, $options: 'i' };

      const grns = await GRN.find(query)
        .populate('sendingParty', 'partyName address gstNumber')
        .populate('items.rmSize', 'size grade itemCode')
        .sort({ grnDate: 1 })
        .lean();

      let totalValue = 0;
      for (const g of grns) totalValue += g.totalValue || 0;

      return NextResponse.json({
        success: true,
        reportType: 'grn-register',
        company,
        filters: { fromDate, toDate, partyId, voucherNumber, transporterName },
        data: grns,
        totals: { totalValue, count: grns.length },
      });
    }

    if (reportType === 'transporter-accounts') {
      const query: Record<string, any> = {};
      if (Object.keys(dateFilter).length) query.invoiceDate = dateFilter;
      if (partyId) query.party = partyId;
      if (voucherNumber) query.invoiceNumber = { $regex: voucherNumber, $options: 'i' };

      // Get invoices that match base filters
      let invoices = await TaxInvoice.find(query)
        .populate('party', 'partyName address gstNumber')
        .sort({ invoiceDate: 1 })
        .lean();

      // Fallback for missing transportName
      const transports = await TransportMaster.find().lean();
      const transportMap = new Map();
      transports.forEach((t: any) => {
        if (t.vehicleNumber) {
          transportMap.set(t.vehicleNumber.toLowerCase().trim(), t.transporterName);
        }
      });

      // Compute totals and apply transporterName filter in memory
      let totalTransportCharges = 0;
      let totalAssessableValue = 0;
      let totalGrandTotal = 0;
      
      const filteredInvoices: any[] = [];

      for (const inv of invoices) {
        if (!inv.transportName && inv.vehicleNumber) {
          const vNum = inv.vehicleNumber.toLowerCase().trim();
          if (transportMap.has(vNum)) {
            inv.transportName = transportMap.get(vNum);
          }
        }
        
        // Apply transporterName filter if provided
        if (transporterName && (!inv.transportName || inv.transportName.toLowerCase() !== transporterName.toLowerCase())) {
          continue;
        }
        
        filteredInvoices.push(inv);

        totalTransportCharges += inv.transportCharges || 0;
        totalAssessableValue += inv.assessableValue || 0;
        totalGrandTotal += inv.totalAmount || 0;
      }

      return NextResponse.json({
        success: true,
        reportType: 'transporter-accounts',
        company,
        filters: { fromDate, toDate, partyId, voucherNumber, transporterName },
        data: filteredInvoices,
        totals: {
          totalTransportCharges,
          totalAssessableValue,
          totalGrandTotal,
          count: filteredInvoices.length,
        },
      });
    }

    return NextResponse.json({ success: false, error: 'Unknown report type' }, { status: 400 });
  } catch (error: any) {
    console.error('Reports API error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
