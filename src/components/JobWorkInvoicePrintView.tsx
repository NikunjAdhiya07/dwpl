'use client';

import React from 'react';
import { formatIndianCurrency, numberToIndianWords } from '@/lib/numberToWords';

interface InvoiceItem {
  finishSize: {
    itemCode: string;
    size: string;
    grade: string;
    hsnCode: string;
  };
  originalSize: {
    itemCode: string;
    size: string;
    grade: string;
  };
  annealingCount?: number;
  drawPassCount?: number;
  issuedChallanNo?: string;
  coilNumber?: string;
  coilReference?: string;
  quantity: number;
  rate: number;
  itemTotal: number;
}

interface TaxInvoice {
  invoiceNumber: string;
  invoiceDate: string;
  party: {
    partyName: string;
    address: string;
    gstNumber: string;
  };
  billTo?: {
    partyName: string;
    address: string;
    gstNumber: string;
  };
  shipTo?: {
    partyName: string;
    address: string;
    gstNumber: string;
  };
  items: InvoiceItem[];
  baseAmount: number;
  transportCharges?: number;
  assessableValue?: number;
  cgstPercentage?: number;
  sgstPercentage?: number;
  igstPercentage?: number;
  cgstAmount?: number;
  sgstAmount?: number;
  igstAmount?: number;
  gstAmount: number;
  tcsPercentage?: number;
  tcsAmount?: number;
  totalAmount: number;
  vehicleNumber?: string;
  transportName?: string;
  ownerName?: string;
  eWayBillNo?: string;
  dispatchedThrough?: string;
}

interface Company {
  companyName: string;
  address: string;
  registeredOffice: string;
  cin: string;
  gstin: string;
  pan?: string;
  state: string;
  stateCode: string;
}

interface JobWorkInvoicePrintViewProps {
  invoice: TaxInvoice;
  company?: Company;
  copyType?: string;
}

