import jsPDF from 'jspdf';
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

    // Capture the element as canvas with high quality
    const canvas = await html2canvas(element, {
      scale: options?.scale || 2, // Higher scale for better quality
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff',
    });

    // Calculate PDF dimensions
    const imgWidth = options?.orientation === 'landscape' ? 297 : 210; // A4 dimensions in mm
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

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
