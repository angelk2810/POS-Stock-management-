import React, { useState, useEffect, useRef } from 'react';
import { Category, Product, Variant, GSTRates } from '../types';
import { Sparkles, Info, X, Package, Tags, DollarSign, Warehouse, Sliders } from 'lucide-react';
import { useModalEffects } from './modalUtils';

interface ProductFormProps {
  categories: Category[];
  onSubmit: (product: Product) => void;
  onCancel: () => void;
  initialProduct?: Product;
}

export const ProductForm: React.FC<ProductFormProps> = ({
  categories,
  onSubmit,
  onCancel,
  initialProduct,
}) => {
  const containerRef = useRef<HTMLFormElement>(null);
  useModalEffects({ onClose: onCancel, containerRef });

  // Select initial category
  const defaultCategory = initialProduct?.categoryId || categories[0]?.id || '';
  const [categoryId, setCategoryId] = useState(defaultCategory);
  
  // Basic Info States
  const [name, setName] = useState(initialProduct?.name || '');
  const [sku, setSku] = useState(
    initialProduct?.sku || initialProduct?.variants?.[0]?.sku || ''
  );
  const [sellingPrice, setSellingPrice] = useState<number>(
    initialProduct?.sellingPrice || initialProduct?.variants?.[0]?.price || 0
  );
  const [costPrice, setCostPrice] = useState<number>(
    initialProduct?.costPrice || initialProduct?.variants?.[0]?.costPrice || 0
  );
  const [stock, setStock] = useState<number>(
    initialProduct?.stock !== undefined 
      ? initialProduct.stock 
      : (initialProduct?.variants?.[0]?.stock !== undefined ? initialProduct.variants[0].stock : 0)
  );
  const [minimumStock, setMinimumStock] = useState<number>(
    initialProduct?.minimumStock !== undefined
      ? initialProduct.minimumStock
      : (initialProduct?.variants?.[0]?.lowStockThreshold !== undefined ? initialProduct.variants[0].lowStockThreshold : 5)
  );

  // Dynamic specifications state
  const [attributesValues, setAttributesValues] = useState<Record<string, any>>(() => {
    return initialProduct?.attributes || initialProduct?.variants?.[0]?.attrValues || {};
  });

  // Automatically update dynamic spec forms when category changes
  const selectedCategory = categories.find(c => c.id === categoryId);

  useEffect(() => {
    if (selectedCategory) {
      // Retain existing values for matching attributes, initialize others
      const newAttrValues: Record<string, any> = {};
      selectedCategory.attributes.forEach(attr => {
        if (attributesValues[attr.name] !== undefined) {
          newAttrValues[attr.name] = attributesValues[attr.name];
        } else {
          newAttrValues[attr.name] = attr.type === 'boolean' ? false : '';
        }
      });
      setAttributesValues(newAttrValues);
    }
  }, [categoryId]);

  const handleAttrChange = (attrName: string, value: any) => {
    setAttributesValues(prev => ({
      ...prev,
      [attrName]: value,
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!categoryId) return;

    // Build product matching the precise Phase 3 requested flat data structure,
    // plus keep a fallback single-item variants list for full system compatibility.
    const productToSubmit: Product = {
      id: initialProduct?.id || 'P-' + Math.random().toString(36).substr(2, 6).toUpperCase(),
      categoryId,
      name: name.trim(),
      hsnCode: initialProduct?.hsnCode || '8544',
      gstRates: initialProduct?.gstRates || { cgst: 9, sgst: 9, igst: 18 },
      
      // Flat Attributes
      sku: sku.trim(),
      sellingPrice,
      costPrice,
      stock,
      minimumStock,
      attributes: attributesValues,

      // Downstream compatibility fallback
      variants: [
        {
          sku: sku.trim(),
          attrValues: attributesValues,
          price: sellingPrice,
          costPrice,
          stock,
          lowStockThreshold: minimumStock,
        },
      ],
    };

    onSubmit(productToSubmit);
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
        className="bg-[var(--surface)] border border-[var(--border-default)] w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-2xl p-6 sm:p-8 shadow-xl space-y-6 text-slate-800"
      >
        <div className="flex justify-between items-center pb-4 border-b border-[var(--border-subtle)]">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl">
              <Package className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-[24px] font-bold text-slate-900 tracking-tight">
                {initialProduct ? 'Edit ERP Product Record' : 'Register New ERP Product'}
              </h2>
              <p className="text-slate-500 text-[13px] mt-0.5">
                Configure details, pricing, stock rules, and dynamic category specifications.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="p-1.5 hover:bg-slate-100 hover:text-slate-900 rounded-md text-slate-400 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {categories.length === 0 ? (
          <div className="text-center py-10 space-y-4">
            <div className="bg-amber-50 border border-amber-200 text-amber-900 p-5 rounded-2xl inline-block text-left text-base max-w-lg">
              <h3 className="font-bold flex items-center gap-1.5 text-amber-800">
                ⚠️ Setup Required: No Categories Found
              </h3>
              <p className="text-sm text-amber-700 mt-2 leading-relaxed">
                You must define at least one Category template first. Products are structurally governed by Category specifications, which will dynamically generate custom catalog fields inside this form.
              </p>
            </div>
            <div className="flex justify-center gap-2">
              <button
                type="button"
                onClick={onCancel}
                className="px-6 py-2.5.5 hover:bg-slate-50 transition-colors rounded-xl border border-slate-200 text-slate-600 font-bold text-sm shadow-sm"
              >
                Go Back to Catalog
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Section 1: Basic Information */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-slate-800 font-bold text-base pb-2 border-b border-[var(--border-subtle)]">
                <Tags className="w-5 h-5 text-blue-600" />
                <span>Basic Information</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-bold uppercase text-slate-500 tracking-wider">
                    Product Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    required
                    placeholder="e.g. Crompton Aura Fan..."
                    className="w-full bg-[var(--app-bg)] border border-[var(--border-default)] rounded-lg p-2.5 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-[13px] outline-none shadow-sm font-medium text-slate-800 transition-all"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-[11px] font-bold uppercase text-slate-500 tracking-wider">
                    SKU Code / Barcode <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={sku}
                    onChange={e => setSku(e.target.value)}
                    required
                    placeholder="e.g. CAF-WH-1200..."
                    className="w-full bg-[var(--app-bg)] border border-[var(--border-default)] rounded-lg p-2.5 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-[13px] outline-none shadow-sm font-medium tracking-wide text-slate-800 transition-all"
                  />
                </div>

                <div className="space-y-1.5 md:col-span-2">
                  <label className="block text-[11px] font-bold uppercase text-slate-500 tracking-wider">
                    Category Assignment <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={categoryId}
                    onChange={e => setCategoryId(e.target.value)}
                    required
                    className="w-full bg-[var(--app-bg)] border border-[var(--border-default)] rounded-lg p-2.5 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-[13px] outline-none font-medium text-slate-700 cursor-pointer transition-all"
                  >
                    {categories.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.code})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Section 2: Pricing & Valuation */}
            <div className="space-y-4 pt-2">
              <div className="flex items-center gap-2 text-slate-800 font-bold text-base pb-2 border-b border-[var(--border-subtle)]">
                <DollarSign className="w-5 h-5 text-blue-600" />
                <span>Pricing & Costing</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-bold uppercase text-slate-500 tracking-wider">
                    Selling Price (₹) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={sellingPrice}
                    onChange={e => setSellingPrice(Math.max(0, Number(e.target.value)))}
                    required
                    className="w-full bg-[var(--app-bg)] border border-[var(--border-default)] rounded-lg p-2.5 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-[13px] outline-none font-bold text-blue-600 shadow-sm transition-all"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-[11px] font-bold uppercase text-slate-500 tracking-wider">
                    Cost Price (₹) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={costPrice}
                    onChange={e => setCostPrice(Math.max(0, Number(e.target.value)))}
                    required
                    className="w-full bg-[var(--app-bg)] border border-[var(--border-default)] rounded-lg p-2.5 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-[13px] outline-none font-medium text-slate-700 shadow-sm transition-all"
                  />
                </div>
              </div>
            </div>

            {/* Section 3: Stock Management */}
            <div className="space-y-4 pt-2">
              <div className="flex items-center gap-2 text-slate-800 font-bold text-base pb-2 border-b border-[var(--border-subtle)]">
                <Warehouse className="w-5 h-5 text-blue-600" />
                <span>ERP Stock Control</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-bold uppercase text-slate-500 tracking-wider">
                    Current Stock Quantity <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={stock}
                    onChange={e => setStock(Math.max(0, parseInt(e.target.value) || 0))}
                    required
                    className="w-full bg-[var(--app-bg)] border border-[var(--border-default)] rounded-lg p-2.5 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-[13px] outline-none font-medium text-slate-700 shadow-sm transition-all"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-[11px] font-bold uppercase text-slate-500 tracking-wider">
                    Minimum Stock (Low Stock Threshold) <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      min="0"
                      value={minimumStock}
                      onChange={e => setMinimumStock(Math.max(0, parseInt(e.target.value) || 0))}
                      required
                      className="w-full bg-[var(--app-bg)] border border-[var(--border-default)] rounded-lg p-2.5 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-[13px] outline-none font-medium text-slate-700 shadow-sm transition-all"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Section 4: Dynamic Category Specifications */}
            <div className="bg-[var(--app-bg)] border border-[var(--border-default)] rounded-xl p-5 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-[var(--border-subtle)]">
                <div className="flex items-center gap-2 text-slate-800 font-bold text-base">
                  <Sliders className="w-5 h-5 text-blue-600" />
                  <span>Category-driven Specifications</span>
                </div>
                <span className="text-[10px] bg-blue-50 border border-blue-100 text-blue-600 font-bold px-2.5 py-0.5 rounded-md uppercase tracking-wider">
                  {selectedCategory?.name} Specifications
                </span>
              </div>

              {selectedCategory?.attributes && selectedCategory.attributes.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {selectedCategory.attributes.map(attr => (
                    <div key={attr.name} className="space-y-1.5 animate-in fade-in duration-300">
                      <label className="block text-[11px] font-bold uppercase text-slate-500 tracking-wide">
                        {attr.name} {attr.required && <span className="text-rose-500">*</span>}
                      </label>
                      
                      {attr.type === 'select' || (attr.type as string) === 'dropdown' ? (
                        <select
                          value={attributesValues[attr.name] || ''}
                          onChange={e => handleAttrChange(attr.name, e.target.value)}
                          required={attr.required}
                          className="w-full bg-[var(--app-bg)] border border-[var(--border-default)] rounded-lg p-2.5 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-[13px] outline-none font-medium cursor-pointer shadow-sm"
                        >
                          <option value="">Select option...</option>
                          {attr.options?.map(opt => (
                            <option key={opt} value={opt}>
                              {opt}
                            </option>
                          ))}
                        </select>
                      ) : attr.type === 'boolean' ? (
                        <div className="flex items-center h-[42px]">
                          <label className="flex items-center gap-3 cursor-pointer bg-[var(--surface)] border border-[var(--border-default)] rounded-lg px-4 py-2.5 text-[13px] font-medium select-none hover:border-slate-300 transition-colors w-full shadow-sm">
                            <input
                              type="checkbox"
                              checked={!!attributesValues[attr.name]}
                              onChange={e => handleAttrChange(attr.name, e.target.checked)}
                              className="rounded border-[var(--border-default)] text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
                            />
                            <span className="text-slate-700">Yes / Enabled</span>
                          </label>
                        </div>
                      ) : (
                        <input
                          type={attr.type === 'number' ? 'number' : 'text'}
                          value={attributesValues[attr.name] !== undefined ? attributesValues[attr.name] : ''}
                          onChange={e => {
                            const val = attr.type === 'number' ? (e.target.value === '' ? '' : Number(e.target.value)) : e.target.value;
                            handleAttrChange(attr.name, val);
                          }}
                          required={attr.required}
                          placeholder={`Enter ${attr.name.toLowerCase()}...`}
                          className="w-full bg-[var(--app-bg)] border border-[var(--border-default)] rounded-lg p-2.5 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-[13px] outline-none shadow-sm"
                        />
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-5 text-slate-400 text-sm italic flex items-center justify-center gap-1.5">
                  <Info className="w-5 h-5 text-slate-300" />
                  <span>The selected template has no dynamic specifications. To create custom specifications (e.g. sweep size, gauge, wattage), edit this Category template in the Categories tab.</span>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 pt-5 border-t border-[var(--border-default)]">
              <button
                type="button"
                onClick={onCancel}
                className="px-6 py-2.5 rounded-lg border border-[var(--border-default)] hover:bg-slate-50 transition-colors font-bold text-slate-600 text-[13px] shadow-sm"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-6 py-2.5 rounded-lg bg-blue-600 text-white font-bold hover:bg-blue-700 transition-all shadow-sm text-[13px]"
              >
                {initialProduct ? 'Update Product Record' : 'Save Product'}
              </button>
            </div>
          </>
        )}
      </form>
    </div>
  );
};
