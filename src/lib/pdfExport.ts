/**
 * Generate a formatted filename for documents
 */
export function generatePDFFilename(
  type: 'GRN' | 'Challan' | 'Invoice',
  number: string,
  date?: string
): string {
  const dateStr = date
    ? new Date(date).toISOString().split('T')[0]
    : new Date().toISOString().split('T')[0];
  return `${type}_${number}_${dateStr}`;
}

/**
 * Export a report by opening a new popup window and triggering window.print().
 * Uses the browser's native PDF renderer — zero CSS color parsing issues.
 */
export async function exportMultiPageToPDF(
  containerId: string,
  _filename: string,
  options?: {
    orientation?: 'portrait' | 'landscape';
    format?: 'a4' | 'letter';
    scale?: number;
  }
): Promise<void> {
  const container = document.getElementById(containerId);
  if (!container) throw new Error(`Element #${containerId} not found`);

  const orientation = options?.orientation ?? 'landscape';

  // Collect all <link rel="stylesheet"> hrefs
  const styleLinks: string[] = [];
  document.querySelectorAll<HTMLLinkElement>('link[rel="stylesheet"]').forEach((l) => {
    if (l.href) styleLinks.push(l.href);
  });

  // Collect all inline <style> blocks (Next.js critical CSS)
  const inlineStyles: string[] = [];
  document.querySelectorAll<HTMLStyleElement>('style').forEach((s) => {
    if (s.textContent) inlineStyles.push(s.textContent);
  });

  const printHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  ${styleLinks.map((href) => `<link rel="stylesheet" href="${href}" />`).join('\n  ')}
  ${inlineStyles.map((css) => `<style>${css}</style>`).join('\n  ')}
  <style>
    @page { size: A4 ${orientation}; margin: 0; }
    html, body { margin: 0; padding: 0; background: white; }
    .print-page { page-break-after: always; break-after: page; }
    .print-page:last-child { page-break-after: avoid; break-after: avoid; }
  </style>
</head>
<body>
  ${container.outerHTML}
  <script>
    // Print once all images/fonts are ready
    window.onload = function() {
      setTimeout(function() {
        window.print();
        setTimeout(function() { window.close(); }, 500);
      }, 300);
    };
  <\/script>
</body>
</html>`;

  const printWindow = window.open('', '_blank', 'width=900,height=700');
  if (!printWindow) {
    throw new Error('Popup blocked. Please allow popups for this site and try again.');
  }

  printWindow.document.open();
  printWindow.document.write(printHtml);
  printWindow.document.close();
}

/**
 * Export a single element to PDF (delegates to exportMultiPageToPDF).
 */
export async function exportToPDF(
  elementId: string,
  filename: string,
  options?: {
    orientation?: 'portrait' | 'landscape';
    format?: 'a4' | 'letter';
    scale?: number;
  }
): Promise<void> {
  return exportMultiPageToPDF(elementId, filename, options);
}
