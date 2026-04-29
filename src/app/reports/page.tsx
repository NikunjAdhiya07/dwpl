'use client';

import { useEffect, useRef, useState } from 'react';
import PageHeader from '@/components/PageHeader';
import Card from '@/components/Card';
import {
  FileText,
  Download,
  Printer,
  Search,
  FileSpreadsheet,
  AlertCircle,
  ChevronDown,
  X,
  BarChart3,
} from 'lucide-react';
import {
  exportSalesRegisterToPDF,
  exportChallanRegisterToPDF,
  exportGRNRegisterToPDF,
} from '@/lib/reportPdfExport';
import {
  exportSalesRegisterToExcel,
  exportChallanRegisterToExcel,
  exportGRNRegisterToExcel,
  exportTransporterAccountsToExcel,
} from '@/lib/excelExport';

import SalesRegisterPrintView from '@/components/reports/SalesRegisterPrintView';
import ChallanRegisterPrintView from '@/components/reports/ChallanRegisterPrintView';
import GRNRegisterPrintView from '@/components/reports/GRNRegisterPrintView';
import TransporterAccountsPrintView from '@/components/reports/TransporterAccountsPrintView';


// ─── Types ────────────────────────────────────────────────────────────────────

type ReportType = 'sales-register' | 'challan-register' | 'grn-register' | 'transporter-accounts';

interface Party {
  _id: string;
  partyName: string;
}

interface Filters {
  fromDate: string;
  toDate: string;
  party: string;
  voucherNumber: string;
  transporterName: string;
}

const REPORT_OPTIONS: { value: ReportType; label: string; description: string }[] = [
  {
    value: 'sales-register',
    label: 'Sales Register',
    description: 'Tax invoices with GST & totals',
  },
  {
    value: 'challan-register',
    label: 'Challan Register',
    description: 'Outward challans with party details',
  },
  {
    value: 'grn-register',
    label: 'GRN Register',
    description: 'Inward material receipts',
  },
  {
    value: 'transporter-accounts',
    label: 'Transporter Accounts',
    description: 'Transport charges and details from invoices',
  },
];

// ─── Component ────────────────────────────────────────────────────────────────

