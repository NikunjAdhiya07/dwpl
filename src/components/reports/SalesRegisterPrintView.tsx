'use client';

import React from 'react';

interface SalesRegisterProps {
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

const ROWS_PER_PAGE = 20;

export default function SalesRegisterPrintView({ reportData }: SalesRegisterProps) {
  const { company, data, totals, filters } = reportData;

  const fromStr = filters.fromDate ? fmtDate(filters.fromDate) : 'All Dates';
  const toStr = filters.toDate ? fmtDate(filters.toDate) : 'All Dates';

  const totalPages = Math.max(1, Math.ceil(data.length / ROWS_PER_PAGE));
  const pages: any[][] = [];
  for (let i = 0; i < totalPages; i++) {
    pages.push(data.slice(i * ROWS_PER_PAGE, (i + 1) * ROWS_PER_PAGE));
  }

  return (
    <div id="sales-register-print" className="bg-white font-sans text-black">
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
              <div className="text-gray-700" style={{ fontSize: '9px' }}>
                GSTIN: {company.gstin}
                {company?.pan && <span className="ml-4">PAN: {company.pan}</span>}
              </div>
            )}
          </div>

          {/* Report Title Bar */}
          <div className="border-t border-b border-black py-1 mb-2 text-center">
            <div className="font-bold uppercase tracking-wider" style={{ fontSize: '11px' }}>
              Sales Register (Tax Invoice)
            </div>
            <div className="text-gray-600" style={{ fontSize: '9px' }}>
              Period: {fromStr} to {toStr}&nbsp;&nbsp;|&nbsp;&nbsp;Page {pageIdx + 1} of {totalPages}
            </div>
          </div>

          {/* Table */}
          <table className="w-full border-collapse" style={{ tableLayout: 'fixed', fontSize: '8.5px' }}>
            <colgroup>
              <col style={{ width: '3%' }} />
              <col style={{ width: '8%' }} />
              <col style={{ width: '7%' }} />
              <col style={{ width: '14%' }} />
              <col style={{ width: '11%' }} />
              <col style={{ width: '7%' }} />
              <col style={{ width: '5%' }} />
              <col style={{ width: '7%' }} />
              <col style={{ width: '4%' }} />
              <col style={{ width: '6%' }} />
              <col style={{ width: '4%' }} />
              <col style={{ width: '6%' }} />
              <col style={{ width: '4%' }} />
              <col style={{ width: '6%' }} />
              <col style={{ width: '4%' }} />
              <col style={{ width: '8%' }} />
            </colgroup>
            <thead>
              <tr className="bg-gray-100">
                {[
                  'Sr.', 'Invoice No.', 'Date', 'Party Name', 'GSTIN',
                  'Base Amt', 'Freight', 'Assessable Val.',
                  'CGST%', 'CGST Amt', 'SGST%', 'SGST Amt',
                  'IGST%', 'IGST Amt', 'Round Off', 'Grand Total'
                ].map((h) => (
                  <th key={h} className="border border-black px-1 py-1 text-center font-bold leading-tight" style={{ fontSize: '8px' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pageRows.map((inv: any, idx: number) => {
                const globalIdx = pageIdx * ROWS_PER_PAGE + idx;
                const isAlt = globalIdx % 2 !== 0;
                const rowCls = isAlt ? 'bg-gray-50' : 'bg-white';
                const party = inv.party || {};
                return (
                  <tr key={inv._id} className={rowCls}>
                    <td className="border border-black px-1 py-0.5 text-center">{globalIdx + 1}</td>
                    <td className="border border-black px-1 py-0.5" style={{ fontSize: '7.5px', wordBreak: 'break-all' }}>{inv.invoiceNumber}</td>
                    <td className="border border-black px-1 py-0.5 text-center">{fmtDate(inv.invoiceDate)}</td>
                    <td className="border border-black px-1 py-0.5" style={{ wordBreak: 'break-word' }}>{party.partyName || '-'}</td>
                    <td className="border border-black px-1 py-0.5" style={{ fontSize: '7px', wordBreak: 'break-all' }}>{party.gstNumber || '-'}</td>
                    <td className="border border-black px-1 py-0.5 text-right">{fmt(inv.baseAmount)}</td>
                    <td className="border border-black px-1 py-0.5 text-right">{fmt(inv.transportCharges)}</td>
                    <td className="border border-black px-1 py-0.5 text-right">{fmt(inv.assessableValue)}</td>
                    <td className="border border-black px-1 py-0.5 text-center">{inv.cgstPercentage > 0 ? `${inv.cgstPercentage}%` : '-'}</td>
                    <td className="border border-black px-1 py-0.5 text-right">{inv.cgstAmount > 0 ? fmt(inv.cgstAmount) : '-'}</td>
                    <td className="border border-black px-1 py-0.5 text-center">{inv.sgstPercentage > 0 ? `${inv.sgstPercentage}%` : '-'}</td>
                    <td className="border border-black px-1 py-0.5 text-right">{inv.sgstAmount > 0 ? fmt(inv.sgstAmount) : '-'}</td>
                    <td className="border border-black px-1 py-0.5 text-center">{inv.igstPercentage > 0 ? `${inv.igstPercentage}%` : '-'}</td>
                    <td className="border border-black px-1 py-0.5 text-right">{inv.igstAmount > 0 ? fmt(inv.igstAmount) : '-'}</td>
                    <td className={`border border-black px-1 py-0.5 text-right ${inv.roundOff < 0 ? 'text-red-700' : ''}`}>{fmt(inv.roundOff)}</td>
                    <td className="border border-black px-1 py-0.5 text-right font-semibold">{fmt(inv.totalAmount)}</td>
                  </tr>
                );
              })}
              {/* Blank filler rows */}
              {Array.from({ length: Math.max(0, ROWS_PER_PAGE - pageRows.length) }).map((_, i) => (
                <tr key={`blank-${i}`} style={{ height: '13px' }}>
                  {Array.from({ length: 16 }).map((_, j) => (
                    <td key={j} className="border border-black" />
                  ))}
                </tr>
              ))}
            </tbody>
            {/* Grand total row only on last page */}
            {pageIdx === pages.length - 1 && (
              <tfoot>
                <tr className="bg-gray-200 font-bold">
                  <td colSpan={3} className="border border-black px-1 py-1 text-center" style={{ fontSize: '8px' }}>GRAND TOTAL</td>
                  <td colSpan={2} className="border border-black px-1 py-1" style={{ fontSize: '8px' }}>
                    {totals.count} Invoice{totals.count !== 1 ? 's' : ''}
                  </td>
                  <td className="border border-black px-1 py-1 text-right">{fmt(totals.totalBaseAmount)}</td>
                  <td className="border border-black px-1 py-1 text-right">{fmt(totals.totalTransportCharges)}</td>
                  <td className="border border-black px-1 py-1 text-right">{fmt(totals.totalAssessableValue)}</td>
                  <td className="border border-black px-1 py-1" />
                  <td className="border border-black px-1 py-1 text-right">{fmt(totals.totalCgstAmount)}</td>
                  <td className="border border-black px-1 py-1" />
                  <td className="border border-black px-1 py-1 text-right">{fmt(totals.totalSgstAmount)}</td>
                  <td className="border border-black px-1 py-1" />
                  <td className="border border-black px-1 py-1 text-right">{fmt(totals.totalIgstAmount)}</td>
                  <td className="border border-black px-1 py-1 text-right">{fmt(totals.totalRoundOff)}</td>
                  <td className="border border-black px-1 py-1 text-right font-bold">{fmt(totals.totalGrandTotal)}</td>
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
