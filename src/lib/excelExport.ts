/**
 * Excel export utility using pure CSV generation (no external dependencies).
 * Creates properly formatted CSV files that open correctly in Excel.
 */

function escapeCSV(value: any): string {
  if (value === null || value === undefined) return '';
  const str = String(value);
  // Wrap in quotes if contains comma, newline, or quote
  if (str.includes(',') || str.includes('\n') || str.includes('"')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function buildCSVRow(cells: any[]): string {
  return cells.map(escapeCSV).join(',');
}

function downloadCSV(content: string, filename: string): void {
  // BOM for Excel to recognize UTF-8
  const bom = '\uFEFF';
  const blob = new Blob([bom + content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${filename}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function fmt(n: number | undefined | null): string {
  if (n === null || n === undefined) return '0.00';
  return Number(n).toFixed(2);
}

function fmtDate(d: string | Date | undefined): string {
  if (!d) return '';
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

// ─── Sales Register ───────────────────────────────────────────────────────────

export function exportSalesRegisterToExcel(reportData: any, filename: string): void {
  const { company, data, totals, filters } = reportData;
  const rows: string[] = [];

  // Header
  rows.push(buildCSVRow([company?.companyName || 'DWPL']));
  rows.push(buildCSVRow(['Sales Register (Tax Invoice)']));
  const fromStr = filters.fromDate ? fmtDate(filters.fromDate) : 'All';
  const toStr = filters.toDate ? fmtDate(filters.toDate) : 'All';
  rows.push(buildCSVRow([`Period: ${fromStr} to ${toStr}`]));
  rows.push('');

  // Column headers
  rows.push(buildCSVRow([
    'Sr.', 'Invoice No.', 'Date', 'Party Name', 'GSTIN',
    'Base Amount', 'Transport Charges', 'Assessable Value',
    'CGST %', 'CGST Amt', 'SGST %', 'SGST Amt',
    'IGST %', 'IGST Amt', 'TCS %', 'TCS Amt',
    'Round Off', 'Grand Total',
  ]));

  // Data rows
  data.forEach((inv: any, idx: number) => {
    const party = inv.party || {};
    rows.push(buildCSVRow([
      idx + 1,
      inv.invoiceNumber,
      fmtDate(inv.invoiceDate),
      party.partyName || '',
      party.gstNumber || '',
      fmt(inv.baseAmount),
      fmt(inv.transportCharges),
      fmt(inv.assessableValue),
      fmt(inv.cgstPercentage),
      fmt(inv.cgstAmount),
      fmt(inv.sgstPercentage),
      fmt(inv.sgstAmount),
      fmt(inv.igstPercentage),
      fmt(inv.igstAmount),
      fmt(inv.tcsPercentage),
      fmt(inv.tcsAmount),
      fmt(inv.roundOff),
      fmt(inv.totalAmount),
    ]));
  });

  // Totals row
  rows.push('');
  rows.push(buildCSVRow([
    '', 'GRAND TOTAL', '', `${totals.count} invoices`, '',
    fmt(totals.totalBaseAmount),
    fmt(totals.totalTransportCharges),
    fmt(totals.totalAssessableValue),
    '', fmt(totals.totalCgstAmount),
    '', fmt(totals.totalSgstAmount),
    '', fmt(totals.totalIgstAmount),
    '', fmt(totals.totalTcsAmount),
    fmt(totals.totalRoundOff),
    fmt(totals.totalGrandTotal),
  ]));

  downloadCSV(rows.join('\n'), filename);
}

// ─── Challan Register ─────────────────────────────────────────────────────────

export function exportChallanRegisterToExcel(reportData: any, filename: string): void {
  const { company, data, totals, filters } = reportData;
  const rows: string[] = [];

  rows.push(buildCSVRow([company?.companyName || 'DWPL']));
  rows.push(buildCSVRow(['Outward Challan Register']));
  const fromStr = filters.fromDate ? fmtDate(filters.fromDate) : 'All';
  const toStr = filters.toDate ? fmtDate(filters.toDate) : 'All';
  rows.push(buildCSVRow([`Period: ${fromStr} to ${toStr}`]));
  rows.push('');

  rows.push(buildCSVRow([
    'Sr.', 'Challan No.', 'Date', 'Party Name', 'GSTIN',
    'No. of Items', 'Total Qty (Kg)', 'Total Amount',
    'Vehicle No.', 'Transport',
  ]));

  data.forEach((challan: any, idx: number) => {
    const party = challan.party || {};
    const totalQty = (challan.items || []).reduce((s: number, i: any) => s + (i.quantity || 0), 0);
    const vehicles = (challan.vehicles || []).map((v: any) => v.vehicleNumber).filter(Boolean).join('; ') || challan.vehicleNumber || '';
    rows.push(buildCSVRow([
      idx + 1,
      challan.challanNumber,
      fmtDate(challan.challanDate),
      party.partyName || '',
      party.gstNumber || '',
      (challan.items || []).length,
      fmt(totalQty),
      fmt(challan.totalAmount),
      vehicles,
      challan.transportName || '',
    ]));
  });

  rows.push('');
  rows.push(buildCSVRow([
    '', 'GRAND TOTAL', '', `${totals.count} challans`, '',
    '', '', fmt(totals.totalAmount), '', '',
  ]));

  downloadCSV(rows.join('\n'), filename);
}

// ─── GRN Register ────────────────────────────────────────────────────────────

export function exportGRNRegisterToExcel(reportData: any, filename: string): void {
  const { company, data, totals, filters } = reportData;
  const rows: string[] = [];

  rows.push(buildCSVRow([company?.companyName || 'DWPL']));
  rows.push(buildCSVRow(['GRN Register (Inward)']));
  const fromStr = filters.fromDate ? fmtDate(filters.fromDate) : 'All';
  const toStr = filters.toDate ? fmtDate(filters.toDate) : 'All';
  rows.push(buildCSVRow([`Period: ${fromStr} to ${toStr}`]));
  rows.push('');

  rows.push(buildCSVRow([
    'Sr.', 'Party Challan No.', 'GRN Date', 'Sending Party', 'GSTIN',
    'No. of Items', 'Total Qty (Kg)', 'Total Value',
  ]));

  data.forEach((grn: any, idx: number) => {
    const party = grn.sendingParty || {};
    const totalQty = (grn.items || []).reduce((s: number, i: any) => s + (i.quantity || 0), 0);
    rows.push(buildCSVRow([
      idx + 1,
      grn.partyChallanNumber,
      fmtDate(grn.grnDate),
      party.partyName || '',
      party.gstNumber || '',
      (grn.items || []).length,
      fmt(totalQty),
      fmt(grn.totalValue),
    ]));
  });

  rows.push('');
  rows.push(buildCSVRow([
    '', 'GRAND TOTAL', '', `${totals.count} GRNs`, '',
    '', '', fmt(totals.totalValue),
  ]));

  downloadCSV(rows.join('\n'), filename);
}

// ─── Transporter Accounts ──────────────────────────────────────────────────────

export function exportTransporterAccountsToExcel(reportData: any, filename: string): void {
  const { company, data, totals, filters } = reportData;
  const rows: string[] = [];

  rows.push(buildCSVRow([company?.companyName || 'DWPL']));
  rows.push(buildCSVRow(['Transporter Accounts Report']));
  const fromStr = filters.fromDate ? fmtDate(filters.fromDate) : 'All';
  const toStr = filters.toDate ? fmtDate(filters.toDate) : 'All';
  rows.push(buildCSVRow([`Period: ${fromStr} to ${toStr}`]));
  if (filters.transporterName) {
    rows.push(buildCSVRow([`Transporter: ${filters.transporterName}`]));
  }
  rows.push('');

  rows.push(buildCSVRow([
    'Sr.', 'Date', 'Invoice No.', 'Party Name', 'Transporter Name', 'Vehicle No.',
    'Assessable Value', 'Transport Charges', 'Total Amount',
  ]));

  data.forEach((inv: any, idx: number) => {
    const party = inv.party || {};
    rows.push(buildCSVRow([
      idx + 1,
      fmtDate(inv.invoiceDate),
      inv.invoiceNumber,
      party.partyName || '',
      inv.transportName || '',
      inv.vehicleNumber || '',
      fmt(inv.assessableValue),
      fmt(inv.transportCharges),
      fmt(inv.totalAmount),
    ]));
  });

  rows.push('');
  rows.push(buildCSVRow([
    '', 'GRAND TOTAL', '', `${totals.count} invoices`, '', '',
    fmt(totals.totalAssessableValue),
    fmt(totals.totalTransportCharges),
    fmt(totals.totalGrandTotal),
  ]));

  downloadCSV(rows.join('\n'), filename);
}

