import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Category, CategoryAttribute, Product } from '../types';
import { 
  FolderOpen, Trash2, Edit3, Plus, X, ChevronUp, ChevronDown, 
  AlertTriangle, Layers, Info, Search, SlidersHorizontal, 
  Download, Upload, ChevronRight, Eye, RefreshCw, FileText, 
  Tag, Calendar, HelpCircle, Check, HelpCircle as KeyboardIcon, 
  MoreHorizontal
} from 'lucide-react';
import { useModalEffects } from './modalUtils';

interface CategoriesModuleProps {
  categories: Category[];
  products: Product[];
  onAddCategory: (category: Category) => void;
  onEditCategory: (category: Category) => void;
  onDeleteCategory: (id: string) => void;
}

export const CategoriesModule: React.FC<CategoriesModuleProps> = ({
  categories,
  products,
  onAddCategory,
  onEditCategory,
  onDeleteCategory,
}) => {
  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);

  // Refs and hooks for modals
  const importModalRef = useRef<HTMLDivElement>(null);
  const categoryModalRef = useRef<HTMLFormElement>(null);

  useModalEffects({
    onClose: () => {
      setShowImportModal(false);
      setImportError(null);
    },
    containerRef: importModalRef,
    isActive: showImportModal,
  });

  useModalEffects({
    onClose: () => setShowModal(false),
    containerRef: categoryModalRef,
    isActive: showModal,
  });

  // Form State for edit/add category
  const [name, setName] = useState('');
  const [attributes, setAttributes] = useState<CategoryAttribute[]>([]);
  const [deleteWarning, setDeleteWarning] = useState<string | null>(null);
  
  // Search & Filtering States
  const [searchTerm, setSearchTerm] = useState('');
  const [productCountFilter, setProductCountFilter] = useState<'ALL' | 'HAS_PRODUCTS' | 'NO_PRODUCTS'>('ALL');
  const [attrCountFilter, setAttrCountFilter] = useState<'ALL' | 'HAS_ATTR' | 'NO_ATTR'>('ALL');
  const [recentlyCreatedFilter, setRecentlyCreatedFilter] = useState<boolean>(false);

  // Pagination States
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);

  // Sorting State
  const [sortField, setSortField] = useState<keyof Category | 'productCount' | 'attrCount' | 'createdAt' | null>('name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  // Expanded Rows State for Drill-Down
  const [expandedRowIds, setExpandedRowIds] = useState<Record<string, boolean>>({});

  // Keyboard navigation row focus state
  const [focusedRowId, setFocusedRowId] = useState<string | null>(null);

  // Import Paste/Preset State
  const [importText, setImportText] = useState('');
  const [importError, setImportError] = useState<string | null>(null);

  // Auto-Focus Table Ref for keyboard navigation
  const tableContainerRef = useRef<HTMLDivElement>(null);

  // Column Resizer Initial Widths
  const [colWidths, setColWidths] = useState({
    id: 110,
    name: 220,
    attrs: 120,
    products: 120,
    preview: 310,
    created: 130,
    updated: 130,
    actions: 140
  });

  // Handle Resize Dragging
  const startResize = (col: keyof typeof colWidths, e: React.MouseEvent) => {
    e.preventDefault();
    const startX = e.pageX;
    const startWidth = colWidths[col];
    
    const handleMouseMove = (moveEvent: MouseEvent) => {
      const currentX = moveEvent.pageX;
      const diff = currentX - startX;
      setColWidths(prev => ({
        ...prev,
        [col]: Math.max(75, startWidth + diff)
      }));
    };
    
    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  // Helper date generators for default display
  const getCreatedAt = (cat: Category) => cat.createdAt || '2026-06-01';
  const getUpdatedAt = (cat: Category) => cat.updatedAt || '2026-06-01';

  // Toggle drill down expand/collapse
  const toggleRowExpand = (id: string) => {
    setExpandedRowIds(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  // Form controls
  const openAddModal = () => {
    setEditingCategory(null);
    setName('');
    setAttributes([
      { name: 'Color', type: 'text', required: false },
    ]);
    setShowModal(true);
  };

  const openEditModal = (cat: Category) => {
    setEditingCategory(cat);
    setName(cat.name);
    setAttributes([...cat.attributes]);
    setShowModal(true);
  };

  const handleAddAttribute = () => {
    setAttributes([
      ...attributes,
      { name: '', type: 'text', required: false, options: [] },
    ]);
  };

  const handleRemoveAttribute = (idx: number) => {
    setAttributes(attributes.filter((_, i) => i !== idx));
  };

  const handleUpdateAttribute = (idx: number, field: keyof CategoryAttribute, value: any) => {
    const updated = [...attributes];
    if (field === 'options' && typeof value === 'string') {
      updated[idx] = { ...updated[idx], options: value.split(',').map(s => s.trim()).filter(Boolean) };
    } else {
      updated[idx] = { ...updated[idx], [field]: value };
    }
    setAttributes(updated);
  };

  const moveAttribute = (idx: number, direction: 'up' | 'down') => {
    if (direction === 'up' && idx === 0) return;
    if (direction === 'down' && idx === attributes.length - 1) return;

    const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
    const updated = [...attributes];
    const border = updated[idx];
    updated[idx] = updated[targetIdx];
    updated[targetIdx] = border;
    setAttributes(updated);
  };

  // Save Add/Edit Category
  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    // Filter out attributes with blank names
    const finalAttributes = attributes
      .map(attr => ({
        ...attr,
        name: attr.name.trim()
      }))
      .filter(attr => attr.name !== '');

    const timeString = new Date().toISOString().split('T')[0];

    if (editingCategory) {
      onEditCategory({
        ...editingCategory,
        name: name.trim(),
        attributes: finalAttributes,
        createdAt: editingCategory.createdAt || timeString,
        updatedAt: timeString,
      });
    } else {
      onAddCategory({
        id: 'cat_' + Math.random().toString(36).substr(2, 9),
        code: '',
        name: name.trim(),
        attributes: finalAttributes,
        createdAt: timeString,
        updatedAt: timeString,
      });
    }
    setShowModal(false);
  };

  // Delete Click handler
  const handleDeleteClick = (cat: Category) => {
    const hasProducts = products.some(p => p.categoryId === cat.id);
    if (hasProducts) {
      setDeleteWarning(
        `Category "${cat.name}" has active items in the inventory database. Assign those products to other categories before deleting.`
      );
    } else {
      if (confirm(`Are you sure you want to delete the "${cat.name}" category?`)) {
        onDeleteCategory(cat.id);
        if (focusedRowId === cat.id) {
          setFocusedRowId(null);
        }
      }
    }
  };

  // Bulk Export handler
  const handleExportJson = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(categories, null, 2));
    const dlAnchor = document.createElement('a');
    dlAnchor.setAttribute("href", dataStr);
    dlAnchor.setAttribute("download", `electrastock_categories_${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(dlAnchor);
    dlAnchor.click();
    dlAnchor.remove();
  };

  // Bulk Import Submit
  const handleImportSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setImportError(null);
    try {
      const parsed = JSON.parse(importText);
      const items = Array.isArray(parsed) ? parsed : [parsed];
      
      const importedCount = items.length;
      let validCount = 0;

      let counter = parseInt(localStorage.getItem('es_category_code_counter') || '0', 10);
      categories.forEach(c => {
        if (c.code && c.code.startsWith('CAT-')) {
          const numPart = parseInt(c.code.split('-')[1], 10);
          if (!isNaN(numPart) && numPart > counter) {
            counter = numPart;
          }
        }
      });

      const existingCodes = new Set(categories.map(c => c.code).filter(Boolean));

      items.forEach((item: any) => {
        if (!item.name) return;
        const generatedId = item.id || ('cat_' + Math.random().toString(36).substr(2, 9));
        
        let assignedCode = item.code;
        if (!assignedCode || !assignedCode.startsWith('CAT-') || existingCodes.has(assignedCode)) {
          counter++;
          assignedCode = `CAT-${String(counter).padStart(4, '0')}`;
          while (existingCodes.has(assignedCode)) {
            counter++;
            assignedCode = `CAT-${String(counter).padStart(4, '0')}`;
          }
        }
        existingCodes.add(assignedCode);

        const finalAttrs: CategoryAttribute[] = Array.isArray(item.attributes) ? item.attributes.map((a: any) => ({
          name: String(a.name || 'Property'),
          type: (['text', 'number', 'boolean', 'select'].includes(a.type) ? a.type : 'text') as any,
          required: !!a.required,
          options: Array.isArray(a.options) ? a.options.map(String) : []
        })) : [];

        onAddCategory({
          id: generatedId,
          code: assignedCode,
          name: String(item.name).trim(),
          attributes: finalAttrs,
          createdAt: item.createdAt || new Date().toISOString().split('T')[0],
          updatedAt: item.updatedAt || new Date().toISOString().split('T')[0],
        });
        validCount++;
      });
      localStorage.setItem('es_category_code_counter', String(counter));

      if (validCount > 0) {
        setShowImportModal(false);
        setImportText('');
      } else {
        setImportError("No valid category entries found in the JSON payload.");
      }
    } catch (err: any) {
      setImportError("Failed to parse JSON. Please formatting: must be a valid JSON array of category objects.");
    }
  };

  // Load Presets instantly
  const loadPresetTemplate = (type: 'industrial' | 'home' | 'switch') => {
    let preset: any[] = [];
    if (type === 'industrial') {
      preset = [
        {
          name: "Industrial Transformers",
          attributes: [
            { name: "KVA Rating", type: "number", required: true },
            { name: "Voltage Phase", type: "select", options: ["Single Phase", "Three Phase"], required: true },
            { name: "Cooling Type", type: "text", required: false }
          ]
        },
        {
          name: "Circuit Breakers (MCCB)",
          attributes: [
            { name: "Amperage Limit", type: "number", required: true },
            { name: "Poles Count", type: "select", options: ["1 Pole", "2 Pole", "3 Pole", "4 Pole"], required: true },
            { name: "Breaking Capacity", type: "text", required: false }
          ]
        }
      ];
    } else if (type === 'home') {
      preset = [
        {
          name: "Smart Lighting (LED)",
          attributes: [
            { name: "Wattage", type: "number", required: true },
            { name: "Color Temperature", type: "select", options: ["Warm White (3000K)", "Cool Daylight (6500K)", "RGB Smart"], required: true },
            { name: "Dimmable", type: "boolean", required: false }
          ]
        },
        {
          name: "Modular Smart Switches",
          attributes: [
            { name: "Gang Count", type: "number", required: true },
            { name: "Smart Bluetooth Integration", type: "boolean", required: true },
            { name: "Finish Style", type: "select", options: ["Matte Black", "Brushed Silver", "Glossy White"], required: false }
          ]
        }
      ];
    } else {
      preset = [
        {
          name: "Conduit Pipes",
          attributes: [
            { name: "Material", type: "select", options: ["PVC Fire Retardant", "Metallic GI", "Flexible Plastic"], required: true },
            { name: "Diameter Size", type: "text", required: true },
            { name: "Standard Length (Mtrs)", type: "number", required: true }
          ]
        }
      ];
    }
    setImportText(JSON.stringify(preset, null, 2));
  };

  // Handle Sort Toggle
  const triggerSort = (field: keyof Category | 'productCount' | 'attrCount' | 'createdAt') => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Sorted and Filtered Categories derived state
  const sortedAndFilteredCategories = useMemo(() => {
    let result = [...categories];

    // 1. Text Search filter (ID or Name)
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase().trim();
      result = result.filter(cat => 
        cat.name.toLowerCase().includes(q) || 
        cat.code.toLowerCase().includes(q)
      );
    }

    // 2. Active Products Filter
    if (productCountFilter === 'HAS_PRODUCTS') {
      result = result.filter(cat => products.some(p => p.categoryId === cat.id));
    } else if (productCountFilter === 'NO_PRODUCTS') {
      result = result.filter(cat => !products.some(p => p.categoryId === cat.id));
    }

    // 3. Attributes configured filter
    if (attrCountFilter === 'HAS_ATTR') {
      result = result.filter(cat => cat.attributes.length > 0);
    } else if (attrCountFilter === 'NO_ATTR') {
      result = result.filter(cat => cat.attributes.length === 0);
    }

    // 4. Recently Created filter (mock: last 30 days)
    if (recentlyCreatedFilter) {
      result = result.slice().sort((a, b) => {
        const dateA = getCreatedAt(a);
        const dateB = getCreatedAt(b);
        return dateB.localeCompare(dateA);
      });
    }

    // 5. Apply sorting
    if (sortField) {
      result.sort((a, b) => {
        let valA: any = "";
        let valB: any = "";

        if (sortField === 'id' || sortField === 'code') {
          const numA = parseInt((a.code || '').split('-')[1], 10) || 0;
          const numB = parseInt((b.code || '').split('-')[1], 10) || 0;
          valA = numA;
          valB = numB;
        } else if (sortField === 'productCount') {
          valA = products.filter(p => p.categoryId === a.id).length;
          valB = products.filter(p => p.categoryId === b.id).length;
        } else if (sortField === 'attrCount') {
          valA = a.attributes.length;
          valB = b.attributes.length;
        } else if (sortField === 'createdAt') {
          valA = getCreatedAt(a);
          valB = getCreatedAt(b);
        } else {
          valA = (a[sortField as keyof Category] as string || '').toLowerCase();
          valB = (b[sortField as keyof Category] as string || '').toLowerCase();
        }

        if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
        if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return result;
  }, [categories, products, searchTerm, productCountFilter, attrCountFilter, recentlyCreatedFilter, sortField, sortDirection]);

  // Paginated visible items
  const paginatedCategories = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return sortedAndFilteredCategories.slice(startIndex, startIndex + itemsPerPage);
  }, [sortedAndFilteredCategories, currentPage, itemsPerPage]);

  const totalPages = Math.max(1, Math.ceil(sortedAndFilteredCategories.length / itemsPerPage));

  // If page index exceeds range, reset to 1
  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(1);
    }
  }, [totalPages, currentPage]);

  // Listen to keyboard shortcuts on row selection
  const handleTableKeyDown = (e: React.KeyboardEvent) => {
    if (showModal || showImportModal) return; // ignore if modal forms are focused

    const list = paginatedCategories;
    if (list.length === 0) return;

    const currentIndex = list.findIndex(c => c.id === focusedRowId);

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      const nextIndex = currentIndex < list.length - 1 ? currentIndex + 1 : 0;
      setFocusedRowId(list[nextIndex].id);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const prevIndex = currentIndex > 0 ? currentIndex - 1 : list.length - 1;
      setFocusedRowId(list[prevIndex].id);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (focusedRowId) {
        toggleRowExpand(focusedRowId);
      }
    } else if (e.key === 'Delete') {
      e.preventDefault();
      if (focusedRowId) {
        const cat = list.find(c => c.id === focusedRowId);
        if (cat) handleDeleteClick(cat);
      }
    } else if (e.key.toLowerCase() === 'e') {
      e.preventDefault();
      if (focusedRowId) {
        const cat = list.find(c => c.id === focusedRowId);
        if (cat) openEditModal(cat);
      }
    }
  };

  // Initial row focus setup
  useEffect(() => {
    if (paginatedCategories.length > 0 && !focusedRowId) {
      setFocusedRowId(paginatedCategories[0].id);
    }
  }, [paginatedCategories, focusedRowId]);

  return (
    <div className="space-y-8 flex flex-col h-full animate-in fade-in slide-in-from-right-6 duration-500">
      
      {/* Dynamic Alerts */}
      {deleteWarning && (
        <div className="bg-amber-50 border border-amber-200 text-amber-900 p-4.5 rounded-2xl flex items-start gap-3.5 animate-in fade-in duration-200">
          <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h3 className="font-bold text-base text-slate-900">Deletion Blocked</h3>
            <p className="text-sm text-slate-600 mt-1">{deleteWarning}</p>
          </div>
          <button
            onClick={() => setDeleteWarning(null)}
            className="text-amber-500 hover:text-amber-700 p-1 rounded-lg hover:bg-amber-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* Main Header Registry */}
      <div className="bg-white border border-slate-200/60 shadow-sm-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shadow-xs">
        <div>
          <h1 className="text-[36px] font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <FolderOpen className="w-6 h-6 text-[#2563EB]" />
            Category Specification Registry
          </h1>
          <p className="text-slate-500 text-sm font-semibold mt-1">
            Dynamic templating workspace built for Tally Prime efficiency. Configures inherited properties, counts, and strict templates.
          </p>
        </div>

        {/* Buttons Header Actions */}
        <div className="flex flex-wrap items-center gap-4">
          <button
            type="button"
            onClick={openAddModal}
            className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white shadow-sm shadow-blue-500/20 active:scale-[0.98] transition-all duration-150 font-bold px-4 py-2.5.5 rounded-xl shadow-xs text-sm transition-all pointer-cursor"
          >
            <Plus className="w-5 h-5" />
            New Category
          </button>
          <button
            type="button"
            onClick={() => setShowImportModal(true)}
            className="flex items-center gap-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 shadow-xs hover:shadow-sm transition-all duration-150 font-bold px-4 py-2.5.5 rounded-xl text-sm transition-all pointer-cursor"
          >
            <Upload className="w-3.5 h-3.5 text-slate-500" />
            Import Categories
          </button>
          <button
            type="button"
            onClick={handleExportJson}
            className="flex items-center gap-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 shadow-xs hover:shadow-sm transition-all duration-150 font-bold px-4 py-2.5.5 rounded-xl text-sm transition-all pointer-cursor"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            Export Categories
          </button>
        </div>
      </div>

      {/* SEARCH AND FILTERS TOOLBAR */}
      <div className="bg-white border border-slate-200/60 shadow-sm-2xl flex flex-col lg:flex-row gap-5 shadow-xs">
        {/* Full Category Text Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            type="text"
            placeholder="Search categories by name, attributes or template ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-50/50 border border-slate-200/40 shadow-xs text-slate-900 pl-12 pr-4 py-3 h-12 text-base font-semibold rounded-xl shadow-xs outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB]/40 transition"
          />
          {searchTerm && (
            <button 
              onClick={() => setSearchTerm('')}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-450 hover:text-slate-700 text-sm"
            >
              Clear
            </button>
          )}
        </div>

        {/* Quick select parameters */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Active Product count filter */}
          <div className="flex items-center gap-1.5 bg-slate-50/50 border border-slate-200/40 shadow-xs px-4 py-3 h-12 rounded-xl">
            <span className="text-xs text-slate-400 uppercase font-bold">Products:</span>
            <select
              value={productCountFilter}
              onChange={(e) => setProductCountFilter(e.target.value as any)}
              className="bg-transparent text-slate-800 text-sm font-bold outline-none cursor-pointer"
            >
              <option value="ALL">All Categories</option>
              <option value="HAS_PRODUCTS">With Active Products</option>
              <option value="NO_PRODUCTS">Zero Products</option>
            </select>
          </div>

          {/* Attributes filters */}
          <div className="flex items-center gap-1.5 bg-slate-50/50 border border-slate-200/40 shadow-xs px-4 py-3 h-12 rounded-xl">
            <span className="text-xs text-slate-400 uppercase font-bold">Attributes:</span>
            <select
              value={attrCountFilter}
              onChange={(e) => setAttrCountFilter(e.target.value as any)}
              className="bg-transparent text-slate-800 text-sm font-bold outline-none cursor-pointer"
            >
              <option value="ALL">All Counts</option>
              <option value="HAS_ATTR">With Attributes</option>
              <option value="NO_ATTR">No Attributes</option>
            </select>
          </div>

          {/* Recently Created Toggle */}
          <button
            type="button"
            onClick={() => setRecentlyCreatedFilter(!recentlyCreatedFilter)}
            className={`flex items-center gap-1.5 px-4 py-3 h-12 rounded-xl text-sm font-bold border transition ${
              recentlyCreatedFilter 
                ? 'bg-blue-50 border-blue-200 text-[#2563EB]' 
                : 'bg-[#F8FAFC] border-slate-200 text-slate-650 hover:bg-slate-50'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            Recently Created
          </button>

          {/* Reset Filters button */}
          {(searchTerm || productCountFilter !== 'ALL' || attrCountFilter !== 'ALL' || recentlyCreatedFilter) && (
            <button
              onClick={() => {
                setSearchTerm('');
                setProductCountFilter('ALL');
                setAttrCountFilter('ALL');
                setRecentlyCreatedFilter(false);
              }}
              className="text-sm text-rose-600 hover:text-rose-700 font-bold px-3.5 py-2.5 hover:bg-rose-50 rounded-xl transition"
            >
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* MASTER HIGH-DENSITY REGISTRY TABLE */}
      <div 
        ref={tableContainerRef}
        onKeyDown={handleTableKeyDown}
        tabIndex={0}
        className="outline-none bg-white border border-slate-200/60 shadow-sm-xl shadow-xs overflow-hidden focus:ring-1 focus:ring-[#2563EB] flex-1 flex flex-col"
      >
        <div className="overflow-x-auto flex-1 custom-scrollbar">
          <table className="w-full text-left border-collapse table-fixed select-none">
            
            {/* Table Header Row */}
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200/60 text-slate-500 text-sm font-semibold">
                
                {/* ID Header */}
                <th style={{ width: colWidths.id }} className="relative px-5 py-4 select-none uppercase tracking-wider">
                  <div 
                    onClick={() => triggerSort('id')}
                    className="flex items-center gap-1.5 cursor-pointer hover:text-[#2563EB]"
                  >
                    Category ID
                    {sortField === 'id' && (sortDirection === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}
                  </div>
                  <div onMouseDown={(e) => startResize('id', e)} className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-blue-500/50 bg-slate-400/20" />
                </th>

                {/* Name Header */}
                <th style={{ width: colWidths.name }} className="relative px-5 py-4 select-none uppercase tracking-wider">
                  <div 
                    onClick={() => triggerSort('name')}
                    className="flex items-center gap-1.5 cursor-pointer hover:text-[#2563EB]"
                  >
                    Category Title
                    {sortField === 'name' && (sortDirection === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}
                  </div>
                  <div onMouseDown={(e) => startResize('name', e)} className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-blue-500/50 bg-slate-400/20" />
                </th>

                {/* Attributes Count Header */}
                <th style={{ width: colWidths.attrs }} className="relative px-5 py-4 select-none uppercase tracking-wider">
                  <div 
                    onClick={() => triggerSort('attrCount')}
                    className="flex items-center gap-1.5 cursor-pointer hover:text-[#2563EB]"
                  >
                    Attributes
                    {sortField === 'attrCount' && (sortDirection === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}
                  </div>
                  <div onMouseDown={(e) => startResize('attrs', e)} className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-blue-500/50 bg-slate-400/20" />
                </th>

                {/* Products Count Header */}
                <th style={{ width: colWidths.products }} className="relative px-5 py-4 select-none uppercase tracking-wider">
                  <div 
                    onClick={() => triggerSort('productCount')}
                    className="flex items-center gap-1.5 cursor-pointer hover:text-[#2563EB]"
                  >
                    Products Count
                    {sortField === 'productCount' && (sortDirection === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}
                  </div>
                  <div onMouseDown={(e) => startResize('products', e)} className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-blue-500/50 bg-slate-400/20" />
                </th>

                {/* Preview Header */}
                <th style={{ width: colWidths.preview }} className="relative px-5 py-4 select-none uppercase tracking-wider text-slate-700">
                  Attributes Preview
                  <div onMouseDown={(e) => startResize('preview', e)} className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-blue-500/50 bg-slate-400/20" />
                </th>

                {/* Created At Header */}
                <th style={{ width: colWidths.created }} className="relative px-5 py-4 select-none uppercase tracking-wider">
                  <div 
                    onClick={() => triggerSort('createdAt')}
                    className="flex items-center gap-1.5 cursor-pointer hover:text-[#2563EB]"
                  >
                    Created At
                    {sortField === 'createdAt' && (sortDirection === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}
                  </div>
                  <div onMouseDown={(e) => startResize('created', e)} className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-blue-500/50 bg-slate-400/20" />
                </th>

                {/* Last Updated Header */}
                <th style={{ width: colWidths.updated }} className="relative px-5 py-4 select-none uppercase tracking-wider text-slate-700">
                  Last Updated
                  <div onMouseDown={(e) => startResize('updated', e)} className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-blue-500/50 bg-slate-400/20" />
                </th>

                {/* Actions Column */}
                <th style={{ width: colWidths.actions }} className="relative px-5 py-4 text-right uppercase tracking-wider">
                  <span className="mr-4">Actions</span>
                </th>
              </tr>
            </thead>

            {/* Table Content Rows */}
            <tbody className="bg-white divide-y divide-slate-100/80 text-slate-800 text-base">
              {paginatedCategories.map((cat) => {
                const isExpanded = !!expandedRowIds[cat.id];
                const isFocused = focusedRowId === cat.id;
                const catProducts = products.filter(p => p.categoryId === cat.id);
                const totalSpecs = cat.attributes.length;

                // Grab preview parameters
                const maxPreview = 3;
                const excessCount = Math.max(0, totalSpecs - maxPreview);

                return (
                  <React.Fragment key={cat.id}>
                    
                    {/* Primary Row */}
                    <tr 
                      onClick={() => {
                        setFocusedRowId(cat.id);
                        toggleRowExpand(cat.id);
                      }}
                      className={`cursor-pointer transition-colors duration-150 ${
                        isFocused 
                          ? 'bg-blue-50/50 border-l-[3px] border-blue-600' 
                          : 'hover:bg-blue-50/40 even:bg-slate-50/30 transition-colors duration-150'
                      }`}
                    >
                      {/* ID Row Column */}
                      <td className="px-5 py-4 font-mono text-slate-500 font-bold">
                        <div className="flex items-center gap-1.5">
                          {isExpanded ? (
                            <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
                          ) : (
                            <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                          )}
                          <span>{cat.code}</span>
                        </div>
                      </td>

                      {/* Title Column */}
                      <td className="px-5 py-4 font-bold text-slate-900 group">
                        <span className="border-b border-dashed border-transparent group-hover:border-[#2563EB] transition">
                          {cat.name}
                        </span>
                      </td>

                      {/* Attributes Count */}
                      <td className="px-5 py-4 font-bold">
                        <span className="px-3.5 py-0.5 rounded-full bg-purple-50 border border-purple-200 text-purple-700">
                          {totalSpecs} spec{totalSpecs !== 1 ? 's' : ''}
                        </span>
                      </td>

                      {/* Products Count */}
                      <td className="px-5 py-4 font-bold">
                        <span className={`px-3.5 py-0.5 rounded-full border ${
                          catProducts.length > 0 
                            ? 'bg-blue-50 text-blue-700 border border-blue-200/60 shadow-xs' 
                            : 'bg-slate-50 border-slate-200 text-slate-400'
                        }`}>
                          {catProducts.length} item{catProducts.length !== 1 ? 's' : ''}
                        </span>
                      </td>

                      {/* Attributes Preview Mini Pills */}
                      <td className="px-5 py-4">
                        <div className="flex flex-wrap items-center gap-1 max-w-full">
                          {cat.attributes.length > 0 ? (
                            <>
                              {cat.attributes.slice(0, maxPreview).map((attr, idx) => (
                                <span 
                                  key={idx}
                                  className="text-[10px] truncate max-w-[90px] font-medium bg-slate-50 border border-slate-200 text-slate-700 px-1.5 py-0.5 rounded-md"
                                  title={`${attr.name} (${attr.type})`}
                                >
                                  {attr.name}
                                </span>
                              ))}
                              {excessCount > 0 && (
                                <span className="text-[10px] bg-blue-500 text-white font-extrabold px-1 rounded-md" title={`${excessCount} more properties`}>
                                  +{excessCount} More
                                </span>
                              )}
                            </>
                          ) : (
                            <span className="text-slate-450 italic text-[10px]">No specifications configured</span>
                          )}
                        </div>
                      </td>

                      {/* Created At Date */}
                      <td className="px-5 py-4 font-medium text-slate-550">
                        {getCreatedAt(cat)}
                      </td>

                      {/* Last Updated Date */}
                      <td className="px-5 py-4 font-medium text-slate-550">
                        {getUpdatedAt(cat)}
                      </td>

                      {/* Actions Buttons */}
                      <td className="px-5 py-4 text-right no-print" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-4">
                          <button
                            onClick={() => openEditModal(cat)}
                            title="Edit template specifications"
                            className="p-1 px-3.5 rounded-lg border border-slate-200 hover:border-[#2563EB] bg-white hover:bg-slate-50 text-slate-600 hover:text-[#2563EB] transition-all font-bold text-[10px] flex items-center gap-1"
                          >
                            <Edit3 className="w-3 h-3" />
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeleteClick(cat)}
                            title="Delete category"
                            className="p-1 px-3.5 rounded-lg border border-slate-250 bg-white hover:bg-rose-50 text-rose-500 hover:text-rose-700 hover:border-rose-200 transition-all font-bold text-[10px] flex items-center gap-1"
                          >
                            <Trash2 className="w-3 h-3" />
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>

                    {/* Drill-Down Expanded View Container */}
                    {isExpanded && (
                      <tr className="bg-[#F8FAFC]">
                        <td colSpan={8} className="p-5 border-l-4 border-l-[#2563EB] border-t-0 bg-[#F8FAFC]/75 inset-shadow-sm">
                          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 animate-in slide-in-from-top-2 duration-200">
                            
                            {/* Specifications breakdown details column */}
                            <div className="md:col-span-5 bg-white border border-slate-200/60 shadow-sm-xl p-4 shadow-3xs">
                              <h4 className="text-slate-900 font-bold text-sm flex items-center gap-1.5 uppercase tracking-wider mb-3.5 border-b border-slate-100 pb-2">
                                <Tag className="w-3.5 h-3.5 text-[#2563EB]" />
                                Inheritance Specification Fields
                              </h4>
                              {cat.attributes.length > 0 ? (
                                <ul className="space-y-2 text-sm font-semibold">
                                  {cat.attributes.map((attr, idx) => (
                                    <li key={idx} className="flex justify-between items-center bg-slate-50 border border-slate-150 p-2 rounded-lg text-slate-700">
                                      <div className="flex items-center gap-1.5">
                                        <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                                        <span>{attr.name}</span>
                                        {attr.required && (
                                          <span className="text-[9px] font-bold text-rose-600 bg-rose-50 border border-rose-100 px-1 py-0.5 rounded">
                                            Required
                                          </span>
                                        )}
                                      </div>
                                      <span className="text-[10px] bg-white border border-slate-200 px-3.5 py-0.5 rounded text-slate-500 capitalize">
                                        {attr.type === 'select' ? `Dropdown (${attr.options?.length || 0} opts)` : attr.type}
                                      </span>
                                    </li>
                                  ))}
                                </ul>
                              ) : (
                                <div className="text-center py-6 text-slate-400 italic text-sm">
                                  No specifications configuration defined yet.
                                </div>
                              )}
                            </div>

                            {/* Linked Products Drill-Down List column */}
                            <div className="md:col-span-7 bg-white border border-slate-200/60 shadow-sm-xl p-4 shadow-3xs">
                              <h4 className="text-slate-900 font-bold text-sm flex items-center gap-1.5 uppercase tracking-wider mb-3.5 border-b border-slate-100 pb-2">
                                <FolderOpen className="w-3.5 h-3.5 text-emerald-500" />
                                Linked Inventory Products ({catProducts.length})
                              </h4>
                              {catProducts.length > 0 ? (
                                <div className="max-h-[220px] overflow-y-auto space-y-2 pr-1 text-sm">
                                  {catProducts.map((prod) => {
                                    const totalStock = prod.variants ? prod.variants.reduce((acc, v) => acc + (v.stock || 0), 0) : 0;
                                    const variantCount = prod.variants ? prod.variants.length : 1;
                                    return (
                                      <div key={prod.id} className="flex justify-between items-center p-2 rounded-lg border border-slate-150 hover:bg-slate-50 transition">
                                        <div>
                                          <div className="font-bold text-slate-900">{prod.name}</div>
                                          <div className="text-[9px] text-slate-400 font-bold">HSN: {prod.hsnCode || 'N/A'} • {variantCount} variant{variantCount !== 1 ? 's' : ''} defined</div>
                                        </div>
                                        <div className="text-right">
                                          <span className={`px-3.5 py-0.5 rounded-full font-bold text-[10px] ${
                                            totalStock > 0 ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/50' : 'bg-rose-50 text-rose-700 border border-rose-200/50'
                                          }`}>
                                            Stock: {totalStock} units
                                          </span>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              ) : (
                                <div className="text-center py-8 text-slate-400 italic text-sm">
                                  No operational products are currently linked to this category template.
                                </div>
                              )}
                            </div>

                          </div>
                        </td>
                      </tr>
                    )}

                  </React.Fragment>
                );
              })}

              {/* Empty state view */}
              {sortedAndFilteredCategories.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-16 text-center text-slate-400">
                    <div className="max-w-md mx-auto space-y-3.5">
                      <Layers className="w-12 h-12 text-slate-300 mx-auto" />
                      <h4 className="font-extrabold text-slate-700 text-base">No Results Match Filters</h4>
                      <p className="text-slate-450 text-sm text-slate-500">
                        Try modifying your active query, clearing the filters, or inserting a category template below.
                      </p>
                      <button
                        onClick={() => {
                          setSearchTerm('');
                          setProductCountFilter('ALL');
                          setAttrCountFilter('ALL');
                          setRecentlyCreatedFilter(false);
                        }}
                        className="bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold px-4.5 py-2.5 rounded-lg text-sm"
                      >
                        Reset Search Parameters
                      </button>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* PRO-KEYBOARD SHORTCUTS HINTS STRIP (Tally Philosophy) */}
        <div className="bg-white/80 border-t border-slate-100 px-6 py-4 text-xs text-slate-400 flex flex-wrap items-center justify-between gap-3 font-medium select-none">
          <div className="flex items-center gap-1.5">
            <span className="bg-slate-200 text-slate-800 border border-slate-300 px-1.5 py-0.5 rounded font-mono font-bold tracking-tight text-[10px]">TALLY MODE</span>
            <span>Table focused? Use standard master shortcuts to operate.</span>
          </div>
          <div className="flex flex-wrap items-center gap-3.5">
            <span className="flex items-center gap-1">
              <span className="bg-white border border-slate-300 px-1 py-0.5 rounded font-mono text-[10px] shadow-xs">↑↓</span>
              <span>Select Row</span>
            </span>
            <span className="flex items-center gap-1">
              <span className="bg-white border border-slate-300 px-1.5 py-0.5 rounded font-mono text-[10px] shadow-xs">Enter</span>
              <span>Drill Down / Toggle</span>
            </span>
            <span className="flex items-center gap-1">
              <span className="bg-white border border-slate-300 px-1.5 py-0.5 rounded font-mono text-[10px] shadow-xs">E</span>
              <span>Edit Code</span>
            </span>
            <span className="flex items-center gap-1">
              <span className="bg-white border border-slate-300 px-1.5 py-0.5 rounded font-mono text-[10px] shadow-xs">Del</span>
              <span>Delete Category</span>
            </span>
          </div>
        </div>

        {/* HIGH-DENSITY TABLE PAGINATION FOOTER */}
        <div className="bg-[#E2E8F0] border-t border-slate-200 px-5 py-4 flex flex-col sm:flex-row justify-between items-center gap-3 text-sm font-bold text-[#0F172A] select-none no-print">
          <div>
            Showing <span className="font-bold">{sortedAndFilteredCategories.length === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1}</span> to <span className="font-bold">{Math.min(sortedAndFilteredCategories.length, currentPage * itemsPerPage)}</span> of <span className="font-bold">{sortedAndFilteredCategories.length}</span> categories templates
          </div>

          <div className="flex flex-wrap items-center gap-4">
            {/* Items per page selector */}
            <div className="flex items-center gap-2">
              <span className="text-slate-550">Row Density:</span>
              <select
                value={itemsPerPage}
                onChange={(e) => {
                  setItemsPerPage(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="bg-white border border-slate-300 text-slate-800 rounded px-3 py-1 outline-none text-sm"
              >
                <option value={10}>10 per page</option>
                <option value={20}>20 per page</option>
                <option value={50}>50 per page</option>
              </select>
            </div>

            {/* Pagination numbers */}
            <div className="flex items-center gap-1">
              <button
                type="button"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(1)}
                className="px-3.5 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 disabled:opacity-40 disabled:hover:bg-white text-[10px]"
              >
                First
              </button>
              <button
                type="button"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                className="px-3.5 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 disabled:opacity-40 disabled:hover:bg-white text-[10px]"
              >
                Prev
              </button>
              
              <span className="px-4.5 py-1.5 bg-white border border-slate-300 rounded-lg text-sm font-bold">
                Page {currentPage} of {totalPages}
              </span>

              <button
                type="button"
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                className="px-3.5 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 disabled:opacity-40 disabled:hover:bg-white text-[10px]"
              >
                Next
              </button>
              <button
                type="button"
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(totalPages)}
                className="px-3.5 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 disabled:opacity-40 disabled:hover:bg-white text-[10px]"
              >
                Last
              </button>
            </div>
          </div>
        </div>

      </div>

      {/* BULK IMPORT / POPULAR TEMPLATES MODAL */}
      {showImportModal && (
        <div 
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowImportModal(false);
              setImportError(null);
            }
          }}
          className="fixed inset-0 bg-slate-950/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm overflow-y-auto"
        >
          <div 
            ref={importModalRef}
            onClick={(e) => e.stopPropagation()}
            className="bg-[var(--surface)] border border-[var(--border-default)] shadow-xl flex flex-col max-h-[85vh] rounded-2xl w-full max-w-3xl"
          >
            
            {/* Modal header */}
            <div className="p-5 border-b border-[var(--border-subtle)] flex justify-between items-center">
              <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                <Upload className="w-5 h-5 text-blue-600" />
                Bulk Template Integration Workspace
              </h2>
              <button
                onClick={() => {
                  setShowImportModal(false);
                  setImportError(null);
                }}
                className="p-1 text-slate-400 hover:text-slate-800 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4">
              <div className="bg-blue-50 border border-blue-100/50 p-4 rounded-xl text-sm text-slate-700 space-y-1.5 font-medium">
                <p className="font-bold text-blue-600">Paste your Category Specification JSON payload below.</p>
                <p>Ensure properties map to arrays of category templates. We will index and integrate them immediately.</p>
              </div>

              {/* Shortcuts/Presets box */}
              <div className="space-y-2">
                <label className="block text-[11px] text-slate-500 uppercase font-bold tracking-wider">
                  Instant Preset Categories:
                </label>
                <div className="flex flex-wrap items-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => loadPresetTemplate('switch')}
                    className="px-4 py-2.5 bg-[var(--app-bg)] border border-[var(--border-default)] hover:bg-slate-50 text-slate-700 text-[13px] font-bold rounded-lg transition-colors text-left shadow-sm"
                  >
                    🚀 Cable & Conduit Preset
                  </button>
                  <button
                    type="button"
                    onClick={() => loadPresetTemplate('home')}
                    className="px-4 py-2.5 bg-[var(--app-bg)] border border-[var(--border-default)] hover:bg-slate-50 text-slate-700 text-[13px] font-bold rounded-lg transition-colors text-left shadow-sm"
                  >
                    💡 Smart Home LED & Switch Preset
                  </button>
                  <button
                    type="button"
                    onClick={() => loadPresetTemplate('industrial')}
                    className="px-4 py-2.5 bg-[var(--app-bg)] border border-[var(--border-default)] hover:bg-slate-50 text-slate-700 text-[13px] font-bold rounded-lg transition-colors text-left shadow-sm"
                  >
                    ⚙️ Transformer & MCCB Preset
                  </button>
                </div>
              </div>

              {/* Large Text Area */}
              <div className="space-y-2">
                <label className="block text-[11px] text-slate-500 uppercase font-bold tracking-wider">
                  Category JSON Data
                </label>
                <textarea
                  value={importText}
                  onChange={(e) => setImportText(e.target.value)}
                  placeholder='[\n  {\n    "name": "Custom Breakers",\n    "attributes": [\n      { "name": "Ampere", "type": "number", "required": true }\n    ]\n  }\n]'
                  className="w-full h-44 bg-[var(--app-bg)] border border-[var(--border-default)] text-slate-900 rounded-xl p-3 font-mono text-[11px] outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 shadow-sm"
                />
              </div>

              {importError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-sm font-medium flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 flex-shrink-0" />
                  <span>{importError}</span>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-5 border-t border-[var(--border-default)] flex justify-end gap-3 bg-[var(--app-bg)] rounded-b-2xl">
              <button
                type="button"
                onClick={() => {
                  setShowImportModal(false);
                  setImportError(null);
                }}
                className="px-4 py-2 border border-[var(--border-default)] hover:bg-[var(--surface)] font-bold rounded-lg text-slate-600 text-[13px] shadow-sm transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!importText.trim()}
                onClick={handleImportSubmit}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg text-[13px] disabled:opacity-50 transition-colors shadow-sm"
              >
                Integrate Templates
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ADD / EDIT DYNAMIC CATEGORY BUILDER MODAL */}
      {showModal && (
        <div 
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowModal(false);
            }
          }}
          className="fixed inset-0 bg-slate-950/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm overflow-y-auto"
        >
          <form
            ref={categoryModalRef}
            onSubmit={handleSave}
            onClick={(e) => e.stopPropagation()}
            className="bg-[var(--surface)] border border-[var(--border-default)] p-6 sm:p-8 shadow-xl space-y-6 text-slate-800 rounded-2xl w-full max-w-4xl"
          >
            <div className="flex justify-between items-center border-b border-[var(--border-subtle)] pb-4">
              <h2 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
                <FolderOpen className="w-5 h-5 text-blue-600" />
                {editingCategory ? 'Edit Specification Template' : 'Add New Category'}
              </h2>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="p-1.5 hover:bg-slate-100 text-slate-400 hover:text-slate-800 font-bold text-sm rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-[11px] font-bold uppercase text-slate-500 tracking-wider mb-2">
                  Category Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="e.g. Transformers, Lighting & Accessories..."
                  required
                  className="w-full bg-[var(--app-bg)] border border-[var(--border-default)] rounded-lg p-2.5 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-[13px] font-medium outline-none shadow-sm text-slate-800 transition-all"
                />
              </div>

              <div className="border-t border-[var(--border-subtle)] pt-5">
                <div className="flex justify-between items-center mb-3">
                  <div>
                    <h3 className="font-bold text-slate-800 text-base">Specification Properties</h3>
                    <p className="text-slate-500 text-[11px] mt-0.5 font-medium">
                      Configure dynamic parameters that assigned products in this category inherit instantly.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleAddAttribute}
                    className="bg-[var(--surface)] hover:bg-[var(--app-bg)] border border-[var(--border-default)] text-slate-700 px-4 py-2 rounded-lg text-[13px] font-bold transition-colors shadow-sm flex items-center gap-1.5 cursor-pointer"
                  >
                    <Plus className="w-4 h-4 text-blue-600" /> Add Attribute
                  </button>
                </div>

                <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
                  {attributes.map((attr, idx) => (
                    <div
                      key={idx}
                      className="bg-[var(--app-bg)] px-4 py-3.5 rounded-xl border border-[var(--border-default)] relative grid grid-cols-1 md:grid-cols-12 gap-3 items-center group/item text-[13px] shadow-sm"
                    >
                      <div className="md:col-span-1 flex gap-1 items-center">
                        <button
                          type="button"
                          onClick={() => moveAttribute(idx, 'up')}
                          disabled={idx === 0}
                          className="p-1 hover:bg-slate-200 rounded text-slate-400 hover:text-slate-700 disabled:opacity-30 cursor-pointer"
                          title="Move specification up"
                        >
                          <ChevronUp className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => moveAttribute(idx, 'down')}
                          disabled={idx === attributes.length - 1}
                          className="p-1 hover:bg-slate-200 rounded text-slate-400 hover:text-slate-700 disabled:opacity-30 cursor-pointer"
                          title="Move specification down"
                        >
                          <ChevronDown className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="md:col-span-4">
                        <input
                          type="text"
                          placeholder="Property Title (e.g. Voltage Phase)"
                          value={attr.name}
                          onChange={e => handleUpdateAttribute(idx, 'name', e.target.value)}
                          required
                          className="w-full bg-[var(--surface)] border border-[var(--border-default)] focus:border-blue-500 rounded-lg p-2 text-[13px] font-medium outline-none text-slate-800"
                        />
                      </div>

                      <div className="md:col-span-3">
                        <select
                          value={attr.type}
                          onChange={e => handleUpdateAttribute(idx, 'type', e.target.value)}
                          className="w-full bg-[var(--surface)] border border-[var(--border-default)] focus:border-blue-500 rounded-lg p-2 text-[13px] font-medium outline-none text-slate-800 cursor-pointer"
                        >
                          <option value="text">Text / String</option>
                          <option value="number">Numeric Input</option>
                          <option value="boolean">Boolean (Yes/No Toggle)</option>
                          <option value="select">Dropdown Choice Menu</option>
                        </select>
                      </div>

                      <div className="md:col-span-3 flex items-center gap-2">
                        <label className="flex items-center gap-1.5 cursor-pointer select-none font-bold">
                          <input
                            type="checkbox"
                            checked={attr.required}
                            onChange={e => handleUpdateAttribute(idx, 'required', e.target.checked)}
                            className="rounded border-[var(--border-default)] text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
                          />
                          <span className="text-[13px] text-slate-600 font-medium tracking-wide">Mandatory</span>
                        </label>
                      </div>

                      <div className="md:col-span-1 text-right">
                        <button
                          type="button"
                          onClick={() => handleRemoveAttribute(idx)}
                          title="Remove specification"
                          className="p-1.5 text-rose-600 hover:text-rose-700 hover:bg-rose-50 transition-colors duration-150 rounded-lg cursor-pointer"
                        >
                          <X className="w-5 h-5" />
                        </button>
                      </div>

                      {attr.type === 'select' && (
                        <div className="md:col-span-11 md:col-start-2 mt-1">
                          <input
                            type="text"
                            placeholder="Menu options list (comma-separated, e.g. 5W, 10W, 15W)"
                            value={attr.options?.join(', ') || ''}
                            onChange={e => handleUpdateAttribute(idx, 'options', e.target.value)}
                            required
                            className="w-full bg-[var(--surface)] border border-[var(--border-default)] focus:border-blue-500 rounded-lg p-2 text-[13px] outline-none font-medium placeholder:text-slate-400"
                          />
                        </div>
                      )}
                    </div>
                  ))}

                  {attributes.length === 0 && (
                    <div className="text-center py-8 bg-[var(--app-bg)] border border-dashed border-[var(--border-default)] rounded-xl text-slate-400 text-[13px]">
                      No attributes defined yet. Click "+ Add Attribute" to set dynamic parameters.
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-5 border-t border-[var(--border-default)] bg-[var(--app-bg)] -mx-6 sm:-mx-8 -mb-6 sm:-mb-8 p-5 px-6 sm:px-8 rounded-b-2xl">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="px-5 py-2 rounded-lg border border-[var(--border-default)] bg-[var(--surface)] hover:bg-slate-50 transition-colors font-bold text-slate-600 text-[13px] shadow-sm cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-lg bg-blue-600 text-white font-bold hover:bg-blue-700 transition-colors shadow-sm text-[13px] cursor-pointer"
              >
                {editingCategory ? 'Update Specifications Schema' : 'Create Category Template'}
              </button>
            </div>
          </form>
        </div>
      )}

    </div>
  );
};
