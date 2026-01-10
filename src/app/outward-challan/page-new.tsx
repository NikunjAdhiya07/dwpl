'use client';

import { useEffect, useState } from 'react';
import PageHeader from '@/components/PageHeader';
import Card from '@/components/Card';
import Loading from '@/components/Loading';
import ErrorMessage from '@/components/ErrorMessage';
import ItemSelector from '@/components/ItemSelector';
import { Plus, X, Trash2, Send } from 'lucide-react';

interface Party {
  _id: string;
  partyName: string;
  rate: number;
  annealingCharge: number;
  drawCharge: number;
}

interface Item {
  _id: string;
  itemCode: string;
  size: string;
  grade: string;
  category: 'RM' | 'FG';
}

interface Transport {
  _id: string;
  vehicleNumber: string;
  ownerName: string;
  isActive: boolean;
}

interface BOM {
  _id: string;
  fgSize: string;
  rmSize: string;
  status?: 'Active' | 'Inactive';
}

interface ChallanItem {
  finishSize: string;
  originalSize: string;
  annealingCount: number;
  drawPassCount: number;
  quantity: number;
  rate: number;
}

interface ChallanForm {
  party: string;
  items: ChallanItem[];
  challanDate: string;
  transport?: string;
  vehicleNumber?: string;
  transportName?: string;
  ownerName?: string;
  dispatchedThrough?: string;
}

