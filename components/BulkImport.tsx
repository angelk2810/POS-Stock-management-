import React, { useState, useMemo, useRef } from 'react';
import { read, utils } from 'xlsx';
import { Product, Category, Variant, StockMovement, AuditLog } from '../types';
import { 
  UploadCloud, Sparkles, CheckCircle, AlertTriangle, X, Play, RefreshCw, FileText, Download, Copy, Clipboard
} from 'lucide-react';

interface BulkImportProps {
  products: Product[];
  categories: Category[];
  setProducts: React.Dispatch<React.SetStateAction<Product[]>>;
  setCategories: React.Dispatch<React.SetStateAction<Category[]>>;
  setMovements: React.Dispatch<React.SetStateAction<StockMovement[]>>;
  setAuditLogs: React.Dispatch<React.SetStateAction<AuditLog[]>>;
}

export const BulkImport: React.FC<BulkImportProps> = ({ 
  products, categories, setProducts, setCategories, setMovements, setAuditLogs 
}) => {
  // Input sources
  const [rawText, setRawText] = useState<string>('');
  const [importTargetCat, setImportTargetCat] = useState<string>('');
  const [isUpdateMode, setIsUpdateMode] = useState<boolean>(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Parsed intermediate states
  const [parsedData, setParsedData] = useState<{ headers: string[]; rows: string[][] } | null>(null);
  const [columnMappings, setColumnMappings] = useState<Record<number, string>>({});
  const [validationGrid, setValidationGrid] = useState<any[]>([]);
  const [importStatusMessage, setImportStatusMessage] = useState<{ type: 'success' | 'refused' | 'info'; text: string } | null>(null);

  // Automatic heuristic mapping
  const runAutoHeuristics = (headers: string[]) => {
    const autoMaps: Record<number, string> = {};
    headers.forEach((h, index) => {
      const lower = h.toLowerCase();
      if (lower.includes('product') || lower.includes('name') || lower.includes('desc') || lower.includes('title')) {
        autoMaps[index] = 'productName';
      } else if (lower.includes('sku') || lower.includes('code') || lower.includes('itemid') || lower.includes('partno')) {
        autoMaps[index] = 'sku';
      } else if (lower.includes('barcode') || lower.includes('upc') || lower.includes('ean')) {
        autoMaps[index] = 'barcode';
      } else if (lower.includes('category') || lower.includes('group') || lower.includes('model')) {
        autoMaps[index] = 'category';
      } else if (lower.includes('purchase') || lower.includes('cost') || lower.includes('buying') || lower.includes('buy')) {
        autoMaps[index] = 'costPrice';
      } else if (lower.includes('selling') || lower.includes('price') || lower.includes('rate') || lower.includes('sell')) {
        autoMaps[index] = 'price';
      } else if (lower.includes('gst') || lower.includes('tax') || lower.includes('vat')) {
        autoMaps[index] = 'gst';
      } else if (lower.includes('stock') || lower.includes('qty') || lower.includes('quantity') || lower.includes('units')) {
        autoMaps[index] = 'stock';
      } else if (lower.includes('reorder') || lower.includes('threshold') || lower.includes('min') || lower.includes('minimum')) {
        autoMaps[index] = 'lowStockThreshold';
      } else {
        autoMaps[index] = `attr:${h}`;
      }
    });
    setColumnMappings(autoMaps);
  };

  // Direct CSV and Spreadsheet Paste Parser
  const handleRawTextParse = () => {
    if (!rawText.trim()) return;

    const lines = rawText.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    if (lines.length === 0) return;

    const isTab = lines[0].includes('\t');
    const separator = isTab ? '\t' : ',';

    const parsedRows = lines.map(line => {
      if (isTab) {
        return line.split('\t').map(it => it.replace(/^["']|["']$/g, '').trim());
      } else {
        const res: string[] = [];
        let cur = '';
        let insideQuote = false;
        for (let i = 0; i < line.length; i++) {
          const char = line[i];
          if (char === '"' || char === "'") {
            insideQuote = !insideQuote;
          } else if (char === ',' && !insideQuote) {
            res.push(cur.trim());
            cur = '';
          } else {
            cur += char;
          }
        }
        res.push(cur.trim());
        return res;
      }
    });

    const headers = parsedRows[0];
    const dataRows = parsedRows.slice(1);

    setParsedData({ headers, rows: dataRows });
    runAutoHeuristics(headers);
    setValidationGrid([]);
    setImportStatusMessage({ type: 'info', text: `Workbook scanned. Configured ${headers.length} headers with ${dataRows.length} data rows. Verify mapping settings.` });
  };

  // Excel (.xlsx) file upload handle
  const handleExcelUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = new Uint8Array(event.target?.result as ArrayBuffer);
        const workbook = read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        
        // Convert to array of arrays to preserve column order
        const rawJson = utils.sheet_to_json<any[]>(worksheet, { header: 1 });
        if (rawJson.length === 0) {
          setImportStatusMessage({ type: 'refused', text: 'Spreadsheet seems to be empty.' });
          return;
        }

        const headers = (rawJson[0] as unknown as any[]).map(h => String(h || '').trim());
        const dataRows = rawJson.slice(1).map((row: any) => {
          // ensure row is aligned with headers
          const aligned: string[] = [];
          for (let i = 0; i < headers.length; i++) {
            const val = row[i];
            aligned.push(val !== undefined && val !== null ? String(val).trim() : '');
          }
          return aligned;
        });

        setParsedData({ headers, rows: dataRows });
        runAutoHeuristics(headers);
        setValidationGrid([]);
        setImportStatusMessage({ type: 'info', text: `Successfully parsed Excel Book: sheet "${sheetName}". Detected ${headers.length} columns and ${dataRows.length} item rows.` });
      } catch (err: any) {
        setImportStatusMessage({ type: 'refused', text: `Failed to read Excel File: ${err.message || err}` });
      }
    };
    reader.readAsArrayBuffer(file);
    // clear input
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Run validation engine
  const runValidation = () => {
    if (!parsedData) return;

    const validationResult: any[] = [];
    
    // Tracking lists for duplicate SKU / barcode detection in the import sheet itself
    const skuSeenInSheet = new Set<string>();
    const barcodeSeenInSheet = new Set<string>();

    parsedData.rows.forEach((row, rowIndex) => {
      const mappedRecord: any = { rowIndex, raw: row, specs: {} };
      
      // Match each column according to the selected mapping schema
      parsedData.headers.forEach((_, colIndex) => {
        const targetField = columnMappings[colIndex];
        if (!targetField) return;
        const val = row[colIndex] || '';

        if (targetField.startsWith('attr:')) {
          const attrKey = targetField.replace('attr:', '');
          mappedRecord.specs[attrKey] = val;
        } else {
          mappedRecord[targetField] = val;
        }
      });

      // Verification errors & warnings lists
      const errors: string[] = [];
      const warnings: string[] = [];

      // 1. Basic properties
      if (!mappedRecord.productName) {
        errors.push('Missing product name identifier');
      }
      
      if (!mappedRecord.sku) {
        errors.push('Missing SKU identifier');
      } else {
        const finalSku = String(mappedRecord.sku).trim().toUpperCase();
        // Check duplicate SKU inside sheet
        if (skuSeenInSheet.has(finalSku)) {
          errors.push(`Duplicate SKU "${finalSku}" detected within the same spreadsheet rows`);
        } else {
          skuSeenInSheet.add(finalSku);
        }
      }

      // 2. Barcode
      if (mappedRecord.barcode) {
        const finalBarcode = String(mappedRecord.barcode).trim().toUpperCase();
        if (barcodeSeenInSheet.has(finalBarcode)) {
          errors.push(`Duplicate Barcode "${finalBarcode}" repeated in other spreadsheet rows`);
        } else {
          barcodeSeenInSheet.add(finalBarcode);
        }

        // Search barcode matches in existing catalog
        const existingBarcodeMatch = products.find(p => 
          p.variants.some(v => String(v.attrValues?.Barcode || v.sku || '').trim().toUpperCase() === finalBarcode)
        );
        if (existingBarcodeMatch && existingBarcodeMatch.variants.some(v => v.sku !== mappedRecord.sku)) {
          errors.push(`Barcode "${finalBarcode}" is already assigned to active product: "${existingBarcodeMatch.name}"`);
        }
      }

      // 3. Numeric conversions
      const costNum = Number(mappedRecord.costPrice);
      const sellNum = Number(mappedRecord.price);
      if (isNaN(costNum) || costNum <= 0) {
        errors.push('Invalid buying/purchase cost price');
      }
      if (isNaN(sellNum) || sellNum <= 0) {
        errors.push('Invalid selling price');
      }
      if (sellNum < costNum) {
        warnings.push('Selling Price is set lower than Buying/Unit cost');
      }

      // 4. Stock volumes
      const stockNum = Number(mappedRecord.stock);
      if (isNaN(stockNum) || stockNum < 0) {
        errors.push('Stock volume count must be a non-negative number');
      }

      // 5. Existing SKU collision and resolution mode
      const existingProduct = products.find(p => p.variants.some(v => v.sku === mappedRecord.sku));
      if (existingProduct) {
        if (isUpdateMode) {
          warnings.push(`SKU matches existing item "${existingProduct.name}". Existing properties and stock count will be merged/updated.`);
          mappedRecord.mode = 'UPDATE';
        } else {
          errors.push(`Duplicate SKU "${mappedRecord.sku}" found in backend database. (Switch mode to updates/appends or assign unique SKU)`);
        }
      } else {
        mappedRecord.mode = 'CREATE';
      }

      mappedRecord.errors = errors;
      mappedRecord.warnings = warnings;
      mappedRecord.status = errors.length > 0 ? 'INVALID' : 'VALID';

      validationResult.push(mappedRecord);
    });

    setValidationGrid(validationResult);
    
    const invalidCount = validationResult.filter(v => v.status === 'INVALID').length;
    if (invalidCount > 0) {
      setImportStatusMessage({ 
        type: 'refused', 
        text: `Validation complete. Found ${validationResult.filter(v => v.status === 'VALID').length} valid rows and ${invalidCount} invalid rows. Please resolve errors in the grid.` 
      });
    } else {
      setImportStatusMessage({ 
        type: 'success', 
        text: `All ${validationResult.length} rows successfully verified and ready for database import!` 
      });
    }
  };

  // Export errors list for correction
  const handleDownloadErrorReport = () => {
    const invalidRows = validationGrid.filter(row => row.status === 'INVALID');
    if (invalidRows.length === 0) return;

    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "Row Number,SKU,Product Name,Conflict Field,Error Descriptions\r\n";

    invalidRows.forEach((row, i) => {
      const rowNum = row.rowIndex + 2; // +1 headers, +1 base 1
      const errsJoined = row.errors.join('; ');
      csvContent += `"${rowNum}","${row.sku || ''}","${row.productName || ''}","${row.errors[0]?.split(' ')[1] || 'Multiple'}","${errsJoined}"\r\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `ElectraStock_Import_Errors_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Commit dynamic loads to actual application state
  const executeValidatedImport = () => {
    const validCommits = validationGrid.filter(v => v.status === 'VALID');
    if (validCommits.length === 0) {
      setImportStatusMessage({ type: 'refused', text: 'Cannot process: Zero valid records to import.' });
      return;
    }

    let updatedProducts = [...products];
    let createdCount = 0;
    let updatedCount = 0;
    let addedMovements: StockMovement[] = [];
    let tempCategories = [...categories];
    let counter = parseInt(localStorage.getItem('es_category_code_counter') || '0', 10);
    tempCategories.forEach(c => {
      if (c.code && c.code.startsWith('CAT-')) {
        const numPart = parseInt(c.code.split('-')[1], 10);
        if (!isNaN(numPart) && numPart > counter) {
          counter = numPart;
        }
      }
    });

    validCommits.forEach(record => {
      const targetCatName = record.category || importTargetCat || 'General Wares';
      let catObj = tempCategories.find(c => c.name.toLowerCase() === targetCatName.toLowerCase());
      
      if (!catObj) {
        const newCatId = `cat_${Math.random().toString(36).substr(2, 9)}`;
        const attrKeys = Object.keys(record.specs).map(k => ({
          name: k,
          type: 'text' as const,
          required: false
        }));
        
        counter++;
        const newCode = `CAT-${String(counter).padStart(4, '0')}`;
        
        catObj = { id: newCatId, code: newCode, name: targetCatName, attributes: attrKeys };
        tempCategories.push(catObj);
      }

      const parsedGstVal = Number(record.gst) || 18;
      const computedGstObj = {
        cgst: parsedGstVal / 2,
        sgst: parsedGstVal / 2,
        igst: parsedGstVal
      };

      const variantSku = record.sku;
      // Also write barcode custom spec if mapped
      const variantSpecs = { ...record.specs };
      if (record.barcode) {
        variantSpecs['Barcode'] = record.barcode;
      }

      const variantObj: Variant = {
        sku: variantSku,
        attrValues: variantSpecs,
        price: Number(record.price),
        costPrice: Number(record.costPrice),
        stock: Number(record.stock),
        lowStockThreshold: Number(record.lowStockThreshold) || 5
      };

      const existingProductIndex = updatedProducts.findIndex(p => p.variants.some(v => v.sku === variantSku));

      if (existingProductIndex >= 0 && isUpdateMode) {
        const clonedProd = { ...updatedProducts[existingProductIndex] };
        clonedProd.variants = clonedProd.variants.map(v => {
          if (v.sku === variantSku) {
            const addedStock = Number(record.stock);
            const finalStock = v.stock + addedStock;
            
            addedMovements.push({
              id: `mov_${Math.random().toString(36).substr(2, 9)}`,
              timestamp: new Date().toISOString(),
              productId: clonedProd.id,
              variantSku: variantSku,
              type: 'IN',
              qty: addedStock,
              reason: `Spreadsheet Import Merge (Stock Added)`,
              userId: 'Admin (ERP)'
            });

            return {
              ...v,
              price: Number(record.price),
              costPrice: Number(record.costPrice),
              stock: finalStock,
              attrValues: { ...v.attrValues, ...variantSpecs }
            };
          }
          return v;
        });

        updatedProducts[existingProductIndex] = clonedProd;
        updatedCount++;
      } else {
        const newProdId = `prod_${Math.random().toString(36).substr(2, 9)}`;
        const brandNewProduct: Product = {
          id: newProdId,
          categoryId: catObj.id,
          name: record.productName,
          hsnCode: '8544',
          gstRates: computedGstObj,
          variants: [variantObj]
        };

        updatedProducts.push(brandNewProduct);
        createdCount++;

        if (variantObj.stock > 0) {
          addedMovements.push({
            id: `mov_${Math.random().toString(36).substr(2, 9)}`,
            timestamp: new Date().toISOString(),
            productId: newProdId,
            variantSku: variantSku,
            type: 'IN',
            qty: variantObj.stock,
            reason: `Initial Stocking: Batch Inventory Import`,
            userId: 'Admin (ERP)'
          });
        }
      }
    });

    localStorage.setItem('es_category_code_counter', String(counter));
    setCategories(tempCategories);
    setProducts(updatedProducts);
    
    if (addedMovements.length > 0) {
      setMovements(prev => [...prev, ...addedMovements]);
    }

    const auditObj: AuditLog = {
      id: `audit_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
      userId: 'Admin',
      action: 'BULK_IMPORT',
      details: `Bulk Import run: Integrated ${createdCount} products, updated stock for ${updatedCount} matches.`
    };
    setAuditLogs(prev => [auditObj, ...prev]);

    setImportStatusMessage({
      type: 'success',
      text: `Import Completed! Inserted ${createdCount} new master products, updated ${updatedCount} existing records.`
    });

    // Clear sandbox values
    setParsedData(null);
    setRawText('');
    setColumnMappings({});
    setValidationGrid([]);
  };

  const handleFixValidationValue = (rowIndex: number, field: string, value: string) => {
    setValidationGrid(prev => prev.map(row => {
      if (row.rowIndex === rowIndex) {
        const updated = { ...row, [field]: value };
        
        // Recalculate
        const errors: string[] = [];
        const warnings: string[] = [];

        if (!updated.productName) errors.push('Missing product name identifier');
        if (!updated.sku) errors.push('Missing unique SKU identifier');

        const costNum = Number(updated.costPrice);
        const sellNum = Number(updated.price);
        if (isNaN(costNum) || costNum <= 0) errors.push('Invalid buying/purchase cost price');
        if (isNaN(sellNum) || sellNum <= 0) errors.push('Invalid selling price');
        if (sellNum < costNum) warnings.push('Selling price is lower than purchase cost');

        const stockNum = Number(updated.stock);
        if (isNaN(stockNum) || stockNum < 0) errors.push('Stock volume count must be non-negative');

        const existingProduct = products.find(p => p.variants.some(v => v.sku === updated.sku));
        if (existingProduct) {
          if (isUpdateMode) {
            warnings.push(`SKU matches existing item "${existingProduct.name}". Overwrite and stock additions verified.`);
            updated.mode = 'UPDATE';
          } else {
            errors.push('SKU collision in database. Enable update toggle or change SKU.');
          }
        } else {
          updated.mode = 'CREATE';
        }

        updated.errors = errors;
        updated.warnings = warnings;
        updated.status = errors.length > 0 ? 'INVALID' : 'VALID';
        return updated;
      }
      return row;
    }));
  };

  const handleSkipImportRow = (rowIndex: number) => {
    setValidationGrid(prev => prev.filter(r => r.rowIndex !== rowIndex));
  };

  const loadSampleData = () => {
    const sample = `Product Name,SKU,Barcode,Category,Purchase Cost,Selling Price,Stock Quantity,Reorder Limit,Sweep Size,Color
Polycab 2.5 Sqmm Wire,PC-2.5-RED,8901234560012,Wires,1450,1850,30,8,2.5mm,Red
Orient Ceiling Fan 1200,OCF-BR-1200,8901234560145,Fans,2200,2950,12,4,1200mm,Brown
Philips Led Bulb 9W,PHB-9W-WH,8901234560981,LED Lighting,110,180,100,20,9W,Cool White`;
    setRawText(sample);
  };

  return (
    <div className="space-y-6">
      
      {/* Upper header */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <UploadCloud className="w-5.5 h-5.5 text-[#2563EB]" />
            <span>Master Inventory Bulk Import Workspace</span>
          </h2>
          <p className="text-slate-500 text-sm mt-1">
            Load large datasets into ElectraStock instantly. Upload Excel sheets (.xlsx), CSV tables, or copy-paste grids straight from Google Sheets.
          </p>
        </div>
        <div className="flex gap-2 shrink-0">
          <button 
            type="button"
            onClick={loadSampleData}
            className="text-sm bg-slate-50 border border-slate-200 hover:bg-slate-100 text-slate-700 font-bold px-4 py-2.5.5 rounded-xl transition-all shadow-xs cursor-pointer"
          >
            Load Sample Template
          </button>
          <button 
            type="button" 
            onClick={() => fileInputRef.current?.click()}
            className="text-sm bg-blue-600 hover:bg-blue-700 text-white shadow-sm shadow-blue-500/20 active:scale-[0.98] transition-all duration-150 font-bold px-4 py-2.5.5 rounded-xl transition-all shadow-md shadow-blue-500/10 flex items-center gap-1.5 cursor-pointer"
          >
            <UploadCloud className="w-5 h-5" />
            <span>Upload XLSX / CSV</span>
          </button>
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleExcelUpload} 
            accept=".xlsx, .xls, .csv" 
            className="hidden" 
          />
        </div>
      </div>

      {importStatusMessage && (
        <div className={`border p-4 rounded-xl flex items-center justify-between shadow-xs ${
          importStatusMessage.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' :
          importStatusMessage.type === 'refused' ? 'bg-rose-50 border-rose-200 text-rose-800' :
          'bg-blue-50 text-blue-700 border border-blue-200/60 shadow-xs'
        }`}>
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5" />
            <span className="text-sm font-bold">{importStatusMessage.text}</span>
          </div>
          <button onClick={() => setImportStatusMessage(null)} className="text-slate-400 hover:text-slate-900 font-extrabold text-sm">Dismiss</button>
        </div>
      )}

      {/* Input Copy Paste Segment */}
      {!parsedData && (
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
          <div className="space-y-1">
            <h3 className="text-base font-black uppercase text-slate-900 flex items-center gap-2">
              <Clipboard className="w-5 h-5 text-[#2563EB]" />
              <span>Direct Spreadsheet Paste Area</span>
            </h3>
            <p className="text-sm text-slate-500">
              Open your Google Sheets or Microsoft Excel. Highlight columns (including headers in the first row), copy them (Ctrl+C), and paste directly (Ctrl+V) into the text region below.
            </p>
          </div>

          <textarea
            value={rawText}
            onChange={e => setRawText(e.target.value)}
            placeholder={`Product Name,SKU,Barcode,Category,Purchase Cost,Selling Price,Stock Quantity,Reorder Limit,Attribute:Size
Havells Wire RED,HW-1.5-RED,89025001,Wires,1450,1800,45,10,1.5sqmm
Crompton Fan White,CF-WH-1200,89025002,Fans,2100,2850,20,5,1200mm`}
            className="w-full h-48 bg-slate-50 focus:bg-white border border-slate-225 rounded-2xl p-4 font-mono text-sm focus:ring-1 focus:ring-blue-500 outline-none transition-all placeholder:text-slate-400 caret-black"
          />

          <div className="flex flex-col sm:flex-row gap-4 items-stretch sm:items-center justify-between">
            <div className="flex flex-wrap items-center gap-3">
              <label className="text-sm text-slate-500 font-bold">Category autoprovisioning fallback:</label>
              <select
                value={importTargetCat}
                onChange={e => setImportTargetCat(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-1.5 text-sm text-slate-800 focus:bg-white focus:outline-none font-bold cursor-pointer"
              >
                <option value="">-- Autodetect in sheet --</option>
                {categories.map(c => (
                  <option key={c.id} value={c.name}>{c.name} ({c.code})</option>
                ))}
              </select>
            </div>

            <button
              type="button"
              onClick={handleRawTextParse}
              disabled={!rawText.trim()}
              className="bg-[#2563EB] hover:bg-blue-700 disabled:bg-slate-200 disabled:text-slate-400 text-white font-bold px-6 py-2.5.5 rounded-xl transition-all shadow-md shadow-blue-500/5 text-sm flex items-center gap-1.5 justify-center cursor-pointer"
            >
              <Sparkles className="w-5 h-5" />
              <span>Parse Clipboard Text</span>
            </button>
          </div>
        </div>
      )}

      {/* Mapping Column definitions panel */}
      {parsedData && (
        <div className="bg-[var(--surface)] border border-[var(--border-default)] rounded-3xl p-6 shadow-sm space-y-6">
          <div className="flex justify-between items-center pb-3 border-b border-[var(--border-subtle)]">
            <div>
              <h4 className="font-bold text-slate-900 text-[14px] uppercase tracking-wide">Field Layout Column Mapping Settings</h4>
              <p className="text-[11px] text-slate-500 mt-1">Correct the binding headers below if the automatic detection made any mapping errors.</p>
            </div>
            <button 
              onClick={() => { setParsedData(null); setValidationGrid([]); }}
              className="text-slate-400 hover:text-slate-700 bg-[var(--app-bg)] hover:bg-[var(--surface)] p-1.5 rounded-lg transition-colors border border-transparent hover:border-[var(--border-default)] shadow-sm"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {parsedData.headers.map((val, idx) => (
              <div key={idx} className="bg-[var(--app-bg)] p-4 border border-[var(--border-default)] rounded-xl space-y-2">
                <span className="text-[11px] font-bold uppercase text-slate-500 tracking-wider block">Column {idx + 1}: "{val}"</span>
                <select
                  value={columnMappings[idx] || ''}
                  onChange={e => setColumnMappings(prev => ({ ...prev, [idx]: e.target.value }))}
                  className="w-full bg-[var(--surface)] border border-[var(--border-default)] rounded-lg p-2 text-[13px] font-medium text-slate-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                >
                  <option value="">-- Skip this column --</option>
                  <option value="productName">Product Name / Title</option>
                  <option value="sku">SKU Code (Unique ID)</option>
                  <option value="barcode">Barcode Unique</option>
                  <option value="category">Category Template</option>
                  <option value="costPrice">Buying Price (Unit Cost)</option>
                  <option value="price">Selling Price (Base Price)</option>
                  <option value="gst">GST Rate (%)</option>
                  <option value="stock">Initial Stock Stock</option>
                  <option value="lowStockThreshold">Min Stock Alert Point</option>
                  <optgroup label="Custom Category Specifications">
                    <option value="attr:Color">Color</option>
                    <option value="attr:Sweep Size">Sweep Size</option>
                    <option value="attr:Brand">Brand</option>
                    <option value="attr:Length">Length</option>
                    <option value="attr:Gauge">Gauge</option>
                    <option value={`attr:${val}`}>Use verbatim header: "{val}"</option>
                  </optgroup>
                </select>
              </div>
            ))}
          </div>

          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-[var(--app-bg)] p-4 rounded-xl border border-[var(--border-default)] shadow-sm">
            <div className="space-y-1">
              <span className="text-[13px] font-bold text-slate-800 block">Existing SKU Overwrites Handling</span>
              <p className="text-[11px] text-slate-500">What should the system do when an imported SKU matches a product already inside our database?</p>
            </div>
            <div className="flex gap-2 bg-[var(--surface)] p-1 rounded-xl border border-[var(--border-default)] shrink-0">
              <button
                type="button"
                onClick={() => setIsUpdateMode(true)}
                className={`px-4 py-2.5 rounded-lg text-sm font-bold uppercase transition-all cursor-pointer ${
                  isUpdateMode ? 'bg-[#15803D] text-white shadow-xs' : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                Merge & Edit Items
              </button>
              <button
                type="button"
                onClick={() => setIsUpdateMode(false)}
                className={`px-4 py-2.5 rounded-lg text-sm font-bold uppercase transition-all cursor-pointer ${
                  !isUpdateMode ? 'bg-rose-700 text-white shadow-xs' : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                Reject (Treat as error)
              </button>
            </div>
          </div>

          <div className="flex gap-2 justify-end">
            <button
              onClick={() => { setParsedData(null); setValidationGrid([]); }}
              className="text-[13px] bg-[var(--app-bg)] border border-[var(--border-default)] hover:bg-[var(--surface)] text-slate-700 font-bold px-5 py-2 rounded-xl transition-colors shadow-sm cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={runValidation}
              className="text-[13px] bg-blue-600 hover:bg-blue-700 text-white shadow-sm active:scale-[0.98] transition-colors font-bold px-6 py-2 rounded-xl flex items-center gap-1.5 cursor-pointer"
            >
              <Play className="w-4 h-4" />
              <span>Analyze & Run Validation</span>
            </button>
          </div>
        </div>
      )}

      {/* Validation sandbox results viewport */}
      {validationGrid.length > 0 && (
        <div className="bg-[var(--surface)] border border-[var(--border-default)] rounded-3xl p-6 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-3 border-b border-[var(--border-subtle)]">
            <div>
              <h4 className="font-bold text-[14px] text-slate-900 uppercase tracking-wide">Import Live Preview & Error Inspections</h4>
              <p className="text-[11px] text-slate-500 mt-1">Review validation results. Double-click fields to fix raw data directly inside the browser before committing.</p>
            </div>
            <div className="flex gap-2 text-[13px] font-bold">
              <span className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-1.5 rounded-xl">
                Ready: {validationGrid.filter(v => v.status === 'VALID').length} rows
              </span>
              {validationGrid.filter(v => v.status === 'INVALID').length > 0 && (
                <button
                  onClick={handleDownloadErrorReport}
                  className="bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-800 px-4 py-1.5 rounded-xl transition-all flex items-center gap-1 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5 text-rose-600" />
                  <span>Download Error CSV ({validationGrid.filter(v => v.status === 'INVALID').length})</span>
                </button>
              )}
            </div>
          </div>

          <div className="border border-[var(--border-default)] rounded-2xl overflow-hidden bg-[var(--surface)] max-h-96 overflow-y-auto shadow-sm">
            <table className="w-full text-left border-collapse">
              <thead className="bg-[var(--app-bg)] text-slate-500 text-[11px] uppercase font-bold tracking-wider border-b border-[var(--border-default)]">
                <tr>
                  <th className="px-4 py-3 text-center">Row</th>
                  <th className="px-4 py-3">Product Title</th>
                  <th className="px-4 py-3">SKU Identifier</th>
                  <th className="px-4 py-3">Barcode</th>
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3 text-right">Cost Price</th>
                  <th className="px-4 py-3 text-right">Sell Price</th>
                  <th className="px-4 py-3 text-center">Stock</th>
                  <th className="px-4 py-3">Audit Flags</th>
                  <th className="px-4 py-3 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-subtle)] text-[13px] font-mono">
                {validationGrid.map((row, idx) => (
                  <tr 
                    key={idx} 
                    className={`hover:bg-slate-50/50 ${
                      row.status === 'INVALID' ? 'bg-rose-50/15' : 
                      row.mode === 'UPDATE' ? 'bg-amber-50/15' : ''
                    }`}
                  >
                    <td className="px-4 py-2.5 text-center text-slate-400 font-bold">{idx + 1}</td>
                    <td className="px-4 py-2.5">
                      <input
                        type="text"
                        value={row.productName || ''}
                        onChange={e => handleFixValidationValue(row.rowIndex, 'productName', e.target.value)}
                        className="bg-[var(--app-bg)] focus:bg-[var(--surface)] text-slate-900 border border-[var(--border-default)] hover:border-slate-300 rounded p-1 w-full outline-none focus:ring-1 focus:ring-blue-500 caret-black"
                      />
                    </td>
                    <td className="px-4 py-2.5 font-bold text-blue-600">
                      <input
                        type="text"
                        value={row.sku || ''}
                        onChange={e => handleFixValidationValue(row.rowIndex, 'sku', e.target.value)}
                        className="bg-[var(--app-bg)] focus:bg-[var(--surface)] text-slate-800 border border-[var(--border-default)] hover:border-slate-300 rounded p-1 w-full uppercase outline-none focus:ring-1 focus:ring-blue-500 caret-black"
                      />
                    </td>
                    <td className="px-4 py-2.5">
                      <input
                        type="text"
                        value={row.barcode || ''}
                        onChange={e => handleFixValidationValue(row.rowIndex, 'barcode', e.target.value)}
                        className="bg-[var(--app-bg)] focus:bg-[var(--surface)] text-slate-800 border border-[var(--border-default)] hover:border-slate-300 rounded p-1 w-full outline-none focus:ring-1 focus:ring-blue-500 caret-black"
                      />
                    </td>
                    <td className="px-4 py-2.5">
                      <input
                        type="text"
                        value={row.category || ''}
                        onChange={e => handleFixValidationValue(row.rowIndex, 'category', e.target.value)}
                        className="bg-[var(--app-bg)] focus:bg-[var(--surface)] text-slate-700 border border-[var(--border-default)] hover:border-slate-300 rounded p-1 w-full font-sans outline-none focus:ring-1 focus:ring-blue-500 caret-black"
                      />
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <input
                        type="number"
                        value={row.costPrice || 0}
                        onChange={e => handleFixValidationValue(row.rowIndex, 'costPrice', e.target.value)}
                        className="bg-[var(--app-bg)] focus:bg-[var(--surface)] border border-[var(--border-default)] hover:border-slate-300 rounded p-1 text-right w-20 outline-none focus:ring-1 focus:ring-blue-500 caret-black"
                      />
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <input
                        type="number"
                        value={row.price || 0}
                        onChange={e => handleFixValidationValue(row.rowIndex, 'price', e.target.value)}
                        className="bg-[var(--app-bg)] focus:bg-[var(--surface)] border border-[var(--border-default)] hover:border-slate-300 rounded p-1 text-right w-20 outline-none focus:ring-1 focus:ring-blue-500 caret-black"
                      />
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      <input
                        type="number"
                        value={row.stock || 0}
                        onChange={e => handleFixValidationValue(row.rowIndex, 'stock', e.target.value)}
                        className="bg-[var(--app-bg)] focus:bg-[var(--surface)] border border-[var(--border-default)] hover:border-slate-300 rounded p-1 text-center w-16 outline-none focus:ring-1 focus:ring-blue-500 caret-black"
                      />
                    </td>
                    <td className="px-4 py-2.5 text-[10px] font-sans">
                      {row.status === 'INVALID' ? (
                        <div className="space-y-0.5 text-rose-700 font-semibold leading-tight">
                          {row.errors.map((er: string, eIdx: number) => (
                            <div key={eIdx} className="flex items-center gap-1.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0"></span>
                              <span>{er}</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="space-y-0.5 text-slate-500">
                          {row.warnings.length > 0 ? (
                            row.warnings.map((wa: string, wIdx: number) => (
                              <span key={wIdx} className="text-amber-700 bg-amber-50 border border-amber-100 px-3 py-0.5 rounded-md text-[9px] font-bold block">{wa}</span>
                            ))
                          ) : (
                            <span className="text-emerald-700 bg-emerald-50 border border-emerald-100 px-3 py-0.5 rounded-md font-bold text-[9px]">Check Completed</span>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      <button
                        type="button"
                        onClick={() => handleSkipImportRow(row.rowIndex)}
                        className="text-slate-400 hover:text-rose-600 p-1 bg-slate-50 hover:bg-rose-50 border border-slate-200 rounded"
                        title="Delete source record row"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex justify-between items-center bg-[var(--app-bg)] p-4 rounded-xl border border-[var(--border-default)] shadow-sm">
            <span className="text-[13px] text-slate-500 font-bold">Loaded {validationGrid.filter(v => v.status === 'VALID').length} valid rows of {validationGrid.length} items</span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => { setParsedData(null); setValidationGrid([]); }}
                className="bg-[var(--surface)] hover:bg-[var(--app-bg)] text-slate-700 border border-[var(--border-default)] font-bold px-4 py-2 rounded-xl text-[13px] transition-colors shadow-sm cursor-pointer"
              >
                Clear Preview
              </button>
              <button
                type="button"
                onClick={executeValidatedImport}
                disabled={validationGrid.filter(v => v.status === 'VALID').length === 0}
                className="bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-200 disabled:text-slate-400 text-white px-6 py-2 rounded-xl text-[13px] font-bold transition-colors shadow-sm flex items-center gap-1.5 cursor-pointer"
              >
                <CheckCircle className="w-4 h-4" />
                <span>Execute Validated Imports</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
