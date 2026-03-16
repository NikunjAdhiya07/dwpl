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
  sappdRate: number;
  ppdFixedRate: number;
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

interface CoilEntry {
  coilNumber: string;
  coilWeight: number;
}

interface ChallanItem {
  finishSize: string;
  originalSize: string;
  processType: 'SAPP' | 'SAPPD' | 'PPD' | 'Draw' | 'Annealing';
  annealingCount: number;
  drawPassCount: number;
  extraAnnealingCount: number;
  extraPassCount: number;
  coilEntries: CoilEntry[];
  quantity: number;
  rate: number;
  rateOverride: boolean;
  annealingCharge: number;
  drawCharge: number;
  itemTotal: number;
  issuedChallanNo?: string;
  coilNumber?: string;
  coilReference?: string;
}

interface VehicleEntry {
  vehicleNumber: string;
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
    sappdRate: number;
    ppdFixedRate: number;
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
    processType?: string;
    annealingCount: number;
    drawPassCount: number;
    extraAnnealingCount: number;
    extraPassCount: number;
    coilEntries?: CoilEntry[];
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
  vehicles?: VehicleEntry[];
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
  vehicles: VehicleEntry[];
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
    vehicles: [{ vehicleNumber: '' }],
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
      processType: 'SAPPD',
      annealingCount: 0,
      drawPassCount: 0,
      extraAnnealingCount: 0,
      extraPassCount: 0,
      coilEntries: [],
      quantity: 0,
      rate: selectedParty.sappdRate || selectedParty.rate,
      rateOverride: false,
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
    
    // Recalculate rate using formula: Base(processType) + (A × EA) + (P × EP)
    const item = newItems[index];
    if (!item.rateOverride && selectedParty) {
      const rateMap: Record<string, number> = {
        SAPP: selectedParty.rate,
        SAPPD: selectedParty.sappdRate || selectedParty.rate,
        PPD: selectedParty.ppdFixedRate,
        Draw: selectedParty.drawCharge,
        Annealing: selectedParty.annealingCharge,
      };
      const S = rateMap[item.processType] ?? (selectedParty.sappdRate || selectedParty.rate);
      const A = selectedParty.annealingCharge;
      const P = selectedParty.drawCharge;
      const EA = item.extraAnnealingCount || 0;
      const EP = item.extraPassCount || 0;
      item.rate = S + (A * EA) + (P * EP);
    }
    
    // Auto-compute quantity from coil entries if any exist
    if (item.coilEntries && item.coilEntries.length > 0) {
      const coilTotal = item.coilEntries.reduce((sum, c) => sum + (c.coilWeight || 0), 0);
      if (coilTotal > 0) item.quantity = coilTotal;
    }
    
    item.itemTotal = item.quantity * item.rate;
    
