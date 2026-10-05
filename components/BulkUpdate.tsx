import React, { useState, useMemo } from 'react';
import { Product, Category, Variant, StockMovement, AuditLog } from '../types';
import { 
  Folder, DollarSign, ArrowUpRight, Search, Check, AlertCircle, Save, Sliders, TrendingUp, Sparkles, CheckCircle
} from 'lucide-react';

interface BulkUpdateProps {
  products: Product[];
  categories: Category[];
  setProducts: React.Dispatch<React.SetStateAction<Product[]>>;
  setMovements: React.Dispatch<React.SetStateAction<StockMovement[]>>;
  setAuditLogs: React.Dispatch<React.SetStateAction<AuditLog[]>>;
}

export const BulkUpdate: React.FC<BulkUpdateProps> = ({
  products, categories, setProducts, setMovements, setAuditLogs
}) => {
  const [filterCatId, setFilterCatId] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  
  // Batch adjustments parameters
  const [adjustField, setAdjustField] = useState<'price' | 'costPrice' | 'lowStockThreshold'>('price');
  const [adjType, setAdjType] = useState<'PERCENT' | 'FLAT'>('PERCENT');
  const [adjDirection, setAdjDirection] = useState<'INC' | 'DEC'>('INC');
  const [adjValue, setAdjValue] = useState<string>('');

  // Local grid edits before save
  const [editedGrid, setEditedGrid] = useState<Record<string, { price: number; costPrice: number; stock: number; lowStockThreshold: number }>>({});
  const [isSavedDone, setIsSavedDone] = useState<boolean>(false);
  const [feedbackMsg, setFeedbackMsg] = useState<string>('');

  // Collect flat view of product-variants
  const flatVariantsItems = useMemo(() => {
    const list: Array<{
      prodId: string;
      prodName: string;
      catName: string;
      catId: string;
      sku: string;
      specs: Record<string, any>;
      // original values
      price: number;
      costPrice: number;
      stock: number;
      lowStockThreshold: number;
    }> = [];

    products.forEach(p => {
      const cat = categories.find(c => c.id === p.categoryId);
      p.variants.forEach(v => {
        list.push({
          prodId: p.id,
          prodName: p.name,
          catId: p.categoryId,
          catName: cat ? `${cat.name} (${cat.code})` : 'General Wares',
          sku: v.sku,
          specs: v.attrValues || {},
          price: v.price,
          costPrice: v.costPrice,
          stock: v.stock,
          lowStockThreshold: v.lowStockThreshold
        });
      });
    });

    return list;
  }, [products, categories]);

  // Filter items
  const filteredItems = useMemo(() => {
    return flatVariantsItems.filter(item => {
      const matchCat = filterCatId === 'ALL' || item.catId === filterCatId;
      const matchSearch = item.prodName.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          item.sku.toLowerCase().includes(searchQuery.toLowerCase());
      return matchCat && matchSearch;
    });
  }, [flatVariantsItems, filterCatId, searchQuery]);

  // Execute mass batch modifications (Local overrides first)
  const applyBatchAdjustment = () => {
    const value = parseFloat(adjValue);
    if (isNaN(value) || value <= 0) {
      setFeedbackMsg('Specify a valid postive adjustment number.');
      return;
    }

    const currentUpdates = { ...editedGrid };
    let count = 0;

    filteredItems.forEach(item => {
      count++;
      const currentVal = currentUpdates[item.sku] || {
        price: item.price,
        costPrice: item.costPrice,
        stock: item.stock,
        lowStockThreshold: item.lowStockThreshold
      };

      let baseValue = currentVal[adjustField];
      let delta = 0;

      if (adjType === 'PERCENT') {
        delta = baseValue * (value / 100);
      } else {
        delta = value;
      }

      if (adjDirection === 'DEC') {
        delta = -delta;
      }

      const rawResult = baseValue + delta;
      // Guarantee threshold and prices are always >=0
      let finalVal = Math.max(0, parseFloat(rawResult.toFixed(2)));
      if (adjustField === 'lowStockThreshold') {
        finalVal = Math.max(0, Math.round(rawResult));
      }

      currentUpdates[item.sku] = {
        ...currentVal,
        [adjustField]: finalVal
      };
    });

    setEditedGrid(currentUpdates);
    setFeedbackMsg(`Previewing massive batch updates for ${count} items. Click "Commit Grid Changes" below to write directly to inventory database.`);
  };

  // Set individual cell updates
  const handleCellEdit = (sku: string, field: 'price' | 'costPrice' | 'stock' | 'lowStockThreshold', val: string, baseValue: number) => {
    let parsed = parseFloat(val);
    if (isNaN(parsed) || parsed < 0) {
      parsed = 0;
    }
    const current = editedGrid[sku] || {
      price: flatVariantsItems.find(i => i.sku === sku)?.price || 0,
      costPrice: flatVariantsItems.find(i => i.sku === sku)?.costPrice || 0,
      stock: flatVariantsItems.find(i => i.sku === sku)?.stock || 0,
      lowStockThreshold: flatVariantsItems.find(i => i.sku === sku)?.lowStockThreshold || 0
    };

    setEditedGrid(prev => ({
      ...prev,
      [sku]: {
        ...current,
        [field]: parsed
      }
    }));
  };

  // Save the massive adjustments out to main state trackers
  const saveBulkChanges = () => {
    const keysCount = Object.keys(editedGrid).length;
    if (keysCount === 0) {
      setFeedbackMsg('No parameters modified. Double check edits.');
      return;
    }

    let logsAdded: StockMovement[] = [];
    let updatedProducts = products.map(p => {
      let isChanged = false;
      const updatedVariants = p.variants.map(v => {
        const edits = editedGrid[v.sku];
        if (edits) {
          isChanged = true;
          const prevVal = v.stock;
          const newVal = edits.stock;
          
          if (prevVal !== newVal) {
            logsAdded.push({
              id: `mov_${Math.random().toString(36).substr(2, 9)}`,
              timestamp: new Date().toISOString(),
              productId: p.id,
              variantSku: v.sku,
              type: newVal > prevVal ? 'IN' : 'OUT',
              qty: Math.abs(newVal - prevVal),
              reason: `Bulk Update Grid Override: Adjust stock from ${prevVal} to ${newVal}`,
              userId: 'Manager (Bulk Edit)'
            });
          }

          return {
            ...v,
            price: edits.price,
            costPrice: edits.costPrice,
            stock: edits.stock,
            lowStockThreshold: edits.lowStockThreshold
          };
        }
        return v;
      });

      if (isChanged) {
        return { ...p, variants: updatedVariants };
      }
      return p;
    });

    setProducts(updatedProducts);
    
    if (logsAdded.length > 0) {
      setMovements(prev => [...prev, ...logsAdded]);
    }

    // Append audits log
    const auditObj: AuditLog = {
      id: `audit_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
      userId: 'Admin (System)',
      action: 'BULK_UPDATE',
      details: `Bulk Update Committed: Adjust values and specifications for ${keysCount} inventory product matches.`
    };
    setAuditLogs(prev => [auditObj, ...prev]);

    setEditedGrid({});
    setIsSavedDone(true);
    setFeedbackMsg(`Success! Successfully finalized updates on ${keysCount} SKUs directly.`);
    setTimeout(() => setIsSavedDone(false), 4000);
  };

  const clearEditsGrid = () => {
    setEditedGrid({});
    setFeedbackMsg('Reset current pending grid overrides.');
  };

  return (
    <div className="space-y-6">
      
      {/* Upper Title banner */}
      <div className="bg-[var(--surface)] border border-[var(--border-default)] rounded-3xl p-6 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-blue-600" />
            <span>Master Inventory Bulk Update Tool</span>
          </h2>
          <p className="text-slate-500 text-[13px] mt-1">
            Perform enterprise-grade mass updates to price sheets or stock counts. Perfect for seasonal markdowns, supplier cost audits, or annual stock audits.
          </p>
        </div>
      </div>

      {feedbackMsg && (
        <div className={`border p-4 rounded-xl flex items-center gap-2.5 shadow-xs bg-blue-50 text-blue-700 border border-blue-200/60 shadow-xs`}>
          <AlertCircle className="w-5 h-5 text-blue-500 shrink-0" />
          <span className="text-sm font-bold">{feedbackMsg}</span>
        </div>
      )}

      {isSavedDone && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-4 rounded-xl flex items-center gap-2.5">
          <CheckCircle className="w-5 h-5 text-emerald-600 animate-bounce" />
          <span className="text-sm font-bold">Successfully saved changes to enterprise inventory records!</span>
        </div>
      )}

      {/* Control Actions Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        
        {/* Filtering & Live Searching Subsections */}
        <div className="lg:col-span-4 bg-[var(--surface)] border border-[var(--border-default)] rounded-3xl p-5 shadow-sm space-y-4">
          <h3 className="font-bold text-[13px] text-slate-500 uppercase tracking-wider flex items-center gap-1.5 border-b border-[var(--border-subtle)] pb-2">
            <Sliders className="w-4 h-4 text-slate-400" />
            <span>Filter Operational Target</span>
          </h3>

          <div className="space-y-3">
            <div className="space-y-1.5">
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">Category Template filter:</label>
              <select
                value={filterCatId}
                onChange={e => setFilterCatId(e.target.value)}
                className="w-full bg-[var(--app-bg)] border border-[var(--border-default)] rounded-xl px-4 py-2 text-[13px] font-medium text-slate-700 focus:bg-[var(--surface)] focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none shadow-sm cursor-pointer"
              >
                <option value="ALL">All Categories</option>
                {categories.map(c => (
                  <option key={c.id} value={c.id}>{c.name} ({c.code})</option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">Search items:</label>
              <div className="relative">
                <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Filter by Name or SKU..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full bg-[var(--app-bg)] border border-[var(--border-default)] rounded-xl pl-9 pr-3 py-2 text-[13px] font-medium text-slate-800 outline-none focus:bg-[var(--surface)] focus:border-blue-500 focus:ring-1 focus:ring-blue-500 shadow-sm"
                />
              </div>
            </div>
            
            <div className="p-3 bg-blue-50 border border-blue-100 text-blue-800 rounded-xl text-[11px] leading-relaxed shadow-sm">
              <strong>Query Match Alert:</strong> Currently targeted <strong>{filteredItems.length} SKUs</strong> out of your overall item database variants. Actions completed below apply exclusively to these matching records.
            </div>
          </div>
        </div>

        {/* Global Batch Action Operations */}
        <div className="lg:col-span-8 bg-[var(--surface)] border border-[var(--border-default)] rounded-3xl p-5 shadow-sm space-y-4">
          <h3 className="font-bold text-[13px] text-slate-500 uppercase tracking-wider flex items-center gap-1.5 border-b border-[var(--border-subtle)] pb-2">
            <Sparkles className="w-4 h-4 text-blue-600" />
            <span>Run Mass Value Multipliers</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            
            <div className="space-y-1.5">
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">Parameter field target:</label>
              <select
                value={adjustField}
                onChange={e => setAdjustField(e.target.value as any)}
                className="w-full bg-[var(--app-bg)] border border-[var(--border-default)] rounded-xl px-4 py-2 text-[13px] font-medium text-slate-700 cursor-pointer outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 shadow-sm"
              >
                <option value="price">Selling Prices (₹)</option>
                <option value="costPrice">Buying/Purchase Cost (₹)</option>
                <option value="lowStockThreshold">Min Stock Threshold</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">Adjustment operator:</label>
              <div className="grid grid-cols-2 gap-1.5 bg-[var(--app-bg)] p-1 rounded-xl border border-[var(--border-default)] shadow-sm">
                <button
                  type="button"
                  onClick={() => setAdjType('PERCENT')}
                  className={`py-1 rounded-lg text-[13px] font-bold transition-colors cursor-pointer ${
                    adjType === 'PERCENT' ? 'bg-[var(--surface)] text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  Percent (%)
                </button>
                <button
                  type="button"
                  onClick={() => setAdjType('FLAT')}
                  className={`py-1 rounded-lg text-[13px] font-bold transition-colors cursor-pointer ${
                    adjType === 'FLAT' ? 'bg-[var(--surface)] text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  Flat (₹)
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">Direction:</label>
              <div className="grid grid-cols-2 gap-1.5 bg-[var(--app-bg)] p-1 rounded-xl border border-[var(--border-default)] shadow-sm">
                <button
                  type="button"
                  onClick={() => setAdjDirection('INC')}
                  className={`py-1 rounded-lg text-[13px] font-bold transition-colors cursor-pointer ${
                    adjDirection === 'INC' ? 'bg-[var(--surface)] text-emerald-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  Increase (+)
                </button>
                <button
                  type="button"
                  onClick={() => setAdjDirection('DEC')}
                  className={`py-1 rounded-lg text-[13px] font-bold transition-colors cursor-pointer ${
                    adjDirection === 'DEC' ? 'bg-[var(--surface)] text-rose-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  Decrease (-)
                </button>
              </div>
            </div>

            <div className="space-y-1.5 sm:col-span-2">
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">Adjustment Value amount:</label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <span className="absolute left-3.5 top-2.5 text-[13px] text-slate-400 font-bold">
                    {adjType === 'PERCENT' ? '%' : '₹'}
                  </span>
                  <input
                    type="number"
                    step="any"
                    placeholder="e.g. 5 or 100"
                    value={adjValue}
                    onChange={e => setAdjValue(e.target.value)}
                    className="w-full bg-[var(--app-bg)] border border-[var(--border-default)] rounded-xl pl-8 pr-3 py-2 text-[13px] font-medium text-slate-800 outline-none focus:bg-[var(--surface)] focus:border-blue-500 focus:ring-1 focus:ring-blue-500 shadow-sm"
                  />
                </div>
                <button
                  type="button"
                  onClick={applyBatchAdjustment}
                  className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm active:scale-[0.98] transition-colors font-bold px-6 py-2 rounded-xl text-[13px] cursor-pointer shrink-0"
                >
                  Apply to Preview List
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Grid Sheet Display */}
      <div className="bg-[var(--surface)] border border-[var(--border-default)] rounded-3xl p-6 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div>
            <h4 className="text-[14px] font-bold text-slate-900 uppercase tracking-wide">Operational Work Log Panel ({filteredItems.length} items matched)</h4>
            <p className="text-[11px] text-slate-500 mt-0.5">Modifications highlighted below are held in local memory. Commit to database when done.</p>
          </div>
          {Object.keys(editedGrid).length > 0 && (
            <div className="flex gap-2 text-[13px] font-bold">
              <button
                type="button"
                onClick={clearEditsGrid}
                className="bg-[var(--app-bg)] hover:bg-rose-50 border border-[var(--border-default)] hover:border-rose-200 text-slate-600 hover:text-rose-600 px-4 py-2 rounded-xl transition-colors shadow-sm cursor-pointer"
              >
                Reset Changes ({Object.keys(editedGrid).length})
              </button>
              <button
                type="button"
                onClick={saveBulkChanges}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-5 py-2 rounded-xl transition-colors shadow-sm flex items-center gap-1.5 cursor-pointer"
              >
                <Save className="w-4 h-4" />
                <span>Commit Grid Changes</span>
              </button>
            </div>
          )}
        </div>

        <div className="border border-[var(--border-default)] rounded-2xl overflow-hidden bg-[var(--surface)] max-h-96 overflow-y-auto shadow-sm">
          <table className="w-full text-left border-collapse">
            <thead className="bg-[var(--app-bg)] text-slate-500 text-[11px] uppercase font-bold tracking-wider border-b border-[var(--border-default)]">
              <tr>
                <th className="px-4 py-3 text-center">Row</th>
                <th className="px-4 py-3">Product Name</th>
                <th className="px-4 py-3">SKU Code</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3 text-right">Buying Price (₹)</th>
                <th className="px-4 py-3 text-right">Selling Price (₹)</th>
                <th className="px-4 py-3 text-center">Current Stock</th>
                <th className="px-4 py-3 text-center">Reorder Limit</th>
                <th className="px-4 py-3 text-right">Draft Margin (%)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-subtle)] text-[13px] font-mono">
              {filteredItems.map((item, idx) => {
                const draft = editedGrid[item.sku] || {
                  price: item.price,
                  costPrice: item.costPrice,
                  stock: item.stock,
                  lowStockThreshold: item.lowStockThreshold
                };

                const isCostChanged = draft.costPrice !== item.costPrice;
                const isPriceChanged = draft.price !== item.price;
                const isStockChanged = draft.stock !== item.stock;
                const isThresholdChanged = draft.lowStockThreshold !== item.lowStockThreshold;

                const profit = draft.price - draft.costPrice;
                const profitMargin = draft.price > 0 ? (profit / draft.price) * 100 : 0;

                return (
                  <tr key={item.sku} className="hover:bg-[var(--app-bg)] transition-colors">
                    <td className="px-4 py-2.5 text-center text-slate-400 font-bold">{idx + 1}</td>
                    <td className="px-4 py-2.5">
                      <div className="font-semibold text-slate-800 font-sans">{item.prodName}</div>
                      <div className="text-[11px] text-slate-500 font-medium mt-0.5">
                        {Object.entries(item.specs).map(([k, v]) => `${k}:${v}`).join(', ') || 'No custom specs'}
                      </div>
                    </td>
                    <td className="px-4 py-2.5 font-bold text-slate-700 uppercase">{item.sku}</td>
                    <td className="px-4 py-2.5 font-sans font-medium text-slate-500">{item.catName}</td>
                    
                    <td className="px-4 py-2.5 text-right">
                      <input
                        type="number"
                        step="any"
                        value={draft.costPrice}
                        onChange={e => handleCellEdit(item.sku, 'costPrice', e.target.value, item.costPrice)}
                        className={`text-right px-2 py-1 rounded-md border outline-none font-bold text-[13px] w-24 focus:ring-1 focus:ring-blue-500 transition-colors shadow-sm ${
                          isCostChanged ? 'bg-amber-50 border-amber-300 text-amber-800' : 'bg-[var(--app-bg)] border-[var(--border-default)] focus:bg-[var(--surface)] text-slate-800'
                        }`}
                      />
                    </td>

                    <td className="px-4 py-2.5 text-right">
                      <input
                        type="number"
                        step="any"
                        value={draft.price}
                        onChange={e => handleCellEdit(item.sku, 'price', e.target.value, item.price)}
                        className={`text-right px-2 py-1 rounded-md border outline-none font-bold text-[13px] w-24 focus:ring-1 focus:ring-blue-500 transition-colors shadow-sm ${
                          isPriceChanged ? 'bg-amber-50 border-amber-300 text-amber-800' : 'bg-[var(--app-bg)] border-[var(--border-default)] focus:bg-[var(--surface)] text-slate-800'
                        }`}
                      />
                    </td>

                    <td className="px-4 py-2.5 text-center">
                      <input
                        type="number"
                        value={draft.stock}
                        onChange={e => handleCellEdit(item.sku, 'stock', e.target.value, item.stock)}
                        className={`text-center px-2 py-1 rounded-md border outline-none font-bold text-[13px] w-20 focus:ring-1 focus:ring-blue-500 transition-colors shadow-sm ${
                          isStockChanged ? 'bg-emerald-50 border-emerald-300 text-emerald-800' : 'bg-[var(--app-bg)] border-[var(--border-default)] focus:bg-[var(--surface)] text-slate-800'
                        }`}
                      />
                    </td>

                    <td className="px-4 py-2.5 text-center">
                      <input
                        type="number"
                        value={draft.lowStockThreshold}
                        onChange={e => handleCellEdit(item.sku, 'lowStockThreshold', e.target.value, item.lowStockThreshold)}
                        className={`text-center px-2 py-1 rounded-md border outline-none font-bold text-[13px] w-20 focus:ring-1 focus:ring-blue-500 transition-colors shadow-sm ${
                          isThresholdChanged ? 'bg-purple-50 border-purple-300 text-purple-800' : 'bg-[var(--app-bg)] border-[var(--border-default)] focus:bg-[var(--surface)] text-slate-800'
                        }`}
                      />
                    </td>

                    <td className={`px-4 py-2.5 text-right font-bold font-sans text-[13px] ${
                      profitMargin < 0 ? 'text-rose-600' : profitMargin < 12 ? 'text-amber-600' : 'text-emerald-600'
                    }`}>
                      {profitMargin.toFixed(1)}%
                    </td>
                  </tr>
                );
              })}
              {filteredItems.length === 0 && (
                <tr>
                  <td colSpan={9} className="text-center py-12 text-slate-400 font-bold">
                    No products matching filter queries found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
