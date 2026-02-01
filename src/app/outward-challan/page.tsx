'use client';

import { useEffect, useState } from 'react';
import PageHeader from '@/components/PageHeader';
import Card from '@/components/Card';
import Loading from '@/components/Loading';
import ErrorMessage from '@/components/ErrorMessage';
import ItemSelector from '@/components/ItemSelector';
import CoilNumberInput from '@/components/CoilNumberInput';
import { Plus, X, Minus, Send, Trash2, Edit, Download, AlertCircle, MapPin, Truck, History } from 'lucide-react';
import { exportToPDF, exportMultiPageToPDF, generatePDFFilename } from '@/lib/pdfExport';
import { numberToIndianWords, formatIndianCurrency } from '@/lib/numberToWords';
import ChallanPrintView from '@/components/ChallanPrintView';

interface Party {
  _id: string;
  partyName: string;
  address: string;
  gstNumber: string;
  rate: number;
  annealingCharge: number;
  drawCharge: number;
  annealingMax: number;
  drawMax: number;
}

interface Item {
  _id: string;
  itemCode: string;
  size: string;
  grade: string;
  category: 'FG' | 'RM';
}

interface Transport {
  _id: string;
  vehicleNumber: string;
  transporterName: string;
  ownerName: string;
}

interface BOM {
  _id: string;
  fgSize: string;
  rmSize: string;
  grade: string;
  annealingMin: number;
  annealingMax: number;
  drawPassMin: number;
  drawPassMax: number;
  status?: 'Active' | 'Inactive';
}

interface Stock {
  _id: string;
  category: 'RM' | 'FG';
  size: string | Item; // Can be Item ID (string) or populated Item object
  quantity: number;
}

interface ChallanItem {
  finishSize: string;
  originalSize: string;
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

interface OutwardChallan {
  _id: string;
  challanNumber: string;
  party: {
    _id: string;
    partyName: string;
    address: string;
    gstNumber: string;
    contactNumber: string;
    rate: number;
    annealingCharge: number;
    drawCharge: number;
    annealingMax: number;
    drawMax: number;
  };
  billTo?: {
    _id: string;
    partyName: string;
    address: string;
    gstNumber: string;
  };
  shipTo?: {
    _id: string;
    partyName: string;
    address: string;
    gstNumber: string;
  };
  items: {
    finishSize: {
      _id: string;
      itemCode: string;
      size: string;
      grade: string;
      hsnCode: string;
      category: string;
    };
    originalSize: {
      _id: string;
      itemCode: string;
      size: string;
      grade: string;
      hsnCode: string;
      category: string;
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
  }[];
  totalAmount: number;
  challanDate: string;
  vehicleNumber?: string;
  transportName?: string;
  ownerName?: string;
  dispatchedThrough?: string;
  eWayBillNo?: string;
  createdAt: string;
}

interface ChallanForm {
  party: string;
  billTo?: string;
  shipTo?: string;
  items: ChallanItem[];
  challanDate: string;
  vehicleNumber?: string;
  transportName?: string;
  ownerName?: string;
  dispatchedThrough?: string;
  eWayBillNo?: string;
}

export default function OutwardChallanPage() {
  const [challans, setChallans] = useState<OutwardChallan[]>([]);
  const [parties, setParties] = useState<Party[]>([]);
  const [fgItems, setFgItems] = useState<Item[]>([]);
  const [rmItems, setRmItems] = useState<Item[]>([]);
  const [transports, setTransports] = useState<Transport[]>([]);
  const [boms, setBoms] = useState<BOM[]>([]);
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [grns, setGrns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [companyData, setCompanyData] = useState<any>(null);
  const [selectedParty, setSelectedParty] = useState<Party | null>(null);
  const [editingChallan, setEditingChallan] = useState<OutwardChallan | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [challanToDelete, setChallanToDelete] = useState<OutwardChallan | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  
  const [formData, setFormData] = useState<ChallanForm>({
    party: '',
    billTo: '',
    shipTo: '',
    items: [],
    challanDate: new Date().toISOString().split('T')[0],
    vehicleNumber: '',
    transportName: '',
    ownerName: '',
    dispatchedThrough: 'By Road',
    eWayBillNo: '',
  });

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (formData.party) {
      const party = parties.find((p) => p._id === formData.party);
      setSelectedParty(party || null);
    }
  }, [formData.party, parties]);

