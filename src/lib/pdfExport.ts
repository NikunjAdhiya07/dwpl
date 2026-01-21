import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';

/**
 * Export a DOM element to PDF
 * @param elementId - The ID of the element to export
 * @param filename - The name of the PDF file (without extension)
 * @param options - Additional options for PDF generation
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
  try {
    const element = document.getElementById(elementId);
    if (!element) {
      throw new Error(`Element with ID "${elementId}" not found`);
    }

    // Show loading state
    const originalCursor = document.body.style.cursor;
    document.body.style.cursor = 'wait';

    // Suppress CSS parsing errors globally (both console and exceptions)
    const originalError = console.error;
    const originalWindowError = (window as any).onerror;
    
    console.error = (...args: any[]) => {
      const errorMsg = args[0]?.toString?.() || '';
      if (errorMsg.includes('lab') || errorMsg.includes('color function') || errorMsg.includes('Attempting to parse')) {
        return; // Ignore CSS parsing errors
      }
      originalError.apply(console, args);
    };

    (window as any).onerror = (message: any, source: any, lineno: any, colno: any, error: any) => {
      const errorMsg = message?.toString?.() || '';
      if (errorMsg.includes('lab') || errorMsg.includes('color function') || errorMsg.includes('Attempting to parse')) {
        return true; // Suppress the error
      }
      if (originalWindowError) {
        return originalWindowError(message, source, lineno, colno, error);
      }
      return false;
    };

    // document-wide style sanitization to prevent html2canvas parser crash
    const originalStyles: Array<{ tag: HTMLStyleElement; content: string }> = [];
    const styleTags = document.getElementsByTagName('style');
    
    // Improved regex to better match modern color functions
    const colorFnRegex = /(lab|oklch|oklab|color)\s*\([^)]*\)/gi;

    for (let i = 0; i < styleTags.length; i++) {
      const tag = styleTags[i];
      if (tag.textContent && (tag.textContent.includes('lab(') || tag.textContent.includes('oklch(') || tag.textContent.includes('oklab(') || tag.textContent.includes('color('))) {
        originalStyles.push({ tag, content: tag.textContent });
        // Replace with white or a neutral color that html2canvas understands
        tag.textContent = tag.textContent.replace(colorFnRegex, 'white');
      }
    }

    let canvas: HTMLCanvasElement;
    let imgWidth: number;
    let imgHeight: number;

    try {
      // Capture the element as canvas with high quality
      canvas = await html2canvas(element, {
        scale: options?.scale || 2, // Higher scale for better quality
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
        onclone: (clonedDoc) => {
          // Deep sanitize inline styles in the cloned document
          const allElements = clonedDoc.getElementsByTagName('*');
          for (let i = 0; i < allElements.length; i++) {
            const el = allElements[i] as HTMLElement;
            if (el.style) {
              // Only check if it might have the problematic functions
              const styleStr = el.getAttribute('style');
              if (styleStr && colorFnRegex.test(styleStr)) {
                el.setAttribute('style', styleStr.replace(colorFnRegex, 'white'));
              }
            }
          }
        }
      });

      // Calculate PDF dimensions
      imgWidth = options?.orientation === 'landscape' ? 297 : 210; // A4 dimensions in mm
      imgHeight = (canvas.height * imgWidth) / canvas.width;
    } finally {
      // Restore original styles immediately
      for (const style of originalStyles) {
        style.tag.textContent = style.content;
      }
      // Restore error handlers
      console.error = originalError;
      (window as any).onerror = originalWindowError;
    }

    // Create PDF
    const pdf = new jsPDF({
      orientation: options?.orientation || 'portrait',
      unit: 'mm',
      format: options?.format || 'a4',
    });

    // Add image to PDF
    const imgData = canvas.toDataURL('image/png');
    pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);

    // If content is longer than one page, add additional pages
    let heightLeft = imgHeight;
    let position = 0;
    const pageHeight = options?.orientation === 'landscape' ? 210 : 297;

    while (heightLeft >= pageHeight) {
      position = heightLeft - imgHeight;
      pdf.addPage();
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
    }

    // Save the PDF
    pdf.save(`${filename}.pdf`);

    // Restore cursor
    document.body.style.cursor = originalCursor;
  } catch (error) {
    console.error('Error generating PDF:', error);
    document.body.style.cursor = 'default';
    throw error;
  }
}

/**
 * Temporarily disable all stylesheets that contain modern CSS color functions
 * Returns a function to restore them
 */
