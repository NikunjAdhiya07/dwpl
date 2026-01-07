'use client';

import { useEffect, useState } from 'react';
import PageHeader from '@/components/PageHeader';
import Card from '@/components/Card';
import Loading from '@/components/Loading';
import ErrorMessage from '@/components/ErrorMessage';
import SearchBar from '@/components/SearchBar';
import { Plus, Edit2, Trash2, X } from 'lucide-react';

interface Party {
  _id: string;
  partyName: string;
  address: string;
  gstNumber: string;
  contactNumber: string;
  rate: number;
  annealingCharge: number;
  drawCharge: number;
  isActive: boolean;
}

interface PartyForm {
  partyName: string;
  address: string;
  gstNumber: string;
  contactNumber: string;
  rate: number;
  annealingCharge: number;
  drawCharge: number;
  isActive: boolean;
}

export default function PartyMasterPage() {
  const [parties, setParties] = useState<Party[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const [formData, setFormData] = useState<PartyForm>({
    partyName: '',
    address: '',
    gstNumber: '',
    contactNumber: '',
    rate: 0,
    annealingCharge: 0,
    drawCharge: 0,
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
      annealingCharge: party.annealingCharge,
      drawCharge: party.drawCharge,
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

  const resetForm = () => {
    setFormData({
      partyName: '',
      address: '',
      gstNumber: '',
      contactNumber: '',
      rate: 0,
      annealingCharge: 0,
      drawCharge: 0,
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                <label className="label">Base Rate (per unit) *</label>
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
                <th>Rate</th>
                <th>Annealing Charge</th>
                <th>Draw Charge</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredParties.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-8 text-slate-500">
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
                    <td>₹{(party.annealingCharge ?? 0).toFixed(2)}</td>
                    <td>₹{(party.drawCharge ?? 0).toFixed(2)}</td>
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
    </div>
  );
}
