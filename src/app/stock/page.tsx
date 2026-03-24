'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import PageHeader from '@/components/PageHeader';
import Card from '@/components/Card';
import Loading from '@/components/Loading';
import ErrorMessage from '@/components/ErrorMessage';
import { Package, TrendingUp, TrendingDown, Filter, User } from 'lucide-react';

interface StockItem {
  _id: string;
  category: 'RM' | 'FG';
  size: {
    _id: string;
    size: string;
    grade: string;
  };
  quantity: number;
  lastUpdated: string;
}

interface PartyStockItem {
  itemId: string;
  itemCode: string;
  size: string;
  grade: string;
  category: 'RM' | 'FG';
  quantity: number;
}

interface Party {
  _id: string;
  partyName: string;
  isActive: boolean;
}

function StockContent() {
  const searchParams = useSearchParams();
  const [stocks, setStocks] = useState<StockItem[]>([]);
  const [partyStocks, setPartyStocks] = useState<PartyStockItem[]>([]);
  const [parties, setParties] = useState<Party[]>([]);
  const [selectedParty, setSelectedParty] = useState('');
  const [loading, setLoading] = useState(true);
  const [partyLoading, setPartyLoading] = useState(false);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<'ALL' | 'RM' | 'FG'>(
    (searchParams.get('category') as 'RM' | 'FG') || 'ALL'
  );
  const [viewMode, setViewMode] = useState<'global' | 'party'>('global');

  useEffect(() => {
    fetchStocks();
    fetchParties();
  }, [filter]);

  const fetchStocks = async () => {
    try {
      const url = filter === 'ALL' ? '/api/stock' : `/api/stock?category=${filter}`;
      const response = await fetch(url);
      const data = await response.json();
      
      if (data.success) {
        setStocks(data.data);
      } else {
        setError(data.error);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchParties = async () => {
    try {
      const response = await fetch('/api/party-master');
      const data = await response.json();
      if (data.success) {
        setParties(data.data.filter((p: Party) => p.isActive));
      }
    } catch (err: any) {
      console.error('Failed to fetch parties:', err);
    }
  };

  const fetchPartyStock = async (partyId: string) => {
    if (!partyId) {
      setPartyStocks([]);
      return;
    }
    setPartyLoading(true);
    try {
      const response = await fetch(`/api/stock/party?partyId=${partyId}`);
      const data = await response.json();
      if (data.success) {
        setPartyStocks(data.data);
      } else {
        setError(data.error);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setPartyLoading(false);
    }
  };

  const handlePartyChange = (partyId: string) => {
    setSelectedParty(partyId);
    fetchPartyStock(partyId);
  };

  const displayStocks = viewMode === 'global' ? stocks : partyStocks;
  const rmStocks = stocks.filter((s) => s.category === 'RM');
  const fgStocks = stocks.filter((s) => s.category === 'FG');
  const totalRMQty = rmStocks.reduce((sum, s) => sum + s.quantity, 0);
  const totalFGQty = fgStocks.reduce((sum, s) => sum + s.quantity, 0);

  if (loading) {
    return <Loading message="Loading stock..." />;
  }

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Stock Inventory"
        description="Real-time stock levels for RM and FG"
      />

      {error && (
        <div className="mb-6">
          <ErrorMessage message={error} />
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card hover>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">
                Total RM Stock
              </p>
              <p className="text-3xl font-bold text-slate-900 dark:text-white">
                {totalRMQty.toFixed(2)}
              </p>
              <p className="text-xs text-slate-500 mt-1">{rmStocks.length} items</p>
            </div>
            <div className="bg-orange-500 p-3 rounded-lg">
              <TrendingDown className="w-6 h-6 text-white" />
            </div>
          </div>
        </Card>

        <Card hover>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">
                Total FG Stock
              </p>
              <p className="text-3xl font-bold text-slate-900 dark:text-white">
                {totalFGQty.toFixed(2)}
              </p>
              <p className="text-xs text-slate-500 mt-1">{fgStocks.length} items</p>
            </div>
            <div className="bg-green-500 p-3 rounded-lg">
              <TrendingUp className="w-6 h-6 text-white" />
            </div>
          </div>
        </Card>

        <Card hover>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">
                Total Items
              </p>
              <p className="text-3xl font-bold text-slate-900 dark:text-white">
                {stocks.length}
              </p>
              <p className="text-xs text-slate-500 mt-1">All categories</p>
            </div>
            <div className="bg-blue-500 p-3 rounded-lg">
              <Package className="w-6 h-6 text-white" />
            </div>
          </div>
        </Card>
      </div>

      {/* View Mode Tabs */}
      <div className="flex items-center gap-3 mb-4">
        <button
          onClick={() => setViewMode('global')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
            viewMode === 'global'
              ? 'bg-blue-600 text-white'
              : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
          }`}
        >
          <Package className="w-4 h-4" />
          Global Stock
        </button>
        <button
          onClick={() => setViewMode('party')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
            viewMode === 'party'
              ? 'bg-purple-600 text-white'
              : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
          }`}
        >
          <User className="w-4 h-4" />
          Party Stock
        </button>
      </div>

      {/* Party Select (only in party view) */}
      {viewMode === 'party' && (
        <Card className="mb-4">
          <div className="flex items-center gap-3">
            <User className="w-5 h-5 text-purple-500" />
            <label className="text-sm font-medium text-slate-700">Select Party:</label>
            <select
              className="flex-1 max-w-xs px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              value={selectedParty}
              onChange={(e) => handlePartyChange(e.target.value)}
            >
              <option value="">-- Select a Party --</option>
              {parties.map((party) => (
                <option key={party._id} value={party._id}>
                  {party.partyName}
                </option>
              ))}
            </select>
            {selectedParty && (
              <span className="text-xs text-purple-600 font-medium">
                Showing stock for selected party (GRN – OC)
              </span>
            )}
          </div>
        </Card>
      )}

      {/* Category Filter Buttons (only in global view) */}
      {viewMode === 'global' && (
        <div className="flex items-center gap-3 mb-6">
          <Filter className="w-5 h-5 text-slate-600" />
          <div className="flex gap-2">
            <button
              onClick={() => setFilter('ALL')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                filter === 'ALL'
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setFilter('RM')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                filter === 'RM'
                  ? 'bg-orange-600 text-white'
                  : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
              }`}
            >
              Raw Material
            </button>
            <button
              onClick={() => setFilter('FG')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                filter === 'FG'
                  ? 'bg-green-600 text-white'
                  : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
              }`}
            >
              Finished Goods
            </button>
          </div>
        </div>
      )}

      {/* Stock Table */}
      <Card>
        {partyLoading ? (
          <div className="py-8 text-center text-slate-500">Loading party stock...</div>
        ) : (
          <div className="overflow-x-auto">
            {viewMode === 'party' && !selectedParty ? (
              <div className="py-12 text-center text-slate-400">
                <User className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                <p className="text-sm">Select a party to view their stock</p>
              </div>
            ) : viewMode === 'party' ? (
              <table className="table">
                <thead>
                  <tr>
                    <th>Category</th>
                    <th>Item Code</th>
                    <th>Size</th>
                    <th>Grade</th>
                    <th>Quantity (kg)</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {partyStocks.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center py-8 text-slate-500">
                        No stock found for the selected party.
                      </td>
                    </tr>
                  ) : (
                    partyStocks.map((stock) => (
                      <tr key={stock.itemId}>
                        <td>
                          <span className={`badge ${stock.category === 'RM' ? 'badge-warning' : 'badge-info'}`}>
                            {stock.category}
                          </span>
                        </td>
                        <td className="font-mono text-xs">{stock.itemCode}</td>
                        <td className="font-medium">{stock.size}</td>
                        <td>{stock.grade}</td>
                        <td className="font-semibold text-lg">{stock.quantity.toFixed(2)}</td>
                        <td>
                          <span className={`badge ${stock.quantity > 0 ? 'badge-success' : 'badge-error'}`}>
                            {stock.quantity > 0 ? 'In Stock' : 'Out of Stock'}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            ) : (
              <table className="table">
                <thead>
                  <tr>
                    <th>Category</th>
                    <th>Size</th>
                    <th>Grade</th>
                    <th>Quantity</th>
                    <th>Last Updated</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {stocks.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center py-8 text-slate-500">
                        No stock items found.
                      </td>
                    </tr>
                  ) : (
                    stocks.map((stock) => (
                      <tr key={stock._id}>
                        <td>
                          <span
                            className={`badge ${
                              stock.category === 'RM' ? 'badge-warning' : 'badge-info'
                            }`}
                          >
                            {stock.category}
                          </span>
                        </td>
                        <td className="font-medium">{stock.size.size}</td>
                        <td>{stock.size.grade}</td>
                        <td className="font-semibold text-lg">
                          {stock.quantity.toFixed(2)}
                        </td>
                        <td className="text-sm text-slate-600">
                          {new Date(stock.lastUpdated).toLocaleDateString('en-IN', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </td>
                        <td>
                          <span
                            className={`badge ${
                              stock.quantity > 0 ? 'badge-success' : 'badge-error'
                            }`}
                          >
                            {stock.quantity > 0 ? 'In Stock' : 'Out of Stock'}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            )}
          </div>
        )}
      </Card>
    </div>
  );
}

export default function StockPage() {
  return (
    <Suspense fallback={<Loading message="Loading stock..." />}>
      <StockContent />
    </Suspense>
  );
}