  const fetchData = async () => {
    try {
      const [challansRes, partiesRes, fgRes, rmRes, bomsRes, transportsRes, stocksRes, grnsRes, companyRes] = await Promise.all([
        fetch('/api/outward-challan'),
        fetch('/api/party-master'),
        fetch('/api/item-master?category=FG'),
        fetch('/api/item-master?category=RM'),
        fetch('/api/bom'),
        fetch('/api/transport-master'),
        fetch('/api/stock?category=RM'),
        fetch('/api/grn'),
        fetch('/api/company'),
      ]);

      const [challansData, partiesData, fgData, rmData, bomsData, transportsData, stocksData, grnsData, companyDataResponse] = await Promise.all([
        challansRes.json(),
        partiesRes.json(),
        fgRes.json(),
        rmRes.json(),
        bomsRes.json(),
        transportsRes.json(),
        stocksRes.json(),
        grnsRes.json(),
        companyRes.json(),
      ]);

      if (challansData.success) setChallans(challansData.data);
      if (partiesData.success) setParties(partiesData.data);
      if (fgData.success) setFgItems(fgData.data);
      if (rmData.success) setRmItems(rmData.data);
      if (bomsData.success) setBoms(bomsData.data);
      if (transportsData.success) setTransports(transportsData.data);
      if (stocksData.success) {
        setStocks(stocksData.data);
        console.log('📊 [Stock Data] Loaded RM stocks:', stocksData.data.length);
        if (stocksData.data.length > 0) {
          const firstStock = stocksData.data[0];
          const sizeIsPopulated = typeof firstStock.size === 'object' && firstStock.size !== null;
          console.log('  Sample stock entry:', {
            id: firstStock._id,
            category: firstStock.category,
            sizeType: sizeIsPopulated ? 'populated object' : 'string ID',
            sizeId: sizeIsPopulated ? (firstStock.size as any)._id : firstStock.size,
            sizeDetails: sizeIsPopulated ? `${(firstStock.size as any).itemCode} - ${(firstStock.size as any).size}` : 'N/A',
            quantity: firstStock.quantity
          });
          
          // Log all stock IDs for reference
          console.log('  All stock item IDs:', stocksData.data.map((s: any) => 
            typeof s.size === 'object' ? s.size._id : s.size
          ));
        }
      }
      
      if (grnsData.success) {
        setGrns(grnsData.data);
      }
      
      if (companyDataResponse.success) {
        setCompanyData(companyDataResponse.data);
      }

      if (!partiesData.success || partiesData.data.length === 0) {
        console.warn('No parties found. Please add parties first.');
      }
      if (!fgData.success || fgData.data.length === 0) {
        console.warn('No FG items found. Please add FG items first.');
      }
      if (!rmData.success || rmData.data.length === 0) {
        console.warn('No RM items found. Please add RM items first.');
      }
      if (!bomsData.success || bomsData.data.length === 0) {
        console.warn('No BOMs found. Please add BOM entries first.');
      }
      if (!stocksData.success || stocksData.data.length === 0) {
        console.warn('No stock data found.');
      }
    } catch (err: any) {
      console.error('Error fetching data:', err);
      setError(`Failed to load data: ${err.message}. Please refresh the page.`);
    } finally {
      setLoading(false);
    }
  };

  const getStockForItem = (itemId: string) => {
    // Convert both IDs to strings for proper comparison
    // Handle both populated (size is object with _id) and non-populated (size is string) cases
    const stock = stocks.find((s) => {
      const stockSizeId = typeof s.size === 'object' && s.size !== null 
        ? String((s.size as any)._id) 
        : String(s.size);
      return stockSizeId === String(itemId);
    });
    
    return stock ? stock.quantity : 0;
  };

  const addItem = () => {
    if (!selectedParty) {
      setError('Please select a party first');
      return;
    }

    const newItem: ChallanItem = {
      finishSize: '',
      originalSize: '',
      annealingCount: 0,
      drawPassCount: 0,
      quantity: 0,
      rate: selectedParty.rate,
      annealingCharge: selectedParty.annealingCharge,
      drawCharge: selectedParty.drawCharge,
      itemTotal: 0,
      issuedChallanNo: '',
      coilNumber: '',
      coilReference: '',
    };

    setFormData({
      ...formData,
      items: [...formData.items, newItem],
    });
  };

  const removeItem = (index: number) => {
    const newItems = formData.items.filter((_, i) => i !== index);
    setFormData({ ...formData, items: newItems });
  };

