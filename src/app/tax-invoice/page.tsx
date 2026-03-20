'use client';

import { useEffect, useState } from 'react';
import PageHeader from '@/components/PageHeader';
import Card from '@/components/Card';
import Loading from '@/components/Loading';
import ErrorMessage from '@/components/ErrorMessage';
import ItemSelector from '@/components/ItemSelector';
import { Plus, X, Receipt, FileText, Download, Trash2 } from 'lucide-react';
import { exportToPDF, exportMultiPageToPDF, generatePDFFilename } from '@/lib/pdfExport';
import { numberToIndianWords, formatIndianCurrency } from '@/lib/numberToWords';
import JobWorkInvoicePrintView from '@/components/JobWorkInvoicePrintView';

interface OutwardChallanItem {
  finishSize: {
    _id: string;
    size: string;
    hsnCode: string;
  };
  originalSize: {
    _id: string;
    size: string;
  };
  quantity: number;
  rate: number;
  itemTotal: number;
}

interface OutwardChallan {
  _id: string;
  challanNumber: string;
  party: {
    _id: string;
    partyName: string;
  };
  items?: OutwardChallanItem[];
  // Legacy support
  finishSize?: {
    _id: string;
    size: string;
    hsnCode: string;
  };
  challanDate: string;
}

interface TaxInvoiceItem {
  finishSize: {
    _id: string;
    size: string;
    grade: string;
    hsnCode: string;
  };
  originalSize: {
    _id: string;
    size: string;
    grade: string;
  };
  annealingCount: number;
  drawPassCount: number;
  quantity: number;
  rate: number;
  annealingCharge: number;
  drawCharge: number;
  itemTotal: number;
  issuedChallanNo?: string;
  coilNumber?: string;
  coilReference?: string;
}

interface TaxInvoice {
  _id: string;
  invoiceNumber: string;
  irnNumber?: string;
  outwardChallan?: {
    _id: string;
    challanNumber: string;
  };
  party: {
    partyName: string;
    address: string;
    gstNumber: string;
    contactNumber: string;
  };
  items: TaxInvoiceItem[];
  
  // Legacy support
  finishSize?: {
    size: string;
    grade: string;
    hsnCode: string;
  };
  originalSize?: {
    size: string;
    grade: string;
  };
  quantity?: number;
  rate?: number;

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
  const [companyData, setCompanyData] = useState<any>(null);
  const [invoiceItems, setInvoiceItems] = useState<any[]>([]);
  const [parties, setParties] = useState<any[]>([]);
  const [gstMasters, setGstMasters] = useState<any[]>([]);
  const [invoiceParty, setInvoiceParty] = useState(''); // auto-defaulted from billTo;
  const [selectedCgst, setSelectedCgst] = useState<number | null>(null);
  const [selectedSgst, setSelectedSgst] = useState<number | null>(null);
  const [selectedIgst, setSelectedIgst] = useState<number | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      console.log('Fetching tax invoices and outward challans...');
      const [invoicesRes, challansRes, companyRes, partiesRes, gstRes] = await Promise.all([
        fetch('/api/tax-invoice'),
        fetch('/api/outward-challan'),
        fetch('/api/company'),
        fetch('/api/party-master'),
        fetch('/api/gst-master'),
      ]);

      // Check if responses are OK
      if (!invoicesRes.ok) {
        const errorText = await invoicesRes.text();
        console.error('Tax Invoice API error:', errorText);
        throw new Error(`Failed to fetch invoices: ${invoicesRes.status} ${invoicesRes.statusText}`);
      }

      if (!challansRes.ok) {
        const errorText = await challansRes.text();
        console.error('Outward Challan API error:', errorText);
        throw new Error(`Failed to fetch challans: ${challansRes.status} ${challansRes.statusText}`);
      }

      // Parse JSON with error handling
      const [invoicesData, challansData, companyDataResponse, partiesData, gstData] = await Promise.all([
        invoicesRes.json(),
        challansRes.json(),
        companyRes.json(),
        partiesRes.json(),
        gstRes.json(),
      ]);

      console.log('Tax Invoices API Response:', invoicesData);
      console.log('Outward Challans API Response:', challansData);
      console.log('Company Data API Response:', companyDataResponse);

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

      if (companyDataResponse.success) {
        setCompanyData(companyDataResponse.data);
      }

