'use client';

import React from 'react';

interface PartyLedgerProps {
  reportData: {
    company: any;
    party: any;
    data: {
      invoices: any[];
      challans: any[];
      grns: any[];
    };
    totals: any;
    filters: {
      fromDate?: string | null;
      toDate?: string | null;
    };
  };
}

function fmt(n: number | undefined | null): string {
  if (n === null || n === undefined || isNaN(Number(n))) return '0.00';
  return Number(n).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtDate(d: string | Date | undefined): string {
  if (!d) return '';
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export default function PartyLedgerPrintView({ reportData }: PartyLedgerProps) {
  const { company, party, data, totals, filters } = reportData;

  const fromStr = filters.fromDate ? fmtDate(filters.fromDate) : 'All Dates';
  const toStr = filters.toDate ? fmtDate(filters.toDate) : 'All Dates';

  const thClass = 'border border-black px-2 py-1 text-center font-bold text-[9px] leading-tight bg-gray-100';
  const tdClass = 'border border-black px-2 py-0.5 text-[9px] leading-tight';
  const tdRight = `${tdClass} text-right`;
  const sectionHeader = 'bg-slate-700 text-white text-[9px] font-bold px-2 py-1';

  return (
    <div id="party-ledger-print" className="font-sans text-black bg-white">
      <div
        className="print-page bg-white"
        style={{ width: '210mm', minHeight: '297mm', padding: '10mm 8mm', boxSizing: 'border-box' }}
      >
        {/* Company Header */}
        <div className="text-center mb-2">
          <div className="text-[15px] font-bold uppercase tracking-wide">{company?.companyName || 'DWPL'}</div>
          <div className="text-[9px] text-gray-700">{company?.address || ''}</div>
          {company?.gstin && <div className="text-[9px] text-gray-700">GSTIN: {company.gstin}</div>}
        </div>

        {/* Title */}
        <div className="text-center border-t border-b border-black py-1 mb-3">
          <div className="text-[12px] font-bold uppercase">Party Ledger</div>
          <div className="text-[9px] text-gray-600">
            {party?.partyName} &nbsp;|&nbsp; Period: {fromStr} to {toStr}
          </div>
        </div>

        {/* Party Info Card */}
        <div className="border border-black mb-3 p-2 text-[9px]">
          <div className="grid grid-cols-2 gap-1">
            <div><span className="font-bold">Party Name:</span> {party?.partyName || '-'}</div>
            <div><span className="font-bold">GSTIN:</span> {party?.gstNumber || '-'}</div>
            <div className="col-span-2"><span className="font-bold">Address:</span> {party?.address || '-'}</div>
            <div><span className="font-bold">Contact:</span> {party?.contactNumber || '-'}</div>
          </div>
        </div>

        {/* Summary Box */}
        <div className="grid grid-cols-3 gap-2 mb-3">
          <div className="border border-black p-2 text-center">
            <div className="text-[8px] text-gray-600 uppercase font-bold">Tax Invoices</div>
            <div className="text-[14px] font-bold">{totals.invoiceCount}</div>
            <div className="text-[9px] font-semibold text-blue-700">₹{fmt(totals.totalInvoiceAmount)}</div>
          </div>
          <div className="border border-black p-2 text-center">
            <div className="text-[8px] text-gray-600 uppercase font-bold">Outward Challans</div>
            <div className="text-[14px] font-bold">{totals.challanCount}</div>
            <div className="text-[9px] font-semibold text-green-700">₹{fmt(totals.totalChallanAmount)}</div>
          </div>
          <div className="border border-black p-2 text-center">
            <div className="text-[8px] text-gray-600 uppercase font-bold">GRN (Inward)</div>
            <div className="text-[14px] font-bold">{totals.grnCount}</div>
            <div className="text-[9px] font-semibold text-orange-700">₹{fmt(totals.totalGRNValue)}</div>
          </div>
        </div>

        {/* Tax Invoices */}
        {data.invoices.length > 0 && (
          <div className="mb-3">
            <div className={sectionHeader}>Tax Invoices ({data.invoices.length})</div>
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th className={thClass}>Sr.</th>
                  <th className={thClass}>Invoice No.</th>
                  <th className={thClass}>Date</th>
                  <th className={thClass}>Base Amt</th>
                  <th className={thClass}>GST Amt</th>
                  <th className={thClass}>Round Off</th>
                  <th className={thClass}>Grand Total</th>
                </tr>
              </thead>
              <tbody>
                {data.invoices.map((inv: any, i: number) => (
                  <tr key={inv._id} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className={`${tdClass} text-center`}>{i + 1}</td>
                    <td className={tdClass}>{inv.invoiceNumber}</td>
                    <td className={`${tdClass} text-center`}>{fmtDate(inv.invoiceDate)}</td>
                    <td className={tdRight}>{fmt(inv.baseAmount)}</td>
                    <td className={tdRight}>{fmt(inv.gstAmount)}</td>
                    <td className={tdRight}>{fmt(inv.roundOff)}</td>
                    <td className={`${tdRight} font-semibold`}>{fmt(inv.totalAmount)}</td>
                  </tr>
                ))}
                <tr className="bg-gray-200 font-bold">
                  <td colSpan={3} className={`${tdClass} text-center text-[8px]`}>Total</td>
                  <td className={tdRight}>{fmt(data.invoices.reduce((s: number, i: any) => s + (i.baseAmount || 0), 0))}</td>
                  <td className={tdRight}>{fmt(data.invoices.reduce((s: number, i: any) => s + (i.gstAmount || 0), 0))}</td>
                  <td className={tdRight}>{fmt(data.invoices.reduce((s: number, i: any) => s + (i.roundOff || 0), 0))}</td>
                  <td className={`${tdRight}`}>{fmt(totals.totalInvoiceAmount)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        )}

        {/* Challans */}
        {data.challans.length > 0 && (
          <div className="mb-3">
            <div className={sectionHeader}>Outward Challans ({data.challans.length})</div>
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th className={thClass}>Sr.</th>
                  <th className={thClass}>Challan No.</th>
                  <th className={thClass}>Date</th>
                  <th className={thClass}>Items</th>
                  <th className={thClass}>Total Amount</th>
                </tr>
              </thead>
              <tbody>
                {data.challans.map((c: any, i: number) => (
                  <tr key={c._id} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className={`${tdClass} text-center`}>{i + 1}</td>
                    <td className={tdClass}>{c.challanNumber}</td>
                    <td className={`${tdClass} text-center`}>{fmtDate(c.challanDate)}</td>
                    <td className={`${tdClass} text-center`}>{(c.items || []).length}</td>
                    <td className={`${tdRight} font-semibold`}>{fmt(c.totalAmount)}</td>
                  </tr>
                ))}
                <tr className="bg-gray-200 font-bold">
                  <td colSpan={4} className={`${tdClass} text-center text-[8px]`}>Total</td>
                  <td className={tdRight}>{fmt(totals.totalChallanAmount)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        )}

        {/* GRNs */}
        {data.grns.length > 0 && (
          <div className="mb-3">
            <div className={sectionHeader}>GRN — Inward Material ({data.grns.length})</div>
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th className={thClass}>Sr.</th>
                  <th className={thClass}>Party Challan No.</th>
                  <th className={thClass}>GRN Date</th>
                  <th className={thClass}>Items</th>
                  <th className={thClass}>Total Value</th>
                </tr>
              </thead>
              <tbody>
                {data.grns.map((g: any, i: number) => (
                  <tr key={g._id} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className={`${tdClass} text-center`}>{i + 1}</td>
                    <td className={tdClass}>{g.partyChallanNumber}</td>
                    <td className={`${tdClass} text-center`}>{fmtDate(g.grnDate)}</td>
                    <td className={`${tdClass} text-center`}>{(g.items || []).length}</td>
                    <td className={`${tdRight} font-semibold`}>{fmt(g.totalValue)}</td>
                  </tr>
                ))}
                <tr className="bg-gray-200 font-bold">
                  <td colSpan={4} className={`${tdClass} text-center text-[8px]`}>Total</td>
                  <td className={tdRight}>{fmt(totals.totalGRNValue)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        )}

        {/* Footer */}
        <div className="flex justify-between mt-4 text-[8px] text-gray-500 border-t border-gray-300 pt-1">
          <span>Generated: {new Date().toLocaleString('en-IN')}</span>
          <span>{company?.companyName || 'DWPL'} — Confidential</span>
        </div>
      </div>
    </div>
  );
}
