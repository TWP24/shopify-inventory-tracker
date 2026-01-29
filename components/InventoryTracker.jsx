import React, { useState, useEffect } from 'react';
import { Calendar, Package, TrendingDown, DollarSign, Bell, Plus, Settings, RefreshCw, AlertTriangle, CheckCircle, Clock, BarChart3, ArrowUp, ArrowDown, Search, Filter, Download } from 'lucide-react';

const InventoryTracker = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [products, setProducts] = useState([]);
  const [forecasts, setForecasts] = useState({});
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/products');
      const data = await response.json();
      setProducts(data);
    } catch (error) {
      console.error('Error fetching products:', error);
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };

  const syncShopify = async () => {
    setSyncing(true);
    try {
      const secret = prompt('Enter CRON_SECRET to sync:');
      const response = await fetch(`/api/shopify/sync-inventory?secret=${secret}`);
      const data = await response.json();
      
      if (data.success) {
        alert(data.message);
        fetchProducts();
      } else {
        alert('Sync failed: ' + data.error);
      }
    } catch (error) {
      alert('Sync error: ' + error.message);
    } finally {
      setSyncing(false);
    }
  };

  const sendAlert = async (product, alertType) => {
    const message = alertType === 'low' 
      ? `⚠️ Low Stock Alert: ${product.name} (${product.sku}) is running low with ${product.current_stock} units remaining.`
      : `📦 Reorder Alert: Time to reorder ${product.name} (${product.sku}). Suggested quantity: ${product.reorder_quantity} units. Expected cost: $${(product.reorder_quantity * product.cogs).toFixed(2)}`;

    try {
      await fetch('/api/alerts/send-slack', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: product.id,
          alertType,
          message
        })
      });
      alert('Alert sent to Slack!');
    } catch (error) {
      alert('Demo: ' + message);
    }
  };

  const calculateDaysUntilStockout = (product) => {
    const dailySales = product.daily_avg_sales || 0.01;
    return Math.floor(product.current_stock / dailySales);
  };

  const calculateReorderDate = (product) => {
    const daysUntilStockout = calculateDaysUntilStockout(product);
    const reorderDay = daysUntilStockout - product.lead_time_days;
    
    if (reorderDay <= 0) {
      return { date: new Date(), status: 'urgent' };
    }
    
    const date = new Date();
    date.setDate(date.getDate() + reorderDay);
    
    return { 
      date, 
      status: reorderDay <= 7 ? 'warning' : 'normal'
    };
  };

  const getProductStatus = (product) => {
    const reorderInfo = calculateReorderDate(product);
    if (product.current_stock <= 0) return 'outofstock';
    if (reorderInfo.status === 'urgent') return 'urgent';
    if (reorderInfo.status === 'warning') return 'warning';
    return 'healthy';
  };

  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         product.sku.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (filterStatus === 'all') return matchesSearch;
    if (filterStatus === 'low') return matchesSearch && product.current_stock <= product.reorder_point;
    if (filterStatus === 'healthy') return matchesSearch && product.current_stock > product.reorder_point;
    return matchesSearch;
  });

  const stats = {
    totalSKUs: products.length,
    lowStock: products.filter(p => p.current_stock <= p.reorder_point).length,
    outOfStock: products.filter(p => p.current_stock <= 0).length,
    totalValue: products.reduce((sum, p) => sum + (p.current_stock * p.cogs), 0),
    urgentReorders: products.filter(p => getProductStatus(p) === 'urgent').length
  };

  const DashboardTab = () => (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Inventory Overview</h2>
          <p className="text-sm text-gray-500 mt-1">Real-time stock levels and alerts</p>
        </div>
        <button
          onClick={syncShopify}
          disabled={syncing}
          className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-3 rounded-xl hover:from-blue-700 hover:to-blue-800 disabled:opacity-50 shadow-lg shadow-blue-500/30 transition-all duration-200 hover:shadow-xl hover:shadow-blue-500/40"
        >
          <RefreshCw size={18} className={syncing ? 'animate-spin' : ''} />
          {syncing ? 'Syncing...' : 'Sync Shopify'}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-6 rounded-2xl border border-blue-200 hover:shadow-lg transition-all duration-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-blue-600 mb-1">Total SKUs</p>
              <p className="text-3xl font-bold text-blue-900">{stats.totalSKUs}</p>
            </div>
            <div className="bg-blue-200 p-3 rounded-xl">
              <Package className="text-blue-700" size={24} />
            </div>
          </div>
        </div>
        
        <div className="bg-gradient-to-br from-red-50 to-red-100 p-6 rounded-2xl border border-red-200 hover:shadow-lg transition-all duration-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-red-600 mb-1">Low Stock</p>
              <p className="text-3xl font-bold text-red-900">{stats.lowStock}</p>
            </div>
            <div className="bg-red-200 p-3 rounded-xl">
              <TrendingDown className="text-red-700" size={24} />
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-orange-50 to-orange-100 p-6 rounded-2xl border border-orange-200 hover:shadow-lg transition-all duration-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-orange-600 mb-1">Out of Stock</p>
              <p className="text-3xl font-bold text-orange-900">{stats.outOfStock}</p>
            </div>
            <div className="bg-orange-200 p-3 rounded-xl">
              <AlertTriangle className="text-orange-700" size={24} />
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-6 rounded-2xl border border-purple-200 hover:shadow-lg transition-all duration-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-purple-600 mb-1">Urgent Reorders</p>
              <p className="text-3xl font-bold text-purple-900">{stats.urgentReorders}</p>
            </div>
            <div className="bg-purple-200 p-3 rounded-xl">
              <Clock className="text-purple-700" size={24} />
            </div>
          </div>
        </div>
        
        <div className="bg-gradient-to-br from-green-50 to-green-100 p-6 rounded-2xl border border-green-200 hover:shadow-lg transition-all duration-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-green-600 mb-1">Inventory Value</p>
              <p className="text-2xl font-bold text-green-900">${stats.totalValue.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</p>
            </div>
            <div className="bg-green-200 p-3 rounded-xl">
              <DollarSign className="text-green-700" size={24} />
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Search by product name or SKU..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setFilterStatus('all')}
              className={`px-4 py-2.5 rounded-xl font-medium transition-all ${
                filterStatus === 'all'
                  ? 'bg-blue-600 text-white shadow-lg'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setFilterStatus('low')}
              className={`px-4 py-2.5 rounded-xl font-medium transition-all ${
                filterStatus === 'low'
                  ? 'bg-red-600 text-white shadow-lg'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Low Stock
            </button>
            <button
              onClick={() => setFilterStatus('healthy')}
              className={`px-4 py-2.5 rounded-xl font-medium transition-all ${
                filterStatus === 'healthy'
                  ? 'bg-green-600 text-white shadow-lg'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Healthy
            </button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <RefreshCw className="animate-spin text-blue-600 mx-auto mb-4" size={40} />
            <p className="text-gray-600">Loading products...</p>
          </div>
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-2xl border border-gray-200">
          <Package className="text-gray-300 mx-auto mb-4" size={64} />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">No products found</h3>
          <p className="text-gray-600 mb-6">
            {searchTerm ? 'Try adjusting your search' : 'Sync with Shopify to get started'}
          </p>
          {!searchTerm && (
            <button
              onClick={syncShopify}
              className="bg-blue-600 text-white px-6 py-3 rounded-xl hover:bg-blue-700 shadow-lg"
            >
              Sync Now
            </button>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Product</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">SKU</th>
                  <th className="px-6 py-4 text-right text-xs font-bold text-gray-700 uppercase tracking-wider">Stock</th>
                  <th className="px-6 py-4 text-right text-xs font-bold text-gray-700 uppercase tracking-wider">Avg Daily Sales</th>
                  <th className="px-6 py-4 text-right text-xs font-bold text-gray-700 uppercase tracking-wider">Days Left</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Reorder Date</th>
                  <th className="px-6 py-4 text-center text-xs font-bold text-gray-700 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-4 text-center text-xs font-bold text-gray-700 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredProducts.map(product => {
                  const daysUntilStockout = calculateDaysUntilStockout(product);
                  const reorderInfo = calculateReorderDate(product);
                  const status = getProductStatus(product);
                  
                  return (
                    <tr 
                      key={product.id} 
                      className={`hover:bg-gray-50 transition-colors ${
                        status === 'urgent' ? 'bg-red-50' : 
                        status === 'outofstock' ? 'bg-orange-50' : ''
                      }`}
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center">
                          <div>
                            <div className="text-sm font-semibold text-gray-900">{product.name}</div>
                            <div className="text-xs text-gray-500">COGS: ${product.cogs.toFixed(2)}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm font-mono text-gray-700 bg-gray-100 px-2 py-1 rounded">
                          {product.sku}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className="text-lg font-bold text-gray-900">{product.current_stock}</span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <BarChart3 size={14} className="text-gray-400" />
                          <span className="text-sm text-gray-700">{product.daily_avg_sales?.toFixed(1) || '0.0'}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Clock size={14} className="text-gray-400" />
                          <span className={`text-sm font-medium ${
                            daysUntilStockout <= 7 ? 'text-red-600' :
                            daysUntilStockout <= 30 ? 'text-orange-600' :
                            'text-gray-700'
                          }`}>
                            {daysUntilStockout} days
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-gray-700">
                          {reorderInfo.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold ${
                          status === 'outofstock' ? 'bg-orange-100 text-orange-800' :
                          status === 'urgent' ? 'bg-red-100 text-red-800' :
                          status === 'warning' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-green-100 text-green-800'
                        }`}>
                          {status === 'outofstock' ? (
                            <>< AlertTriangle size={12} /> Out of Stock</>
                          ) : status === 'urgent' ? (
                            <><AlertTriangle size={12} /> Reorder Now</>
                          ) : status === 'warning' ? (
                            <><Clock size={12} /> Reorder Soon</>
                          ) : (
                            <><CheckCircle size={12} /> Healthy</>
                          )}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => {
                              setSelectedProduct(product);
                              setActiveTab('calendar');
                            }}
                            className="text-blue-600 hover:text-blue-800 font-medium text-sm"
                          >
                            Details
                          </button>
                          {(status === 'urgent' || status === 'outofstock') && (
                            <button
                              onClick={() => sendAlert(product, 'low')}
                              className="text-orange-600 hover:text-orange-800"
                            >
                              <Bell size={16} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="max-w-[1600px] mx-auto p-6">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="bg-gradient-to-br from-blue-600 to-blue-700 p-3 rounded-2xl shadow-lg">
              <Package className="text-white" size={32} />
            </div>
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                Inventory Tracker
              </h1>
              <p className="text-gray-600 mt-1">Real-time Shopify inventory management</p>
            </div>
          </div>
        </div>

        <div className="mb-6 bg-white rounded-2xl shadow-sm border border-gray-200 p-2 inline-flex gap-1">
          {[
            { id: 'dashboard', label: 'Dashboard', icon: Package }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-6 py-3 flex items-center gap-2 rounded-xl font-medium transition-all ${
                activeTab === tab.id
                  ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <tab.icon size={18} />
              {tab.label}
            </button>
          ))}
        </div>

        <div>
          {activeTab === 'dashboard' && <DashboardTab />}
        </div>
      </div>
    </div>
  );
};

export default InventoryTracker;