      if (partiesData.success) {
        setParties(partiesData.data);
      }
      if (gstData.success) {
        setGstMasters(gstData.data);
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
          items: invoiceItems.map(item => ({
            ...item,
            finishSize: item.finishSize._id || item.finishSize,
            originalSize: item.originalSize._id || item.originalSize,
          }))
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

  const handleChallanChange = (challanId: string) => {
    setSelectedChallan(challanId);
    if (!challanId) {
      setInvoiceItems([]);
      return;
    }

      const challan = challans.find(c => c._id === challanId) as any;
      if (challan) {
        // Auto-default party to billTo if present, else party
        const defaultPartyId = challan.billTo?._id || challan.party?._id || '';
        setInvoiceParty(defaultPartyId);
        
        // Find GST matching the selected billTo party
        const partyGst = gstMasters.find(g => (g.party?._id || g.party) === defaultPartyId);
        if (partyGst) {
          setSelectedCgst(partyGst.cgstPercentage);
          setSelectedSgst(partyGst.sgstPercentage);
          setSelectedIgst(partyGst.igstPercentage);
        } else {
          setSelectedCgst(null);
          setSelectedSgst(null);
          setSelectedIgst(null);
        }
        
        // Find the party details from parties state to get current charges
        const partyRef = parties.find(p => p._id === defaultPartyId || p._id === (challan.party._id || challan.party));
        
        const items = challan.items.map((item: any) => {
          const annealingCharge = partyRef?.annealingCharge ?? item.annealingCharge;
          const drawCharge = partyRef?.drawCharge ?? item.drawCharge;
          
          // Process charge only = sum of processing rates
          const jobWorkRate = (annealingCharge * (item.annealingCount || 0)) + (drawCharge * (item.drawPassCount || 0));
          const itemTotal = item.quantity * jobWorkRate;
          
          return {
            ...item,
            annealingCharge,
            drawCharge,
            rate: jobWorkRate,
            itemTotal,
          };
        });
        setInvoiceItems(items);
      }
  };

  const resetForm = () => {
    setSelectedChallan('');
    setInvoiceDate(new Date().toISOString().split('T')[0]);
    setInvoiceItems([]);
    setInvoiceParty('');
    setSelectedCgst(null);
    setSelectedSgst(null);
    setSelectedIgst(null);
  };

  const handlePrint = (invoice: TaxInvoice) => {
    setPrintInvoice(invoice);
    setShowPrintModal(true);
  };

  const handleDirectPDFExport = async (invoice: TaxInvoice) => {
    if (!companyData) {
      alert('Company data not loaded. Cannot generate PDF.');
      return;
    }
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

      // Render all three copies using the component
      await new Promise<void>((resolve) => {
        root.render(
          <div style={{ background: 'white' }}>
            {['Original For Recipient', 'Duplicate For Transporter', 'Triplicate For Supplier'].map((copyType, copyIndex) => (
              <div 
                key={copyType} 
                style={{
                  pageBreakAfter: copyIndex < 2 ? 'always' : 'auto',
                }}
              >
                <JobWorkInvoicePrintView 
                  invoice={invoice as any} 
                  company={companyData}
                  copyType={copyType} 
                />
              </div>
            ))}
          </div>
        );
        
        // Wait for render to complete
        setTimeout(resolve, 500);
      });

      // Generate PDF using multi-page export
      const filename = generatePDFFilename('Invoice', invoice.invoiceNumber, invoice.invoiceDate);
      await exportMultiPageToPDF('temp-invoice-print', filename, { scale: 2 });

      // Clean up
      root.unmount();
      if (document.body.contains(tempContainer)) {
        document.body.removeChild(tempContainer);
      }
    } catch (error: any) {
      console.error('Failed to export PDF:', error);
      alert(`Failed to export PDF: ${error.message || 'Unknown error'}. Please check console for details.`);
    }
  };

