
import React, { useState, useMemo, useEffect } from 'react';
import { DashboardStats, Product, Sale, UserRole, Category, StockMovement, AuditLog, CartItem } from './types';
import { POS } from './components/POS';
import { ChatReport } from './components/ChatReport';
import { ProductForm } from './components/ProductForm';
import { StockMovementModal } from './components/StockMovementModal';
import { Reports } from './components/Reports';
import { CategoriesModule } from './components/CategoriesModule';
import { BulkImport } from './components/BulkImport';
import { BulkUpdate } from './components/BulkUpdate';
import { BarcodeManager } from './components/BarcodeManager';
import { StockMovementLog } from './components/StockMovementLog';
import { SalesLedger } from './components/SalesLedger';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, LineChart, Line, AreaChart, Area, CartesianGrid } from 'recharts';
import { LayoutDashboard, ShoppingCart, Package, FileText, Sparkles, TrendingUp, AlertTriangle, Landmark, Plus, ArrowUpDown, History, FolderOpen, Search, SlidersHorizontal, ChevronLeft, ChevronRight, Coins, Sliders, Users, BarChart3, Clock, ArrowUpRight, Wallet, CreditCard, CheckCircle2, Zap } from 'lucide-react';
import { DateFilter, PresetKey, getPresetDateBounds, formatDateDisplay } from './components/DateFilter';

// Mock Initial Setup
const generateInitialSales = (): Sale[] => {
  const result: Sale[] = [];
  const now = new Date();
  
  const paymentModes: ('CASH' | 'CARD' | 'UPI')[] = ['CASH', 'UPI', 'CARD', 'UPI', 'CASH'];
  const customers = [
    { name: 'Walk-in Customer', phone: '' },
    { name: 'Amit Sharma', phone: '9876543210' },
    { name: 'Priya Patel', phone: '9123456789' },
    { name: 'Rajesh Verma', phone: '9345678120' }
  ];

  // Let's generate 40 sales spread across the trailing 15 days
  for (let i = 0; i < 40; i++) {
    const daysAgo = Math.floor(i / 2.5); // Spread over 16 days
    const hour = 9 + (i % 11); // Shop hours 09:00 to 20:00
    const minute = (i * 13) % 60;
    
    const saleDate = new Date();
    // Use UTC date safely, avoiding mutation
    saleDate.setDate(now.getDate() - daysAgo);
    saleDate.setHours(hour, minute, 0, 0);

    const customer = customers[i % customers.length];
    
    const items: CartItem[] = [];
    if (i % 2 === 0) {
      items.push({
        productId: 'p1',
        sku: 'CAF-WH-1200',
        name: 'Crompton Aura Fan (WHITE 1200mm)',
        qty: 1 + (i % 3),
        price: 2850,
        costPrice: 2100,
        gstRate: 18,
        discount: i % 4 === 0 ? 100 : 0
      });
    }
    if (i % 3 === 0 || i % 2 !== 0) {
      items.push({
        productId: 'p2',
        sku: 'HW-1.5-RED',
        name: 'Havells HRFR Wire (RED 1.5sqmm)',
        qty: 2 + (i % 4),
        price: 1800,
        costPrice: 1450,
        gstRate: 18,
        discount: 0
      });
    }
    if (i % 5 === 0) {
      items.push({
        productId: 'p1',
        sku: 'CAF-BR-1200',
        name: 'Crompton Aura Fan (BROWN 1200mm)',
        qty: 1,
        price: 2950,
        costPrice: 2200,
        gstRate: 18,
        discount: 50
      });
    }

    const subTotal = items.reduce((acc, item) => acc + (item.price * item.qty), 0);
    const totalDiscount = items.reduce((acc, item) => acc + (item.discount * item.qty), 0);
    const totalGst = Math.round((subTotal - totalDiscount) * 0.18);
    const grandTotal = subTotal - totalDiscount + totalGst;

    result.push({
      id: `INV-${saleDate.getFullYear()}${(saleDate.getMonth()+1).toString().padStart(2, '0')}${saleDate.getDate().toString().padStart(2, '0')}-${1000 + i}`,
      customerId: customer.phone ? `cust_${customer.phone}` : 'walkin',
      customerName: customer.name,
      customerPhone: customer.phone || undefined,
      items,
      subTotal,
      totalGst,
      totalDiscount,
      grandTotal,
      paymentMode: paymentModes[i % paymentModes.length],
      timestamp: saleDate.toISOString(),
      userId: 'Admin',
      status: 'PAID'
    });
  }

  return result.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
};

const INITIAL_CATEGORIES: Category[] = [
  { id: '1', code: 'CAT-0001', name: 'Fans', attributes: [
    { name: 'Sweep Size', type: 'text', required: true }, 
    { name: 'Color', type: 'select', options: ['White', 'Brown', 'Ivory', 'Black'], required: false }
  ]},
  { id: '2', code: 'CAT-0002', name: 'Wires', attributes: [
    { name: 'Gauge', type: 'text', required: true }, 
    { name: 'Length', type: 'number', required: true }
  ]}
];

const INITIAL_PRODUCTS: Product[] = [
  {
    id: 'p1', categoryId: '1', name: 'Crompton Aura Fan', hsnCode: '8414',
    gstRates: { cgst: 9, sgst: 9, igst: 18 },
    variants: [
      { sku: 'CAF-WH-1200', attrValues: { 'Sweep Size': '1200mm', 'Color': 'White' }, price: 2850, costPrice: 2100, stock: 12, lowStockThreshold: 5 },
      { sku: 'CAF-BR-1200', attrValues: { 'Sweep Size': '1200mm', 'Color': 'Brown' }, price: 2950, costPrice: 2200, stock: 3, lowStockThreshold: 5 }
    ]
  },
  {
    id: 'p2', categoryId: '2', name: 'Havells HRFR Wire', hsnCode: '8544',
    gstRates: { cgst: 9, sgst: 9, igst: 18 },
    variants: [
      { sku: 'HW-1.5-RED', attrValues: { 'Gauge': '1.5sqmm', 'Length': 90 }, price: 1800, costPrice: 1450, stock: 45, lowStockThreshold: 10 }
    ]
  }
];

const CustomDailyTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xl text-sm font-sans space-y-1.5 min-w-[200px]">
        <p className="font-extrabold text-slate-900 border-b border-slate-100 pb-1.5">{label || data.date}</p>
        <div className="flex justify-between gap-4 text-slate-600">
          <span className="font-semibold">Date:</span>
          <span className="font-bold text-slate-800">{label || data.date}</span>
        </div>
        <div className="flex justify-between gap-4 text-slate-600">
          <span className="font-semibold">Total Revenue:</span>
          <span className="font-bold text-emerald-600">₹{Number(data.revenue || 0).toLocaleString()}</span>
        </div>
        <div className="flex justify-between gap-4 text-slate-600">
          <span className="font-semibold">Total Invoices:</span>
          <span className="font-bold text-blue-600">{data.invoices || 0} bills</span>
        </div>
        <div className="flex justify-between gap-4 text-slate-600">
          <span className="font-semibold">Avg. Bill Value:</span>
          <span className="font-bold text-indigo-600">₹{Number(data.avgValue || 0).toLocaleString()}</span>
        </div>
      </div>
    );
  }
  return null;
};

