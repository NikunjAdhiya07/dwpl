// Import will be dynamic to avoid SSR issues
// @ts-ignore
let html2pdf: any;

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
 * Export HTML element directly to PDF file.
 * Uses html2pdf.js for reliable PDF generation with proper styling.
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
  
  // Dynamic import for browser-only library
  if (!html2pdf) {
    // @ts-ignore
    const mod = await import('html2pdf.js');
    html2pdf = mod.default || mod;
  }

  const element = container;
  try {
    await html2pdf()
      .set({
        margin: 0,
        filename: `${filename}.pdf`,
        image: { type: 'jpeg' as const, quality: 0.98 },
        html2canvas: { 
          scale: 2, 
          allowTaint: true, 
          useCORS: true,
          onclone: (clonedDoc: any) => {
            // Aggressively scrub all unsupported color functions from ALL stylesheets
            // html2canvas fails in its own CSS parser when it sees these modern functions
            let cssText = '';
            try {
              // Get all rules from all stylesheets
              Array.from(document.styleSheets).forEach((sheet: any) => {
                try {
                  Array.from(sheet.cssRules).forEach((rule: any) => {
                    cssText += rule.cssText + '\n';
                  });
                } catch (e) {
                  // Skip rules that might be cross-origin
                }
              });
            } catch (e) {}

            if (cssText) {
              // Sanitize the CSS text to remove modern color functions that crash html2canvas
              // Replacing with 'transparent' instead of 'black' avoids the black-bar issue
              cssText = cssText
                .replace(/(oklch|lab|oklab|color)\([^)]+\)/gi, 'transparent');

              // Remove all existing styles and links
              const existingStyles = clonedDoc.querySelectorAll('style, link[rel="stylesheet"]');
              existingStyles.forEach((el: any) => el.parentNode?.removeChild(el));

              // Inject the sanitized styles PLUS a high-priority override for printing
              const safeStyle = clonedDoc.createElement('style');
              safeStyle.innerHTML = `
                ${cssText}
                
                /* High-priority print overrides */
                * {
                  -webkit-print-color-adjust: exact !important;
                  print-color-adjust: exact !important;
                  color-adjust: exact !important;
                }
                
                /* Ensure all text is black and borders are visible */
                body, div, p, span, td, th {
                  color: #000000 !important;
                  border-color: #000000 !important;
                }
                
                /* Force backgrounds to be transparent/white unless specifically needed */
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
          }
        },
        jsPDF: { orientation: orientation, unit: 'mm' as const, format: 'a4' },
      })
      .from(element)
      .save();
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

  // Dynamic import for browser-only library
  if (!html2pdf) {
    // @ts-ignore
    const mod = await import('html2pdf.js');
    html2pdf = mod.default || mod;
  }

  // Create temporary element
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = htmlContent;
  tempDiv.style.background = 'white';
  document.body.appendChild(tempDiv);

  try {
    await html2pdf()
      .set({
        margin: 0,
        filename: `${filename}.pdf`,
        image: { type: 'jpeg' as const, quality: 0.98 },
        html2canvas: { 
          scale: 2, 
          allowTaint: true, 
          useCORS: true,
          onclone: (clonedDoc: any) => {
            // Aggressively scrub all unsupported color functions from ALL stylesheets
            // html2canvas fails in its own CSS parser when it sees these modern functions
            let cssText = '';
            try {
              // Get all rules from all stylesheets
              Array.from(document.styleSheets).forEach((sheet: any) => {
                try {
                  Array.from(sheet.cssRules).forEach((rule: any) => {
                    cssText += rule.cssText + '\n';
                  });
                } catch (e) {
                  // Skip rules that might be cross-origin
                }
              });
            } catch (e) {}

            if (cssText) {
              // Sanitize the CSS text to remove modern color functions that crash html2canvas
              // Replacing with 'transparent' instead of 'black' avoids the black-bar issue
              cssText = cssText
                .replace(/(oklch|lab|oklab|color)\([^)]+\)/gi, 'transparent');

              // Remove all existing styles and links
              const existingStyles = clonedDoc.querySelectorAll('style, link[rel="stylesheet"]');
              existingStyles.forEach((el: any) => el.parentNode?.removeChild(el));

              // Inject the sanitized styles PLUS a high-priority override for printing
              const safeStyle = clonedDoc.createElement('style');
              safeStyle.innerHTML = `
                ${cssText}
                
                /* High-priority print overrides */
                * {
                  -webkit-print-color-adjust: exact !important;
                  print-color-adjust: exact !important;
                  color-adjust: exact !important;
                }
                
                /* Ensure all text is black and borders are visible */
                body, div, p, span, td, th {
                  color: #000000 !important;
                  border-color: #000000 !important;
                }
                
                /* Force backgrounds to be transparent/white unless specifically needed */
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
          }
        },
        jsPDF: { orientation: orientation, unit: 'mm' as const, format: 'a4' },
      })
      .from(tempDiv)
      .save();
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
