import React, { useState, useRef, useEffect, useMemo } from 'react';
import { 
  Product, 
  CartItem, 
  Sale, 
  Category, 
  StockMovement, 
  AuditLog 
} from '../types';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer, 
  Cell, 
  LineChart, 
  Line 
} from 'recharts';
import { 
  ShoppingCart, 
  Package, 
  FileText, 
  TrendingUp, 
  AlertTriangle, 
  Plus, 
  History, 
  Search, 
  Settings, 
  X, 
  CheckCircle2, 
  ChevronUp,
  ChevronDown,
  Users, 
  Info,
  Layers,
  ChevronRight,
  FolderOpen,
  RefreshCw,
  Keyboard,
  Check,
  Tag
} from 'lucide-react';
import { useModalEffects } from './modalUtils';

interface POSProps {
  products: Product[];
  categories: Category[];
  sales: Sale[];
  movements: StockMovement[];
  auditLogs: AuditLog[];
  setProducts: React.Dispatch<React.SetStateAction<Product[]>>;
  setSales: React.Dispatch<React.SetStateAction<Sale[]>>;
  setMovements: React.Dispatch<React.SetStateAction<StockMovement[]>>;
  setAuditLogs: React.Dispatch<React.SetStateAction<AuditLog[]>>;
  onComplete: (sale: Sale) => void;
  isFocusMode: boolean;
  setIsFocusMode: (val: boolean) => void;
  isSidebarCollapsed: boolean;
  setIsSidebarCollapsed: (val: boolean) => void;
}

