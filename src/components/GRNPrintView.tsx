'use client';

import React from 'react';
import { X, Download } from 'lucide-react';
import { exportToPDF, generatePDFFilename } from '@/lib/pdfExport';

interface GRNItem {
  rmSize: {
    size: string;
    grade: string;
  };
  quantity: number;
  rate: number;
}

interface GRNDocument {
  _id: string;
  grnDate: string;
  sendingParty: {
    partyName: string;
    address?: string;
    gstNumber?: string;
  };
  partyChallanNumber: string;
  items: GRNItem[];
  totalValue: number;
}

interface GRNPrintViewProps {
  grn: GRNDocument;
  onClose: () => void;
}

export default function GRNPrintView({ grn, onClose }: GRNPrintViewProps) {
  const handleExportPDF = async () => {
    try {
      const filename = generatePDFFilename(
        'GRN',
        grn.partyChallanNumber,
        grn.grnDate
      );
      await exportToPDF('grn-print-content', filename);
    } catch (error) {
      console.error('Error exporting PDF:', error);
      alert('Failed to export PDF. Please try again.');
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 z-40"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
        <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full my-8">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b">
            <h2 className="text-lg font-semibold">GRN Document</h2>
            <div className="flex items-center gap-2">
              <button
                onClick={handleExportPDF}
                className="btn btn-primary flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                Export PDF
              </button>
              <button
                onClick={onClose}
                className="p-2 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Printable Content */}
          <div className="p-8 bg-white" id="grn-print-content">
            {/* Company Header */}
            <div className="text-center mb-8 border-b-2 border-slate-800 pb-4">
              <h1 className="text-3xl font-bold text-slate-800">DWPL</h1>
              <p className="text-sm text-slate-600 mt-1">
                Manufacturing Management System
              </p>
              <h2 className="text-xl font-semibold text-slate-700 mt-4">
                GOODS RECEIPT NOTE
              </h2>
            </div>

            {/* GRN Details */}
            <div className="grid grid-cols-2 gap-6 mb-8">
              <div>
                <p className="text-sm text-slate-600 mb-1">GRN Date:</p>
                <p className="font-semibold">
                  {new Date(grn.grnDate).toLocaleDateString('en-IN', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </p>
              </div>
              <div>
                <p className="text-sm text-slate-600 mb-1">Challan Number:</p>
                <p className="font-semibold font-mono">{grn.partyChallanNumber}</p>
              </div>
            </div>

            {/* Party Details */}
            <div className="mb-8">
              <h3 className="text-lg font-semibold text-slate-800 mb-3 border-b pb-2">
                Sending Party Details
              </h3>
              <div className="bg-slate-50 p-4 rounded">
                <p className="font-semibold text-lg mb-2">{grn.sendingParty.partyName}</p>
                {grn.sendingParty.address && (
                  <p className="text-sm text-slate-600 mb-1">{grn.sendingParty.address}</p>
                )}
                {grn.sendingParty.gstNumber && (
                  <p className="text-sm text-slate-600">
                    <span className="font-medium">GST:</span> {grn.sendingParty.gstNumber}
                  </p>
                )}
              </div>
            </div>

            {/* Material Details */}
            <div className="mb-8">
              <h3 className="text-lg font-semibold text-slate-800 mb-3 border-b pb-2">
                Material Details
              </h3>
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-slate-100">
                    <th className="border border-slate-300 px-4 py-2 text-left">Sr.</th>
                    <th className="border border-slate-300 px-4 py-2 text-left">Description</th>
                    <th className="border border-slate-300 px-4 py-2 text-right">Quantity</th>
                    <th className="border border-slate-300 px-4 py-2 text-right">Rate</th>
                    <th className="border border-slate-300 px-4 py-2 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {grn.items.map((item, index) => (
                    <tr key={index}>
                      <td className="border border-slate-300 px-4 py-3 text-center">{index + 1}</td>
                      <td className="border border-slate-300 px-4 py-3">
                        <p className="font-semibold">{item.rmSize.size} - {item.rmSize.grade}</p>
                      </td>
                      <td className="border border-slate-300 px-4 py-3 text-right font-semibold">
                        {item.quantity.toFixed(2)}
                      </td>
                      <td className="border border-slate-300 px-4 py-3 text-right">
                        ₹{item.rate.toFixed(2)}
                      </td>
                      <td className="border border-slate-300 px-4 py-3 text-right font-semibold">
                        ₹{(item.quantity * item.rate).toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-slate-100">
                    <td colSpan={4} className="border border-slate-300 px-4 py-3 text-right font-bold">
                      Total Value:
                    </td>
                    <td className="border border-slate-300 px-4 py-3 text-right font-bold text-lg">
                      ₹{grn.totalValue.toFixed(2)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Footer */}
            <div className="mt-12 pt-8 border-t border-slate-300">
              <div className="grid grid-cols-2 gap-8">
                <div>
                  <p className="text-sm text-slate-600 mb-8">Received By:</p>
                  <div className="border-t border-slate-400 pt-2">
                    <p className="text-sm text-slate-600">Signature & Date</p>
                  </div>
                </div>
                <div>
                  <p className="text-sm text-slate-600 mb-8">Authorized Signatory:</p>
                  <div className="border-t border-slate-400 pt-2">
                    <p className="text-sm text-slate-600">Signature & Stamp</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
