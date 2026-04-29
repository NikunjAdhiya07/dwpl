import React from 'react';

interface Props {
  reportData: any;
}

export default function TransporterAccountsPrintView({ reportData }: Props) {
  const { data, company, filters, totals } = reportData;

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const fmt = (num: number) => {
    return (num || 0).toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  return (
    <div className="bg-white p-8 w-[297mm] mx-auto text-black font-sans print:p-0 print:w-full">
      {/* Header */}
      <div className="text-center mb-6">
        <h1 className="text-2xl font-bold uppercase tracking-wider">{company?.companyName || 'DWPL'}</h1>
        {company?.registeredAddress && <p className="text-sm mt-1">{company.registeredAddress}</p>}
        {company?.gstNumber && <p className="text-sm">GSTIN: <span className="font-semibold">{company.gstNumber}</span></p>}
        <div className="mt-4 border-b-2 border-black inline-block px-8 pb-1">
          <h2 className="text-xl font-bold uppercase">Transporter Accounts Report</h2>
        </div>
      </div>

      {/* Filters Applied */}
      <div className="flex flex-wrap items-center justify-between mb-4 text-sm font-medium">
        <div>
          Date Range:{' '}
          <span className="font-semibold">
            {filters.fromDate ? formatDate(filters.fromDate) : 'Start'} to{' '}
            {filters.toDate ? formatDate(filters.toDate) : 'Today'}
          </span>
        </div>
        {filters.transporterName && (
          <div>
            Transporter: <span className="font-semibold">{filters.transporterName}</span>
          </div>
        )}
        {filters.partyId && (
          <div>
            Party ID: <span className="font-semibold">{filters.partyId}</span>
          </div>
        )}
        <div className="text-right">
          Total Invoices: <span className="font-bold">{totals.count}</span>
        </div>
      </div>

      {/* Table */}
      <table className="w-full border-collapse text-xs">
        <thead>
          <tr className="bg-slate-100 font-bold border-y-2 border-black">
            <th className="py-2 px-2 text-left w-12">Sr.</th>
            <th className="py-2 px-2 text-left w-24">Date</th>
            <th className="py-2 px-2 text-left w-28">Invoice No.</th>
            <th className="py-2 px-2 text-left">Party Name</th>
            <th className="py-2 px-2 text-left w-32">Transporter Name</th>
            <th className="py-2 px-2 text-left w-28">Vehicle No.</th>
            <th className="py-2 px-2 text-right w-24">Assessable Val.</th>
            <th className="py-2 px-2 text-right w-24">Transport Chg.</th>
            <th className="py-2 px-2 text-right w-24">Total Amount</th>
          </tr>
        </thead>
        <tbody>
          {data.map((inv: any, index: number) => (
            <tr key={inv._id} className="border-b border-slate-300 hover:bg-slate-50 break-inside-avoid">
              <td className="py-2 px-2">{index + 1}</td>
              <td className="py-2 px-2">{formatDate(inv.invoiceDate)}</td>
              <td className="py-2 px-2 font-mono font-semibold">{inv.invoiceNumber}</td>
              <td className="py-2 px-2 font-semibold">
                {inv.party?.partyName || '—'}
              </td>
              <td className="py-2 px-2">{inv.transportName || '—'}</td>
              <td className="py-2 px-2">{inv.vehicleNumber || '—'}</td>
              <td className="py-2 px-2 text-right">{fmt(inv.assessableValue)}</td>
              <td className="py-2 px-2 text-right text-amber-700 font-semibold">{fmt(inv.transportCharges)}</td>
              <td className="py-2 px-2 text-right font-bold text-green-700">{fmt(inv.totalAmount)}</td>
            </tr>
          ))}
          
          {/* Totals Row */}
          {data.length > 0 && (
            <tr className="border-y-2 border-black font-bold bg-slate-50 text-sm">
              <td colSpan={6} className="py-3 px-2 text-right">GRAND TOTAL:</td>
              <td className="py-3 px-2 text-right">{fmt(totals.totalAssessableValue)}</td>
              <td className="py-3 px-2 text-right text-amber-700">{fmt(totals.totalTransportCharges)}</td>
              <td className="py-3 px-2 text-right text-green-700">{fmt(totals.totalGrandTotal)}</td>
            </tr>
          )}

          {data.length === 0 && (
            <tr>
              <td colSpan={9} className="py-8 text-center text-slate-500 italic border-b border-slate-300">
                No invoices found matching the selected criteria.
              </td>
            </tr>
          )}
        </tbody>
      </table>

      {/* Footer Info */}
      <div className="mt-8 pt-4 border-t border-slate-200 text-[10px] text-slate-500 flex justify-between">
        <div>
          Report generated on {new Date().toLocaleString('en-IN')}
        </div>
        <div>
          {company?.companyName || 'DWPL'}
        </div>
      </div>
    </div>
  );
}
