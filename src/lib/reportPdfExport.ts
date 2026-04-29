/**
 * reportPdfExport.ts
 * Direct PDF generation for Sales Register, Challan Register, GRN Register.
 * Uses jsPDF + jspdf-autotable — no browser print dialog, no window.print().
 */

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(n: number | undefined | null): string {
  if (n === null || n === undefined || isNaN(Number(n))) return '0.00';
  return Number(n).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function fmtDate(d: string | Date | undefined): string {
  if (!d) return '';
  return new Date(d).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function buildFilename(
  reportName: string,
  fromDate?: string | null,
  toDate?: string | null
): string {
  const from = fromDate ? fromDate.replace(/\//g, '-') : 'all';
  const to = toDate ? toDate.replace(/\//g, '-') : 'all';
  return `${reportName}-${from}-${to}.pdf`;
}

/**
 * Draw the per-page header + footer via jsPDF hooks.
 * Called inside didDrawPage so it repeats on every page autoTable creates.
 */
function drawPageHeaderFooter(
  doc: jsPDF,
  company: any,
  reportTitle: string,
  fromStr: string,
  toStr: string,
  pageWidth: number,
  marginLeft: number,
  marginRight: number,
  generatedAt: string
) {
  const totalPages = (doc as any).internal.getNumberOfPages();
  const currentPage = (doc as any).internal.getCurrentPageInfo().pageNumber;
  const usableWidth = pageWidth - marginLeft - marginRight;

  // ── Company name ──────────────────────────────────────────────────────────
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(0, 0, 0);
  doc.text(
    (company?.companyName || 'DWPL').toUpperCase(),
    pageWidth / 2,
    12,
    { align: 'center' }
  );

  // ── Address / GSTIN ───────────────────────────────────────────────────────
  let headerY = 17;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(80, 80, 80);
  if (company?.address) {
    doc.text(company.address, pageWidth / 2, headerY, { align: 'center' });
    headerY += 4;
  }
  if (company?.gstin) {
    let gstLine = `GSTIN: ${company.gstin}`;
    if (company?.pan) gstLine += `    PAN: ${company.pan}`;
    doc.text(gstLine, pageWidth / 2, headerY, { align: 'center' });
    headerY += 4;
  }

  // ── Title bar ─────────────────────────────────────────────────────────────
  doc.setDrawColor(0);
  doc.setLineWidth(0.4);
  doc.line(marginLeft, headerY, marginLeft + usableWidth, headerY);
  headerY += 4;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(0, 0, 0);
  doc.text(reportTitle.toUpperCase(), pageWidth / 2, headerY, { align: 'center' });
  headerY += 4;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(80, 80, 80);
  doc.text(
    `Period: ${fromStr} to ${toStr}    |    Page ${currentPage} of ${totalPages}`,
    pageWidth / 2,
    headerY,
    { align: 'center' }
  );
  headerY += 2;
  doc.line(marginLeft, headerY, marginLeft + usableWidth, headerY);

  // ── Footer ────────────────────────────────────────────────────────────────
  const pageHeight = doc.internal.pageSize.getHeight();
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(120, 120, 120);
  doc.setLineWidth(0.3);
  doc.line(marginLeft, pageHeight - 10, marginLeft + usableWidth, pageHeight - 10);
  doc.text(`Generated: ${generatedAt}`, marginLeft, pageHeight - 7);
  doc.text(`Page ${currentPage} of ${totalPages}`, pageWidth / 2, pageHeight - 7, { align: 'center' });
  doc.text(`${company?.companyName || 'DWPL'} — Confidential`, marginLeft + usableWidth, pageHeight - 7, { align: 'right' });
}

// ─── Sales Register ───────────────────────────────────────────────────────────

export function exportSalesRegisterToPDF(reportData: any): void {
  const { company, data, totals, filters } = reportData;

  const fromStr = filters.fromDate ? fmtDate(filters.fromDate) : 'All Dates';
  const toStr = filters.toDate ? fmtDate(filters.toDate) : 'All Dates';
  const generatedAt = new Date().toLocaleString('en-IN');

  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const marginLeft = 7;
  const marginRight = 7;
  // Starting Y after header (approx 40mm for header block)
  const startY = 42;

  const head = [[
    'Sr.', 'Invoice No.', 'Date', 'Party Name', 'GSTIN',
    'Base Amt', 'Freight', 'Assessable Val.',
    'CGST%', 'CGST Amt', 'SGST%', 'SGST Amt',
    'IGST%', 'IGST Amt', 'Round Off', 'Grand Total',
  ]];

  const body: any[][] = data.map((inv: any, idx: number) => {
    const party = inv.party || {};
    return [
      idx + 1,
      inv.invoiceNumber || '',
      fmtDate(inv.invoiceDate),
      party.partyName || '-',
      party.gstNumber || '-',
      fmt(inv.baseAmount),
      fmt(inv.transportCharges),
      fmt(inv.assessableValue),
      inv.cgstPercentage > 0 ? `${inv.cgstPercentage}%` : '-',
      inv.cgstAmount > 0 ? fmt(inv.cgstAmount) : '-',
      inv.sgstPercentage > 0 ? `${inv.sgstPercentage}%` : '-',
      inv.sgstAmount > 0 ? fmt(inv.sgstAmount) : '-',
      inv.igstPercentage > 0 ? `${inv.igstPercentage}%` : '-',
      inv.igstAmount > 0 ? fmt(inv.igstAmount) : '-',
      fmt(inv.roundOff),
      fmt(inv.totalAmount),
    ];
  });

  // Grand total footer row
  const foot: any[][] = [[
    { content: 'GRAND TOTAL', colSpan: 3, styles: { halign: 'center', fontStyle: 'bold' } },
    { content: `${totals.count} Invoice${totals.count !== 1 ? 's' : ''}`, colSpan: 2, styles: { fontStyle: 'bold' } },
    fmt(totals.totalBaseAmount),
    fmt(totals.totalTransportCharges),
    fmt(totals.totalAssessableValue),
    '',
    fmt(totals.totalCgstAmount),
    '',
    fmt(totals.totalSgstAmount),
    '',
    fmt(totals.totalIgstAmount),
    fmt(totals.totalRoundOff),
    { content: fmt(totals.totalGrandTotal), styles: { fontStyle: 'bold' } },
  ]];

  autoTable(doc, {
    head,
    body,
    foot,
    startY,
    margin: { left: marginLeft, right: marginRight, top: startY, bottom: 14 },
    styles: {
      fontSize: 7.5,
      cellPadding: 1.2,
      lineWidth: 0.2,
      lineColor: [0, 0, 0],
      textColor: [0, 0, 0],
      overflow: 'linebreak',
    },
    headStyles: {
      fillColor: [230, 230, 230],
      textColor: [0, 0, 0],
      fontStyle: 'bold',
      fontSize: 7,
      halign: 'center',
    },
    footStyles: {
      fillColor: [210, 210, 210],
      textColor: [0, 0, 0],
      fontStyle: 'bold',
      fontSize: 7.5,
    },
    alternateRowStyles: { fillColor: [248, 248, 248] },
    columnStyles: {
      0:  { halign: 'center', cellWidth: 8 },
      1:  { cellWidth: 22 },
      2:  { halign: 'center', cellWidth: 18 },
      3:  { cellWidth: 36 },
      4:  { cellWidth: 28, fontSize: 6.5 },
      5:  { halign: 'right', cellWidth: 18 },
      6:  { halign: 'right', cellWidth: 14 },
      7:  { halign: 'right', cellWidth: 20 },
      8:  { halign: 'center', cellWidth: 11 },
      9:  { halign: 'right', cellWidth: 16 },
      10: { halign: 'center', cellWidth: 11 },
      11: { halign: 'right', cellWidth: 16 },
      12: { halign: 'center', cellWidth: 11 },
      13: { halign: 'right', cellWidth: 16 },
      14: { halign: 'right', cellWidth: 16 },
      15: { halign: 'right', cellWidth: 20, fontStyle: 'bold' },
    },
    showFoot: 'lastPage',
    didDrawPage: () => {
      drawPageHeaderFooter(
        doc, company, 'Sales Register (Tax Invoice)',
        fromStr, toStr, pageWidth, marginLeft, marginRight, generatedAt
      );
    },
  });

  doc.save(buildFilename('sales-register', filters.fromDate, filters.toDate));
}

// ─── Challan Register ─────────────────────────────────────────────────────────

export function exportChallanRegisterToPDF(reportData: any): void {
  const { company, data, totals, filters } = reportData;

  const fromStr = filters.fromDate ? fmtDate(filters.fromDate) : 'All Dates';
  const toStr = filters.toDate ? fmtDate(filters.toDate) : 'All Dates';
  const generatedAt = new Date().toLocaleString('en-IN');

  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const marginLeft = 7;
  const marginRight = 7;
  const startY = 42;

  const head = [[
    'Sr.', 'Challan No.', 'Date', 'Party Name', 'GSTIN',
    'Items', 'Total Qty (Kg)', 'Total Amount', 'Vehicle No.', 'Transporter',
  ]];

  const body: any[][] = data.map((challan: any, idx: number) => {
    const party = challan.party || {};
    const totalQty = (challan.items || []).reduce(
      (s: number, i: any) => s + (i.quantity || 0), 0
    );
    const vehicles =
      (challan.vehicles || []).map((v: any) => v.vehicleNumber).filter(Boolean).join(', ') ||
      challan.vehicleNumber || '-';
    return [
      idx + 1,
      challan.challanNumber || '',
      fmtDate(challan.challanDate),
      party.partyName || '-',
      party.gstNumber || '-',
      (challan.items || []).length,
      fmt(totalQty),
      fmt(challan.totalAmount),
      vehicles,
      challan.transportName || '-',
    ];
  });

  const foot: any[][] = [[
    { content: 'GRAND TOTAL', colSpan: 3, styles: { halign: 'center', fontStyle: 'bold' } },
    { content: `${totals.count} Challan${totals.count !== 1 ? 's' : ''}`, colSpan: 3, styles: { fontStyle: 'bold' } },
    '',
    { content: fmt(totals.totalAmount), styles: { halign: 'right', fontStyle: 'bold' } },
    '',
    '',
  ]];

  autoTable(doc, {
    head,
    body,
    foot,
    startY,
    margin: { left: marginLeft, right: marginRight, top: startY, bottom: 14 },
    styles: {
      fontSize: 8,
      cellPadding: 1.5,
      lineWidth: 0.2,
      lineColor: [0, 0, 0],
      textColor: [0, 0, 0],
      overflow: 'linebreak',
    },
    headStyles: {
      fillColor: [230, 230, 230],
      textColor: [0, 0, 0],
      fontStyle: 'bold',
      fontSize: 7.5,
      halign: 'center',
    },
    footStyles: {
      fillColor: [210, 210, 210],
      textColor: [0, 0, 0],
      fontStyle: 'bold',
    },
    alternateRowStyles: { fillColor: [248, 248, 248] },
    columnStyles: {
      0: { halign: 'center', cellWidth: 10 },
      1: { cellWidth: 30 },
      2: { halign: 'center', cellWidth: 22 },
      3: { cellWidth: 55 },
      4: { cellWidth: 35, fontSize: 6.5 },
      5: { halign: 'center', cellWidth: 14 },
      6: { halign: 'right', cellWidth: 24 },
      7: { halign: 'right', cellWidth: 28, fontStyle: 'bold' },
      8: { cellWidth: 24 },
      9: { cellWidth: 25 },
    },
    showFoot: 'lastPage',
    didDrawPage: () => {
      drawPageHeaderFooter(
        doc, company, 'Outward Challan Register',
        fromStr, toStr, pageWidth, marginLeft, marginRight, generatedAt
      );
    },
  });

  doc.save(buildFilename('challan-register', filters.fromDate, filters.toDate));
}

// ─── GRN Register ─────────────────────────────────────────────────────────────

export function exportGRNRegisterToPDF(reportData: any): void {
  const { company, data, totals, filters } = reportData;

  const fromStr = filters.fromDate ? fmtDate(filters.fromDate) : 'All Dates';
  const toStr = filters.toDate ? fmtDate(filters.toDate) : 'All Dates';
  const generatedAt = new Date().toLocaleString('en-IN');

  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const marginLeft = 7;
  const marginRight = 7;
  const startY = 42;

  const head = [[
    'Sr.', 'Party Challan No.', 'GRN Date', 'Sending Party',
    'GSTIN', 'Items', 'Total Qty (Kg)', 'Total Value', 'Item Sizes',
  ]];

  const body: any[][] = data.map((grn: any, idx: number) => {
    const party = grn.sendingParty || {};
    const totalQty = (grn.items || []).reduce(
      (s: number, i: any) => s + (i.quantity || 0), 0
    );
    const sizes = (grn.items || []).map((i: any) => i.rmSize).filter(Boolean).join(', ');
    return [
      idx + 1,
      grn.partyChallanNumber || '',
      fmtDate(grn.grnDate),
      party.partyName || '-',
      party.gstNumber || '-',
      (grn.items || []).length,
      fmt(totalQty),
      fmt(grn.totalValue),
      sizes || '-',
    ];
  });

  const foot: any[][] = [[
    { content: 'GRAND TOTAL', colSpan: 3, styles: { halign: 'center', fontStyle: 'bold' } },
    { content: `${totals.count} GRN${totals.count !== 1 ? 's' : ''}`, colSpan: 3, styles: { fontStyle: 'bold' } },
    '',
    { content: fmt(totals.totalValue), styles: { halign: 'right', fontStyle: 'bold' } },
    '',
  ]];

  autoTable(doc, {
    head,
    body,
    foot,
    startY,
    margin: { left: marginLeft, right: marginRight, top: startY, bottom: 14 },
    styles: {
      fontSize: 8,
      cellPadding: 1.5,
      lineWidth: 0.2,
      lineColor: [0, 0, 0],
      textColor: [0, 0, 0],
      overflow: 'linebreak',
    },
    headStyles: {
      fillColor: [230, 230, 230],
      textColor: [0, 0, 0],
      fontStyle: 'bold',
      fontSize: 7.5,
      halign: 'center',
    },
    footStyles: {
      fillColor: [210, 210, 210],
      textColor: [0, 0, 0],
      fontStyle: 'bold',
    },
    alternateRowStyles: { fillColor: [248, 248, 248] },
    columnStyles: {
      0: { halign: 'center', cellWidth: 10 },
      1: { cellWidth: 34 },
      2: { halign: 'center', cellWidth: 22 },
      3: { cellWidth: 58 },
      4: { cellWidth: 35, fontSize: 6.5 },
      5: { halign: 'center', cellWidth: 14 },
      6: { halign: 'right', cellWidth: 24 },
      7: { halign: 'right', cellWidth: 28, fontStyle: 'bold' },
      8: { cellWidth: 40 },
    },
    showFoot: 'lastPage',
    didDrawPage: () => {
      drawPageHeaderFooter(
        doc, company, 'GRN Register (Inward Material)',
        fromStr, toStr, pageWidth, marginLeft, marginRight, generatedAt
      );
    },
  });

  doc.save(buildFilename('grn-register', filters.fromDate, filters.toDate));
}

// ─── Transporter Accounts ─────────────────────────────────────────────────────

export function exportTransporterAccountsToPDF(reportData: any): void {
  const { company, data, totals, filters } = reportData;

  const fromStr = filters.fromDate ? fmtDate(filters.fromDate) : 'All Dates';
  const toStr = filters.toDate ? fmtDate(filters.toDate) : 'All Dates';
  const generatedAt = new Date().toLocaleString('en-IN');

  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const marginLeft = 7;
  const marginRight = 7;
  const startY = 42;

  const head = [[
    'Sr.', 'Date', 'Invoice No.', 'Party Name',
    'Transporter Name', 'Vehicle No.', 'Assessable Val.', 'Transport Chg.', 'Total Amount',
  ]];

  const body: any[][] = data.map((inv: any, idx: number) => {
    const party = inv.party || {};
    return [
      idx + 1,
      fmtDate(inv.invoiceDate),
      inv.invoiceNumber || '',
      party.partyName || '-',
      inv.transportName || '-',
      inv.vehicleNumber || '-',
      fmt(inv.assessableValue),
      fmt(inv.transportCharges),
      fmt(inv.totalAmount),
    ];
  });

  const foot: any[][] = [[
    { content: 'GRAND TOTAL', colSpan: 3, styles: { halign: 'center', fontStyle: 'bold' } },
    { content: `${totals.count} Invoice${totals.count !== 1 ? 's' : ''}`, colSpan: 3, styles: { fontStyle: 'bold' } },
    { content: fmt(totals.totalAssessableValue), styles: { halign: 'right', fontStyle: 'bold' } },
    { content: fmt(totals.totalTransportCharges), styles: { halign: 'right', fontStyle: 'bold' } },
    { content: fmt(totals.totalGrandTotal), styles: { halign: 'right', fontStyle: 'bold' } },
  ]];

  autoTable(doc, {
    head,
    body,
    foot,
    startY,
    margin: { left: marginLeft, right: marginRight, top: startY, bottom: 14 },
    styles: {
      fontSize: 8,
      cellPadding: 1.5,
      lineWidth: 0.2,
      lineColor: [0, 0, 0],
      textColor: [0, 0, 0],
      overflow: 'linebreak',
    },
    headStyles: {
      fillColor: [230, 230, 230],
      textColor: [0, 0, 0],
      fontStyle: 'bold',
      fontSize: 7.5,
      halign: 'center',
    },
    footStyles: {
      fillColor: [210, 210, 210],
      textColor: [0, 0, 0],
      fontStyle: 'bold',
    },
    alternateRowStyles: { fillColor: [248, 248, 248] },
    columnStyles: {
      0: { halign: 'center', cellWidth: 10 },
      1: { halign: 'center', cellWidth: 22 },
      2: { cellWidth: 30 },
      3: { cellWidth: 55 },
      4: { cellWidth: 50 },
      5: { cellWidth: 30 },
      6: { halign: 'right', cellWidth: 25 },
      7: { halign: 'right', cellWidth: 25 },
      8: { halign: 'right', cellWidth: 30, fontStyle: 'bold' },
    },
    showFoot: 'lastPage',
    didDrawPage: () => {
      let title = 'Transporter Accounts Report';
      if (filters.transporterName) {
        title += ` - ${filters.transporterName}`;
      }
      drawPageHeaderFooter(
        doc, company, title,
        fromStr, toStr, pageWidth, marginLeft, marginRight, generatedAt
      );
    },
  });

  doc.save(buildFilename('transporter-accounts', filters.fromDate, filters.toDate));
}

