import React, { useState, useRef } from 'react';
import { Product, MovementType, StockMovement } from '../types';
import { useModalEffects } from './modalUtils';

interface StockMovementModalProps {
  products: Product[];
  onSubmit: (movement: Partial<StockMovement>) => void;
  onCancel: () => void;
}

export const StockMovementModal: React.FC<StockMovementModalProps> = ({ products, onSubmit, onCancel }) => {
  const [type, setType] = useState<MovementType>('IN');
  const [selectedProductId, setSelectedProductId] = useState('');
  const [selectedSku, setSelectedSku] = useState('');
  const [qty, setQty] = useState(1);
  const [reason, setReason] = useState('');

  const containerRef = useRef<HTMLFormElement>(null);
  useModalEffects({ onClose: onCancel, containerRef });

  const selectedProduct = products.find(p => p.id === selectedProductId);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProductId || !selectedSku) return;
    onSubmit({
      productId: selectedProductId,
      variantSku: selectedSku,
      type,
      qty,
      reason,
      timestamp: new Date().toISOString(),
    });
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onCancel();
    }
  };

  return (
    <div 
      onClick={handleBackdropClick}
      className="fixed inset-0 bg-slate-950/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm overflow-y-auto"
    >
      <form 
        ref={containerRef}
        onSubmit={handleSubmit} 
        onClick={e => e.stopPropagation()}
        className="bg-[var(--surface)] border border-[var(--border-default)] rounded-2xl w-full max-w-lg p-6 sm:p-8 shadow-xl space-y-5 text-slate-800"
      >
        <h2 className="text-[24px] font-bold text-slate-900 tracking-tight pb-2 border-b border-[var(--border-subtle)]">Record Stock Movement</h2>
        
        <div className="grid grid-cols-3 gap-1 bg-[var(--app-bg)] p-1 rounded-lg border border-[var(--border-default)]">
          {(['IN', 'OUT', 'ADJUST'] as MovementType[]).map(t => (
            <button
              key={t}
              type="button"
              onClick={() => setType(t)}
              className={`py-2 rounded-md font-bold text-[13px] tracking-wide transition-colors ${
                type === t 
                  ? 'bg-[var(--surface)] text-blue-600 shadow-sm' 
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-[11px] font-bold uppercase text-slate-500 tracking-wider mb-1.5">Select Product</label>
            <select 
              value={selectedProductId} 
              onChange={e => { setSelectedProductId(e.target.value); setSelectedSku(''); }}
              required 
              className="w-full bg-[var(--app-bg)] border border-[var(--border-default)] rounded-lg p-2.5 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-[13px] outline-none shadow-sm cursor-pointer"
            >
              <option value="">Choose product Catalog...</option>
              {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>

          {selectedProduct && (
            <div>
              <label className="block text-[11px] font-bold uppercase text-slate-500 tracking-wider mb-1.5">Select Variant SKU</label>
              <select 
                value={selectedSku} 
                onChange={e => setSelectedSku(e.target.value)} 
                required 
                className="w-full bg-[var(--app-bg)] border border-[var(--border-default)] rounded-lg p-2.5 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-[13px] outline-none shadow-sm cursor-pointer"
              >
                <option value="">Choose variant SKU...</option>
                {selectedProduct.variants.map(v => <option key={v.sku} value={v.sku}>{v.sku} (Available: {v.stock})</option>)}
              </select>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-bold uppercase text-slate-500 tracking-wider mb-1.5">Quantity</label>
              <input type="number" min="1" value={qty} onChange={e => setQty(Number(e.target.value))} required className="w-full bg-[var(--app-bg)] border border-[var(--border-default)] rounded-lg p-2.5 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-[13px] outline-none shadow-sm" />
            </div>
            <div>
              <label className="block text-[11px] font-bold uppercase text-slate-500 tracking-wider mb-1.5">Reference ID (Opt)</label>
              <input type="text" placeholder="PO# / Receipt#" className="w-full bg-[var(--app-bg)] border border-[var(--border-default)] rounded-lg p-2.5 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-[13px] outline-none shadow-sm" />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold uppercase text-slate-500 tracking-wider mb-1.5">Reason Note</label>
            <textarea value={reason} onChange={e => setReason(e.target.value)} required className="w-full bg-[var(--app-bg)] border border-[var(--border-default)] rounded-lg p-2.5 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 h-24 text-[13px] outline-none resize-none shadow-sm" placeholder="Enter details..."></textarea>
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <button type="button" onClick={onCancel} className="flex-1 py-2.5 rounded-lg border border-[var(--border-default)] hover:bg-[var(--app-bg)] transition-colors font-bold text-slate-600 text-[13px] cursor-pointer shadow-sm">Cancel</button>
          <button type="submit" className="flex-1 py-2.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 font-bold transition-colors shadow-sm text-[13px] cursor-pointer">Save Update</button>
        </div>
      </form>
    </div>
  );
};