const App: React.FC = () => {
  const [activeModule, setActiveModule] = useState<'DASHBOARD' | 'POS' | 'INVENTORY' | 'CHAT' | 'REPORTS' | 'CATEGORIES' | 'SALES_LEDGER'>('DASHBOARD');
  const [inventorySubTab, setInventorySubTab] = useState<'PRODUCTS' | 'CATEGORIES' | 'MOVEMENT' | 'IMPORT' | 'UPDATE' | 'BARCODE'>('PRODUCTS');

  // Sidebar, Focus Mode, and Autohide States (Tally philosophy)
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(() => {
    const saved = localStorage.getItem('es_sidebar_collapsed');
    return saved === 'true';
  });
  const [isSidebarHovered, setIsSidebarHovered] = useState<boolean>(false);
  const [isFocusMode, setIsFocusMode] = useState<boolean>(false);
  const [autoHideNavEnabled, setAutoHideNavEnabled] = useState<boolean>(() => {
    const saved = localStorage.getItem('es_autohide_nav');
    return saved !== 'false'; // default to true
  });

  // Synchronize Preferences
  useEffect(() => {
    localStorage.setItem('es_sidebar_collapsed', String(isSidebarCollapsed));
  }, [isSidebarCollapsed]);

  useEffect(() => {
    localStorage.setItem('es_autohide_nav', String(autoHideNavEnabled));
  }, [autoHideNavEnabled]);

  // POS automatically collapses sidebar to prioritize workspace size
  useEffect(() => {
    if (activeModule === 'POS') {
      setIsSidebarCollapsed(true);
    }
  }, [activeModule]);

  // 1. Rescue focus helper to avoid dead focus states
  const rescueFocus = () => {
    if (!document.activeElement || document.activeElement === document.body) {
      const candidates = Array.from(document.querySelectorAll<HTMLElement>(
        'button, [tabindex], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), a[href]'
      )).filter(el => {
        if (el.tabIndex < 0) return false;
        const rect = el.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) return false;
        const style = window.getComputedStyle(el);
        if (style.display === 'none' || style.visibility === 'hidden') return false;
        return true;
      });

      if (candidates.length > 0) {
        // Prefer search input or first item
        const searchBox = candidates.find(c => c.tagName === 'INPUT' && (c.id?.includes('search') || c.getAttribute('placeholder')?.toLowerCase().includes('search')));
        if (searchBox) {
          searchBox.focus();
        } else {
          candidates[0].focus();
        }
      }
    }
  };

  // Rescue focus on active page changes
  useEffect(() => {
    setTimeout(rescueFocus, 50);
  }, [activeModule, inventorySubTab]);

  // Global key Listener (Ctrl+B, F1-F12, Numeric edits, and Universal Spatial Navigation)
  useEffect(() => {
    const handleGlobalKeys = (e: KeyboardEvent) => {
      // Prioritize rescue focus if no active element
      rescueFocus();

      const active = document.activeElement as HTMLElement | null;

      // 1. Sidebar toggles (Ctrl+B)
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b') {
        e.preventDefault();
        setIsSidebarCollapsed(prev => !prev);
        return;
      }

      // 2. Intercept and override numeric inputs globally
      // (Wait: we skip cells inside POS item grid which has its own precise event handlers)
      if (active && active.tagName === 'INPUT' && (active as HTMLInputElement).type === 'number' && !active.id.includes('cell-')) {
        if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
          e.stopPropagation();
          if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
            e.preventDefault();
            const input = active as HTMLInputElement;
            const step = parseFloat(input.step) || 1;
            const val = parseFloat(input.value) || 0;
            const min = input.min !== "" ? parseFloat(input.min) : undefined;
            const max = input.max !== "" ? parseFloat(input.max) : undefined;
            
            let newVal = e.key === 'ArrowUp' ? val + step : val - step;
            if (min !== undefined && newVal < min) newVal = min;
            if (max !== undefined && newVal > max) newVal = max;
            
            input.value = String(newVal);
            
            // Trigger standard input update cycles
            const inputEvent = new Event('input', { bubbles: true });
            input.dispatchEvent(inputEvent);
            const changeEvent = new Event('change', { bubbles: true });
            input.dispatchEvent(changeEvent);
            
            try {
              input.select();
            } catch (err) {}
          }
          return;
        }
      }

      // 3. Function Key commands (F1-F12)
      if (['F2', 'F4', 'F5', 'F6', 'F7', 'F8', 'F9', 'F10', 'F11', 'F12'].includes(e.key)) {
        e.preventDefault();
        switch (e.key) {
          case 'F2': {
            // Find search field
            const searchInput = (
              document.getElementById('search-pos') ||
              document.querySelector('input[placeholder*="Search"]') ||
              document.querySelector('input[placeholder*="search"]') ||
              document.querySelector('input[type="text"]')
            ) as HTMLInputElement | null;
            if (searchInput) {
              searchInput.focus();
              try {
                searchInput.select();
              } catch (err) {}
            }
            break;
          }
          case 'F4':
            setActiveModule('INVENTORY');
            setInventorySubTab('PRODUCTS');
            break;
          case 'F5':
            setActiveModule('INVENTORY');
            setInventorySubTab('MOVEMENT');
            break;
          case 'F6':
            setActiveModule('CATEGORIES');
            break;
          case 'F7':
            setActiveModule('REPORTS');
            break;
          case 'F8':
            setActiveModule('DASHBOARD');
            break;
          case 'F9':
            setActiveModule('SALES_LEDGER');
            break;
          case 'F10': {
            // Smart complete/submit/save
            const submitBtn = (
              document.getElementById('btn-complete-bill') ||
              document.getElementById('btn-confirm-customer') ||
              document.querySelector('form button[type="submit"]') ||
              document.querySelector('button.bg-blue-600') ||
              Array.from(document.querySelectorAll('button')).find(btn => {
                const text = btn.innerText.toLowerCase();
                return text.includes('save') || text.includes('submit') || text.includes('complete') || text.includes('confirm');
              })
            ) as HTMLElement | null;
            if (submitBtn) {
              submitBtn.click();
            }
            break;
          }
          case 'F11':
            setIsFocusMode(prev => !prev);
            break;
          case 'F12': {
            // Configure
            setActiveModule('POS');
            setTimeout(() => {
              const settingsBtn = document.querySelector('button[title*="Configure"]') || document.querySelector('button[title*="Settings"]') as HTMLElement | null;
              if (settingsBtn) settingsBtn.click();
            }, 100);
            break;
          }
        }
        return;
      }

      // 4. Universal Directional Spatial Navigation
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
        if (!active) return;

        // Skip spatial focus movement on POS grid specialized elements to allow correct dedicated behavior
        if (active.id && (active.id.startsWith('cell-') || active.id === 'search-pos' || active.id === 'flat-discount-input' || active.id.startsWith('payment-mode-'))) {
          return;
        }

        // Skip spatial focus movement under key lockouts:
        // A. If focused on input or textarea of text type, allow caret motion first
        if (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA') {
          const isText = (active as HTMLInputElement).type !== 'number';
          if (isText) {
            const pos = (active as HTMLInputElement).selectionStart || 0;
            const len = (active as HTMLInputElement).value.length;
            if (e.key === 'ArrowRight' && pos < len) return;
            if (e.key === 'ArrowLeft' && pos > 0) return;
            if (active.tagName === 'TEXTAREA' && (e.key === 'ArrowUp' || e.key === 'ArrowDown')) return;
          } else {
            // Numeric inputs: arrow keys should NOT trigger spatial focus while editing
            return;
          }
        }

        // B. Select dropdowns: Up/Down arrow changes active option list natively
        if (active.tagName === 'SELECT' && ['ArrowUp', 'ArrowDown'].includes(e.key)) {
          return;
        }

        e.preventDefault();

        // Find all visible interactable focus targets
        const selector = 'button, [tabindex], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), a[href]';
        const candidates = Array.from(document.querySelectorAll<HTMLElement>(selector))
          .filter(el => {
            if (el === active) return false;
            if (el.tabIndex < 0) return false;
            if (el.id === 'root') return false;
            
            const rect = el.getBoundingClientRect();
            if (rect.width === 0 || rect.height === 0) return false;
            
            const style = window.getComputedStyle(el);
            if (style.display === 'none' || style.visibility === 'hidden') return false;
            
            return true;
          });

        if (candidates.length === 0) return;

        const activeRect = active.getBoundingClientRect();
        const activeCx = activeRect.left + activeRect.width / 2;
        const activeCy = activeRect.top + activeRect.height / 2;

        let bestCandidate: HTMLElement | null = null;
        let bestScore = Infinity;

        for (const cand of candidates) {
          const candRect = cand.getBoundingClientRect();
          const candCx = candRect.left + candRect.width / 2;
          const candCy = candRect.top + candRect.height / 2;

          const dx = candCx - activeCx;
          const dy = candCy - activeCy;

          let score = Infinity;

          if (e.key === 'ArrowRight') {
            if (candCx > activeCx + 4) {
              score = Math.abs(dx) + 3.5 * Math.abs(dy);
            }
          } else if (e.key === 'ArrowLeft') {
            if (candCx < activeCx - 4) {
              score = Math.abs(dx) + 3.5 * Math.abs(dy);
            }
          } else if (e.key === 'ArrowDown') {
            if (candCy > activeCy + 4) {
              score = 3.5 * Math.abs(dx) + Math.abs(dy);
            }
          } else if (e.key === 'ArrowUp') {
            if (candCy < activeCy - 4) {
              score = 3.5 * Math.abs(dx) + Math.abs(dy);
            }
          }

          if (score < bestScore) {
            bestScore = score;
            bestCandidate = cand;
          }
        }

        if (bestCandidate) {
          bestCandidate.focus();
          if (bestCandidate.tagName === 'INPUT') {
            try {
              (bestCandidate as HTMLInputElement).select();
            } catch (err) {}
          }
        }
      }
    };

    window.addEventListener('keydown', handleGlobalKeys);
    return () => window.removeEventListener('keydown', handleGlobalKeys);
  }, [activeModule, inventorySubTab]);

  const sidebarCollapsedEffective = isSidebarCollapsed && !isSidebarHovered;

  const handleMainClick = () => {
    if (autoHideNavEnabled && !isSidebarCollapsed) {
      setIsSidebarCollapsed(true);
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!autoHideNavEnabled || !isSidebarCollapsed) {
      if (isSidebarHovered) setIsSidebarHovered(false);
      return;
    }
    // Expand temporarily if hover near left edge (<= 25px offset)
    if (e.clientX <= 25) {
      setIsSidebarHovered(true);
    } else if (e.clientX > 270) {
      // Collapse when mouse moves far away from expanded width
      setIsSidebarHovered(false);
    }
  };
  const [products, setProducts] = useState<Product[]>(() => {
    const saved = localStorage.getItem('es_products');
    return saved ? JSON.parse(saved) : INITIAL_PRODUCTS;
  });
  const [sales, setSales] = useState<Sale[]>(() => {
    const saved = localStorage.getItem('es_sales');
    if (saved) return JSON.parse(saved);
    const initial = generateInitialSales();
    localStorage.setItem('es_sales', JSON.stringify(initial));
    return initial;
  });
  const [categories, setCategories] = useState<Category[]>(() => {
    const saved = localStorage.getItem('es_categories');
    const loaded: any[] = saved ? JSON.parse(saved) : INITIAL_CATEGORIES;
    
    // Migrate categories to assign business Category Codes if missing
    let counter = parseInt(localStorage.getItem('es_category_code_counter') || '0', 10);
    const updated = loaded.map((cat: any) => {
      if (cat.code && cat.code.startsWith('CAT-')) {
        const numPart = parseInt(cat.code.split('-')[1], 10);
        if (!isNaN(numPart) && numPart > counter) {
          counter = numPart;
        }
        return cat as Category;
      }
      
      let assignedCode = '';
      if (cat.id === '1') {
        assignedCode = 'CAT-0001';
      } else if (cat.id === '2') {
        assignedCode = 'CAT-0002';
      } else {
        counter++;
        assignedCode = `CAT-${String(counter).padStart(4, '0')}`;
      }
      
      const numPart = parseInt(assignedCode.split('-')[1], 10);
      if (!isNaN(numPart) && numPart > counter) {
        counter = numPart;
      }
      return {
        ...cat,
        code: assignedCode
      } as Category;
    });
    localStorage.setItem('es_category_code_counter', String(counter));
    return updated;
  });
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [showProductModal, setShowProductModal] = useState(false);
  const [showMovementModal, setShowMovementModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | undefined>();

  // Dashboard Analytics Date Filter States
  const [dashPreset, setDashPreset] = useState<PresetKey>('MONTH');
  const [dashStartDate, setDashStartDate] = useState<string>('');
  const [dashEndDate, setDashEndDate] = useState<string>('');

  // Categories & Attributes logic
  const handleAddCategory = (cat: Category) => {
    let catWithCode = { ...cat };
    if (!catWithCode.code) {
      let counter = parseInt(localStorage.getItem('es_category_code_counter') || '0', 10);
      categories.forEach(c => {
        if (c.code && c.code.startsWith('CAT-')) {
          const numPart = parseInt(c.code.split('-')[1], 10);
          if (!isNaN(numPart) && numPart > counter) {
            counter = numPart;
          }
        }
      });
      counter++;
      localStorage.setItem('es_category_code_counter', String(counter));
      catWithCode.code = `CAT-${String(counter).padStart(4, '0')}`;
    }
    setCategories(prev => [...prev, catWithCode]);
    logActivity('CAT_ADD', `Added category template ${catWithCode.name} (${catWithCode.code})`);
  };

  const handleEditCategory = (cat: Category) => {
    setCategories(prev => prev.map(c => c.id === cat.id ? cat : c));
    logActivity('CAT_EDIT', `Updated category dynamic attributes for ${cat.name}`);
  };

  const handleDeleteCategory = (id: string) => {
    const deletedCatName = categories.find(c => c.id === id)?.name || id;
    setCategories(prev => prev.filter(c => c.id !== id));
    logActivity('CAT_DEL', `Deleted category template ${deletedCatName}`);
  };

  // State for search & filtering inside Inventory
  const [invSearch, setInvSearch] = useState('');
  const [invCategoryFilter, setInvCategoryFilter] = useState('');
  const [invStatusFilter, setInvStatusFilter] = useState<'ALL' | 'HEALTHY' | 'LOW_STOCK' | 'OUT_OF_STOCK'>('ALL');
  const [invAttrFilters, setInvAttrFilters] = useState<Record<string, string>>({});

  // Reset custom specification filters on category filter changes
  useEffect(() => {
    setInvAttrFilters({});
  }, [invCategoryFilter]);

  // Product Delete Handler
  const handleDeleteProduct = (productId: string) => {
    if (window.confirm("Are you sure you want to delete this product from the inventory master database?")) {
      const deletedProdName = products.find(p => p.id === productId)?.name || productId;
      setProducts(prev => prev.filter(p => p.id !== productId));
      logActivity('PROD_DEL', `Deleted product ${deletedProdName}`);
    }
  };

  // Selector for dynamically filtered products inside Inventory Module
  const filteredProductsForInventory = useMemo(() => {
    return products.map(p => {
      // Filter variants/SKUs inside this product
      const matchingVariants = (p.variants || []).filter(v => {
        // 1. Search Query
        const matchSearch = !invSearch || 
          p.name.toLowerCase().includes(invSearch.toLowerCase()) ||
          v.sku.toLowerCase().includes(invSearch.toLowerCase());
        if (!matchSearch) return false;

        // 2. Dynamic Attribute Specification Filters (only apply if Category is matched)
        if (invCategoryFilter && p.categoryId === invCategoryFilter) {
          for (const [attrName, attrValue] of Object.entries(invAttrFilters)) {
            if (attrValue) {
              const val = String(v.attrValues?.[attrName] || '');
              if (!val.toLowerCase().includes(attrValue.toLowerCase())) {
                return false;
              }
            }
          }
        }

        // 3. Stock Status filter logic
        const isOut = v.stock === 0;
        const isLow = v.stock > 0 && v.stock <= v.lowStockThreshold;
        const isHealthy = v.stock > v.lowStockThreshold;

        if (invStatusFilter === 'HEALTHY' && !isHealthy) return false;
        if (invStatusFilter === 'LOW_STOCK' && !isLow) return false;
        if (invStatusFilter === 'OUT_OF_STOCK' && !isOut) return false;

        return true;
      });

      return {
        ...p,
        variants: matchingVariants
      };
    }).filter(p => {
      // Keep product if general category matches and there is at least one active matching variant/SKU
      const matchCategory = !invCategoryFilter || p.categoryId === invCategoryFilter;
      return matchCategory && p.variants.length > 0;
    });
  }, [products, invSearch, invCategoryFilter, invAttrFilters, invStatusFilter]);

  // Persistence
  useEffect(() => {
    localStorage.setItem('es_products', JSON.stringify(products));
    localStorage.setItem('es_sales', JSON.stringify(sales));
    localStorage.setItem('es_categories', JSON.stringify(categories));
  }, [products, sales, categories]);

  const stats: DashboardStats = useMemo(() => {
    let stockVal = 0;
    let lowCount = 0;
    let runningSkuCount = 0;
    products.forEach(p => p.variants.forEach(v => {
      stockVal += v.stock * v.costPrice;
      runningSkuCount++;
      if (v.stock <= v.lowStockThreshold) lowCount++;
    }));

    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const monthStr = todayStr.substring(0, 7);

    const todaySales = sales.filter(s => s.timestamp.startsWith(todayStr));
    const monthSales = sales.filter(s => s.timestamp.startsWith(monthStr));

    const revenueToday = todaySales.reduce((acc, s) => acc + s.grandTotal, 0);
    const revenueMonth = monthSales.reduce((acc, s) => acc + s.grandTotal, 0);

    const profitToday = todaySales.reduce((acc, s) => {
      const saleCost = s.items.reduce((cAcc, item) => cAcc + (item.costPrice * item.qty), 0);
      return acc + (s.subTotal - s.totalDiscount - saleCost);
    }, 0);

    const transactionsTodayCount = todaySales.length;

    return {
      totalProducts: products.length,
      lowStockCount: lowCount,
      totalValuation: stockVal,
      todayRevenue: revenueToday,
      monthlyRevenue: revenueMonth,
      profitToday,
      skuCount: runningSkuCount,
      totalTransactionsToday: transactionsTodayCount
    };
  }, [products, sales]);

  // ----------------------------------------------------
  // DATE RANGE CALCULATIONS FOR THE DASHBOARD
  // ----------------------------------------------------
  const dashActiveDateRange = useMemo(() => {
    return getPresetDateBounds(dashPreset, dashStartDate, dashEndDate);
  }, [dashPreset, dashStartDate, dashEndDate]);

  // Filter sales for internal dashboard analytics
  const dashFilteredSales = useMemo(() => {
    if (!dashActiveDateRange) return sales;
    return sales.filter(s => {
      const t = new Date(s.timestamp);
      return t >= dashActiveDateRange.start && t <= dashActiveDateRange.end;
    });
  }, [sales, dashActiveDateRange]);

  // Daily aggregation memo
  const dailyTrendData = useMemo(() => {
    const map: Record<string, { dateStr: string; label: string; revenue: number; invoiceCount: number; sumTotal: number; dateObject: Date }> = {};

    let start = dashActiveDateRange?.start;
    let end = dashActiveDateRange?.end;

    // Use default values if no range
    if (!start || !end) {
      end = new Date();
      start = new Date();
      start.setDate(end.getDate() - 30);
    }

    // Generate continuous date slots
    const temp = new Date(start);
    let limitCount = 0;
    while (temp <= end && limitCount < 366) {
      const dStr = temp.toISOString().split('T')[0];
      const day = String(temp.getDate()).padStart(2, '0');
      const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      const mStr = monthNames[temp.getMonth()];
      const labelStr = `${day} ${mStr}`;

      map[dStr] = {
        dateStr: dStr,
        label: labelStr,
        revenue: 0,
        invoiceCount: 0,
        sumTotal: 0,
        dateObject: new Date(temp)
      };

      temp.setDate(temp.getDate() + 1);
      limitCount++;
    }

    // Fill with actual transactions
    dashFilteredSales.forEach(s => {
      const dStr = s.timestamp.split('T')[0];
      if (map[dStr]) {
        map[dStr].revenue += s.grandTotal;
        map[dStr].invoiceCount += 1;
        map[dStr].sumTotal += s.grandTotal;
      } else if (!dashActiveDateRange) {
        const saleDate = new Date(s.timestamp);
        const day = String(saleDate.getDate()).padStart(2, '0');
        const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        const mStr = monthNames[saleDate.getMonth()];
        const labelStr = `${day} ${mStr}`;
        map[dStr] = {
          dateStr: dStr,
          label: labelStr,
          revenue: s.grandTotal,
          invoiceCount: 1,
          sumTotal: s.grandTotal,
          dateObject: saleDate
        };
      }
    });

    const sorted = Object.values(map).sort((a, b) => a.dateObject.getTime() - b.dateObject.getTime());

    return sorted.map(d => ({
      date: d.label,
      revenue: Math.round(d.revenue),
      invoices: d.invoiceCount,
      avgValue: d.invoiceCount > 0 ? parseFloat((d.revenue / d.invoiceCount).toFixed(2)) : 0,
    }));
  }, [dashFilteredSales, dashActiveDateRange]);

  // Hourly trend memo
  const hourlySalesTrend = useMemo(() => {
    const hoursMap = Array.from({ length: 24 }).map((_, i) => ({
      hour: `${String(i).padStart(2, '0')}:00`,
      revenue: 0,
      invoices: 0
    }));

    dashFilteredSales.forEach(s => {
      try {
        const t = new Date(s.timestamp);
        const hr = t.getHours();
        if (hr >= 0 && hr < 24) {
          hoursMap[hr].revenue += s.grandTotal;
          hoursMap[hr].invoices += 1;
        }
      } catch (err) {
        // ignore invalid dates safely
      }
    });

    return hoursMap;
  }, [dashFilteredSales]);

  // Top Selling Products memo
  const topSellingProducts = useMemo(() => {
    const list: Record<string, { sku: string; name: string; qty: number; revenue: number }> = {};
    dashFilteredSales.forEach(s => {
      s.items.forEach(item => {
        if (!list[item.sku]) {
          list[item.sku] = { sku: item.sku, name: item.name, qty: 0, revenue: 0 };
        }
        list[item.sku].qty += item.qty;
        list[item.sku].revenue += item.qty * item.price;
      });
    });
    return Object.values(list)
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 5);
  }, [dashFilteredSales]);

  // Payment Method Distribution memo
  const paymentDistribution = useMemo(() => {
    const map: Record<string, { name: string; value: number }> = {};
    // Ensure all standard payment methods are defined to avoid empty charts
    ['CASH', 'UPI', 'CARD'].forEach(m => {
      map[m] = { name: m, value: 0 };
    });

    dashFilteredSales.forEach(s => {
      const mode = s.paymentMode || 'UPI';
      if (map[mode]) {
        map[mode].value += s.grandTotal;
      } else {
        map[mode] = { name: mode, value: s.grandTotal };
      }
    });
    return Object.values(map);
  }, [dashFilteredSales]);

  const topDashboardCustomers = useMemo(() => {
    const map: Record<string, { name: string; phone: string; totalSpent: number; billsCount: number }> = {};
    sales.forEach(s => {
      const key = s.customerPhone || s.customerName;
      if (!map[key]) {
        map[key] = { name: s.customerName, phone: s.customerPhone || 'Walk-in', totalSpent: 0, billsCount: 0 };
      }
      map[key].totalSpent += s.grandTotal;
      map[key].billsCount++;
    });
    return Object.values(map)
      .sort((a, b) => b.totalSpent - a.totalSpent)
      .slice(0, 5);
  }, [sales]);

  const logActivity = (action: string, details: string) => {
    const log: AuditLog = {
      id: Math.random().toString(36).substr(2, 9),
      userId: 'Admin',
      action,
      details,
      timestamp: new Date().toISOString()
    };
    setAuditLogs(prev => [log, ...prev]);
  };

  const handleSaleComplete = (sale: Sale) => {
    setSales(prev => [sale, ...prev]);
    setProducts(prev => prev.map(p => ({
      ...p,
      variants: p.variants.map(v => {
        const soldItem = sale.items.find(si => si.sku === v.sku);
        return soldItem ? { ...v, stock: Math.max(0, v.stock - soldItem.qty) } : v;
      })
    })));
    
    sale.items.forEach(item => {
      const movement: StockMovement = {
        id: Math.random().toString(36).substr(2, 9),
        productId: item.productId,
        variantSku: item.sku,
        type: 'OUT',
        qty: item.qty,
        reason: `Sale ${sale.id}`,
        timestamp: sale.timestamp,
        userId: sale.userId
      };
      setMovements(prev => [movement, ...prev]);
    });

    logActivity('POS_SALE', `Completed Sale ${sale.id} for ₹${sale.grandTotal}`);
    // Keep user in the active module for consecutive billing block
  };

  const handleMovementSubmit = (mov: Partial<StockMovement>) => {
    const fullMov: StockMovement = {
      ...mov,
      id: Math.random().toString(36).substr(2, 9),
      userId: 'Admin',
    } as StockMovement;

    setMovements(prev => [fullMov, ...prev]);
    setProducts(prev => prev.map(p => {
      if (p.id !== fullMov.productId) return p;
      return {
        ...p,
        variants: p.variants.map(v => {
          if (v.sku !== fullMov.variantSku) return v;
          let newStock = v.stock;
          if (fullMov.type === 'IN') newStock += fullMov.qty;
          else if (fullMov.type === 'OUT') newStock = Math.max(0, v.stock - fullMov.qty);
          else if (fullMov.type === 'ADJUST') newStock = fullMov.qty;
          return { ...v, stock: newStock };
        })
      };
    }));
    setShowMovementModal(false);
    logActivity('STOCK_MOVE', `${fullMov.type} recorded for ${fullMov.variantSku} (${fullMov.qty})`);
  };

  const handleProductSubmit = (product: Product) => {
    if (editingProduct) {
      setProducts(prev => prev.map(p => p.id === product.id ? product : p));
      logActivity('PROD_EDIT', `Updated product ${product.name}`);
    } else {
      setProducts(prev => [...prev, product]);
      logActivity('PROD_ADD', `Added new product ${product.name}`);
    }
    setShowProductModal(false);
    setEditingProduct(undefined);
  };

  return (
    <div 
      onMouseMove={handleMouseMove}
      className="flex h-screen bg-[var(--app-bg)] text-[var(--text-primary)] overflow-hidden font-sans select-none"
    >
      {/* Sidebar */}
      <nav 
        className={`bg-[var(--surface)] border-r border-[var(--border-subtle)] flex flex-col px-3 py-4 gap-2 no-print z-40 transition-all duration-300 ease-in-out shadow-[1px_0_2px_rgba(0,0,0,0.02)] ${
          isFocusMode 
            ? 'w-0 -translate-x-full overflow-hidden border-none p-0 gap-0' 
            : sidebarCollapsedEffective 
              ? 'w-[72px] items-center' 
              : 'w-[250px] items-stretch'
        }`}
      >
        {/* Toggle Button Column */}
        <div className={`flex items-center ${sidebarCollapsedEffective ? 'flex-col gap-2 justify-center mb-3' : 'justify-between w-full mb-5 px-1'}`}>
          {!sidebarCollapsedEffective ? (
            <div className="flex items-center gap-3">
              <div className="bg-[var(--text-primary)] w-8 h-8 rounded-lg flex items-center justify-center shadow-xs font-bold text-[var(--surface)] text-sm">
                EP
              </div>
              <div className="leading-tight">
                <div className="text-[var(--text-primary)] font-semibold text-[15px] tracking-tight">ElectraStock</div>
              </div>
            </div>
          ) : (
            <div className="bg-[var(--text-primary)] w-8 h-8 rounded-lg flex items-center justify-center shadow-xs font-bold text-[var(--surface)] text-sm">
              EP
            </div>
          )}

          {/* Collapsible toggle trigger */}
          <button 
            type="button"
            onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            className="p-1 px-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-500 hover:text-slate-900 transition-all shadow-xs cursor-pointer"
            title={sidebarCollapsedEffective ? "Expand Sidebar (Ctrl+B)" : "Collapse Sidebar (Ctrl+B)"}
          >
            {sidebarCollapsedEffective ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
          </button>
        </div>
        
        <NavButton active={activeModule === 'DASHBOARD'} onClick={() => setActiveModule('DASHBOARD')} icon="📊" label="Dashboard" collapsed={sidebarCollapsedEffective} />
        <NavButton active={activeModule === 'POS'} onClick={() => setActiveModule('POS')} icon="🛒" label="Point of Sale" collapsed={sidebarCollapsedEffective} />
        <NavButton active={activeModule === 'INVENTORY'} onClick={() => setActiveModule('INVENTORY')} icon="📦" label="Inventory" collapsed={sidebarCollapsedEffective} />
        <NavButton active={activeModule === 'CATEGORIES'} onClick={() => setActiveModule('CATEGORIES')} icon="📂" label="Categories" collapsed={sidebarCollapsedEffective} />
        <NavButton active={activeModule === 'REPORTS'} onClick={() => setActiveModule('REPORTS')} icon="📄" label="Reports" collapsed={sidebarCollapsedEffective} />
        <NavButton active={activeModule === 'SALES_LEDGER'} onClick={() => setActiveModule('SALES_LEDGER')} icon="📓" label="Sales Ledger" collapsed={sidebarCollapsedEffective} />
        <NavButton active={activeModule === 'CHAT'} onClick={() => setActiveModule('CHAT')} icon="✨" label="AI Insights" collapsed={sidebarCollapsedEffective} />

        {/* Global Controls & System Health */}
        <div className="mt-auto space-y-2">
          {!sidebarCollapsedEffective && (
            <div className="px-3 py-2 bg-slate-50/50 rounded-lg border border-slate-100">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input 
                  type="checkbox" 
                  checked={autoHideNavEnabled} 
                  onChange={e => setAutoHideNavEnabled(e.target.checked)} 
                  className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-3.5 h-3.5 cursor-pointer transition-all"
                />
                <span className="text-xs text-slate-600 font-medium tracking-tight">Auto-hide on POS</span>
              </label>
            </div>
          )}

          <div className="p-3 bg-[var(--app-bg)] rounded-lg border border-[var(--border-subtle)] w-full">
            <div className="flex items-center gap-2 justify-center md:justify-start">
              <div className={`w-2 h-2 rounded-full shrink-0 ${stats.lowStockCount > 0 ? 'bg-rose-500 animate-pulse' : 'bg-emerald-500'}`}></div>
              {!sidebarCollapsedEffective && (
                <span className="text-[11px] font-semibold text-slate-500">
                  {stats.lowStockCount} Low stock alerts
                </span>
              )}
            </div>
            {!sidebarCollapsedEffective && (
              <div className="flex items-center gap-2 mt-1.5">
                <div className="w-2 h-2 rounded-full bg-blue-500 shrink-0"></div>
                <span className="text-[11px] font-semibold text-slate-500">Admin active</span>
              </div>
            )}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main 
        onClick={handleMainClick}
        className={`flex-1 overflow-auto bg-[var(--app-bg)] text-[var(--text-primary)] relative transition-all duration-300 ${
          isFocusMode ? 'p-0 m-0' : 'p-6 lg:p-10'
        }`}
      >
        {activeModule === 'DASHBOARD' && (
          <div className="max-w-7xl mx-auto space-y-6 animate-in fade-in duration-300">
            {/* 1. ENTERPRISE STORE HEADER & TELEMETRY BAR */}
            <header className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-4 border-b border-[var(--border-subtle)]">
              <div className="space-y-1">
                <div className="flex items-center gap-2 mb-2">
                  <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[11px] font-semibold tracking-wide border border-slate-200">
                    Overview
                  </span>
                  <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[11px] font-semibold border border-emerald-100">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                    Live
                  </span>
                </div>
                <h1 className="text-[28px] leading-tight font-semibold text-slate-900 tracking-tight">Executive Dashboard</h1>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <button 
                  onClick={() => setShowMovementModal(true)} 
                  className="flex items-center gap-2 bg-[var(--surface)] hover:bg-[var(--surface-hover)] border border-[var(--border-strong)] text-[var(--text-primary)] px-4 py-2 rounded-lg font-medium text-sm transition-all shadow-xs cursor-pointer"
                  title="Record Stock Movement (Alt+M)"
                >
                  <ArrowUpDown className="w-4 h-4 text-slate-500" />
                  <span>Record Movement</span>
                  <span className="bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded text-[10px] font-mono border border-slate-200">Alt+M</span>
                </button>
                <button 
                  onClick={() => setActiveModule('POS')} 
                  className="flex items-center gap-2 bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-hover)] text-white px-5 py-2 rounded-lg font-semibold text-sm transition-all shadow-sm cursor-pointer"
                  title="Open POS Billing Workstation (F2)"
                >
                  <ShoppingCart className="w-4 h-4" />
                  <span>Open POS Billing</span>
                  <span className="bg-slate-700 text-slate-200 px-1.5 py-0.5 rounded text-[10px] font-mono border border-slate-600">F2</span>
                </button>
              </div>
            </header>

            {/* 2. EXECUTIVE HERO KPI GRID */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
              {/* TODAY'S REVENUE (HERO CARD) */}
              <div className="md:col-span-2 xl:col-span-2 bg-[var(--surface)] border border-[var(--border-default)] rounded-xl p-5 shadow-xs flex flex-col justify-between relative overflow-hidden group hover:border-[var(--border-strong)] transition-all">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 block mb-1">Primary Metric</span>
                    <h3 className="text-sm font-semibold text-slate-900 tracking-tight">Today's Revenue</h3>
                  </div>
                  <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg border border-emerald-100">
                    <TrendingUp className="w-4 h-4" />
                  </div>
                </div>
                <div>
                  <div className="text-3xl font-bold text-slate-900 tracking-tight mb-2">
                    ₹{stats.todayRevenue.toLocaleString()}
                  </div>
                  <div className="flex items-center gap-3 pt-3 border-t border-[var(--border-subtle)] text-sm">
                    <span className="inline-flex items-center gap-1 font-medium text-emerald-700 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded text-[12px]">
                      <ArrowUpRight className="w-3.5 h-3.5" /> Profit: ₹{stats.profitToday.toLocaleString()}
                    </span>
                    <span className="text-slate-500 text-[12px] font-medium">
                      {stats.totalTransactionsToday} sales today
                    </span>
                  </div>
                </div>
              </div>

              {/* TODAY'S NET PROFIT */}
              <div className="bg-[var(--surface)] border border-[var(--border-default)] rounded-xl p-5 shadow-xs flex flex-col justify-between group hover:border-[var(--border-strong)] transition-all">
                <div className="flex items-start justify-between mb-3">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Net Margin</span>
                  <div className="p-2 bg-teal-50 text-teal-600 border border-teal-100 rounded-lg">
                    <Coins className="w-4 h-4" />
                  </div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-slate-900 tracking-tight mb-2">
                    ₹{stats.profitToday.toLocaleString()}
                  </div>
                  <div className="flex items-center justify-between text-[12px]">
                    <span className="text-slate-500 font-medium">Realized Margin</span>
                    <span className="font-medium text-teal-700 bg-teal-50 px-2 py-0.5 rounded border border-teal-100">
                      {stats.todayRevenue > 0 ? `${((stats.profitToday / stats.todayRevenue) * 100).toFixed(1)}%` : '0.0%'}
                    </span>
                  </div>
                </div>
              </div>

              {/* TODAY'S BILLS / INVOICES */}
              <div className="bg-[var(--surface)] border border-[var(--border-default)] rounded-xl p-5 shadow-xs flex flex-col justify-between group hover:border-[var(--border-strong)] transition-all">
                <div className="flex items-start justify-between mb-3">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Bill Volume</span>
                  <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg border border-indigo-100">
                    <ShoppingCart className="w-4 h-4" />
                  </div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-slate-900 tracking-tight mb-2">
                    {stats.totalTransactionsToday} <span className="text-sm text-slate-500 font-medium">Sales</span>
                  </div>
                  <div className="flex items-center justify-between text-[12px]">
                    <span className="text-slate-500 font-medium">Avg Ticket Size</span>
                    <span className="font-medium text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
                      ₹{stats.todayRevenue > 0 && stats.totalTransactionsToday > 0 ? Math.round(stats.todayRevenue / stats.totalTransactionsToday).toLocaleString() : 0}
                    </span>
                  </div>
                </div>
              </div>

              {/* INVENTORY ASSET VALUATION */}
              <div className="bg-[var(--surface)] border border-[var(--border-default)] rounded-xl p-5 shadow-xs flex flex-col justify-between group hover:border-[var(--border-strong)] transition-all">
                <div className="flex items-start justify-between mb-3">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Inventory Value</span>
                  <div className="p-2 bg-sky-50 text-sky-600 rounded-lg border border-sky-100">
                    <Landmark className="w-4 h-4" />
                  </div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-slate-900 tracking-tight mb-2">
                    ₹{stats.totalValuation.toLocaleString()}
                  </div>
                  <div className="flex items-center justify-between text-[12px]">
                    <span className="text-slate-500 font-medium">Stock Catalog</span>
                    <span className="font-medium text-sky-700 bg-sky-50 px-2 py-0.5 rounded border border-sky-100">{stats.skuCount} SKUs</span>
                  </div>
                </div>
              </div>

              {/* LOW STOCK ALERTS */}
              <div className={`border rounded-xl p-5 shadow-xs flex flex-col justify-between transition-all ${
                stats.lowStockCount > 0 
                  ? 'bg-rose-50/30 border-rose-200 hover:border-rose-300' 
                  : 'bg-[var(--surface)] border-[var(--border-default)] hover:border-[var(--border-strong)]'
              }`}>
                <div className="flex items-start justify-between mb-3">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Stock Alerts</span>
                  <div className={`p-2 rounded-lg border ${
                    stats.lowStockCount > 0 
                      ? 'bg-rose-100 text-rose-700 border-rose-200' 
                      : 'bg-slate-50 text-slate-400 border-slate-100'
                  }`}>
                    <AlertTriangle className="w-4 h-4" />
                  </div>
                </div>
                <div>
                  <div className={`text-2xl font-bold tracking-tight mb-2 ${stats.lowStockCount > 0 ? 'text-rose-700' : 'text-slate-900'}`}>
                    {stats.lowStockCount} <span className="text-sm font-medium opacity-80">Items</span>
                  </div>
                  <div className="flex items-center justify-between text-[12px]">
                    <span className="text-slate-500 font-medium">Status</span>
                    <span className={`font-medium px-2 py-0.5 rounded border ${
                      stats.lowStockCount > 0 
                        ? 'text-rose-700 bg-rose-50 border-rose-200' 
                        : 'text-emerald-700 bg-emerald-50 border-emerald-200'
                    }`}>
                      {stats.lowStockCount > 0 ? 'Action Needed' : 'Healthy'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* 3. COMPACT ENTERPRISE TIME RANGE FILTER BAR */}
            <div className="bg-[var(--surface)] border border-[var(--border-default)] rounded-xl p-4 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-blue-50 text-blue-600 rounded-lg border border-blue-100 shrink-0">
                  <Sliders className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-semibold text-slate-900 tracking-tight">
                      Business Intelligence Time Bracket
                    </h3>
                    {dashActiveDateRange && (
                      <span className="bg-slate-100 text-slate-600 text-xs font-mono px-2 py-0.5 rounded-md font-medium border border-slate-200">
                        {formatDateDisplay(dashActiveDateRange.start)} – {formatDateDisplay(dashActiveDateRange.end)}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 font-medium">Filter sales trends, throughput curves, product leaderboards, and payment settlements in real time</p>
                </div>
              </div>

              <div className="shrink-0">
                <DateFilter
                  preset={dashPreset}
                  startDateStr={dashStartDate}
                  endDateStr={dashEndDate}
                  onChange={(newPreset, start, end) => {
                    setDashPreset(newPreset);
                    setDashStartDate(start);
                    setDashEndDate(end);
                  }}
                  onReset={() => {
                    setDashPreset('MONTH');
                    setDashStartDate('');
                    setDashEndDate('');
                  }}
                  allowAllTime={true}
                />
              </div>
            </div>

            {/* 4. PRIMARY ANALYTICS ROW: REVENUE TREND (2/3) + REAL-TIME AUDIT LOG (1/3) */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
              {/* REVENUE TRENDS AREA/LINE CHART */}
              <div className="xl:col-span-2 bg-[var(--surface)] border border-[var(--border-default)] rounded-xl p-6 shadow-xs flex flex-col justify-between">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="p-1.5 bg-blue-50 text-blue-600 rounded-lg">
                        <TrendingUp className="w-4 h-4" />
                      </span>
                      <h3 className="text-lg font-semibold text-slate-900 tracking-tight">Commercial Revenue & Invoice Throughput</h3>
                    </div>
                    <p className="text-sm text-slate-500 font-medium">Aggregated daily sales totals and bill counts across selected date bracket</p>
                  </div>
                  <div className="flex items-center gap-3 text-[13px] font-medium">
                    <div className="flex items-center gap-1.5 text-blue-700 bg-blue-50 px-3 py-1 rounded-md border border-blue-100">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-600"></span>
                      Revenue (₹)
                    </div>
                    <div className="flex items-center gap-1.5 text-slate-700 bg-slate-100 px-3 py-1 rounded-md border border-slate-200">
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-500"></span>
                      Invoices Count
                    </div>
                  </div>
                </div>

                <div className="h-[280px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={dailyTrendData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#2563EB" stopOpacity={0.25}/>
                          <stop offset="95%" stopColor="#2563EB" stopOpacity={0.0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                      <XAxis dataKey="date" stroke="#94A3B8" fontSize={10} tickLine={false} axisLine={{ stroke: '#E2E8F0' }} />
                      <YAxis stroke="#94A3B8" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(val) => val >= 1000 ? `₹${(val/1000).toFixed(0)}k` : `₹${val}`} />
                      <Tooltip content={<CustomDailyTooltip />} />
                      <Area type="monotone" dataKey="revenue" stroke="#2563EB" strokeWidth={3} fillOpacity={1} fill="url(#colorRevenue)" activeDot={{ r: 6, fill: '#2563EB', stroke: '#ffffff', strokeWidth: 2 }} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* RECENT ACTIVITY AUDIT STREAM */}
              <div className="bg-[var(--surface)] border border-[var(--border-default)] rounded-xl p-6 shadow-xs flex flex-col justify-between">
                <div className="flex items-center justify-between mb-4 pb-3 border-b border-[var(--border-subtle)]">
                  <div className="flex items-center gap-2">
                    <span className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg">
                      <History className="w-4 h-4" />
                    </span>
                    <h3 className="text-lg font-semibold text-slate-900 tracking-tight">Audit Trail Stream</h3>
                  </div>
                  <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md font-mono border border-slate-200">Real-time</span>
                </div>

                <div className="flex-1 overflow-y-auto space-y-3 pr-1 max-h-[280px] custom-scrollbar">
                  {auditLogs.slice(0, 10).map(log => {
                    let badgeColor = 'bg-blue-50 text-blue-700 border-blue-200';
                    if (log.action.includes('SALE') || log.action.includes('COMPLETE')) badgeColor = 'bg-emerald-50 text-emerald-700 border-emerald-200';
                    else if (log.action.includes('DEL') || log.action.includes('OUT')) badgeColor = 'bg-rose-50 text-rose-700 border-rose-200';
                    else if (log.action.includes('STOCK') || log.action.includes('EDIT')) badgeColor = 'bg-amber-50 text-amber-700 border-amber-200';

                    return (
                      <div key={log.id} className="flex items-start justify-between gap-3 p-3 rounded-lg bg-[var(--app-bg)] border border-[var(--border-subtle)] hover:bg-slate-50/50 transition-colors">
                        <div className="space-y-1.5">
                          <div className="flex items-center gap-2">
                            <span className={`text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded-md border ${badgeColor}`}>
                              {log.action}
                            </span>
                          </div>
                          <p className="text-sm font-medium text-slate-800 leading-tight">{log.details}</p>
                        </div>
                        <span className="text-[11px] font-mono text-slate-500 shrink-0 mt-1">
                          {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    );
                  })}

                  {auditLogs.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-48 text-center p-4">
                      <History className="w-6 h-6 text-slate-300 mb-3" />
                      <p className="text-sm font-semibold text-slate-600">No Activity Logged Yet</p>
                      <p className="text-xs text-slate-500 mt-1">System operations, sales & inventory logs will stream here.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* 5. OPERATIONAL INTELLIGENCE & ERP TRAFFIC GRIDS (2x2 GRID) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* 1. INVOICE VOLUME TREND BAR CHART */}
              <div className="bg-[var(--surface)] border border-[var(--border-default)] rounded-xl p-6 shadow-xs">
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Invoice Frequency</h3>
                    <h4 className="text-lg font-semibold text-slate-900 tracking-tight">Invoice Volume Distribution</h4>
                  </div>
                  <span className="text-[11px] font-medium text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-md border border-indigo-100">
                    Daily Transactions
                  </span>
                </div>
                <div className="h-[240px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={dailyTrendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                      <XAxis dataKey="date" stroke="#94A3B8" fontSize={10} tickLine={false} axisLine={{ stroke: '#E2E8F0' }} />
                      <YAxis stroke="#94A3B8" fontSize={10} tickLine={false} axisLine={false} />
                      <Tooltip content={<CustomDailyTooltip />} />
                      <Bar dataKey="invoices" fill="#4F46E5" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* 2. HOURLY SALES & SHOP TRAFFIC LINE CHART */}
              <div className="bg-[var(--surface)] border border-[var(--border-default)] rounded-xl p-6 shadow-xs">
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Peak Hour Intelligence</h3>
                    <h4 className="text-lg font-semibold text-slate-900 tracking-tight">Hourly Sales & Traffic Curve</h4>
                  </div>
                  <div className="flex items-center gap-2 text-[11px] font-medium">
                    <span className="text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded-md border border-amber-100">Bills</span>
                    <span className="text-rose-700 bg-rose-50 px-2.5 py-0.5 rounded-md border border-rose-100">Sales (₹)</span>
                  </div>
                </div>
                <div className="h-[240px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={hourlySalesTrend} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                      <XAxis dataKey="hour" stroke="#94A3B8" fontSize={10} tickLine={false} axisLine={{ stroke: '#E2E8F0' }} />
                      <YAxis stroke="#94A3B8" fontSize={10} tickLine={false} axisLine={false} />
                      <Tooltip 
                        contentStyle={{backgroundColor: '#0F172A', borderColor: '#1E293B', borderRadius: '12px', color: '#ffffff', fontSize: '11px', boxShadow: '0 10px 25px rgba(0,0,0,0.3)'}}
                        formatter={(value: any, name: string) => [
                          name === 'revenue' ? `₹${Number(value).toLocaleString()}` : `${value} bills`,
                          name === 'revenue' ? 'Hourly Sales' : 'Hourly Bills'
                        ]}
                      />
                      <Line type="monotone" dataKey="invoices" stroke="#F59E0B" strokeWidth={2.5} dot={{r: 3}} name="invoices" />
                      <Line type="monotone" dataKey="revenue" stroke="#EF4444" strokeWidth={2.5} dot={{r: 3}} name="revenue" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* 3. TOP SELLING PRODUCTS LEADERBOARD */}
              <div className="bg-[var(--surface)] border border-[var(--border-default)] rounded-xl p-6 shadow-xs">
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">SKU Performance Leaderboard</h3>
                    <h4 className="text-lg font-semibold text-slate-900 tracking-tight">Top Selling Products</h4>
                  </div>
                  <span className="text-[11px] font-medium text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-100">
                    By Units Sold
                  </span>
                </div>
                <div className="h-[240px]">
                  {topSellingProducts.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center p-4">
                      <Package className="w-6 h-6 text-slate-300 mb-3" />
                      <p className="text-sm font-semibold text-slate-600">No Sales Records Found</p>
                      <p className="text-xs text-slate-500 mt-1">Top performing products in selected date range will appear here.</p>
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={topSellingProducts} layout="vertical" margin={{ top: 5, right: 15, left: 10, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#F1F5F9" />
                        <XAxis type="number" stroke="#94A3B8" fontSize={10} tickLine={false} axisLine={false} />
                        <YAxis dataKey="sku" type="category" stroke="#64748B" fontSize={10} tickLine={false} axisLine={false} width={80} />
                        <Tooltip 
                          contentStyle={{backgroundColor: '#0F172A', borderColor: '#1E293B', borderRadius: '12px', color: '#ffffff', fontSize: '11px', boxShadow: '0 10px 25px rgba(0,0,0,0.3)'}}
                          formatter={(value: any, name: string, item: any) => [
                            `${value} units sold (₹${item.payload.revenue.toLocaleString()})`,
                            item.payload.name
                          ]}
                        />
                        <Bar dataKey="qty" fill="#10B981" radius={[0, 4, 4, 0]}>
                          {topSellingProducts.map((_, index) => (
                            <Cell key={`cell-${index}`} fill={['#10B981', '#059669', '#0284C7', '#6366F1', '#8B5CF6'][index % 5]} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>

              {/* 4. PAYMENT METHOD DISTRIBUTION BAR CHART */}
              <div className="bg-[var(--surface)] border border-[var(--border-default)] rounded-xl p-6 shadow-xs">
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Settlement Breakdown</h3>
                    <h4 className="text-lg font-semibold text-slate-900 tracking-tight">Payment Channel Volume</h4>
                  </div>
                  <span className="text-[11px] font-medium text-purple-700 bg-purple-50 px-2.5 py-1 rounded-md border border-purple-100">
                    By Total Volume (₹)
                  </span>
                </div>
                <div className="h-[240px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={paymentDistribution} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                      <XAxis dataKey="name" stroke="#94A3B8" fontSize={11} tickLine={false} axisLine={{ stroke: '#E2E8F0' }} />
                      <YAxis stroke="#94A3B8" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(val) => `₹${val}`} />
                      <Tooltip 
                        contentStyle={{backgroundColor: '#0F172A', borderColor: '#1E293B', borderRadius: '12px', color: '#ffffff', fontSize: '11px', boxShadow: '0 10px 25px rgba(0,0,0,0.3)'}}
                        formatter={(value: any) => [`₹${Number(value).toLocaleString()}`, 'Settled Revenue']}
                      />
                      <Bar dataKey="value" fill="#8B5CF6" radius={[4, 4, 0, 0]}>
                        {paymentDistribution.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.name === 'CASH' ? '#10B981' : entry.name === 'UPI' ? '#2563EB' : '#8B5CF6'} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* 6. COMMERCIAL RELATIONSHIPS & PAYMENT SETTLEMENT CHANNELS (2-COLUMN GRID) */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
              {/* TOP CUSTOMERS TABLE */}
              <div className="bg-[var(--surface)] border border-[var(--border-default)] rounded-xl p-6 shadow-xs flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-4 pb-4 border-b border-[var(--border-subtle)]">
                    <div className="flex items-center gap-3">
                      <span className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                        <Users className="w-5 h-5" />
                      </span>
                      <div>
                        <h3 className="text-[16px] font-semibold text-slate-900 tracking-tight">Top Customers (Lifetime LTV)</h3>
                        <p className="text-xs text-slate-500">High-value client accounts ranked by total revenue</p>
                      </div>
                    </div>
                    <span className="text-[11px] font-medium text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-md border border-indigo-100">
                      Top 5 Clients
                    </span>
                  </div>

                  <div className="overflow-x-auto text-sm">
                    <table className="w-full text-left uppercase tracking-tight text-[11px]">
                      <thead>
                        <tr className="border-b border-slate-200 text-slate-500 font-semibold">
                          <th className="pb-3 px-4">Rank & Client Profile</th>
                          <th className="pb-3 text-center">Bills Count</th>
                          <th className="pb-3 text-right px-4">Lifetime Spends (₹)</th>
                        </tr>
                      </thead>
                      <tbody className="font-medium text-slate-700">
                        {topDashboardCustomers.map((c, i) => (
                          <tr key={c.phone + i} className="hover:bg-slate-50 transition-colors border-b border-slate-100/50 last:border-0">
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-3">
                                <span className="w-6 h-6 rounded-md bg-slate-100 text-slate-600 font-mono text-[10px] flex items-center justify-center font-bold border border-slate-200">
                                  #{i + 1}
                                </span>
                                <div>
                                  <span className="font-semibold text-slate-900 block text-[13px] normal-case">{c.name}</span>
                                  <span className="text-[11px] text-slate-500 font-mono">{c.phone}</span>
                                </div>
                              </div>
                            </td>
                            <td className="py-3 text-center font-mono text-slate-600">
                              <span className="bg-slate-50 border border-slate-200 px-2.5 py-0.5 rounded text-[11px] font-medium">{c.billsCount} bills</span>
                            </td>
                            <td className="py-3 text-right px-4 font-mono font-semibold text-slate-900 text-[15px]">
                              ₹{c.totalSpent.toLocaleString()}
                            </td>
                          </tr>
                        ))}
                        {topDashboardCustomers.length === 0 && (
                          <tr>
                            <td colSpan={3} className="py-10 text-center">
                              <Users className="w-6 h-6 text-slate-300 mx-auto mb-3" />
                              <p className="text-sm font-semibold text-slate-600 normal-case">No Trading Histories Recorded</p>
                              <p className="text-xs text-slate-500 normal-case mt-1">Customer sales records will accumulate here automatically.</p>
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* PAYMENT SETTLED CHANNELS & PROPORTIONS */}
              <div className="bg-[var(--surface)] border border-[var(--border-default)] rounded-xl p-6 shadow-xs flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-4 pb-4 border-b border-[var(--border-subtle)]">
                    <div className="flex items-center gap-3">
                      <span className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
                        <Wallet className="w-5 h-5" />
                      </span>
                      <div>
                        <h3 className="text-[16px] font-semibold text-slate-900 tracking-tight">Payment Channel Settlement</h3>
                        <p className="text-xs text-slate-500">Channel proportions across all completed sales transactions</p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4 pt-2">
                    {['CASH', 'UPI', 'CARD'].map(mode => {
                      const modeFiltered = sales.filter(s => s.paymentMode === mode);
                      const mVolume = modeFiltered.reduce((a,b) => a + b.grandTotal, 0);
                      const mCount = modeFiltered.length;
                      const totalVol = sales.reduce((a,b) => a + b.grandTotal, 0) || 1;
                      const pct = Math.round((mVolume / totalVol) * 100);

                      let colorBar = 'bg-emerald-500';
                      let badgeStyle = 'bg-emerald-50 text-emerald-700 border-emerald-200';
                      let modeIcon = <Coins className="w-4 h-4 text-emerald-600" />;

                      if (mode === 'UPI') {
                        colorBar = 'bg-blue-600';
                        badgeStyle = 'bg-blue-50 text-blue-700 border-blue-200';
                        modeIcon = <Zap className="w-4 h-4 text-blue-600" />;
                      } else if (mode === 'CARD') {
                        colorBar = 'bg-purple-600';
                        badgeStyle = 'bg-purple-50 text-purple-700 border-purple-200';
                        modeIcon = <CreditCard className="w-4 h-4 text-purple-600" />;
                      }

                      return (
                        <div key={mode} className="p-3.5 bg-[var(--app-bg)] border border-[var(--border-subtle)] rounded-lg space-y-2.5">
                          <div className="flex justify-between items-center text-sm">
                            <div className="flex items-center gap-2.5">
                              {modeIcon}
                              <span className="font-semibold text-slate-900">{mode}</span>
                              <span className={`text-[10px] font-semibold uppercase px-2 py-0.5 rounded-md border ${badgeStyle}`}>
                                {pct}% Vol
                              </span>
                            </div>
                            <div className="text-right">
                              <span className="font-mono font-semibold text-slate-900 text-[15px] block">₹{mVolume.toLocaleString()}</span>
                              <span className="text-slate-500 font-mono text-[11px]">{mCount} invoices</span>
                            </div>
                          </div>
                          <div className="w-full bg-slate-200/80 rounded-full h-1.5 overflow-hidden">
                            <div className={`h-1.5 rounded-full ${colorBar} transition-all duration-500`} style={{ width: `${pct}%` }}></div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

          </div>
        )}

        {activeModule === 'POS' && (
          <POS 
            products={products} 
            categories={categories} 
            sales={sales}
            movements={movements}
            auditLogs={auditLogs}
            setProducts={setProducts}
            setSales={setSales}
            setMovements={setMovements}
            setAuditLogs={setAuditLogs}
            onComplete={handleSaleComplete} 
            isFocusMode={isFocusMode}
            setIsFocusMode={setIsFocusMode}
            isSidebarCollapsed={isSidebarCollapsed}
            setIsSidebarCollapsed={setIsSidebarCollapsed}
          />
        )}

        {activeModule === 'INVENTORY' && (
          <div className="animate-in fade-in slide-in-from-right-6 duration-500 space-y-6">
            
            {/* Nested Inventory Sub-module navigation */}
            <div className="bg-white border border-slate-200/60 p-2 rounded-2xl no-print shadow-xs">
              <div className="flex items-center gap-4 overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden py-0.5">
                <button
                  type="button"
                  onClick={() => setInventorySubTab('PRODUCTS')}
                  className={`px-5 py-2.5.5 h-[42px] rounded-lg text-base font-semibold transition-all duration-200 cursor-pointer flex items-center justify-center shrink-0 ${
                    inventorySubTab === 'PRODUCTS'
                      ? 'bg-[#2563EB] text-white shadow-md shadow-blue-500/15 border border-blue-600/10'
                      : 'text-slate-600 hover:text-[#2563EB] hover:bg-slate-50'
                  }`}
                >
                  Products Catalog
                </button>
                <button
                  type="button"
                  onClick={() => setInventorySubTab('CATEGORIES')}
                  className={`px-5 py-2.5.5 h-[42px] rounded-lg text-base font-semibold transition-all duration-200 cursor-pointer flex items-center justify-center shrink-0 ${
                    inventorySubTab === 'CATEGORIES'
                      ? 'bg-[#2563EB] text-white shadow-md shadow-blue-500/15 border border-blue-600/10'
                      : 'text-slate-600 hover:text-[#2563EB] hover:bg-slate-50'
                  }`}
                >
                  Categories
                </button>
                <button
                  type="button"
                  onClick={() => setInventorySubTab('MOVEMENT')}
                  className={`px-5 py-2.5.5 h-[42px] rounded-lg text-base font-semibold transition-all duration-200 cursor-pointer flex items-center justify-center shrink-0 ${
                    inventorySubTab === 'MOVEMENT'
                      ? 'bg-[#2563EB] text-white shadow-md shadow-blue-500/15 border border-blue-600/10'
                      : 'text-slate-600 hover:text-[#2563EB] hover:bg-slate-50'
                  }`}
                >
                  Stock Movement
                </button>
                <button
                  type="button"
                  onClick={() => setInventorySubTab('IMPORT')}
                  className={`px-5 py-2.5.5 h-[42px] rounded-lg text-base font-semibold transition-all duration-200 cursor-pointer flex items-center justify-center shrink-0 ${
                    inventorySubTab === 'IMPORT'
                      ? 'bg-[#2563EB] text-white shadow-md shadow-blue-500/15 border border-blue-600/10'
                      : 'text-slate-600 hover:text-[#2563EB] hover:bg-slate-50'
                  }`}
                >
                  Bulk Import
                </button>
                <button
                  type="button"
                  onClick={() => setInventorySubTab('UPDATE')}
                  className={`px-5 py-2.5.5 h-[42px] rounded-lg text-base font-semibold transition-all duration-200 cursor-pointer flex items-center justify-center shrink-0 ${
                    inventorySubTab === 'UPDATE'
                      ? 'bg-[#2563EB] text-white shadow-md shadow-blue-500/15 border border-blue-600/10'
                      : 'text-slate-600 hover:text-[#2563EB] hover:bg-slate-50'
                  }`}
                >
                  Bulk Update
                </button>
                <button
                  type="button"
                  onClick={() => setInventorySubTab('BARCODE')}
                  className={`px-5 py-2.5.5 h-[42px] rounded-lg text-base font-semibold transition-all duration-200 cursor-pointer flex items-center justify-center shrink-0 ${
                    inventorySubTab === 'BARCODE'
                      ? 'bg-[#2563EB] text-white shadow-md shadow-blue-500/15 border border-blue-600/10'
                      : 'text-slate-600 hover:text-[#2563EB] hover:bg-slate-50'
                  }`}
                >
                  Barcode Manager
                </button>
              </div>
            </div>

            {inventorySubTab === 'PRODUCTS' && (
              <div className="space-y-6">
                 <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                <div>
                  <h1 className="text-[42px] font-extrabold text-slate-900 tracking-tight flex items-center gap-3">📦 Master Product Catalog</h1>
                  <p className="text-slate-500 text-base font-medium mt-2">Manage electrical variants, specifications, pricing, and stock health</p>
                </div>
                <div>
                  <button 
                    onClick={() => { setEditingProduct(undefined); setShowProductModal(true); }} 
                    className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-3.5 rounded-xl shadow-sm shadow-blue-500/20 transition-all duration-150 active:scale-[0.98] text-base"
                  >
                    <Plus className="w-5 h-5" />
                    Add New Product
                  </button>
                </div>
              </div>

             {/*             {/* Dynamic Empty States & Setup Fallbacks */}
             {categories.length === 0 ? (
               <div className="bg-white border border-slate-200 rounded-3xl p-12 text-center space-y-4 max-w-xl mx-auto shadow-sm my-8">
                 <div className="w-16 h-16 bg-blue-50 text-[#2563EB] rounded-full flex items-center justify-center mx-auto shadow-sm">
                   <FolderOpen className="w-8 h-9" />
                 </div>
                 <h3 className="font-extrabold text-slate-900 text-2xl">Create your first category to start adding products.</h3>
                 <p className="text-slate-500 text-base leading-relaxed">
                   Products inside ElectraStock ERP are structurally defined and generated based on category specifications. Declare category models first.
                 </p>
                 <div className="pt-2">
                   <button 
                     onClick={() => setActiveModule('CATEGORIES')}
                     className="bg-[#2563EB] hover:bg-blue-700 text-white font-bold px-6 py-3.5 rounded-xl transition-all shadow-md shadow-blue-500/10 text-base cursor-pointer"
                   >
                     Configure Category Templates
                   </button>
                 </div>
               </div>
             ) : products.length === 0 ? (
               <div className="bg-white border border-slate-200 rounded-3xl p-12 text-center space-y-4 max-w-xl mx-auto shadow-sm my-8">
                 <div className="w-16 h-16 bg-blue-50 text-[#2563EB] rounded-full flex items-center justify-center mx-auto shadow-sm">
                   <Package className="w-8 h-9" />
                 </div>
                 <h3 className="font-extrabold text-slate-900 text-2xl">No products available. Create a category and add products.</h3>
                 <p className="text-slate-500 text-base leading-relaxed">
                   No products are registered in the master master index. Register your first dynamic product.
                 </p>
                 <div className="pt-2 flex justify-center gap-3">
                   <button 
                     onClick={() => { setEditingProduct(undefined); setShowProductModal(true); }}
                     className="bg-[#2563EB] hover:bg-blue-700 text-white font-bold px-6 py-3.5 rounded-xl transition-all shadow-md shadow-blue-500/10 text-base cursor-pointer"
                   >
                     Add Your First Product
                   </button>
                   <button 
                     onClick={() => setActiveModule('CATEGORIES')}
                     className="bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 font-bold px-5 py-3.5 rounded-xl transition-all text-base cursor-pointer"
                   >
                     Manage Templates
                   </button>
                 </div>
               </div>
             ) : (
               <>
                 {/* Dynamic Category & Attributes Filter Panel */}
                 <div className="bg-slate-50/60 rounded-2xl border border-slate-200/40 p-6 mb-6 shadow-xs flex flex-col gap-5">
                   <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
                     <div className="md:col-span-4 space-y-1.5">
                       <label className="block text-sm font-bold uppercase text-slate-400 tracking-wider">Search Catalog</label>
                       <div className="relative">
                         <Search className="absolute left-3.5 top-3.5 w-5 h-5 text-slate-400" />
                         <input
                           type="text"
                           placeholder="Search product name or SKU..."
                           value={invSearch}
                           onChange={e => setInvSearch(e.target.value)}
                           className="w-full h-12 bg-white border border-slate-200 hover:border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 pl-11 pr-4 rounded-xl text-base outline-none transition-all duration-150 font-semibold text-slate-800 shadow-xs"
                         />
                       </div>
                     </div>

                     <div className="md:col-span-3 space-y-1.5">
                       <label className="block text-sm font-bold uppercase text-slate-400 tracking-wider">Category Template</label>
                       <select
                         value={invCategoryFilter}
                         onChange={e => {
                           setInvCategoryFilter(e.target.value);
                         }}
                         className="w-full h-12 bg-white border border-slate-200 hover:border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 px-4 rounded-xl text-base outline-none transition-all duration-150 font-semibold text-slate-700 cursor-pointer shadow-xs"
                       >
                         <option value="">All Categories</option>
                         {categories.map(c => (
                           <option key={c.id} value={c.id}>{c.name} ({c.code})</option>
                         ))}
                       </select>
                     </div>

                     <div className="md:col-span-3 space-y-1.5">
                       <label className="block text-sm font-bold uppercase text-slate-400 tracking-wider">Stock Status Filter</label>
                       <select
                         value={invStatusFilter}
                         onChange={e => setInvStatusFilter(e.target.value as any)}
                         className="w-full bg-slate-50 border border-slate-200 hover:border-slate-300 focus:border-[#2563EB] px-4 py-2.5.5 rounded-xl text-base outline-none transition-all font-bold text-slate-700 cursor-pointer"
                       >
                         <option value="ALL">All Statuses</option>
                         <option value="HEALTHY">Healthy (In Stock)</option>
                         <option value="LOW_STOCK">Low Stock Alert</option>
                         <option value="OUT_OF_STOCK">Out of Stock (Zero)</option>
                       </select>
                     </div>

                     <div className="md:col-span-2">
                       <button
                         type="button"
                         onClick={() => {
                           setInvSearch('');
                           setInvCategoryFilter('');
                           setInvStatusFilter('ALL');
                           setInvAttrFilters({});
                         }}
                         className="w-full h-12 bg-white hover:bg-rose-50 border border-slate-200 hover:border-rose-200 text-slate-600 hover:text-rose-600 font-semibold px-4 rounded-xl text-base transition-all duration-150 shadow-xs cursor-pointer"
                       >
                         Reset Filters
                       </button>
                     </div>
                   </div>

                   {/* Secondary Spec Filters on active Category */}
                   {invCategoryFilter && (
                     <div className="border-t border-slate-100 pt-4 flex flex-wrap gap-3 items-center animate-in fade-in duration-300">
                       <div className="text-sm font-bold text-slate-400 uppercase tracking-wider pr-1">Specification filters:</div>
                       {categories.find(c => c.id === invCategoryFilter)?.attributes.map(attr => {
                         // Collect all unique attribute values matching the category
                         const uniqueValues = Array.from(
                           new Set(
                             products
                               .filter(p => p.categoryId === invCategoryFilter)
                               .flatMap(p => p.variants || [])
                               .map(v => String(v.attrValues?.[attr.name] || ''))
                               .filter(Boolean)
                           )
                         );

                         return (
                           <div key={attr.name} className="flex-1 min-w-[130px] max-w-[200px] space-y-1">
                             <label className="block text-[10px] font-bold uppercase text-slate-400 tracking-wider truncate">{attr.name}</label>
                             {attr.type === 'select' || (attr.type as string) === 'dropdown' || uniqueValues.length > 0 ? (
                               <select
                                 value={invAttrFilters[attr.name] || ''}
                                 onChange={e => setInvAttrFilters(prev => ({ ...prev, [attr.name]: e.target.value }))}
                                 className="w-full bg-slate-50 border border-slate-200 text-sm py-2.5 px-4 rounded-lg font-semibold text-slate-700 cursor-pointer"
                               >
                                 <option value="">Any {attr.name}</option>
                                 {uniqueValues.map(opt => (
                                   <option key={opt} value={opt}>{opt}</option>
                                 ))}
                               </select>
                             ) : (
                               <input
                                 type="text"
                                 placeholder={`Filter by ${attr.name.toLowerCase()}...`}
                                 value={invAttrFilters[attr.name] || ''}
                                 onChange={e => setInvAttrFilters(prev => ({ ...prev, [attr.name]: e.target.value }))}
                                 className="w-full bg-slate-50 border border-slate-200 text-sm py-1.5 px-4 rounded-lg font-medium text-slate-700 outline-none focus:border-[#2563EB]"
                               />
                             )}
                           </div>
                         );
                       })}
                     </div>
                   )}
                 </div>

             <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm overflow-hidden">
               <div className="overflow-x-auto">
                 <table className="w-full text-left border-collapse">
                   <thead>
                     <tr className="bg-slate-50 border-b border-slate-200/60 text-slate-500 text-sm font-semibold uppercase tracking-wider">
                       <th className="px-6 py-4 font-semibold text-slate-500">Product & SKU</th>
                       <th className="px-6 py-4 font-semibold text-slate-500">Specifications</th>
                       <th className="px-6 py-4 font-semibold text-slate-500">Selling Price</th>
                       <th className="px-6 py-4 font-semibold text-slate-500">Current Stock</th>
                       <th className="px-6 py-4 font-semibold text-slate-500 text-center">Status</th>
                       <th className="px-6 py-4 font-semibold text-slate-500 text-right">Action</th>
                     </tr>
                   </thead>
                   <tbody className="divide-y divide-slate-100">
                     {filteredProductsForInventory.map(p => p.variants.map(v => (
                       <tr key={v.sku} className="hover:bg-blue-50/40 even:bg-slate-50/30 transition-colors duration-150 group">
                         <td className="px-6 py-4.5">
                           <div className="flex flex-wrap items-center gap-2">
                             <div className="font-semibold text-lg text-slate-900 group-hover:text-[#2563EB] transition-colors">{p.name}</div>
                             <span className="text-[13px] bg-blue-50 border border-blue-200/60 text-blue-700 font-semibold px-3 py-1 rounded-full">
                               {(() => {
                                 const c = categories.find(cat => cat.id === p.categoryId);
                                 return c ? `${c.name} (${c.code})` : 'General';
                               })()}
                             </span>
                           </div>
                           <div className="text-sm font-mono text-slate-400 mt-1 uppercase tracking-wider">{v.sku}</div>
                         </td>
                         <td className="px-6 py-4.5">
                           <div className="flex flex-wrap gap-1.5">
                             {Object.entries(v.attrValues).map(([k, val]) => (
                               <span key={k} className="text-[13px] bg-purple-50 border border-purple-200/60 px-3 py-1 rounded-full text-purple-700 font-semibold">{k}: {String(val)}</span>
                             ))}
                             {Object.keys(v.attrValues).length === 0 && (
                               <span className="text-sm text-slate-400 italic">No custom specs</span>
                             )}
                           </div>
                         </td>
                         <td className="px-6 py-4.5">
                           <div className="font-bold text-slate-900 text-lg">₹{v.price.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
                         </td>
                         <td className="px-6 py-4.5">
                           <div className="font-mono text-lg font-bold text-slate-800">{v.stock}</div>
                         </td>
                         <td className="px-6 py-4.5 text-center">
                           {v.stock <= v.lowStockThreshold ? (
                             <span className="bg-rose-50 text-rose-700 px-4 py-1.5 rounded-full text-[13px] font-semibold border border-rose-200/60 inline-block shadow-xs">Low Stock</span>
                           ) : (
                             <span className="bg-emerald-50 text-emerald-700 px-4 py-1.5 rounded-full text-[13px] font-semibold border border-emerald-200/60 inline-block shadow-xs">Healthy</span>
                           )}
                         </td>
                         <td className="px-6 py-4.5 text-right space-x-3">
                             <button 
                               onClick={() => { setEditingProduct(p); setShowProductModal(true); }} 
                               className="text-blue-600 hover:text-blue-800 hover:bg-blue-50 font-semibold text-sm cursor-pointer inline-flex px-3 py-1.5 rounded-lg border border-transparent hover:border-blue-200/60 transition-all duration-150"
                             >
                               Edit
                             </button>
                             <button 
                               onClick={() => handleDeleteProduct(p.id)} 
                               className="text-rose-500 hover:text-rose-700 hover:bg-rose-50 font-semibold text-sm cursor-pointer inline-flex px-3 py-1.5 rounded-lg border border-transparent hover:border-rose-200/60 transition-all duration-150"
                             >
                               Delete
                             </button>
                         </td>
                       </tr>
                     )))}
                     {filteredProductsForInventory.length === 0 && (
                       <tr>
                         <td colSpan={6} className="text-center py-12 text-slate-400 font-medium text-base">
                           No product matching selected specifications and filters.
                         </td>
                       </tr>
                     )}
                   </tbody>
                 </table>
               </div>
             </div>
           </>
          )}
              </div>
            )}

            {inventorySubTab === 'CATEGORIES' && (
              <CategoriesModule
                categories={categories}
                products={products}
                onAddCategory={handleAddCategory}
                onEditCategory={handleEditCategory}
                onDeleteCategory={handleDeleteCategory}
              />
            )}

            {inventorySubTab === 'MOVEMENT' && (
              <StockMovementLog
                products={products}
                movements={movements}
                setProducts={setProducts}
                setMovements={setMovements}
                setAuditLogs={setAuditLogs}
              />
            )}

            {inventorySubTab === 'IMPORT' && (
              <BulkImport
                products={products}
                categories={categories}
                setProducts={setProducts}
                setCategories={setCategories}
                setMovements={setMovements}
                setAuditLogs={setAuditLogs}
              />
            )}

            {inventorySubTab === 'UPDATE' && (
              <BulkUpdate
                products={products}
                categories={categories}
                setProducts={setProducts}
                setMovements={setMovements}
                setAuditLogs={setAuditLogs}
              />
            )}

            {inventorySubTab === 'BARCODE' && (
              <BarcodeManager
                products={products}
                categories={categories}
              />
            )}
       </div>
     )}

        {activeModule === 'CATEGORIES' && (
          <CategoriesModule
            categories={categories}
            products={products}
            onAddCategory={handleAddCategory}
            onEditCategory={handleEditCategory}
            onDeleteCategory={handleDeleteCategory}
          />
        )}

        {activeModule === 'REPORTS' && (
          <Reports 
            products={products} 
            sales={sales} 
            movements={movements} 
            auditLogs={auditLogs} 
            categories={categories}
            setProducts={setProducts}
            setMovements={setMovements}
            setAuditLogs={setAuditLogs}
            setCategories={setCategories}
          />
        )}

        {activeModule === 'SALES_LEDGER' && (
          <SalesLedger
            sales={sales}
            products={products}
            categories={categories}
            movements={movements}
            auditLogs={auditLogs}
            setProducts={setProducts}
            setSales={setSales}
            setMovements={setMovements}
            setAuditLogs={setAuditLogs}
            logActivity={logActivity}
          />
        )}

        {activeModule === 'CHAT' && (
          <div className="max-w-4xl mx-auto space-y-6 animate-in zoom-in duration-300">
            <header className="text-center">
              <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight">Electra AI</h1>
              <p className="text-[#2563EB] font-bold text-sm uppercase tracking-wider mt-1">Conversational Business Intelligence Insights</p>
            </header>
            <ChatReport context={{ stats, products, recentSales: sales.slice(0, 10), auditLogs: auditLogs.slice(0, 5) }} />
          </div>
        )}

        {/* Modals */}
        {showProductModal && (
          <ProductForm 
            categories={categories} 
            onSubmit={handleProductSubmit} 
            onCancel={() => { setShowProductModal(false); setEditingProduct(undefined); }} 
            initialProduct={editingProduct}
          />
        )}

        {showMovementModal && (
          <StockMovementModal 
            products={products} 
            onCancel={() => setShowMovementModal(false)} 
            onSubmit={handleMovementSubmit} 
          />
        )}
      </main>
    </div>
  );
};

const NavButton: React.FC<{ active: boolean, onClick: () => void, icon: string, label: string, collapsed: boolean }> = ({ active, onClick, icon, label, collapsed }) => {
  const getIcon = () => {
    switch (label) {
      case 'Dashboard': return <LayoutDashboard className="w-5 h-5 flex-shrink-0" />;
      case 'Point of Sale': return <ShoppingCart className="w-5 h-5 flex-shrink-0" />;
      case 'Inventory': return <Package className="w-5 h-5 flex-shrink-0" />;
      case 'Categories': return <FolderOpen className="w-5 h-5 flex-shrink-0" />;
      case 'Reports': return <FileText className="w-5 h-5 flex-shrink-0" />;
      case 'Sales Ledger': return <History className="w-5 h-5 flex-shrink-0" />;
      case 'AI Insights': return <Sparkles className="w-5 h-5 flex-shrink-0" />;
      default: return <Package className="w-5 h-5 flex-shrink-0" />;
    }
  };
  return (
    <div className="relative group w-full">
      <button 
        onClick={onClick}
        className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all w-full text-left font-medium text-[15px] ${
          collapsed ? 'justify-center py-2.5 px-0' : 'justify-start'
        } ${
          active 
            ? 'bg-slate-100/80 text-slate-900 font-semibold shadow-xs border border-slate-200/60' 
            : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800 border border-transparent'
        }`}
      >
        <span className={`${active ? 'text-[#2563EB]' : 'text-slate-400 group-hover:text-slate-600'}`}>{getIcon()}</span>
        {!collapsed && <span>{label}</span>}
      </button>

      {/* Hover Tooltip inside collapsed navigation */}
      {collapsed && (
        <div className="absolute left-[calc(100%+12px)] top-1/2 -translate-y-1/2 pointer-events-none opacity-0 group-hover:opacity-100 bg-slate-900 text-white text-[11px] font-semibold tracking-wide py-1.5 px-3 rounded-md shadow-md whitespace-nowrap transition-all duration-150 z-50">
          {label}
          <div className="absolute right-full top-1/2 -translate-y-1/2 border-y-[5px] border-y-transparent border-r-[5px] border-r-slate-900"></div>
        </div>
      )}
    </div>
  );
};

const StatCard: React.FC<{ label: string, value: string, color: string, icon: string, trend?: string }> = ({ label, value, color, icon, trend }) => {
  let iconBg = 'bg-slate-100 text-slate-600';
  if (label.includes('Revenue') || label.includes('Today\'s Revenue')) iconBg = 'bg-emerald-50 text-emerald-600';
  else if (label.includes('Net Profit') || label.includes('Profit')) iconBg = 'bg-emerald-50 text-emerald-600';
  else if (label.includes('Valuation') || label.includes('Asset') || label.includes('Inventory')) iconBg = 'bg-blue-50 text-blue-600';
  else if (label.includes('Low') || label.includes('Alert') || label.includes('Warning')) iconBg = 'bg-rose-50 text-rose-600';
  else if (label.includes('Monthly')) iconBg = 'bg-amber-50 text-amber-600';
  else if (label.includes('SKU') || label.includes('Count')) iconBg = 'bg-indigo-50 text-indigo-600';
  else if (label.includes('Invoices') || label.includes('Transactions')) iconBg = 'bg-slate-100 text-slate-700';

  const renderIcon = () => {
    if (label.includes('Today\'s Revenue')) return <TrendingUp className="w-4 h-4" />;
    if (label.includes('Net Profit')) return <Coins className="w-4 h-4" />;
    if (label.includes('Monthly')) return <TrendingUp className="w-4 h-4" />;
    if (label.includes('Asset') || label.includes('Inventory') || label.includes('Valuation')) return <Landmark className="w-4 h-4" />;
    if (label.includes('Low') || label.includes('Warning') || label.includes('Alert')) return <AlertTriangle className="w-4 h-4" />;
    if (label.includes('SKU') || label.includes('Count')) return <Package className="w-4 h-4" />;
    if (label.includes('Invoices') || label.includes('Transactions')) return <ShoppingCart className="w-4 h-4" />;
    return <TrendingUp className="w-4 h-4" />;
  };

  return (
    <div className="bg-white border border-[#E4E4E7] p-5 rounded-xl shadow-xs hover:shadow-sm transition-all duration-300 flex flex-col justify-between h-full min-h-[130px]">
      <div className="flex justify-between items-start mb-3">
        <div className="text-slate-500 text-[13px] font-medium tracking-tight">{label}</div>
        <div className={`p-1.5 rounded-md ${iconBg}`}>
          {renderIcon()}
        </div>
      </div>
      <div>
        <div className="text-[28px] leading-none font-semibold text-slate-900 tracking-tight">{value}</div>
        {trend && (
          <div className="text-xs font-medium text-emerald-700 mt-2 px-2 py-0.5 rounded inline-block bg-emerald-50 border border-emerald-100">
            {trend}
          </div>
        )}
      </div>
    </div>
  );
};

export default App;