export const POS: React.FC<POSProps> = ({ 
  products, 
  categories, 
  sales, 
  movements, 
  auditLogs, 
  setProducts, 
  setSales, 
  setMovements, 
  setAuditLogs,
  onComplete,
  isFocusMode,
  setIsFocusMode,
  isSidebarCollapsed,
  setIsSidebarCollapsed
}) => {
  // Core cart and search states
  const [cart, setCart] = useState<CartItem[]>([]);
  const [search, setSearch] = useState('');
  const [searchHighlightIndex, setSearchHighlightIndex] = useState(0);
  const [selectedProductSku, setSelectedProductSku] = useState<string>('');
  const [isEditingCell, setIsEditingCell] = useState<{ row: number; col: 'qty' | 'price' | 'discount' | 'gstRate' } | null>(null);

  // Customer states (Compact form in checkout panel)
  const [customerName, setCustomerName] = useState('Walk-in Customer');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerGst, setCustomerGst] = useState('');
  const [isEditingCustomer, setIsEditingCustomer] = useState(false);

  // Financial offsets states
  const [discountPercent, setDiscountPercent] = useState<number>(0);
  const [paymentMode, setPaymentMode] = useState<'CASH' | 'UPI' | 'CARD'>('CASH');

  // Multi-drawer toggle structures
  const [activeSubPanel, setActiveSubPanel] = useState<'NONE' | 'INVENTORY' | 'MOVEMENT' | 'CATEGORIES' | 'REPORTS' | 'PROFIT' | 'LEDGER' | 'SETTINGS'>('NONE');
  const [activeReportTab, setActiveReportTab] = useState<'TODAY_SALES' | 'MONTH_SALES' | 'VALUATION' | 'LOW_STOCK' | 'BEST_SELLING' | 'PROFIT_MARGINS' | 'CUSTOMER_TAX'>('TODAY_SALES');

  // Shortcuts right action bar state
  const [isShortcutExpanded, setIsShortcutExpanded] = useState<boolean>(false);

  // Real-time Header Timer state
  const [currentTime, setCurrentTime] = useState(new Date());

  // Input offsets references
  const searchInputRef = useRef<HTMLInputElement>(null);
  const cartTableContainerRef = useRef<HTMLDivElement>(null);
  const completionModalRef = useRef<HTMLDivElement>(null);
  const printInvoiceBtnRef = useRef<HTMLButtonElement>(null);
  // Track last focused grid column to navigate back from sub-panels on ArrowUp smoothly
  const lastFocusedGridCol = useRef<'desc' | 'qty' | 'price' | 'discount' | 'gstRate' | 'del'>('qty');

  // Drawer ref and hook for sliding right panel
  const drawerRef = useRef<HTMLDivElement>(null);
  useModalEffects({
    onClose: () => setActiveSubPanel('NONE'),
    containerRef: drawerRef,
    isActive: activeSubPanel !== 'NONE',
  });

  // Dynamic system defaults
  const [defaultCgstRate, setDefaultCgstRate] = useState(9);
  const [defaultSgstRate, setDefaultSgstRate] = useState(9);

  // Success banners helper
  const [successBanner, setSuccessBanner] = useState<string | null>(null);
  
  // Successful checkout details
  const [lastCompletedInvoice, setLastCompletedInvoice] = useState<Sale | null>(null);
  const [showInvoiceViewer, setShowInvoiceViewer] = useState<boolean>(false);

  // Unified professional Invoice completion / history / config states
  const [showCompletionModal, setShowCompletionModal] = useState<boolean>(false);
  const [selectedPreviewInvoice, setSelectedPreviewInvoice] = useState<Sale | null>(null);
  const [showCustomerHistoryModal, setShowCustomerHistoryModal] = useState<boolean>(false);
  const [isRecentCustomersHistoryExpanded, setIsRecentCustomersHistoryExpanded] = useState<boolean>(false);
  const [editingSaleId, setEditingSaleId] = useState<string | null>(null);
  const [editingSale, setEditingSale] = useState<Sale | null>(null);
  const [editLockoutMinutes, setEditLockoutMinutes] = useState<number>(30);
  const [recentDrawerTab, setRecentDrawerTab] = useState<'BILLS' | 'LEDGER'>('BILLS');
  const [showQuickAccess, setShowQuickAccess] = useState<boolean>(false);

  // Computed customer purchase volumes and analytics profiles
  const customerSales = useMemo(() => {
    if (!customerName) return [];
    return sales.filter(s => 
      s.customerName.toLowerCase() === customerName.toLowerCase() || 
      (customerPhone && s.customerPhone === customerPhone)
    );
  }, [sales, customerName, customerPhone]);

  const customerAnalytics = useMemo(() => {
    const count = customerSales.length;
    const revenue = customerSales.reduce((acc, s) => acc + s.grandTotal, 0);
    const lastVisit = customerSales.length > 0 
      ? new Date(customerSales[0].timestamp).toLocaleDateString(undefined, {year: 'numeric', month: 'short', day: 'numeric'}) 
      : 'Never';
    
    // Group categories and item volumes
    const itemQuantities: Record<string, number> = {};
    const categoryQuantities: Record<string, number> = {};
    
    customerSales.forEach(s => {
      s.items.forEach(it => {
        itemQuantities[it.name] = (itemQuantities[it.name] || 0) + it.qty;
        const prod = products.find(p => p.id === it.productId);
        const catObj = categories.find(c => c.id === prod?.categoryId);
        const cat = catObj ? `${catObj.name} (${catObj.code})` : 'General';
        categoryQuantities[cat] = (categoryQuantities[cat] || 0) + it.qty;
      });
    });
    
    let mostPurchasedProduct = 'N/A';
    let maxProdQty = 0;
    Object.entries(itemQuantities).forEach(([name, qty]) => {
      if (qty > maxProdQty) {
        maxProdQty = qty;
        mostPurchasedProduct = name;
      }
    });

    let mostPurchasedCategory = 'N/A';
    let maxCatQty = 0;
    Object.entries(categoryQuantities).forEach(([name, qty]) => {
      if (qty > maxCatQty) {
        maxCatQty = qty;
        mostPurchasedCategory = name;
      }
    });

    return {
      count,
      revenue,
      lastVisit,
      mostPurchasedCategory,
      mostPurchasedProduct
    };
  }, [customerSales, products, categories]);

  // Derived 5 recent customer list seeded with realistic profiles
  const recentCustomers = useMemo(() => {
    const seeds = [
      { name: 'Walk-In Customer', phone: '', lastPurchaseDate: 'Recent', invoiceCount: 12 },
      { name: 'Angel', phone: '9876543210', lastPurchaseDate: '2026-06-12', invoiceCount: 8 },
      { name: 'Kohli', phone: '9123456789', lastPurchaseDate: '2026-06-11', invoiceCount: 14 },
      { name: 'Tamil', phone: '9988776655', lastPurchaseDate: '2026-06-10', invoiceCount: 6 },
      { name: 'Ramesh', phone: '9845612300', lastPurchaseDate: '2026-06-09', invoiceCount: 19 },
      { name: 'Suresh', phone: '9731245688', lastPurchaseDate: '2026-06-08', invoiceCount: 11 },
    ];

    const realStats: Record<string, { phone: string; lastDate: Date; count: number }> = {};
    sales.forEach(sale => {
      const name = sale.customerName || 'Walk-In Customer';
      const phone = sale.customerPhone || '';
      const dateVal = new Date(sale.timestamp);
      if (!realStats[name]) {
        realStats[name] = { phone, lastDate: dateVal, count: 0 };
      }
      realStats[name].count++;
      if (dateVal > realStats[name].lastDate) {
        realStats[name].lastDate = dateVal;
      }
    });

    const merged = seeds.map(s => {
      const real = realStats[s.name];
      if (real) {
        return {
          name: s.name,
          phone: real.phone || s.phone,
          lastPurchaseDate: real.lastDate.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }),
          invoiceCount: s.invoiceCount + real.count,
        };
      }
      return s;
    });

    Object.entries(realStats).forEach(([name, stat]) => {
      if (!seeds.some(s => s.name.toLowerCase() === name.toLowerCase())) {
        merged.push({
          name,
          phone: stat.phone,
          lastPurchaseDate: stat.lastDate.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }),
          invoiceCount: stat.count,
        });
      }
    });

    return merged;
  }, [sales]);

  // Drawer stock adjustment form states
  const [movProdId, setMovProdId] = useState('');
  const [movSku, setMovSku] = useState('');
  const [movQty, setMovQty] = useState(1);
  const [movType, setMovType] = useState<'IN' | 'OUT' | 'ADJUST'>('IN');
  const [movReason, setMovReason] = useState('');

  // Drawer custom category template states
  const [newCatName, setNewCatName] = useState('');
  const [newCatAttrs, setNewCatAttrs] = useState<{name: string, type: 'text'|'number'|'boolean'|'select', required: boolean}[]>([]);

  // Update timer clock tick
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Quick completed invoice quick panel auto-hide effect after 5 minutes
  useEffect(() => {
    if (lastCompletedInvoice) {
      setShowQuickAccess(true);
      const timer = setTimeout(() => {
        setShowQuickAccess(false);
      }, 300000); // 5 minutes
      return () => clearTimeout(timer);
    }
  }, [lastCompletedInvoice]);

  // Real-time suggestions search parser
  const searchResults = useMemo(() => {
    if (!search.trim()) return [];
    const term = search.toLowerCase().trim();
    const matches: { product: Product; variant: any }[] = [];

    products.forEach(p => {
      p.variants.forEach(v => {
        const matchName = p.name.toLowerCase().includes(term);
        const matchSku = v.sku.toLowerCase().includes(term);
        const catObj = categories.find(c => c.id === p.categoryId);
        const matchCat = (catObj ? `${catObj.name} ${catObj.code}` : '').toLowerCase().includes(term);
        
        let matchAttr = false;
        if (v.attrValues) {
          matchAttr = Object.values(v.attrValues).some(val => String(val).toLowerCase().includes(term));
        }

        if (matchName || matchSku || matchCat || matchAttr) {
          matches.push({ product: p, variant: v });
        }
      });
    });

    return matches.slice(0, 8);
  }, [search, products, categories]);

  // Readjust list highlight on input search change
  useEffect(() => {
    setSearchHighlightIndex(0);
  }, [searchResults]);

  // Currently focused specs panel
  const activeProductInfo = useMemo(() => {
    const activeSku = selectedProductSku || (cart.length > 0 ? cart[cart.length - 1].sku : '');
    if (!activeSku) return { product: null, variant: null };
    const p = products.find(prod => prod.variants.some(v => v.sku === activeSku));
    const v = p?.variants.find(varItem => varItem.sku === activeSku);
    return { product: p || null, variant: v || null };
  }, [selectedProductSku, cart, products]);

  // Tally overall statistics counters
  const tallyStats = useMemo(() => {
    let stockVal = 0;
    let lowCount = 0;
    let totalItems = 0;

    products.forEach(p => p.variants.forEach(v => {
      stockVal += (v.stock || 0) * (v.costPrice || 0);
      totalItems++;
      if ((v.stock || 0) <= (v.lowStockThreshold || 0)) {
        lowCount++;
      }
    }));

    const todayStr = new Date().toISOString().split('T')[0];
    const todaySales = sales.filter(s => s.timestamp.startsWith(todayStr));
    const revenueToday = todaySales.reduce((acc, s) => acc + s.grandTotal, 0);

    const profitToday = todaySales.reduce((acc, s) => {
      const saleCost = s.items.reduce((cAcc, item) => cAcc + ((item.costPrice || 0) * item.qty), 0);
      return acc + (s.subTotal - s.totalDiscount - saleCost);
    }, 0);

    return {
      todayRevenue: revenueToday,
      profitToday,
      inventoryValue: stockVal,
      activeProductsCount: totalItems,
      todayTransactionsCount: todaySales.length,
      lowStockCount: lowCount
    };
  }, [products, sales]);

  // Aggregate hot velocity metrics
  const fastMovingProducts = useMemo(() => {
    const tracker: Record<string, { name: string; sku: string; qty: number; totalValue: number }> = {};
    sales.forEach(s => {
      s.items.forEach(item => {
        if (!tracker[item.sku]) {
          tracker[item.sku] = { name: item.name, sku: item.sku, qty: 0, totalValue: 0 };
        }
        tracker[item.sku].qty += item.qty;
        tracker[item.sku].totalValue += item.qty * item.price;
      });
    });
    return Object.values(tracker).sort((a, b) => b.qty - a.qty).slice(0, 5);
  }, [sales]);

  // Toggle dynamic overlay panels
  const togglePanel = (panel: typeof activeSubPanel) => {
    setActiveSubPanel(prev => prev === panel ? 'NONE' : panel);
  };

  // Append items to cart entries
  const handleAddNewItemSku = (product: Product, variantSku: string) => {
    const variant = product.variants.find(v => v.sku === variantSku);
    if (!variant) return;

    if (variant.stock <= 0) {
      alert(`Inventory error: SKU "${variantSku}" is temporarily out of stock!`);
      return;
    }

    const itemIndex = cart.findIndex(it => it.sku === variantSku);
    if (itemIndex > -1) {
      const copy = [...cart];
      copy[itemIndex].qty += 1;
      setCart(copy);
    } else {
      setCart(prev => [...prev, {
        productId: product.id,
        sku: variantSku,
        name: product.name,
        qty: 1,
        price: variant.price,
        costPrice: variant.costPrice,
        gstRate: (product.gstRates.cgst || defaultCgstRate) + (product.gstRates.sgst || defaultSgstRate),
        discount: 0
      }]);
    }

    setSelectedProductSku(variantSku);
    setSearch('');

    const isNew = itemIndex === -1;
    const idxToFocus = isNew ? cart.length : itemIndex;

    // Focus newly created item's qty grid index
    setTimeout(() => {
      const cell = document.getElementById(`cell-qty-${idxToFocus}`) as HTMLInputElement | null;
      if (cell) {
        cell.focus();
        cell.scrollIntoView({ block: 'nearest', inline: 'nearest' });
        setIsEditingCell({ row: idxToFocus, col: 'qty' });
        try {
          cell.select();
        } catch (err) {}
      }
    }, 100);
  };

  // Helper to scroll cells into view
  const scrollCellIntoView = (el: HTMLElement | null) => {
    if (!el) return;
    el.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  };

  // Keyboard Navigation for Description Column
  const handleDescKeyDown = (e: React.KeyboardEvent, rowIndex: number) => {
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      if (rowIndex > 0) {
        const prevDel = document.getElementById(`cell-del-${rowIndex - 1}`);
        if (prevDel) prevDel.focus();
      } else {
        searchInputRef.current?.focus();
      }
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      document.getElementById(`cell-qty-${rowIndex}`)?.focus();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (rowIndex > 0) {
        document.getElementById(`cell-desc-${rowIndex - 1}`)?.focus();
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (rowIndex < cart.length - 1) {
        document.getElementById(`cell-desc-${rowIndex + 1}`)?.focus();
      } else {
        document.getElementById('flat-discount-input')?.focus();
      }
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const nextCell = document.getElementById(`cell-qty-${rowIndex}`);
      if (nextCell) {
        nextCell.focus();
        setIsEditingCell({ row: rowIndex, col: 'qty' });
        try {
          (nextCell as HTMLInputElement).select();
        } catch (err) {}
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      searchInputRef.current?.focus();
    }
  };

  // Keyboard Navigation: Excel spreadsheet navigation
  const handleCellKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, rowIndex: number, columnField: 'qty' | 'price' | 'discount' | 'gstRate') => {
    const cols = ['qty', 'price', 'discount', 'gstRate'] as const;
    const colIdx = cols.indexOf(columnField);
    const input = e.currentTarget;
    const isEditing = isEditingCell && isEditingCell.row === rowIndex && isEditingCell.col === columnField;

    // 1. If in Edit Mode:
    if (isEditing) {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
        // Arrow keys must NOT leave the field while editing!
        e.stopPropagation();
        
        if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
          e.preventDefault();
          const step = parseFloat(input.step) || 1;
          const val = parseFloat(input.value) || 0;
          let newVal = e.key === 'ArrowUp' ? val + step : val - step;
          if (columnField === 'qty') {
            if (newVal < 1) newVal = 1;
          } else {
            if (newVal < 0) newVal = 0;
          }
          if (columnField === 'discount' && newVal > 100) newVal = 100;
          
          handleGridCellChange(rowIndex, columnField, Number(newVal.toFixed(2)));
          // also keep selected/focus
          setTimeout(() => {
            input.select();
          }, 10);
        }
        return;
      }

      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        setIsEditingCell(null);
        // Save and navigate to the next cell using default Behavior
        if (colIdx < cols.length - 1) {
          document.getElementById(`cell-${cols[colIdx + 1]}-${rowIndex}`)?.focus();
        } else {
          document.getElementById(`cell-del-${rowIndex}`)?.focus();
        }
        return;
      }

      if (e.key === 'Escape') {
        e.preventDefault();
        setIsEditingCell(null);
        return;
      }
      
      return; // let details like numbers pass through
    }

    // 2. If in Navigation Mode (not editing yet):
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (rowIndex > 0) {
        document.getElementById(`cell-${columnField}-${rowIndex - 1}`)?.focus();
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (rowIndex < cart.length - 1) {
        document.getElementById(`cell-${columnField}-${rowIndex + 1}`)?.focus();
      } else {
        document.getElementById('flat-discount-input')?.focus();
      }
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      if (colIdx < cols.length - 1) {
        document.getElementById(`cell-${cols[colIdx + 1]}-${rowIndex}`)?.focus();
      } else {
        document.getElementById(`cell-del-${rowIndex}`)?.focus();
      }
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      if (colIdx > 0) {
        document.getElementById(`cell-${cols[colIdx - 1]}-${rowIndex}`)?.focus();
      } else {
        document.getElementById(`cell-desc-${rowIndex}`)?.focus();
      }
    } else if (e.key === 'Enter') {
      // Enter to start editing!
      e.preventDefault();
      setIsEditingCell({ row: rowIndex, col: columnField });
      setTimeout(() => {
        input.select();
      }, 10);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      searchInputRef.current?.focus();
    } else if (e.key === 'Delete') {
      e.preventDefault();
      const updated = cart.filter((_, i) => i !== rowIndex);
      setCart(updated);
      if (updated.length > 0) {
        const nextIdx = Math.min(rowIndex, updated.length - 1);
        setSelectedProductSku(updated[nextIdx].sku);
        setTimeout(() => {
          document.getElementById(`cell-${columnField}-${nextIdx}`)?.focus();
        }, 50);
      } else {
        setSelectedProductSku('');
        searchInputRef.current?.focus();
      }
    } else if (/^[0-9a-zA-Z.+\-]$/.test(e.key) || e.key === 'Backspace') {
      // Any typing key, we automatically activate Edit Mode!
      setIsEditingCell({ row: rowIndex, col: columnField });
    }
  };

  // Keyboard navigation for Delete button cell
  const handleDeleteCellKeyDown = (e: React.KeyboardEvent, rowIndex: number) => {
    if (e.key === 'Enter' || e.key === ' ' || e.key === 'Delete') {
      e.preventDefault();
      const updated = cart.filter((_, i) => i !== rowIndex);
      setCart(updated);
      if (updated.length > 0) {
        const nextIdx = Math.min(rowIndex, updated.length - 1);
        setSelectedProductSku(updated[nextIdx].sku);
        setTimeout(() => {
          document.getElementById(`cell-qty-${nextIdx}`)?.focus();
        }, 50);
      } else {
        setSelectedProductSku('');
        searchInputRef.current?.focus();
      }
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      document.getElementById(`cell-gstRate-${rowIndex}`)?.focus();
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      if (rowIndex < cart.length - 1) {
        document.getElementById(`cell-desc-${rowIndex + 1}`)?.focus();
      } else {
        document.getElementById('flat-discount-input')?.focus();
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (rowIndex > 0) {
        document.getElementById(`cell-del-${rowIndex - 1}`)?.focus();
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (rowIndex < cart.length - 1) {
        document.getElementById(`cell-del-${rowIndex + 1}`)?.focus();
      } else {
        document.getElementById('flat-discount-input')?.focus();
      }
    }
  };

  // Autocomplete key binds
  const handleSearchFieldKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (searchResults.length === 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (cart.length > 0) {
          const col = lastFocusedGridCol.current;
          const targetId = (col === 'desc' || col === 'del') ? `cell-${col}-0` : `cell-${col}-0`;
          document.getElementById(targetId)?.focus() || document.getElementById('cell-qty-0')?.focus();
        }
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSearchHighlightIndex(prev => (prev + 1) % searchResults.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSearchHighlightIndex(prev => (prev - 1 + searchResults.length) % searchResults.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const highlighted = searchResults[searchHighlightIndex];
      if (highlighted) {
        handleAddNewItemSku(highlighted.product, highlighted.variant.sku);
      }
    } else if (e.key === 'Escape') {
      setSearch('');
    }
  };

  // Flat Discount Field Navigation Keys
  const handleFlatDiscountKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const input = e.currentTarget;

    if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (cart.length > 0) {
        const col = lastFocusedGridCol.current;
        const targetId = (col === 'desc' || col === 'del') ? `cell-${col}-${cart.length - 1}` : `cell-${col}-${cart.length - 1}`;
        document.getElementById(targetId)?.focus();
      } else {
        searchInputRef.current?.focus();
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      document.getElementById(`payment-mode-${paymentMode}`)?.focus();
      return;
    }

    if (e.key === 'Enter' || e.key === 'ArrowRight' || e.key === 'Tab') {
      e.preventDefault();
      document.getElementById(`payment-mode-${paymentMode}`)?.focus();
      return;
    }

    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      if (cart.length > 0) {
        const col = lastFocusedGridCol.current;
        const targetId = (col === 'desc' || col === 'del') ? `cell-${col}-${cart.length - 1}` : `cell-${col}-${cart.length - 1}`;
        document.getElementById(targetId)?.focus();
      } else {
        searchInputRef.current?.focus();
      }
    }
  };

  // Payment Mode navigation
  const handlePaymentModeKeyDown = (e: React.KeyboardEvent, currentMode: 'CASH' | 'UPI' | 'CARD') => {
    const modes = ['CASH', 'UPI', 'CARD'] as const;
    const idx = modes.indexOf(currentMode);
    
    // BOTH Left/Right AND Up/Down must move left/right/up/down between the three options,
    // where CASH is left/up boundary, CARD is right/down boundary.
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      e.preventDefault();
      if (idx < modes.length - 1) {
        document.getElementById(`payment-mode-${modes[idx + 1]}`)?.focus();
      } else {
        // Leave the payment mode block and go DOWN to the next focus element (CRM/Customer)
        if (isEditingCustomer) {
          document.getElementById('customer-name-input')?.focus();
        } else {
          document.getElementById('btn-change-customer')?.focus();
        }
      }
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      e.preventDefault();
      if (idx > 0) {
        document.getElementById(`payment-mode-${modes[idx - 1]}`)?.focus();
      } else {
        // Leave the payment mode block and go UP to the previous element (flat discount input)
        document.getElementById('flat-discount-input')?.focus();
      }
    } else if (e.key === 'Enter') {
      e.preventDefault();
      setPaymentMode(currentMode);
    }
  };

  // Recent Customer List Navigation Keys
  const handleRecentCustomerKeyDown = (e: React.KeyboardEvent, index: number) => {
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      const nextCust = document.getElementById(`recent-cust-${index + 1}`);
      if (nextCust) {
        nextCust.focus();
      } else {
        // Wrap around to start
        document.getElementById('recent-cust-0')?.focus();
      }
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      if (index > 0) {
        const prevCust = document.getElementById(`recent-cust-${index - 1}`);
        if (prevCust) prevCust.focus();
      } else {
        const lastCust = document.getElementById(`recent-cust-${Math.min(5, recentCustomers.length - 1)}`);
        if (lastCust) lastCust.focus();
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      document.getElementById('btn-complete-bill')?.focus();
    } else if (e.key === 'ArrowUp' || e.key === 'Escape') {
      e.preventDefault();
      // Close/collapse and return to search
      setIsRecentCustomersHistoryExpanded(false);
      searchInputRef.current?.focus();
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const cust = recentCustomers[index];
      if (cust) {
        setCustomerName(cust.name);
        setCustomerPhone(cust.phone);
        setCustomerGst('');
        setTimeout(() => {
          document.getElementById('btn-complete-bill')?.focus();
        }, 50);
      }
    }
  };

  // Change Customer keyboard handler (Wait State)
  const handleChangeCustomerKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (isEditingCustomer) {
        document.getElementById('customer-phone-input')?.focus();
      } else {
        document.getElementById(`payment-mode-${paymentMode}`)?.focus();
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      document.getElementById('btn-complete-bill')?.focus();
    } else if (e.key === 'Enter') {
      e.preventDefault();
      setIsEditingCustomer(true);
      setTimeout(() => {
        document.getElementById('customer-name-input')?.focus();
      }, 50);
    }
  };

  // Customer Edit Form Inputs navigation (Without GST field!)
  const handleCustomerInputsKeyDown = (e: React.KeyboardEvent, fieldName: 'name' | 'phone' | 'confirm' | 'cancel') => {
    if (e.key === 'Escape') {
      e.preventDefault();
      setIsEditingCustomer(false);
      setTimeout(() => {
        document.getElementById('btn-change-customer')?.focus();
      }, 50);
      return;
    }

    if (e.key === 'ArrowDown' || e.key === 'Enter') {
      e.preventDefault();
      if (fieldName === 'name') {
        document.getElementById('customer-phone-input')?.focus();
      } else if (fieldName === 'phone') {
        document.getElementById('btn-confirm-customer')?.focus();
      } else if (fieldName === 'confirm') {
        document.getElementById('btn-cancel-customer-form')?.focus();
      } else if (fieldName === 'cancel') {
        setIsEditingCustomer(false);
        setTimeout(() => {
          document.getElementById('btn-complete-bill')?.focus();
        }, 50);
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (fieldName === 'phone') {
        document.getElementById('customer-name-input')?.focus();
      } else if (fieldName === 'confirm') {
        document.getElementById('customer-phone-input')?.focus();
      } else if (fieldName === 'cancel') {
        document.getElementById('btn-confirm-customer')?.focus();
      } else if (fieldName === 'name') {
        document.getElementById(`payment-mode-${paymentMode}`)?.focus();
      }
    } else if (e.key === 'ArrowRight' && fieldName === 'confirm') {
      e.preventDefault();
      document.getElementById('btn-cancel-customer-form')?.focus();
    } else if (e.key === 'ArrowLeft' && fieldName === 'cancel') {
      e.preventDefault();
      document.getElementById('btn-confirm-customer')?.focus();
    }
  };

  // Final confirmation bill keystroke
  const handleCompleteBillKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (isEditingCustomer) {
        document.getElementById('btn-confirm-customer')?.focus();
      } else {
        document.getElementById('btn-change-customer')?.focus();
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      searchInputRef.current?.focus();
    }
  };

  // Cell modifications
  const handleGridCellChange = (rowIndex: number, field: 'qty' | 'price' | 'discount' | 'gstRate', value: number) => {
    const copy = [...cart];
    copy[rowIndex] = { ...copy[rowIndex], [field]: value };
    setCart(copy);
  };

  // Compute grand invoice financial totals
  const invoiceCalculatedValues = useMemo(() => {
    let subTotal = 0;
    let taxTotal = 0;
    let discItemsTotal = 0;

    cart.forEach(it => {
      const baseCost = it.price * it.qty;
      const rowDisc = baseCost * (it.discount / 100);
      const rowTaxable = baseCost - rowDisc;
      const rowTax = rowTaxable * (it.gstRate / 100);

      subTotal += baseCost;
      discItemsTotal += rowDisc;
      taxTotal += rowTax;
    });

    const flatDiscountCash = subTotal * (discountPercent / 100);
    const taxableSubtotal = subTotal - discItemsTotal;

    return {
      subTotal: taxableSubtotal,
      gstValue: taxTotal,
      discountTotal: discItemsTotal + flatDiscountCash,
      payableTotal: Math.max(0, Math.round((taxableSubtotal + taxTotal - flatDiscountCash) * 100) / 100),
      totalQuantityCount: cart.reduce((acc, current) => acc + current.qty, 0)
    };
  }, [cart, discountPercent]);

  // Print Invoice trigger
  const handlePrintInvoice = (sale: Sale | null) => {
    if (!sale) return;
    setSuccessBanner(`🖨️ Invoice ${sale.id} sent to the printer thermal queue! (Printed ₹${sale.grandTotal.toLocaleString()})`);
  };

  // Check if historical invoice editing timeline constraints are respected
  const checkIsEditable = (sale: Sale) => {
    const diffMs = new Date().getTime() - new Date(sale.timestamp).getTime();
    const diffMins = diffMs / (60 * 1000);
    return diffMins < editLockoutMinutes;
  };

  // Perform corrective loading of an invoice for editing state
  const handleLoadInvoiceForEditing = (sale: Sale) => {
    if (!checkIsEditable(sale)) {
      alert(`🔐 Security Error: Editing is locked. This invoice is older than the configured ${editLockoutMinutes}-minute window.`);
      return;
    }
    setCart([...sale.items]);
    setCustomerName(sale.customerName);
    setCustomerPhone(sale.customerPhone || '');
    setCustomerGst(sale.customerGst || '');
    setPaymentMode(sale.paymentMode);
    setDiscountPercent(0); 
    setEditingSaleId(sale.id);
    setEditingSale(sale);
    setShowCompletionModal(false);
    setActiveSubPanel('NONE');
    setSuccessBanner(`✏️ Loaded invoice "${sale.id}" for corrective editing mode. Press F10 to commit updates.`);
  };

  // Start a fresh billing transaction (Unified reset block)
  const handleStartNewBill = () => {
    setCart([]);
    setCustomerName('Walk-in Customer');
    setCustomerPhone('');
    setCustomerGst('');
    setDiscountPercent(0);
    setSearch('');
    setPaymentMode('CASH');
    setIsEditingCustomer(false);
    setEditingSaleId(null);
    setEditingSale(null);
    setShowCompletionModal(false);
    setTimeout(() => {
      searchInputRef.current?.focus();
    }, 60);
  };

  // Complete and commit POS invoice records
  const handleCommitInvoiceBill = () => {
    if (cart.length === 0) {
      alert("Error: Billing ledger cart is empty. Please query and insert checkout items!");
      return;
    }

    // Verify stock availability
    for (const item of cart) {
      const prod = products.find(p => p.id === item.productId);
      const variant = prod?.variants.find(v => v.sku === item.sku);
      if (variant) {
        const originalItemQty = editingSale?.items.find(it => it.sku === item.sku)?.qty || 0;
        const availableStockIncludingOriginal = variant.stock + originalItemQty;
        if (availableStockIncludingOriginal < item.qty) {
          alert(`Failed stock validations: Sku "${item.sku}" only has ${variant.stock} physical units left. Requested: ${item.qty}.`);
          return;
        }
      }
    }

    const { subTotal, gstValue, discountTotal, payableTotal } = invoiceCalculatedValues;
    const finalSaleId = editingSaleId || 'INV-' + Math.random().toString(36).substr(2, 6).toUpperCase();

    const completedSale: Sale = {
      id: finalSaleId,
      customerId: customerPhone ? 'C_REG_' + customerPhone : 'C_WALK-IN',
      customerName: customerName || 'Walk-in Customer',
      customerPhone: customerPhone || undefined,
      customerGst: customerGst || undefined,
      items: [...cart],
      subTotal,
      totalGst: gstValue,
      totalDiscount: discountTotal,
      grandTotal: payableTotal,
      paymentMode,
      timestamp: editingSale ? editingSale.timestamp : new Date().toISOString(),
      userId: 'ERP-Billing Operator',
      status: 'PAID'
    };

    // Save movements triggers internally and adjust stocks
    setProducts(prevProducts => {
      let temp = [...prevProducts];
      if (editingSale) {
        // Reverse previous items of edited invoice
        temp = temp.map(p => ({
          ...p,
          variants: p.variants.map(v => {
            const matchedOldItem = editingSale.items.find(item => item.sku === v.sku);
            if (!matchedOldItem) return v;
            return { ...v, stock: v.stock + matchedOldItem.qty };
          })
        }));
      }

      // Apply new cart item quantities
      temp = temp.map(p => ({
        ...p,
        variants: p.variants.map(v => {
          const matchedCartItem = cart.find(item => item.sku === v.sku);
          if (!matchedCartItem) return v;
          return { ...v, stock: Math.max(0, v.stock - matchedCartItem.qty) };
        })
      }));
      return temp;
    });

    if (editingSale) {
      setSales(prev => prev.map(s => s.id === finalSaleId ? completedSale : s));
      setSuccessBanner(`✏️ Invoice ${finalSaleId} updated successfully.`);
    } else {
      // Callback save pipeline
      onComplete(completedSale);
    }

    // Post stock movements
    cart.forEach(item => {
      const movRecord: StockMovement = {
        id: 'MV_POS_' + Math.random().toString(36).substr(2, 6).toUpperCase(),
        timestamp: new Date().toISOString(),
        productId: item.productId,
        variantSku: item.sku,
        type: 'OUT',
        qty: item.qty,
        reason: editingSale ? `Edited Sales Invoice Cashout: ${finalSaleId}` : `Sales Invoice Cashout: ${finalSaleId}`,
        userId: 'ERP Terminal'
      };
      setMovements(prev => [movRecord, ...prev]);
    });

    // Logging audit logs
    const audit: AuditLog = {
      id: Math.random().toString(36).substr(2, 9),
      userId: 'Admin Cashier',
      action: 'POS_LEDGER_SALE',
      details: `${completedSale.id} completed. collected ₹${payableTotal.toLocaleString()} via ${paymentMode}`,
      timestamp: new Date().toISOString()
    };
    setAuditLogs(prev => [audit, ...prev]);

    setLastCompletedInvoice(completedSale);
    setSelectedPreviewInvoice(completedSale);
    setShowCompletionModal(true);
  };

  // Dedicated Keyboard Listener & Focus Management for Invoice Completion Dialog
  useEffect(() => {
    if (!showCompletionModal) return;

    // Focus primary action button (Print Invoice) immediately when dialog opens
    const focusTimer = setTimeout(() => {
      printInvoiceBtnRef.current?.focus();
    }, 50);

    const handleCompletionModalKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        e.stopPropagation();
        handlePrintInvoice(selectedPreviewInvoice);
        return;
      }

      if (e.key === 'F10') {
        e.preventDefault();
        e.stopPropagation();
        handleStartNewBill();
        return;
      }

      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        setShowCompletionModal(false);
        return;
      }

      // Arrow keys navigation between interactive controls in modal
      if (['ArrowDown', 'ArrowUp', 'ArrowRight', 'ArrowLeft'].includes(e.key)) {
        if (!completionModalRef.current) return;
        const focusables = Array.from(
          completionModalRef.current.querySelectorAll<HTMLElement>(
            'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
          )
        );
        if (focusables.length === 0) return;

        e.preventDefault();
        e.stopPropagation();

        const activeEl = document.activeElement as HTMLElement;
        const currentIndex = focusables.indexOf(activeEl);

        if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
          const nextIndex = currentIndex < 0 ? 0 : (currentIndex + 1) % focusables.length;
          focusables[nextIndex]?.focus();
        } else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
          const prevIndex = currentIndex <= 0 ? focusables.length - 1 : currentIndex - 1;
          focusables[prevIndex]?.focus();
        }
        return;
      }

      // Focus cycling via Tab / Shift+Tab
      if (e.key === 'Tab') {
        if (!completionModalRef.current) return;
        const focusables = Array.from(
          completionModalRef.current.querySelectorAll<HTMLElement>(
            'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
          )
        );
        if (focusables.length === 0) return;

        const first = focusables[0];
        const last = focusables[focusables.length - 1];

        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          e.stopPropagation();
          last?.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          e.stopPropagation();
          first?.focus();
        }
      }
    };

    // Capture phase listener at modal window level
    window.addEventListener('keydown', handleCompletionModalKeyDown, true);

    return () => {
      clearTimeout(focusTimer);
      window.removeEventListener('keydown', handleCompletionModalKeyDown, true);
    };
  }, [showCompletionModal, selectedPreviewInvoice]);

  // Keyboard shortcut alignment
  useEffect(() => {
    const handleWorkstationShortcuts = (e: KeyboardEvent) => {
      // Intercept keys if the Invoice Completion Modal is open
      if (showCompletionModal) {
        return; // Completion modal capture listener handles keys exclusively when modal is open
      }

      if (e.key === 'Escape' && activeSubPanel !== 'NONE') {
        e.preventDefault();
        setActiveSubPanel('NONE');
        setTimeout(() => {
          searchInputRef.current?.focus();
        }, 50);
        return;
      }

      if ((e.altKey && e.key.toLowerCase() === 'h') || e.key === 'F11') {
        e.preventDefault();
        setIsRecentCustomersHistoryExpanded(true);
        setTimeout(() => {
          document.getElementById('recent-cust-0')?.focus();
        }, 50);
        return;
      }

      if (['F2', 'F4', 'F5', 'F6', 'F7', 'F8', 'F9', 'F10', 'F12'].includes(e.key)) {
        e.preventDefault();

        switch (e.key) {
          case 'F2':
            setSearch('');
            searchInputRef.current?.focus();
            break;
          case 'F4':
            togglePanel('INVENTORY');
            break;
          case 'F5':
            togglePanel('MOVEMENT');
            break;
          case 'F6':
            togglePanel('CATEGORIES');
            break;
          case 'F7':
            togglePanel('REPORTS');
            break;
          case 'F8':
            togglePanel('PROFIT');
            break;
          case 'F9':
            togglePanel('LEDGER');
            break;
          case 'F10':
            handleCommitInvoiceBill();
            break;
          case 'F12':
            togglePanel('SETTINGS');
            break;
        }
      } else if (e.key === 'Escape') {
        setActiveSubPanel('NONE');
        setSearch('');
      }
    };

    window.addEventListener('keydown', handleWorkstationShortcuts);
    return () => window.removeEventListener('keydown', handleWorkstationShortcuts);
  }, [
    cart, 
    customerName, 
    customerPhone, 
    customerGst, 
    discountPercent, 
    paymentMode, 
    products, 
    isFocusMode, 
    setIsFocusMode,
    showCompletionModal,
    selectedPreviewInvoice,
    isRecentCustomersHistoryExpanded,
    activeSubPanel
  ]);

  // Drawer stock adjustment submit
  const handleQuickAdjustmentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!movProdId || !movSku || movQty <= 0) {
      alert("Please choose a valid product SKU and quantity.");
      return;
    }

    setProducts(prev => prev.map(p => {
      if (p.id !== movProdId) return p;
      return {
        ...p,
        variants: p.variants.map(v => {
          if (v.sku !== movSku) return v;
          let delta = movQty;
          if (movType === 'OUT') delta = -movQty;
          if (movType === 'ADJUST') {
            return { ...v, stock: movQty };
          }
          return { ...v, stock: Math.max(0, v.stock + delta) };
        })
      };
    }));

    const movement: StockMovement = {
      id: 'MO_QUICK_' + Math.random().toString(36).substr(2, 6).toUpperCase(),
      timestamp: new Date().toISOString(),
      productId: movProdId,
      variantSku: movSku,
      type: movType,
      qty: movQty,
      reason: movReason || 'Voucher correct adjustments',
      userId: 'Admin Cashier'
    };
    setMovements(prev => [movement, ...prev]);

    setMovQty(1);
    setMovReason('');
    alert("Voucher warehouse adjustment successful!");
  };

  // Group specs definition
  const handleNewGroupSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;

    const newCat: Category = {
      id: 'CAT-' + Math.random().toString(36).substr(2, 5).toUpperCase(),
      name: newCatName.trim(),
      attributes: newCatAttrs
    };

    categories.push(newCat);
    localStorage.setItem('es_categories', JSON.stringify(categories));

    // Audit logs
    setAuditLogs(prev => [
      {
        id: Math.random().toString(36).substr(2, 9),
        userId: 'Admin Cashier',
        action: 'POS_CAT_ADD',
        details: `Configured new attribute rule category ${newCatName}`,
        timestamp: new Date().toISOString()
      },
      ...prev
    ]);

    setNewCatName('');
    setNewCatAttrs([]);
    alert(`Category "${newCatName}" successfully loaded into Registry attributes!`);
  };

  // Reports console computations
  const reportMonthlySalesData = useMemo(() => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const buckets: Record<string, number> = {};
    sales.forEach(s => {
      const idx = new Date(s.timestamp).getMonth();
      buckets[months[idx]] = (buckets[months[idx]] || 0) + s.grandTotal;
    });
    return months.map(m => ({ name: m, Sales: buckets[m] || 0 }));
  }, [sales]);

  const reportCategoryChartData = useMemo(() => {
    const counts: Record<string, number> = {};
    products.forEach(p => {
      const catObj = categories.find(c => c.id === p.categoryId);
      const cat = catObj ? `${catObj.name} (${catObj.code})` : 'General';
      let value = 0;
      p.variants.forEach(v => {
        value += v.stock * v.costPrice;
      });
      counts[cat] = (counts[cat] || 0) + value;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [products, categories]);

  // Constrain list row sizes
  const targetRowCount = 12;
  const virtualRowsFillerCount = Math.max(0, targetRowCount - cart.length);

  return (
    <div className={`flex flex-col bg-[var(--app-bg)] text-[var(--text-primary)] overflow-hidden ${
      isFocusMode ? 'fixed inset-0 z-50 h-screen w-screen p-0 m-0' : 'h-[calc(100vh-120px)] border border-[var(--border-default)] rounded-xl'
    }`}>
      
      {/* 1. TOP BAR (Minimal Date/Time Only) */}
      <div className="bg-[var(--surface)] text-[var(--text-primary)] px-5 py-3 flex justify-between items-center select-none shadow-sm border-b border-[var(--border-subtle)] shrink-0">
        <div className="flex items-center gap-3">
          <Layers className="w-5 h-5 text-blue-600" />
          <span className="text-[14px] font-semibold tracking-wide uppercase">ElectraStock Pro Billings</span>
          <span className="text-[10px] bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded-md font-mono font-medium uppercase">Workstation Mode</span>
        </div>
        <div className="flex items-center gap-6 text-xs text-slate-500 font-mono font-medium">
          <span>Date: {currentTime.toLocaleDateString(undefined, { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}</span>
          <span className="border-l border-slate-200 pl-6 flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
            Live: {currentTime.toLocaleTimeString()}
          </span>
        </div>
      </div>

      {/* 2. MAIN WORKSPACE (Invoice Left 75%, Checkout Right 25%) */}
      <div className="flex-1 flex overflow-hidden relative">

        {/* Dynamic Success alerts */}
        {successBanner && (
          <div className="absolute top-3 left-4 right-4 bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm font-semibold p-3 rounded-lg flex items-center gap-2 animate-in slide-in-from-top-4 duration-300 z-50 shadow-sm">
            <Check className="w-5 h-5 text-emerald-600" />
            <span>{successBanner}</span>
            <button onClick={() => setSuccessBanner(null)} className="ml-auto text-emerald-600 hover:text-emerald-800 font-medium self-center">Dismiss</button>
          </div>
        )}

        {/* LEFT WORKSPACE (75% width) - Grid and Search */}
        <div className="w-[75%] border-r border-[var(--border-default)] flex flex-col bg-[var(--app-bg)]">
          
          {/* SEARCH PRODUCT (F2) BAR */}
          <div className="p-4 bg-[var(--surface)] border-b border-[var(--border-subtle)] shrink-0 relative">
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                id="search-pos"
                ref={searchInputRef}
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                onKeyDown={handleSearchFieldKeyDown}
                placeholder="Product Search (F2) — Scan barcode, Sku code, or search properties..."
                className="w-full bg-[var(--app-bg)] focus:bg-[var(--surface)] text-[var(--text-primary)] border border-[var(--border-default)] focus:border-blue-500 pl-11 pr-24 py-3 text-sm font-medium rounded-lg outline-none focus:ring-1 focus:ring-blue-500 transition-all caret-blue-500"
              />
              <div className="absolute right-3.5 top-1/2 -translate-y-1/2 flex items-center gap-1.5 select-none">
                <span className="bg-slate-100 text-slate-500 font-mono text-[10px] px-2 py-0.5 rounded-md font-medium border border-slate-200">F2</span>
                {search && (
                  <button onClick={() => setSearch('')} className="p-1 rounded-md text-slate-400 hover:text-slate-600 text-xs font-medium">Clear</button>
                )}
              </div>
            </div>

            {/* Suggestions drop panel */}
            {search && (
              <div className="absolute left-4 right-4 mt-2.5 bg-white border border-[#E2E8F0] rounded-xl shadow-2xl z-50 overflow-hidden divide-y divide-[#E2E8F0] max-h-72 overflow-y-auto">
                {searchResults.map((it, idx) => (
                  <div
                    key={it.variant.sku}
                    onClick={() => handleAddNewItemSku(it.product, it.variant.sku)}
                    className={`p-3 text-sm cursor-pointer flex flex-col gap-1 transition ${
                      idx === searchHighlightIndex 
                        ? 'bg-blue-50/70 border-l-4 border-[#2563EB] pl-2 font-bold' 
                        : 'hover:bg-[#F8FAFC]'
                    }`}
                  >
                    <div className="flex justify-between items-center text-[#0F172A] font-bold">
                      <span className="text-[13px]">{it.product.name}</span>
                      <span className="text-[#2563EB] font-mono text-[11px] bg-blue-50 border border-blue-200 px-3 py-0.5 rounded">{it.variant.sku}</span>
                    </div>
                    <div className="flex justify-between items-center text-slate-500 font-semibold text-[11px]">
                      <span>Category: {(() => {
                        const c = categories.find(cat => cat.id === it.product.categoryId);
                        return c ? `${c.name} (${c.code})` : 'General';
                      })()}</span>
                      <span>Stock: <strong className={it.variant.stock <= it.variant.lowStockThreshold ? 'text-rose-600' : 'text-emerald-600'}>{it.variant.stock} Left</strong> · Price: <strong>₹{it.variant.price.toLocaleString()}</strong></span>
                    </div>
                  </div>
                ))}
                {searchResults.length === 0 && (
                  <div className="p-4 text-center text-sm text-slate-500 font-medium italic">No corresponding product variants catalog codes found in index</div>
                )}
              </div>
            )}
          </div>

          {/* SPREADSHEET-STYLE INVOICE BILLING GRID */}
          <div ref={cartTableContainerRef} className="flex-1 overflow-auto custom-scrollbar bg-[var(--surface)] select-none">
            <table className="w-full text-left border-collapse min-w-[850px] table-fixed">
              <thead>
                <tr className="bg-slate-50 border-b border-[var(--border-default)] text-slate-500 text-xs font-semibold uppercase tracking-wider select-none sticky top-0 z-10 h-11">
                  <th className="px-4 text-center w-12 border-r border-[var(--border-subtle)]">#</th>
                  <th className="px-4 border-r border-[var(--border-subtle)] w-[40%]">Item Description</th>
                  <th className="px-4 border-r border-[var(--border-subtle)] w-[13%]">SKU / Code</th>
                  <th className="px-3 text-center border-r border-[var(--border-subtle)] w-[10%]">Qty</th>
                  <th className="px-3 text-right border-r border-[var(--border-subtle)] w-[12%]">Rate (₹)</th>
                  <th className="px-3 text-center border-r border-[var(--border-subtle)] w-[8%]">Disc %</th>
                  <th className="px-3 text-center border-r border-[var(--border-subtle)] w-[8%]">GST %</th>
                  <th className="px-4 text-right border-r border-[var(--border-subtle)] w-[15%]">Amount (₹)</th>
                  <th className="px-3 text-center w-10">Del</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-subtle)] text-sm">
                {cart.map((item, idx) => {
                    const subTotalCost = item.price * item.qty;
                    const totalAfterDisc = subTotalCost - (subTotalCost * (item.discount / 100));
                    const finalRowAmountStr = (totalAfterDisc * (1 + (item.gstRate / 100))).toFixed(2);

                    const isQtyEditing = isEditingCell && isEditingCell.row === idx && isEditingCell.col === 'qty';
                    const isPriceEditing = isEditingCell && isEditingCell.row === idx && isEditingCell.col === 'price';
                    const isDiscountEditing = isEditingCell && isEditingCell.row === idx && isEditingCell.col === 'discount';
                    const isGstRateEditing = isEditingCell && isEditingCell.row === idx && isEditingCell.col === 'gstRate';

                    return (
                      <tr
                        key={item.sku}
                        onClick={() => setSelectedProductSku(item.sku)}
                        className={`h-[58px] transition-colors border-b border-[var(--border-subtle)] ${
                          selectedProductSku === item.sku ? 'bg-blue-50/50 font-semibold border-l-4 border-l-blue-600' : 'hover:bg-slate-50'
                        }`}
                      >
                        {/* # Index column */}
                        <td className="px-4 text-center border-r border-[var(--border-subtle)] font-mono font-semibold text-slate-400">
                          {idx + 1}
                        </td>

                        {/* Description column */}
                        <td
                          id={`cell-desc-${idx}`}
                          tabIndex={0}
                          onFocus={() => {
                            setSelectedProductSku(item.sku);
                            scrollCellIntoView(document.getElementById(`cell-desc-${idx}`));
                            lastFocusedGridCol.current = 'desc';
                          }}
                          onKeyDown={e => handleDescKeyDown(e, idx)}
                          className="px-4 border-r border-[var(--border-subtle)] font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none focus:bg-blue-50/30 transition-all cursor-pointer"
                        >
                          <div className="flex flex-col py-1 justify-center leading-tight">
                            <span className="font-semibold text-slate-900 text-[13px] truncate">{item.name}</span>
                            <div className="flex items-center gap-2 mt-1 text-[10px] font-mono text-slate-500 font-medium select-none">
                              <span className="bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded-md border border-slate-200">
                                SKU: {item.sku}
                              </span>
                              <span className="bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded-md border border-blue-100 uppercase">
                                {(() => {
                                  const p = products.find(prod => prod.id === item.productId);
                                  const c = p ? categories.find(cat => cat.id === p.categoryId) : undefined;
                                  return c ? `${c.name} (${c.code})` : 'General';
                                })()}
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* SKU code */}
                        <td className="px-4 border-r border-[var(--border-subtle)] font-mono font-medium text-slate-600 text-[11px] truncate">
                          {item.sku}
                        </td>

                        {/* Qty field */}
                        <td className="px-1.5 border-r border-slate-100">
                          <input
                            id={`cell-qty-${idx}`}
                            type="number"
                            value={item.qty}
                            onChange={e => handleGridCellChange(idx, 'qty', Math.max(1, Number(e.target.value)))}
                            onKeyDown={e => handleCellKeyDown(e, idx, 'qty')}
                            onFocus={() => {
                              setSelectedProductSku(item.sku);
                              scrollCellIntoView(document.getElementById(`cell-qty-${idx}`));
                              lastFocusedGridCol.current = 'qty';
                            }}
                            className={`w-full rounded-md h-9 py-1 px-1.5 text-center font-mono text-[13px] outline-none transition-all ${
                              isQtyEditing
                                ? 'bg-amber-50 text-slate-900 font-semibold border-2 border-amber-500 ring-2 ring-amber-500/25'
                                : 'bg-[var(--app-bg)] border border-[var(--border-default)] hover:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:bg-white text-[var(--text-primary)] font-medium'
                            }`}
                          />
                        </td>

                        {/* Price field */}
                        <td className="px-1.5 border-r border-slate-100">
                          <input
                            id={`cell-price-${idx}`}
                            type="number"
                            value={item.price}
                            onChange={e => handleGridCellChange(idx, 'price', Math.max(0, Number(e.target.value)))}
                            onKeyDown={e => handleCellKeyDown(e, idx, 'price')}
                            onFocus={() => {
                              setSelectedProductSku(item.sku);
                              scrollCellIntoView(document.getElementById(`cell-price-${idx}`));
                              lastFocusedGridCol.current = 'price';
                            }}
                            className={`w-full rounded-md h-9 py-1 px-1.5 text-right font-mono text-[13px] outline-none transition-all ${
                              isPriceEditing
                                ? 'bg-amber-50 text-slate-900 font-semibold border-2 border-amber-500 ring-2 ring-amber-500/25'
                                : 'bg-[var(--app-bg)] border border-[var(--border-default)] hover:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:bg-white text-[var(--text-primary)] font-medium'
                            }`}
                          />
                        </td>

                        {/* Discount % field */}
                        <td className="px-1.5 border-r border-slate-100">
                          <input
                            id={`cell-discount-${idx}`}
                            type="number"
                            value={item.discount}
                            onChange={e => handleGridCellChange(idx, 'discount', Math.min(100, Math.max(0, Number(e.target.value))))}
                            onKeyDown={e => handleCellKeyDown(e, idx, 'discount')}
                            onFocus={() => {
                              setSelectedProductSku(item.sku);
                              scrollCellIntoView(document.getElementById(`cell-discount-${idx}`));
                              lastFocusedGridCol.current = 'discount';
                            }}
                            className={`w-full rounded-md h-9 py-1 px-1.5 text-center font-mono text-[13px] outline-none transition-all ${
                              isDiscountEditing
                                ? 'bg-amber-50 text-rose-700 font-semibold border-2 border-amber-500 ring-2 ring-amber-500/25'
                                : 'bg-[var(--app-bg)] border border-[var(--border-default)] hover:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:bg-white text-rose-600 font-medium'
                            }`}
                          />
                        </td>

                        {/* GST % field */}
                        <td className="px-1.5 border-r border-slate-100">
                          <input
                            id={`cell-gstRate-${idx}`}
                            type="number"
                            value={item.gstRate}
                            onChange={e => handleGridCellChange(idx, 'gstRate', Math.max(0, Number(e.target.value)))}
                            onKeyDown={e => handleCellKeyDown(e, idx, 'gstRate')}
                            onFocus={() => {
                              setSelectedProductSku(item.sku);
                              scrollCellIntoView(document.getElementById(`cell-gstRate-${idx}`));
                              lastFocusedGridCol.current = 'gstRate';
                            }}
                            className={`w-full rounded-md h-9 py-1 px-1.5 text-center font-mono text-[13px] outline-none transition-all ${
                              isGstRateEditing
                                ? 'bg-amber-50 text-slate-900 font-semibold border-2 border-amber-500 ring-2 ring-amber-500/25'
                                : 'bg-[var(--app-bg)] border border-[var(--border-default)] hover:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:bg-white text-[var(--text-primary)] font-medium'
                            }`}
                          />
                        </td>

                        {/* Absolute Amount totals column */}
                        <td className="px-4 border-r border-[var(--border-subtle)] text-right font-mono font-semibold text-slate-900 text-[12px]">
                          ₹{Number(finalRowAmountStr).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>

                        {/* Delete actions row */}
                        <td className="px-3 text-center border-l-0">
                          <button
                            id={`cell-del-${idx}`}
                            tabIndex={0}
                            onClick={() => {
                              const updated = cart.filter((_, i) => i !== idx);
                              setCart(updated);
                              if (updated.length > 0) {
                                const nextIdx = Math.min(idx, updated.length - 1);
                                setSelectedProductSku(updated[nextIdx].sku);
                                setTimeout(() => {
                                  document.getElementById(`cell-qty-${nextIdx}`)?.focus();
                                }, 50);
                              } else {
                                setSelectedProductSku('');
                                searchInputRef.current?.focus();
                              }
                            }}
                            onFocus={() => {
                              setSelectedProductSku(item.sku);
                              scrollCellIntoView(document.getElementById(`cell-del-${idx}`));
                              lastFocusedGridCol.current = 'del';
                            }}
                            onKeyDown={e => handleDeleteCellKeyDown(e, idx)}
                            className="p-1 rounded-md text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition cursor-pointer focus:ring-2 focus:ring-blue-500 focus:outline-none w-8 h-8 flex items-center justify-center mx-auto"
                          >
                            <X className="w-5 h-5 mx-auto" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}

                {/* Voucher lines fillers spacing bounds */}
                {Array.from({ length: virtualRowsFillerCount }).map((_, idx) => {
                  const listIndex = cart.length + idx;
                  return (
                    <tr key={`filler-${listIndex}`} className="h-[58px] bg-white border-b border-slate-100 text-slate-200 text-sm tracking-wide select-none">
                      <td className="px-4 text-center border-r border-slate-100 text-slate-200 font-mono font-semibold">{listIndex + 1}</td>
                      <td className="px-4 border-r border-slate-100"></td>
                      <td className="px-4 border-r border-slate-100"></td>
                      <td className="px-1.5 border-r border-slate-100"></td>
                      <td className="px-1.5 border-r border-slate-100"></td>
                      <td className="px-1.5 border-r border-slate-100"></td>
                      <td className="px-1.5 border-r border-slate-100"></td>
                      <td className="px-4 border-r border-slate-100"></td>
                      <td className="px-3"></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* RIGHT SIDE CHECKOUT PANEL (25% width) - Compact, Always Visible */}
        <div className="w-[25%] bg-[var(--surface)] flex flex-col p-4 border-l border-[var(--border-default)] shadow-sm uppercase shrink-0 overflow-y-auto custom-scrollbar h-full space-y-5">
          
          {/* 1. FINANCIAL CALCULATIONS (Totals) */}
          <div className="space-y-2.5 text-sm text-[var(--text-primary)] select-none font-semibold sticky top-0 bg-[var(--surface)] z-10 pb-2 border-b border-[var(--border-subtle)]">
            <div className="flex justify-between items-center">
              <span className="text-slate-400 font-bold">Voucher Subtotal:</span>
              <span className="font-mono font-extrabold text-slate-800 text-[13px]">₹{invoiceCalculatedValues.subTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-400 font-bold">Total GST Tax (SGST+CGST):</span>
              <span className="font-mono font-extrabold text-slate-800 text-[13px]">₹{invoiceCalculatedValues.gstValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>

            {/* Discount custom modifier */}
            <div className="flex justify-between items-center">
              <span className="text-rose-600 font-bold">Flat Discount %:</span>
              <div className="flex items-center gap-1.5 animate-outline">
                <input
                  id="flat-discount-input"
                  type="number"
                  value={discountPercent}
                  onChange={e => setDiscountPercent(Math.min(100, Math.max(0, Number(e.target.value))))}
                  onKeyDown={handleFlatDiscountKeyDown}
                  className="w-12 bg-[var(--app-bg)] border border-[var(--border-default)] text-[var(--text-primary)] rounded py-1 text-center font-mono font-bold outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:bg-white text-sm caret-black transition-all"
                />
                <span className="font-mono font-semibold text-rose-600">-₹{itemCalculationsDiscountAmount()}</span>
              </div>
            </div>
          </div>

          {/* 2. TOTAL PAYABLE BACKGROUND CARD */}
          <div className="space-y-1 select-none">
            <span className="text-[10px] font-semibold tracking-widest text-slate-500 block uppercase">Net Payable Voucher Gross</span>
            <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4 text-center">
              <div className="text-3xl font-bold text-emerald-700 font-mono tracking-tight leading-none select-all">
                ₹{invoiceCalculatedValues.payableTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </div>
          </div>

          {/* 3. SETTLEMENT GATEWAY (Payment Mode Toggles) */}
          <div className="space-y-1.5 select-none font-sans">
            <span className="text-[10px] font-semibold tracking-wider text-slate-500 block uppercase">Default Settlement Gateway</span>
            <div className="grid grid-cols-3 gap-1 shadow-sm rounded-lg overflow-hidden border border-[var(--border-default)] p-0.5 bg-[var(--app-bg)]">
              {(['CASH', 'UPI', 'CARD'] as const).map(mode => (
                <button
                  id={`payment-mode-${mode}`}
                  key={mode}
                  type="button"
                  onClick={() => setPaymentMode(mode)}
                  onKeyDown={e => handlePaymentModeKeyDown(e, mode)}
                  className={`py-2 text-[11px] font-semibold transition-all font-sans cursor-pointer focus:ring-2 focus:ring-blue-500 focus:outline-none focus:z-10 rounded-md ${
                    paymentMode === mode 
                      ? 'bg-white text-slate-900 shadow-sm border border-slate-200' 
                      : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50 border border-transparent'
                  }`}
                >
                  {mode}
                </button>
              ))}
            </div>
          </div>

          {/* 4. CUSTOMER MANAGER SECTION */}
          <div className="border border-[var(--border-default)] rounded-xl bg-[var(--app-bg)] p-3 space-y-3 no-print">
            <div className="flex justify-between items-center border-b border-[var(--border-subtle)] pb-2 select-none">
              <span className="text-[11px] font-semibold tracking-wide text-slate-500 flex items-center gap-1.5">
                <Users className="w-4 h-4 text-blue-600" />
                Customer Account
              </span>
              {isEditingCustomer && (
                <button
                  id="btn-cancel-customer"
                  onClick={() => {
                    setIsEditingCustomer(false);
                    setTimeout(() => document.getElementById('btn-change-customer')?.focus(), 50);
                  }}
                  className="text-[11px] text-blue-600 hover:underline font-medium bg-transparent border-none cursor-pointer focus:ring-2 focus:ring-blue-500 focus:outline-none"
                >
                  [Cancel]
                </button>
              )}
            </div>

            {!isEditingCustomer ? (
              // VIEW MODE
              <div className="space-y-3">
                {/* Active Customer details */}
                <div className="bg-[var(--surface)] border border-[var(--border-default)] rounded-lg p-3 flex items-center justify-between select-none shadow-sm">
                  <div className="flex flex-col min-w-0 pr-1">
                    <span className="text-[9px] font-semibold text-slate-400 tracking-wider uppercase">Active Client</span>
                    <strong className="text-[var(--text-primary)] font-bold text-[13px] truncate max-w-[150px] uppercase">{customerName}</strong>
                    {customerPhone && (
                      <span className="text-[11px] font-mono text-slate-500 font-medium mt-0.5">{customerPhone}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => setShowCustomerHistoryModal(true)}
                      className="px-3 py-1.5 bg-slate-100 border border-slate-200 hover:bg-slate-200 text-slate-700 font-semibold text-[11px] rounded-md transition shadow-sm cursor-pointer select-none outline-none"
                    >
                      History
                    </button>
                    <button
                      id="btn-change-customer"
                      type="button"
                      onClick={() => {
                        setIsEditingCustomer(true);
                        setTimeout(() => document.getElementById('customer-name-input')?.focus(), 50);
                      }}
                      onKeyDown={handleChangeCustomerKeyDown}
                      className="px-3 py-1.5 bg-blue-600 text-white hover:bg-blue-700 font-semibold text-[11px] rounded-md shadow-sm cursor-pointer transition select-none outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1"
                    >
                      Change
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              // EDIT MODE Form (Highly Compacted!)
              <div className="space-y-3 text-sm">
                <div className="space-y-2 bg-[var(--surface)] border border-[var(--border-default)] rounded-lg p-3 shadow-sm">
                  <div className="space-y-1">
                    <label className="text-[10px] font-semibold text-slate-500 block uppercase">Client Name</label>
                    <input
                      id="customer-name-input"
                      type="text"
                      value={customerName}
                      onChange={e => setCustomerName(e.target.value)}
                      onKeyDown={e => handleCustomerInputsKeyDown(e, 'name')}
                      placeholder="e.g. Walk-in Customer"
                      className="w-full bg-[var(--app-bg)] border border-[var(--border-default)] focus:ring-2 focus:ring-blue-500 focus:bg-[var(--surface)] text-[var(--text-primary)] rounded-md px-3 py-1.5 text-sm outline-none transition-all font-semibold"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-semibold text-slate-500 block uppercase">Mobile Number</label>
                    <input
                      id="customer-phone-input"
                      type="text"
                      value={customerPhone}
                      onChange={e => setCustomerPhone(e.target.value)}
                      onKeyDown={e => handleCustomerInputsKeyDown(e, 'phone')}
                      placeholder="e.g. 9876543210"
                      className="w-full bg-[var(--app-bg)] border border-[var(--border-default)] focus:ring-2 focus:ring-blue-500 focus:bg-[var(--surface)] text-[var(--text-primary)] rounded-md px-3 py-1.5 text-sm outline-none transition-all font-mono font-semibold"
                    />
                  </div>
                </div>

                <div className="flex gap-2 pt-1">
                  <button
                    id="btn-confirm-customer"
                    type="button"
                    onClick={() => setIsEditingCustomer(false)}
                    onKeyDown={e => handleCustomerInputsKeyDown(e, 'confirm')}
                    className="flex-1 h-9 bg-blue-600 hover:bg-blue-700 text-white font-bold text-[11px] rounded-md transition-all duration-150 cursor-pointer flex items-center justify-center uppercase shadow-sm outline-none"
                  >
                    Confirm
                  </button>
                  <button
                    id="btn-cancel-customer-form"
                    type="button"
                    onClick={() => {
                      setIsEditingCustomer(false);
                      setTimeout(() => {
                        document.getElementById('btn-change-customer')?.focus();
                      }, 50);
                    }}
                    onKeyDown={e => handleCustomerInputsKeyDown(e, 'cancel')}
                    className="px-4 h-9 border border-[var(--border-default)] text-slate-600 hover:bg-slate-50 font-bold text-[11px] rounded-md transition-all duration-150 cursor-pointer flex items-center justify-center uppercase outline-none"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* 5. COMPLETE BILL BUTTON (Always final workflow terminal action!) */}
          <div className="pt-3 border-t border-[var(--border-subtle)] mt-auto">
            <button
              id="btn-complete-bill"
              onClick={handleCommitInvoiceBill}
              onKeyDown={handleCompleteBillKeyDown}
              className="w-full bg-emerald-600 hover:bg-emerald-700 focus:ring-4 focus:ring-emerald-500/30 text-white font-bold text-[14px] py-4 px-4 rounded-xl shadow-md cursor-pointer transition-all active:scale-95 flex items-center justify-center gap-2 border-none uppercase outline-none"
            >
              <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
              <span>Complete Bill (F10)</span>
            </button>
            <p className="text-[11px] text-slate-500 py-2 font-medium text-center select-none tracking-wide normal-case">
              Supports F10 trigger standard sequence
            </p>
          </div>
        </div>

      {/* 3. TALLY-STYLE RIGHT ACTION BAR (Collapse/Expanded widths) */}
      <div className={`shrink-0 bg-[var(--surface)] border-l border-[var(--border-default)] flex flex-col h-full text-[11px] font-mono select-none no-print transition-all duration-300 overflow-hidden divide-y divide-[var(--border-subtle)] ${
        isShortcutExpanded ? 'w-[200px]' : 'w-[48px]'
      }`}>
          
          {/* Header Toggle Expanded bar */}
          <div 
            onClick={() => setIsShortcutExpanded(!isShortcutExpanded)}
            className="py-3 px-1 bg-[var(--app-bg)] border-b border-[var(--border-default)] text-slate-600 hover:bg-slate-50 transition cursor-pointer flex items-center justify-center gap-2 shrink-0 font-semibold"
          >
            <Keyboard className="w-5 h-5 text-blue-600" />
            {isShortcutExpanded && <span className="uppercase font-sans font-bold tracking-wider text-[10px] text-slate-700">Action Keys</span>}
          </div>

          {/* Action button triggers */}
          {[
            { key: 'F2', label: 'Product Search', act: () => { setSearch(''); searchInputRef.current?.focus(); }, hoverColor: 'hover:bg-slate-50' },
            { key: 'F4', label: 'Stock Lookup', act: () => togglePanel('INVENTORY'), hoverColor: 'hover:bg-slate-50' },
            { key: 'F5', label: 'Movement Voucher', act: () => togglePanel('MOVEMENT'), hoverColor: 'hover:bg-slate-50' },
            { key: 'F6', label: 'Categories Specs', act: () => togglePanel('CATEGORIES'), hoverColor: 'hover:bg-slate-50' },
            { key: 'F7', label: 'Reports Console', act: () => togglePanel('REPORTS'), hoverColor: 'hover:bg-slate-50' },
            { key: 'F8', label: 'Profit Statement', act: () => togglePanel('PROFIT'), hoverColor: 'hover:bg-slate-50' },
            { key: 'F9', label: 'Client Ledgers', act: () => togglePanel('LEDGER'), hoverColor: 'hover:bg-slate-50' },
            { key: 'F10', label: 'Checkout Voucher', act: handleCommitInvoiceBill, hoverColor: 'hover:bg-emerald-50 text-emerald-700' },
            { key: 'F11', label: 'Recent History', act: () => { setIsRecentCustomersHistoryExpanded(true); setTimeout(() => document.getElementById('recent-cust-0')?.focus(), 50); }, hoverColor: 'hover:bg-slate-50' },
            { key: 'F12', label: 'GST Settings', act: () => togglePanel('SETTINGS'), hoverColor: 'hover:bg-slate-50' },
          ].map(shortcut => {
            const isPanelActive = activeSubPanel === shortcut.label.split(' ')[0].toUpperCase() || (shortcut.key === 'F2' && search);
            return (
              <button
                key={shortcut.key}
                type="button"
                onClick={shortcut.act}
                className={`w-full text-left py-3.5 px-3 transition-colors text-slate-700 flex items-center gap-2.5 border-0 outline-none cursor-pointer font-medium ${
                  isPanelActive ? 'bg-blue-50 text-blue-700' : 'bg-transparent hover:bg-slate-50'
                }`}
              >
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md border shadow-sm w-7 text-center shrink-0 ${
                  isPanelActive ? 'bg-blue-100 border-blue-200 text-blue-800' : 'bg-white border-slate-200 text-slate-600'
                }`}>{shortcut.key}</span>
                {isShortcutExpanded && <span className="font-semibold truncate select-none text-[11px] whitespace-nowrap">{shortcut.label}</span>}
              </button>
            );
          })}
          
          <div className="flex-grow bg-[var(--surface)]" />
        </div>

      </div>

      {/* 4. SLIDING RIGHT DRAWER Overlays for active subpanels (40% page overlay width) */}
      {activeSubPanel !== 'NONE' && (
        <>
          {/* Drawer backdrop overlay */}
          <div 
            onClick={() => setActiveSubPanel('NONE')}
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[50]"
          />
          <div 
            ref={drawerRef}
            onClick={e => e.stopPropagation()}
            className="fixed right-0 top-0 bottom-0 h-full w-[42%] min-w-[380px] bg-[var(--app-bg)] border-l border-[var(--border-default)] shadow-2xl z-[60] flex flex-col animate-in slide-in-from-right-10 duration-200 overflow-hidden text-[var(--text-primary)]"
          >
          
          {/* Drawer Header details */}
          <div className="bg-[var(--surface)] text-[var(--text-primary)] px-5 py-4 flex justify-between items-center border-b border-[var(--border-default)] shrink-0 shadow-sm">
            <div className="flex items-center gap-3 font-mono">
              <span className="text-[11px] bg-blue-100 border border-blue-200 text-blue-800 font-bold px-2 py-0.5 rounded-md font-mono">
                {activeSubPanel === 'INVENTORY' ? 'F4' : 
                 activeSubPanel === 'MOVEMENT' ? 'F5' : 
                 activeSubPanel === 'CATEGORIES' ? 'F6' : 
                 activeSubPanel === 'REPORTS' ? 'F7' : 
                 activeSubPanel === 'PROFIT' ? 'F8' : 
                 activeSubPanel === 'LEDGER' ? 'F9' : 'F12'}
              </span>
              <h2 className="font-bold text-[13px] uppercase tracking-wider text-slate-700">
                {activeSubPanel === 'INVENTORY' && 'F4 : Product Information Drawer'}
                {activeSubPanel === 'MOVEMENT' && 'F5 : Warehouse Ledger Movements'}
                {activeSubPanel === 'CATEGORIES' && 'F6 : Categories Specifications Rules'}
                {activeSubPanel === 'REPORTS' && 'F7 : Billing multi Reports Console'}
                {activeSubPanel === 'PROFIT' && 'F8 : Profit & Loss worksheet records'}
                {activeSubPanel === 'LEDGER' && 'F9 : Client Ledger spend accounts'}
                {activeSubPanel === 'SETTINGS' && 'F12 : Configurations & Taxes defaults'}
              </h2>
            </div>
            <button 
              onClick={() => setActiveSubPanel('NONE')}
              className="text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-md cursor-pointer p-1.5 transition-colors border-none outline-none"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Drawer Scroll Container content */}
          <div className="flex-grow overflow-y-auto p-5 space-y-5 custom-scrollbar">

            {/* F4: Product Information lookup drawer */}
            {activeSubPanel === 'INVENTORY' && (
              <div className="space-y-4">
                <div className="bg-blue-50 border border-blue-200 p-4 rounded-xl text-slate-700 text-sm shadow-sm">
                  <p className="font-medium text-blue-900 leading-normal">Interactive Product Stock Sheet. Displays inherited category specification templates, cost vs selling details, and physical stock limits.</p>
                </div>

                <div className="space-y-3 mt-2">
                  {products.map(p => (
                    <div key={p.id} className="bg-[var(--surface)] border border-[var(--border-default)] p-4 rounded-xl text-sm space-y-3 shadow-sm hover:border-blue-300 transition">
                      
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-bold text-[var(--text-primary)] text-[15px]">{p.name}</h4>
                          <span className="text-[11px] font-semibold text-slate-400 uppercase">HSN Code: {p.hsnCode || 'General'}</span>
                        </div>
                        <span className="text-[10px] bg-slate-100 text-slate-600 border border-slate-200 font-semibold px-3 py-1 rounded-full uppercase">
                          {(() => {
                            const c = categories.find(cat => cat.id === p.categoryId);
                            return c ? `${c.name} (${c.code})` : 'General';
                          })()}
                        </span>
                      </div>

                      {/* Display variants specs details */}
                      <div className="divide-y divide-[var(--border-subtle)] font-mono text-[12px] bg-[var(--app-bg)] border border-[var(--border-default)] rounded-lg p-3">
                        {p.variants.map((v, vIdx) => (
                          <div key={v.sku} className={`py-2 flex flex-wrap justify-between items-center gap-1 ${vIdx === 0 ? 'pb-2 pt-0' : 'pt-2'}`}>
                            <div className="space-y-1 text-left">
                              <span className="text-blue-600 font-bold">{v.sku}</span>
                              {v.attrValues && Object.keys(v.attrValues).length > 0 && (
                                <span className="text-[10px] text-slate-500 font-medium block max-w-sm truncate text-left">
                                  Specs: {Object.entries(v.attrValues).map(([k, vl]) => `${k}:${vl}`).join(', ')}
                                </span>
                              )}
                            </div>
                            <div className="text-right flex items-center gap-6">
                              <div>
                                <span className="text-[10px] text-slate-400 block font-semibold font-sans">Selling rate</span>
                                <strong className="text-slate-800">₹{v.price.toLocaleString()}</strong>
                              </div>
                              <div className="text-right">
                                <span className="text-[10px] text-slate-400 block font-semibold font-sans">Base cost</span>
                                <strong className="text-slate-500">₹{v.costPrice.toLocaleString()}</strong>
                              </div>
                              <div className="text-right">
                                <span className="text-[10px] text-slate-400 block font-semibold font-sans">Physical stock</span>
                                <span className={`font-bold ${v.stock <= v.lowStockThreshold ? 'text-rose-600' : 'text-emerald-600'}`}>{v.stock} units</span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>

                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* F5: Stock ledger adjustments movements */}
            {activeSubPanel === 'MOVEMENT' && (
              <div className="space-y-4">
                <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl text-amber-900 text-sm font-medium shadow-sm">
                  <p className="leading-normal text-amber-800">Configure and submit physical stock inward adjustments logs. Recalibrates terminal base calculations instantly.</p>
                </div>

                <form onSubmit={handleQuickAdjustmentSubmit} className="bg-[var(--surface)] border border-[var(--border-default)] p-5 rounded-xl space-y-4 uppercase font-semibold text-sm text-[var(--text-primary)] shadow-sm">
                  <div className="space-y-1.5">
                    <span className="text-[10px] font-bold text-slate-500 block">Query target catalogs Item</span>
                    <select
                      value={movProdId}
                      onChange={e => {
                        setMovProdId(e.target.value);
                        const prod = products.find(p => p.id === e.target.value);
                        if (prod && prod.variants.length > 0) setMovSku(prod.variants[0].sku);
                      }}
                      className="w-full bg-[var(--app-bg)] border border-[var(--border-default)] focus:border-blue-500 focus:ring-1 focus:ring-blue-500 p-2.5 text-sm font-semibold rounded-lg outline-none cursor-pointer transition-all"
                      required
                    >
                      <option value="">-- Select Product --</option>
                      {products.map(p => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                  </div>

                  {movProdId && (
                    <div className="space-y-1.5 animate-in fade-in duration-200">
                      <span className="text-[10px] font-bold text-slate-500 block">Catalog Sku Identifier</span>
                      <select
                        value={movSku}
                        onChange={e => setMovSku(e.target.value)}
                        className="w-full bg-[var(--app-bg)] border border-[var(--border-default)] focus:border-blue-500 focus:ring-1 focus:ring-blue-500 p-2.5 text-sm font-semibold rounded-lg outline-none cursor-pointer transition-all"
                        required
                      >
                        {products.find(p => p.id === movProdId)?.variants.map(v => (
                          <option key={v.sku} value={v.sku}>{v.sku} (In hand: {v.stock} units)</option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <span className="text-[10px] font-bold text-slate-500 block">Operation type</span>
                      <select
                        value={movType}
                        onChange={e => setMovType(e.target.value as any)}
                        className="w-full bg-[var(--app-bg)] border border-[var(--border-default)] focus:border-blue-500 focus:ring-1 focus:ring-blue-500 p-2.5 text-sm font-semibold rounded-lg outline-none cursor-pointer transition-all"
                      >
                        <option value="IN">ADD (+STOCK IN)</option>
                        <option value="OUT">REDUCE (-STOCK OUT)</option>
                        <option value="ADJUST">AUDIT OVERWRITE</option>
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <span className="text-[10px] font-bold text-slate-500 block">Quantity Units Delta</span>
                      <input
                        type="number"
                        min="1"
                        value={movQty}
                        onChange={e => setMovQty(Math.max(1, Number(e.target.value)))}
                        className="w-full bg-[var(--app-bg)] border border-[var(--border-default)] focus:border-blue-500 focus:ring-1 focus:ring-blue-500 p-2.5 text-sm font-mono font-bold rounded-lg outline-none transition-all"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <span className="text-[10px] font-bold text-slate-500 block">Voucher adjustment reason</span>
                    <input
                      type="text"
                      placeholder="e.g. Inward electrical wire gauge checks, stock rectifications"
                      value={movReason}
                      onChange={e => setMovReason(e.target.value)}
                      className="w-full bg-[var(--app-bg)] border border-[var(--border-default)] focus:border-blue-500 focus:ring-1 focus:ring-blue-500 p-2.5 text-sm font-semibold rounded-lg outline-none transition-all"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold text-[13px] py-3 rounded-xl border-none cursor-pointer uppercase tracking-wider shadow-sm transition-colors mt-2 outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                  >
                    Submit inventory corrected Voucher
                  </button>
                </form>

                {/* Movements Logs table */}
                <div className="space-y-2 select-none pt-2">
                  <h4 className="text-[11px] font-bold text-slate-500 uppercase tracking-widest border-b border-[var(--border-subtle)] pb-2 flex items-center gap-1.5">
                    <FileText className="w-4 h-4 text-blue-600" />
                    Historic Terminal Adjustments
                  </h4>
                  <div className="divide-y divide-[var(--border-subtle)] max-h-60 overflow-y-auto custom-scrollbar font-mono text-[12px]">
                    {movements.slice(0, 15).map(m => (
                      <div key={m.id} className="py-3 flex justify-between items-center">
                        <div>
                          <strong className="text-slate-800">{m.variantSku}</strong>
                          <span className="text-slate-500 block text-[10px] mt-0.5 font-sans font-medium">{m.reason} · {new Date(m.timestamp).toLocaleTimeString()}</span>
                        </div>
                        <span className={`font-bold tracking-tight bg-white px-2 py-1 rounded-md border shadow-sm ${
                          m.type === 'IN' || m.type === 'ADJUST' ? 'text-emerald-700 border-emerald-200 bg-emerald-50' : 'text-rose-700 border-rose-200 bg-rose-50'
                        }`}>
                          {m.type === 'IN' ? '+' : m.type === 'OUT' ? '-' : '='}{m.qty} unit{m.qty !== 1 ? 's' : ''}
                        </span>
                      </div>
                    ))}
                    {movements.length === 0 && (
                      <p className="text-center text-slate-400 py-8 text-sm font-medium">No warehouse stock movements records indexed</p>
                    )}
                  </div>
                </div>

              </div>
            )}

            {/* F6: Category Group inheritance attributes rules */}
            {activeSubPanel === 'CATEGORIES' && (
              <div className="space-y-4">
                <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl text-slate-600 text-sm shadow-sm">
                  <p className="font-medium text-slate-700 leading-normal">Construct templates specifications rules. Active inventory products link directly to inherited template types rules.</p>
                </div>

                <form onSubmit={handleNewGroupSubmit} className="bg-[var(--surface)] border border-[var(--border-default)] p-5 rounded-xl space-y-4 uppercase font-semibold text-sm text-[var(--text-primary)] shadow-sm">
                  <div className="space-y-1.5">
                    <span className="text-[10px] font-bold text-slate-500 block">Grouping category Title</span>
                    <input
                      type="text"
                      placeholder="e.g. Modular switches, cables, transformers"
                      value={newCatName}
                      onChange={e => setNewCatName(e.target.value)}
                      className="w-full bg-[var(--app-bg)] border border-[var(--border-default)] focus:border-blue-500 focus:ring-1 focus:ring-blue-500 p-2.5 text-sm font-semibold rounded-lg outline-none transition-all"
                      required
                    />
                  </div>

                  {/* Attributes array row editor */}
                  <div className="space-y-3 pt-1">
                    <div className="flex justify-between items-center select-none border-b border-[var(--border-subtle)] pb-2">
                      <span className="text-[10px] font-bold text-slate-500 block">Required parameters Specifications</span>
                      <button
                        type="button"
                        onClick={() => setNewCatAttrs(prev => [...prev, { name: '', type: 'text', required: false }])}
                        className="text-blue-600 hover:text-blue-800 font-bold text-[11px] flex items-center gap-1 bg-transparent border-0 cursor-pointer outline-none transition-colors"
                      >
                        <Plus className="w-4 h-4" /> ADD FIELD
                      </button>
                    </div>

                    <div className="space-y-2.5">
                      {newCatAttrs.map((attr, index) => (
                        <div key={index} className="flex gap-2.5 items-center">
                          <input
                            type="text"
                            placeholder="Specification Key description"
                            value={attr.name}
                            onChange={e => {
                              const copy = [...newCatAttrs];
                              copy[index].name = e.target.value;
                              setNewCatAttrs(copy);
                            }}
                            className="flex-1 bg-[var(--app-bg)] border border-[var(--border-default)] focus:border-blue-500 p-2 text-sm rounded-lg outline-none transition-colors font-medium"
                            required
                          />
                          <select
                            value={attr.type}
                            onChange={e => {
                              const copy = [...newCatAttrs];
                              copy[index].type = e.target.value as any;
                              setNewCatAttrs(copy);
                            }}
                            className="bg-[var(--app-bg)] border border-[var(--border-default)] focus:border-blue-500 p-2 text-sm rounded-lg outline-none cursor-pointer font-semibold transition-colors"
                          >
                            <option value="text">TEXT</option>
                            <option value="number">NUMERIC</option>
                            <option value="boolean">YES / NO</option>
                            <option value="select">DROPDOWN</option>
                          </select>
                          <button
                            type="button"
                            onClick={() => setNewCatAttrs(prev => prev.filter((_, i) => i !== index))}
                            className="p-1.5 rounded-md text-rose-500 hover:bg-rose-50 border-0 bg-transparent cursor-pointer transition-colors"
                          >
                            <X className="w-5 h-5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold text-[13px] py-3 rounded-xl border-none cursor-pointer uppercase tracking-wider shadow-sm transition-colors mt-2 outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                  >
                    Commit Category Spec template
                  </button>
                </form>

                {/* Sub category listing details */}
                <div className="space-y-2 select-none pt-2">
                  <h4 className="text-[11px] font-bold text-slate-500 uppercase tracking-widest border-b border-[var(--border-subtle)] pb-2 flex items-center gap-1.5">
                    <FolderOpen className="w-4 h-4 text-sky-500" />
                    Indexed Specifications rules ({categories.length})
                  </h4>
                  <div className="grid grid-cols-1 gap-3 max-h-60 overflow-y-auto custom-scrollbar">
                    {categories.map(c => (
                      <div key={c.id} className="bg-[var(--surface)] border border-[var(--border-default)] p-4 rounded-xl text-sm space-y-2 shadow-sm">
                        <div className="font-bold text-[var(--text-primary)] text-[14px] flex justify-between">
                          <span>{c.name}</span>
                          <span className="text-[11px] font-mono text-slate-400 font-medium">{c.id}</span>
                        </div>
                        <div className="flex flex-wrap gap-1.5 mt-2 font-mono text-[10px]">
                          {c.attributes.map(a => (
                            <span key={a.name} className="bg-slate-100 border border-slate-200 text-slate-600 px-3 py-1 rounded-md font-semibold">
                              {a.name} ({a.type})
                            </span>
                          ))}
                          {c.attributes.length === 0 && <span className="text-slate-400 font-medium">No custom attribute rules loaded</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

              </div>
            )}

            {/* F7: Voucher Multi Reports Console */}
            {activeSubPanel === 'REPORTS' && (
              <div className="space-y-4">
                
                {/* Horizontal navigation tabs */}
                <div className="flex gap-1.5 overflow-x-auto pb-3 border-b border-[var(--border-subtle)] whitespace-nowrap scrollbar-none select-none shrink-0 font-bold uppercase text-[10px]">
                  {[
                    { id: 'TODAY_SALES', label: 'Vouchers Today' },
                    { id: 'MONTH_SALES', label: 'Month Trends' },
                    { id: 'VALUATION', label: 'Inventory Valuation' },
                    { id: 'LOW_STOCK', label: 'Reorder Alerts' },
                    { id: 'BEST_SELLING', label: 'Velocity High' },
                    { id: 'PROFIT_MARGINS', label: 'Margins Outlay' },
                    { id: 'CUSTOMER_TAX', label: 'Tax breakdowns' },
                  ].map(tab => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveReportTab(tab.id as any)}
                      className={`py-2 px-4 rounded-md border flex-shrink-0 transition-colors font-bold tracking-wide outline-none ${
                        activeReportTab === tab.id 
                          ? 'bg-blue-600 text-white border-blue-600 shadow-sm' 
                          : 'bg-[var(--surface)] text-slate-600 border-[var(--border-default)] hover:bg-slate-50'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                {/* Tabs contents detailed displays */}
                {activeReportTab === 'TODAY_SALES' && (
                  <div className="space-y-3 mt-2 text-sm">
                    <div className="flex justify-between items-center border-b border-[var(--border-subtle)] pb-2 font-bold uppercase tracking-wider select-none text-slate-500 text-[11px]">
                      <span>Voucher entries finished</span>
                      <strong className="text-emerald-600 font-mono text-[14px]">₹{tallyStats.todayRevenue.toLocaleString()}</strong>
                    </div>
                    <div className="divide-y divide-[var(--border-subtle)] text-[12px] font-mono max-h-96 overflow-y-auto custom-scrollbar">
                      {sales.filter(s => s.timestamp.startsWith(new Date().toISOString().split('T')[0])).map(sale => (
                        <div key={sale.id} className="py-3 flex justify-between items-center transition hover:bg-slate-50/50 rounded-lg px-2">
                          <div>
                            <span className="font-bold text-slate-800 block">{sale.id}</span>
                            <span className="text-[10px] text-slate-500 font-medium font-sans block mt-0.5">Time: {new Date(sale.timestamp).toLocaleTimeString()} · Mode: {sale.paymentMode}</span>
                          </div>
                          <div className="text-right">
                            <span className="font-bold text-slate-900 block">₹{sale.grandTotal.toLocaleString()}</span>
                            <span className="text-[10px] text-slate-500 font-medium font-sans block mt-0.5">{sale.customerName}</span>
                          </div>
                        </div>
                      ))}
                      {sales.filter(s => s.timestamp.startsWith(new Date().toISOString().split('T')[0])).length === 0 && (
                        <p className="text-center text-slate-400 py-12 text-sm font-medium">No checkout invoices completed today yet</p>
                      )}
                    </div>
                  </div>
                )}

                {activeReportTab === 'MONTH_SALES' && (
                  <div className="space-y-3 mt-2">
                    <h3 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Completed Invoices Month Timeline</h3>
                    <div className="h-56 bg-[var(--surface)] border border-[var(--border-default)] rounded-xl p-4 shadow-sm">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={reportMonthlySalesData}>
                          <XAxis dataKey="name" stroke="#64748B" fontSize={10} strokeWidth={1} tickLine={false} axisLine={false} />
                          <YAxis stroke="#64748B" fontSize={10} tickLine={false} axisLine={false} />
                          <Tooltip formatter={(val: any) => `₹${val.toLocaleString()}`} cursor={{stroke: '#e2e8f0'}} />
                          <Line type="monotone" dataKey="Sales" stroke="#2563EB" strokeWidth={3} activeDot={{ r: 6 }} dot={{r: 4}} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}

                {activeReportTab === 'VALUATION' && (
                  <div className="space-y-3 mt-2 font-semibold">
                    <div className="flex justify-between items-center border-b border-[var(--border-subtle)] pb-2 font-bold uppercase text-slate-500 text-[11px]">
                      <span>Group valuation capital</span>
                      <strong className="text-slate-800 font-mono text-[14px]">₹{tallyStats.inventoryValue.toLocaleString()}</strong>
                    </div>

                    <div className="h-56 bg-[var(--surface)] border border-[var(--border-default)] rounded-xl p-4 shadow-sm">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={reportCategoryChartData}>
                          <XAxis dataKey="name" stroke="#64748B" fontSize={10} tickLine={false} axisLine={false} />
                          <YAxis stroke="#64748B" fontSize={10} tickLine={false} axisLine={false} />
                          <Tooltip formatter={(v: any) => `₹${v.toLocaleString()}`} cursor={{fill: '#f8fafc'}} />
                          <Bar dataKey="value" fill="#2563EB" radius={[4, 4, 0, 0]}>
                            {reportCategoryChartData.map((e, index) => (
                              <Cell key={`cell-${index}`} fill={index % 2 === 0 ? '#3B82F6' : '#2563EB'} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>

                    <div className="divide-y divide-[var(--border-subtle)] text-[12px] font-mono pt-2">
                      {reportCategoryChartData.map(group => (
                        <div key={group.name} className="py-3 flex justify-between items-center">
                          <span className="text-slate-600 font-bold font-sans">{group.name} Specification Group</span>
                          <strong className="text-slate-800">₹{group.value.toLocaleString()}</strong>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {activeReportTab === 'LOW_STOCK' && (
                  <div className="space-y-3 mt-2 text-sm">
                    <h3 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-[var(--border-subtle)] pb-2">Safety reorder buffer alarm list</h3>
                    <div className="divide-y divide-[var(--border-subtle)] font-mono text-[12px]">
                      {products.flatMap(p => p.variants.map(v => ({ p, v })))
                        .filter(item => item.v.stock <= item.v.lowStockThreshold)
                        .map(item => (
                          <div key={item.v.sku} className="py-3 flex justify-between items-center">
                            <div>
                              <strong className="text-slate-800 text-[13px] font-sans block">{item.p.name}</strong>
                              <span className="text-[10px] text-blue-600 block font-bold mt-0.5">{item.v.sku}</span>
                            </div>
                            <span className="font-bold text-rose-600 bg-rose-50 px-2.5 py-1 rounded-md border border-rose-200">Stock: {item.v.stock} (Min: {item.v.lowStockThreshold})</span>
                          </div>
                      ))}
                      {products.flatMap(p => p.variants.map(v => ({ p, v }))).filter(item => item.v.stock <= item.v.lowStockThreshold).length === 0 && (
                        <p className="text-center text-slate-400 py-10 font-medium font-sans">No physical inventory under reorder threshold boundaries</p>
                      )}
                    </div>
                  </div>
                )}

                {activeReportTab === 'BEST_SELLING' && (
                  <div className="space-y-3 mt-2 text-sm">
                    <h3 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-[var(--border-subtle)] pb-2">Fast velocity products index</h3>
                    <div className="divide-y divide-[var(--border-subtle)] font-mono text-[12px]">
                      {fastMovingProducts.map((fp, i) => (
                        <div key={fp.sku} className="py-3 flex justify-between items-center">
                          <div className="flex items-center gap-2">
                            <span className="text-slate-400 font-bold bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">{i + 1}</span>
                            <div>
                              <strong className="text-slate-800 font-bold font-sans">{fp.name}</strong>
                              <span className="text-[10px] text-slate-500 block font-medium mt-0.5">{fp.sku}</span>
                            </div>
                          </div>
                          <div className="text-right">
                            <span className="font-bold text-slate-800 block text-[13px]">{fp.qty} Units</span>
                            <span className="text-[10px] text-slate-500 font-medium block">Collected ₹{fp.totalValue.toLocaleString()}</span>
                          </div>
                        </div>
                      ))}
                      {fastMovingProducts.length === 0 && (
                        <p className="text-center text-slate-400 py-10 font-medium font-sans">No checkout bills completed across index</p>
                      )}
                    </div>
                  </div>
                )}

                {activeReportTab === 'PROFIT_MARGINS' && (
                  <div className="space-y-3 mt-2 text-sm font-mono">
                    <h3 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider font-sans border-b border-[var(--border-subtle)] pb-2">Trading Gross margins outlines</h3>
                    
                    <div className="bg-[var(--surface)] border border-[var(--border-default)] p-4 rounded-xl space-y-3 shadow-sm text-[12px]">
                      <div className="flex justify-between items-center">
                        <span className="text-slate-500 font-sans font-medium">Gross Sales outlay Today:</span>
                        <strong className="text-slate-800">₹{tallyStats.todayRevenue.toLocaleString()}</strong>
                      </div>
                      <div className="flex justify-between items-center text-rose-600">
                        <span className="font-sans font-medium">Associated Cost outlay (COGS estimate):</span>
                        <strong>-₹{(tallyStats.todayRevenue - tallyStats.profitToday).toLocaleString()}</strong>
                      </div>
                      <div className="flex justify-between items-center pt-3 border-t border-[var(--border-subtle)] font-bold text-slate-900 text-[14px]">
                        <span className="font-sans">Profit Yield Net estimation:</span>
                        <span className="text-emerald-600">₹{tallyStats.profitToday.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                )}

                {activeReportTab === 'CUSTOMER_TAX' && (
                  <div className="space-y-3 mt-2 text-sm font-mono select-none">
                    <h3 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider font-sans border-b border-[var(--border-subtle)] pb-2">CGST & SGST taxes ratio breakdowns</h3>
                    <div className="bg-[var(--surface)] border border-[var(--border-default)] p-4 rounded-xl space-y-3 shadow-sm text-[12px]">
                      <div className="flex justify-between items-center">
                        <span className="text-slate-500 font-sans font-medium">Total combined taxes SGST (50%):</span>
                        <strong className="text-slate-800">₹{(sales.reduce((acc, s) => acc + s.totalGst, 0) / 2).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-slate-500 font-sans font-medium">Total combined taxes CGST (50%):</span>
                        <strong className="text-slate-800">₹{(sales.reduce((acc, s) => acc + s.totalGst, 0) / 2).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
                      </div>
                      <div className="flex justify-between items-center pt-3 border-t border-[var(--border-subtle)] font-bold text-slate-900 text-[14px]">
                        <span className="font-sans">Aggregate tax collections count:</span>
                        <strong className="text-blue-600">₹{sales.reduce((acc, s) => acc + s.totalGst, 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
                      </div>
                    </div>
                  </div>
                )}

              </div>
            )}

            {/* F8: Profit ratios stat layouts */}
            {activeSubPanel === 'PROFIT' && (
              <div className="space-y-4 font-mono text-sm select-none">
                <div className="bg-[var(--surface)] border border-[var(--border-default)] rounded-xl overflow-hidden divide-y divide-[var(--border-subtle)] shadow-sm">
                  <div className="p-3.5 bg-slate-800 text-white font-bold text-[11px] uppercase tracking-wider text-center select-none font-sans">Trading Income Ledger</div>
                  <div className="p-4 space-y-3 text-slate-700 text-[12px]">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500 font-sans font-medium">Physical stock Asset valuation:</span>
                      <strong className="text-slate-800">₹{tallyStats.inventoryValue.toLocaleString()}</strong>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500 font-sans font-medium">Invoices Cashout Collections:</span>
                      <strong className="text-slate-800">₹{tallyStats.todayRevenue.toLocaleString()}</strong>
                    </div>
                    <div className="flex justify-between items-center text-rose-600 bg-rose-50 p-2 rounded-lg border border-rose-100">
                      <span className="font-semibold font-sans">Voucher cost expense COGS:</span>
                      <strong className="font-bold">-₹{(tallyStats.todayRevenue - tallyStats.profitToday).toLocaleString()}</strong>
                    </div>
                  </div>
                  <div className="p-4 bg-slate-50 flex justify-between items-center text-[13px] font-bold text-slate-800 font-sans">
                    <span>Gross Profit margins today:</span>
                    <span className="text-emerald-600 text-lg font-black font-mono">₹{tallyStats.profitToday.toLocaleString()}</span>
                  </div>
                </div>

                <div className="bg-blue-50 border border-blue-200 p-4 rounded-xl text-blue-800 font-sans text-[11px] leading-normal font-medium shadow-sm">
                  Values displayed are mapped directly to variant configurations prices stored in the dynamic stock database master profiles.
                </div>
              </div>
            )}

            {/* F9: Recent Transactions & Client Ledger accounts */}
            {activeSubPanel === 'LEDGER' && (
              <div className="space-y-4 text-sm select-none">
                {/* Dual tabs selector */}
                <div className="flex border-b border-[var(--border-default)]">
                  <button
                    onClick={() => setRecentDrawerTab('BILLS')}
                    className={`flex-1 pb-3 text-[11px] uppercase font-bold text-center tracking-wider border-b-2 transition-colors outline-none ${
                      recentDrawerTab === 'BILLS'
                        ? 'border-blue-600 text-blue-600'
                        : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                    }`}
                  >
                    📝 Recent Bills ({Math.min(20, sales.length)})
                  </button>
                  <button
                    onClick={() => setRecentDrawerTab('LEDGER')}
                    className={`flex-1 pb-3 text-[11px] uppercase font-bold text-center tracking-wider border-b-2 transition-colors outline-none ${
                      recentDrawerTab === 'LEDGER'
                        ? 'border-blue-600 text-blue-600'
                        : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                    }`}
                  >
                    👥 Client Accounts
                  </button>
                </div>

                {recentDrawerTab === 'BILLS' && (
                  <div className="space-y-3 font-sans">
                    {/* Lockout minutes modifier configuration */}
                    <div className="bg-[var(--surface)] border border-[var(--border-default)] rounded-xl p-4 flex items-center justify-between shadow-sm">
                      <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Edit Lockout period:</span>
                      <div className="flex items-center gap-2 font-mono font-bold">
                        <input
                          type="number"
                          value={editLockoutMinutes}
                          onChange={e => setEditLockoutMinutes(Math.max(1, Number(e.target.value)))}
                          className="w-16 bg-[var(--app-bg)] border border-[var(--border-default)] rounded-md p-1.5 font-bold text-center text-sm text-slate-800 outline-none focus:ring-1 focus:ring-blue-500"
                        />
                        <span className="text-[11px] text-slate-500 font-sans font-medium">mins</span>
                      </div>
                    </div>

                    <div className="space-y-3 overflow-y-auto max-h-[60vh] pr-1 custom-scrollbar">
                      {sales.slice(0, 20).map(sale => {
                        const isEditable = checkIsEditable(sale);
                        const isCancelled = sale.status === 'RETURNED' || (sale as any).status === 'CANCELLED';

                        return (
                          <div 
                            key={sale.id} 
                            className={`border rounded-xl p-4 space-y-3 select-none shadow-sm transition-all ${
                              isCancelled 
                                ? 'bg-slate-50 border-[var(--border-subtle)] opacity-60' 
                                : 'bg-[var(--surface)] border-[var(--border-default)] hover:border-blue-300'
                            }`}
                          >
                            <div className="flex justify-between items-center border-b border-[var(--border-subtle)] pb-2">
                              <div className="flex items-center gap-2">
                                <span className="font-mono font-bold text-blue-600 text-[13px]">{sale.id}</span>
                                {isCancelled ? (
                                  <span className="bg-rose-50 text-rose-700 border border-rose-200 text-[9px] font-bold px-2 py-0.5 rounded-md leading-none uppercase tracking-wide">Cancelled</span>
                                ) : (
                                  <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-[9px] font-bold px-2 py-0.5 rounded-md leading-none uppercase tracking-wide">Paid</span>
                                )}
                              </div>
                              <span className="text-[11px] font-mono text-slate-500 font-medium">{new Date(sale.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                            </div>

                            <div className="text-[12px] text-slate-600 space-y-1.5 font-medium leading-tight font-sans">
                              <div className="flex justify-between items-center">
                                <span className="text-slate-500">Customer Name:</span>
                                <span className="text-slate-800 uppercase font-bold truncate max-w-[130px]">{sale.customerName}</span>
                              </div>
                              <div className="flex justify-between items-center">
                                <span className="text-slate-500">Items Count:</span>
                                <span className="text-slate-800 font-semibold">{sale.items.length} items ({sale.items.reduce((acc, it) => acc + it.qty, 0)} units)</span>
                              </div>
                              <div className="flex justify-between items-center border-t border-[var(--border-subtle)] pt-2 mt-1">
                                <span className="text-slate-500">Payable collected:</span>
                                <span className="text-slate-900 font-bold text-[14px] font-mono">₹{sale.grandTotal.toLocaleString()}</span>
                              </div>
                            </div>

                            {/* ERP Operator quick actions panel */}
                            <div className="grid grid-cols-5 gap-1.5 pt-2 border-t border-[var(--border-subtle)] mt-2 text-[10px] uppercase font-bold">
                              <button
                                onClick={() => {
                                  setSelectedPreviewInvoice(sale);
                                  setShowCompletionModal(true);
                                }}
                                className="col-span-1 bg-slate-100 hover:bg-slate-200 text-slate-700 py-1.5 rounded-md border-none cursor-pointer text-center outline-none transition-colors"
                                title="View Bill Detail Window"
                              >
                                View
                              </button>
                              <button
                                onClick={() => handlePrintInvoice(sale)}
                                className="col-span-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 py-1.5 rounded-md cursor-pointer text-center outline-none transition-colors"
                                title="Reprint Physical Copy"
                              >
                                Print
                              </button>
                              <button
                                onClick={() => {
                                  setCart([...sale.items]);
                                  setCustomerName(sale.customerName);
                                  setCustomerPhone(sale.customerPhone || '');
                                  setCustomerGst(sale.customerGst || '');
                                  setPaymentMode(sale.paymentMode);
                                  setActiveSubPanel('NONE');
                                  setSuccessBanner(`📎 Duplicated products list from historical billing ticket ${sale.id} into active workstation.`);
                                }}
                                className="col-span-1 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 py-1.5 rounded-md cursor-pointer text-center outline-none transition-colors"
                                title="Copy items to active cart list"
                              >
                                Copy
                              </button>
                              <button
                                onClick={() => handleLoadInvoiceForEditing(sale)}
                                disabled={!isEditable || isCancelled}
                                className={`col-span-1 py-1.5 rounded-md text-center outline-none transition-colors ${
                                  isEditable && !isCancelled
                                    ? 'bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 cursor-pointer'
                                    : 'bg-slate-50 border border-slate-200 text-slate-400 cursor-not-allowed opacity-50'
                                }`}
                                title={isEditable ? 'Edit and modify details' : 'Locked (Time-limit lock passed)'}
                              >
                                {isEditable ? 'Edit' : 'Lock'}
                              </button>
                              <button
                                onClick={() => {
                                  if (isCancelled) return;
                                  if (confirm(`Are you absolutely sure you want to cancel Invoice ${sale.id}? This will reverse the stock changes.`)) {
                                    setSales(prev => prev.map(s => s.id === sale.id ? { ...s, status: 'RETURNED' as any } : s));
                                    // Reverse stock
                                    setProducts(prevProducts => prevProducts.map(p => ({
                                      ...p,
                                      variants: p.variants.map(v => {
                                        const originalItem = sale.items.find(si => si.sku === v.sku);
                                        return originalItem ? { ...v, stock: v.stock + originalItem.qty } : v;
                                      })
                                    })));
                                    setSuccessBanner(`🚫 Invoice ${sale.id} cancelled successfully and stock was restored.`);
                                  }
                                }}
                                disabled={isCancelled}
                                className={`col-span-1 py-1.5 rounded-md text-center outline-none transition-colors ${
                                  !isCancelled
                                    ? 'bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 cursor-pointer'
                                    : 'bg-slate-50 border border-slate-200 text-slate-400 cursor-not-allowed opacity-50'
                                }`}
                                title="Cancel and reverse stocks"
                              >
                                Void
                              </button>
                            </div>
                          </div>
                        );
                      })}

                      {sales.length === 0 && (
                        <p className="text-center text-slate-400 py-10 font-sans font-medium">No completed workstation vouchers recorded.</p>
                      )}
                    </div>
                  </div>
                )}

                {recentDrawerTab === 'LEDGER' && (
                  <div className="space-y-4">
                    <p className="text-[11px] text-slate-500 border-b border-[var(--border-subtle)] pb-2 font-sans font-bold uppercase tracking-wide">Client spends ledgers volumes from workstations</p>
                    <div className="space-y-3 overflow-y-auto max-h-[65vh] pr-1 custom-scrollbar">
                      {Array.from(new Set(sales.map(s => s.customerName))).map(name => {
                        const clientSales = sales.filter(s => s.customerName === name);
                        const lastSale = clientSales[0];

                        return (
                          <div key={name} className="bg-[var(--surface)] border border-[var(--border-default)] rounded-xl p-4 space-y-3 text-sm shadow-sm transition-colors hover:border-blue-300">
                            <div className="flex justify-between font-bold text-slate-800 text-[14px]">
                              <span>{name}</span>
                              <span className="text-blue-600 font-mono">₹{clientSales.reduce((acc, s) => acc + s.grandTotal, 0).toLocaleString()}</span>
                            </div>
                            <div className="divide-y divide-[var(--border-subtle)] text-[12px] text-slate-600 font-medium pt-1 font-sans">
                              <div className="py-1.5 flex justify-between items-center">
                                <span className="text-slate-500">Vouchers count:</span>
                                <span className="text-slate-800 font-bold">{clientSales.length} invoices</span>
                              </div>
                              {lastSale && (
                                <div className="py-1.5 flex justify-between items-center">
                                  <span className="text-slate-500">Latest checkpoint:</span>
                                  <span className="text-slate-800 font-bold">{new Date(lastSale.timestamp).toLocaleDateString()}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                      {Array.from(new Set(sales.map(s => s.customerName))).length === 0 && (
                        <p className="text-center text-slate-400 py-10 font-sans font-medium">No customer ledger accounts matched.</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* F12: POS setup and tax defaults adjustments */}
            {activeSubPanel === 'SETTINGS' && (
              <div className="space-y-4 text-sm">
                <div className="bg-[var(--surface)] border border-[var(--border-default)] p-5 rounded-xl space-y-4 uppercase font-semibold text-slate-800 shadow-sm">
                  <span className="text-[11px] font-bold tracking-widest text-blue-600 block border-b border-[var(--border-subtle)] pb-2 flex items-center gap-1.5">
                    <Settings className="w-4 h-4" />
                    Configure tax defaults rules
                  </span>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <span className="text-[10px] font-bold text-slate-500 block">Default CGST rate %</span>
                      <input
                        type="number"
                        value={defaultCgstRate}
                        onChange={e => setDefaultCgstRate(Number(e.target.value))}
                        className="w-full bg-[var(--app-bg)] border border-[var(--border-default)] focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-lg p-2.5 font-bold font-mono text-slate-800 outline-none transition-all"
                      />
                    </div>
                    <div className="space-y-1.5 text-sm">
                      <span className="text-[10px] font-bold text-slate-500 block">Default SGST rate %</span>
                      <input
                        type="number"
                        value={defaultSgstRate}
                        onChange={e => setDefaultSgstRate(Number(e.target.value))}
                        className="w-full bg-[var(--app-bg)] border border-[var(--border-default)] focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-lg p-2.5 font-bold font-mono text-slate-800 outline-none transition-all"
                      />
                    </div>
                  </div>

                  <p className="text-[11px] text-slate-500 font-sans normal-case leading-normal font-medium mt-2">
                    * The rates configured above will be applied dynamically when adding products to the billing entries cart.
                  </p>
                </div>
              </div>
            )}

          </div>
        </div>
      </>
      )}

      {activeSubPanel === 'NONE' && (
        <>
      {/* 5. BOTTOM STATUS BAR */}
      <div className="bg-[var(--app-bg)] border-t border-[var(--border-default)] px-6 py-3 text-[12px] font-bold text-slate-700 flex flex-wrap justify-between items-center gap-4 select-none shrink-0 font-sans z-40">
        <div className="flex items-center gap-5">
          <span className="flex items-center gap-1.5">
            <span className="bg-slate-800 text-white text-[10px] px-2 py-0.5 rounded font-mono font-bold tracking-wide shadow-sm">F1-F12</span>
            <span className="text-slate-600">Shortcut workstation console active</span>
          </span>
          <span className="text-[var(--border-subtle)] font-normal">|</span>
          <span>Products in Bill: <strong className="text-slate-900 font-extrabold">{cart.length} unique</strong></span>
          <span className="text-[var(--border-subtle)] font-normal">|</span>
          <span>Total Quantity: <strong className="text-blue-600 font-black">{invoiceCalculatedValues.totalQuantityCount} units</strong></span>
        </div>
        <div className="flex items-center gap-4">
          <span>Customer: <strong className="text-slate-900">{customerName}</strong></span>
          <span className="text-[var(--border-subtle)] font-normal">|</span>
          <span>Receipt Mode: <strong className="text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-md px-3 py-1 tracking-wide">{paymentMode}</strong></span>
        </div>
      </div>

      {/* 5.1 COMPACT LAST COMPLETED BILL ACCESS PANEL */}
      {lastCompletedInvoice && (
        <div className={`bg-slate-900 border-t border-slate-950 px-5 transition-all duration-300 ease-in-out shrink-0 ${
          showQuickAccess ? 'h-11 py-1 flex' : 'h-0 overflow-hidden py-0'
        } items-center justify-between text-[11px] select-none text-slate-300 font-mono font-bold z-30`}>
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5 text-emerald-400 font-black">
              <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full"></span>
              <span>Last Completed: {lastCompletedInvoice.id}</span>
            </span>
            <span className="text-slate-700">|</span>
            <span>Total: <strong className="text-white">₹{lastCompletedInvoice.grandTotal.toLocaleString()}</strong></span>
            <span className="text-slate-700">|</span>
            <span>Time: <span>{new Date(lastCompletedInvoice.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span></span>
            <span className="text-slate-700">|</span>
            <span>Customer: <span className="text-slate-200">{lastCompletedInvoice.customerName}</span></span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setSelectedPreviewInvoice(lastCompletedInvoice);
                setShowCompletionModal(true);
              }}
              className="px-3.5 py-1 bg-slate-800 hover:bg-slate-750 text-slate-200 hover:text-white rounded border border-slate-700 text-[10px] cursor-pointer transition-all uppercase"
            >
              View Preview
            </button>
            <button
              onClick={() => handleLoadInvoiceForEditing(lastCompletedInvoice)}
              disabled={!checkIsEditable(lastCompletedInvoice)}
              className={`px-3.5 py-1 text-[10px] rounded border transition-all uppercase ${
                checkIsEditable(lastCompletedInvoice)
                  ? 'bg-amber-600/30 hover:bg-amber-600/50 border-amber-600 text-amber-350 cursor-pointer'
                  : 'bg-slate-800 border-slate-750 text-slate-500 cursor-not-allowed opacity-50'
              }`}
            >
              Edit Last
            </button>
            <button
              onClick={() => handlePrintInvoice(lastCompletedInvoice)}
              className="px-3.5 py-1 bg-[#16A34A] hover:bg-emerald-700 text-white rounded border border-emerald-500 text-[10px] cursor-pointer transition-all uppercase"
            >
              Print
            </button>
            <button
              onClick={() => setShowQuickAccess(false)}
              className="p-1 text-slate-500 hover:text-slate-300 cursor-pointer ml-1"
              title="Close Panel"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
      {!showQuickAccess && lastCompletedInvoice && (
        <div className="bg-slate-900 border-t border-slate-950 px-5 py-1.5 flex justify-between items-center text-[11px] shrink-0 font-sans font-bold text-slate-300 z-30">
          <span className="text-[10px] uppercase tracking-wider text-slate-500">Quick Access collapsed</span>
          <button
            onClick={() => setShowQuickAccess(true)}
            className="text-[10px] uppercase font-mono text-blue-400 hover:text-blue-300 flex items-center gap-1 cursor-pointer bg-slate-800 px-3.5 py-1 rounded border border-slate-700"
          >
            <span>Expand Last Invoice Details 🗐</span>
          </button>
        </div>
      )}

      {/* 5.2 RECENT CUSTOMERS COLLAPSIBLE FOOTER PANEL */}
      <div className="bg-[var(--surface)] border-t border-[var(--border-default)] no-print">
        <button
          type="button"
          onClick={() => setIsRecentCustomersHistoryExpanded(!isRecentCustomersHistoryExpanded)}
          className="w-full px-6 py-3 bg-[var(--surface)] hover:bg-slate-50 border-b border-[var(--border-default)] flex items-center justify-between select-none font-sans text-[13px] font-bold text-slate-700 transition-colors h-[48px] outline-none"
        >
          <div className="flex items-center gap-2.5">
            <span className="text-blue-600 text-[12px]">
              {isRecentCustomersHistoryExpanded ? '▼' : '►'}
            </span>
            <span className="uppercase tracking-wider">Recent Customers ({recentCustomers.length})</span>
            <span className="text-[10px] font-medium text-slate-400 capitalize font-mono">(Alt + H / F11 to focus)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono text-slate-500 shrink-0 font-medium">
              Active Customer: <strong className="text-slate-800 uppercase font-bold">{customerName}</strong>
            </span>
          </div>
        </button>

        {isRecentCustomersHistoryExpanded && (
          <div className="px-6 py-4 bg-[var(--app-bg)] border-b border-[var(--border-subtle)] h-[120px]">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {recentCustomers.slice(0, 6).map((cust, customIdx) => {
                const isSelected = customerName.toLowerCase() === cust.name.toLowerCase();
                return (
                  <button
                    id={`recent-cust-${customIdx}`}
                    key={cust.name}
                    type="button"
                    onClick={() => {
                      setCustomerName(cust.name);
                      setCustomerPhone(cust.phone);
                      setCustomerGst('');
                    }}
                    onKeyDown={(e) => handleRecentCustomerKeyDown(e, customIdx)}
                    className={`p-3 text-left border rounded-xl bg-[var(--surface)] shadow-sm hover:shadow transition-all outline-none cursor-pointer flex flex-col justify-between h-[80px] relative select-none ${
                      isSelected 
                        ? 'border-blue-600 ring-2 ring-blue-600/10 bg-blue-50/30' 
                        : 'border-[var(--border-default)] hover:border-slate-300 focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20'
                    }`}
                  >
                    <div className="min-w-0 w-full pr-1">
                      <div className="font-bold text-slate-800 text-[12px] truncate uppercase font-sans tracking-wide">
                        {cust.name}
                      </div>
                      {cust.phone ? (
                        <span className="text-[10px] font-mono text-slate-500 font-medium block mt-0.5">{cust.phone}</span>
                      ) : (
                        <span className="text-[10px] text-slate-400 font-medium italic block mt-0.5">No Contact</span>
                      )}
                    </div>
                    <div className="w-full mt-2 pt-1.5 border-t border-[var(--border-subtle)] flex items-center justify-between text-[10px] font-mono leading-none">
                      <span className="font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 border border-blue-100 rounded-md">
                        {cust.invoiceCount} Bills
                      </span>
                      <span className="text-slate-500 font-medium text-[9px]">
                        {cust.lastPurchaseDate}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
      </>
      )}

      {/* 5.2 INTUITIVE INVOICE COMPLETION PREVIEW MODAL */}
      {showCompletionModal && selectedPreviewInvoice && (
        <div ref={completionModalRef} className="fixed inset-0 bg-slate-950/50 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
          <div className="bg-[var(--surface)] border border-[var(--border-default)] text-[13px] text-slate-800 rounded-2xl w-full max-w-lg shadow-xl flex flex-col uppercase font-semibold overflow-hidden leading-relaxed scale-in animate-in fade-in duration-150">
            {/* Header branding band */}
            <div className="bg-slate-900 text-white p-5 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                <span className="text-[14px] font-bold tracking-wider uppercase font-mono">Invoice Completed Successfully</span>
              </div>
              <button 
                onClick={() => setShowCompletionModal(false)}
                className="p-1.5 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 flex flex-col gap-5">
              {/* Core numbers box */}
              <div className="bg-[var(--app-bg)] border border-[var(--border-default)] rounded-xl p-5 space-y-3 shadow-sm">
                <div className="flex justify-between items-center text-[14px] font-mono font-bold text-slate-900 border-b border-dashed border-[var(--border-subtle)] pb-2.5">
                  <span>Invoice Reference:</span>
                  <span className="text-blue-600">{selectedPreviewInvoice.id}</span>
                </div>
                
                <div className="grid grid-cols-2 gap-4 text-[12px] font-sans font-medium text-slate-600 pt-1">
                  <div>
                    <span className="block text-slate-500 text-[10px] uppercase tracking-wide font-bold">Customer Name</span>
                    <span className="text-slate-800 uppercase font-bold mt-1 block">{selectedPreviewInvoice.customerName}</span>
                  </div>
                  <div>
                    <span className="block text-slate-500 text-[10px] uppercase tracking-wide font-bold">Voucher Timestamp</span>
                    <span className="text-slate-800 font-mono font-medium mt-1 block">{new Date(selectedPreviewInvoice.timestamp).toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="block text-slate-500 text-[10px] uppercase tracking-wide font-bold">Payment Mode</span>
                    <span className="inline-block mt-1.5 px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-md font-mono text-[11px] font-bold select-none">
                      {selectedPreviewInvoice.paymentMode}
                    </span>
                  </div>
                  <div>
                    <span className="block text-slate-500 text-[10px] uppercase tracking-wide font-bold">Total Items Qty</span>
                    <span className="text-slate-800 font-bold mt-1 block">{selectedPreviewInvoice.items.length} items ({selectedPreviewInvoice.items.reduce((acc, it) => acc + it.qty, 0)} units)</span>
                  </div>
                </div>
              </div>

              {/* Financial calculations values */}
              <div className="space-y-2.5 text-[13px] border-y border-dashed border-[var(--border-subtle)] py-4 font-sans font-bold text-slate-600">
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 font-medium">Voucher Taxable Subtotal:</span>
                  <span className="font-mono text-slate-800">₹{selectedPreviewInvoice.subTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 font-medium">Taxes (CGST + SGST):</span>
                  <span className="font-mono text-slate-800">₹{selectedPreviewInvoice.totalGst.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
                {selectedPreviewInvoice.totalDiscount > 0 && (
                  <div className="flex justify-between items-center text-rose-600 bg-rose-50 px-2 py-1 -mx-2 rounded-md border border-rose-100">
                    <span className="font-medium">Voucher Applied Discount:</span>
                    <span className="font-mono">-₹{selectedPreviewInvoice.totalDiscount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                )}
                <div className="flex justify-between items-center border-t border-[var(--border-default)] pt-3 text-slate-900 font-bold text-[15px] mt-1">
                  <span>Grand Total (Payable):</span>
                  <span className="font-mono text-[22px] font-bold text-slate-900 border-b-4 border-double border-slate-900 pb-1">
                    ₹{selectedPreviewInvoice.grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              {/* Quick informational workflow indicator */}
              <div className="text-[11px] font-sans font-medium text-slate-500 bg-[var(--app-bg)] border border-[var(--border-default)] p-3 text-center rounded-xl select-none">
                Workstation Action Shortcuts: <kbd className="bg-[var(--surface)] border border-[var(--border-default)] rounded px-1.5 text-slate-700 font-mono text-[10px] shadow-sm mx-1 py-0.5">⏎ Enter</kbd> Print · <kbd className="bg-[var(--surface)] border border-[var(--border-default)] rounded px-1.5 text-slate-700 font-mono text-[10px] shadow-sm mx-1 py-0.5">Esc</kbd> Close · <kbd className="bg-[var(--surface)] border border-[var(--border-default)] rounded px-1.5 text-slate-700 font-mono text-[10px] shadow-sm mx-1 py-0.5">F10</kbd> New Workstation Bill
              </div>

              {/* Large premium action buttons array */}
              <div className="grid grid-cols-2 gap-3 pt-2 uppercase">
                <button
                  ref={printInvoiceBtnRef}
                  onClick={() => handlePrintInvoice(selectedPreviewInvoice)}
                  className="col-span-2 bg-blue-600 hover:bg-blue-700 text-white py-3 px-4 rounded-xl flex items-center justify-center gap-2 cursor-pointer font-bold border-none transition-colors text-[13px] shadow-sm shadow-blue-600/20 outline-none"
                >
                  🖨️ Print Invoice (Enter)
                </button>
                <button
                  onClick={() => {
                    handlePrintInvoice(selectedPreviewInvoice);
                    setSuccessBanner(`📥 Downloaded PDF file of ERP Invoice ${selectedPreviewInvoice.id} successfully.`);
                  }}
                  className="bg-[var(--surface)] hover:bg-slate-50 text-slate-700 py-3 px-4 rounded-xl flex items-center justify-center gap-2 cursor-pointer font-bold border border-[var(--border-default)] text-[12px] transition-colors outline-none shadow-sm"
                >
                  📥 Download PDF
                </button>
                <button
                  onClick={() => {
                    setSuccessBanner(`✉️ Email notification containing billing PDF sent to customer address.`);
                  }}
                  className="bg-[var(--surface)] hover:bg-slate-50 text-slate-700 py-3 px-4 rounded-xl flex items-center justify-center gap-2 cursor-pointer font-bold border border-[var(--border-default)] text-[12px] transition-colors outline-none shadow-sm"
                >
                  ✉️ Email Invoice
                </button>
                <button
                  onClick={() => handleLoadInvoiceForEditing(selectedPreviewInvoice)}
                  disabled={!checkIsEditable(selectedPreviewInvoice)}
                  className={`py-3 text-[12px] rounded-xl flex items-center justify-center gap-2 font-bold transition-colors col-span-2 shadow-sm outline-none ${
                    checkIsEditable(selectedPreviewInvoice)
                      ? 'bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-700 cursor-pointer'
                      : 'bg-[var(--app-bg)] border border-[var(--border-default)] text-slate-400 cursor-not-allowed opacity-60'
                  }`}
                >
                  ✏️ Corrective Edit Last Invoice (Within {editLockoutMinutes} Mins Window)
                </button>
                <button
                  onClick={handleStartNewBill}
                  className="col-span-2 bg-emerald-600 hover:bg-emerald-700 text-white py-3 px-4 rounded-xl flex items-center justify-center gap-2 cursor-pointer font-bold border-none transition-colors text-[12px] shadow-sm shadow-emerald-600/20 outline-none"
                >
                  🆕 Start Fresh Empty Bill (F10)
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 5.3 CUSTOMER PURCHASE HISTORY AND ANALYTICS MODAL */}
      {showCustomerHistoryModal && (
        <div className="fixed inset-0 bg-slate-950/50 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
          <div className="bg-[var(--surface)] border border-[var(--border-default)] text-[13px] text-slate-800 rounded-2xl w-full max-w-4xl shadow-xl flex flex-col uppercase font-semibold overflow-hidden leading-relaxed scale-in animate-in fade-in duration-150 max-h-[90vh]">
            {/* Header */}
            <div className="bg-slate-900 text-white p-5 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Layers className="w-5 h-5 text-blue-400" />
                <span className="text-[14px] font-bold tracking-wider uppercase font-mono">Ledger History: {customerName}</span>
              </div>
              <button 
                onClick={() => setShowCustomerHistoryModal(false)}
                className="p-1.5 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 flex flex-col gap-6 overflow-y-auto custom-scrollbar">
              {/* Analytics Dashboard Grid */}
              <div>
                <h3 className="text-[12px] font-mono font-bold text-slate-500 mb-3 tracking-wide">Client Statistical Profiles</h3>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  <div className="bg-[var(--surface)] border border-[var(--border-default)] rounded-xl p-4 select-none leading-none shadow-sm">
                    <span className="text-[10px] text-slate-500 font-sans block tracking-wide mb-1.5 font-bold">Total Bills</span>
                    <strong className="text-xl font-bold text-slate-900 font-mono block mt-1">{customerAnalytics.count}</strong>
                  </div>
                  <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 select-none leading-none shadow-sm">
                    <span className="text-[10px] text-blue-600 font-sans block tracking-wide mb-1.5 font-bold">Total Revenue</span>
                    <strong className="text-xl font-bold text-blue-700 font-mono block mt-1">₹{customerAnalytics.revenue.toLocaleString()}</strong>
                  </div>
                  <div className="bg-[var(--surface)] border border-[var(--border-default)] rounded-xl p-4 select-none leading-none shadow-sm">
                    <span className="text-[10px] text-slate-500 font-sans block tracking-wide mb-1.5 font-bold">Last Visit</span>
                    <strong className="text-[12px] font-bold text-slate-800 block mt-2 truncate text-normal font-sans">{customerAnalytics.lastVisit}</strong>
                  </div>
                  <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 select-none leading-none col-span-1 shadow-sm">
                    <span className="text-[10px] text-emerald-700 font-sans block tracking-wide mb-1.5 font-bold">Top Category</span>
                    <strong className="text-[11px] font-bold text-emerald-800 block mt-2.5 truncate font-sans">{customerAnalytics.mostPurchasedCategory}</strong>
                  </div>
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 select-none leading-none col-span-1 shadow-sm">
                    <span className="text-[10px] text-amber-700 font-sans block tracking-wide mb-1.5 font-bold">Top Product</span>
                    <strong className="text-[11px] font-bold text-amber-800 block mt-2.5 truncate font-sans" title={customerAnalytics.mostPurchasedProduct}>{customerAnalytics.mostPurchasedProduct}</strong>
                  </div>
                </div>
              </div>

              {/* Purchase History Grid */}
              <div className="flex-1 flex flex-col min-h-[250px]">
                <h3 className="text-[12px] font-mono font-bold text-slate-500 mb-3 tracking-wide">Purchase Bills History</h3>
                
                {customerSales.length === 0 ? (
                  <div className="flex-1 flex flex-col items-center justify-center border border-dashed border-[var(--border-default)] bg-[var(--app-bg)] rounded-2xl p-8 text-center text-slate-500 font-medium font-sans">
                    <span>No purchase records catalogued for this customer ledger profile yet.</span>
                  </div>
                ) : (
                  <div className="border border-[var(--border-default)] rounded-xl overflow-hidden overflow-y-auto max-h-[300px] shadow-sm">
                    <table className="w-full text-left border-collapse table-fixed bg-[var(--surface)]">
                      <thead>
                        <tr className="bg-slate-50 border-b border-[var(--border-default)] text-slate-600 text-[11px] font-bold uppercase font-mono h-11 sticky top-0 bg-opacity-95 backdrop-blur-xs">
                          <th className="px-5 border-r border-[var(--border-subtle)] w-28">Date</th>
                          <th className="px-5 border-r border-[var(--border-subtle)] w-32">Invoice No</th>
                          <th className="px-5 border-r border-[var(--border-subtle)]">Purchased Items</th>
                          <th className="px-5 border-r border-[var(--border-subtle)] w-36 text-right">Amount (₹)</th>
                          <th className="px-5 w-28 text-center">Receipt</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[var(--border-subtle)] text-[12px] font-medium font-sans text-slate-700">
                        {customerSales.map(sale => (
                          <tr 
                            key={sale.id}
                            onClick={() => {
                              setSelectedPreviewInvoice(sale);
                              setShowCompletionModal(true);
                            }}
                            className="hover:bg-blue-50/30 cursor-pointer h-12 transition-colors"
                          >
                            <td className="px-5 border-r border-[var(--border-subtle)] font-mono text-slate-500 font-medium">
                              {new Date(sale.timestamp).toLocaleDateString()}
                            </td>
                            <td className="px-5 border-r border-[var(--border-subtle)] font-mono font-bold text-blue-600">
                              {sale.id}
                            </td>
                            <td className="px-5 border-r border-[var(--border-subtle)] font-medium truncate text-[11px] text-slate-700 uppercase">
                              {sale.items.map(it => `${it.name} x${it.qty}`).join(', ')}
                            </td>
                            <td className="px-5 border-r border-[var(--border-subtle)] font-mono text-right font-bold text-slate-900 pr-5">
                              ₹{sale.grandTotal.toLocaleString(undefined, {minimumFractionDigits: 2})}
                            </td>
                            <td className="px-5 text-center">
                              <span className="inline-block px-3 py-1 bg-[var(--app-bg)] text-slate-700 font-mono font-bold text-[10px] rounded-md border border-[var(--border-default)] select-none">
                                {sale.paymentMode}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="bg-[var(--app-bg)] border-t border-[var(--border-default)] p-5 flex justify-end gap-3">
              <button
                onClick={() => setShowCustomerHistoryModal(false)}
                className="px-5 py-2.5 bg-slate-800 text-white hover:bg-slate-700 text-[12px] font-bold rounded-lg cursor-pointer transition-colors uppercase outline-none shadow-sm"
              >
                Close Ledger
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );

  // Helper values resolver for checkout panel
  function itemCalculationsDiscountAmount() {
    let baseSum = 0;
    cart.forEach(it => {
      const rowBase = it.price * it.qty;
      const rowDisc = rowBase * (it.discount / 100);
      baseSum += (rowBase - rowDisc);
    });
    const subVal = baseSum * (discountPercent / 100);
    return Math.round(subVal * 100) / 100;
  }
};