export default function ReportsPage() {
  const [selectedReport, setSelectedReport] = useState<ReportType>('sales-register');
  const [filters, setFilters] = useState<Filters>({
    fromDate: '',
    toDate: '',
    party: '',
    voucherNumber: '',
    transporterName: '',
  });
  const [parties, setParties] = useState<Party[]>([]);
  const [transporters, setTransporters] = useState<any[]>([]);
  const [reportData, setReportData] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  const [pdfExporting, setPdfExporting] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch('/api/party-master')
      .then((r) => r.json())
      .then((d) => {
        if (d.success) setParties(d.data || []);
      })
      .catch(() => {});

    fetch('/api/transport-master')
      .then((r) => r.json())
      .then((d) => {
        if (d.success) setTransporters(d.data || []);
      })
      .catch(() => {});
  }, []);

  function handleFilterChange(key: keyof Filters, value: string) {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setReportData(null);
    setShowPreview(false);
    setError('');
  }

  async function generateReport() {
    setLoading(true);
    setError('');
    setReportData(null);
    setShowPreview(false);

    try {
      const params = new URLSearchParams({ type: selectedReport });
      if (filters.fromDate) params.set('from', filters.fromDate);
      if (filters.toDate) params.set('to', filters.toDate);
      if (filters.party) params.set('party', filters.party);
      if (filters.voucherNumber) params.set('voucher', filters.voucherNumber);
      if (filters.transporterName) params.set('transporterName', filters.transporterName);

      const res = await fetch(`/api/reports?${params.toString()}`);
      const json = await res.json();

      if (!json.success) {
        setError(json.error || 'Failed to generate report.');
        return;
      }

      const count =
        json.totals?.count ||
        (json.data ? (Array.isArray(json.data) ? json.data.length : 0) : 0);

      if (count === 0) {
        setError('No records found for the selected filters. Try adjusting the date range or party.');
        return;
      }

      setReportData(json);
      setShowPreview(true);
    } catch {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  async function handleExportPDF() {
    if (!reportData) return;
    setPdfExporting(true);
    try {
      if (selectedReport === 'sales-register') {
        exportSalesRegisterToPDF(reportData);
      } else if (selectedReport === 'challan-register') {
        exportChallanRegisterToPDF(reportData);
      } else if (selectedReport === 'transporter-accounts') {
        exportTransporterAccountsToPDF(reportData);
      } else {
        exportGRNRegisterToPDF(reportData);
      }
    } catch (e: any) {
      alert('PDF export failed: ' + e.message);
    } finally {
      setPdfExporting(false);
    }
  }

  function handleExportExcel() {
    if (!reportData) return;
    const filename = `${selectedReport}_${new Date().toISOString().split('T')[0]}`;
    if (selectedReport === 'sales-register') {
      exportSalesRegisterToExcel(reportData, filename);
    } else if (selectedReport === 'challan-register') {
      exportChallanRegisterToExcel(reportData, filename);
    } else if (selectedReport === 'transporter-accounts') {
      exportTransporterAccountsToExcel(reportData, filename);
    } else if (selectedReport === 'grn-register') {
      exportGRNRegisterToExcel(reportData, filename);
    }
  }

  function clearFilters() {
    setFilters({ fromDate: '', toDate: '', party: '', voucherNumber: '', transporterName: '' });
    setReportData(null);
    setShowPreview(false);
    setError('');
  }

  const hasActiveFilters =
    filters.fromDate || filters.toDate || filters.party || filters.voucherNumber || filters.transporterName;

  return (
    <div className="animate-fade-in">
      <style>{`
        @media print {
          body > * { display: none !important; }
          #report-print-area { display: block !important; position: fixed; top: 0; left: 0; width: 100%; }
          .print-page { page-break-after: always; }
          .print-page:last-child { page-break-after: avoid; }
        }
      `}</style>

      <PageHeader
        title="Reports"
        description="Generate professional accounting and transaction reports"
      />

      {/* Report Type Selector */}
      <Card className="mb-4">
        <div className="section-header -mx-4 -mt-4 mb-4 rounded-t-lg">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-blue-600" />
            <span className="section-title">Select Report Type</span>
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {REPORT_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => {
                setSelectedReport(opt.value);
                setReportData(null);
                setShowPreview(false);
                setError('');
              }}
              className={`p-3 rounded border text-left transition-all ${
                selectedReport === opt.value
                  ? 'border-blue-500 bg-blue-50 text-blue-700'
                  : 'border-slate-200 bg-white text-slate-700 hover:border-blue-300 hover:bg-slate-50'
              }`}
            >
              <FileText
                className={`w-4 h-4 mb-1.5 ${
                  selectedReport === opt.value ? 'text-blue-600' : 'text-slate-400'
                }`}
              />
              <div className="text-sm font-semibold">{opt.label}</div>
              <div className="text-xs text-slate-500 mt-0.5 leading-tight">{opt.description}</div>
            </button>
          ))}
        </div>
      </Card>

      {/* Filters */}
      <Card className="mb-4">
        <div className="section-header -mx-4 -mt-4 mb-4 rounded-t-lg flex items-center justify-between">
          <span className="section-title">Filters</span>
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="flex items-center gap-1 text-xs text-slate-500 hover:text-red-500 transition-colors"
            >
              <X className="w-3 h-3" /> Clear All
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          <div>
            <label className="label">From Date</label>
            <input
              type="date"
              value={filters.fromDate}
              onChange={(e) => handleFilterChange('fromDate', e.target.value)}
              className="input"
            />
          </div>

          <div>
            <label className="label">To Date</label>
            <input
              type="date"
              value={filters.toDate}
              onChange={(e) => handleFilterChange('toDate', e.target.value)}
              className="input"
            />
          </div>

          <div>
            <label className="label">Party</label>
            <div className="relative">
              <select
                value={filters.party}
                onChange={(e) => handleFilterChange('party', e.target.value)}
                className="input appearance-none pr-7"
              >
                <option value="">All Parties</option>
                {parties.map((p) => (
                  <option key={p._id} value={p._id}>
                    {p.partyName}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
            </div>
          </div>

          {selectedReport === 'transporter-accounts' && (
            <div>
              <label className="label">Transporter</label>
              <div className="relative">
                <select
                  value={filters.transporterName}
                  onChange={(e) => handleFilterChange('transporterName', e.target.value)}
                  className="input appearance-none pr-7"
                >
                  <option value="">All Transporters</option>
                  {transporters.map((t) => (
                    <option key={t._id} value={t.transporterName}>
                      {t.transporterName}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
              </div>
            </div>
          )}

          <div>
            <label className="label">Voucher / Doc. No.</label>
            <input
              type="text"
              value={filters.voucherNumber}
              onChange={(e) => handleFilterChange('voucherNumber', e.target.value)}
              placeholder="e.g. INV-0001"
              className="input"
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-slate-100">
          <button
            onClick={generateReport}
            disabled={loading}
            className="btn btn-primary"
          >
            {loading ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Search className="w-3.5 h-3.5" />
                Generate Report
              </>
            )}
          </button>

          {reportData && (
            <>
              <button
                onClick={handleExportPDF}
                disabled={pdfExporting}
                className="btn btn-secondary"
                style={{ background: '#dc2626' }}
              >
                {pdfExporting ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                    Exporting...
                  </>
                ) : (
                  <>
                    <Download className="w-3.5 h-3.5" />
                    PDF
                  </>
                )}
              </button>

              <button
                onClick={handleExportExcel}
                className="btn btn-success"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                Excel / CSV
              </button>

              <button
                onClick={() => window.print()}
                className="btn btn-outline"
              >
                <Printer className="w-3.5 h-3.5" />
                Print
              </button>
            </>
          )}
        </div>
      </Card>

      {/* Error Banner */}
      {error && (
        <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
          <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
          <div>
            <div className="text-sm font-medium text-red-700">Report Generation Warning</div>
            <div className="text-sm text-red-600 mt-0.5">{error}</div>
          </div>
        </div>
      )}

      {/* Summary Stats */}
      {reportData && (
        <Card className="mb-4">
          <div className="section-header -mx-4 -mt-4 mb-4 rounded-t-lg">
            <span className="section-title">Report Summary</span>
          </div>
          <ReportSummary reportData={reportData} reportType={selectedReport} />
        </Card>
      )}

      {/* Preview Area */}
      {showPreview && reportData && (
        <Card>
          <div className="section-header -mx-4 -mt-4 mb-4 rounded-t-lg flex items-center justify-between">
            <span className="section-title">Report Preview</span>
            <span className="text-xs text-slate-500">Scroll horizontally for full width</span>
          </div>
          <div
            id="report-print-area"
            ref={printRef}
            className="overflow-auto"
            style={{ minWidth: '900px' }}
          >
            {selectedReport === 'sales-register' && (
              <SalesRegisterPrintView reportData={reportData} />
            )}
            {selectedReport === 'challan-register' && (
              <ChallanRegisterPrintView reportData={reportData} />
            )}
            {selectedReport === 'grn-register' && (
              <GRNRegisterPrintView reportData={reportData} />
            )}
            {selectedReport === 'transporter-accounts' && (
              <TransporterAccountsPrintView reportData={reportData} />
            )}
          </div>
        </Card>
      )}
    </div>
  );
}

// ─── Summary Stats Component ─────────────────────────────────────────────────

function ReportSummary({ reportData, reportType }: { reportData: any; reportType: ReportType }) {
  const t = reportData.totals;

  function StatCard({
    label,
    value,
    color = 'blue',
  }: {
    label: string;
    value: string | number;
    color?: 'blue' | 'green' | 'amber' | 'red' | 'purple';
  }) {
    const colorMap = {
      blue: 'text-blue-600 bg-blue-50 border-blue-100',
      green: 'text-green-600 bg-green-50 border-green-100',
      amber: 'text-amber-600 bg-amber-50 border-amber-100',
      red: 'text-red-600 bg-red-50 border-red-100',
      purple: 'text-purple-600 bg-purple-50 border-purple-100',
    };
    return (
      <div className={`border rounded p-3 ${colorMap[color]}`}>
        <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-1">
          {label}
        </div>
        <div className={`text-base font-bold ${colorMap[color].split(' ')[0]}`}>{value}</div>
      </div>
    );
  }

  function fmt(n: number | undefined | null) {
    if (!n && n !== 0) return '₹0.00';
    return '₹' + Number(n).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  if (reportType === 'sales-register') {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
        <StatCard label="Invoices" value={t.count} color="blue" />
        <StatCard label="Base Amount" value={fmt(t.totalBaseAmount)} color="blue" />
        <StatCard label="Freight" value={fmt(t.totalTransportCharges)} color="amber" />
        <StatCard label="Assessable Val." value={fmt(t.totalAssessableValue)} color="purple" />
        <StatCard label="CGST" value={fmt(t.totalCgstAmount)} color="green" />
        <StatCard label="SGST" value={fmt(t.totalSgstAmount)} color="green" />
        <StatCard label="IGST" value={fmt(t.totalIgstAmount)} color="green" />
        <StatCard label="Grand Total" value={fmt(t.totalGrandTotal)} color="amber" />
      </div>
    );
  }

  if (reportType === 'challan-register') {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <StatCard label="Total Challans" value={t.count} color="blue" />
        <StatCard label="Total Amount" value={fmt(t.totalAmount)} color="amber" />
      </div>
    );
  }

  if (reportType === 'grn-register') {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <StatCard label="Total GRNs" value={t.count} color="blue" />
        <StatCard label="Total Value" value={fmt(t.totalValue)} color="amber" />
      </div>
    );
  }

  if (reportType === 'transporter-accounts') {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Invoices" value={t.count} color="blue" />
        <StatCard label="Assessable Val." value={fmt(t.totalAssessableValue)} color="purple" />
        <StatCard label="Transport Charges" value={fmt(t.totalTransportCharges)} color="amber" />
        <StatCard label="Grand Total" value={fmt(t.totalGrandTotal)} color="green" />
      </div>
    );
  }

  return null;
}