  const updateItem = (index: number, field: keyof ChallanItem, value: any) => {
    const newItems = [...formData.items];
    newItems[index] = { ...newItems[index], [field]: value };
    
    // If finishSize (FG) is selected, automatically fetch originalSize (RM) from BOM
    if (field === 'finishSize' && value) {
      // Find the FG item object to get its size string
      const fgItem = fgItems.find(item => item._id === value);
      if (fgItem) {
        // Find BOM entry where fgSize matches FG item's size
        const bom = boms.find((b) => b.fgSize === fgItem.size);
        if (bom) {
          // Find RM item object where size matches BOM's rmSize
          const rmItem = rmItems.find(item => item.size === bom.rmSize);
          if (rmItem) {
            newItems[index].originalSize = rmItem._id;
            console.log(`✅ Auto-filled RM: ${rmItem.size} based on FG: ${fgItem.size}`);
          }
        }
      }
    }

    // If originalSize (RM) is selected, automatically fetch finishSize (FG) from BOM
    if (field === 'originalSize' && value) {
      // Find the RM item object to get its size string
      const rmItem = rmItems.find(item => item._id === value);
      if (rmItem) {
        // Find FIRST BOM entry where rmSize matches RM item's size
        const bom = boms.find((b) => b.rmSize === rmItem.size);
        if (bom) {
          // Find FG item object where size matches BOM's fgSize
          const fgItem = fgItems.find(item => item.size === bom.fgSize);
          if (fgItem) {
            newItems[index].finishSize = fgItem._id;
            console.log(`✅ Auto-filled FG: ${fgItem.size} based on RM: ${rmItem.size}`);
          }
        }
      }
    }
    
    // Recalculate item total: Qty * Rate = Total Amount (as per user requirement)
    const item = newItems[index];
    item.itemTotal = item.quantity * item.rate;
    
    setFormData({ ...formData, items: newItems });
  };

