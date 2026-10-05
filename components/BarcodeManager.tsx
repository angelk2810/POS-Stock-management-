import React, { useState, useMemo, useRef } from 'react';
import { Product, Category } from '../types';
import { 
  Barcode, Printer, Settings, LayoutGrid, Check, Search, Grid, HelpCircle
} from 'lucide-react';

interface BarcodeManagerProps {
  products: Product[];
  categories: Category[];
}

export const BarcodeManager: React.FC<BarcodeManagerProps> = ({ products, categories }) => {
  const [selectedSku, setSelectedSku] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [printQty, setPrintQty] = useState<number>(12);
  const [columnsCount, setColumnsCount] = useState<number>(4);
  const [storeName, setStoreName] = useState<string>('ELECTRASTOCK');
  
  // Custom display option states
  const [showStoreName, setShowStoreName] = useState<boolean>(true);
  const [showPrice, setShowPrice] = useState<boolean>(true);
  const [showSkuCode, setShowSkuCode] = useState<boolean>(true);
  const [labelSize, setLabelSize] = useState<'STANDARD' | 'COMPACT' | 'JEWELRY'>('STANDARD');

  // Collect flat variants list
  const flatVariants = useMemo(() => {
    const list: Array<{
      prodId: string;
      prodName: string;
      sku: string;
      price: number;
      barcodeValue: string;
      category: string;
    }> = [];

    products.forEach(p => {
      const catObj = categories.find(c => c.id === p.categoryId);
      p.variants.forEach(v => {
        list.push({
          prodId: p.id,
          prodName: p.name,
          sku: v.sku,
          price: v.price,
          barcodeValue: String(v.attrValues?.Barcode || v.sku).trim().toUpperCase(),
          category: catObj ? `${catObj.name} (${catObj.code})` : 'General'
        });
      });
    });

    return list;
  }, [products, categories]);

  // Set default selection
  useMemo(() => {
    if (!selectedSku && flatVariants.length > 0) {
      setSelectedSku(flatVariants[0].sku);
    }
  }, [flatVariants, selectedSku]);

  // Filter products list
  const filteredVariants = useMemo(() => {
    return flatVariants.filter(v => 
      v.prodName.toLowerCase().includes(searchQuery.toLowerCase()) || 
      v.sku.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [flatVariants, searchQuery]);

  // Find active variant matching selectedSku
  const activeVariant = useMemo(() => {
    return flatVariants.find(v => v.sku === selectedSku);
  }, [flatVariants, selectedSku]);

  // NATIVE VECTOR BARCODE GENERATING FUNCTION
  // Translate a string into a dynamic series of white/black bar lines (visual hash)
  const renderSvgBarcode = (code: string) => {
    // Basic pseudo Code 128 / Code 39 line widths hash generator
    const hash = Array.from(code).reduce((acc, char) => acc + char.charCodeAt(0).toString(2), '11011');
    const fullPattern = "110100101011" + hash.slice(-24) + "11011001011"; // Add start/stop framing
    
    const barWidth = 2;
    const totalBars = fullPattern.length;
    const height = 45;
    
    const lines: React.ReactNode[] = [];
    let curX = 5;

    for (let i = 0; i < totalBars; i++) {
      if (fullPattern[i] === '1') {
        lines.push(
          <rect key={i} x={curX} y={0} width={barWidth} height={height} fill="#000000" />
        );
      }
      curX += barWidth;
    }

    const svgWidth = curX + 5;

    return (
      <svg className="mx-auto" width="100%" height={height} viewBox={`0 0 ${svgWidth} ${height}`} preserveAspectRatio="xMinYMin meet">
        <rect x={0} y={0} width={svgWidth} height={height} fill="#ffffff" />
        {lines}
      </svg>
    );
  };

  // Trigger browser print flow
  const handlePrintLabel = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow || !activeVariant) return;

    const labelsHtml = Array.from({ length: printQty }).map(() => `
      <div class="label-box ${labelSize.toLowerCase()}">
        ${showStoreName ? `<div class="store-hdr">${storeName}</div>` : ''}
        <div class="prod-nm">${activeVariant.prodName}</div>
        <div class="barcode-vector">
          ${renderSvgBarcodeHtml(activeVariant.barcodeValue)}
        </div>
        ${showSkuCode ? `<div class="sku-num">${activeVariant.barcodeValue}</div>` : ''}
        ${showPrice ? `<div class="price-tag">M.R.P. ₹${activeVariant.price.toLocaleString(undefined, { minimumFractionDigits: 0 })}</div>` : ''}
      </div>
    `).join('');

    const colsGrid = columnsCount;

    printWindow.document.write(`
      <html>
        <head>
          <title>Print Labels: ${activeVariant.sku}</title>
          <style>
            @media print {
              body { margin: 0; padding: 0; background-color: #ffffff; }
              @page { margin: 0.2cm; }
            }
            body {
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
              margin: 20px;
              color: black;
            }
            .labels-grid {
              display: grid;
              grid-template-columns: repeat(${colsGrid}, 1fr);
              gap: 12px;
              justify-items: center;
            }
            .label-box {
              border: 1px dashed #ccc;
              border-radius: 4px;
              padding: 10px;
              text-align: center;
              background-color: #ffffff;
              width: 175px;
              box-sizing: border-box;
              page-break-inside: avoid;
            }
            .label-box.compact {
              width: 135px;
              padding: 6px;
            }
            .label-box.jewelry {
              width: 250px;
              padding: 4px;
              display: flex;
              align-items: center;
              justify-content: space-around;
            }
            .store-hdr {
              font-size: 8px;
              font-weight: 900;
              letter-spacing: 1px;
              margin-bottom: 2px;
              text-transform: uppercase;
              color: #555;
            }
            .prod-nm {
              font-size: 9px;
              font-weight: 700;
              margin-bottom: 4px;
              white-space: nowrap;
              overflow: hidden;
              text-overflow: ellipsis;
            }
            .sku-num {
              font-family: monospace;
              font-size: 8px;
              color: #444;
              margin: 2px 0;
              letter-spacing: 0.5px;
            }
            .barcode-vector svg {
              max-height: 38px;
              width: 100%;
            }
            .price-tag {
              font-size: 11px;
              font-weight: 850;
              margin-top: 3px;
              color: #000;
            }
          </style>
        </head>
        <body onload="window.print(); window.close();">
          <div class="labels-grid">
            ${labelsHtml}
          </div>
        </body>
      </html>
    `);
    
    printWindow.document.close();
  };

  // Auxiliary barcode string mapping for inline printed documents
  const renderSvgBarcodeHtml = (code: string) => {
    const hash = Array.from(code).reduce((acc, char) => acc + char.charCodeAt(0).toString(2), '11011');
    const fullPattern = "110100101011" + hash.slice(-24) + "11011001011";
    
    const barWidth = 1.5;
    const totalBars = fullPattern.length;
    const height = 30;
    
    let rects = '';
    let curX = 5;

    for (let i = 0; i < totalBars; i++) {
      if (fullPattern[i] === '1') {
        rects += `<rect x="${curX}" y="0" width="${barWidth}" height="${height}" fill="#000000" />\n`;
      }
      curX += barWidth;
    }

    const svgWidth = curX + 5;

    return `
      <svg style="margin: 0 auto;" width="100%" height="${height}" viewBox="0 0 ${svgWidth} ${height}">
        <rect x="0" y="0" width="${svgWidth}" height="${height}" fill="#ffffff" />
        ${rects}
      </svg>
    `;
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      
      {/* Target SKU Selecting panel */}
      <div className="lg:col-span-5 bg-[var(--surface)] border border-[var(--border-default)] rounded-3xl p-5 shadow-sm space-y-4 flex flex-col h-[580px]">
        <div>
          <h3 className="font-bold text-[14px] text-slate-900 uppercase tracking-wider flex items-center gap-2">
            <LayoutGrid className="w-5 h-5 text-slate-400" />
            <span>Select Catalog Variant</span>
          </h3>
          <p className="text-[11px] text-slate-500 mt-1">Choose the SKU variant model you want to print labels for.</p>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search items by Name or SKU..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full bg-[var(--app-bg)] border border-[var(--border-default)] rounded-xl pl-9 pr-3 py-2 text-[13px] font-medium outline-none focus:bg-[var(--surface)] focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-slate-800 shadow-sm transition-colors"
          />
        </div>

        <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 custom-scrollbar">
          {filteredVariants.map(v => (
            <button
              key={v.sku}
              onClick={() => setSelectedSku(v.sku)}
              className={`w-full p-3 rounded-2xl border text-left transition-colors relative flex flex-col justify-between cursor-pointer ${
                selectedSku === v.sku 
                  ? 'bg-blue-50/70 border-blue-200 shadow-sm' 
                  : 'bg-[var(--surface)] border-[var(--border-default)] hover:bg-[var(--app-bg)]'
              }`}
            >
              <div className="flex justify-between items-start gap-2">
                <span className="font-bold text-[13px] text-slate-900 line-clamp-1 flex-1">{v.prodName}</span>
                {selectedSku === v.sku && (
                  <span className="bg-blue-600 text-white rounded-full p-0.5 shrink-0 shadow-sm">
                    <Check className="w-2.5 h-2.5" />
                  </span>
                )}
              </div>
              
              <div className="flex justify-between items-end mt-2">
                <div className="text-[9px] font-mono text-blue-600 tracking-wider uppercase font-bold">{v.sku}</div>
                <div className="text-[13px] font-bold text-slate-800">₹{v.price.toLocaleString()}</div>
              </div>
            </button>
          ))}
          {filteredVariants.length === 0 && (
            <div className="text-center py-12 text-slate-400 text-[13px] font-semibold">
              No matching SKUs found.
            </div>
          )}
        </div>
      </div>

      {/* Barcode Parameters & Visual Preview Grid */}
      <div className="lg:col-span-7 bg-[var(--surface)] border border-[var(--border-default)] rounded-3xl p-5 shadow-sm space-y-6 flex flex-col justify-between h-[580px] overflow-y-auto">
        
        {activeVariant ? (
          <>
            {/* Upper Config settings */}
            <div className="space-y-4">
              <div className="flex justify-between items-start border-b border-[var(--border-subtle)] pb-3">
                <div>
                  <h3 className="font-bold text-[14px] text-slate-900 uppercase flex items-center gap-2 tracking-wide">
                    <Barcode className="w-5 h-5 text-blue-600" />
                    <span>Barcode Sheet Constructor</span>
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-1">Customize barcode variables and label outputs dynamically.</p>
                </div>
                <span className="text-[10px] bg-[var(--app-bg)] border border-[var(--border-default)] text-slate-500 font-bold px-4 py-1.5 rounded-full uppercase font-mono tracking-wider shadow-sm">
                  Active SKU: {activeVariant.sku}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-bold uppercase text-slate-500 tracking-wider">Loom label text logo:</label>
                  <input
                    type="text"
                    value={storeName}
                    onChange={e => setStoreName(e.target.value)}
                    className="w-full bg-[var(--app-bg)] border border-[var(--border-default)] focus:bg-[var(--surface)] focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-xl px-4 py-1.5 text-[13px] font-medium text-slate-800 outline-none shadow-sm transition-colors"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-[11px] font-bold uppercase text-slate-500 tracking-wider">Number of stickers to generate:</label>
                  <input
                    type="number"
                    value={printQty}
                    onChange={e => setPrintQty(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full bg-[var(--app-bg)] border border-[var(--border-default)] focus:bg-[var(--surface)] focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-xl px-4 py-1.5 text-[13px] font-medium text-slate-800 outline-none shadow-sm transition-colors text-center"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-[11px] font-bold uppercase text-slate-500 tracking-wider">Grid layout formatting:</label>
                  <select
                    value={columnsCount}
                    onChange={e => setColumnsCount(parseInt(e.target.value))}
                    className="w-full bg-[var(--app-bg)] border border-[var(--border-default)] focus:bg-[var(--surface)] focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-xl px-4 py-2 text-[13px] font-medium text-slate-800 outline-none cursor-pointer shadow-sm transition-colors"
                  >
                    <option value={2}>2 across (Big text barcode)</option>
                    <option value={3}>3 across (Standard multi-label)</option>
                    <option value={4}>4 across (Medium spacing)</option>
                    <option value={5}>5 across (Dense sticker sheets)</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-[11px] font-bold uppercase text-slate-500 tracking-wider">Sticker template size:</label>
                  <select
                    value={labelSize}
                    onChange={e => setLabelSize(e.target.value as any)}
                    className="w-full bg-[var(--app-bg)] border border-[var(--border-default)] focus:bg-[var(--surface)] focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-xl px-4 py-2 text-[13px] font-medium text-slate-800 outline-none cursor-pointer shadow-sm transition-colors"
                  >
                    <option value="STANDARD">Standard Labels (50mm x 25mm)</option>
                    <option value="COMPACT">Compact Strips (38mm x 25mm)</option>
                    <option value="JEWELRY">Jewelry Wing Tag Format</option>
                  </select>
                </div>

              </div>

              {/* Toggle values checks */}
              <div className="bg-[var(--app-bg)] p-4 border border-[var(--border-default)] rounded-2xl space-y-2.5 shadow-sm">
                <span className="text-[11px] uppercase font-bold text-slate-500 tracking-wider">Include Metadata Elements</span>
                <div className="flex flex-wrap gap-4">
                  <label className="flex items-center gap-1.5 text-[13px] text-slate-700 font-medium select-none cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={showStoreName} 
                      onChange={e => setShowStoreName(e.target.checked)} 
                      className="rounded text-blue-600 w-4 h-4 cursor-pointer"
                    />
                    <span>Store Name Logo</span>
                  </label>

                  <label className="flex items-center gap-1.5 text-[13px] text-slate-700 font-medium select-none cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={showPrice} 
                      onChange={e => setShowPrice(e.target.checked)} 
                      className="rounded text-blue-600 w-4 h-4 cursor-pointer"
                    />
                    <span>Selling Retail Price (M.R.P.)</span>
                  </label>

                  <label className="flex items-center gap-1.5 text-[13px] text-slate-700 font-medium select-none cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={showSkuCode} 
                      onChange={e => setShowSkuCode(e.target.checked)} 
                      className="rounded text-blue-600 w-4 h-4 cursor-pointer"
                    />
                    <span>Print text SKU string</span>
                  </label>
                </div>
              </div>
            </div>

            {/* Live Label Sandbox Preview */}
            <div className="space-y-2 border-t border-[var(--border-subtle)] pt-4 flex-1 flex flex-col justify-center min-h-[160px]">
              <span className="text-[11px] uppercase font-bold text-slate-500 tracking-wider block text-center">Live Preview Sandbox (Original size)</span>
              
              <div className="bg-[var(--app-bg)] border border-[var(--border-default)] border-dashed rounded-3xl p-4 flex items-center justify-center">
                <div className="bg-white border border-slate-300 rounded-lg p-3 text-center w-48 shadow-sm">
                  {showStoreName && <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{storeName}</div>}
                  <div className="text-[13px] font-bold text-slate-800 tracking-tight whitespace-nowrap overflow-hidden text-ellipsis px-1">{activeVariant.prodName}</div>
                  <div className="my-2">{renderSvgBarcode(activeVariant.barcodeValue)}</div>
                  {showSkuCode && <div className="text-[10px] font-mono text-slate-500 font-bold uppercase tracking-wider">{activeVariant.barcodeValue}</div>}
                  {showPrice && <div className="text-[14px] font-extrabold text-slate-900 mt-1">₹{activeVariant.price.toLocaleString()}</div>}
                </div>
              </div>
            </div>

            {/* Print Action Row */}
            <div className="pt-3 border-t border-[var(--border-subtle)] flex justify-between items-center gap-3 shrink-0">
              <div className="flex items-center gap-1">
                <HelpCircle className="w-4 h-4 text-slate-400" />
                <span className="text-[11px] font-medium text-slate-500">Printed labels will display pixel-perfect vector lanes automatically.</span>
              </div>
              <button
                type="button"
                onClick={handlePrintLabel}
                className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm active:scale-[0.98] font-bold px-6 py-2 rounded-xl text-[13px] transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>Print Sticker Sheets</span>
              </button>
            </div>
          </>
        ) : (
          <div className="text-center m-auto text-slate-500 font-semibold py-12">
            Add products first to load the barcode manager layout.
          </div>
        )}

      </div>
    </div>
  );
};
