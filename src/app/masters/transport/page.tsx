'use client';

import { useEffect, useState } from 'react';
import PageHeader from '@/components/PageHeader';
import Card from '@/components/Card';
import Loading from '@/components/Loading';
import ErrorMessage from '@/components/ErrorMessage';
import { Plus, Edit2, X, Truck, Trash2 } from 'lucide-react';

interface Transport {
  _id: string;
  vehicleNumber: string;
  transporterName: string;
  ownerName: string;
  isActive: boolean;
}

interface TransportForm {
  vehicleNumbers: string[]; // support multiple vehicles per owner
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
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState<TransportForm>({
    vehicleNumbers: [''],
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
    setSubmitting(true);

    // Filter out empty vehicle numbers
    const validVehicleNumbers = formData.vehicleNumbers
      .map((v) => v.trim().toUpperCase())
      .filter(Boolean);

    if (validVehicleNumbers.length === 0) {
      setError('Please enter at least one vehicle number');
      setSubmitting(false);
      return;
    }

    try {
      if (editingId) {
        // Editing: update a single record (only the first vehicle number applies)
        const url = `/api/transport-master/${editingId}`;
        const response = await fetch(url, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            vehicleNumber: validVehicleNumbers[0],
            transporterName: formData.transporterName,
            ownerName: formData.ownerName,
            isActive: formData.isActive,
          }),
        });
        const data = await response.json();
        if (!data.success) {
          setError(data.error);
          setSubmitting(false);
          return;
        }

        // If user added more vehicle numbers while editing, create them
        if (validVehicleNumbers.length > 1) {
          const additionalVehicles = validVehicleNumbers.slice(1);
          const results = await Promise.all(
            additionalVehicles.map((vehicleNumber) =>
              fetch('/api/transport-master', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  vehicleNumber,
                  transporterName: formData.transporterName,
                  ownerName: formData.ownerName,
                  isActive: formData.isActive,
                }),
              }).then((r) => r.json())
            )
          );

          const failed = results.filter((r) => !r.success);
          if (failed.length > 0) {
            setError(failed.map((f) => f.error).join(', '));
            setSubmitting(false);
            return;
          }
        }
      } else {
        // Creating: one record per vehicle number
        const results = await Promise.all(
          validVehicleNumbers.map((vehicleNumber) =>
            fetch('/api/transport-master', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                vehicleNumber,
                transporterName: formData.transporterName,
                ownerName: formData.ownerName,
                isActive: formData.isActive,
              }),
            }).then((r) => r.json())
          )
        );

        const failed = results.filter((r) => !r.success);
        if (failed.length > 0) {
          setError(failed.map((f) => f.error).join(', '));
          setSubmitting(false);
          return;
        }
      }

      await fetchTransports();
      resetForm();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (transport: Transport) => {
    setFormData({
      vehicleNumbers: [transport.vehicleNumber],
      transporterName: transport.transporterName || '',
      ownerName: transport.ownerName,
      isActive: transport.isActive,
    });
    setEditingId(transport._id);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const resetForm = () => {
    setFormData({
      vehicleNumbers: [''],
      transporterName: '',
      ownerName: '',
      isActive: true,
    });
    setEditingId(null);
    setShowForm(false);
    setError('');
  };

  const handleDelete = async (id: string, vehicleNumber: string) => {
    if (!confirm(`Are you sure you want to delete vehicle ${vehicleNumber}?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/transport-master/${id}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (data.success) {
        alert('Vehicle deleted successfully');
        await fetchTransports();
      } else {
        setError(data.error || 'Failed to delete vehicle');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred while deleting');
    }
  };

  const addVehicleNumber = () => {
    setFormData({ ...formData, vehicleNumbers: [...formData.vehicleNumbers, ''] });
  };

  const removeVehicleNumber = (index: number) => {
    setFormData({
      ...formData,
      vehicleNumbers: formData.vehicleNumbers.filter((_, i) => i !== index),
    });
  };

  const updateVehicleNumber = (index: number, value: string) => {
    const updated = [...formData.vehicleNumbers];
    updated[index] = value.toUpperCase();
    setFormData({ ...formData, vehicleNumbers: updated });
  };

  // Group transports by ownerName for display
  const groupedByOwner = transports.reduce<Record<string, Transport[]>>((acc, t) => {
    const key = t.ownerName || 'Unknown';
    if (!acc[key]) acc[key] = [];
    acc[key].push(t);
    return acc;
  }, {});

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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Vehicle Numbers */}
              <div>
                <label className="label flex items-center gap-2 mb-1">
                  Vehicle Number(s) *
                  <span className="text-xs text-slate-500 font-normal">
                    — Add multiple vehicles for the same owner
                  </span>
                </label>
                <div className="space-y-2">
                  {formData.vehicleNumbers.map((vn, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <input
                        type="text"
                        className="input uppercase flex-1"
                        value={vn}
                        onChange={(e) => updateVehicleNumber(idx, e.target.value)}
                        placeholder={`e.g., GJ01AB1234${idx > 0 ? ` (Vehicle ${idx + 1})` : ''}`}
                        required={idx === 0}
                      />
                      {/* Remove button – only shown for extra rows */}
                      {formData.vehicleNumbers.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeVehicleNumber(idx)}
                          className="text-red-400 hover:text-red-600 flex-shrink-0"
                          title="Remove this vehicle number"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                      {/* Add button on the last row */}
                      {idx === formData.vehicleNumbers.length - 1 && (
                        <button
                          type="button"
                          onClick={addVehicleNumber}
                          className="flex-shrink-0 flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 border border-blue-300 bg-blue-50 hover:bg-blue-100 rounded px-2 py-1.5 transition-colors"
                          title="Add another vehicle number"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                {formData.vehicleNumbers.length > 1 && (
                  <p className="text-xs text-blue-600 mt-1">
                    {formData.vehicleNumbers.filter((v) => v.trim()).length} vehicle(s) will be
                    processed under this owner.
                  </p>
                )}
              </div>

              {/* Right side: Transporter + Owner stacked */}
              <div className="space-y-4">
                <div>
                  <label className="label">Transporter Name</label>
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
                {submitting ? 'Saving...' : editingId ? 'Update Vehicle' : 'Create Vehicle(s)'}
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
                    <p>No vehicles found. Click &quot;Add Vehicle&quot; to create one.</p>
                  </td>
                </tr>
              ) : (
                Object.entries(groupedByOwner).map(([owner, vehicles]) => (
                  vehicles.map((transport, idx) => (
                    <tr key={transport._id}>
                      <td className="font-mono font-semibold text-lg">
                        {transport.vehicleNumber}
                      </td>
                      <td className="font-medium">{transport.transporterName || '-'}</td>
                      {/* Merge owner name cell vertically for the first row of each owner group */}
                      {idx === 0 ? (
                        <td
                          className="font-medium align-top"
                          rowSpan={vehicles.length}
                          style={{
                            borderLeft: '3px solid var(--color-primary, #3b82f6)',
                            paddingLeft: '12px',
                          }}
                        >
                          <div className="flex flex-col gap-0.5">
                            <span>{owner}</span>
                            {vehicles.length > 1 && (
                              <span className="text-xs text-slate-400">
                                {vehicles.length} vehicles
                              </span>
                            )}
                          </div>
                        </td>
                      ) : null}
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
                          <button
                            onClick={() => handleDelete(transport._id, transport.vehicleNumber)}
                            className="text-red-500 hover:text-red-700"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
