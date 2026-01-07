'use client';

import { useEffect, useState } from 'react';
import PageHeader from '@/components/PageHeader';
import Card from '@/components/Card';
import Loading from '@/components/Loading';
import ErrorMessage from '@/components/ErrorMessage';
import ItemSelector from '@/components/ItemSelector';
import { Plus, X, Receipt, FileText, Download } from 'lucide-react';
import { exportToPDF, exportMultiPageToPDF, generatePDFFilename } from '@/lib/pdfExport';
import { numberToIndianWords, formatIndianCurrency } from '@/lib/numberToWords';

interface OutwardChallan {
  _id: string;
  challanNumber: string;
  party: {
    _id: string;
    partyName: string;
  };
  finishSize: {
    _id: string;
    size: string;
    hsnCode: string;
  };
  challanDate: string;
}

interface TaxInvoice {
  _id: string;
  invoiceNumber: string;
  irnNumber?: string;
  party: {
    partyName: string;
    address: string;
    gstNumber: string;
    contactNumber: string;
  };
  finishSize: {
    size: string;
    grade: string;
    hsnCode: string;
  };
  originalSize: {
    size: string;
    grade: string;
  };
  annealingCount: number;
  drawPassCount: number;
  quantity: number;
  rate: number;
  annealingCharge: number;
  drawCharge: number;
  
  // Invoice details
  poNumber?: string;
  paymentTerm?: string;
  supplierCode?: string;
  vehicleNumber?: string;
  transportName?: string;
  ownerName?: string;
  eWayBillNo?: string;
  dispatchedThrough?: string;
  packingType?: string;
  
  // Amounts
  baseAmount: number;
  transportCharges?: number;
  assessableValue?: number;
  
  // GST
  gstPercentage: number;
  cgstPercentage?: number;
  sgstPercentage?: number;
  igstPercentage?: number;
  cgstAmount?: number;
  sgstAmount?: number;
  igstAmount?: number;
  gstAmount: number;
  
  // TCS
  tcsPercentage?: number;
  tcsAmount?: number;
  
  totalAmount: number;
  invoiceDate: string;
  createdAt: string;
}

