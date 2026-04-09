'use client';

import React from 'react';
import { formatIndianCurrency, numberToIndianWords } from '@/lib/numberToWords';

interface CoilEntry {
  coilNumber?: string;
  coilWeight?: number;
}

interface ChallanItem {
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
  processDetails?: string;
  processType?: string;
  issuedChallanNo?: string;
  coilNumber?: string;
  coilReference?: string;
  coilEntries?: CoilEntry[];
  quantity: number;
  rate: number;
  itemTotal: number;
  annealingCount?: number;
  drawPassCount?: number;
}

interface OutwardChallan {
  challanNumber: string;
  challanDate: string;
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
  items: ChallanItem[];
  totalAmount: number;
  vehicleNumber?: string;
  transportName?: string;
  eWayBillNo?: string;
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

interface ChallanPrintViewProps {
  challan: OutwardChallan;
  company?: Company;
  copyType?: string;
}

const ChallanPrintView: React.FC<ChallanPrintViewProps> = ({ 
  challan,
  company,
  copyType = 'Original' 
}) => {
  // Default company data if not provided
  const companyData: Company = company || {
    companyName: 'Drawell Wires Pvt. Ltd.',
    address: "S'nagar–Lakhtar Highway, At. Zamar\nDist. Surendranagar",
    registeredOffice: 'Plot No. 1005/B1, Phase-III, GIDC, Wadhwan',
    cin: 'U27100GJ2020PTC118828',
    gstin: '24AAECL4523G1ZT',
    pan: '',
    state: 'Gujarat',
    stateCode: '24',
  };
  // Ensure we have at least 15 rows for a professional look, filling with empty rows if needed
  const minRows = 12;
  const emptyRowsCount = Math.max(0, minRows - challan.items.length);

  return (
    <div className="print-page bg-white text-black font-sans p-[10mm] w-[210mm] min-h-[297mm] box-border mx-auto border border-gray-200">
      {/* Header Section */}
      <div className="flex justify-between items-start mb-6">
        <div className="w-[45%] text-[11px] leading-snug">
          <p className="font-bold text-[16px] mb-1">{companyData.companyName}</p>
          <p className="whitespace-pre-line text-gray-700">{companyData.address}</p>
          <div className="mt-2 space-y-0.5">
            <p><span className="font-semibold text-gray-600">Reg. Off.:</span> {companyData.registeredOffice}</p>
            <p className="text-[10px]"><span className="font-semibold text-gray-600">CIN:</span> {companyData.cin}</p>
            <p className="text-[10px]"><span className="font-semibold text-gray-600">GSTIN/UIN:</span> {companyData.gstin}</p>
            <p className="text-[10px]"><span className="font-semibold text-gray-600">State Name:</span> {companyData.state}, Code: {companyData.stateCode}</p>
          </div>
        </div>
        <div className="w-[30%] text-center pt-2">
          <p className="text-[14px] font-bold uppercase tracking-[0.2em] mb-1">Delivery</p>
          <h1 className="text-[24px] font-bold underline uppercase tracking-wider leading-none">Challan</h1>
        </div>
        <div className="w-[25%] text-right text-[12px] pt-1">
          <p className="font-bold text-gray-600">({copyType})</p>
        </div>
      </div>

      <div className="border border-black">
        {/* Party & Transport Details Section */}
        <div className="flex border-b border-black">
          {/* Left Section - Party Details */}
          <div className="flex-1 border-r border-black p-2 min-h-[120px]">
            <div className="mb-3">
              <p className="font-bold underline text-[10px] mb-1 uppercase">Bill To:</p>
              <p className="font-bold text-[12px]">{challan.billTo?.partyName || challan.party?.partyName || ''}</p>
              <p className="text-[11px] whitespace-pre-line">{challan.billTo?.address || challan.party?.address || ''}</p>
              <p className="text-[11px] font-bold mt-1">GSTIN: {challan.billTo?.gstNumber || challan.party?.gstNumber || ''}</p>
            </div>
            <div>
              <p className="font-bold underline text-[10px] mb-1 uppercase">Ship To:</p>
              <p className="font-bold text-[12px]">{challan.shipTo?.partyName || challan.party?.partyName || ''}</p>
              <p className="text-[11px] whitespace-pre-line">{challan.shipTo?.address || challan.party?.address || ''}</p>
            </div>
          </div>

          {/* Right Section - Challan Details */}
          <div className="w-[40%] p-2">
            <div className="grid grid-cols-2 gap-y-1 text-[11px]">
              <div className="font-bold">Challan No:</div>
              <div>{challan.challanNumber}</div>
              
              <div className="font-bold">Challan Date:</div>
              <div>{new Date(challan.challanDate).toLocaleDateString('en-IN')}</div>
              
              <div className="font-bold">Vehicle No:</div>
              <div>{challan.vehicleNumber || '-'}</div>
              
              <div className="font-bold">Transporter:</div>
              <div>{challan.transportName || '-'}</div>
              
              <div className="font-bold">E-Way Bill No:</div>
              <div>{challan.eWayBillNo || '-'}</div>
            </div>
          </div>
        </div>

        {/* Item Details Table */}
        <table className="w-full border-collapse text-[10px]">
          <thead>
            <tr className="border-b border-black font-bold bg-gray-50">
              <th className="border-r border-black px-1 py-2 w-[40px] text-center">Sr. No.</th>
              <th className="border-r border-black px-2 py-2 text-left">Description (Finish Size)</th>
              <th className="border-r border-black px-2 py-2 text-left w-[100px]">RM</th>
              <th className="border-r border-black px-2 py-2 text-center w-[70px]">Wire Grade</th>
              <th className="border-r border-black px-2 py-2 text-center w-[70px]">COIL</th>
              <th className="border-r border-black px-2 py-2 text-center w-[80px]">Process</th>
              <th className="border-r border-black px-2 py-2 text-center w-[90px]">Issued Challan No.</th>
              <th className="border-r border-black px-2 py-2 text-center w-[60px]">Qty</th>
              <th className="border-r border-black px-2 py-2 text-center w-[60px]">Rate</th>
              <th className="px-2 py-2 text-right w-[90px]">Amount</th>
            </tr>
          </thead>
          <tbody>
            {challan.items.map((item, index) => (
              <tr key={index} className="border-b border-black last:border-b-0">
                <td className="border-r border-black px-1 py-3 text-center align-top">{index + 1}</td>
                <td className="border-r border-black px-2 py-3 align-top">
                  <p className="font-bold text-[11px]">{item.finishSize.size || item.finishSize.itemCode || '—'}</p>
                  {item.finishSize.itemCode && (
                    <p className="text-[9px] text-gray-500 mt-0.5">{item.finishSize.itemCode}</p>
                  )}
                </td>
                <td className="border-r border-black px-2 py-3 align-top">
                  <p className="text-[10px] font-semibold">{item.originalSize.size || item.originalSize.itemCode || '—'}</p>
                  {item.originalSize.itemCode && (
                    <p className="text-[9px] text-gray-500 mt-0.5">{item.originalSize.itemCode}</p>
                  )}
                </td>
                <td className="border-r border-black px-2 py-3 text-center align-top">
                  <p className="font-semibold">{item.finishSize.grade}</p>
                </td>
                <td className="border-r border-black px-2 py-3 text-center align-top">
                  {(() => {
                    // Prefer coilEntries (new system), fall back to legacy coilNumber
                    const entries = item.coilEntries?.filter(c => c.coilNumber);
                    if (entries && entries.length > 0) {
                      return (
                        <div className="text-[9px] leading-snug">
                          {entries.map((c, ci) => (
                            <p key={ci} className="font-medium">{c.coilNumber}</p>
                          ))}
                        </div>
                      );
                    }
                    if (item.coilNumber || item.coilReference) {
                      return (
                        <>
                          {item.coilNumber && <p className="font-medium text-[9px]">{item.coilNumber}</p>}
                          {item.coilReference && <p className="text-[8px] text-gray-500">{item.coilReference}</p>}
                        </>
                      );
                    }
                    return '-';
                  })()}
                </td>
                <td className="border-r border-black px-2 py-3 text-center align-top uppercase">
                  <div className="text-[10px] font-semibold leading-tight">
                    {item.processType || item.processDetails || '-'}
                    {item.annealingCount ? ` + ${item.annealingCount}A` : ''}
                    {item.drawPassCount ? ` + ${item.drawPassCount}D` : ''}
                  </div>
                </td>
                <td className="border-r border-black px-2 py-3 text-center align-top">{item.issuedChallanNo || '-'}</td>
                <td className="border-r border-black px-2 py-3 text-center align-top font-bold">{item.quantity.toFixed(2)}</td>
                <td className="border-r border-black px-2 py-3 text-center align-top">{item.rate.toFixed(2)}</td>
                <td className="px-2 py-3 text-right align-top font-bold">{formatIndianCurrency(item.itemTotal)}</td>
              </tr>
            ))}
            
            {/* Empty Rows */}
            {Array.from({ length: emptyRowsCount }).map((_, i) => (
              <tr key={`empty-${i}`} className="border-b border-black h-[40px]">
                <td className="border-r border-black px-1 py-2"></td>
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
            
            {/* Total Quantity Row */}
            <tr className="border-b-0 bg-gray-50 font-bold">
              <td colSpan={7} className="border-r border-black px-2 py-2 text-right">Total Qty :</td>
              <td className="border-r border-black px-2 py-2 text-center text-[11px] text-black">
                {challan.items.reduce((sum, item) => sum + (item.quantity || 0), 0).toFixed(2)}
              </td>
              <td className="border-r border-black px-2 py-2"></td>
              <td className="px-2 py-2 text-right"></td>
            </tr>
          </tbody>
        </table>

        {/* Summary Section */}
        <div className="flex border-t border-black">
          <div className="w-[60%] border-r border-black flex flex-col">
            <div className="p-3 border-b border-black flex-1 flex flex-col justify-center">
              <p className="italic text-[9px] leading-tight text-gray-600 mb-1">Rupees in words:</p>
              <p className="italic font-semibold text-[10px] leading-tight uppercase">Rs. {numberToIndianWords(challan.totalAmount)} ONLY</p>
            </div>
          </div>
          <div className="w-[40%] text-[9px]">
            <div className="grid grid-cols-[1fr_90px] divide-x divide-black border-collapse h-full">
              <div className="p-2 border-b border-black flex items-center font-bold">Total Items :</div>
              <div className="p-2 border-b border-black text-right flex items-center justify-end font-bold">{challan.items.length}</div>
              
              <div className="p-2 border-b border-black flex items-center">Taxable Value :</div>
              <div className="p-2 border-b border-black text-right flex items-center justify-end">{formatIndianCurrency(challan.totalAmount)}</div>
              
              <div className="p-2 font-bold bg-slate-50 flex items-center text-[11px]">Total Amount :</div>
              <div className="p-2 text-right font-bold bg-slate-50 flex items-center justify-end text-[11px]">{formatIndianCurrency(challan.totalAmount)}</div>
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

      {/* Terms and Conditions or Note if needed */}
      <div className="mt-8 text-[9px] italic text-gray-500 text-center">
        <p>This is a computer generated delivery challan and does not require a physical signature.</p>
        <p>Subject to Surendranagar Jurisdiction.</p>
      </div>
    </div>
  );
};

export default ChallanPrintView;
