'use client';

import React from 'react';

interface ChallanRegisterProps {
  reportData: {
    company: any;
    data: any[];
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

const ROWS_PER_PAGE = 24;

export default function ChallanRegisterPrintView({ reportData }: ChallanRegisterProps) {
  const { company, data, totals, filters } = reportData;

  const fromStr = filters.fromDate ? fmtDate(filters.fromDate) : 'All Dates';
  const toStr = filters.toDate ? fmtDate(filters.toDate) : 'All Dates';

  const totalPages = Math.max(1, Math.ceil(data.length / ROWS_PER_PAGE));
  const pages: any[][] = [];
  for (let i = 0; i < totalPages; i++) {
    pages.push(data.slice(i * ROWS_PER_PAGE, (i + 1) * ROWS_PER_PAGE));
  }

  return (
    <div id="challan-register-print" className="bg-white font-sans text-black">
      {pages.map((pageRows, pageIdx) => (
        <div
          key={pageIdx}
          className="bg-white text-black"
          style={{
            width: '297mm',
            minHeight: '210mm',
            padding: '8mm 7mm',
            boxSizing: 'border-box',
            pageBreakAfter: pageIdx < pages.length - 1 ? 'always' : 'auto',
          }}
        >
          {/* Company Header */}
          <div className="text-center mb-1">
            <div className="font-bold uppercase tracking-wide" style={{ fontSize: '14px' }}>
              {company?.companyName || 'DWPL'}
            </div>
            {company?.address && (
              <div className="text-gray-700" style={{ fontSize: '9px' }}>{company.address}</div>
            )}
            {company?.gstin && (
              <div className="text-gray-700" style={{ fontSize: '9px' }}>GSTIN: {company.gstin}</div>
            )}
          </div>

          {/* Report Title Bar */}
          <div className="border-t border-b border-black py-1 mb-2 text-center">
            <div className="font-bold uppercase tracking-wider" style={{ fontSize: '11px' }}>
              Outward Challan Register
            </div>
            <div className="text-gray-600" style={{ fontSize: '9px' }}>
              Period: {fromStr} to {toStr}&nbsp;&nbsp;|&nbsp;&nbsp;Page {pageIdx + 1} of {totalPages}
            </div>
          </div>

          {/* Table */}
          <table className="w-full border-collapse" style={{ tableLayout: 'fixed', fontSize: '8.5px' }}>
            <colgroup>
              <col style={{ width: '4%' }} />
              <col style={{ width: '12%' }} />
              <col style={{ width: '8%' }} />
              <col style={{ width: '20%' }} />
              <col style={{ width: '14%' }} />
              <col style={{ width: '5%' }} />
              <col style={{ width: '9%' }} />
              <col style={{ width: '11%' }} />
              <col style={{ width: '9%' }} />
              <col style={{ width: '8%' }} />
            </colgroup>
            <thead>
              <tr className="bg-gray-100">
                {[
                  'Sr.', 'Challan No.', 'Date', 'Party Name', 'GSTIN',
                  'Items', 'Total Qty (Kg)', 'Total Amount', 'Vehicle No.', 'Transporter'
                ].map((h) => (
                  <th key={h} className="border border-black px-1 py-1 text-center font-bold leading-tight" style={{ fontSize: '8px' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pageRows.map((challan: any, idx: number) => {
                const globalIdx = pageIdx * ROWS_PER_PAGE + idx;
                const isAlt = globalIdx % 2 !== 0;
                const rowCls = isAlt ? 'bg-gray-50' : 'bg-white';
                const party = challan.party || {};
                const totalQty = (challan.items || []).reduce((s: number, i: any) => s + (i.quantity || 0), 0);
                const vehicles =
                  (challan.vehicles || []).map((v: any) => v.vehicleNumber).filter(Boolean).join(', ') ||
                  challan.vehicleNumber || '-';
                return (
                  <tr key={challan._id} className={rowCls}>
                    <td className="border border-black px-1 py-0.5 text-center">{globalIdx + 1}</td>
                    <td className="border border-black px-1 py-0.5" style={{ fontSize: '7.5px' }}>{challan.challanNumber}</td>
                    <td className="border border-black px-1 py-0.5 text-center">{fmtDate(challan.challanDate)}</td>
                    <td className="border border-black px-1 py-0.5" style={{ wordBreak: 'break-word' }}>{party.partyName || '-'}</td>
                    <td className="border border-black px-1 py-0.5" style={{ fontSize: '7px', wordBreak: 'break-all' }}>{party.gstNumber || '-'}</td>
                    <td className="border border-black px-1 py-0.5 text-center">{(challan.items || []).length}</td>
                    <td className="border border-black px-1 py-0.5 text-right">{fmt(totalQty)}</td>
                    <td className="border border-black px-1 py-0.5 text-right font-semibold">{fmt(challan.totalAmount)}</td>
                    <td className="border border-black px-1 py-0.5" style={{ fontSize: '7.5px' }}>{vehicles}</td>
                    <td className="border border-black px-1 py-0.5" style={{ wordBreak: 'break-word' }}>{challan.transportName || '-'}</td>
                  </tr>
                );
              })}
              {Array.from({ length: Math.max(0, ROWS_PER_PAGE - pageRows.length) }).map((_, i) => (
                <tr key={`blank-${i}`} style={{ height: '13px' }}>
                  {Array.from({ length: 10 }).map((_, j) => (
                    <td key={j} className="border border-black" />
                  ))}
                </tr>
              ))}
            </tbody>
            {pageIdx === pages.length - 1 && (
              <tfoot>
                <tr className="bg-gray-200 font-bold">
                  <td colSpan={3} className="border border-black px-1 py-1 text-center" style={{ fontSize: '8px' }}>GRAND TOTAL</td>
                  <td colSpan={3} className="border border-black px-1 py-1" style={{ fontSize: '8px' }}>
                    {totals.count} Challan{totals.count !== 1 ? 's' : ''}
                  </td>
                  <td className="border border-black px-1 py-1" />
                  <td className="border border-black px-1 py-1 text-right font-bold">{fmt(totals.totalAmount)}</td>
                  <td colSpan={2} className="border border-black px-1 py-1" />
                </tr>
              </tfoot>
            )}
          </table>

          {/* Footer */}
          <div className="flex justify-between mt-2 text-gray-500 border-t border-gray-300 pt-1" style={{ fontSize: '7.5px' }}>
            <span>Generated: {new Date().toLocaleString('en-IN')}</span>
            <span>Page {pageIdx + 1} of {totalPages}</span>
            <span>{company?.companyName || 'DWPL'} — Confidential</span>
          </div>
        </div>
      ))}
    </div>
  );
}
