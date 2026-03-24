'use client';

import { useEffect, useState } from 'react';
import PageHeader from '@/components/PageHeader';
import Card from '@/components/Card';
import Loading from '@/components/Loading';
import ErrorMessage from '@/components/ErrorMessage';
import SearchBar from '@/components/SearchBar';
import { Plus, Edit2, Trash2, X } from 'lucide-react';

interface Item {
  _id: string;
  itemCode: string;
  category: 'RM' | 'FG';
  size: string;
  grade: string;
  hsnCode: string;
  isActive: boolean;
}

interface ItemForm {
  category: 'RM' | 'FG';
  size: string;
  grade: string;
  hsnCode: string;
  isActive: boolean;
}

export default function ItemMasterPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [hsnCodes, setHsnCodes] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [filter, setFilter] = useState<'ALL' | 'RM' | 'FG'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const [formData, setFormData] = useState<ItemForm>({
    category: 'RM',
    size: '',
    grade: '',
    hsnCode: '',
    isActive: true,
  });

  useEffect(() => {
    fetchItems();
  }, []);

  const fetchItems = async () => {
    try {
      const response = await fetch('/api/item-master');
      const data = await response.json();
      if (data.success) {
        setItems(data.data);
        
        // Extract unique HSN codes from existing items
        const codes = Array.from(new Set(data.data.map((item: any) => item.hsnCode).filter(Boolean)));
        setHsnCodes(codes as string[]);
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
      const url = editingId ? `/api/item-master/${editingId}` : '/api/item-master';
      const method = editingId ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (data.success) {
        await fetchItems();
        resetForm();
      } else {
        setError(data.error);
      }
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleEdit = (item: Item) => {
    setFormData({
      category: item.category,
      size: item.size,
      grade: item.grade,
      hsnCode: item.hsnCode,
      isActive: item.isActive,
    });
    setEditingId(item._id);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this item?')) return;

    try {
      const response = await fetch(`/api/item-master/${id}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (data.success) {
        await fetchItems();
      } else {
        setError(data.error);
      }
    } catch (err: any) {
      setError(err.message);
    }
  };

  const resetForm = () => {
    setFormData({
      category: 'RM',
      size: '',
      grade: '',
      hsnCode: '',
      isActive: true,
    });
    setEditingId(null);
    setShowForm(false);
  };

  // Filter and search items
  const filteredItems = items
    .filter((item) => filter === 'ALL' || item.category === filter)
    .filter((item) => {
      const query = searchQuery.toLowerCase();
      return (
        item.size.toLowerCase().includes(query) ||
        item.grade.toLowerCase().includes(query) ||
        item.itemCode.toLowerCase().includes(query) ||
        item.hsnCode.toLowerCase().includes(query)
      );
    });

  if (loading) {
    return <Loading message="Loading items..." />;
  }

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Item Master"
        description="Manage raw materials and finished goods"
        action={
          !showForm && (
            <button onClick={() => setShowForm(true)} className="btn btn-primary">
              <Plus className="w-5 h-5" />
              Add Item
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
            <h2 className="text-xl font-semibold" style={{ color: 'var(--foreground)' }}>
              {editingId ? 'Edit Item Master' : 'Add New Item Master'}
            </h2>
            <button onClick={resetForm} style={{ color: 'var(--text-muted)' }} className="hover:opacity-70">
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-3">
              <div>
                <label className="label">Category *</label>
                <select
                  className="input"
                  value={formData.category}
                  onChange={(e) =>
                    setFormData({ ...formData, category: e.target.value as 'RM' | 'FG' })
                  }
                  required
                >
                  <option value="RM">Raw Material (RM)</option>
                  <option value="FG">Finished Good (FG)</option>
                </select>
              </div>

              <div>
                <label className="label">Size / Diameter *</label>
                <input
                  type="text"
                  className="input"
                  value={formData.size}
                  onChange={(e) => setFormData({ ...formData, size: e.target.value })}
                  placeholder="e.g., 8mm, 10mm"
                  required
                />
              </div>

              <div>
                <label className="label">Grade *</label>
                <input
                  type="text"
                  className="input"
                  value={formData.grade}
                  onChange={(e) => setFormData({ ...formData, grade: e.target.value })}
                  placeholder="e.g., MS, SS304"
                  required
                />
              </div>



              <div>
                <label className="label">HSN Code *</label>
                <input
                  type="text"
                  className="input"
                  list="hsn-datalist"
                  value={formData.hsnCode}
                  onChange={(e) => setFormData({ ...formData, hsnCode: e.target.value })}
                  placeholder="e.g., 7228"
                  required
                />
                <datalist id="hsn-datalist">
                  {hsnCodes.map((code) => (
                    <option key={code} value={code} />
                  ))}
                </datalist>
                <p className="text-xs text-slate-500 mt-1">
                  Type a new HSN code or select an existing one.
                </p>
              </div>

              <div className="flex items-center gap-2 mt-6">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                />
                <label htmlFor="isActive" className="text-sm" style={{ color: 'var(--foreground)' }}>
                  Active
                </label>
              </div>
            </div>

            <div className="flex gap-3">
              <button type="submit" className="btn btn-primary">
                {editingId ? 'Update' : 'Create'} Item
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
          placeholder="Search by item code, size, grade, or HSN code..."
        />
      </div>

      {/* Filter Buttons */}
      <div className="flex gap-2 mb-6">
        {(['ALL', 'RM', 'FG'] as const).map((cat) => (
          <button
            key={cat}
            onClick={() => setFilter(cat)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              filter === cat
                ? 'bg-blue-600 text-white'
                : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
            }`}
          >
            {cat === 'ALL' ? 'All Items' : cat === 'RM' ? 'Raw Material' : 'Finished Goods'}
          </button>
        ))}
      </div>

      <Card>
        <div className="overflow-x-auto">
          <table className="table">
            <thead>
              <tr>
                <th>Item Code</th>
                <th>Category</th>
                <th>Size</th>
                <th>Grade</th>
                <th>HSN Code</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-slate-500">
                    {searchQuery ? 'No items found matching your search.' : 'No items found. Click "Add Item" to create one.'}
                  </td>
                </tr>
              ) : (
                filteredItems.map((item) => (
                  <tr key={item._id}>
                    <td className="font-mono text-sm text-blue-600">{item.itemCode}</td>
                    <td>
                      <span
                        className={`badge ${
                          item.category === 'RM' ? 'badge-warning' : 'badge-info'
                        }`}
                      >
                        {item.category}
                      </span>
                    </td>
                    <td className="font-medium">{item.size}</td>
                    <td>{item.grade}</td>
                    <td className="font-mono text-sm">{item.hsnCode}</td>
                    <td>
                      <span
                        className={`badge ${
                          item.isActive ? 'badge-success' : 'badge-error'
                        }`}
                      >
                        {item.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEdit(item)}
                          className="text-blue-600 hover:text-blue-800"
                          title="Edit"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(item._id)}
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
