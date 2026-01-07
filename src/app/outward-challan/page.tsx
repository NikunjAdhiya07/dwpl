'use client';

import { useEffect, useState } from 'react';
import PageHeader from '@/components/PageHeader';
import Card from '@/components/Card';
import Loading from '@/components/Loading';
import ErrorMessage from '@/components/ErrorMessage';
import ItemSelector from '@/components/ItemSelector';
import { Plus, X, Send, AlertCircle, Printer, Eye, Edit, Trash2 } from 'lucide-react';

interface Party {
  _id: string;
  partyName: string;
  rate: number;
  annealingCharge: number;
  drawCharge: number;
}

interface Item {
  _id: string;
  size: string;
  grade: string;
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
  };
  finishSize: {
    _id: string;
    size: string;
    grade: string;
    hsnCode: string;
    category: string;
  };
  originalSize: {
    _id: string;
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
  totalAmount: number;
  challanDate: string;
  
  // Transport Details
  vehicleNumber?: string;
  transportName?: string;
  ownerName?: string;
  dispatchedThrough?: string;
  
  createdAt: string;
}

interface ChallanForm {
  party: string;
  finishSize: string;
  originalSize: string;
  annealingCount: number;
  drawPassCount: number;
  quantity: number;
  rate: number;
  challanDate: string;
  
  // Transport Details
  vehicleNumber?: string;
  transportName?: string;
  ownerName?: string;
  dispatchedThrough?: string;
}

