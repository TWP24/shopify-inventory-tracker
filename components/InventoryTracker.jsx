import React, { useState, useEffect } from 'react';
import { Calendar, Package, TrendingDown, DollarSign, Bell, Plus, Settings, RefreshCw } from 'lucide-react';

const InventoryTracker = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [products, setProducts] = useState([]);
  const [forecasts, setForecasts] = useState({});
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

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

  const updateProduct = async (productId, updates) => {
    try {
      const response = await fetch(`/api/products/${productId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });
      
      if (response.ok) {
        fetchProducts();
      }
    } catch (error) {
      console.error('Error updating product:', error);
    }
  };

  const saveForecast = async (productId, forecastData) => {
    try {
      const forecasts = Object.entries(forecastData).map(([day, sales]) => {
        const date = new Date();
        date.setDate(date.getDate() + parseInt(day));
        
        return {
          product_id: productId,
          forecast_date: date.toISOString().split('T')[0],
          forecasted_sales: sales
        };
      });

      await fetch('/api/forecasts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(forecasts)
      });

      alert('Forecast saved successfully!');
    } catch (error) {
      console.error('Error saving forecast:', error);
      alert('Error saving forecast');
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
    const dailySales = product.daily_avg_sales || 1;
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
      status: reorderDay <= 3 ? 'warning' : 'normal'
    };
  };

  const calculateFutureInventory = (product, days) => {
    const inventory = [];
    let currentLevel = product.current_stock;
    
    for (let i = 0; i <= days; i++) {
      const date = new Date();
      date.setDate(date.getDate() + i);
      
      const sales = product.daily_avg_sales || 1;
      currentLevel = Math.max(0, currentLevel - sales);
      
      inventory.push({
        date: date.toLocaleDateString(),
        level: Math.round(currentLevel * 10) / 10,
        sales: Math.round(sales * 10) / 10
      });
    }
    
    return inventory;
  };

  const DashboardTab = () => (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Inventory Dashboard</h2>
        <button
          onClick={syncShopify}
          disabled={syncing}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:bg-gray-400"
        >
          <RefreshCw size={16} className={syncing ? 'animate-spin' : ''} />
          {syncing ? 'Syncing...' : 'Sync Shopify'}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-blue-50 p-4 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total SKUs</p>
              <p className="text-2xl font-bold">{products.length}</p>
            </div>
            <Package className="text-blue-500" size={32} />
          </div>
        </div>
        
        <div className="bg-red-50 p-4 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Low Stock Items</p>
              <p className="text-2xl font-bold">
                {products.filter(p => p.current_stock <= p.reorder_point).length}
              </p>
            </div>
            <TrendingDown className="text-red-500" size={32} />
          </div>
        </div>
        
        <div className="bg-green-50 p-4 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Inventory Value</p>
              <p className="text-2xl font-bold">
                ${products.reduce((sum, p) => sum + (p.current_stock * p.cogs), 0).toFixed(2)}
              </p>
            </div>
            <DollarSign className="text-green-500" size={32} />
          </div>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-8">Loading products...</div>
      ) : products.length === 0 ? (
        <div className="text-center py-8 bg-white border rounded-lg">
          <p className="text-gray-600 mb-4">No products found. Sync with Shopify to get started.</p>
          <button
            onClick={syncShopify}
            className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700"
          >
            Sync Now
          </button>
        </div>
      ) : (
        <div className="bg-white border rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">SKU</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Stock</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Avg Daily Sales</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Days Until Stockout</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Reorder Date</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {products.map(product => {
                  const daysUntilStockout = calculateDaysUntilStockout(product);
                  const reorderInfo = calculateReorderDate(product);
                  const isLowStock = product.current_stock <= product.reorder_point;
                  
                  return (
                    <tr key={product.id} className={isLowStock ? 'bg-red-50' : ''}>
                      <td className="px-4 py-3 text-sm font-medium">{product.sku}</td>
                      <td className="px-4 py-3 text-sm">{product.name}</td>
                      <td className="px-4 py-3 text-sm font-bold">{product.current_stock}</td>
                      <td className="px-4 py-3 text-sm">{product.daily_avg_sales?.toFixed(1) || '0.0'}</td>
                      <td className="px-4 py-3 text-sm">{daysUntilStockout} days</td>
                      <td className="px-4 py-3 text-sm">{reorderInfo.date.toLocaleDateString()}</td>
                      <td className="px-4 py-3 text-sm">
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          reorderInfo.status === 'urgent' ? 'bg-red-200 text-red-800' :
                          reorderInfo.status === 'warning' ? 'bg-yellow-200 text-yellow-800' :
                          'bg-green-200 text-green-800'
                        }`}>
                          {reorderInfo.status === 'urgent' ? 'Reorder Now' :
                           reorderInfo.status === 'warning' ? 'Reorder Soon' : 'OK'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <button
                          onClick={() => {
                            setSelectedProduct(product);
                            setActiveTab('calendar');
                          }}
                          className="text-blue-600 hover:text-blue-800 mr-2"
                        >
                          View
                        </button>
                        {isLowStock && (
                          <button
                            onClick={() => sendAlert(product, 'low')}
                            className="text-orange-600 hover:text-orange-800"
                          >
                            <Bell size={16} className="inline" />
                          </button>
                        )}
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
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Shopify Inventory Tracker</h1>
          <p className="text-gray-600">Connected to Supabase • Ready for production</p>
        </div>

        <div className="mb-6 flex gap-2 border-b overflow-x-auto">
          {[
            { id: 'dashboard', label: 'Dashboard', icon: Package }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 flex items-center gap-2 ${
                activeTab === tab.id
                  ? 'border-b-2 border-blue-600 text-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
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