  const handleTransportSelect = (transportId: string) => {
    const transport = transports.find((t) => t._id === transportId);
    if (transport) {
      setFormData({
        ...formData,
        vehicleNumber: transport.vehicleNumber,
        transportName: transport.transporterName,
        ownerName: transport.ownerName,
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!formData.party) {
      setError('Please select a party');
      return;
    }
    
    if (formData.items.length === 0) {
      setError('Please add at least one item');
      return;
    }
    
    // Validate each item
    for (let i = 0; i < formData.items.length; i++) {
      const item = formData.items[i];
      if (!item.finishSize) {
        setError(`Item ${i + 1}: Please select a finish size (FG)`);
        return;
      }
      if (!item.originalSize) {
        setError(`Item ${i + 1}: Please select an original size (RM)`);
        return;
      }
      if (item.quantity <= 0) {
        setError(`Item ${i + 1}: Please enter a valid quantity greater than 0`);
        return;
      }
      if (item.rate < 0) {
        setError(`Item ${i + 1}: Please enter a valid rate (cannot be negative)`);
        return;
      }
    }

    try {
      const challanData = {
        ...formData,
      };
      
      console.log('Submitting challan data:', challanData);

      let response;
      
      if (editingChallan) {
        response = await fetch(`/api/outward-challan/${editingChallan._id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(challanData),
        });
      } else {
        response = await fetch('/api/outward-challan', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(challanData),
        });
      }

      const data = await response.json();
      
      console.log('API Response:', data);

      if (data.success) {
        await fetchData();
        resetForm();
        alert(editingChallan 
          ? 'Outward Challan updated successfully!' 
          : 'Outward Challan created successfully! Stock has been updated.'
        );
      } else {
        const errorMsg = data.error || 'Failed to create/update challan';
        console.error('API Error:', errorMsg);
        setError(errorMsg);
      }
    } catch (err: any) {
      console.error('Submission error:', err);
      setError(err.message || 'An unexpected error occurred. Please try again.');
    }
  };

  const resetForm = () => {
    setFormData({
      party: '',
      billTo: '',
      shipTo: '',
      items: [],
      challanDate: new Date().toISOString().split('T')[0],
      vehicleNumber: '',
      transportName: '',
      ownerName: '',
      dispatchedThrough: 'By Road',
      eWayBillNo: '',
    });
    setSelectedParty(null);
    setShowForm(false);
    setEditingChallan(null);
  };

  const handleEdit = (challan: OutwardChallan) => {
    setEditingChallan(challan);
    setFormData({
      party: challan.party._id,
      billTo: challan.billTo?._id || '',
      shipTo: challan.shipTo?._id || '',
      items: challan.items.map(item => ({
        finishSize: item.finishSize._id,
        originalSize: item.originalSize._id,
        annealingCount: item.annealingCount,
        drawPassCount: item.drawPassCount,
        quantity: item.quantity,
        rate: item.rate,
        annealingCharge: item.annealingCharge,
        drawCharge: item.drawCharge,
        itemTotal: item.itemTotal,
        issuedChallanNo: item.issuedChallanNo || '',
        coilNumber: item.coilNumber || '',
        coilReference: item.coilReference || '',
      })),
      challanDate: new Date(challan.challanDate).toISOString().split('T')[0],
      vehicleNumber: challan.vehicleNumber || '',
      transportName: challan.transportName || '',
      ownerName: challan.ownerName || '',
      dispatchedThrough: challan.dispatchedThrough || 'By Road',
      eWayBillNo: challan.eWayBillNo || '',
    });
    setSelectedParty(parties.find(p => p._id === challan.party._id) || null);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDeleteClick = (challan: OutwardChallan) => {
    setChallanToDelete(challan);
    setShowDeleteConfirm(true);
  };

  const confirmDelete = async () => {
    if (!challanToDelete) return;
    
    setIsDeleting(true);
    try {
      const response = await fetch(`/api/outward-challan/${challanToDelete._id}`, {
        method: 'DELETE',
      });
      
      const data = await response.json();
      
      if (data.success) {
        await fetchData();
        setShowDeleteConfirm(false);
        setChallanToDelete(null);
        alert('Challan deleted successfully!');
      } else {
        setError(data.error || 'Failed to delete challan');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred while deleting');
    } finally {
      setIsDeleting(false);
    }
  };

  const handlePDFExport = async (challan: OutwardChallan) => {
    try {
      // Create temporary hidden container
      const tempContainer = document.createElement('div');
      tempContainer.id = 'temp-challan-print';
      tempContainer.style.position = 'absolute';
      tempContainer.style.left = '-9999px';
      tempContainer.style.top = '0';
      tempContainer.style.width = '210mm'; // A4 width
      tempContainer.style.background = 'white';
      document.body.appendChild(tempContainer);

      // Create a React root and render
      const { createRoot } = await import('react-dom/client');
      const root = createRoot(tempContainer);

      // Render copies
      await new Promise<void>((resolve) => {
        root.render(
          <div style={{ background: 'white' }}>
            {['Original for Recipient', 'Duplicate for Transporter', 'Triplicate for Supplier'].map((copyType, copyIndex) => (
              <div 
                key={copyType} 
                style={{
                  pageBreakAfter: copyIndex < 2 ? 'always' : 'auto',
                }}
              >
                <ChallanPrintView challan={challan as any} company={companyData} copyType={copyType} />
              </div>
            ))}
          </div>
        );
        
        // Wait for render to complete
        setTimeout(resolve, 500);
      });

      // Generate PDF
      const filename = generatePDFFilename('Challan', challan.challanNumber, challan.challanDate);
      await exportMultiPageToPDF('temp-challan-print', filename, { scale: 2 });

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

  const calculateTotal = () => {
    return formData.items.reduce((sum, item) => sum + item.itemTotal, 0);
  };

  if (loading) {
    return <Loading message="Loading outward challan data..." />;
  }

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Outward Challan"
        description="Create production challans with multiple items"
        action={
          !showForm && (
            <button onClick={() => setShowForm(true)} className="btn btn-primary">
              <Plus className="w-5 h-5" />
              Create Challan
            </button>
          )
        }
      />

      {error && (
        <div className="mb-6">
          <ErrorMessage message={error} />
        </div>
      )}

      {showForm && (
        <Card className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
              {editingChallan ? `Edit Challan - ${editingChallan.challanNumber}` : 'Create Outward Challan'}
            </h2>
            <button onClick={resetForm} className="text-slate-400 hover:text-slate-600">
              <X className="w-4 h-4" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            {/* Top Row: Party | Challan Date | Add Item Button */}
            <div className="grid grid-cols-1 md:grid-cols-[1fr_200px_auto] gap-2 items-end">
              <ItemSelector
                label="Party"
                value={formData.party}
                onChange={(value) => setFormData({ ...formData, party: value })}
                items={parties}
                placeholder="Select Party"
                required
                helperText={
                  selectedParty
                    ? `Annealing Max: ${selectedParty.annealingMax} | Draw Max: ${selectedParty.drawMax}`
                    : undefined
                }
                renderSelected={(party) => (
                  <span className="font-medium text-sm" style={{ color: 'var(--foreground)' }}>
                    {party.partyName}
                  </span>
                )}
                renderOption={(party) => (
                  <div>
                    <div className="font-medium text-sm" style={{ color: 'var(--foreground)' }}>
                      {party.partyName}
                    </div>
                    <div className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                      Annealing: ₹{party.annealingCharge}/unit | Draw: ₹{party.drawCharge}/pass
                    </div>
                  </div>
                )}
                getSearchableText={(party) => party.partyName}
              />

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Challan Date *</label>
                <input
                  type="date"
                  className="w-full px-2 py-1.5 text-sm border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  value={formData.challanDate}
                  onChange={(e) => setFormData({ ...formData, challanDate: e.target.value })}
                  required
                />
              </div>

              <button
                type="button"
                onClick={addItem}
                className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 flex items-center gap-1.5 whitespace-nowrap"
                disabled={!selectedParty}
              >
                <Plus className="w-3.5 h-3.5" />
                Add Item
              </button>
            </div>

            {/* Billing & Shipping (Collapsible) */}
            <details className="border border-slate-200 rounded">
              <summary className="px-3 py-2 bg-slate-50 cursor-pointer text-xs font-semibold text-slate-700 hover:bg-slate-100 flex items-center justify-between">
                <span>Billing & Shipping Details (Optional)</span>
                <span className="text-[10px] text-slate-500">Click to expand</span>
              </summary>
              <div className="p-3 bg-white border-t border-slate-200">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  <ItemSelector
                    label="Bill To"
                    value={formData.billTo || ''}
                    onChange={(value) => setFormData({ ...formData, billTo: value })}
                    items={parties}
                    placeholder="Same as Party (Default)"
                    helperText="Select different billing party"
                    renderSelected={(party) => (
                      <span className="font-medium text-sm" style={{ color: 'var(--foreground)' }}>
                        {party.partyName}
                      </span>
                    )}
                    renderOption={(party) => (
                      <div>
                        <div className="font-medium text-sm" style={{ color: 'var(--foreground)' }}>
                          {party.partyName}
                        </div>
                        <div className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                          {party.address}
                        </div>
                      </div>
                    )}
                    getSearchableText={(party) => `${party.partyName} ${party.address}`}
                  />

                  <ItemSelector
                    label="Ship To"
                    value={formData.shipTo || ''}
                    onChange={(value) => setFormData({ ...formData, shipTo: value })}
                    items={parties}
                    placeholder="Same as Party (Default)"
                    helperText="Select different shipping party"
                    renderSelected={(party) => (
                      <span className="font-medium text-sm" style={{ color: 'var(--foreground)' }}>
                        {party.partyName}
                      </span>
                    )}
                    renderOption={(party) => (
                      <div>
                        <div className="font-medium text-sm" style={{ color: 'var(--foreground)' }}>
                          {party.partyName}
                        </div>
                        <div className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                          {party.address}
                        </div>
                      </div>
                    )}
                    getSearchableText={(party) => `${party.partyName} ${party.address}`}
                  />
                </div>
              </div>
            </details>

            {/* Transport Details (Collapsible) */}
            <details className="border border-slate-200 rounded">
              <summary className="px-3 py-2 bg-slate-50 cursor-pointer text-xs font-semibold text-slate-700 hover:bg-slate-100 flex items-center justify-between">
                <span>Transport Details (Optional)</span>
                <span className="text-[10px] text-slate-500">Click to expand</span>
              </summary>
              <div className="p-3 bg-white border-t border-slate-200">
                <div className="grid grid-cols-1 md:grid-cols-5 gap-2">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Select Transport</label>
                    <select
                      className="w-full px-2 py-1.5 text-sm border border-slate-300 rounded focus:ring-2 focus:ring-blue-500"
                      onChange={(e) => handleTransportSelect(e.target.value)}
                      value=""
                    >
                      <option value="">-- Select --</option>
                      {transports.map((transport) => (
                        <option key={transport._id} value={transport._id}>
                          {transport.vehicleNumber} - {transport.transporterName}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Vehicle No</label>
                    <input
                      type="text"
                      className="w-full px-2 py-1.5 text-sm border border-slate-300 rounded focus:ring-2 focus:ring-blue-500"
                      value={formData.vehicleNumber || ''}
                      onChange={(e) => setFormData({ ...formData, vehicleNumber: e.target.value })}
                      placeholder="GJ01AB1234"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Transporter</label>
                    <input
                      type="text"
                      className="w-full px-2 py-1.5 text-sm border border-slate-300 rounded focus:ring-2 focus:ring-blue-500"
                      value={formData.transportName || ''}
                      onChange={(e) => setFormData({ ...formData, transportName: e.target.value })}
                      placeholder="ABC Transport"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Owner Name</label>
                    <input
                      type="text"
                      className="w-full px-2 py-1.5 text-sm border border-slate-300 rounded focus:ring-2 focus:ring-blue-500"
                      value={formData.ownerName || ''}
                      onChange={(e) => setFormData({ ...formData, ownerName: e.target.value })}
                      placeholder="John Doe"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">E-Way Bill No</label>
                    <input
                      type="text"
                      className="w-full px-2 py-1.5 text-sm border border-slate-300 rounded focus:ring-2 focus:ring-blue-500"
                      value={formData.eWayBillNo || ''}
                      onChange={(e) => setFormData({ ...formData, eWayBillNo: e.target.value })}
                      placeholder="123456789012"
                    />
                  </div>
                </div>
              </div>
            </details>

            {/* Items Section - Compact */}
            <div className="border border-slate-200 rounded">
              <div className="px-3 py-2 bg-slate-50 border-b border-slate-200">
                <h3 className="text-xs font-semibold text-slate-700 uppercase">Items</h3>
              </div>

              <div className="divide-y divide-slate-200">
                {formData.items.map((item, index) => (
                    <div key={index} className="p-3 bg-white hover:bg-slate-50">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-slate-700">#{index + 1}</span>
                          <span className="text-[10px] text-slate-500">
                            Annealing: ₹{item.annealingCharge}/unit | Draw: ₹{item.drawCharge}/pass
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeItem(index)}
                          className="text-red-500 hover:text-red-700"
                        >
                          <Minus className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-2">
                        {/* FG Selection */}
                        <div>
                          <ItemSelector
                            label="Finish Size (FG)"
                            value={item.finishSize}
                            onChange={(value) => updateItem(index, 'finishSize', value)}
                            items={fgItems}
                            placeholder="Select FG"
                            required
                            renderSelected={(fgItem) => (
                              <div className="flex items-center gap-1">
                                <span className="font-mono text-[10px] bg-blue-100 text-blue-800 px-1 py-0.5 rounded">
                                  {fgItem.itemCode}
                                </span>
                                <span className="text-xs font-medium truncate" style={{ color: 'var(--foreground)' }}>
                                  {fgItem.size}
                                </span>
                              </div>
                            )}
                            renderOption={(fgItem) => (
                              <div className="flex items-center gap-1">
                                <span className="font-mono text-[10px] bg-blue-100 text-blue-800 px-1 py-0.5 rounded">
                                  {fgItem.itemCode}
                                </span>
                                <span className="text-xs font-medium" style={{ color: 'var(--foreground)' }}>
                                  {fgItem.size} - {fgItem.grade}
                                </span>
                              </div>
                            )}
                            getSearchableText={(fgItem) => `${fgItem.itemCode} ${fgItem.size} ${fgItem.grade}`}
                          />
                        </div>

                        {/* RM Selection */}
                        <div>
                          <ItemSelector
                            label="Original Size (RM)"
                            value={item.originalSize}
                            onChange={(value) => updateItem(index, 'originalSize', value)}
                            items={rmItems}
                            placeholder="Select RM"
                            required
                            helperText={
                              item.originalSize
                                ? `Stock: ${getStockForItem(item.originalSize).toFixed(2)} Kgs`
                                : undefined
                            }
                            renderSelected={(rmItem) => (
                              <div className="flex items-center gap-1">
                                <span className="font-mono text-[10px] bg-green-100 text-green-800 px-1 py-0.5 rounded">
                                  {rmItem.itemCode}
                                </span>
                                <span className="text-xs font-medium truncate" style={{ color: 'var(--foreground)' }}>
                                  {rmItem.size}
                                </span>
                              </div>
                            )}
                            renderOption={(rmItem) => (
                              <div className="flex items-center gap-1">
                                <span className="font-mono text-[10px] bg-green-100 text-green-800 px-1 py-0.5 rounded">
                                  {rmItem.itemCode}
                                </span>
                                <span className="text-xs font-medium" style={{ color: 'var(--foreground)' }}>
                                  {rmItem.size} - {rmItem.grade}
                                </span>
                              </div>
                            )}
                            getSearchableText={(rmItem) => `${rmItem.itemCode} ${rmItem.size} ${rmItem.grade}`}
                          />
                        </div>

                        {/* Annealing Count */}
                        <div>
                          <label className="block text-xs font-medium text-slate-700 mb-1">
                            Annealing *
                          </label>
                          <select
                            className="w-full px-2 py-1.5 text-sm border border-slate-300 rounded focus:ring-2 focus:ring-blue-500"
                            value={item.annealingCount}
                            onChange={(e) => updateItem(index, 'annealingCount', parseInt(e.target.value))}
                            required
                          >
                            {Array.from({ length: (selectedParty?.annealingMax || 8) + 1 }, (_, i) => i).map((count) => (
                              <option key={count} value={count}>{count}</option>
                            ))}
                          </select>
                        </div>

                        {/* Draw Pass Count */}
                        <div>
                          <label className="block text-xs font-medium text-slate-700 mb-1">
                            Draw Pass *
                          </label>
                          <select
                            className="w-full px-2 py-1.5 text-sm border border-slate-300 rounded focus:ring-2 focus:ring-blue-500"
                            value={item.drawPassCount}
                            onChange={(e) => updateItem(index, 'drawPassCount', parseInt(e.target.value))}
                            required
                          >
                            {Array.from({ length: (selectedParty?.drawMax || 10) + 1 }, (_, i) => i).map((count) => (
                              <option key={count} value={count}>{count}</option>
                            ))}
                          </select>
                        </div>

                        {/* Issued Challan No */}
                        <div>
                          <ItemSelector
                            label="Issued Challan"
                            value={grns.find(g => String(g.partyChallanNumber).trim() === String(item.issuedChallanNo || '').trim())?._id || ''}
                            onChange={(grnId) => {
                              const selectedGRN = grns.find(g => String(g._id) === String(grnId));
                              if (selectedGRN) {
                                updateItem(index, 'issuedChallanNo', selectedGRN.partyChallanNumber);
                                updateItem(index, 'coilNumber', '');
                              } else {
                                updateItem(index, 'issuedChallanNo', '');
                              }
                            }}
                            items={grns.filter(grn => grn.items.some((gi: any) => String(gi.rmSize._id || gi.rmSize) === String(item.originalSize)))}
                            placeholder="Select"
                            required
                            renderSelected={(grn) => (
                              <span className="font-mono text-xs" style={{ color: 'var(--foreground)' }}>
                                {grn.partyChallanNumber}
                              </span>
                            )}
                            renderOption={(grn) => (
                              <div>
                                <div className="font-mono text-xs font-medium" style={{ color: 'var(--foreground)' }}>
                                  {grn.partyChallanNumber}
                                </div>
                                <div className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                                  {grn.sendingParty?.partyName || 'Unknown'}
                                </div>
                              </div>
                            )}
                            getSearchableText={(grn) => `${grn.partyChallanNumber} ${grn.sendingParty?.partyName || ''}`}
                          />
                        </div>

                        {/* Coil Number */}
                        <div>
                          <label className="block text-xs font-medium text-slate-700 mb-1">Coil No *</label>
                          <CoilNumberInput
                            value={item.coilNumber || ''}
                            onChange={(value) => {
                              updateItem(index, 'coilNumber', value);
                              if (value.length > 0) {
                                const selectedGRN = grns.find(g => g.partyChallanNumber === item.issuedChallanNo);
                                if (selectedGRN) {
                                  const matchingItem = selectedGRN.items.find((gi: any) => 
                                    gi.coilNumber === value && (gi.rmSize._id === item.originalSize || gi.rmSize === item.originalSize)
                                  );
                                  if (matchingItem) {
                                    updateItem(index, 'quantity', matchingItem.quantity);
                                    updateItem(index, 'rate', matchingItem.rate);
                                    updateItem(index, 'coilReference', matchingItem.coilReference || '');
                                  }
                                }
                              }
                            }}
                          />
                        </div>

                        {/* Coil Reference */}
                        <div>
                          <label className="block text-xs font-medium text-slate-700 mb-1">Coil Ref</label>
                          <input
                            type="text"
                            className="w-full px-2 py-1.5 text-sm border border-slate-300 rounded focus:ring-2 focus:ring-blue-500"
                            value={item.coilReference || ''}
                            onChange={(e) => updateItem(index, 'coilReference', e.target.value)}
                            placeholder="Ref/ID"
                          />
                        </div>

                        {/* Quantity */}
                        <div>
                          <label className="block text-xs font-medium text-slate-700 mb-1">Quantity *</label>
                          <input
                            type="number"
                            step="0.01"
                            className="w-full px-2 py-1.5 text-sm border border-slate-300 rounded focus:ring-2 focus:ring-blue-500"
                            value={item.quantity}
                            onChange={(e) => updateItem(index, 'quantity', parseFloat(e.target.value) || 0)}
                            min="0.01"
                            required
                          />
                        </div>

                        {/* Rate */}
                        <div>
                          <label className="block text-xs font-medium text-slate-700 mb-1">Rate *</label>
                          <input
                            type="number"
                            step="0.01"
                            className="w-full px-2 py-1.5 text-sm border border-slate-300 rounded focus:ring-2 focus:ring-blue-500"
                            value={item.rate || 0}
                            onChange={(e) => updateItem(index, 'rate', parseFloat(e.target.value) || 0)}
                            min="0"
                            required
                          />
                        </div>

                        {/* Item Total */}
                        <div className="flex items-end">
                          <div className="w-full px-2 py-1.5 bg-blue-50 border border-blue-200 rounded text-right">
                            <div className="text-[10px] text-slate-600 mb-0.5">Total</div>
                            <div className="text-sm font-bold text-blue-600">₹{item.itemTotal.toFixed(2)}</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
            </div>

            {/* Grand Total - Compact */}
            {formData.items.length > 0 && (
              <div className="flex justify-between items-center px-4 py-2 bg-green-50 border border-green-200 rounded">
                <span className="text-sm font-semibold text-green-900">Grand Total:</span>
                <span className="text-xl font-bold text-green-600">₹{calculateTotal().toFixed(2)}</span>
              </div>
            )}

            {/* Sticky Footer with Buttons */}
            <div className="sticky bottom-0 bg-white border-t border-slate-200 -mx-6 -mb-6 px-6 py-3 flex gap-3 mt-4">
              <button
                type="submit"
                className="flex-1 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded hover:bg-blue-700 flex items-center justify-center gap-2"
                disabled={formData.items.length === 0}
              >
                <Send className="w-4 h-4" />
                {editingChallan ? 'Update Challan' : 'Create Challan'}
              </button>
              <button
                type="button"
                onClick={resetForm}
                className="px-6 py-2 bg-slate-200 text-slate-700 text-sm font-medium rounded hover:bg-slate-300"
              >
                Cancel
              </button>
            </div>
          </form>
        </Card>
      )}

      {/* Challans List */}
      <Card>
        <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-4">
          Outward Challans
        </h2>

        {challans.length === 0 ? (
          <div className="text-center py-12 text-slate-500">
            <AlertCircle className="w-16 h-16 mx-auto mb-4 opacity-50" />
            <p className="text-lg">No outward challans found</p>
            <p className="text-sm">Create your first challan to get started</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>Challan No.</th>
                  <th>Date</th>
                  <th>Party</th>
                  <th>Items</th>
                  <th>Total Amount</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {challans.map((challan) => (
                  <tr key={challan._id}>
                    <td className="font-semibold">{challan.challanNumber}</td>
                    <td>{new Date(challan.challanDate).toLocaleDateString()}</td>
                    <td>{challan.party.partyName}</td>
                    <td>
                      <span className="badge badge-blue">
                        {challan.items.length} item{challan.items.length !== 1 ? 's' : ''}
                      </span>
                    </td>
                    <td className="font-semibold text-green-600">
                      ₹{challan.totalAmount.toFixed(2)}
                    </td>
                    <td>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handlePDFExport(challan)}
                          className="btn btn-sm btn-primary"
                          title="Export PDF"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleEdit(challan)}
                          className="btn btn-sm btn-secondary"
                          title="Edit"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteClick(challan)}
                          className="btn btn-sm btn-danger"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && challanToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
              Confirm Delete
            </h3>
            <p className="text-slate-600 dark:text-slate-400 mb-6">
              Are you sure you want to delete challan <strong>{challanToDelete.challanNumber}</strong>?
              This will reverse all stock changes for {challanToDelete.items.length} item(s).
            </p>
            <div className="flex gap-4">
              <button
                onClick={confirmDelete}
                className="btn btn-danger flex-1"
                disabled={isDeleting}
              >
                {isDeleting ? 'Deleting...' : 'Delete'}
              </button>
              <button
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setChallanToDelete(null);
                }}
                className="btn btn-secondary flex-1"
                disabled={isDeleting}
              >
                Cancel
              </button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
