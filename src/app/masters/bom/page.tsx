'use client';

import { useEffect, useState } from 'react';
import PageHeader from '@/components/PageHeader';
import Card from '@/components/Card';
import Loading from '@/components/Loading';
import ErrorMessage from '@/components/ErrorMessage';
import SearchBar from '@/components/SearchBar';
import ItemSelector from '@/components/ItemSelector';
import { Plus, Edit2, Trash2, X } from 'lucide-react';

interface BOM {
  _id: string;
  fgSize: string;
  rmSize: string;
  status: 'Active' | 'Inactive';
}

interface BOMForm {
  fgSizes: string; // Changed to support multiple comma-separated sizes
  rmSize: string;
  status: 'Active' | 'Inactive';
}

interface ItemMaster {
  _id: string;
  itemCode: string;
  category: 'RM' | 'FG';
  size: string;
  grade: string;
  hsnCode: string;
  isActive: boolean;
}

export default function BOMPage() {
  const [boms, setBoms] = useState<BOM[]>([]);
  const [rmItems, setRmItems] = useState<ItemMaster[]>([]);
  const [fgItems, setFgItems] = useState<ItemMaster[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<BOMForm>({
    fgSizes: '',
    rmSize: '',
    status: 'Active',
  });

  useEffect(() => {
    fetchBOMs();
    fetchItems();
  }, []);

  const fetchBOMs = async () => {
    try {
      const response = await fetch('/api/bom');
      const data = await response.json();
      if (data.success) {
        setBoms(data.data);
      } else {
        setError(data.error);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchItems = async () => {
    try {
      const response = await fetch('/api/item-master');
      const data = await response.json();
      if (data.success) {
        // Filter active items by category
        const items = data.data.filter((item: ItemMaster) => item.isActive);
        setRmItems(items.filter((item: ItemMaster) => item.category === 'RM').sort((a: any, b: any) => (parseFloat(a.size) || 0) - (parseFloat(b.size) || 0)));
        setFgItems(items.filter((item: ItemMaster) => item.category === 'FG').sort((a: any, b: any) => (parseFloat(a.size) || 0) - (parseFloat(b.size) || 0)));
      }
    } catch (err: any) {
      console.error('Failed to fetch items:', err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');



    // Parse multiple FG sizes (comma-separated)
    const fgSizeList = formData.fgSizes
      .split(',')
      .map(s => s.trim())
      .filter(s => s.length > 0);

    if (fgSizeList.length === 0) {
      setError('Please enter at least one Finish Size');
      return;
    }

    setIsSubmitting(true);

    try {
      if (editingId) {
        // When editing, only update single entry
        const response = await fetch(`/api/bom/${editingId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fgSize: fgSizeList[0], // Use first size when editing
            rmSize: formData.rmSize,
            status: formData.status,
          }),
        });

        const data = await response.json();
        if (data.success) {
          await fetchBOMs();
          resetForm();
        } else {
          setError(data.error);
        }
      } else {
        // When creating, create multiple BOMs
        const results: string[] = [];
        const autoCreatedFGs: string[] = [];
        const errors: string[] = [];

        for (const fgSize of fgSizeList) {
          try {
            const response = await fetch('/api/bom', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                fgSize,
                rmSize: formData.rmSize,
                status: formData.status,
                autoCreateFG: true, // Enable auto-creation of FG items
              }),
            });

            const data = await response.json();
            if (data.success) {
              results.push(fgSize);
              // Check if FG item was auto-created
              if (data.message && data.message.includes('auto-created')) {
                autoCreatedFGs.push(fgSize);
              }
            } else {
              errors.push(`${fgSize}: ${data.error}`);
            }
          } catch (err: any) {
            errors.push(`${fgSize}: ${err.message}`);
          }
        }

        await fetchBOMs();

        if (errors.length > 0) {
          setError(`Created ${results.length} BOM(s). Errors: ${errors.join('; ')}`);
        } else {
          let successMsg = `✅ Successfully created ${results.length} BOM entries for RM: ${formData.rmSize}`;
          if (autoCreatedFGs.length > 0) {
            successMsg += `\n\n📦 Auto-created ${autoCreatedFGs.length} FG items in Item Master:\n${autoCreatedFGs.join(', ')}`;
          }
          alert(successMsg);
          resetForm();
        }
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (bom: BOM) => {
    setFormData({
      fgSizes: bom.fgSize, // When editing, show single size
      rmSize: bom.rmSize,
      status: bom.status,
    });
    setEditingId(bom._id);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this BOM?')) return;

    try {
      const response = await fetch(`/api/bom/${id}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (data.success) {
        await fetchBOMs();
      } else {
        setError(data.error);
      }
    } catch (err: any) {
      setError(err.message);
    }
  };

  const resetForm = () => {
    setFormData({
      fgSizes: '',
      rmSize: '',
      status: 'Active',
    });
    setEditingId(null);
    setShowForm(false);
  };

  // Filter BOMs based on search query
  const filteredBoms = boms.filter((bom) => {
    const query = searchQuery.toLowerCase();
    return (
      bom.fgSize.toLowerCase().includes(query) ||
      bom.rmSize.toLowerCase().includes(query)
    );
  });

  if (loading) {
    return <Loading message="Loading BOMs..." />;
  }

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="BOM (Bill of Materials)"
        description="Define size conversion mapping from RM to FG"
        action={
          !showForm && (
            <button onClick={() => setShowForm(true)} className="btn btn-primary">
              <Plus className="w-5 h-5" />
              Add BOM
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
              {editingId ? 'Edit BOM' : 'Add New BOM'}
            </h2>
            <button onClick={resetForm} className="text-slate-400 hover:text-slate-600">
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <ItemSelector
                  label={editingId ? 'Finish Size (FG) *' : 'Finish Size (FG) *'}
                  value={formData.fgSizes}
                  onChange={(value) => setFormData({ ...formData, fgSizes: value })}
                  items={fgItems.map(item => ({...item, _id: item.size}))}
                  placeholder="Select FG Item"
                  required
                  renderSelected={(item) => (
                    <span className="text-sm font-medium">{item.itemCode} - {item.size} ({item.grade})</span>
                  )}
                  renderOption={(item) => (
                    <div className="text-sm font-medium">{item.itemCode} - {item.size} ({item.grade})</div>
                  )}
                  getSearchableText={(item) => `${item.itemCode} ${item.size} ${item.grade}`}
                  helperText="Select from Item Master (FG items only)"
                />
              </div>

              <div>
                <ItemSelector
                  label="Original Size (RM) *"
                  value={formData.rmSize}
                  onChange={(value) => setFormData({ ...formData, rmSize: value })}
                  items={rmItems.map(item => ({...item, _id: item.size}))}
                  placeholder="Select RM Item"
                  required
                  renderSelected={(item) => (
                    <span className="text-sm font-medium">{item.itemCode} - {item.size} ({item.grade})</span>
                  )}
                  renderOption={(item) => (
                    <div className="text-sm font-medium">{item.itemCode} - {item.size} ({item.grade})</div>
                  )}
                  getSearchableText={(item) => `${item.itemCode} ${item.size} ${item.grade}`}
                  helperText="Select from Item Master (RM items only). Multiple FG sizes can use the same RM."
                />
              </div>

              <div>
                <label className="label">Status *</label>
                <select
                  className="input"
                  value={formData.status}
                  onChange={(e) =>
                    setFormData({ ...formData, status: e.target.value as 'Active' | 'Inactive' })
                  }
                  required
                >
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>
            </div>

            <div className="flex gap-3">
              <button type="submit" className="btn btn-primary">
                {editingId ? 'Update' : 'Create'} BOM
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
          placeholder="Search by FG size or RM size..."
        />
      </div>

      <Card>
        <div className="overflow-x-auto">
          <table className="table">
            <thead>
              <tr>
                <th>FG Size</th>
                <th>RM Size</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredBoms.length === 0 ? (
                <tr>
                  <td colSpan={4} className="text-center py-8 text-slate-500">
                    {searchQuery ? 'No BOMs found matching your search.' : 'No BOMs found. Click "Add BOM" to create one.'}
                  </td>
                </tr>
              ) : (
                filteredBoms.map((bom) => (
                  <tr key={bom._id}>
                    <td className="font-medium">{bom.fgSize}</td>
                    <td className="font-medium">{bom.rmSize}</td>
                    <td>
                      <span
                        className={`badge ${
                          bom.status === 'Active' ? 'badge-success' : 'badge-error'
                        }`}
                      >
                        {bom.status}
                      </span>
                    </td>
                    <td>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEdit(bom)}
                          className="text-blue-600 hover:text-blue-800"
                          title="Edit"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(bom._id)}
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