    setFormData({ ...formData, items: newItems });
  };

  const handleTransportSelect = (transportId: string) => {
    const transport = transports.find((t) => t._id === transportId);
    if (transport) {
      setFormData({
        ...formData,
        vehicles: [{ vehicleNumber: transport.vehicleNumber }],
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
      vehicles: [{ vehicleNumber: '' }],
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
        processType: (item.processType as any) || 'SAPPD',
        annealingCount: item.annealingCount,
        drawPassCount: item.drawPassCount,
        extraAnnealingCount: item.extraAnnealingCount || 0,
        extraPassCount: item.extraPassCount || 0,
        coilEntries: item.coilEntries || [],
        quantity: item.quantity,
        rate: item.rate,
        rateOverride: false,
        annealingCharge: item.annealingCharge,
        drawCharge: item.drawCharge,
        itemTotal: item.itemTotal,
        issuedChallanNo: item.issuedChallanNo || '',
        coilNumber: item.coilNumber || '',
        coilReference: item.coilReference || '',
      })),
      challanDate: new Date(challan.challanDate).toISOString().split('T')[0],
      vehicles: challan.vehicles && challan.vehicles.length > 0
        ? challan.vehicles
        : [{ vehicleNumber: challan.vehicleNumber || '' }],
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
            {/* Top Row: Date and Party */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-start mb-2">
              <div className="w-full">
                <label className="block text-xs font-medium text-slate-700 flex justify-between mb-1">
                  Challan Date *
                </label>
                <input
                  type="date"
                  className="w-full px-2 lg:py-[10px] py-[6px] text-sm border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  value={formData.challanDate}
                  onChange={(e) => setFormData({ ...formData, challanDate: e.target.value })}
                  required
                />
              </div>

              <div className="w-full">
                <ItemSelector
                  label="Party"
                  value={formData.party}
                  onChange={(value) => setFormData({ ...formData, party: value })}
                  items={parties}
                  placeholder="Select Party"
                  required
                  helperText={
                    selectedParty
                      ? `SAPPD: ₹${selectedParty.sappdRate || 0}/kg | Annealing: ₹${selectedParty.annealingCharge} | Draw: ₹${selectedParty.drawCharge}`
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
                        SAPPD: ₹{party.sappdRate || 0}/kg | Annealing: ₹{party.annealingCharge}/unit | Draw: ₹{party.drawCharge}/pass
                      </div>
                    </div>
                  )}
                  getSearchableText={(party) => party.partyName}
                />
              </div>
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

                </div>

                {/* Multi-vehicle entries */}
                <div className="mt-2">
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold text-slate-700">
                      Vehicle Numbers <span className="text-red-500">*</span>
                    </label>
                    <button
                      type="button"
                      onClick={() =>
                        setFormData({ ...formData, vehicles: [...formData.vehicles, { vehicleNumber: '' }] })
                      }
                      className="text-[10px] text-blue-600 hover:text-blue-800 border border-blue-300 rounded px-2 py-0.5 flex items-center gap-0.5"
                    >
                      <Plus className="w-3 h-3" /> Add Vehicle
                    </button>
                  </div>
                  <div className="space-y-1">
                    {formData.vehicles.map((v, vi) => (
                      <div key={vi} className="flex items-center gap-2">
                        <span className="text-xs text-slate-400 w-4">{vi + 1}.</span>
                        <input
                          type="text"
                          className="flex-1 px-2 py-1.5 text-sm border border-slate-300 rounded focus:ring-2 focus:ring-blue-500"
                          value={v.vehicleNumber}
                          onChange={(e) => {
                            const nv = [...formData.vehicles];
                            nv[vi] = { vehicleNumber: e.target.value };
                            setFormData({ ...formData, vehicles: nv });
                          }}
                          placeholder="e.g. GJ01AB1234"
                          required={vi === 0}
                        />
                        {formData.vehicles.length > 1 && (
                          <button
                            type="button"
                            onClick={() =>
                              setFormData({ ...formData, vehicles: formData.vehicles.filter((_, i) => i !== vi) })
                            }
                            className="text-red-400 hover:text-red-600"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    ))}
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
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-semibold text-slate-700">#{index + 1}</span>
                          {/* Process Type Dropdown */}
                          <select
                            className="text-xs border border-blue-300 bg-blue-50 text-blue-800 rounded px-1.5 py-0.5 font-semibold focus:ring-1 focus:ring-blue-500"
                            value={item.processType}
                            onChange={(e) => {
                              const pt = e.target.value as ChallanItem['processType'];
                              const newItems = [...formData.items];
                              newItems[index].processType = pt;
                              if (!newItems[index].rateOverride && selectedParty) {
                                const rateMap: Record<string, number> = {
                                  SAPP: selectedParty.rate,
                                  SAPPD: selectedParty.sappdRate || selectedParty.rate,
                                  PPD: selectedParty.ppdFixedRate,
                                  Draw: selectedParty.drawCharge,
                                  Annealing: selectedParty.annealingCharge,
                                };
                                const baseRate = rateMap[pt] || 0;
                                const A = selectedParty.annealingCharge;
                                const P = selectedParty.drawCharge;
                                const EA = newItems[index].extraAnnealingCount || 0;
                                const EP = newItems[index].extraPassCount || 0;
                                newItems[index].rate = baseRate + (A * EA) + (P * EP);
                                newItems[index].itemTotal = newItems[index].quantity * newItems[index].rate;
                              }
                              setFormData({ ...formData, items: newItems });
                            }}
                          >
                            <option value="SAPP">SAPP</option>
                            <option value="SAPPD">SAPPD</option>
                            <option value="PPD">PPD</option>
                            <option value="Draw">Draw</option>
                            <option value="Annealing">Annealing</option>
                          </select>
                          <span className="text-[10px] text-slate-500">
                            Base: ₹{(() => {
                              if (!selectedParty) return 0;
                              const rm: Record<string, number> = {
                                SAPP: selectedParty.rate,
                                SAPPD: selectedParty.sappdRate || selectedParty.rate,
                                PPD: selectedParty.ppdFixedRate,
                                Draw: selectedParty.drawCharge,
                                Annealing: selectedParty.annealingCharge,
                              };
                              return rm[item.processType] || 0;
                            })()} | EA: ₹{item.annealingCharge} | EP: ₹{item.drawCharge}
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

                      <div className="flex sm:flex-row flex-col gap-1 items-start sm:items-end w-full">
                        {/* FG Selection */}
                        <div className="w-full sm:w-[15%]">
                          <ItemSelector
                            label="FG *"
                            value={item.finishSize}
                            onChange={(value) => updateItem(index, 'finishSize', value)}
                            items={fgItems}
                            placeholder="Select FG"
                            required
                            renderSelected={(fgItem) => (
                              <div className="flex items-center gap-1">
                                <span className="text-[10px] font-medium truncate" style={{ color: 'var(--foreground)' }}>
                                  {fgItem.size}
                                </span>
                              </div>
                            )}
                            renderOption={(fgItem) => (
                              <div className="flex items-center gap-1">
                                <span className="font-mono text-[9px] bg-blue-100 text-blue-800 px-1 py-0.5 rounded">
                                  {fgItem.itemCode}
                                </span>
                                <span className="text-[10px] font-medium" style={{ color: 'var(--foreground)' }}>
                                  {fgItem.size} - {fgItem.grade}
                                </span>
                              </div>
                            )}
                            getSearchableText={(fgItem) => `${fgItem.itemCode} ${fgItem.size} ${fgItem.grade}`}
                          />
                        </div>

                        {/* RM Selection */}
                        <div className="w-full sm:w-[15%]">
                          <ItemSelector
                            label="RM *"
                            value={item.originalSize}
                            onChange={(value) => updateItem(index, 'originalSize', value)}
                            items={rmItems}
                            placeholder="Select RM"
                            required
                            helperText={
                              item.originalSize
                                ? `Stock: ${getStockForItem(item.originalSize).toFixed(2)}`
                                : undefined
                            }
                            renderSelected={(rmItem) => (
                              <div className="flex items-center gap-1">
                                <span className="text-[10px] font-medium truncate" style={{ color: 'var(--foreground)' }}>
                                  {rmItem.size}
                                </span>
                              </div>
                            )}
                            renderOption={(rmItem) => (
                              <div className="flex items-center gap-1">
                                <span className="font-mono text-[9px] bg-green-100 text-green-800 px-1 py-0.5 rounded">
                                  {rmItem.itemCode}
                                </span>
                                <span className="text-[10px] font-medium" style={{ color: 'var(--foreground)' }}>
                                  {rmItem.size} - {rmItem.grade}
                                </span>
                              </div>
                            )}
                            getSearchableText={(rmItem) => `${rmItem.itemCode} ${rmItem.size} ${rmItem.grade}`}
                          />
                        </div>

                        {/* Annealing Count */}
                        <div className="w-full sm:w-[5%]">
                          <label className="block text-[10px] font-medium text-slate-700 mb-0.5 leading-none">
                            Ann *
                          </label>
                          <select
                            className="w-full px-1 py-1 text-xs border border-slate-300 rounded focus:ring-1 focus:ring-blue-500 min-h-[32px]"
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
                        <div className="w-full sm:w-[5%]">
                          <label className="block text-[10px] font-medium text-slate-700 mb-0.5 leading-none">
                            Draw *
                          </label>
                          <select
                            className="w-full px-1 py-1 text-xs border border-slate-300 rounded focus:ring-1 focus:ring-blue-500 min-h-[32px]"
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
                        <div className="w-full sm:w-[13%]">
                          <ItemSelector
                            label="Challan"
                            value={grns.find(g => String(g.partyChallanNumber).trim() === String(item.issuedChallanNo || '').trim())?._id || ''}
                            onChange={(grnId) => {
                              const selectedGRN = grns.find(g => String(g._id) === String(grnId));
                              if (selectedGRN) {
                                updateItem(index, 'issuedChallanNo', selectedGRN.partyChallanNumber);
                              } else {
                                updateItem(index, 'issuedChallanNo', '');
                              }
                            }}
                            items={
                              item.originalSize
                                ? grns.filter(grn => grn.items.some((gi: any) => String(gi.rmSize._id || gi.rmSize) === String(item.originalSize)))
                                : grns
                            }
                            placeholder="Select"
                            renderSelected={(grn) => (
                              <span className="font-mono text-[10px]" style={{ color: 'var(--foreground)' }}>
                                {grn.partyChallanNumber}
                              </span>
                            )}
                            renderOption={(grn) => (
                              <div>
                                <div className="font-mono text-[10px] font-medium" style={{ color: 'var(--foreground)' }}>
                                  {grn.partyChallanNumber}
                                </div>
                              </div>
                            )}
                            getSearchableText={(grn) => `${grn.partyChallanNumber} ${grn.sendingParty?.partyName || ''}`}
                          />
                        </div>

                        {/* Extra Annealing Count */}
                        <div className="w-full sm:w-[5%]">
                          <label className="block text-[10px] font-medium text-slate-700 mb-0.5 leading-none">
                            EA
                          </label>
                          <input
                            type="number"
                            className="w-full px-1 py-1 text-xs border border-slate-300 rounded focus:ring-1 focus:ring-blue-500 min-h-[32px]"
                            value={item.extraAnnealingCount}
                            onChange={(e) => updateItem(index, 'extraAnnealingCount', parseInt(e.target.value) || 0)}
                            min="0"
                            step="1"
                          />
                        </div>

                        {/* Extra Pass Count */}
                        <div className="w-full sm:w-[5%]">
                          <label className="block text-[10px] font-medium text-slate-700 mb-0.5 leading-none">
                            EP
                          </label>
                          <input
                            type="number"
                            className="w-full px-1 py-1 text-xs border border-slate-300 rounded focus:ring-1 focus:ring-blue-500 min-h-[32px]"
                            value={item.extraPassCount}
                            onChange={(e) => updateItem(index, 'extraPassCount', parseInt(e.target.value) || 0)}
                            min="0"
                            step="1"
                          />
                        </div>

                        {/* Quantity – auto-filled from coil sum */}
                        <div className="w-full sm:w-[9%] relative">
                          <label className="block text-[10px] font-medium text-slate-700 mb-0.5 leading-none absolute -top-1 left-0 right-0 truncate">
                            Qty (kg) * {item.coilEntries.length > 0 && <span className="text-[9px] text-green-600">🔒</span>}
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            className="w-full px-1 py-1 text-xs border border-slate-300 rounded focus:ring-1 focus:ring-blue-500 min-h-[32px] mt-3"
                            value={item.quantity}
                            onChange={(e) => {
                              if (item.coilEntries.length === 0) {
                                updateItem(index, 'quantity', parseFloat(e.target.value) || 0);
                              }
                            }}
                            readOnly={item.coilEntries.length > 0}
                            min="0.01"
                            required
                          />
                        </div>

                        {/* Rate - Auto-calculated */}
                        <div className="w-full sm:w-[13%] flex flex-col pt-0.5">
                          <div className="flex items-center gap-0.5 mb-0.5 mt-[-1px]">
                            <label className="block text-[10px] font-medium text-slate-700 leading-none">Rate (₹)</label>
                            <label className="flex items-center ml-auto">
                              <input
                                type="checkbox"
                                className="w-2.5 h-2.5"
                                checked={item.rateOverride}
                                onChange={(e) => {
                                  const newItems = [...formData.items];
                                  newItems[index] = { ...newItems[index], rateOverride: e.target.checked };
                                  if (!e.target.checked && selectedParty) {
                                    const S = selectedParty.sappdRate || selectedParty.rate;
                                    const A = selectedParty.annealingCharge;
                                    const P = selectedParty.drawCharge;
                                    const EA = newItems[index].extraAnnealingCount || 0;
                                    const EP = newItems[index].extraPassCount || 0;
                                    newItems[index].rate = S + (A * EA) + (P * EP);
                                    newItems[index].itemTotal = newItems[index].quantity * newItems[index].rate;
                                  }
                                  setFormData({ ...formData, items: newItems });
                                }}
                              />
                            </label>
                          </div>
                          <input
                            type="number"
                            step="0.01"
                            className={`w-full px-1 py-1 text-xs border rounded focus:ring-1 focus:ring-blue-500 min-h-[32px] ${
                              item.rateOverride 
                                ? 'border-amber-400 bg-amber-50' 
                                : 'border-green-300 bg-green-50'
                            }`}
                            value={item.rate || 0}
                            onChange={(e) => updateItem(index, 'rate', parseFloat(e.target.value) || 0)}
                            min="0"
                            readOnly={!item.rateOverride}
                            required
                          />
                        </div>

                        {/* Item Total */}
                        <div className="w-full sm:w-[15%]">
                          <label className="block text-[10px] font-medium text-slate-700 opacity-0 mb-0.5 leading-none">Total</label>
                          <div className="w-full px-1.5 py-1 bg-blue-50 border border-blue-200 rounded text-right min-h-[32px] flex flex-col justify-center mt-3">
                            <div className="text-[11px] font-bold text-blue-600 leading-none">₹{item.itemTotal.toFixed(2)}</div>
                          </div>
                        </div>
                      </div>

                      {/* Coil Entries – multiple coils, sum becomes Quantity */}
                      <div className="mt-2 border-t border-slate-100 pt-2">
                        <div className="flex items-center justify-between mb-1">
                          <label className="text-[10px] font-semibold text-slate-600 uppercase tracking-wide">
                            Coil Entries
                            {item.coilEntries.length > 0 && (
                              <span className="ml-1 text-green-600 font-bold">
                                (Total: {item.coilEntries.reduce((s, c) => s + (c.coilWeight || 0), 0).toFixed(2)} kg)
                              </span>
                            )}
                          </label>
                          <button
                            type="button"
                            onClick={() => {
                              const newItems = [...formData.items];
                              const newCoils = [...(newItems[index].coilEntries || []), { coilNumber: '', coilWeight: 0 }];
                              newItems[index].coilEntries = newCoils;
                              const total = newCoils.reduce((s, c) => s + (c.coilWeight || 0), 0);
                              if (total > 0) newItems[index].quantity = total;
                              newItems[index].itemTotal = newItems[index].quantity * newItems[index].rate;
                              setFormData({ ...formData, items: newItems });
                            }}
                            className="text-[10px] text-blue-600 border border-blue-300 rounded px-1.5 py-0.5 flex items-center gap-0.5"
                          >
                            <Plus className="w-3 h-3" /> Add Coil
                          </button>
                        </div>
                        {item.coilEntries.length > 0 && (
                          <div className="space-y-1">
                            {item.coilEntries.map((coil, ci) => (
                              <div key={ci} className="flex items-center gap-2">
                                <span className="text-[10px] text-slate-400 w-4">{ci + 1}.</span>
                                <input
                                  type="text"
                                  className="flex-1 px-2 py-1 text-xs border border-slate-200 rounded"
                                  value={coil.coilNumber}
                                  onChange={(e) => {
                                    const newItems = [...formData.items];
                                    const newCoils = [...newItems[index].coilEntries];
                                    newCoils[ci] = { ...newCoils[ci], coilNumber: e.target.value };
                                    newItems[index].coilEntries = newCoils;
                                    setFormData({ ...formData, items: newItems });
                                  }}
                                  placeholder="Coil No"
                                />
                                <input
                                  type="number"
                                  step="0.01"
                                  className="w-24 px-2 py-1 text-xs border border-slate-200 rounded"
                                  value={coil.coilWeight || ''}
                                  onChange={(e) => {
                                    const newItems = [...formData.items];
                                    const newCoils = [...newItems[index].coilEntries];
                                    const newWeight = parseFloat(e.target.value) || 0;
                                    newCoils[ci] = { ...newCoils[ci], coilWeight: newWeight };
                                    
                                    // Automatic addition for next coil if this one is the last and is not completely empty
                                    if (ci === newCoils.length - 1 && newWeight > 0) {
                                      newCoils.push({ coilNumber: '', coilWeight: 0 });
                                    }

                                    newItems[index].coilEntries = newCoils;
                                    const total = newCoils.reduce((s, c) => s + (c.coilWeight || 0), 0);
                                    newItems[index].quantity = total > 0 ? total : newItems[index].quantity;
                                    newItems[index].itemTotal = newItems[index].quantity * newItems[index].rate;
                                    setFormData({ ...formData, items: newItems });
                                  }}
                                  placeholder="Weight (kg)"
                                />
                                <button
                                  type="button"
                                  onClick={() => {
                                    const newItems = [...formData.items];
                                    const newCoils = newItems[index].coilEntries.filter((_, i) => i !== ci);
                                    newItems[index].coilEntries = newCoils;
                                    const total = newCoils.reduce((s, c) => s + (c.coilWeight || 0), 0);
                                    if (newCoils.length > 0) newItems[index].quantity = total;
                                    newItems[index].itemTotal = newItems[index].quantity * newItems[index].rate;
                                    setFormData({ ...formData, items: newItems });
                                  }}
                                  className="text-red-400 hover:text-red-600"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
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

            {/* Add Item Action */}
            <div className="flex flex-wrap items-end gap-2 border-t border-slate-100 pt-3 mt-2">
              <button
                type="button"
                onClick={addItem}
                className="px-4 py-1.5 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 flex items-center gap-1.5 whitespace-nowrap"
                disabled={!selectedParty}
              >
                <Plus className="w-3.5 h-3.5" />
                Add Item
              </button>
            </div>

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