function disableProblematicStylesheets(): () => void {
  const disabledSheets: { sheet: CSSStyleSheet; disabled: boolean }[] = [];
  
  // Disable stylesheets that might contain lab() or oklch()
  for (let i = 0; i < document.styleSheets.length; i++) {
    const sheet = document.styleSheets[i];
    try {
      // Try to access cssRules - this will throw if cross-origin
      const rules = sheet.cssRules || sheet.rules;
      let hasProblematicColors = false;
      
      for (let j = 0; j < rules.length; j++) {
        const cssText = rules[j].cssText;
        if (cssText && (cssText.includes('lab(') || cssText.includes('oklch(') || cssText.includes('oklab('))) {
          hasProblematicColors = true;
          break;
        }
      }
      
      if (hasProblematicColors) {
        disabledSheets.push({ sheet, disabled: sheet.disabled });
        sheet.disabled = true;
      }
    } catch (e) {
      // Cross-origin stylesheet, skip it
    }
  }
  
  // Return restore function
  return () => {
    for (const { sheet, disabled } of disabledSheets) {
      sheet.disabled = disabled;
    }
  };
}

/**
 * Create a clean inline style for PDF export that doesn't use modern CSS colors
 */
function injectPDFSafeStyles(): HTMLStyleElement {
  const safeStyles = document.createElement('style');
  safeStyles.id = 'pdf-safe-styles';
  safeStyles.textContent = `
    /* Override all potential lab/oklch colors with safe values for the whole document to prevent crashes */
    * {
      --tw-ring-color: #3b82f6 !important;
      --tw-shadow-color: #000000 !important;
    }
    /* Specific overrides for print pages */
    .print-page {
      background-color: #ffffff !important;
      color: #000000 !important;
    }
    .print-page * {
      color: #000000 !important;
      border-color: #000000 !important;
    }
    /* Allow specific background shades for professional look */
    .print-page .bg-gray-50 {
      background-color: #f9fafb !important;
    }
    .print-page .bg-slate-50 {
      background-color: #f8fafc !important;
    }
  `;
  document.head.appendChild(safeStyles);
  return safeStyles;
}

/**
 * Export multiple pages to PDF (for documents with .print-page elements)
 * @param containerId - The ID of the container element
 * @param filename - The name of the PDF file (without extension)
 * @param options - Additional options for PDF generation
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
  try {
    const container = document.getElementById(containerId);
    if (!container) {
      throw new Error(`Container with ID "${containerId}" not found`);
    }

    // Show loading state
    const originalCursor = document.body.style.cursor;
    document.body.style.cursor = 'wait';

    // Find all .print-page elements
    const pages = container.querySelectorAll('.print-page');
    if (pages.length === 0) {
      throw new Error('No .print-page elements found');
    }

    // Create PDF
    const pdf = new jsPDF({
      orientation: options?.orientation || 'portrait',
      unit: 'mm',
      format: options?.format || 'a4',
    });

    const imgWidth = 210; // A4 width in mm
    const pageHeight = 297; // A4 height in mm

    // Suppress CSS parsing errors globally
    const originalError = console.error;
    console.error = (...args: any[]) => {
      const errorMsg = args[0]?.toString?.() || '';
      if (errorMsg.includes('lab') || errorMsg.includes('color function') || errorMsg.includes('Attempting to parse')) {
        return;
      }
      originalError.apply(console, args);
    };

    // NUCLEAR OPTION: Disable problematic stylesheets entirely
    const restoreStylesheets = disableProblematicStylesheets();
    
    // Inject safe PDF styles
    const safeStyles = injectPDFSafeStyles();

    try {
      // Capture each page separately
      for (let i = 0; i < pages.length; i++) {
        const page = pages[i] as HTMLElement;
        
        // Capture this page as canvas
        const canvas = await html2canvas(page, {
          scale: options?.scale || 2,
          useCORS: true,
          logging: false,
          backgroundColor: '#ffffff',
          width: page.scrollWidth,
          height: page.scrollHeight,
        });

        // Calculate image height to maintain aspect ratio
        const imgHeight = (canvas.height * imgWidth) / canvas.width;

        // Add new page if not the first one
        if (i > 0) {
          pdf.addPage();
        }

        // Add image to PDF
        const imgData = canvas.toDataURL('image/png');
        pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, Math.min(imgHeight, pageHeight));
      }
    } finally {
      // Remove safe styles
      safeStyles.remove();
      
      // Restore stylesheets
      restoreStylesheets();
      
      // Restore error handler
      console.error = originalError;
    }

    // Save the PDF
    pdf.save(`${filename}.pdf`);

    // Restore cursor
    document.body.style.cursor = originalCursor;
  } catch (error) {
    console.error('Error generating PDF:', error);
    document.body.style.cursor = 'default';
    throw error;
  }
}

/**
 * Generate a formatted filename for documents
 * @param type - Document type (GRN, Challan, Invoice)
 * @param number - Document number
 * @param date - Document date
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
