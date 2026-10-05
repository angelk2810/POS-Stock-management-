import React, { useState, useMemo } from 'react';
import { Product, StockMovement, AuditLog } from '../types';
import { 
  History, ArrowDownLeft, ArrowUpRight, Search, Plus, Calendar, AlertCircle, Info
} from 'lucide-react';
import { DateFilter, PresetKey, getPresetDateBounds } from './DateFilter';

interface StockMovementLogProps {
  products: Product[];
  movements: StockMovement[];
  setProducts: React.Dispatch<React.SetStateAction<Product[]>>;
  setMovements: React.Dispatch<React.SetStateAction<StockMovement[]>>;
  setAuditLogs: React.Dispatch<React.SetStateAction<AuditLog[]>>;
}

export const StockMovementLog: React.FC<StockMovementLogProps> = ({
  products, movements, setProducts, setMovements, setAuditLogs
}) => {
  const [filterType, setFilterType] = useState<'ALL' | 'IN' | 'OUT'>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  
  // Date filter states
  const [datePreset, setDatePreset] = useState<string>('ALL');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Create Manual Adjustment form states
  const [showAddForm, setShowAddForm] = useState<boolean>(false);
  const [targetSku, setTargetSku] = useState<string>('');
  const [adjQty, setAdjQty] = useState<string>('');
  const [adjType, setAdjType] = useState<'IN' | 'OUT'>('IN');
  const [reason, setReason] = useState<string>('');
  const [formErr, setFormErr] = useState<string>('');

  // Date frame bounding memo
  const activeDateRange = useMemo(() => {
    return getPresetDateBounds(datePreset as PresetKey, startDate, endDate);
  }, [datePreset, startDate, endDate]);

  // Collect flat list of all SKUs for the dropdown
  const allSkus = useMemo(() => {
    const list: Array<{ sku: string; prodName: string; currentStock: number }> = [];
    products.forEach(p => {
      p.variants.forEach(v => {
        list.push({
          sku: v.sku,
          prodName: `${p.name} (${v.sku})`,
          currentStock: v.stock
        });
      });
    });
    return list;
  }, [products]);

  // Set default target sku
  useMemo(() => {
    if (!targetSku && allSkus.length > 0) {
      setTargetSku(allSkus[0].sku);
    }
  }, [allSkus, targetSku]);

  // Filtered movements list
  const filteredMovements = useMemo(() => {
    // Sort reverse chronological
    const sorted = [...movements].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    
    return sorted.filter(m => {
      const matchType = filterType === 'ALL' || m.type === filterType;
      
      // Match Product name or SKU code
      const prod = products.find(p => p.id === m.productId);
      const prodName = prod?.name || '';
      
      const matchSearch = m.variantSku.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          prodName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          m.reason.toLowerCase().includes(searchQuery.toLowerCase());
      
      let matchDate = true;
      if (activeDateRange) {
        const t = new Date(m.timestamp);
        matchDate = t >= activeDateRange.start && t <= activeDateRange.end;
      }

      return matchType && matchSearch && matchDate;
    });
  }, [movements, products, filterType, searchQuery, activeDateRange]);

  // Submit manual stock adjustment
  const handleAddMovement = (e: React.FormEvent) => {
    e.preventDefault();
    setFormErr('');

    const qty = parseInt(adjQty);
    if (isNaN(qty) || qty <= 0) {
      setFormErr('Please specify a positive adjustment quantity.');
      return;
    }

    const selectedItem = allSkus.find(s => s.sku === targetSku);
    if (!selectedItem) {
      setFormErr('Selected invalid SKU variant.');
      return;
    }

    if (adjType === 'OUT' && selectedItem.currentStock < qty) {
      setFormErr(`Insufficient stock! Cannot deduct ${qty} units from current stock of ${selectedItem.currentStock} units.`);
      return;
    }

    // Identify target product
    const prod = products.find(p => p.variants.some(v => v.sku === targetSku));
    if (!prod) {
      setFormErr('Product parent not found for variant.');
      return;
    }

    // Update main products state
    setProducts(prevProducts => {
      return prevProducts.map(p => {
        if (p.id === prod.id) {
          const updatedVariants = p.variants.map(v => {
            if (v.sku === targetSku) {
              const delta = adjType === 'IN' ? qty : -qty;
              return { ...v, stock: Math.max(0, v.stock + delta) };
            }
            return v;
          });
          return { ...p, variants: updatedVariants };
        }
        return p;
      });
    });

    // Append movement log
    const movementId = `mov_${Math.random().toString(36).substr(2, 9)}`;
    const newMovement: StockMovement = {
      id: movementId,
      timestamp: new Date().toISOString(),
      productId: prod.id,
      variantSku: targetSku,
      type: adjType,
      qty,
      reason: reason.trim() || 'Manual inventory adjustment entry.',
      userId: 'Warehouse Manager'
    };

    setMovements(prev => [...prev, newMovement]);

    // Append Audit Trail
    const auditObj: AuditLog = {
      id: `audit_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
      userId: 'Warehouse Manager',
      action: adjType === 'IN' ? 'STOCK_IN' : 'STOCK_OUT',
      details: `Manual stock change entered for SKU ${targetSku}: ${adjType === 'IN' ? '+' : '-'}${qty} units (Reason: ${newMovement.reason})`
    };
    setAuditLogs(prev => [auditObj, ...prev]);

    // Reset Form
    setAdjQty('');
    setReason('');
    setShowAddForm(false);
  };

  return (
    <div className="space-y-6">
      
      {/* Upper header action log */}
      <div className="bg-[var(--surface)] border border-[var(--border-default)] rounded-3xl p-6 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <History className="w-5 h-5 text-blue-600" />
            <span>Operational Stock Movement Ledger</span>
          </h2>
          <p className="text-slate-500 text-[13px] mt-1">
            Browse and query comprehensive transaction logs tracking physical assets, purchase invoices inwards, and point of sale checkout outward releases.
          </p>
        </div>
        {!showAddForm && (
          <button
            onClick={() => setShowAddForm(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm active:scale-[0.98] font-bold px-5 py-2.5 rounded-xl transition-colors flex items-center gap-1.5 text-[13px] cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add Manual Transaction</span>
          </button>
        )}
      </div>

      {/* Manual Transaction Input Form */}
      {showAddForm && (
        <form onSubmit={handleAddMovement} className="bg-[var(--surface)] border border-blue-200 rounded-3xl p-6 shadow-sm space-y-4 animate-in slide-in-from-top-4 duration-300">
          <div className="border-b border-blue-100 pb-3 flex justify-between items-center">
            <h3 className="font-bold text-blue-900 text-[13px] uppercase tracking-wider">Log Manual Stock Adjustment</h3>
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="text-slate-400 hover:text-slate-600 text-[13px] font-bold"
            >
              Cancel
            </button>
          </div>

          {formErr && (
            <div className="bg-rose-50 border border-rose-200 p-3.5 rounded-xl text-rose-800 text-sm font-bold flex items-center gap-2">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <span>{formErr}</span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            
            <div className="space-y-1.5">
              <label className="block text-[11px] font-bold uppercase text-slate-500 tracking-wider">Select Variant SKU Code:</label>
              <select
                value={targetSku}
                onChange={e => setTargetSku(e.target.value)}
                className="w-full bg-[var(--app-bg)] border border-[var(--border-default)] focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-xl px-4 py-2 text-[13px] font-medium text-slate-700 outline-none cursor-pointer shadow-sm"
              >
                {allSkus.map(s => (
                  <option key={s.sku} value={s.sku}>{s.prodName} [Current Stock: {s.currentStock}]</option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="block text-[11px] font-bold uppercase text-slate-500 tracking-wider">Movement Direction Type:</label>
              <div className="grid grid-cols-2 gap-1 bg-[var(--app-bg)] p-1 rounded-xl border border-[var(--border-default)]">
                <button
                  type="button"
                  onClick={() => setAdjType('IN')}
                  className={`py-1.5 rounded-lg text-[11px] font-bold uppercase transition-colors cursor-pointer flex items-center justify-center gap-1 ${
                    adjType === 'IN' ? 'bg-[var(--surface)] text-emerald-600 shadow-sm' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Inward (+)
                </button>
                <button
                  type="button"
                  onClick={() => setAdjType('OUT')}
                  className={`py-1.5 rounded-lg text-[11px] font-bold uppercase transition-colors cursor-pointer flex items-center justify-center gap-1 ${
                    adjType === 'OUT' ? 'bg-[var(--surface)] text-rose-600 shadow-sm' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Outward (-)
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-[11px] font-bold uppercase text-slate-500 tracking-wider">Stickers quantity count:</label>
              <input
                type="number"
                placeholder="e.g. 10"
                value={adjQty}
                onChange={e => setAdjQty(e.target.value)}
                className="w-full bg-[var(--app-bg)] border border-[var(--border-default)] focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-xl px-4 py-2 text-[13px] font-medium text-slate-800 outline-none shadow-sm"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-[11px] font-bold uppercase text-slate-500 tracking-wider">Reason reference / remarks:</label>
              <input
                type="text"
                placeholder="e.g. Stock audit variance, damage audit"
                value={reason}
                onChange={e => setReason(e.target.value)}
                className="w-full bg-[var(--app-bg)] border border-[var(--border-default)] focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-xl px-4 py-2 text-[13px] font-medium text-slate-800 outline-none shadow-sm"
                required
              />
            </div>

          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="submit"
              className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm active:scale-[0.98] transition-colors font-bold px-6 py-2 rounded-xl text-[13px] cursor-pointer"
            >
              Post Adjustment Log Entry
            </button>
          </div>
        </form>
      )}

      {/* Constraints Filter and Query area */}
      <div className="bg-[var(--surface)] border border-[var(--border-default)] rounded-3xl p-5 shadow-sm flex flex-col gap-4">
        <DateFilter
          preset={datePreset as PresetKey}
          startDateStr={startDate}
          endDateStr={endDate}
          onChange={(newPreset, start, end) => {
            setDatePreset(newPreset);
            setStartDate(start);
            setEndDate(end);
          }}
          onReset={() => {
            setDatePreset('ALL');
            setStartDate('');
            setEndDate('');
          }}
          allowAllTime={true}
        />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
          <div className="relative md:col-span-2">
            <Search className="absolute left-3.5 top-2.5 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search transaction logs by Variant SKU, product title, or remarks..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full bg-[var(--app-bg)] border border-[var(--border-default)] rounded-xl pl-10 pr-4 py-2 text-[13px] font-medium outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 shadow-sm text-slate-800"
            />
          </div>

          <div className="grid grid-cols-3 gap-1 bg-[var(--app-bg)] p-1 rounded-xl border border-[var(--border-default)]">
            <button
              type="button"
              onClick={() => setFilterType('ALL')}
              className={`py-1.5 rounded-lg text-[13px] font-bold transition-colors cursor-pointer ${
                filterType === 'ALL' ? 'bg-[var(--surface)] text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              All Logs
            </button>
            <button
              type="button"
              onClick={() => setFilterType('IN')}
              className={`py-1.5 rounded-lg text-[13px] font-bold transition-colors cursor-pointer ${
                filterType === 'IN' ? 'bg-[var(--surface)] text-emerald-600 shadow-sm' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Inward Add (+)
            </button>
            <button
              type="button"
              onClick={() => setFilterType('OUT')}
              className={`py-1.5 rounded-lg text-[13px] font-bold transition-colors cursor-pointer ${
                filterType === 'OUT' ? 'bg-[var(--surface)] text-rose-600 shadow-sm' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Outward Deduct (-)
            </button>
          </div>
        </div>
      </div>

      {/* Movement List Sheet Grid */}
      <div className="bg-[var(--surface)] border border-[var(--border-default)] rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-[var(--app-bg)] border-b border-[var(--border-default)] text-slate-500 text-[11px] uppercase font-bold tracking-wider select-none">
              <tr>
                <th className="px-5 py-4">Timestamp</th>
                <th className="px-5 py-4">Variant SKU</th>
                <th className="px-5 py-4">Product Name</th>
                <th className="px-5 py-4 text-center">Velocity Direction</th>
                <th className="px-5 py-4 text-center">Quantity Traded</th>
                <th className="px-5 py-4">Trigger Remark / Reason</th>
                <th className="px-5 py-4">Operator</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-subtle)] text-[13px] font-medium text-slate-800">
              {filteredMovements.map(m => {
                const prod = products.find(p => p.id === m.productId);
                return (
                  <tr key={m.id} className="hover:bg-[var(--app-bg)] transition-colors">
                    <td className="px-5 py-3 font-mono text-slate-500 text-[11px]">
                      {new Date(m.timestamp).toLocaleString()}
                    </td>
                    <td className="px-5 py-3 font-mono font-bold text-slate-700 uppercase tracking-wider">
                      {m.variantSku}
                    </td>
                    <td className="px-5 py-3 font-bold text-slate-900">
                      {prod?.name || 'Unknown Electrical Goods'}
                    </td>
                    <td className="px-5 py-3 text-center">
                      <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-md text-[11px] font-bold uppercase shadow-sm ${
                        m.type === 'IN' 
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                          : 'bg-rose-50 text-rose-700 border border-rose-200'
                      }`}>
                        {m.type === 'IN' ? (
                          <>
                            <ArrowUpRight className="w-3.5 h-3.5 text-emerald-500" />
                            <span>Inward Stock</span>
                          </>
                        ) : (
                          <>
                            <ArrowDownLeft className="w-3.5 h-3.5 text-rose-500" />
                            <span>Outward POS</span>
                          </>
                        )}
                      </span>
                    </td>
                    <td className={`px-5 py-3 text-center font-mono font-bold text-[14px] ${
                      m.type === 'IN' ? 'text-emerald-600' : 'text-rose-600'
                    }`}>
                      {m.type === 'IN' ? '+' : '-'}{m.qty}
                    </td>
                    <td className="px-5 py-3 text-slate-500 italic max-w-xs truncate">
                      "{m.reason}"
                    </td>
                    <td className="px-5 py-3 font-semibold text-slate-600">
                      {m.userId}
                    </td>
                  </tr>
                );
              })}
              {filteredMovements.length === 0 && (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-slate-400 font-bold">
                    No matching stock movement ledger registrations found.
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