const JobWorkInvoicePrintView: React.FC<JobWorkInvoicePrintViewProps> = ({ 
  invoice,
  company,
  copyType = 'Original For Recipient' 
}) => {
  // Default company data if not provided
  const companyData: Company = company || {
    companyName: 'Drawwell Wires Pvt. Ltd.',
    address: "S'nagar–Lakhtar Highway, At. Zamar\nDist. Surendranagar",
    registeredOffice: 'Plot No. 1005/B1, Phase-III, GIDC, Wadhwan',
    cin: 'U27100GJ2020PTC118828',
    gstin: '24AAECL4523G1ZT',
    pan: '',
    state: 'Gujarat',
    stateCode: '24',
  };
  // Ensure we have at least 12 rows for a professional look
  const minRows = 12;
  const emptyRowsCount = Math.max(0, minRows - (invoice.items?.length ?? 0));

  return (
    <div className="print-page bg-white text-black font-sans p-[10mm] w-[210mm] min-h-[297mm] box-border mx-auto border border-gray-200">
      {/* Header Section */}
      <div className="flex justify-between items-start mb-4">
        <div className="w-2/5 text-[11px] leading-snug">
          <p className="font-bold text-[15px] mb-1">{companyData.companyName}</p>
          <p className="mt-1 whitespace-pre-line">{companyData.address}</p>
          <p className="mt-2"><span className="font-semibold">Reg. Off.:</span> {companyData.registeredOffice}</p>
          <p className="mt-2 text-[10px]"><span className="font-semibold">CIN:</span> {companyData.cin}</p>
          <p className="text-[10px]"><span className="font-semibold">GSTIN/UIN:</span> {companyData.gstin}</p>
          <p className="text-[10px]"><span className="font-semibold">State Name:</span> {companyData.state}, Code: {companyData.stateCode}</p>
        </div>
        <div className="w-1/5 text-center">
          <h1 className="text-[18px] font-bold underline uppercase tracking-wider">Job Work Invoice</h1>
        </div>
        <div className="w-2/5 text-right text-[12px]">
          <p className="font-semibold">({copyType})</p>
        </div>
      </div>

      <div className="border border-black">
        {/* Party & Invoice Details Section */}
        <div className="flex border-b border-black">
          {/* Left Section - Party Details */}
          <div className="flex-1 border-r border-black p-2 min-h-[120px]">
            <div className="mb-3">
              <p className="font-bold underline text-[10px] mb-1 uppercase">Bill To:</p>
              <p className="font-bold text-[12px]">{invoice.billTo?.partyName || invoice.party.partyName}</p>
              <p className="text-[11px] whitespace-pre-line">{invoice.billTo?.address || invoice.party.address}</p>
              <p className="text-[11px] font-bold mt-1">GSTIN: {invoice.billTo?.gstNumber || invoice.party.gstNumber}</p>
            </div>
            <div>
              <p className="font-bold underline text-[10px] mb-1 uppercase">Ship To:</p>
              <p className="font-bold text-[12px]">{invoice.shipTo?.partyName || invoice.party.partyName}</p>
              <p className="text-[11px] whitespace-pre-line">{invoice.shipTo?.address || invoice.party.address}</p>
            </div>
          </div>

          {/* Right Section - Invoice Details */}
          <div className="w-[40%] p-2">
            <div className="grid grid-cols-2 gap-y-1 text-[11px]">
              <div className="font-bold">Invoice No:</div>
              <div>{invoice.invoiceNumber}</div>
              
              <div className="font-bold">Invoice Date:</div>
              <div>{new Date(invoice.invoiceDate).toLocaleDateString('en-IN')}</div>
              
              <div className="font-bold">Vehicle No:</div>
              <div>{invoice.vehicleNumber || '-'}</div>
              
              <div className="font-bold">Transporter:</div>
              <div>{invoice.transportName || '-'}</div>
              
              <div className="font-bold">E-Way Bill No:</div>
              <div>{invoice.eWayBillNo || '-'}</div>
            </div>
          </div>
        </div>

        {/* Item Details Table */}
        <table className="w-full border-collapse text-[10px]">
          <thead>
            <tr className="border-b border-black font-bold bg-gray-50">
              <th className="border-r border-black px-1 py-1 w-[30px] text-center">Sr. No.</th>
              <th className="border-r border-black px-2 py-1 text-left">Description (Finish Size)</th>
              <th className="border-r border-black px-2 py-1 text-left w-[85px]">RM</th>
              <th className="border-r border-black px-2 py-1 text-left w-[60px]">Wire Grade</th>
              <th className="border-r border-black px-2 py-1 text-center w-[60px]">COIL</th>
              <th className="border-r border-black px-2 py-1 text-center w-[65px]">Process</th>
              <th className="border-r border-black px-2 py-1 text-center w-[75px]">Issued Challan No.</th>
              <th className="border-r border-black px-2 py-1 text-center w-[50px]">HSN</th>
              <th className="border-r border-black px-2 py-1 text-center w-[50px]">Qty</th>
              <th className="border-r border-black px-2 py-1 text-center w-[50px]">Rate</th>
              <th className="px-2 py-1 text-right w-[70px]">Amount</th>
            </tr>
          </thead>
          <tbody>
            {invoice.items?.map((item, index) => (
              <tr key={index} className="border-b border-black last:border-b-0 min-h-[30px]">
                <td className="border-r border-black px-1 py-2 text-center">{index + 1}</td>
                <td className="border-r border-black px-2 py-2">
                  <p className="font-bold">{item.finishSize.itemCode} - {item.finishSize.size}</p>
                </td>
                <td className="border-r border-black px-2 py-2">
                  <p>{item.originalSize.itemCode} - {item.originalSize.size}</p>
                </td>
                <td className="border-r border-black px-2 py-2 text-center">
                  <p className="font-semibold">{item.finishSize.grade}</p>
                </td>
                <td className="border-r border-black px-2 py-2 text-center">
                  {item.coilNumber || item.coilReference ? (
                    <>
                      {item.coilNumber && <p className="font-medium">{item.coilNumber}</p>}
                      {item.coilReference && <p className="text-[8px] text-gray-600">{item.coilReference}</p>}
                    </>
                  ) : '-'}
                </td>
                <td className="border-r border-black px-2 py-2 text-center capitalize">
                  {item.annealingCount && item.annealingCount > 0 ? `Anneal (${item.annealingCount})` : ''}
                  {item.annealingCount && item.annealingCount > 0 && item.drawPassCount && item.drawPassCount > 0 ? ', ' : ''}
                  {item.drawPassCount && item.drawPassCount > 0 ? `Drawing (${item.drawPassCount})` : ''}
                  {(!item.annealingCount && !item.drawPassCount) ? '-' : ''}
                </td>
                <td className="border-r border-black px-2 py-2 text-center">{item.issuedChallanNo || '-'}</td>
                <td className="border-r border-black px-2 py-2 text-center">{item.finishSize.hsnCode}</td>
                <td className="border-r border-black px-2 py-2 text-center font-bold">{item.quantity.toFixed(2)}</td>
                <td className="border-r border-black px-2 py-2 text-center">{item.rate.toFixed(2)}</td>
                <td className="px-2 py-2 text-right font-bold">{formatIndianCurrency(item.itemTotal)}</td>
              </tr>
            ))}
            
            {/* Empty Rows */}
            {Array.from({ length: emptyRowsCount }).map((_, i) => (
              <tr key={`empty-${i}`} className="border-b border-black last:border-b-0 h-[30px]">
                <td className="border-r border-black px-1 py-2"></td>
                <td className="border-r border-black px-2 py-2"></td>
                <td className="border-r border-black px-2 py-2"></td>
                <td className="border-r border-black px-2 py-2"></td>
                <td className="border-r border-black px-2 py-2"></td>
                <td className="border-r border-black px-2 py-2"></td>
                <td className="border-r border-black px-2 py-2"></td>
                <td className="border-r border-black px-2 py-2"></td>
                <td className="border-r border-black px-2 py-2"></td>
                <td className="border-r border-black px-2 py-2"></td>
                <td className="px-2 py-2"></td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Summary Section */}
        <div className="flex border-t border-black">
          <div className="w-[60%] border-r border-black">
            <div className="p-2 border-b border-black min-h-[35px] flex items-center">
              <p className="italic text-[8px] leading-tight">Rs. {numberToIndianWords(invoice.baseAmount)}</p>
            </div>
            <div className="p-2 border-b border-black">
              <p className="font-bold text-[8px] leading-tight">Net Total Rs {numberToIndianWords(invoice.totalAmount)}</p>
            </div>
            <div className="p-2 font-bold text-[9px] flex items-center">
              Net Payable : {formatIndianCurrency(invoice.totalAmount)}
            </div>
          </div>
          <div className="w-[40%] text-[8.5px]">
            <div className="grid grid-cols-[1fr_80px] divide-x divide-black border-collapse">
              <span className="p-1 px-2 border-b border-black">Transport Charges</span>
              <span className="p-1 px-2 border-b border-black text-right">{formatIndianCurrency(invoice.transportCharges || 0)}</span>
              
              <span className="p-1 px-2 border-b border-black font-bold">Ass Value :</span>
              <span className="p-1 px-2 border-b border-black text-right font-bold">{formatIndianCurrency(invoice.assessableValue || invoice.baseAmount)}</span>
              
              <span className="p-1 px-2 border-b border-black">CGST {(invoice.cgstPercentage || 0).toFixed(2)}%:</span>
              <span className="p-1 px-2 border-b border-black text-right">{formatIndianCurrency(invoice.cgstAmount || 0)}</span>
              
              <span className="p-1 px-2 border-b border-black">SGST {(invoice.sgstPercentage || 0).toFixed(2)}%:</span>
              <span className="p-1 px-2 border-b border-black text-right">{formatIndianCurrency(invoice.sgstAmount || 0)}</span>
              
              <span className="p-1 px-2 border-b border-black">IGST {(invoice.igstPercentage || 0).toFixed(2)}%:</span>
              <span className="p-1 px-2 border-b border-black text-right">{formatIndianCurrency(invoice.igstAmount || 0)}</span>
              
              <span className="p-1 px-2 border-b border-black">TCS {(invoice.tcsPercentage || 0).toFixed(1)}%:</span>
              <span className="p-1 px-2 border-b border-black text-right">{formatIndianCurrency(invoice.tcsAmount || 0)}</span>
              
              <span className="p-1 px-2 font-bold" style={{ backgroundColor: '#f8fafc' }}>Net Payable :</span>
              <span className="p-1 px-2 text-right font-bold" style={{ backgroundColor: '#f8fafc' }}>{formatIndianCurrency(invoice.totalAmount)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Footer Section */}
      <div className="mt-auto pt-10">
        <div className="flex justify-between items-end">
          <div className="w-1/3">
            <div className="border-t border-black pt-1 w-2/3 text-center text-[11px]">
              <p className="font-bold">Prepared By:</p>
            </div>
          </div>
          <div className="w-1/3">
            <div className="border-t border-black pt-1 w-2/3 mx-auto text-center text-[11px]">
              <p className="font-bold">Verified By:</p>
            </div>
          </div>
          <div className="w-1/3 text-right">
            <div className="inline-block text-center text-[11px]">
              <p className="mb-12 font-bold">Authorized Signature</p>
              <div className="border-t border-black pt-1">
                <p className="font-bold">(For {companyData.companyName})</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Terms and Conditions */}
      <div className="mt-8 text-[9px] italic text-gray-500 text-center">
        <p>This is a computer generated job work invoice and does not require a physical signature.</p>
        <p>Subject to Rajkot Jurisdiction.</p>
      </div>
    </div>
  );
};

export default JobWorkInvoicePrintView;
