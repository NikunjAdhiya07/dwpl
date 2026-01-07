'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import PageHeader from '@/components/PageHeader';
import Card from '@/components/Card';
import Loading from '@/components/Loading';
import ErrorMessage from '@/components/ErrorMessage';
import { Package, TrendingUp, TrendingDown, Filter } from 'lucide-react';

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

export default function StockPage() {
  const searchParams = useSearchParams();
  const [stocks, setStocks] = useState<StockItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<'ALL' | 'RM' | 'FG'>(
    (searchParams.get('category') as 'RM' | 'FG') || 'ALL'
  );

  useEffect(() => {
    fetchStocks();
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

      {/* Filter Buttons */}
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

      {/* Stock Table */}
      <Card>
        <div className="overflow-x-auto">
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
        </div>
      </Card>
    </div>
  );
}