export default function OutwardChallanPage() {
  const [parties, setParties] = useState<Party[]>([]);
  const [fgItems, setFgItems] = useState<Item[]>([]);
  const [rmItems, setRmItems] = useState<Item[]>([]);
  const [transports, setTransports] = useState<Transport[]>([]);
  const [boms, setBoms] = useState<BOM[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [selectedParty, setSelectedParty] = useState<Party | null>(null);

  const [formData, setFormData] = useState<ChallanForm>({
    party: '',
    items: [],
    challanDate: new Date().toISOString().split('T')[0],
    dispatchedThrough: 'By Road',
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

  // Auto-fill transport details when transport is selected
  useEffect(() => {
    if (formData.transport) {
      const transport = transports.find((t) => t._id === formData.transport);
      if (transport) {
        setFormData((prev) => ({
          ...prev,
          vehicleNumber: transport.vehicleNumber,
          ownerName: transport.ownerName,
        }));
      }
    }
  }, [formData.transport, transports]);

  const fetchData = async () => {
    try {
      const [partiesRes, fgRes, rmRes, transportsRes, bomsRes] = await Promise.all([
        fetch('/api/party-master'),
        fetch('/api/item-master?category=FG'),
        fetch('/api/item-master?category=RM'),
        fetch('/api/transport-master'),
        fetch('/api/bom'),
      ]);

      const [partiesData, fgData, rmData, transportsData, bomsData] = await Promise.all([
        partiesRes.json(),
        fgRes.json(),
        rmRes.json(),
        transportsRes.json(),
        bomsRes.json(),
      ]);

      if (partiesData.success) setParties(partiesData.data);
      if (fgData.success) setFgItems(fgData.data);
      if (rmData.success) setRmItems(rmData.data);
      if (transportsData.success) setTransports(transportsData.data.filter((t: Transport) => t.isActive));
      if (bomsData.success) setBoms(bomsData.data);
    } catch (err: any) {
      setError(`Failed to load data: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const addItem = () => {
    setFormData((prev) => ({
      ...prev,
      items: [
        ...prev.items,
        {
          finishSize: '',
          originalSize: '',
          annealingCount: 0,
          drawPassCount: 0,
          quantity: 0,
          rate: selectedParty?.rate || 0,
        },
      ],
    }));
  };

  const removeItem = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index),
    }));
  };

  const updateItem = (index: number, field: keyof ChallanItem, value: any) => {
    setFormData((prev) => ({
      ...prev,
      items: prev.items.map((item, i) =>
        i === index ? { ...item, [field]: value } : item
      ),
    }));
  };

  // Auto-fill RM when FG is selected
  const handleFGChange = (index: number, fgId: string) => {
    const fgItem = fgItems.find((item) => item._id === fgId);
    if (!fgItem) return;

    const matchingBOM = boms.find((bom) => bom.fgSize === fgItem.size);
    if (matchingBOM) {
      const rmItem = rmItems.find((item) => item.size === matchingBOM.rmSize);
      if (rmItem) {
        setFormData((prev) => ({
          ...prev,
          items: prev.items.map((item, i) =>
            i === index
              ? { ...item, finishSize: fgId, originalSize: rmItem._id }
              : item
          ),
        }));
        return;
      }
    }

    updateItem(index, 'finishSize', fgId);
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

    // Validate all items
    for (let i = 0; i < formData.items.length; i++) {
      const item = formData.items[i];
      if (!item.finishSize || !item.originalSize) {
        setError(`Item ${i + 1}: Please select both FG and RM`);
        return;
      }
      if (item.quantity <= 0) {
        setError(`Item ${i + 1}: Quantity must be greater than 0`);
        return;
      }
    }

    try {
      // Add charges to each item
      const itemsWithCharges = formData.items.map((item) => ({
        ...item,
        annealingCharge: selectedParty?.annealingCharge || 0,
        drawCharge: selectedParty?.drawCharge || 0,
      }));

      const response = await fetch('/api/outward-challan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          items: itemsWithCharges,
        }),
      });

      const data = await response.json();

      if (data.success) {
        alert('Outward Challan created successfully!');
        resetForm();
      } else {
        setError(data.error || 'Failed to create challan');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    }
  };

  const resetForm = () => {
    setFormData({
      party: '',
      items: [],
      challanDate: new Date().toISOString().split('T')[0],
      transport: '',
      vehicleNumber: '',
      transportName: '',
      ownerName: '',
      dispatchedThrough: 'By Road',
    });
    setSelectedParty(null);
    setShowForm(false);
  };

  const calculateItemTotal = (item: ChallanItem) => {
    if (!selectedParty) return 0;
    const material = item.quantity * item.rate;
    const annealing = selectedParty.annealingCharge * item.quantity * item.annealingCount;
    const draw = selectedParty.drawCharge * item.quantity * item.drawPassCount;
    return material + annealing + draw;
  };

  const calculateGrandTotal = () => {
    return formData.items.reduce((sum, item) => sum + calculateItemTotal(item), 0);
  };

  if (loading) {
    return <Loading message="Loading outward challan data..." />;
  }

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Outward Challan (Multi-Item)"
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
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-slate-900 dark:text-white">
              Create Outward Challan
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
                renderSelected={(party) => (
                  <span className="font-medium">{party.partyName}</span>
                )}
                renderOption={(party) => (
                  <div>
                    <div className="font-medium">{party.partyName}</div>
                    <div className="text-xs text-slate-500">
                      Rate: ₹{party.rate} | Annealing: ₹{party.annealingCharge} | Draw: ₹{party.drawCharge}
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

            {/* Transport Details */}
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 space-y-4">
              <h3 className="font-semibold text-purple-900">Transport Details</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="label">Transporter</label>
                  <select
                    className="input"
                    value={formData.transport || ''}
                    onChange={(e) => setFormData({ ...formData, transport: e.target.value })}
                  >
                    <option value="">Select Transporter</option>
                    {transports.map((transport) => (
                      <option key={transport._id} value={transport._id}>
                        {transport.vehicleNumber} - {transport.ownerName}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-slate-500 mt-1">
                    Select from Transport Master or enter manually below
                  </p>
                </div>

                <div>
                  <label className="label">Dispatched Through</label>
                  <input
                    type="text"
                    className="input"
                    value={formData.dispatchedThrough || ''}
                    onChange={(e) => setFormData({ ...formData, dispatchedThrough: e.target.value })}
                    placeholder="e.g., By Road"
                  />
                </div>

                <div>
                  <label className="label">Vehicle Number</label>
                  <input
                    type="text"
                    className="input"
                    value={formData.vehicleNumber || ''}
                    onChange={(e) => setFormData({ ...formData, vehicleNumber: e.target.value })}
                    placeholder="e.g., GJ01AB1234"
                  />
                </div>

                <div>
                  <label className="label">Owner Name</label>
                  <input
                    type="text"
                    className="input"
                    value={formData.ownerName || ''}
                    onChange={(e) => setFormData({ ...formData, ownerName: e.target.value })}
                    placeholder="Transport owner name"
                  />
                </div>
              </div>
            </div>

            {/* Items Section */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-slate-900">Items</h3>
                <button
                  type="button"
                  onClick={addItem}
                  className="btn btn-sm btn-outline"
                  disabled={!selectedParty}
                >
                  <Plus className="w-4 h-4" />
                  Add Item
                </button>
              </div>

              {formData.items.length === 0 ? (
                <div className="text-center py-8 text-slate-500 bg-slate-50 rounded-lg border-2 border-dashed">
                  {selectedParty
                    ? 'Click "Add Item" to start adding items to this challan'
                    : 'Please select a party first'}
                </div>
              ) : (
                <div className="space-y-4">
                  {formData.items.map((item, index) => (
                    <Card key={index} className="bg-blue-50 border-blue-200">
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="font-medium text-blue-900">Item {index + 1}</h4>
                        <button
                          type="button"
                          onClick={() => removeItem(index)}
                          className="text-red-600 hover:text-red-800"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* FG Selection */}
                        <ItemSelector
                          label="Finish Size (FG)"
                          value={item.finishSize}
                          onChange={(value) => handleFGChange(index, value)}
                          items={fgItems}
                          placeholder="Select FG"
                          required
                          renderSelected={(fgItem) => (
                            <span className="font-medium">
                              {fgItem.itemCode} - {fgItem.size} ({fgItem.grade})
                            </span>
                          )}
                          renderOption={(fgItem) => (
                            <div>
                              <div className="font-medium">
                                {fgItem.itemCode} - {fgItem.size}
                              </div>
                              <div className="text-xs text-slate-500">{fgItem.grade}</div>
                            </div>
                          )}
                          getSearchableText={(fgItem) =>
                            `${fgItem.itemCode} ${fgItem.size} ${fgItem.grade}`
                          }
                        />

                        {/* RM Selection */}
                        <ItemSelector
                          label="Original Size (RM)"
                          value={item.originalSize}
                          onChange={(value) => updateItem(index, 'originalSize', value)}
                          items={rmItems}
                          placeholder="Select RM"
                          required
                          renderSelected={(rmItem) => (
                            <span className="font-medium">
                              {rmItem.itemCode} - {rmItem.size} ({rmItem.grade})
                            </span>
                          )}
                          renderOption={(rmItem) => (
                            <div>
                              <div className="font-medium">
                                {rmItem.itemCode} - {rmItem.size}
                              </div>
                              <div className="text-xs text-slate-500">{rmItem.grade}</div>
                            </div>
                          )}
                          getSearchableText={(rmItem) =>
                            `${rmItem.itemCode} ${rmItem.size} ${rmItem.grade}`
                          }
                        />

                        {/* Quantity and Rate */}
                        <div>
                          <label className="label">Quantity *</label>
                          <input
                            type="number"
                            step="0.01"
                            className="input"
                            value={item.quantity}
                            onChange={(e) =>
                              updateItem(index, 'quantity', parseFloat(e.target.value) || 0)
                            }
                            required
                            min="0.01"
                          />
                        </div>

                        <div>
                          <label className="label">Rate *</label>
                          <input
                            type="number"
                            step="0.01"
                            className="input"
                            value={item.rate}
                            onChange={(e) =>
                              updateItem(index, 'rate', parseFloat(e.target.value) || 0)
                            }
                            required
                            min="0"
                          />
                        </div>

                        {/* Process Counts */}
                        <div>
                          <label className="label">Annealing Count (0-7) *</label>
                          <input
                            type="number"
                            className="input"
                            value={item.annealingCount}
                            onChange={(e) =>
                              updateItem(index, 'annealingCount', parseInt(e.target.value) || 0)
                            }
                            required
                            min="0"
                            max="7"
                          />
                        </div>

                        <div>
                          <label className="label">Draw Pass Count (0-10) *</label>
                          <input
                            type="number"
                            className="input"
                            value={item.drawPassCount}
                            onChange={(e) =>
                              updateItem(index, 'drawPassCount', parseInt(e.target.value) || 0)
                            }
                            required
                            min="0"
                            max="10"
                          />
                        </div>
                      </div>

                      {/* Item Total */}
                      <div className="mt-4 pt-4 border-t border-blue-300">
                        <div className="flex justify-between items-center">
                          <span className="font-medium text-blue-900">Item Total:</span>
                          <span className="text-lg font-bold text-blue-900">
                            ₹{calculateItemTotal(item).toFixed(2)}
                          </span>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>

            {/* Grand Total */}
            {formData.items.length > 0 && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex justify-between items-center">
                  <span className="text-lg font-semibold text-green-900">Grand Total:</span>
                  <span className="text-2xl font-bold text-green-900">
                    ₹{calculateGrandTotal().toFixed(2)}
                  </span>
                </div>
              </div>
            )}

            {/* Submit Buttons */}
            <div className="flex gap-3">
              <button
                type="submit"
                className="btn btn-primary"
                disabled={formData.items.length === 0}
              >
                <Send className="w-5 h-5" />
                Create Challan
              </button>
              <button type="button" onClick={resetForm} className="btn btn-outline">
                Cancel
              </button>
            </div>
          </form>
        </Card>
      )}

      {/* Challans List - Placeholder */}
      <Card>
        <div className="text-center py-8 text-slate-500">
          <p className="text-lg font-medium mb-2">Challan List Coming Soon</p>
          <p className="text-sm">
            The challan list view will be updated to display multi-item challans
          </p>
        </div>
      </Card>
    </div>
  );
}