export default function TaxInvoicePage() {
  const [invoices, setInvoices] = useState<TaxInvoice[]>([]);
  const [challans, setChallans] = useState<OutwardChallan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [selectedChallan, setSelectedChallan] = useState('');
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split('T')[0]);
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [printInvoice, setPrintInvoice] = useState<TaxInvoice | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      console.log('Fetching tax invoices and outward challans...');
      const [invoicesRes, challansRes] = await Promise.all([
        fetch('/api/tax-invoice'),
        fetch('/api/outward-challan'),
      ]);

      const [invoicesData, challansData] = await Promise.all([
        invoicesRes.json(),
        challansRes.json(),
      ]);

      console.log('Tax Invoices API Response:', invoicesData);
      console.log('Outward Challans API Response:', challansData);

      if (invoicesData.success) {
        console.log('Setting invoices:', invoicesData.data);
        console.log('Number of invoices:', invoicesData.data.length);
        setInvoices(invoicesData.data);
        
        // Show message if corrupted invoices were auto-deleted
        if (invoicesData.message) {
          console.log('ℹ️ Cleanup message:', invoicesData.message);
          alert(`ℹ️ Cleanup Notice:\n\n${invoicesData.message}`);
        }
      } else {
        console.error('Failed to fetch invoices:', invoicesData.error);
        setError(invoicesData.error);
      }
      
      if (challansData.success) {
        // Filter out challans that already have invoices
        // Note: outwardChallan is populated, so it's an object with _id
        const invoicedChallanIds = invoicesData.success
          ? invoicesData.data.map((inv: any) => {
              // Handle both populated (object) and non-populated (string) cases
              const challanId = typeof inv.outwardChallan === 'string' 
                ? inv.outwardChallan 
                : inv.outwardChallan?._id;
              console.log('Invoice outwardChallan:', inv.outwardChallan, '-> ID:', challanId);
              return challanId;
            })
          : [];
        console.log('Invoiced challan IDs:', invoicedChallanIds);
        
        const availableChallans = challansData.data.filter(
          (ch: any) => !invoicedChallanIds.includes(ch._id)
        );
        console.log('Available challans for invoicing:', availableChallans.length);
        setChallans(availableChallans);
      } else {
        console.error('Failed to fetch challans:', challansData.error);
      }
    } catch (err: any) {
      console.error('Error fetching data:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      const response = await fetch('/api/tax-invoice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          outwardChallan: selectedChallan,
          invoiceDate,
        }),
      });

      const data = await response.json();

      if (data.success) {
        await fetchData();
        resetForm();
        alert('Tax Invoice created successfully!');
      } else {
        setError(data.error);
      }
    } catch (err: any) {
      setError(err.message);
    }
  };

  const resetForm = () => {
    setSelectedChallan('');
    setInvoiceDate(new Date().toISOString().split('T')[0]);
    setShowForm(false);
  };

  const handlePrint = (invoice: TaxInvoice) => {
    setPrintInvoice(invoice);
    setShowPrintModal(true);
  };

  const handleDirectPDFExport = async (invoice: TaxInvoice) => {
    try {
      // Create temporary hidden container
      const tempContainer = document.createElement('div');
      tempContainer.id = 'temp-invoice-print';
      tempContainer.style.position = 'absolute';
      tempContainer.style.left = '-9999px';
      tempContainer.style.top = '0';
      tempContainer.style.width = '210mm'; // A4 width
      tempContainer.style.background = 'white';
      document.body.appendChild(tempContainer);

      // Create a React root and render
      const { createRoot } = await import('react-dom/client');
      const root = createRoot(tempContainer);

      // Render all three copies
      await new Promise<void>((resolve) => {
        root.render(
          <div style={{ background: 'white' }}>
            {['Original For Recipient', 'Duplicate', 'Triplicate'].map((copyType, copyIndex) => (
              <div 
                key={copyType} 
                className="print-page"
                style={{
                  width: '210mm',
                  minHeight: '297mm',
                  padding: '7mm',
                  margin: 0,
                  background: 'white',
                  boxSizing: 'border-box',
                  pageBreakAfter: copyIndex < 2 ? 'always' : 'auto',
                  position: 'relative'
                }}
              >
                <div className="bg-white text-black font-sans w-full" style={{ fontSize: '9px' }}>
                  {/* Top Header Labels */}
                  <div className="flex justify-between items-end mb-1">
                    <div className="flex-1 text-center font-bold text-sm translate-x-10">
                      Tax Invoice
                    </div>
                    <div className="text-[10px] font-bold italic">
                      ({copyType})
                    </div>
                  </div>

                  {/* Main Invoice Border Box */}
                  <div className="border border-black">
                    {/* IRN Section */}
                    <div className="p-1 px-2 border-b border-black text-[8px]">
                      IRN : {invoice.irnNumber || '-'}
                    </div>

                    {/* Company and Meta Info Row */}
                    <div className="flex border-b border-black">
                      {/* Left: Supplier Details */}
                      <div className="w-[55%] p-2 border-r border-black flex flex-col min-h-[110px]">
                        <p className="font-bold text-[11px] mb-1 leading-none uppercase">PINNACLE FASTENER</p>
                        <p className="leading-tight">Plot No. 1005/B1, Phase-III, G.I.D.C.,</p>
                        <p className="leading-tight">Wadhwancity, Surendranagar, Gujarat, India - 363035</p>
                        <p className="mt-2"><strong>GSTIN :</strong> 24AAQCP2416F1ZD</p>
                        <p><strong>PAN No :</strong> AAQCP2416F</p>
                        <div className="flex gap-4">
                          <span>State : Gujarat</span>
                          <span>State Code : 24</span>
                        </div>
                      </div>

                      {/* Right: Invoice Meta */}
                      <div className="w-[45%] p-2 flex flex-col space-y-0.5">
                        <div className="grid grid-cols-[100px_1fr] leading-none">
                          <span className="font-bold">INVOICE No :</span>
                          <span className="font-bold">{invoice.invoiceNumber}</span>
                          
                          <span className="font-bold">Date :</span>
                          <span className="font-bold">{new Date(invoice.invoiceDate).toLocaleDateString('en-IN')}</span>
                          
                          <span>P.O. No. :</span>
                          <span>{invoice.poNumber || 'checking invoice printing'}</span>
                          
                          <span>P.O. Date :</span>
                          <span>{new Date(invoice.invoiceDate).toLocaleDateString('en-IN')}</span>
                          
                          <span>Payment Term :</span>
                          <span>{invoice.paymentTerm || '0 Days'}</span>
                          
                          <span>Supplier Code :</span>
                          <span>{invoice.supplierCode || '0'}</span>
                          
                          <span>Transport Name:</span>
                          <span className="break-all">{invoice.transportName || '-'}</span>
                          
                          <span>Vehicle No :</span>
                          <span>{invoice.vehicleNumber || 'EG13AW3140'}</span>
                          
                          <span>Owner Name :</span>
                          <span>{invoice.ownerName || '-'}</span>
                          
                          <span>E-Way Bill No :</span>
                          <span>{invoice.eWayBillNo || '-'}</span>
                          
                          <span>Dispatched Through:</span>
                          <span>
                            {invoice.dispatchedThrough || 'By Road'}
                            {(invoice.transportName || invoice.ownerName) && 
                              ` / ${invoice.transportName || invoice.ownerName}`
                            }
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Parties Section */}
                    <div className="flex border-b border-black">
                      <div className="w-1/2 p-2 border-r border-black min-h-[85px] flex flex-col">
                        <p className="font-bold underline mb-1 text-[8px]">Details of Receiver (Billed To)</p>
                        <p className="font-bold text-[10px] uppercase">{invoice.party.partyName}</p>
                        <p className="leading-tight">{invoice.party.address}</p>
                        <p className="mt-auto font-bold pt-1">GSTIN : {invoice.party.gstNumber}</p>
                        <p>State Code : 24 Gujarat</p>
                      </div>
                      <div className="w-1/2 p-2 min-h-[85px] flex flex-col">
                        <p className="font-bold underline mb-1 text-[8px]">Details of Consignee (Shipped To)</p>
                        <p className="font-bold text-[10px] uppercase">{invoice.party.partyName}</p>
                        <p className="leading-tight">{invoice.party.address}</p>
                        <p className="mt-auto font-bold pt-1">GSTIN : {invoice.party.gstNumber}</p>
                        <p>State Code: 24 Gujarat</p>
                      </div>
                    </div>

                    {/* Table Section */}
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className="border-b border-black text-center font-bold">
                          <td className="border-r border-black w-[35px] py-1">Sr.<br/>No.</td>
                          <td className="border-r border-black px-1">Description</td>
                          <td className="border-r border-black w-[60px]">HSN/SAC</td>
                          <td className="border-r border-black w-[80px] py-1">No. & Type Of<br/>Packing</td>
                          <td className="border-r border-black w-[80px] py-1">Total Qty.<br/>Nos./ Kgs</td>
                          <td className="border-r border-black w-[70px] py-1">Rate Per<br/>Unit</td>
                          <td className="w-[85px] py-1">Amount<br/>Rs.</td>
                        </tr>
                      </thead>
                      <tbody>
                        <tr className="border-b border-black h-[210px] align-top">
                          <td className="border-r border-black py-2 text-center font-bold">1</td>
                          <td className="border-r border-black p-2">
                            <p className="font-bold text-[10px] mb-1">{invoice.finishSize.size} - {invoice.finishSize.grade}</p>
                            <p className="text-[8px]">Item no 1</p>
                          </td>
                          <td className="border-r border-black py-2 text-center">{invoice.finishSize.hsnCode}</td>
                          <td className="border-r border-black py-2 text-center">{invoice.quantity.toFixed(0)}<br/>{invoice.packingType || 'KGS'}</td>
                          <td className="border-r border-black py-2 text-center font-bold">
                            {invoice.quantity.toFixed(0)}<br/>{invoice.packingType || 'KGS'}
                          </td>
                          <td className="border-r border-black py-2 text-center">
                            {invoice.rate.toFixed(2)}
                          </td>
                          <td className="py-2 px-1 text-right font-bold">{(invoice.quantity * invoice.rate).toFixed(2)}</td>
                        </tr>
                      </tbody>
                    </table>

                    {/* Summary Row */}
                    <div className="flex border-b border-black">
                      <div className="w-[60%] border-r border-black">
                        <div className="p-2 border-b border-black min-h-[35px] flex items-center">
                          <p className="italic text-[8px] leading-tight">Rs. {numberToIndianWords(invoice.baseAmount)}</p>
                        </div>
                        <div className="p-2 border-b border-black">
                          <p className="font-bold text-[8px] leading-tight">Net Total Rs {numberToIndianWords(invoice.totalAmount)}</p>
                        </div>
                        <div className="p-2 font-bold text-[9px] flex items-center">
                          Net Payable : {formatIndianCurrency(invoice.totalAmount)}
                        </div>
                      </div>
                      <div className="w-[40%] text-[8.5px]">
                        <div className="grid grid-cols-[1fr_80px] divide-x divide-black border-collapse">
                          <span className="p-1 px-2 border-b border-black">Transport Charges</span>
                          <span className="p-1 px-2 border-b border-black text-right">{formatIndianCurrency(invoice.transportCharges || 0)}</span>
                          
                          <span className="p-1 px-2 border-b border-black font-bold">Ass Value :</span>
                          <span className="p-1 px-2 border-b border-black text-right font-bold">{formatIndianCurrency(invoice.assessableValue || invoice.baseAmount)}</span>
                          
                          <span className="p-1 px-2 border-b border-black">CGST {(invoice.cgstPercentage || 0).toFixed(2)}%:</span>
                          <span className="p-1 px-2 border-b border-black text-right">{formatIndianCurrency(invoice.cgstAmount || 0)}</span>
                          
                          <span className="p-1 px-2 border-b border-black">SGST {(invoice.sgstPercentage || 0).toFixed(2)}%:</span>
                          <span className="p-1 px-2 border-b border-black text-right">{formatIndianCurrency(invoice.sgstAmount || 0)}</span>
                          
                          <span className="p-1 px-2 border-b border-black">IGST {(invoice.igstPercentage || 0).toFixed(2)}%:</span>
                          <span className="p-1 px-2 border-b border-black text-right">{formatIndianCurrency(invoice.igstAmount || 0)}</span>
                          
                          <span className="p-1 px-2 border-b border-black">TCS {(invoice.tcsPercentage || 0).toFixed(1)}%:</span>
                          <span className="p-1 px-2 border-b border-black text-right">{formatIndianCurrency(invoice.tcsAmount || 0)}</span>
                          
                          <span className="p-1 px-2 font-bold" style={{ backgroundColor: '#f8fafc' }}>Net Payable :</span>
                          <span className="p-1 px-2 text-right font-bold" style={{ backgroundColor: '#f8fafc' }}>{formatIndianCurrency(invoice.totalAmount)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Declaration */}
                    <div className="p-2 border-b border-black text-[7.5px] leading-tight text-justify">
                      <p>I / we certify that our registration certificate under the GST Act, 2017 is in force on the date on which the supply of goods specified in this Tax Invoice is made by me/us & the transaction of supply covered by this Tax Invoice had been effected by me/us & it shall be accounted for in the turnover of supplies while filing of return & the due tax if any payable on the supplies has been paid or shall be paid. Further certified that the particulars given above are true and correct & the amount indicated represents the prices actually charged and that there is no flow if additional consideration directly or indirectly from the buyer.</p>
                      <p className="mt-1 font-bold">Date & time of Issue : {(() => {
                        const date = new Date(); // Use current time
                        const day = String(date.getDate()).padStart(2, '0');
                        const month = String(date.getMonth() + 1).padStart(2, '0');
                        const year = date.getFullYear();
                        let hours = date.getHours();
                        const minutes = String(date.getMinutes()).padStart(2, '0');
                        const seconds = String(date.getSeconds()).padStart(2, '0');
                        const ampm = hours >= 12 ? 'PM' : 'AM';
                        hours = hours % 12 || 12;
                        const hoursStr = String(hours).padStart(2, '0');
                        return `${day}/${month}/${year}, ${hoursStr}:${minutes}:${seconds} ${ampm}`;
                      })()}</p>
                    </div>

                    {/* Signature Block */}
                    <div className="flex min-h-[70px] divide-x divide-black">
                      <div className="w-[35%] p-2">
                        <p className="text-[7.5px] font-bold">(Customer's Seal and Signature)</p>
                      </div>
                      <div className="w-[65%] flex flex-col justify-between">
                        <div className="text-right p-2 font-bold text-[10px]">
                          For PINNACLE FASTENER
                        </div>
                        <div className="flex border-t border-black text-[8px] font-bold divide-x divide-black h-[25px] items-center">
                          <span className="px-2 flex-1">Prepared By : Himesh Trivedi</span>
                          <span className="px-2 flex-1">Verified By :</span>
                          <span className="px-2 flex-1 text-right">Authorised Signatory</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Operational Footer */}
                  <div className="text-center font-bold text-[8px] mt-1 italic">
                    <p>(SUBJECT TO SURENDRANAGAR JURISDICTION)</p>
                    <p>(This is Computer Generated Invoice)</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        );
        
        // Wait for render to complete
        setTimeout(resolve, 200);
      });

      // Generate PDF using multi-page export
      const filename = generatePDFFilename('Invoice', invoice.invoiceNumber, invoice.invoiceDate);
      await exportMultiPageToPDF('temp-invoice-print', filename, { scale: 2 });

      // Clean up
      root.unmount();
      document.body.removeChild(tempContainer);
    } catch (error) {
      console.error('Failed to export PDF:', error);
      alert('Failed to export PDF. Please try again.');
    }
  };

  if (loading) {
    return <Loading message="Loading tax invoices..." />;
  }

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Tax Invoice"
        description="Generate GST invoices from outward challans"
        action={
          !showForm && (
            <button
              onClick={() => setShowForm(true)}
              className="btn btn-primary"
              disabled={challans.length === 0}
            >
              <Plus className="w-5 h-5" />
              Create Invoice
            </button>
          )
        }
      />

      {error && (
        <div className="mb-6">
          <ErrorMessage message={error} />
        </div>
      )}

      {challans.length === 0 && !showForm && (
        <Card className="mb-6">
          <div className="flex items-center gap-3 text-amber-800 bg-amber-50 p-4 rounded-lg">
            <FileText className="w-5 h-5" />
            <p>
              No outward challans available for invoicing. All existing challans have been
              invoiced or no challans exist yet.
            </p>
          </div>
        </Card>
      )}

      {showForm && (
        <Card className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-slate-900 dark:text-white">
              Create Tax Invoice
            </h2>
            <button onClick={resetForm} className="text-slate-400 hover:text-slate-600">
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-800 mb-3">
                <strong>Note:</strong> Select an outward challan to generate invoice. GST will be
                auto-calculated based on HSN code.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <ItemSelector
                label="Select Outward Challan"
                value={selectedChallan}
                onChange={(value) => setSelectedChallan(value)}
                items={challans}
                placeholder="Select Challan"
                required
                helperText="Choose an outward challan to generate invoice"
                renderSelected={(challan) => (
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-semibold" style={{ color: 'var(--foreground)' }}>
                      {challan.challanNumber}
                    </span>
                    <span className="text-sm" style={{ color: 'var(--text-muted)' }}>
                      - {challan.party.partyName}
                    </span>
                  </div>
                )}
                renderOption={(challan) => (
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-semibold" style={{ color: 'var(--foreground)' }}>
                        {challan.challanNumber}
                      </span>
                      <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                        {new Date(challan.challanDate).toLocaleDateString('en-IN')}
                      </span>
                    </div>
                    <div className="text-sm mt-1" style={{ color: 'var(--secondary)' }}>
                      {challan.party.partyName}
                    </div>
                    <div className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                      {challan.finishSize.size}
                    </div>
                  </div>
                )}
                getSearchableText={(challan) => 
                  `${challan.challanNumber} ${challan.party.partyName} ${challan.finishSize.size}`
                }
              />

              <div>
                <label className="label">Invoice Date *</label>
                <input
                  type="date"
                  className="input"
                  value={invoiceDate}
                  onChange={(e) => setInvoiceDate(e.target.value)}
                  required
                />
              </div>
            </div>

            {selectedChallan && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <h3 className="font-semibold text-green-900 mb-2">Invoice Preview</h3>
                <p className="text-sm text-green-800">
                  Invoice will be generated with all details from the selected challan including:
                </p>
                <ul className="text-sm text-green-800 list-disc list-inside mt-2 space-y-1">
                  <li>Party information</li>
                  <li>Item details (FG and RM sizes)</li>
                  <li>Quantity, rate, and charges</li>
                  <li>GST calculation based on HSN code</li>
                  <li>Final invoice total</li>
                </ul>
              </div>
            )}

            <div className="flex gap-3">
              <button type="submit" className="btn btn-primary">
                Generate Invoice
              </button>
              <button type="button" onClick={resetForm} className="btn btn-outline">
                Cancel
              </button>
            </div>
          </form>
        </Card>
      )}

      <Card>
        <div className="overflow-x-auto">
          <table className="table">
            <thead>
              <tr>
                <th>Invoice No.</th>
                <th>Date</th>
                <th>Party</th>
                <th>FG Size</th>
                <th>Quantity</th>
                <th>Base Amount</th>
                <th>GST %</th>
                <th>GST Amount</th>
                <th>Total Amount</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {invoices.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center py-8 text-slate-500">
                    <Receipt className="w-12 h-12 mx-auto mb-2 text-slate-400" />
                    <p>No invoices found. Create an outward challan first, then generate invoice.</p>
                  </td>
                </tr>
              ) : (
                invoices.map((invoice) => (
                  <tr key={invoice._id}>
                    <td className="font-mono font-semibold text-blue-600">
                      {invoice.invoiceNumber}
                    </td>
                    <td>
                      {new Date(invoice.invoiceDate).toLocaleDateString('en-IN', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </td>
                    <td className="font-medium">{invoice.party.partyName}</td>
                    <td>
                      <div className="text-sm">
                        <span className="font-semibold">{invoice.finishSize.size}</span>
                        <span className="text-slate-400 mx-1">←</span>
                        <span className="text-slate-600">{invoice.originalSize.size}</span>
                      </div>
                    </td>
                    <td className="font-semibold">{invoice.quantity.toFixed(2)}</td>
                    <td>₹{invoice.baseAmount.toFixed(2)}</td>
                    <td>
                      <span className="badge badge-info">{invoice.gstPercentage}%</span>
                    </td>
                    <td className="text-amber-600 font-semibold">
                      ₹{invoice.gstAmount.toFixed(2)}
                    </td>
                    <td className="font-bold text-green-600 text-lg">
                      ₹{invoice.totalAmount.toFixed(2)}
                    </td>
                    <td>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handlePrint(invoice)}
                          className="btn btn-secondary text-xs py-1 px-3 flex items-center gap-1"
                        >
                          <Receipt className="w-3 h-3" />
                          Print
                        </button>
                        <button
                          onClick={() => handleDirectPDFExport(invoice)}
                          className="btn btn-outline text-xs py-1 px-3 flex items-center gap-1"
                          title="Export as PDF"
                        >
                          <Download className="w-3 h-3" />
                          PDF
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Professional Print Modal */}
      {showPrintModal && printInvoice && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-start justify-center z-[100] p-4 overflow-y-auto pt-10 no-print">
          <div className="print-modal-container bg-zinc-100 rounded-xl max-w-[230mm] w-full relative">
            {/* Modal Header/Toolbar */}
            <div className="flex items-center justify-between p-4 bg-white border-b sticky top-0 z-10 rounded-t-xl no-print">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                  <Receipt className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900">Tax Invoice Preview</h3>
                  <p className="text-xs text-slate-500">Invoice: {printInvoice.invoiceNumber}</p>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => window.print()}
                  className="btn btn-primary flex items-center gap-2 px-6"
                >
                  <Download className="w-4 h-4" />
                  Print Now
                </button>
                <button
                  onClick={() => setShowPrintModal(false)}
                  className="btn btn-outline p-2"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Print Content - Original, Duplicate, Triplicate */}
            {['Original For Recipient', 'Duplicate', 'Triplicate'].map((copyType, copyIndex) => (
              <div key={copyType} className="print-page page-break">
                <div className="bg-white text-black font-sans w-full" style={{ fontSize: '9px' }}>
                  {/* Top Header Labels */}
                  <div className="flex justify-between items-end mb-1">
                    <div className="flex-1 text-center font-bold text-sm translate-x-10">
                      Tax Invoice
                    </div>
                    <div className="text-[10px] font-bold italic">
                      ({copyType})
                    </div>
                  </div>

                  {/* Main Invoice Border Box */}
                  <div className="border border-black">
                    {/* IRN Section */}
                    <div className="p-1 px-2 border-b border-black text-[8px]">
                      IRN : {printInvoice.irnNumber || '-'}
                    </div>

                    {/* Company and Meta Info Row */}
                    <div className="flex border-b border-black">
                      {/* Left: Supplier Details */}
                      <div className="w-[55%] p-2 border-r border-black flex flex-col min-h-[120px]">
                        <p className="font-bold text-[11px] mb-1 leading-none uppercase">PINNACLE FASTENER</p>
                        <p className="leading-tight">Plot No. 1005/B1, Phase-III, G.I.D.C.,</p>
                        <p className="leading-tight">Wadhwancity, Surendranagar, Gujarat, India - 363035</p>
                        <p className="mt-2"><strong>GSTIN :</strong> 24AAQCP2416F1ZD</p>
                        <p><strong>PAN No :</strong> AAQCP2416F</p>
                        <div className="flex gap-4">
                          <span>State : Gujarat</span>
                          <span>State Code : 24</span>
                        </div>
                      </div>

                      {/* Right: Invoice Meta */}
                      <div className="w-[45%] p-2 flex flex-col space-y-0.5">
                        <div className="grid grid-cols-[100px_1fr] leading-none">
                          <span className="font-bold">INVOICE No :</span>
                          <span className="font-bold">{printInvoice.invoiceNumber}</span>
                          
                          <span className="font-bold">Date :</span>
                          <span className="font-bold">{new Date(printInvoice.invoiceDate).toLocaleDateString('en-IN')}</span>
                          
                          <span>P.O. No. :</span>
                          <span>{printInvoice.poNumber || 'checking invoice printing'}</span>
                          
                          <span>P.O. Date :</span>
                          <span>{new Date(printInvoice.invoiceDate).toLocaleDateString('en-IN')}</span>
                          
                          <span>Payment Term :</span>
                          <span>{printInvoice.paymentTerm || '0 Days'}</span>
                          
                          <span>Supplier Code :</span>
                          <span>{printInvoice.supplierCode || '0'}</span>
                          
                          <span>Transport Name:</span>
                          <span className="break-all">{printInvoice.transportName || '-'}</span>
                          
                          <span>Vehicle No :</span>
                          <span>{printInvoice.vehicleNumber || 'EG13AW3140'}</span>
                          
                          <span>Owner Name :</span>
                          <span>{printInvoice.ownerName || '-'}</span>
                          
                          <span>E-Way Bill No :</span>
                          <span>{printInvoice.eWayBillNo || '-'}</span>
                          
                          <span>Dispatched Through:</span>
                          <span>
                            {printInvoice.dispatchedThrough || 'By Road'}
                            {(printInvoice.transportName || printInvoice.ownerName) && 
                              ` / ${printInvoice.transportName || printInvoice.ownerName}`
                            }
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Parties Section */}
                    <div className="flex border-b border-black">
                      <div className="w-1/2 p-2 border-r border-black min-h-[90px] flex flex-col">
                        <p className="font-bold underline mb-1 text-[8px]">Details of Receiver (Billed To)</p>
                        <p className="font-bold text-[10px] uppercase">{printInvoice.party.partyName}</p>
                        <p className="leading-tight">{printInvoice.party.address}</p>
                        <p className="mt-auto font-bold pt-1">GSTIN : {printInvoice.party.gstNumber}</p>
                        <p>State Code: 24 Gujarat</p>
                      </div>
                      <div className="w-1/2 p-2 min-h-[90px] flex flex-col">
                        <p className="font-bold underline mb-1 text-[8px]">Details of Consignee (Shipped To)</p>
                        <p className="font-bold text-[10px] uppercase">{printInvoice.party.partyName}</p>
                        <p className="leading-tight">{printInvoice.party.address}</p>
                        <p className="mt-auto font-bold pt-1">GSTIN : {printInvoice.party.gstNumber}</p>
                        <p>State Code: 24 Gujarat</p>
                      </div>
                    </div>

                    {/* Table Section */}
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className="border-b border-black text-center font-bold">
                          <td className="border-r border-black w-[35px] py-1">Sr.<br/>No.</td>
                          <td className="border-r border-black px-1">Description</td>
                          <td className="border-r border-black w-[60px]">HSN/SAC</td>
                          <td className="border-r border-black w-[80px] py-1">No. & Type Of<br/>Packing</td>
                          <td className="border-r border-black w-[80px] py-1">Total Qty.<br/>Nos./ Kgs</td>
                          <td className="border-r border-black w-[70px] py-1">Rate Per<br/>Unit</td>
                          <td className="w-[85px] py-1">Amount<br/>Rs.</td>
                        </tr>
                      </thead>
                      <tbody>
                        <tr className="border-b border-black h-[240px] align-top">
                          <td className="border-r border-black py-2 text-center font-bold">1</td>
                          <td className="border-r border-black p-2">
                            <p className="font-bold text-[10px] mb-1">{printInvoice.finishSize.size} - {printInvoice.finishSize.grade}</p>
                            <p className="text-[8px]">Item no 1</p>
                          </td>
                          <td className="border-r border-black py-2 text-center">{printInvoice.finishSize.hsnCode}</td>
                          <td className="border-r border-black py-2 text-center">{printInvoice.quantity.toFixed(0)}<br/>{printInvoice.packingType || 'KGS'}</td>
                          <td className="border-r border-black py-2 text-center font-bold">
                            {printInvoice.quantity.toFixed(0)}<br/>{printInvoice.packingType || 'KGS'}
                          </td>
                          <td className="border-r border-black py-2 text-center">
                            {printInvoice.rate.toFixed(2)}
                          </td>
                          <td className="py-2 px-1 text-right font-bold">{(printInvoice.quantity * printInvoice.rate).toFixed(2)}</td>
                        </tr>
                      </tbody>
                    </table>

                    {/* Summary Row */}
                    <div className="flex border-b border-black">
                      <div className="w-[60%] border-r border-black">
                        <div className="p-2 border-b border-black min-h-[35px] flex items-center">
                          <p className="italic text-[8px] leading-tight">Rs. {numberToIndianWords(printInvoice.baseAmount)}</p>
                        </div>
                        <div className="p-2 border-b border-black">
                          <p className="font-bold text-[8px] leading-tight">Net Total Rs {numberToIndianWords(printInvoice.totalAmount)}</p>
                        </div>
                        <div className="p-2 font-bold text-[9px] flex items-center">
                          Net Payable : {formatIndianCurrency(printInvoice.totalAmount)}
                        </div>
                      </div>
                      <div className="w-[40%] text-[8.5px]">
                        <div className="grid grid-cols-[1fr_80px] divide-x divide-black border-collapse">
                          <span className="p-1 px-2 border-b border-black">Transport Charges</span>
                          <span className="p-1 px-2 border-b border-black text-right">{formatIndianCurrency(printInvoice.transportCharges || 0)}</span>
                          
                          <span className="p-1 px-2 border-b border-black font-bold">Ass Value :</span>
                          <span className="p-1 px-2 border-b border-black text-right font-bold">{formatIndianCurrency(printInvoice.assessableValue || printInvoice.baseAmount)}</span>
                          
                          <span className="p-1 px-2 border-b border-black">CGST {(printInvoice.cgstPercentage || 0).toFixed(2)}%:</span>
                          <span className="p-1 px-2 border-b border-black text-right">{formatIndianCurrency(printInvoice.cgstAmount || 0)}</span>
                          
                          <span className="p-1 px-2 border-b border-black">SGST {(printInvoice.sgstPercentage || 0).toFixed(2)}%:</span>
                          <span className="p-1 px-2 border-b border-black text-right">{formatIndianCurrency(printInvoice.sgstAmount || 0)}</span>
                          
                          <span className="p-1 px-2 border-b border-black">IGST {(printInvoice.igstPercentage || 0).toFixed(2)}%:</span>
                          <span className="p-1 px-2 border-b border-black text-right">{formatIndianCurrency(printInvoice.igstAmount || 0)}</span>
                          
                          <span className="p-1 px-2 border-b border-black">TCS {(printInvoice.tcsPercentage || 0).toFixed(1)}%:</span>
                          <span className="p-1 px-2 border-b border-black text-right">{formatIndianCurrency(printInvoice.tcsAmount || 0)}</span>
                          
                          <span className="p-1 px-2 font-bold bg-slate-50">Net Payable :</span>
                          <span className="p-1 px-2 text-right font-bold bg-slate-50">{formatIndianCurrency(printInvoice.totalAmount)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Declaration */}
                    <div className="p-2 border-b border-black text-[7.5px] leading-tight text-justify">
                      <p>I / we certify that our registration certificate under the GST Act, 2017 is in force on the date on which the supply of goods specified in this Tax Invoice is made by me/us & the transaction of supply covered by this Tax Invoice had been effected by me/us & it shall be accounted for in the turnover of supplies while filing of return & the due tax if any payable on the supplies has been paid or shall be paid. Further certified that the particulars given above are true and correct & the amount indicated represents the prices actually charged and that there is no flow if additional consideration directly or indirectly from the buyer.</p>
                      <p className="mt-1 font-bold">Date & time of Issue : {(() => {
                        const date = new Date(); // Use current time
                        const day = String(date.getDate()).padStart(2, '0');
                        const month = String(date.getMonth() + 1).padStart(2, '0');
                        const year = date.getFullYear();
                        let hours = date.getHours();
                        const minutes = String(date.getMinutes()).padStart(2, '0');
                        const seconds = String(date.getSeconds()).padStart(2, '0');
                        const ampm = hours >= 12 ? 'PM' : 'AM';
                        hours = hours % 12 || 12;
                        const hoursStr = String(hours).padStart(2, '0');
                        return `${day}/${month}/${year}, ${hoursStr}:${minutes}:${seconds} ${ampm}`;
                      })()}</p>
                    </div>

                    {/* Signature Block */}
                    <div className="flex min-h-[70px] divide-x divide-black">
                      <div className="w-[35%] p-2">
                        <p className="text-[7.5px] font-bold">(Customer's Seal and Signature)</p>
                      </div>
                      <div className="w-[65%] flex flex-col justify-between">
                        <div className="text-right p-2 font-bold text-[10px]">
                          For PINNACLE FASTENER
                        </div>
                        <div className="flex border-t border-black text-[8px] font-bold divide-x divide-black h-[25px] items-center">
                          <span className="px-2 flex-1">Prepared By : Himesh Trivedi</span>
                          <span className="px-2 flex-1">Verified By :</span>
                          <span className="px-2 flex-1 text-right">Authorised Signatory</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Operational Footer */}
                  <div className="text-center font-bold text-[8px] mt-1 italic">
                    <p>(SUBJECT TO SURENDRANAGAR JURISDICTION)</p>
                    <p>(This is Computer Generated Invoice)</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