export default function OutwardChallanPage() {
  const [challans, setChallans] = useState<OutwardChallan[]>([]);
  const [parties, setParties] = useState<Party[]>([]);
  const [fgItems, setFgItems] = useState<Item[]>([]);
  const [rmItems, setRmItems] = useState<Item[]>([]);
  const [boms, setBoms] = useState<BOM[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [selectedParty, setSelectedParty] = useState<Party | null>(null);
  const [selectedBOM, setSelectedBOM] = useState<BOM | null>(null);
  const [rmStock, setRmStock] = useState<number>(0);
  // Available finish sizes when RM is selected (for dropdown)
  const [availableFinishSizes, setAvailableFinishSizes] = useState<BOM[]>([]);
  const [printChallan, setPrintChallan] = useState<OutwardChallan | null>(null);
  const [showPrintModal, setShowPrintModal] = useState(false);
  // Track which field was changed last to prevent infinite loops
  const [lastChangedField, setLastChangedField] = useState<'fg' | 'rm' | null>(null);
  // Edit and Delete state
  const [editingChallan, setEditingChallan] = useState<OutwardChallan | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [challanToDelete, setChallanToDelete] = useState<OutwardChallan | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  
  const [formData, setFormData] = useState<ChallanForm>({
    party: '',
    finishSize: '',
    originalSize: '',
    annealingCount: 0,
    drawPassCount: 0,
    quantity: 0,
    rate: 0,
    challanDate: new Date().toISOString().split('T')[0],
    
    // Transport Details
    vehicleNumber: '',
    transportName: '',
    ownerName: '',
    dispatchedThrough: 'By Road',
  });

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (formData.party) {
      const party = parties.find((p) => p._id === formData.party);
      setSelectedParty(party || null);
      // Auto-fill rate from party master
      if (party) {
        setFormData((prev) => ({ ...prev, rate: party.rate }));
      }
    }
  }, [formData.party, parties]);

  // Effect for FG selection - only runs when FG was the last changed field
  useEffect(() => {
    if (formData.finishSize && lastChangedField === 'fg') {
      fetchBOMsForFG(formData.finishSize);
    } else if (!formData.finishSize) {
      setSelectedBOM(null);
      if (lastChangedField === 'fg') {
        setFormData((prev) => ({ ...prev, originalSize: '', annealingCount: 0, drawPassCount: 0 }));
      }
    }
  }, [formData.finishSize, lastChangedField]);

  // Effect for RM selection - only runs when RM was the last changed field
  useEffect(() => {
    if (formData.originalSize && lastChangedField === 'rm') {
      fetchBOMsForRM(formData.originalSize);
    } else if (!formData.originalSize) {
      if (lastChangedField === 'rm') {
        setSelectedBOM(null);
        setAvailableFinishSizes([]);
        setFormData((prev) => ({ ...prev, finishSize: '', annealingCount: 0, drawPassCount: 0 }));
      }
    }
  }, [formData.originalSize, lastChangedField]);

  useEffect(() => {
    if (formData.originalSize) {
      checkRMStock(formData.originalSize);
    }
  }, [formData.originalSize]);

  const fetchData = async () => {
    try {
      const [challansRes, partiesRes, fgRes, rmRes, bomsRes] = await Promise.all([
        fetch('/api/outward-challan'),
        fetch('/api/party-master'),
        fetch('/api/item-master?category=FG'),
        fetch('/api/item-master?category=RM'),
        fetch('/api/bom'),
      ]);

      const [challansData, partiesData, fgData, rmData, bomsData] = await Promise.all([
        challansRes.json(),
        partiesRes.json(),
        fgRes.json(),
        rmRes.json(),
        bomsRes.json(),
      ]);

      if (challansData.success) setChallans(challansData.data);
      if (partiesData.success) setParties(partiesData.data);
      if (fgData.success) setFgItems(fgData.data);
      if (rmData.success) setRmItems(rmData.data);
      if (bomsData.success) setBoms(bomsData.data);
      
      // Check if any critical data is missing
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
    } catch (err: any) {
      console.error('Error fetching data:', err);
      setError(`Failed to load data: ${err.message}. Please refresh the page.`);
    } finally {
      setLoading(false);
    }
  };

  const fetchBOMsForFG = async (fgItemId: string) => {
    try {
      const fgItem = fgItems.find((item) => item._id === fgItemId);
      if (!fgItem) {
        console.error('FG item not found:', fgItemId);
        return;
      }

      const matchingBOMs = boms.filter(
        (bom) => bom.fgSize === fgItem.size
      );

      if (matchingBOMs.length > 0) {
        setSelectedBOM(matchingBOMs[0]);
        setAvailableFinishSizes([]); // Clear when selecting FG first
        
        // Find matching RM item - MATCH BY SIZE ONLY (one RM can serve multiple FGs)
        const rmItem = rmItems.find(
          (item) => item.size === matchingBOMs[0].rmSize
        );
        
        if (rmItem) {
          setFormData((prev) => ({
            ...prev,
            originalSize: rmItem._id,
          }));
        } else {
          setError(`BOM found, but RM item with size "${matchingBOMs[0].rmSize}" not found in Item Master.`);
        }
      } else {
        setError(`No BOM found for FG: ${fgItem.size}. Please add a BOM entry first.`);
        setSelectedBOM(null);
      }
    } catch (err: any) {
      console.error('Error in fetchBOMsForFG:', err);
      setError(`Error loading BOM data: ${err.message}`);
    }
  };

  // Fetch all available finish sizes when RM is selected
  const fetchBOMsForRM = async (rmItemId: string) => {
    try {
      const rmItem = rmItems.find((item) => item._id === rmItemId);
      if (!rmItem) {
        setAvailableFinishSizes([]);
        console.error('RM item not found:', rmItemId);
        return;
      }

      // Find ALL BOMs that use this RM size (one RM can produce multiple FG sizes)
      const matchingBOMs = boms.filter(
        (bom) => bom.rmSize === rmItem.size && (bom.status === 'Active' || !bom.status)
      );

      if (matchingBOMs.length > 0) {
        // Store all available finish sizes for dropdown
        setAvailableFinishSizes(matchingBOMs);

        // If only one option, auto-select it
        if (matchingBOMs.length === 1) {
          const selectedBom = matchingBOMs[0];
          setSelectedBOM(selectedBom);
          
          // Find the corresponding FG item
          const fgItem = fgItems.find(
            (item) => item.size === selectedBom.fgSize
          );
          
          if (fgItem) {
            setFormData((prev) => ({
              ...prev,
              finishSize: fgItem._id,
            }));
          }
        } else {
          // Multiple options - clear finish size and let user choose
          setSelectedBOM(null);
          setFormData((prev) => ({
            ...prev,
            finishSize: '',
          }));
        }
      } else {
        setError(`No BOM found for RM size: ${rmItem.size}. Please add a BOM entry first.`);
        setSelectedBOM(null);
        setAvailableFinishSizes([]);
      }
    } catch (err: any) {
      console.error('Error in fetchBOMsForRM:', err);
      setError(`Error loading BOM data: ${err.message}`);
      setAvailableFinishSizes([]);
    }
  };

  // Handle finish size selection from the available options dropdown
  const handleFinishSizeFromRM = (fgItemId: string) => {
    const fgItem = fgItems.find((item) => item._id === fgItemId);
    if (!fgItem) return;

    // Find the matching BOM for this FG
    const matchingBOM = availableFinishSizes.find(
      (bom) => bom.fgSize === fgItem.size
    );

    if (matchingBOM) {
      setSelectedBOM(matchingBOM);
      setFormData((prev) => ({
        ...prev,
        finishSize: fgItemId,
      }));
    }
  };

  const checkRMStock = async (rmItemId: string) => {
    try {
      const response = await fetch(`/api/stock?category=RM`);
      const data = await response.json();
      
      if (data.success) {
        const stockItem = data.data.find((s: any) => s.size._id === rmItemId);
        setRmStock(stockItem?.quantity || 0);
      }
    } catch (err) {
      console.error('Error fetching stock:', err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validation checks with better error messages
    if (!formData.party) {
      setError('Please select a party');
      return;
    }
    
    if (!formData.finishSize) {
      setError('Please select a finish size (FG)');
      return;
    }
    
    if (!formData.originalSize) {
      setError('Please select an original size (RM)');
      return;
    }
    
    if (!selectedBOM) {
      setError('No BOM found for the selected sizes. Please add a BOM entry first.');
      return;
    }
    
    if (formData.quantity <= 0) {
      setError('Please enter a valid quantity greater than 0');
      return;
    }
    
    if (formData.rate < 0) {
      setError('Please enter a valid rate (cannot be negative)');
      return;
    }

    // Skip stock check for edit if quantity is same or less
    if (!editingChallan && formData.quantity > rmStock) {
      setError(`Insufficient RM stock. Available: ${rmStock}, Required: ${formData.quantity}`);
      return;
    }

    try {
      // Calculate charges for the submission
      const currentCharges = calculateCharges();
      
      if (!currentCharges || currentCharges.total === 0) {
        console.warn('Charge calculation resulted in zero total');
      }
      
      const challanData = {
        ...formData,
        annealingCharge: currentCharges.annealing,
        drawCharge: currentCharges.draw,
        totalAmount: currentCharges.total,
      };
      
      console.log('Submitting challan data:', challanData);

      let response;
      
      if (editingChallan) {
        // Update existing challan
        response = await fetch(`/api/outward-challan/${editingChallan._id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(challanData),
        });
      } else {
        // Create new challan
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
      finishSize: '',
      originalSize: '',
      annealingCount: 0,
      drawPassCount: 0,
      quantity: 0,
      rate: 0,
      challanDate: new Date().toISOString().split('T')[0],
      
      // Transport Details
      vehicleNumber: '',
      transportName: '',
      ownerName: '',
      dispatchedThrough: 'By Road',
    });
    setSelectedParty(null);
    setSelectedBOM(null);
    setRmStock(0);
    setAvailableFinishSizes([]);
    setLastChangedField(null);
    setShowForm(false);
    setEditingChallan(null);
  };

  // Handle Edit - populate form with challan data
  const handleEdit = (challan: OutwardChallan) => {
    setEditingChallan(challan);
    setFormData({
      party: challan.party._id,
      finishSize: challan.finishSize._id,
      originalSize: challan.originalSize._id,
      annealingCount: challan.annealingCount,
      drawPassCount: challan.drawPassCount,
      quantity: challan.quantity,
      rate: challan.rate,
      challanDate: new Date(challan.challanDate).toISOString().split('T')[0],
      
      // Transport Details
      vehicleNumber: challan.vehicleNumber || '',
      transportName: challan.transportName || '',
      ownerName: challan.ownerName || '',
      dispatchedThrough: challan.dispatchedThrough || 'By Road',
    });
    setSelectedParty(parties.find(p => p._id === challan.party._id) || null);
    setShowForm(true);
    // Scroll to form
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Handle Delete confirmation
  const handleDeleteClick = (challan: OutwardChallan) => {
    setChallanToDelete(challan);
    setShowDeleteConfirm(true);
  };

  // Confirm and delete challan
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

  const calculateCharges = () => {
    if (!selectedParty) return { annealing: 0, draw: 0, material: 0, total: 0 };

    const material = formData.quantity * formData.rate;
    const annealing = selectedParty.annealingCharge * formData.quantity * formData.annealingCount;
    const draw = selectedParty.drawCharge * formData.quantity * formData.drawPassCount;
    const total = material + annealing + draw;

    return { annealing, draw, material, total };
  };

  const charges = calculateCharges();

  if (loading) {
    return <Loading message="Loading outward challan data..." />;
  }

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Outward Challan"
        description="Create production challans with BOM-driven process control"
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
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-slate-900 dark:text-white">
              {editingChallan ? `Edit Challan - ${editingChallan.challanNumber}` : 'Create Outward Challan'}
            </h2>
            <button onClick={resetForm} className="text-slate-400 hover:text-slate-600">
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Party and Date */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <ItemSelector
                label="Party"
                value={formData.party}
                onChange={(value) => setFormData({ ...formData, party: value })}
                items={parties}
                placeholder="Select Party"
                required
                helperText={
                  selectedParty
                    ? `Annealing: ₹${selectedParty.annealingCharge}/unit | Draw: ₹${selectedParty.drawCharge}/pass`
                    : undefined
                }
                renderSelected={(party) => (
                  <span className="font-medium" style={{ color: 'var(--foreground)' }}>
                    {party.partyName}
                  </span>
                )}
                renderOption={(party) => (
                  <div>
                    <div className="font-medium" style={{ color: 'var(--foreground)' }}>
                      {party.partyName}
                    </div>
                    <div className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                      Annealing: ₹{party.annealingCharge}/unit | Draw: ₹{party.drawCharge}/pass
                    </div>
                  </div>
                )}
                getSearchableText={(party) => party.partyName}
              />

              <div>
                <label className="label">Challan Date *</label>
                <input
                  type="date"
                  className="input"
                  value={formData.challanDate}
                  onChange={(e) => setFormData({ ...formData, challanDate: e.target.value })}
                  required
                />
              </div>
            </div>

            {/* FG and RM Selection */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-4">
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Show different FG selector based on flow */}
                {availableFinishSizes.length > 1 ? (
                  // When RM selected first with multiple FG options - show filtered dropdown
                  <div>
                    <label className="label">Finish Size (FG) *</label>
                    <select
                      className="input"
                      value={formData.finishSize}
                      onChange={(e) => handleFinishSizeFromRM(e.target.value)}
                      required
                    >
                      <option value="">-- Select Finish Size --</option>
                      {availableFinishSizes.map((bom) => {
                        const fgItem = fgItems.find(
                          (item) => item.size === bom.fgSize
                        );
                        return fgItem ? (
                          <option key={fgItem._id} value={fgItem._id}>
                            {fgItem.size}
                          </option>
                        ) : (
                          <option key={bom._id} value="" disabled>
                            {bom.fgSize} (Not in Item Master)
                          </option>
                        );
                      })}
                    </select>

                  </div>
                ) : (
                  // Normal flow - show full FG selector
                  <ItemSelector
                    label="Finish Size (FG)"
                    value={formData.finishSize}
                    onChange={(value) => {
                      setLastChangedField('fg');
                      setAvailableFinishSizes([]);
                      setFormData({ ...formData, finishSize: value });
                    }}
                    items={fgItems}
                    placeholder="Select FG Size"
                    required

                    renderSelected={(item) => (
                      <div className="flex items-center gap-2">
                        <span className="font-medium" style={{ color: 'var(--foreground)' }}>
                          {item.size}
                        </span>
                        <span className="text-sm" style={{ color: 'var(--text-muted)' }}>
                          {item.grade}
                        </span>
                      </div>
                    )}
                    renderOption={(item) => (
                      <div>
                        <div className="font-medium" style={{ color: 'var(--foreground)' }}>
                          {item.size} - {item.grade}
                        </div>
                      </div>
                    )}
                    getSearchableText={(item) => 
                      `${item.size} ${item.grade}`
                    }
                  />
                )}

                {/* RM Selection - now editable */}
                <ItemSelector
                  label="Original Size (RM)"
                  value={formData.originalSize}
                  onChange={(value) => {
                    setLastChangedField('rm');
                    setFormData({ ...formData, originalSize: value });
                  }}
                  items={rmItems}
                  placeholder="Select RM Size"
                  required

                  renderSelected={(item) => (
                    <div className="flex items-center gap-2">
                      <span className="font-medium" style={{ color: 'var(--foreground)' }}>
                        {item.size}
                      </span>
                      <span className="text-sm" style={{ color: 'var(--text-muted)' }}>
                        {item.grade}
                      </span>
                    </div>
                  )}
                  renderOption={(item) => (
                    <div>
                      <div className="font-medium" style={{ color: 'var(--foreground)' }}>
                        {item.size} - {item.grade}
                      </div>
                    </div>
                  )}
                  getSearchableText={(item) => 
                    `${item.size} ${item.grade}`
                  }
                />
              </div>


            </div>

            {/* Process Counts */}
            {selectedBOM && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 space-y-4">
                <h3 className="font-semibold text-green-900">Process Parameters</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="label">
                      Annealing Count ({selectedBOM.annealingMin}-{selectedBOM.annealingMax}) *
                    </label>
                    <select
                      className="input"
                      value={formData.annealingCount}
                      onChange={(e) =>
                        setFormData({ ...formData, annealingCount: parseInt(e.target.value) })
                      }
                      required
                    >
                      {Array.from(
                        { length: selectedBOM.annealingMax - selectedBOM.annealingMin + 1 },
                        (_, i) => selectedBOM.annealingMin + i
                      ).map((count) => (
                        <option key={count} value={count}>
                          {count}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="label">
                      Draw Pass Count ({selectedBOM.drawPassMin}-{selectedBOM.drawPassMax}) *
                    </label>
                    <select
                      className="input"
                      value={formData.drawPassCount}
                      onChange={(e) =>
                        setFormData({ ...formData, drawPassCount: parseInt(e.target.value) })
                      }
                      required
                    >
                      {Array.from(
                        { length: selectedBOM.drawPassMax - selectedBOM.drawPassMin + 1 },
                        (_, i) => selectedBOM.drawPassMin + i
                      ).map((count) => (
                        <option key={count} value={count}>
                          {count}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* Quantity and Rate */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="label">Quantity *</label>
                <input
                  type="number"
                  step="0.01"
                  className="input"
                  value={formData.quantity}
                  onChange={(e) =>
                    setFormData({ ...formData, quantity: parseFloat(e.target.value) || 0 })
                  }
                  min="0.01"
                  required
                />
              </div>

              <div>
                <label className="label">Rate (per unit) *</label>
                <input
                  type="number"
                  step="0.01"
                  className="input"
                  value={formData.rate}
                  onChange={(e) =>
                    setFormData({ ...formData, rate: parseFloat(e.target.value) || 0 })
                  }
                  min="0"
                  required
                />
              </div>
            </div>

            {/* Transport Details */}
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 space-y-4">
              <h3 className="font-semibold text-purple-900">Transport Details (Optional)</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="label">Vehicle Number</label>
                  <input
                    type="text"
                    className="input"
                    value={formData.vehicleNumber || ''}
                    onChange={(e) =>
                      setFormData({ ...formData, vehicleNumber: e.target.value })
                    }
                    placeholder="e.g., GJ01AB1234"
                  />
                </div>

                <div>
                  <label className="label">Transport Name</label>
                  <input
                    type="text"
                    className="input"
                    value={formData.transportName || ''}
                    onChange={(e) =>
                      setFormData({ ...formData, transportName: e.target.value })
                    }
                    placeholder="e.g., ABC Transport"
                  />
                </div>

                <div>
                  <label className="label">Owner Name</label>
                  <input
                    type="text"
                    className="input"
                    value={formData.ownerName || ''}
                    onChange={(e) =>
                      setFormData({ ...formData, ownerName: e.target.value })
                    }
                    placeholder="e.g., John Doe"
                  />
                </div>

                <div>
                  <label className="label">Dispatched Through</label>
                  <input
                    type="text"
                    className="input"
                    value={formData.dispatchedThrough || 'By Road'}
                    onChange={(e) =>
                      setFormData({ ...formData, dispatchedThrough: e.target.value })
                    }
                    placeholder="e.g., By Road, By Rail"
                  />
                </div>
              </div>
            </div>

            {/* Charge Breakdown - Professional ERP Style */}
            {selectedParty && formData.quantity > 0 && (
              <div className="border border-slate-200 rounded-lg overflow-hidden shadow-sm">
                {/* Header */}
                <div className="bg-gradient-to-r from-slate-50 to-slate-100 px-4 py-3 border-b border-slate-200">
                  <h3 className="font-semibold text-slate-800 text-sm uppercase tracking-wide flex items-center gap-2">
                    <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                    Charge Breakdown
                  </h3>
                </div>
                
                {/* Body */}
                <div className="bg-white p-4">
                  <div className="space-y-3">
                    {/* Line Items */}
                    <div className="flex justify-between items-center py-2 border-b border-dashed border-slate-200">
                      <span className="text-slate-600 text-sm">Material Cost</span>
                      <span className="font-medium text-slate-800">₹{charges.material.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                    </div>
                    
                    <div className="flex justify-between items-center py-2 border-b border-dashed border-slate-200">
                      <span className="text-slate-600 text-sm">
                        Annealing Charge 
                        <span className="text-xs text-slate-400 ml-1">({formData.annealingCount} × ₹{selectedParty.annealingCharge})</span>
                      </span>
                      <span className="font-medium text-slate-800">₹{charges.annealing.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                    </div>
                    
                    <div className="flex justify-between items-center py-2 border-b border-dashed border-slate-200">
                      <span className="text-slate-600 text-sm">
                        Draw Charge
                        <span className="text-xs text-slate-400 ml-1">({formData.drawPassCount} × ₹{selectedParty.drawCharge})</span>
                      </span>
                      <span className="font-medium text-slate-800">₹{charges.draw.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                    </div>
                  </div>
                  
                  {/* Total */}
                  <div className="mt-4 pt-4 border-t-2 border-slate-200">
                    <div className="flex justify-between items-center">
                      <span className="text-base font-bold text-slate-800">Total Amount</span>
                      <span className="text-xl font-bold text-blue-600">
                        ₹{charges.total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="flex gap-3">
              <button type="submit" className="btn btn-primary" disabled={!selectedBOM}>
                {editingChallan ? 'Update Challan' : 'Create Challan'}
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
                <th>Challan No.</th>
                <th>Date</th>
                <th>Party</th>
                <th>FG → RM</th>
                <th>Process</th>
                <th>Qty</th>
                <th>Total Amount</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {challans.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-8 text-slate-500">
                    <Send className="w-12 h-12 mx-auto mb-2 text-slate-400" />
                    <p>No challans found. Click "Create Challan" to add one.</p>
                  </td>
                </tr>
              ) : (
                challans.map((challan) => (
                  <tr key={challan._id}>
                    <td className="font-mono font-semibold">{challan.challanNumber}</td>
                    <td>
                      {new Date(challan.challanDate).toLocaleDateString('en-IN', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </td>
                    <td className="font-medium">{challan.party.partyName}</td>
                    <td>
                      <div className="text-sm">
                        <span className="font-semibold">{challan.finishSize.size}</span>
                        <span className="text-slate-400 mx-1">←</span>
                        <span className="text-slate-600">{challan.originalSize.size}</span>
                      </div>
                    </td>
                    <td>
                      <div className="text-xs space-y-1">
                        <div>A: {challan.annealingCount}</div>
                        <div>D: {challan.drawPassCount}</div>
                      </div>
                    </td>
                    <td className="font-semibold">{challan.quantity.toFixed(2)}</td>
                    <td className="font-bold text-green-600">
                      ₹{challan.totalAmount.toFixed(2)}
                    </td>
                    <td>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleEdit(challan)}
                          className="p-1.5 rounded-md text-blue-600 hover:bg-blue-50 transition-colors"
                          title="Edit Challan"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteClick(challan)}
                          className="p-1.5 rounded-md text-red-600 hover:bg-red-50 transition-colors"
                          title="Delete Challan"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            setPrintChallan(challan);
                            setShowPrintModal(true);
                          }}
                          className="p-1.5 rounded-md text-slate-600 hover:bg-slate-100 transition-colors"
                          title="Print Challan"
                        >
                          <Printer className="w-4 h-4" />
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

      {/* Print Modal */}
      {showPrintModal && printChallan && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-5xl w-full max-h-[90vh] overflow-y-auto print-modal-container">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b no-print">
              <h2 className="text-xl font-semibold text-slate-900">Outward Challan</h2>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="btn btn-primary"
                >
                  <Printer className="w-4 h-4" />
                  Print
                </button>
                <button
                  onClick={() => {
                    setShowPrintModal(false);
                    setPrintChallan(null);
                  }}
                  className="text-slate-400 hover:text-slate-600"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            {/* Print Content - Original, Duplicate, Triplicate */}
            {['Original', 'Duplicate', 'Triplicate'].map((copyType, copyIndex) => (
              <div key={copyType} className="print-page page-break">
                <div className="bg-white text-black font-sans w-full" style={{ fontSize: '9px' }}>
                  {/* Top Header Labels */}
                  <div className="flex justify-between items-end mb-1">
                    <div className="flex-1 text-center font-bold text-sm translate-x-10">
                      Tax Invoice
                    </div>
                    <div className="text-[10px] font-bold italic">
                      ({copyIndex === 0 ? 'Original For Recipient' : copyType})
                    </div>
                  </div>

                  {/* Main Invoice Border Box */}
                  <div className="border border-black">
                    {/* IRN Section */}
                    <div className="p-1 px-2 border-b border-black text-[8px]">
                      IRN :
                    </div>

                    {/* Company and Meta Info Row */}
                    <div className="flex border-b border-black">
                      {/* Left: Supplier Details */}
                      <div className="w-[55%] p-2 border-r border-black flex flex-col min-h-[120px]">
                        <p className="font-bold text-[11px] mb-1 leading-none uppercase">DWPL INDUSTRIES</p>
                        <p className="leading-tight">Plot No. 1005/B1, Phase-III, G.I.D.C.,</p>
                        <p className="leading-tight">Vatva, Ahmedabad, Gujarat, India - 382445</p>
                        <p className="mt-2"><strong>GSTIN :</strong> 24AADCP1234P1ZW</p>
                        <p><strong>PAN No :</strong> AADCP1234P</p>
                        <div className="flex gap-4">
                          <span>State : Gujarat</span>
                          <span>State Code : 24</span>
                        </div>
                      </div>

                      {/* Right: Invoice Meta */}
                      <div className="w-[45%] p-2 flex flex-col space-y-0.5">
                        <div className="grid grid-cols-[100px_1fr] leading-none">
                          <span className="font-bold">INVOICE No :</span>
                          <span className="font-bold">{printChallan.challanNumber}</span>
                          
                          <span className="font-bold">Date :</span>
                          <span className="font-bold">{new Date(printChallan.challanDate).toLocaleDateString('en-IN')}</span>
                          
                          <span>P.O. No. :</span>
                          <span>-</span>
                          
                          <span>P.O. Date :</span>
                          <span>-</span>
                          
                          <span>Payment Term :</span>
                          <span>0 Days</span>
                          
                          <span>Supplier Code :</span>
                          <span>0</span>
                          
                          <span>Vehicle No/LR No:</span>
                          <span className="break-all">{printChallan.vehicleNumber || '-'}</span>
                          
                          <span>Owner Name:</span>
                          <span>{printChallan.ownerName || '-'}</span>
                          
                          <span>E-Way Bill No :</span>
                          <span>-</span>
                          
                          <span>Dispatched Through:</span>
                          <span>
                            {printChallan.dispatchedThrough || 'By Road'}
                            {(printChallan.transportName || printChallan.ownerName) && 
                              ` / ${printChallan.transportName || printChallan.ownerName}`
                            }
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Parties Section */}
                    <div className="flex border-b border-black">
                      <div className="w-1/2 p-2 border-r border-black min-h-[90px] flex flex-col">
                        <p className="font-bold underline mb-1 text-[8px]">Details of Receiver (Billed To)</p>
                        <p className="font-bold text-[10px] uppercase">{printChallan.party.partyName}</p>
                        <p className="leading-tight">{printChallan.party.address}</p>
                        <p className="mt-auto font-bold pt-1">GSTIN : {printChallan.party.gstNumber}</p>
                        <p>State Code: 24 Gujarat</p>
                      </div>
                      <div className="w-1/2 p-2 min-h-[90px] flex flex-col">
                        <p className="font-bold underline mb-1 text-[8px]">Details of Consignee (Shipped To)</p>
                        <p className="font-bold text-[10px] uppercase">{printChallan.party.partyName}</p>
                        <p className="leading-tight">{printChallan.party.address}</p>
                        <p className="mt-auto font-bold pt-1">GSTIN : {printChallan.party.gstNumber}</p>
                        <p>State Code: 24 Gujarat</p>
                      </div>
                    </div>

                    {/* Table Section */}
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className="border-b border-black text-center font-bold">
                          <td className="border-r border-black w-[35px] py-1">Sr. No.</td>
                          <td className="border-r border-black px-1">Description</td>
                          <td className="border-r border-black w-[60px]">HSN/SAC</td>
                          <td className="border-r border-black w-[80px]">No. & Type Of Packing</td>
                          <td className="border-r border-black w-[80px]">Total Qty. Nos./ Kgs</td>
                          <td className="border-r border-black w-[70px]">Rate Per Unit</td>
                          <td className="w-[85px]">Amount Rs.</td>
                        </tr>
                      </thead>
                      <tbody>
                        <tr className="border-b border-black h-[280px] align-top">
                          <td className="border-r border-black py-2 text-center font-bold">1</td>
                          <td className="border-r border-black p-2">
                            <p className="font-bold text-[10px] mb-1">Wire - {printChallan.finishSize.size} ({printChallan.finishSize.grade})</p>
                            <p className="text-[8px] italic">From RM: {printChallan.originalSize.size} ({printChallan.originalSize.grade})</p>
                            <p className="text-[8px] italic">Anneal: {printChallan.annealingCount} | Draw: {printChallan.drawPassCount}</p>
                          </td>
                          <td className="border-r border-black py-2 text-center">{printChallan.finishSize.hsnCode}</td>
                          <td className="border-r border-black py-2 text-center">1000<br/>KGS</td>
                          <td className="border-r border-black py-2 text-center font-bold">
                            {printChallan.quantity.toFixed(2)}<br/>KGS
                          </td>
                          <td className="border-r border-black py-2 text-center">
                            {printChallan.rate.toFixed(2)}
                          </td>
                          <td className="py-2 px-1 text-right font-bold">{(printChallan.quantity * printChallan.rate).toFixed(2)}</td>
                        </tr>
                      </tbody>
                    </table>

                    {/* Summary Row */}
                    <div className="flex border-b border-black">
                      <div className="w-[60%] border-r border-black">
                        <div className="p-2 border-b border-black min-h-[35px]">
                          <p className="italic">Rs. ZERO Rupees And Zero Paise Only</p>
                        </div>
                        <div className="p-2 font-bold flex items-center h-full">
                          Net Total Rs {(printChallan.totalAmount).toFixed(2)}
                        </div>
                      </div>
                      <div className="w-[40%] text-[8.5px]">
                        <div className="grid grid-cols-[1fr_80px] divide-x divide-black border-collapse">
                          <span className="p-1 px-2 border-b border-black">Transport Charges</span>
                          <span className="p-1 px-2 border-b border-black text-right">0.00</span>
                          
                          <span className="p-1 px-2 border-b border-black font-bold">Ass Value :</span>
                          <span className="p-1 px-2 border-b border-black text-right font-bold">{(printChallan.quantity * printChallan.rate).toFixed(2)}</span>
                          
                          <span className="p-1 px-2 border-b border-black">CGST 9.00%:</span>
                          <span className="p-1 px-2 border-b border-black text-right">0.00</span>
                          
                          <span className="p-1 px-2 border-b border-black">SGST 9.00%:</span>
                          <span className="p-1 px-2 border-b border-black text-right">0.00</span>
                          
                          <span className="p-1 px-2 border-b border-black">IGST 0.00%:</span>
                          <span className="p-1 px-2 border-b border-black text-right">0.00</span>
                          
                          <span className="p-1 px-2 border-b border-black">TCS 0%:</span>
                          <span className="p-1 px-2 border-b border-black text-right">0.00</span>
                          
                          <span className="p-1 px-2 font-bold bg-slate-50">Net Payable :</span>
                          <span className="p-1 px-2 text-right font-bold bg-slate-50">{(printChallan.totalAmount).toFixed(2)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Declaration */}
                    <div className="p-2 border-b border-black text-[7.5px] leading-tight text-justify">
                      <p>I / we certify that our registration certificate under the GST Act, 2017 is in force on the date on which the supply of goods specified in this Tax Invoice is made by me/us & the transaction of supply covered by this Tax Invoice had been effected by me/us & it shall be accounted for in the turnover of supplies while filing of return & the due tax if any payable on the supplies has been paid or shall be paid. Further certified that the particulars given above are true and correct & the amount indicated represents the prices actually charged and that there is no flow if additional consideration directly or indirectly from the buyer.</p>
                      <p className="mt-1 font-bold">Date & time of Issue : {new Date().toLocaleString('en-IN')}</p>
                    </div>

                    {/* Signature Block */}
                    <div className="flex min-h-[85px] divide-x divide-black">
                      <div className="w-[35%] p-2">
                        <p className="text-[7.5px] font-bold">(Customer's Seal and Signature)</p>
                      </div>
                      <div className="w-[65%] flex flex-col justify-between">
                        <div className="text-right p-2 font-bold text-[10px]">
                          For DWPL INDUSTRIES
                        </div>
                        <div className="flex border-t border-black text-[8px] font-bold divide-x divide-black h-[25px] items-center">
                          <span className="px-2 flex-1">Prepared By : Admin</span>
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

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && challanToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                <Trash2 className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-slate-900">Delete Challan</h3>
                <p className="text-sm text-slate-500">This action cannot be undone</p>
              </div>
            </div>
            
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
              <p className="text-sm text-red-800 mb-2">
                <strong>Warning:</strong> Deleting this challan will:
              </p>
              <ul className="text-sm text-red-700 list-disc list-inside space-y-1">
                <li>Restore {challanToDelete.quantity.toFixed(2)} units to RM stock</li>
                <li>Remove {challanToDelete.quantity.toFixed(2)} units from FG stock</li>
                <li>Permanently delete the challan record</li>
              </ul>
            </div>
            
            <div className="bg-slate-50 rounded-lg p-3 mb-4">
              <p className="text-sm">
                <strong>Challan:</strong> {challanToDelete.challanNumber}
              </p>
              <p className="text-sm">
                <strong>Party:</strong> {challanToDelete.party.partyName}
              </p>
              <p className="text-sm">
                <strong>Amount:</strong> ₹{challanToDelete.totalAmount.toFixed(2)}
              </p>
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={confirmDelete}
                disabled={isDeleting}
                className="flex-1 btn bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
              >
                {isDeleting ? 'Deleting...' : 'Delete Challan'}
              </button>
              <button
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setChallanToDelete(null);
                }}
                disabled={isDeleting}
                className="flex-1 btn btn-outline"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
