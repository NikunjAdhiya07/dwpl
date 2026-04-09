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
 *
 * FIX: Previously used a fixed 300ms timeout before print, which was not enough
 * for the Tailwind CSS stylesheets to fully load in the popup window, causing
 * blank/unstyled pages. Now uses proper load events + safety timeout.
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

  const orientation = options?.orientation ?? 'portrait';

  // Collect all <link rel="stylesheet"> hrefs from current page
  const styleLinks: string[] = [];
  document.querySelectorAll<HTMLLinkElement>('link[rel="stylesheet"]').forEach((l) => {
    if (l.href) styleLinks.push(l.href);
  });

  // Collect all inline <style> blocks (Next.js critical CSS injection)
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
    /* Ensure all text and borders are black when printing */
    @media print {
      * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    }
  </style>
</head>
<body>
  ${container.outerHTML}
  <script>
    (function() {
      function doPrint() {
        setTimeout(function() {
          window.print();
          setTimeout(function() { window.close(); }, 500);
        }, 400);
      }

      // Wait for ALL external stylesheets to load before printing
      var links = Array.from(document.querySelectorAll('link[rel="stylesheet"]'));
      var total = links.length;

      if (total === 0) {
        // No external stylesheets — print after short delay
        doPrint();
        return;
      }

      var settled = 0;
      var printed = false;

      function onSettle() {
        settled++;
        if (settled >= total && !printed) {
          printed = true;
          doPrint();
        }
      }

      links.forEach(function(link) {
        try {
          // Check if already loaded (cached stylesheet has sheet object)
          if (link.sheet) {
            onSettle();
          } else {
            link.addEventListener('load', onSettle);
            link.addEventListener('error', onSettle); // Don't hang on failed loads
          }
        } catch (e) {
          onSettle();
        }
      });

      // Safety net: if stylesheets never fire events, print after 5 seconds
      setTimeout(function() {
        if (!printed) {
          printed = true;
          doPrint();
        }
      }, 5000);
    })();
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
