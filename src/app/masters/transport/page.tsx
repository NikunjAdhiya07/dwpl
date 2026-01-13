'use client';

import { useEffect, useState } from 'react';
import PageHeader from '@/components/PageHeader';
import Card from '@/components/Card';
import Loading from '@/components/Loading';
import ErrorMessage from '@/components/ErrorMessage';
import { Plus, Edit2, X, Truck } from 'lucide-react';

interface Transport {
  _id: string;
  vehicleNumber: string;
  transporterName: string;
  ownerName: string;
  isActive: boolean;
}

interface TransportForm {
  vehicleNumber: string;
  transporterName: string;
  ownerName: string;
  isActive: boolean;
}

export default function TransportMasterPage() {
  const [transports, setTransports] = useState<Transport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<TransportForm>({
    vehicleNumber: '',
    transporterName: '',
    ownerName: '',
    isActive: true,
  });

  useEffect(() => {
    fetchTransports();
  }, []);

  const fetchTransports = async () => {
    try {
      const response = await fetch('/api/transport-master');
      const data = await response.json();
      if (data.success) {
        setTransports(data.data);
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
      const url = editingId ? `/api/transport-master/${editingId}` : '/api/transport-master';
      const method = editingId ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (data.success) {
        await fetchTransports();
        resetForm();
      } else {
        setError(data.error);
      }
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleEdit = (transport: Transport) => {
    setFormData({
      vehicleNumber: transport.vehicleNumber,
      transporterName: transport.transporterName || '',
      ownerName: transport.ownerName,
      isActive: transport.isActive,
    });
    setEditingId(transport._id);
    setShowForm(true);
  };

  const resetForm = () => {
    setFormData({
      vehicleNumber: '',
      transporterName: '',
      ownerName: '',
      isActive: true,
    });
    setEditingId(null);
    setShowForm(false);
  };

  if (loading) {
    return <Loading message="Loading transport data..." />;
  }

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Transport Master"
        description="Manage vehicle and owner information"
        action={
          !showForm && (
            <button onClick={() => setShowForm(true)} className="btn btn-primary">
              <Plus className="w-5 h-5" />
              Add Vehicle
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
              {editingId ? 'Edit Vehicle' : 'Add New Vehicle'}
            </h2>
            <button onClick={resetForm} className="text-slate-400 hover:text-slate-600">
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="label">Vehicle Number *</label>
                <input
                  type="text"
                  className="input uppercase"
                  value={formData.vehicleNumber}
                  onChange={(e) =>
                    setFormData({ ...formData, vehicleNumber: e.target.value.toUpperCase() })
                  }
                  placeholder="e.g., MH12AB1234"
                  required
                />
              </div>

              <div>
                <label className="label">Transporter Name *</label>
                <input
                  type="text"
                  className="input"
                  value={formData.transporterName}
                  onChange={(e) => setFormData({ ...formData, transporterName: e.target.value })}
                  placeholder="e.g., ABC Transport Co."
                  required
                />
              </div>

              <div>
                <label className="label">Owner Name *</label>
                <input
                  type="text"
                  className="input"
                  value={formData.ownerName}
                  onChange={(e) => setFormData({ ...formData, ownerName: e.target.value })}
                  placeholder="Enter owner name"
                  required
                />
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
              <button type="submit" className="btn btn-primary">
                {editingId ? 'Update' : 'Create'} Vehicle
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
                <th>Vehicle Number</th>
                <th>Transporter Name</th>
                <th>Owner Name</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {transports.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-8 text-slate-500">
                    <Truck className="w-12 h-12 mx-auto mb-2 text-slate-400" />
                    <p>No vehicles found. Click "Add Vehicle" to create one.</p>
                  </td>
                </tr>
              ) : (
                transports.map((transport) => (
                  <tr key={transport._id}>
                    <td className="font-mono font-semibold text-lg">
                      {transport.vehicleNumber}
                    </td>
                    <td className="font-medium">{transport.transporterName || '-'}</td>
                    <td className="font-medium">{transport.ownerName}</td>
                    <td>
                      <span
                        className={`badge ${
                          transport.isActive ? 'badge-success' : 'badge-error'
                        }`}
                      >
                        {transport.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEdit(transport)}
                          className="text-blue-600 hover:text-blue-800"
                          title="Edit"
                        >
                          <Edit2 className="w-4 h-4" />
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
