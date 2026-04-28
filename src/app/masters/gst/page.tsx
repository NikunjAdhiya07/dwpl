'use client';

import { useEffect, useState } from 'react';
import PageHeader from '@/components/PageHeader';
import Card from '@/components/Card';
import Loading from '@/components/Loading';
import ErrorMessage from '@/components/ErrorMessage';
import SearchBar from '@/components/SearchBar';
import { Plus, Edit2, X, Info } from 'lucide-react';
import ItemSelector from '@/components/ItemSelector';

interface GSTRate {
  _id: string;
  party: {
    _id: string;
    partyName: string;
  };
  cgstPercentage: number;
  sgstPercentage: number;
  igstPercentage: number;
  tcsPercentage?: number;
  isActive: boolean;
}

interface GSTForm {
  party: string;
  cgstPercentage: number;
  sgstPercentage: number;
  igstPercentage: number;
  tcsPercentage: number;
  isActive: boolean;
}

interface Party {
  _id: string;
  partyName: string;
  gstNumber?: string;
}

const DEFAULT_FORM: GSTForm = {
  party: '',
  cgstPercentage: 9,
  sgstPercentage: 9,
  igstPercentage: 0,
  tcsPercentage: 0,
  isActive: true,
};

export default function GSTMasterPage() {
  const [gstRates, setGstRates] = useState<GSTRate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [parties, setParties] = useState<Party[]>([]);
  const [formData, setFormData] = useState<GSTForm>(DEFAULT_FORM);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [gstRes, partiesRes] = await Promise.all([
        fetch('/api/gst-master'),
        fetch('/api/party-master'),
      ]);
      const gstData = await gstRes.json();
      const partiesData = await partiesRes.json();

      if (gstData.success) {
        setGstRates(gstData.data);
      } else {
        setError(gstData.error);
      }

      if (partiesData.success) {
        setParties(partiesData.data);
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
    setSubmitting(true);

    try {
      const url = editingId ? `/api/gst-master/${editingId}` : '/api/gst-master';
      const method = editingId ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (data.success) {
        await fetchData();
        resetForm();
      } else {
        setError(data.error);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (gst: GSTRate) => {
    setFormData({
      party: gst.party?._id || '',
      cgstPercentage: gst.cgstPercentage ?? 0,
      sgstPercentage: gst.sgstPercentage ?? 0,
      igstPercentage: gst.igstPercentage ?? 0,
      tcsPercentage: gst.tcsPercentage ?? 0,
      isActive: gst.isActive,
    });
    setEditingId(gst._id);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const resetForm = () => {
    setFormData(DEFAULT_FORM);
    setEditingId(null);
    setShowForm(false);
    setError('');
  };

  // Filter GST rates based on search query
  const filteredGstRates = gstRates.filter((gst) => {
    const query = searchQuery.toLowerCase();
    const partyName = gst.party?.partyName?.toLowerCase() || '';
    return (
      partyName.includes(query) ||
      gst.cgstPercentage?.toString().includes(query) ||
      gst.sgstPercentage?.toString().includes(query) ||
      gst.igstPercentage?.toString().includes(query) ||
      (gst.tcsPercentage ?? 0).toString().includes(query)
    );
  });

  if (loading) {
    return <Loading message="Loading GST rates..." />;
  }

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Party GST Setup"
        description="Configure CGST, SGST, IGST & TCS percentages per party. Rates auto-apply when creating tax invoices."
        action={
          !showForm && (
            <button onClick={() => setShowForm(true)} className="btn btn-primary">
              <Plus className="w-5 h-5" />
              Add GST Rate
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
              {editingId ? 'Edit GST Rate' : 'Add / Update GST Rate'}
            </h2>
            <button onClick={resetForm} className="text-slate-400 hover:text-slate-600">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Info banner */}
          <div className="mb-4 flex items-start gap-2 bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800">
            <Info className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <span>
              One GST rate record per party. If the party already has a rate configured, submitting
              this form will <strong>update</strong> the existing rate automatically.
            </span>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
              {/* Party selector */}
              <div className="md:col-span-2">
                <ItemSelector
                  label="Party *"
                  value={formData.party}
                  onChange={(val) => setFormData({ ...formData, party: val })}
                  items={parties}
                  required
                  placeholder="Select a party..."
                  getSearchableText={(p) => p.partyName}
                  renderSelected={(p) => <span className="font-semibold">{p.partyName}</span>}
                  renderOption={(p) => (
                    <div>
                      <div>{p.partyName}</div>
                      {p.gstNumber && (
                        <div className="text-xs text-slate-400">{p.gstNumber}</div>
                      )}
                    </div>
                  )}
                />
              </div>

              {/* CGST */}
              <div>
                <label className="label">CGST (%) *</label>
                <input
                  type="number"
                  step="0.01"
                  className="input"
                  value={formData.cgstPercentage}
                  onChange={(e) =>
                    setFormData({ ...formData, cgstPercentage: parseFloat(e.target.value) || 0 })
                  }
                  min="0"
                  max="100"
                  required
                />
              </div>

              {/* SGST */}
              <div>
                <label className="label">SGST (%) *</label>
                <input
                  type="number"
                  step="0.01"
                  className="input"
                  value={formData.sgstPercentage}
                  onChange={(e) =>
                    setFormData({ ...formData, sgstPercentage: parseFloat(e.target.value) || 0 })
                  }
                  min="0"
                  max="100"
                  required
                />
              </div>

              {/* IGST */}
              <div>
                <label className="label">IGST (%) *</label>
                <input
                  type="number"
                  step="0.01"
                  className="input"
                  value={formData.igstPercentage}
                  onChange={(e) =>
                    setFormData({ ...formData, igstPercentage: parseFloat(e.target.value) || 0 })
                  }
                  min="0"
                  max="100"
                  required
                />
              </div>
            </div>

            {/* TCS + preview row */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
              <div>
                <label className="label">TCS (%)</label>
                <input
                  type="number"
                  step="0.001"
                  className="input"
                  value={formData.tcsPercentage}
                  onChange={(e) =>
                    setFormData({ ...formData, tcsPercentage: parseFloat(e.target.value) || 0 })
                  }
                  min="0"
                  max="100"
                  placeholder="0"
                />
              </div>

              {/* Total GST preview */}
              <div className="md:col-span-2 flex items-end">
                <div className="bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 text-sm w-full">
                  <span className="text-slate-500">Total GST: </span>
                  <span className="font-bold text-slate-800">
                    {(
                      formData.cgstPercentage +
                      formData.sgstPercentage +
                      formData.igstPercentage
                    ).toFixed(2)}
                    %
                  </span>
                  {formData.tcsPercentage > 0 && (
                    <span className="text-slate-500 ml-4">
                      TCS: <span className="font-bold text-slate-800">{formData.tcsPercentage}%</span>
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isActive"
                checked={formData.isActive}
                onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
              />
              <label htmlFor="isActive" className="text-sm text-slate-700 dark:text-slate-300">
                Active
              </label>
            </div>

            <div className="flex gap-3">
              <button type="submit" className="btn btn-primary" disabled={submitting}>
                {submitting ? 'Saving…' : editingId ? 'Update GST Rate' : 'Save GST Rate'}
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
          placeholder="Search by Party Name or GST %..."
        />
      </div>

      <Card>
        <div className="overflow-x-auto">
          <table className="table">
            <thead>
              <tr>
                <th>#</th>
                <th>Party</th>
                <th>CGST (%)</th>
                <th>SGST (%)</th>
                <th>IGST (%)</th>
                <th>Total GST (%)</th>
                <th>TCS (%)</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredGstRates.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center py-8 text-slate-500">
                    {searchQuery
                      ? 'No GST rates found matching your search.'
                      : 'No GST rates configured yet. Click "Add GST Rate" to get started.'}
                  </td>
                </tr>
              ) : (
                filteredGstRates.map((gst, idx) => {
                  const totalGst =
                    (gst.cgstPercentage ?? 0) +
                    (gst.sgstPercentage ?? 0) +
                    (gst.igstPercentage ?? 0);
                  return (
                    <tr key={gst._id}>
                      <td className="text-slate-400 text-sm">{idx + 1}</td>
                      <td className="font-semibold">{gst.party?.partyName || 'Unknown Party'}</td>
                      <td>
                        <span className="badge badge-info text-sm">{gst.cgstPercentage ?? 0}%</span>
                      </td>
                      <td>
                        <span className="badge badge-info text-sm">{gst.sgstPercentage ?? 0}%</span>
                      </td>
                      <td>
                        <span className="badge badge-warning text-sm">
                          {gst.igstPercentage ?? 0}%
                        </span>
                      </td>
                      <td>
                        <span className="font-bold text-slate-700 dark:text-slate-300">
                          {totalGst.toFixed(2)}%
                        </span>
                      </td>
                      <td>
                        {(gst.tcsPercentage ?? 0) > 0 ? (
                          <span className="badge badge-warning text-sm">
                            {gst.tcsPercentage}%
                          </span>
                        ) : (
                          <span className="text-slate-400 text-sm">—</span>
                        )}
                      </td>
                      <td>
                        <span
                          className={`badge ${gst.isActive ? 'badge-success' : 'badge-error'}`}
                        >
                          {gst.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleEdit(gst)}
                            className="text-blue-600 hover:text-blue-800"
                            title="Edit"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Summary footer */}
        {filteredGstRates.length > 0 && (
          <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-700 text-sm text-slate-500">
            Showing {filteredGstRates.length} of {gstRates.length} party GST rate
            {gstRates.length !== 1 ? 's' : ''}
          </div>
        )}
      </Card>
    </div>
  );
}
