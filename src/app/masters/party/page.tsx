'use client';

import { useEffect, useState } from 'react';
import PageHeader from '@/components/PageHeader';
import Card from '@/components/Card';
import Loading from '@/components/Loading';
import ErrorMessage from '@/components/ErrorMessage';
import SearchBar from '@/components/SearchBar';
import { Plus, Edit2, Trash2, X, FileText } from 'lucide-react';

interface Party {
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
  isActive: boolean;
}

interface PartyForm {
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
  isActive: boolean;
}

export default function PartyMasterPage() {
  const [parties, setParties] = useState<Party[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Tax Setup states
  const [showTaxModal, setShowTaxModal] = useState(false);
  const [taxParty, setTaxParty] = useState<Party | null>(null);
  const [isSavingTax, setIsSavingTax] = useState(false);
  const [taxData, setTaxData] = useState({
    cgstPercentage: 9,
    sgstPercentage: 9,
    igstPercentage: 0,
    tcsPercentage: 0,
  });

  const [formData, setFormData] = useState<PartyForm>({
    partyName: '',
    address: '',
    gstNumber: '',
    contactNumber: '',
    rate: 0,
    sappdRate: 0,
    ppdFixedRate: 0,
    annealingCharge: 0,
    drawCharge: 0,
    annealingMax: 8,
    drawMax: 10,
    isActive: true,
  });

  useEffect(() => {
    fetchParties();
  }, []);

  const fetchParties = async () => {
    try {
      const response = await fetch('/api/party-master');
      const data = await response.json();
      if (data.success) {
        setParties(data.data);
      } else {
        setError(data.error);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      const url = editingId ? `/api/party-master/${editingId}` : '/api/party-master';
      const method = editingId ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (data.success) {
        await fetchParties();
        resetForm();
      } else {
        setError(data.error);
      }
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleEdit = (party: Party) => {
    setFormData({
      partyName: party.partyName,
      address: party.address,
      gstNumber: party.gstNumber,
      contactNumber: party.contactNumber,
      rate: party.rate,
      sappdRate: party.sappdRate || 0,
      ppdFixedRate: party.ppdFixedRate || 0,
      annealingCharge: party.annealingCharge,
      drawCharge: party.drawCharge,
      annealingMax: party.annealingMax || 10,
      drawMax: party.drawMax || 8,
      isActive: party.isActive,
    });
    setEditingId(party._id);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this party?')) return;

    try {
      const response = await fetch(`/api/party-master/${id}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (data.success) {
        await fetchParties();
      } else {
        setError(data.error);
      }
    } catch (err: any) {
      setError(err.message);
    }
  };

  const openTaxModal = async (party: Party) => {
    setTaxParty(party);
    setTaxData({ cgstPercentage: 9, sgstPercentage: 9, igstPercentage: 0, tcsPercentage: 0 }); // reset to defaults
    setShowTaxModal(true);
    
    // Fetch existing tax data
    try {
      const res = await fetch('/api/gst-master');
      const data = await res.json();
      if (data.success) {
        // Find existing tax data for this party
        const existingTax = data.data.find((g: any) => (g.party?._id || g.party) === party._id);
        if (existingTax) {
          setTaxData({
            cgstPercentage: existingTax.cgstPercentage,
            sgstPercentage: existingTax.sgstPercentage,
            igstPercentage: existingTax.igstPercentage,
            tcsPercentage: existingTax.tcsPercentage || 0,
          });
        }
      }
    } catch (err) {
      console.error('Failed to fetch tax data', err);
    }
  };

  const handleSaveTax = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taxParty) return;
    setIsSavingTax(true);
    try {
      const response = await fetch('/api/gst-master', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          party: taxParty._id,
          ...taxData,
          isActive: true
        }),
      });
      const data = await response.json();
      if (data.success) {
        setShowTaxModal(false);
        alert('Tax configurations saved successfully!');
      } else {
        alert(data.error || 'Failed to save tax details');
      }
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsSavingTax(false);
    }
  };

  const resetForm = () => {
    setFormData({
      partyName: '',
      address: '',
      gstNumber: '',
      contactNumber: '',
      rate: 0,
      sappdRate: 0,
      ppdFixedRate: 0,
      annealingCharge: 0,
      drawCharge: 0,
      annealingMax: 10,
      drawMax: 8,
      isActive: true,
    });
    setEditingId(null);
    setShowForm(false);
  };

  // Filter parties based on search query
  const filteredParties = parties.filter((party) => {
    const query = searchQuery.toLowerCase();
    return (
      party.partyName.toLowerCase().includes(query) ||
      party.gstNumber.toLowerCase().includes(query) ||
      party.contactNumber.includes(query)
    );
  });

  if (loading) {
    return <Loading message="Loading parties..." />;
  }

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Party Master"
        description="Manage party information and charges"
        action={
          <button onClick={() => setShowForm(true)} className="btn btn-primary">
            <Plus className="w-5 h-5" />
            Add Party
          </button>
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
            <h2 className="text-xl font-semibold" style={{ color: 'var(--foreground)' }}>
              {editingId ? 'Edit Party Details' : 'Add New Party'}
            </h2>
            <button onClick={resetForm} style={{ color: 'var(--text-muted)' }} className="hover:opacity-70">
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-3">
              <div>
                <label className="label">Party Name *</label>
                <input
                  type="text"
                  className="input"
                  value={formData.partyName}
                  onChange={(e) =>
                    setFormData({ ...formData, partyName: e.target.value })
                  }
                  required
                />
              </div>

              <div>
                <label className="label">GST Number *</label>
                <input
                  type="text"
                  className="input"
                  value={formData.gstNumber}
                  onChange={(e) =>
                    setFormData({ ...formData, gstNumber: e.target.value.toUpperCase() })
                  }
                  pattern="[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}"
                  title="Enter valid GST number"
                  required
                />
              </div>

              <div>
                <label className="label">Contact Number *</label>
                <input
                  type="text"
                  className="input"
                  value={formData.contactNumber}
                  onChange={(e) =>
                    setFormData({ ...formData, contactNumber: e.target.value })
                  }
                  required
                />
              </div>

              <div>
                <label className="label">Address *</label>
                <input
                  type="text"
                  className="input"
                  value={formData.address}
                  onChange={(e) =>
                    setFormData({ ...formData, address: e.target.value })
                  }
                  required
                />
              </div>

              <div>
                <label className="label">SAPP Rate (per unit) *</label>
                <input
                  type="number"
                  step="0.01"
                  className="input"
                  value={formData.rate}
                  onChange={(e) =>
                    setFormData({ ...formData, rate: parseFloat(e.target.value) })
                  }
                  placeholder="0.00"
                  required
                />
              </div>

              <div>
                <label className="label">SAPPD Rate (₹/kg) *</label>
                <input
                  type="number"
                  step="0.01"
                  className="input"
                  value={formData.sappdRate}
                  onChange={(e) =>
                    setFormData({ ...formData, sappdRate: parseFloat(e.target.value) || 0 })
                  }
                  placeholder="0.00"
                  min="0"
                  required
                />
                <p className="text-xs text-slate-500 mt-1">SAPPD processing rate per kg</p>
              </div>

              <div>
                <label className="label">PPD Fixed Rate (₹/kg) *</label>
                <input
                  type="number"
                  step="0.01"
                  className="input"
                  value={formData.ppdFixedRate}
                  onChange={(e) =>
                    setFormData({ ...formData, ppdFixedRate: parseFloat(e.target.value) || 0 })
                  }
                  placeholder="0.00"
                  min="0"
                  required
                />
                <p className="text-xs text-slate-500 mt-1">PPD fixed processing rate per kg</p>
              </div>

              <div>
                <label className="label">Annealing Charge (per unit) *</label>
                <input
                  type="number"
                  step="0.01"
                  className="input"
                  value={formData.annealingCharge}
                  onChange={(e) =>
                    setFormData({ ...formData, annealingCharge: parseFloat(e.target.value) })
                  }
                  required
                />
              </div>

              <div>
                <label className="label">Draw Charge (per pass/unit) *</label>
                <input
                  type="number"
                  step="0.01"
                  className="input"
                  value={formData.drawCharge}
                  onChange={(e) =>
                    setFormData({ ...formData, drawCharge: parseFloat(e.target.value) })
                  }
                  required
                />
              </div>

              <div>
                <label className="label">Annealing Max (0-8) *</label>
                <input
                  type="number"
                  className="input"
                  value={formData.annealingMax}
                  onChange={(e) =>
                    setFormData({ ...formData, annealingMax: parseInt(e.target.value) || 0 })
                  }
                  min="0"
                  max="8"
                  required
                />
                <p className="text-xs text-slate-500 mt-1">Maximum annealing count allowed for this party</p>
              </div>

              <div>
                <label className="label">Draw Max (0-10) *</label>
                <input
                  type="number"
                  className="input"
                  value={formData.drawMax}
                  onChange={(e) =>
                    setFormData({ ...formData, drawMax: parseInt(e.target.value) || 0 })
                  }
                  min="0"
                  max="10"
                  required
                />
                <p className="text-xs text-slate-500 mt-1">Maximum draw count allowed for this party</p>
              </div>

              <div className="flex items-center gap-2 mt-6">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={formData.isActive}
                  onChange={(e) =>
                    setFormData({ ...formData, isActive: e.target.checked })
                  }
                />
                <label htmlFor="isActive" className="text-sm" style={{ color: 'var(--foreground)' }}>
                  Active
                </label>
              </div>
            </div>

            <div className="flex gap-3">
              <button type="submit" className="btn btn-primary">
                {editingId ? 'Update' : 'Create'} Party
              </button>
              <button type="button" onClick={resetForm} className="btn btn-outline">
                Cancel
              </button>
            </div>
          </form>
        </Card>
      )}

      {/* Search Bar */}
      <div className="mb-6">
        <SearchBar
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder="Search by party name, GST number, or contact..."
        />
      </div>

      <Card>
        <div className="overflow-x-auto">
          <table className="table">
            <thead>
              <tr>
                <th>Party Name</th>
                <th>GST Number</th>
                <th>Contact</th>
                <th>SAPP</th>
                <th>SAPPD Rate</th>
                <th>PPD Rate</th>
                <th>Annealing Charge</th>
                <th>Draw Charge</th>
                <th>Annealing Max</th>
                <th>Draw Max</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredParties.length === 0 ? (
                <tr>
                  <td colSpan={12} className="text-center py-8 text-slate-500">
                    {searchQuery ? 'No parties found matching your search.' : 'No parties found. Click "Add Party" to create one.'}
                  </td>
                </tr>
              ) : (
                filteredParties.map((party) => (
                  <tr key={party._id}>
                    <td className="font-medium">{party.partyName}</td>
                    <td className="font-mono text-sm">{party.gstNumber}</td>
                    <td>{party.contactNumber}</td>
                    <td>₹{(party.rate ?? 0).toFixed(2)}</td>
                    <td>₹{(party.sappdRate ?? 0).toFixed(2)}</td>
                    <td>₹{(party.ppdFixedRate ?? 0).toFixed(2)}</td>
                    <td>₹{(party.annealingCharge ?? 0).toFixed(2)}</td>
                    <td>₹{(party.drawCharge ?? 0).toFixed(2)}</td>
                    <td>
                      <span className="badge badge-blue">
                        {party.annealingMax || 10}
                      </span>
                    </td>
                    <td>
                      <span className="badge badge-green">
                        {party.drawMax || 8}
                      </span>
                    </td>
                    <td>
                      <span
                        className={`badge ${
                          party.isActive ? 'badge-success' : 'badge-error'
                        }`}
                      >
                        {party.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td>
                      <div className="flex gap-2">
                        <button
                          onClick={() => openTaxModal(party)}
                          className="text-amber-600 hover:text-amber-800"
                          title="Tax Setup"
                        >
                          <FileText className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleEdit(party)}
                          className="text-blue-600 hover:text-blue-800"
                          title="Edit"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(party._id)}
                          className="text-red-600 hover:text-red-800"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
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

      {/* Tax Setup Modal */}
      {showTaxModal && taxParty && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
          <Card className="max-w-md w-full animate-scale-in relative border-slate-200 border-2 shadow-2xl">
            <button
              onClick={() => setShowTaxModal(false)}
              className="absolute right-4 top-4 text-slate-400 hover:text-slate-600 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
              <FileText className="w-5 h-5 text-amber-600" />
              Tax Setup for Party
            </h3>
            <form onSubmit={handleSaveTax} className="space-y-4">
              <div className="bg-slate-50 p-4 rounded-lg mb-4 text-sm break-all font-mono border border-slate-200 text-slate-700">
                Party: <span className="font-semibold text-amber-600">{taxParty.partyName}</span>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-slate-700 ml-1">CGST (%)</label>
                  <input
                    type="number" step="0.01" min="0" max="100" required
                    value={taxData.cgstPercentage}
                    onChange={(e) => setTaxData({ ...taxData, cgstPercentage: parseFloat(e.target.value) || 0 })}
                    className="w-full px-4 py-2 border border-slate-300 bg-white rounded-lg focus:ring-2 focus:ring-amber-500 transition-all font-mono"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-slate-700 ml-1">SGST (%)</label>
                  <input
                    type="number" step="0.01" min="0" max="100" required
                    value={taxData.sgstPercentage}
                    onChange={(e) => setTaxData({ ...taxData, sgstPercentage: parseFloat(e.target.value) || 0 })}
                    className="w-full px-4 py-2 border border-slate-300 bg-white rounded-lg focus:ring-2 focus:ring-amber-500 transition-all font-mono"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-slate-700 ml-1">IGST (%)</label>
                  <input
                    type="number" step="0.01" min="0" max="100" required
                    value={taxData.igstPercentage}
                    onChange={(e) => setTaxData({ ...taxData, igstPercentage: parseFloat(e.target.value) || 0 })}
                    className="w-full px-4 py-2 border border-slate-300 bg-white rounded-lg focus:ring-2 focus:ring-amber-500 transition-all font-mono"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-slate-700 ml-1">TCS (%)</label>
                  <input
                    type="number" step="0.01" min="0" max="100" required
                    value={taxData.tcsPercentage}
                    onChange={(e) => setTaxData({ ...taxData, tcsPercentage: parseFloat(e.target.value) || 0 })}
                    className="w-full px-4 py-2 border border-slate-300 bg-white rounded-lg focus:ring-2 focus:ring-amber-500 transition-all font-mono"
                  />
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={isSavingTax} className="w-full btn btn-primary py-2.5 text-sm uppercase tracking-wide disabled:opacity-50">
                  {isSavingTax ? 'Saving...' : 'Save Configuration'}
                </button>
                <button type="button" onClick={() => setShowTaxModal(false)} className="w-full btn btn-outline py-2.5 text-sm uppercase tracking-wide">
                  Cancel
                </button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
}