  const handleDelete = async (id: string, invoiceNumber: string) => {
    if (!confirm(`Are you sure you want to delete invoice ${invoiceNumber}? This action cannot be undone.`)) {
      return;
    }

    try {
      const response = await fetch(`/api/tax-invoice/${id}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (data.success) {
        alert('Invoice deleted successfully!');
        await fetchData();
      } else {
        setError(data.error || 'Failed to delete invoice');
      }
    } catch (err: any) {
      console.error('Error deleting invoice:', err);
      setError(err.message);
    }
  };

  if (loading) {
    return <Loading message="Loading tax invoices..." />;
  }

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Job Work Invoice"
        description="Generate job work invoices from outward challans"
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
            {selectedChallan && invoiceParty ? (
              <div className="bg-blue-50 text-blue-800 p-3 rounded-md text-sm border border-blue-200">
                <div className="font-semibold mb-1">
                  Creating Job Work Invoice for Challan No: {challans.find(c => c._id === selectedChallan)?.challanNumber}
                </div>
                <div>
                  <strong>Bill To:</strong> {parties.find(p => p._id === invoiceParty)?.partyName || 'Unknown Party'} (auto-defaulted)
                </div>
                {selectedCgst !== null ? (
                  <div className="mt-1 text-green-700 space-y-0.5">
                    <strong>GST Rates:</strong>
                    <div>CGST: {selectedCgst}% | SGST: {selectedSgst}% | IGST: {selectedIgst}% (fetches automatically from Party GST Master)</div>
                  </div>
                ) : (
                  <div className="mt-1 text-red-600 font-semibold">
                    ⚠️ GST Rates not configured for this party in GST Master!
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-blue-50 text-blue-800 p-3 rounded-md text-sm border border-blue-200">
                <strong>Note:</strong> Select an outward challan to generate invoice. Only process charges will be calculated.
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <ItemSelector
                label="Select Outward Challan"
                value={selectedChallan}
                onChange={(value) => handleChallanChange(value)}
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
                      - {challan.party?.partyName || 'Unknown Party'}
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
                      {challan.party?.partyName || 'Unknown Party'}
                    </div>
                    <div className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                      {challan.items && challan.items.length > 0 ? (
                        <span>
                          {challan.items[0].finishSize?.size}
                          {challan.items.length > 1 && ` (+${challan.items.length - 1} more items)`}
                        </span>
                      ) : (
                        challan.finishSize?.size || 'No items'
                      )}
                    </div>
                  </div>
                )}
                getSearchableText={(challan) => 
                  `${challan.challanNumber} ${challan.party?.partyName || ''} ${
                    challan.items && challan.items.length > 0 
                      ? challan.items.map(i => i.finishSize?.size).join(' ') 
                      : (challan.finishSize?.size || '')
                  }`
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

            {invoiceItems.length > 0 && (
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-2 space-y-2">
                <h3 className="font-semibold text-slate-700">Item Details & Charges</h3>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-slate-200">
                    <thead>
                      <tr className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                        <th className="px-3 py-2">Size</th>
                        <th className="px-3 py-2">Qty</th>
                        <th className="px-3 py-2">Annealing Charge</th>
                        <th className="px-3 py-2">Draw Charge</th>
                        <th className="px-3 py-2 text-right">Rate</th>
                        <th className="px-3 py-2 text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {invoiceItems.map((item, idx) => (
                        <tr key={idx} className="text-sm">
                          <td className="px-2 py-1.5">
                            <div className="font-medium text-slate-900 text-xs">{item.finishSize?.size || 'N/A'}</div>
                            <div className="text-[9px] text-slate-500">{item.finishSize?.grade}</div>
                          </td>
                          <td className="px-2 py-1.5 text-slate-600 font-medium text-xs">
                            {item.quantity.toFixed(2)}
                          </td>
                          <td className="px-3 py-2">
                            <div className="flex items-center gap-1">
                              <span className="text-xs text-slate-400">₹</span>
                              <input
                                type="number"
                                step="0.01"
                                className="w-20 p-1 text-sm border rounded focus:ring-1 focus:ring-blue-500 outline-none"
                                value={item.annealingCharge}
                                onChange={(e) => {
                                  const newVal = parseFloat(e.target.value) || 0;
                                  const newItems = [...invoiceItems];
                                  newItems[idx].annealingCharge = newVal;
                                  
                                  // Recalculate rate and itemTotal
                                  const jobWorkRate = (newVal * (newItems[idx].annealingCount || 0)) + (newItems[idx].drawCharge * (newItems[idx].drawPassCount || 0));
                                  newItems[idx].rate = jobWorkRate;
                                  newItems[idx].itemTotal = newItems[idx].quantity * jobWorkRate;
                                  
                                  setInvoiceItems(newItems);
                                }}
                              />
                            </div>
                          </td>
                          <td className="px-3 py-2">
                            <div className="flex items-center gap-1">
                              <span className="text-xs text-slate-400">₹</span>
                              <input
                                type="number"
                                step="0.01"
                                className="w-20 p-1 text-sm border rounded focus:ring-1 focus:ring-blue-500 outline-none"
                                value={item.drawCharge}
                                onChange={(e) => {
                                  const newVal = parseFloat(e.target.value) || 0;
                                  const newItems = [...invoiceItems];
                                  newItems[idx].drawCharge = newVal;
                                  
                                  // Recalculate rate and itemTotal
                                  const jobWorkRate = (newItems[idx].annealingCharge * (newItems[idx].annealingCount || 0)) + (newVal * (newItems[idx].drawPassCount || 0));
                                  newItems[idx].rate = jobWorkRate;
                                  newItems[idx].itemTotal = newItems[idx].quantity * jobWorkRate;
                                  
                                  setInvoiceItems(newItems);
                                }}
                              />
                            </div>
                          </td>
                          <td className="px-2 py-1.5 text-right font-medium text-slate-600 text-xs">
                            ₹{(item.rate || 0).toFixed(2)}
                          </td>
                          <td className="px-2 py-1.5 text-right font-bold text-blue-600 text-xs">
                            ₹{(item.itemTotal || 0).toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="text-[10px] text-slate-500 italic">
                  * Charges are auto-fetched from Party Master and are editable.
                </p>
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
                <th>Taxes</th>
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
                    <td className="font-medium">{invoice.party?.partyName || 'Unknown Party'}</td>
                    <td>
                      <div className="text-sm">
                        {invoice.items && invoice.items.length > 0 ? (
                          <>
                            <span className="font-semibold">{invoice.items[0].finishSize?.size || 'Unknown'}</span>
                            {invoice.items.length > 1 && (
                              <span className="text-blue-600 ml-1">+{invoice.items.length - 1} items</span>
                            )}
                          </>
                        ) : (
                          <>
                            <span className="font-semibold">{invoice.finishSize?.size || '-'}</span>
                            <span className="text-slate-400 mx-1">←</span>
                            <span className="text-slate-600">{invoice.originalSize?.size || '-'}</span>
                          </>
                        )}
                      </div>
                    </td>
                    <td className="font-semibold">
                      {invoice.items && invoice.items.length > 0 
                        ? invoice.items.reduce((sum, item) => sum + item.quantity, 0).toFixed(2)
                        : (invoice.quantity || 0).toFixed(2)}
                    </td>
                    <td>₹{invoice.baseAmount.toFixed(2)}</td>
                    <td>
                      <div className="flex flex-col gap-1 items-start text-[10px]">
                        {(invoice.cgstPercentage || 0) > 0 && <span className="badge badge-info p-1 h-auto">CGST: {invoice.cgstPercentage}%</span>}
                        {(invoice.sgstPercentage || 0) > 0 && <span className="badge badge-info p-1 h-auto">SGST: {invoice.sgstPercentage}%</span>}
                        {(invoice.igstPercentage || 0) > 0 && <span className="badge badge-warning p-1 h-auto">IGST: {invoice.igstPercentage}%</span>}
                        {!invoice.cgstPercentage && !invoice.sgstPercentage && !invoice.igstPercentage && <span className="text-slate-400">0%</span>}
                      </div>
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
                        <button
                          onClick={() => handleDelete(invoice._id, invoice.invoiceNumber)}
                          className="btn btn-outline text-xs py-1 px-3 flex items-center gap-1 text-red-600 hover:bg-red-50 hover:border-red-300"
                          title="Delete Invoice"
                        >
                          <Trash2 className="w-3 h-3" />
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
                  <h3 className="font-bold text-slate-900">Delivery Challan Preview</h3>
                  <p className="text-xs text-slate-500">Challan: {printInvoice.invoiceNumber}</p>
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
            {['Original For Recipient', 'Duplicate For Transporter', 'Triplicate For Supplier'].map((copyType, copyIndex) => (
              <div key={copyType} className="print-page page-break">
                <JobWorkInvoicePrintView 
                  invoice={printInvoice as any} 
                  company={companyData}
                  copyType={copyType} 
                />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
