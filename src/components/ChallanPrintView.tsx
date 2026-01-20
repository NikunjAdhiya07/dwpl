'use client';

import React from 'react';
import { formatIndianCurrency } from '@/lib/numberToWords';

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
  issuedChallanNo?: string;
  coilNumber?: string;
  coilReference?: string;
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
  items: ChallanItem[];
  totalAmount: number;
  vehicleNumber?: string;
  transportName?: string;
  eWayBillNo?: string;
}

interface ChallanPrintViewProps {
  challan: OutwardChallan;
  copyType?: string;
}

const ChallanPrintView: React.FC<ChallanPrintViewProps> = ({ 
  challan, 
  copyType = 'Original' 
}) => {
  // Ensure we have at least 15 rows for a professional look, filling with empty rows if needed
  const minRows = 12;
  const emptyRowsCount = Math.max(0, minRows - challan.items.length);

  return (
    <div className="print-page bg-white text-black font-sans p-[10mm] w-[210mm] min-h-[297mm] box-border mx-auto border border-gray-200">
      {/* Header Section */}
      <div className="flex justify-between items-start mb-6">
        <div className="w-1/3 text-[12px] leading-tight">
          <p className="font-bold text-[14px]">Drawwell Wires Pvt. Ltd.</p>
          <p className="text-[10px] font-semibold mt-2 mb-1">Regd. Office Address:</p>
          <p>Plot No. G-2114, Phase III, Gate No.2</p>
          <p>GIDC Metoda, Dist. Rajkot-360021</p>
          <p>Gujarat, India</p>
        </div>
        <div className="w-1/3 text-center">
          <h1 className="text-[18px] font-bold underline uppercase tracking-wider">Delivery Challan</h1>
        </div>
        <div className="w-1/3 text-right text-[12px]">
          <p>({copyType})</p>
        </div>
      </div>

      <div className="border border-black">
        {/* Party & Transport Details Section */}
        <div className="flex border-b border-black">
          {/* Left Section - Party Details */}
          <div className="flex-1 border-r border-black p-2 min-h-[120px]">
            <div className="mb-3">
              <p className="font-bold underline text-[10px] mb-1 uppercase">Bill To:</p>
              <p className="font-bold text-[12px]">{challan.party.partyName}</p>
              <p className="text-[11px] whitespace-pre-line">{challan.party.address}</p>
              <p className="text-[11px] font-bold mt-1">GSTIN: {challan.party.gstNumber}</p>
            </div>
            <div>
              <p className="font-bold underline text-[10px] mb-1 uppercase">Ship To:</p>
              <p className="font-bold text-[12px]">{challan.party.partyName}</p>
              <p className="text-[11px] whitespace-pre-line">{challan.party.address}</p>
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
        <table className="w-full border-collapse text-[11px]">
          <thead>
            <tr className="border-b border-black font-bold bg-gray-50">
              <th className="border-r border-black px-1 py-1 w-[35px] text-center">Sr. No.</th>
              <th className="border-r border-black px-2 py-1 text-left">Description (Finish Size)</th>
              <th className="border-r border-black px-2 py-1 text-left w-[90px]">RM</th>
              <th className="border-r border-black px-2 py-1 text-left w-[70px]">Wire Grade</th>
              <th className="border-r border-black px-2 py-1 text-center w-[70px]">COIL</th>
              <th className="border-r border-black px-2 py-1 text-center w-[70px]">Process</th>
              <th className="border-r border-black px-2 py-1 text-center w-[90px]">Issued Challan No.</th>
              <th className="border-r border-black px-2 py-1 text-center w-[60px]">Qty</th>
              <th className="border-r border-black px-2 py-1 text-center w-[60px]">Rate</th>
              <th className="px-2 py-1 text-right w-[80px]">Total Amount</th>
            </tr>
          </thead>
          <tbody>
            {challan.items.map((item, index) => (
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
                      {item.coilReference && <p className="text-[9px] text-gray-600">{item.coilReference}</p>}
                    </>
                  ) : '-'}
                </td>
                <td className="border-r border-black px-2 py-2 text-center capitalize">
                  {item.processDetails || (
                    <>
                      {item.annealingCount && item.annealingCount > 0 ? `Anneal (${item.annealingCount})` : ''}
                      {item.annealingCount && item.annealingCount > 0 && item.drawPassCount && item.drawPassCount > 0 ? ', ' : ''}
                      {item.drawPassCount && item.drawPassCount > 0 ? `Drawing (${item.drawPassCount})` : ''}
                      {(!item.annealingCount && !item.drawPassCount) ? '-' : ''}
                    </>
                  )}
                </td>
                <td className="border-r border-black px-2 py-2 text-center">{item.issuedChallanNo || '-'}</td>
                <td className="border-r border-black px-2 py-2 text-center font-bold">{item.quantity.toFixed(2)}</td>
                <td className="border-r border-black px-2 py-2 text-center">{item.rate.toFixed(2)}</td>
                <td className="px-2 py-2 text-right font-bold">{formatIndianCurrency(item.itemTotal)}</td>
              </tr>
            ))}
            
            {/* Empty Rows */}
            {Array.from({ length: emptyRowsCount }).map((_, i) => (
              <tr key={`empty-${i}`} className="border-b border-black last:border-b-0 h-[35px]">
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
          </tbody>
          <tfoot>
            <tr className="border-t border-black font-bold">
              <td colSpan={7} className="border-r border-black px-2 py-2 text-right uppercase">Total :</td>
              <td className="border-r border-black px-2 py-2 text-center">{challan.items.reduce((sum, item) => sum + item.quantity, 0).toFixed(2)}</td>
              <td className="border-r border-black px-2 py-2"></td>
              <td className="px-2 py-2 text-right font-bold text-[12px]">{formatIndianCurrency(challan.totalAmount)}</td>
            </tr>
          </tfoot>
        </table>
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
                <p className="font-bold">(For Drawwell Wires Pvt. Ltd.)</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Terms and Conditions or Note if needed */}
      <div className="mt-8 text-[9px] italic text-gray-500 text-center">
        <p>This is a computer generated delivery challan and does not require a physical signature.</p>
        <p>Subject to Rajkot Jurisdiction.</p>
      </div>
    </div>
  );
};

export default ChallanPrintView;
