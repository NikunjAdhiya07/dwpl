'use client';

import { useEffect, useState } from 'react';
import PageHeader from '@/components/PageHeader';
import Card from '@/components/Card';
import Loading from '@/components/Loading';
import ErrorMessage from '@/components/ErrorMessage';
import ItemSelector from '@/components/ItemSelector';
import { Plus, X, FileText, Download, Trash2 } from 'lucide-react';
import { exportToPDF, generatePDFFilename } from '@/lib/pdfExport';

interface Party {
  _id: string;
  partyName: string;
  address?: string;
  gstNumber?: string;
}

interface Item {
  _id: string;
  size: string;
  grade: string;
  category: string;
}

interface GRNItem {
  rmSize: {
    _id: string;
    size: string;
    grade: string;
  };
  quantity: number;
  rate: number;
}

interface GRN {
  _id: string;
  sendingParty: {
    _id: string;
    partyName: string;
    address?: string;
    gstNumber?: string;
  };
  partyChallanNumber: string;
  items: GRNItem[];
  totalValue: number;
  grnDate: string;
}

interface GRNFormItem {
  rmSize: string;
  quantity: string;
  rate: string;
}

interface GRNForm {
  sendingParty: string;
  partyChallanNumber: string;
  grnDate: string;
}

export default function GRNPage() {
  const [grns, setGrns] = useState<GRN[]>([]);
  const [parties, setParties] = useState<Party[]>([]);
  const [rmItems, setRmItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState<GRNForm>({
    sendingParty: '',
    partyChallanNumber: '',
    grnDate: new Date().toISOString().split('T')[0],
  });
  const [formItems, setFormItems] = useState<GRNFormItem[]>([
    { rmSize: '', quantity: '', rate: '' }
  ]);
  const [showConfirmation, setShowConfirmation] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [grnsRes, partiesRes, rmRes] = await Promise.all([
        fetch('/api/grn'),
        fetch('/api/party-master'),
        fetch('/api/item-master?category=RM'),
      ]);

      const [grnsData, partiesData, rmData] = await Promise.all([
        grnsRes.json(),
        partiesRes.json(),
        rmRes.json(),
      ]);

      if (grnsData.success) setGrns(grnsData.data);
      if (partiesData.success) setParties(partiesData.data);
      if (rmData.success) setRmItems(rmData.data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const addItem = () => {
    setFormItems([...formItems, { rmSize: '', quantity: '', rate: '' }]);
  };

  const removeItem = (index: number) => {
    if (formItems.length > 1) {
      setFormItems(formItems.filter((_, i) => i !== index));
    }
  };

  const updateItem = (index: number, field: keyof GRNFormItem, value: string) => {
    const newItems = [...formItems];
    newItems[index] = { ...newItems[index], [field]: value };
    setFormItems(newItems);
  };

  const validateForm = (): boolean => {
    if (!formData.sendingParty) {
      setError('Please select a sending party');
      return false;
    }
    if (!formData.partyChallanNumber.trim()) {
      setError('Challan number is required');
      return false;
    }
    if (!formData.grnDate) {
      setError('GRN date is required');
      return false;
    }

    for (let i = 0; i < formItems.length; i++) {
      const item = formItems[i];
      if (!item.rmSize) {
        setError(`Please select RM size for item ${i + 1}`);
        return false;
      }
      if (!item.quantity || parseFloat(item.quantity) <= 0) {
        setError(`Quantity must be greater than 0 for item ${i + 1}`);
        return false;
      }
      if (!item.rate || parseFloat(item.rate) < 0) {
        setError(`Rate cannot be negative for item ${i + 1}`);
        return false;
      }
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!validateForm()) {
      return;
    }

    setShowConfirmation(true);
  };

  const confirmAndSubmit = async () => {
    try {
      const items = formItems.map(item => ({
        rmSize: item.rmSize,
        quantity: parseFloat(item.quantity),
        rate: parseFloat(item.rate),
      }));

      const totalValue = items.reduce((sum, item) => sum + (item.quantity * item.rate), 0);

      const response = await fetch('/api/grn', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          items,
          totalValue,
        }),
      });

      const data = await response.json();

      if (data.success) {
        await fetchData();
        resetForm();
        setShowConfirmation(false);
        alert('GRN created successfully! RM stock has been updated.');
      } else {
        setError(data.error);
        setShowConfirmation(false);
      }
    } catch (err: any) {
      setError(err.message);
      setShowConfirmation(false);
    }
  };

  const resetForm = () => {
    setFormData({
      sendingParty: '',
      partyChallanNumber: '',
      grnDate: new Date().toISOString().split('T')[0],
    });
    setFormItems([{ rmSize: '', quantity: '', rate: '' }]);
    setShowForm(false);
    setShowConfirmation(false);
  };

  const calculateItemTotal = (quantity: string, rate: string) => {
    const qty = parseFloat(quantity) || 0;
    const rt = parseFloat(rate) || 0;
    return (qty * rt).toFixed(2);
  };

  const calculateGrandTotal = () => {
    return formItems.reduce((sum, item) => {
      const qty = parseFloat(item.quantity) || 0;
      const rt = parseFloat(item.rate) || 0;
      return sum + (qty * rt);
    }, 0).toFixed(2);
  };

  const handleDirectPDFExport = async (grn: GRN) => {
    try {
      const tempContainer = document.createElement('div');
      tempContainer.id = 'temp-grn-print';
      tempContainer.style.position = 'absolute';
      tempContainer.style.left = '-9999px';
      tempContainer.style.top = '0';
      document.body.appendChild(tempContainer);

      const itemsHtml = grn.items.map((item, index) => `
        <tr>
          <td style="border: 1px solid #cbd5e1; padding: 0.75rem; text-align: center;">${index + 1}</td>
          <td style="border: 1px solid #cbd5e1; padding: 0.75rem;">
            <p style="font-weight: 600; margin: 0 0 0.25rem 0;">${item.rmSize.size} - ${item.rmSize.grade}</p>
          </td>
          <td style="border: 1px solid #cbd5e1; padding: 0.75rem; text-align: right; font-weight: 600;">${item.quantity.toFixed(2)}</td>
          <td style="border: 1px solid #cbd5e1; padding: 0.75rem; text-align: right;">₹${item.rate.toFixed(2)}</td>
          <td style="border: 1px solid #cbd5e1; padding: 0.75rem; text-align: right; font-weight: 600;">₹${(item.quantity * item.rate).toFixed(2)}</td>
        </tr>
      `).join('');

      tempContainer.innerHTML = `
        <div style="background: white; padding: 2rem; width: 210mm;">
          <div style="text-align: center; border-bottom: 2px solid #1e293b; padding-bottom: 1rem; margin-bottom: 2rem;">
            <h1 style="font-size: 2rem; font-weight: bold; color: #1e293b; margin: 0;">DWPL</h1>
            <p style="font-size: 0.875rem; color: #64748b; margin: 0.25rem 0 0 0;">Manufacturing Management System</p>
            <h2 style="font-size: 1.25rem; font-weight: 600; color: #475569; margin: 1rem 0 0 0;">GOODS RECEIPT NOTE</h2>
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem; margin-bottom: 2rem;">
            <div>
              <p style="font-size: 0.875rem; color: #64748b; margin-bottom: 0.25rem;">GRN Date:</p>
              <p style="font-weight: 600; margin: 0;">${new Date(grn.grnDate).toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
            </div>
            <div>
              <p style="font-size: 0.875rem; color: #64748b; margin-bottom: 0.25rem;">Challan Number:</p>
              <p style="font-weight: 600; font-family: monospace; margin: 0;">${grn.partyChallanNumber}</p>
            </div>
          </div>

          <div style="margin-bottom: 2rem;">
            <h3 style="font-size: 1.125rem; font-weight: 600; color: #1e293b; margin-bottom: 0.75rem; border-bottom: 1px solid #e2e8f0; padding-bottom: 0.5rem;">Sending Party Details</h3>
            <div style="background: #f8fafc; padding: 1rem; border-radius: 0.5rem;">
              <p style="font-weight: 600; font-size: 1.125rem; margin-bottom: 0.5rem;">${grn.sendingParty.partyName}</p>
              ${grn.sendingParty.address ? `<p style="font-size: 0.875rem; color: #64748b; margin-bottom: 0.25rem;">${grn.sendingParty.address}</p>` : ''}
              ${grn.sendingParty.gstNumber ? `<p style="font-size: 0.875rem; color: #64748b; margin: 0;"><span style="font-weight: 500;">GST:</span> ${grn.sendingParty.gstNumber}</p>` : ''}
            </div>
          </div>

          <div style="margin-bottom: 2rem;">
            <h3 style="font-size: 1.125rem; font-weight: 600; color: #1e293b; margin-bottom: 0.75rem; border-bottom: 1px solid #e2e8f0; padding-bottom: 0.5rem;">Material Details</h3>
            <table style="width: 100%; border-collapse: collapse;">
              <thead>
                <tr style="background: #f1f5f9;">
                  <th style="border: 1px solid #cbd5e1; padding: 0.75rem; text-align: center;">Sr.</th>
                  <th style="border: 1px solid #cbd5e1; padding: 0.75rem; text-align: left;">Description</th>
                  <th style="border: 1px solid #cbd5e1; padding: 0.75rem; text-align: right;">Quantity</th>
                  <th style="border: 1px solid #cbd5e1; padding: 0.75rem; text-align: right;">Rate</th>
                  <th style="border: 1px solid #cbd5e1; padding: 0.75rem; text-align: right;">Amount</th>
                </tr>
              </thead>
              <tbody>
                ${itemsHtml}
              </tbody>
              <tfoot>
                <tr style="background: #f1f5f9;">
                  <td colspan="4" style="border: 1px solid #cbd5e1; padding: 0.75rem; text-align: right; font-weight: bold;">Total Value:</td>
                  <td style="border: 1px solid #cbd5e1; padding: 0.75rem; text-align: right; font-weight: bold; font-size: 1.125rem;">₹${grn.totalValue.toFixed(2)}</td>
                </tr>
              </tfoot>
            </table>
          </div>

          <div style="margin-top: 3rem; padding-top: 2rem; border-top: 1px solid #cbd5e1;">
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 2rem;">
              <div>
                <p style="font-size: 0.875rem; color: #64748b; margin-bottom: 2rem;">Received By:</p>
                <div style="border-top: 1px solid #94a3b8; padding-top: 0.5rem;">
                  <p style="font-size: 0.875rem; color: #64748b; margin: 0;">Signature & Date</p>
                </div>
              </div>
              <div>
                <p style="font-size: 0.875rem; color: #64748b; margin-bottom: 2rem;">Authorized Signatory:</p>
                <div style="border-top: 1px solid #94a3b8; padding-top: 0.5rem;">
                  <p style="font-size: 0.875rem; color: #64748b; margin: 0;">Signature & Stamp</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      `;

      const filename = generatePDFFilename('GRN', grn.partyChallanNumber, grn.grnDate);
      await exportToPDF('temp-grn-print', filename);

      document.body.removeChild(tempContainer);
    } catch (error) {
      console.error('Error exporting PDF:', error);
      alert('Failed to export PDF. Please try again.');
    }
  };

  if (loading) {
    return <Loading message="Loading GRN data..." />;
  }

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Goods Receipt Note (GRN)"
        description="Record incoming raw materials and update stock"
        action={
          !showForm && (
            <button onClick={() => setShowForm(true)} className="btn btn-primary">
              <Plus className="w-5 h-5" />
              Create GRN
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
            <h2 className="text-lg font-semibold" style={{ color: 'var(--foreground)' }}>
              Create New GRN
            </h2>
            <button 
              onClick={resetForm} 
              className="p-1 rounded transition-colors hover:bg-slate-100"
              style={{ color: 'var(--text-muted)' }}
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Party Details */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <ItemSelector
                label="Sending Party"
                value={formData.sendingParty}
                onChange={(value) => setFormData({ ...formData, sendingParty: value })}
                items={parties}
                placeholder="Select Party"
                required
                renderSelected={(party) => (
                  <span className="font-medium text-sm" style={{ color: 'var(--foreground)' }}>
                    {party.partyName}
                  </span>
                )}
                renderOption={(party) => (
                  <div className="font-medium text-sm" style={{ color: 'var(--foreground)' }}>
                    {party.partyName}
                  </div>
                )}
                getSearchableText={(party) => party.partyName}
              />

              <div>
                <label className="label">Party Challan Number *</label>
                <input
                  type="text"
                  className="input"
                  value={formData.partyChallanNumber}
                  onChange={(e) => setFormData({ ...formData, partyChallanNumber: e.target.value })}
                  placeholder="Enter challan number"
                  required
                />
              </div>

              <div>
                <label className="label">GRN Date *</label>
                <input
                  type="date"
                  className="input"
                  value={formData.grnDate}
                  onChange={(e) => setFormData({ ...formData, grnDate: e.target.value })}
                  required
                />
              </div>
            </div>

            {/* Info Box */}
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
              <p className="text-sm text-amber-800">
                <strong>Note:</strong> Each party can have only one GRN with the same challan number. 
                You can add multiple items (different sizes) to this single GRN.
              </p>
            </div>

            {/* Items Section */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-blue-900">Items</h3>
                <button
                  type="button"
                  onClick={addItem}
                  className="btn btn-primary text-sm py-1 px-3"
                >
                  <Plus className="w-4 h-4" />
                  Add Item
                </button>
              </div>

              <div className="space-y-3">
                {formItems.map((item, index) => (
                  <div key={index} className="bg-white rounded-lg p-4 border border-blue-200">
                    <div className="flex items-center justify-between mb-3">
                      <span className="font-medium text-sm text-blue-900">Item {index + 1}</span>
                      {formItems.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeItem(index)}
                          className="text-red-600 hover:text-red-800"
                          title="Remove item"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                      <div className="md:col-span-2">
                        <ItemSelector
                          label="RM Size"
                          value={item.rmSize}
                          onChange={(value) => updateItem(index, 'rmSize', value)}
                          items={rmItems}
                          placeholder="Select RM Size"
                          required
                          renderSelected={(rmItem) => (
                            <span className="text-sm" style={{ color: 'var(--foreground)' }}>
                              {rmItem.size} - {rmItem.grade}
                            </span>
                          )}
                          renderOption={(rmItem) => (
                            <div>
                              <div className="font-medium text-sm" style={{ color: 'var(--foreground)' }}>
                                {rmItem.size} - {rmItem.grade}
                              </div>
                            </div>
                          )}
                          getSearchableText={(rmItem) => `${rmItem.size} ${rmItem.grade}`}
                        />
                      </div>

                      <div>
                        <label className="label">Quantity *</label>
                        <input
                          type="number"
                          step="0.01"
                          className="input"
                          value={item.quantity}
                          onChange={(e) => updateItem(index, 'quantity', e.target.value)}
                          placeholder="0.00"
                          min="0.01"
                          required
                        />
                      </div>

                      <div>
                        <label className="label">Rate (₹) *</label>
                        <input
                          type="number"
                          step="0.01"
                          className="input"
                          value={item.rate}
                          onChange={(e) => updateItem(index, 'rate', e.target.value)}
                          placeholder="0.00"
                          min="0"
                          required
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Grand Total */}
            <div className="flex justify-end">
              <div className="bg-slate-50 rounded px-6 py-3 border-l-4 border-blue-600">
                <div className="text-right">
                  <div className="text-sm text-slate-600 mb-1">Total Amount</div>
                  <div className="text-2xl font-bold text-blue-600">
                    ₹{calculateGrandTotal()}
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3">
              <button type="submit" className="btn btn-primary">
                Create GRN
              </button>
              <button type="button" onClick={resetForm} className="btn btn-outline">
                Cancel
              </button>
            </div>
          </form>
        </Card>
      )}

      {/* Confirmation Dialog */}
      {showConfirmation && (
        <>
          <div className="fixed inset-0 bg-black bg-opacity-50 z-40" onClick={() => setShowConfirmation(false)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full p-6 max-h-[80vh] overflow-y-auto">
              <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--foreground)' }}>
                Confirm Stock Update
              </h3>
              
              <div className="space-y-3 mb-6">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-sm font-medium text-blue-900 mb-3">
                    This action will increase RM stock for the following items:
                  </p>
                  <div className="space-y-2">
                    {formItems.map((item, index) => {
                      const rmItem = rmItems.find(rm => rm._id === item.rmSize);
                      return (
                        <div key={index} className="bg-white rounded p-3 text-sm text-blue-800">
                          <div className="flex justify-between items-start">
                            <div>
                              <div className="font-semibold">{index + 1}. {rmItem?.size} - {rmItem?.grade}</div>
                              <div className="mt-1 text-xs">
                                <span className="font-medium">Qty:</span> +{item.quantity} units @ ₹{item.rate}
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-xs text-slate-500">Amount</div>
                              <div className="font-semibold text-blue-900">₹{calculateItemTotal(item.quantity, item.rate)}</div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <div className="mt-3 pt-3 border-t border-blue-200">
                    <div className="flex justify-end">
                      <div className="text-right">
                        <div className="text-sm text-blue-700 mb-1">Total Value</div>
                        <div className="text-xl font-bold text-blue-900">₹{calculateGrandTotal()}</div>
                      </div>
                    </div>
                  </div>
                </div>

                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                  Are you sure you want to create this GRN and update the stock?
                </p>
              </div>

              <div className="flex gap-3">
                <button 
                  onClick={confirmAndSubmit}
                  className="btn btn-primary flex-1"
                >
                  Confirm & Create GRN
                </button>
                <button 
                  onClick={() => setShowConfirmation(false)}
                  className="btn btn-outline"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      <Card>
        <div className="overflow-x-auto">
          <table className="table">
            <thead>
              <tr>
                <th>GRN Date</th>
                <th>Sending Party</th>
                <th>Challan No.</th>
                <th>Items</th>
                <th>Total Quantity</th>
                <th>Total Value</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {grns.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-slate-500">
                    <FileText className="w-12 h-12 mx-auto mb-2 text-slate-400" />
                    <p>No GRNs found. Click "Create GRN" to add one.</p>
                  </td>
                </tr>
              ) : (
                grns.map((grn) => (
                  <tr key={grn._id}>
                    <td>
                      {new Date(grn.grnDate).toLocaleDateString('en-IN', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </td>
                    <td className="font-medium">{grn.sendingParty.partyName}</td>
                    <td className="font-mono text-sm">{grn.partyChallanNumber}</td>
                    <td>
                      <div className="space-y-1">
                        {grn.items.map((item, idx) => (
                          <div key={idx} className="text-sm">
                            {item.rmSize.size} - {item.rmSize.grade}
                            <span className="text-xs text-slate-500 ml-2">
                              ({item.quantity.toFixed(2)} @ ₹{item.rate.toFixed(2)})
                            </span>
                          </div>
                        ))}
                      </div>
                    </td>
                    <td className="font-semibold">
                      {grn.items.reduce((sum, item) => sum + item.quantity, 0).toFixed(2)}
                    </td>
                    <td className="font-bold text-green-600">
                      ₹{grn.totalValue.toFixed(2)}
                    </td>
                    <td>
                      <button
                        onClick={() => handleDirectPDFExport(grn)}
                        className="btn btn-primary flex items-center gap-2 text-sm"
                        title="Export as PDF"
                      >
                        <Download className="w-4 h-4" />
                        Export PDF
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
