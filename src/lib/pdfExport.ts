// Import will be dynamic to avoid SSR issues

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

/** Collect and sanitize CSS so html2canvas does not crash on modern color functions. */
function collectSanitizedCss(): string {
  let cssText = '';
  try {
    Array.from(document.styleSheets).forEach((sheet) => {
      try {
        Array.from((sheet as CSSStyleSheet).cssRules).forEach((rule) => {
          cssText += rule.cssText + '\n';
        });
      } catch {
        // Skip cross-origin stylesheets
      }
    });
  } catch {
    // Ignore
  }

  if (!cssText) return '';

  return cssText.replace(/(oklch|lab|oklab|color)\([^)]+\)/gi, 'transparent');
}

function applyPrintSafeStyles(clonedDoc: Document): void {
  const cssText = collectSanitizedCss();
  if (!cssText) return;

  clonedDoc.querySelectorAll('style, link[rel="stylesheet"]').forEach((el) => {
    el.parentNode?.removeChild(el);
  });

  const safeStyle = clonedDoc.createElement('style');
  safeStyle.innerHTML = `
    ${cssText}

    * {
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
      color-adjust: exact !important;
    }

    body, div, p, span, td, th {
      color: #000000 !important;
      border-color: #000000 !important;
    }

    div, section, header, table, thead, tbody, tfoot, tr, th, td {
      background-color: transparent !important;
    }

    .print-page, .print-page * {
      visibility: visible !important;
    }

    .bg-white, body {
      background-color: #ffffff !important;
    }
  `;
  clonedDoc.head.appendChild(safeStyle);
}

/**
 * Render each `.print-page` element as exactly one PDF page.
 * Prevents html2pdf from splitting a single logical page and orphaning footers.
 */
async function exportPrintPagesToPDF(
  root: HTMLElement,
  filename: string,
  orientation: 'portrait' | 'landscape' = 'portrait'
): Promise<void> {
  const [{ jsPDF }, html2canvasModule] = await Promise.all([
    import('jspdf'),
    import('html2canvas'),
  ]);
  const html2canvas = html2canvasModule.default;

  const pageElements = root.querySelectorAll('.print-page');
  const pages: HTMLElement[] =
    pageElements.length > 0 ? Array.from(pageElements as NodeListOf<HTMLElement>) : [root];

  const pdf = new jsPDF({ orientation, unit: 'mm', format: 'a4' });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();

  for (let i = 0; i < pages.length; i++) {
    if (i > 0) pdf.addPage();

    const canvas = await html2canvas(pages[i], {
      scale: 2,
      allowTaint: true,
      useCORS: true,
      backgroundColor: '#ffffff',
      logging: false,
      onclone: (clonedDoc) => {
        applyPrintSafeStyles(clonedDoc);
      },
    });

    const imgData = canvas.toDataURL('image/jpeg', 0.98);
    let imgWidth = pageWidth;
    let imgHeight = (canvas.height * imgWidth) / canvas.width;

    if (imgHeight > pageHeight) {
      const scale = pageHeight / imgHeight;
      imgWidth *= scale;
      imgHeight = pageHeight;
    }

    pdf.addImage(imgData, 'JPEG', 0, 0, imgWidth, imgHeight);
  }

  pdf.save(`${filename}.pdf`);
}

/**
 * Export HTML element directly to PDF file.
 */
export async function exportMultiPageToPDF(
  containerId: string,
  filename: string,
  options?: {
    orientation?: 'portrait' | 'landscape';
    format?: 'a4' | 'letter';
    scale?: number;
  }
): Promise<void> {
  const container = document.getElementById(containerId);
  if (!container) throw new Error(`Element #${containerId} not found`);

  const orientation = options?.orientation ?? 'portrait';

  try {
    await exportPrintPagesToPDF(container, filename, orientation);
  } catch (error) {
    console.error('PDF export failed:', error);
    throw error;
  }
}

/**
 * Export raw HTML content to PDF file.
 */
export async function exportHTMLToPDF(
  htmlContent: string,
  filename: string,
  options?: {
    orientation?: 'portrait' | 'landscape';
  }
): Promise<void> {
  const orientation = options?.orientation ?? 'portrait';

  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = htmlContent;
  tempDiv.style.background = 'white';
  tempDiv.style.position = 'fixed';
  tempDiv.style.left = '-9999px';
  tempDiv.style.top = '0';
  document.body.appendChild(tempDiv);

  try {
    await exportPrintPagesToPDF(tempDiv, filename, orientation);
  } catch (error) {
    console.error('PDF export failed:', error);
    throw error;
  } finally {
    document.body.removeChild(tempDiv);
  }
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
