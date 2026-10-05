import React, { useState, useMemo } from 'react';
import { DateFilter, PresetKey, getPresetDateBounds } from './DateFilter';
import { 
  Sale, 
  Product, 
  Category, 
  StockMovement, 
  AuditLog, 
  CartItem 
} from '../types';
import { 
  FileText, 
  Search, 
  ArrowUpDown, 
  SlidersHorizontal, 
  Printer, 
  Download, 
  Undo2, 
  Phone, 
  User, 
  Calendar, 
  TrendingUp, 
  ShoppingCart, 
  Coins, 
  CheckCircle2, 
  Clock, 
  Tags, 
  Percent, 
  X,
  Plus,
  BarChart,
  Trash2,
  ChevronRight
} from 'lucide-react';

interface SalesLedgerProps {
  sales: Sale[];
  products: Product[];
  categories: Category[];
  movements: StockMovement[];
  auditLogs: AuditLog[];
  setProducts: React.Dispatch<React.SetStateAction<Product[]>>;
  setSales: React.Dispatch<React.SetStateAction<Sale[]>>;
  setMovements: React.Dispatch<React.SetStateAction<StockMovement[]>>;
  setAuditLogs: React.Dispatch<React.SetStateAction<AuditLog[]>>;
  logActivity: (action: string, details: string) => void;
}

export const SalesLedger: React.FC<SalesLedgerProps> = ({
  sales,
  products,
  categories,
  movements,
  auditLogs,
  setProducts,
  setSales,
  setMovements,
  setAuditLogs,
  logActivity
}) => {
  // Navigation / Tab structure inside module: "SALES_REGISTER" or "CUSTOMER_LEDGER"
  const [ledgerSubTab, setLedgerSubTab] = useState<'REGISTER' | 'CUSTOMERS'>('REGISTER');

  // Search & Filter state for Sales Register
  const [registerSearch, setRegisterSearch] = useState('');
  const [payModeFilter, setPayModeFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [datePreset, setDatePreset] = useState<string>('ALL');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [sortField, setSortField] = useState<'timestamp' | 'grandTotal' | 'id'>('timestamp');
  const [sortOrder, setSortOrder] = useState<'ASC' | 'DESC'>('DESC');

  // Customer ledger states and date filter states
  const [customerSearch, setCustomerSearch] = useState('');
  const [selectedCustomerPhone, setSelectedCustomerPhone] = useState<string | null>(null);
  const [customerDatePreset, setCustomerDatePreset] = useState<string>('ALL');
  const [customerStartDate, setCustomerStartDate] = useState('');
  const [customerEndDate, setCustomerEndDate] = useState('');

  // Drill down detailed Invoice Viewer
  const [selectedInvoice, setSelectedInvoice] = useState<Sale | null>(null);

  // Return Processing fields
  const [showReturnPanel, setShowReturnPanel] = useState(false);
  const [selectedReturnItems, setSelectedReturnItems] = useState<Record<string, number>>({}); // sku -> qty to return
  const [returnNotes, setReturnNotes] = useState('');

  // ----------------------------------------------------
  // DATE FILTERING HELPER FOR SALES REGISTER
  // ----------------------------------------------------
  const activeDateRange = useMemo(() => {
    return getPresetDateBounds(datePreset as PresetKey, startDate, endDate);
  }, [datePreset, startDate, endDate]);

  // ----------------------------------------------------
  // DATE FILTERING HELPER FOR CUSTOMER METRICS
  // ----------------------------------------------------
  const customerActiveDateRange = useMemo(() => {
    return getPresetDateBounds(customerDatePreset as PresetKey, customerStartDate, customerEndDate);
  }, [customerDatePreset, customerStartDate, customerEndDate]);

  // Filter sales for customer metrics based on date range
  const customerFilteredSales = useMemo(() => {
    if (!customerActiveDateRange) return sales;
    return sales.filter(s => {
      const t = new Date(s.timestamp);
      return t >= customerActiveDateRange.start && t <= customerActiveDateRange.end;
    });
  }, [sales, customerActiveDateRange]);

  // Combined Filters for Chronological Invoices list
  const filteredSales = useMemo(() => {
    let result = [...sales];

    // Search query matches: Invoice ID, Customer Name, Phone, or GST
    if (registerSearch) {
      const q = registerSearch.toLowerCase();
      result = result.filter(s => 
        s.id.toLowerCase().includes(q) ||
        s.customerName.toLowerCase().includes(q) ||
        (s.customerPhone && s.customerPhone.toLowerCase().includes(q)) ||
        (s.customerGst && s.customerGst.toLowerCase().includes(q))
      );
    }

    // Payment Mode
    if (payModeFilter !== 'ALL') {
      result = result.filter(s => s.paymentMode === payModeFilter);
    }

    // Invoice status
    if (statusFilter !== 'ALL') {
      result = result.filter(s => {
        const currentStatus = s.status || 'PAID';
        return currentStatus === statusFilter;
      });
    }

    // Date constraints
    if (activeDateRange) {
      result = result.filter(s => {
        const t = new Date(s.timestamp);
        return t >= activeDateRange.start && t <= activeDateRange.end;
      });
    }

    // Sorting
    result.sort((a, b) => {
      let valA: any = a[sortField] || '';
      let valB: any = b[sortField] || '';

      if (sortField === 'timestamp') {
        valA = new Date(a.timestamp).getTime();
        valB = new Date(b.timestamp).getTime();
      }

      if (valA < valB) return sortOrder === 'ASC' ? -1 : 1;
      if (valA > valB) return sortOrder === 'ASC' ? 1 : -1;
      return 0;
    });

    return result;
  }, [sales, registerSearch, payModeFilter, statusFilter, activeDateRange, sortField, sortOrder]);

  const toggleSort = (field: 'timestamp' | 'grandTotal' | 'id') => {
    if (sortField === field) {
      setSortOrder(prev => prev === 'DESC' ? 'ASC' : 'DESC');
    } else {
      setSortField(field);
      setSortOrder('DESC');
    }
  };

  // Compile unique customers list with analytics LTV aggregates
  const customerProfiles = useMemo(() => {
    const profilesMap: Record<string, {
      id: string; // Phone or "walk-in" ID
      name: string;
      phone: string;
      gst: string;
      totalTransactions: number;
      totalSpend: number;
      averageOrderValue: number;
      lastPurchaseDate: string;
      itemsCount: number;
      topPurchasedCategoryName: string;
      topPurchasedSku: string;
      daysSinceLastVisit: number;
      salesTimeline: Sale[];
    }> = {};

    // Walk-in transactions aggregator matches uniquely unless custom client phone is entered
    customerFilteredSales.forEach(sale => {
      // Determine unique customer ledger identification
      // Use phone as the primary customer key. If none is present, group individual Walk-ins.
      const key = sale.customerPhone ? sale.customerPhone : 'Walk-in Customer';
      
      if (!profilesMap[key]) {
        profilesMap[key] = {
          id: sale.customerId,
          name: sale.customerName,
          phone: sale.customerPhone || '',
          gst: sale.customerGst || '',
          totalTransactions: 0,
          totalSpend: 0,
          averageOrderValue: 0,
          lastPurchaseDate: sale.timestamp,
          itemsCount: 0,
          topPurchasedCategoryName: 'N/A',
          topPurchasedSku: 'N/A',
          daysSinceLastVisit: 9999,
          salesTimeline: []
        };
      }

      const p = profilesMap[key];
      p.totalTransactions++;
      p.totalSpend += sale.grandTotal;
      p.salesTimeline.push(sale);
      
      // Track last purchase date
      if (new Date(sale.timestamp) > new Date(p.lastPurchaseDate)) {
        p.lastPurchaseDate = sale.timestamp;
      }

      // Sum quantities
      sale.items.forEach(it => {
        p.itemsCount += it.qty;
      });
    });

    // Finalize LTV computations and categorize timeline
    const finalProfiles = Object.values(profilesMap).map(p => {
      p.averageOrderValue = p.totalTransactions > 0 ? Math.round(p.totalSpend / p.totalTransactions) : 0;
      
      // Days since last visit
      const lastDate = new Date(p.lastPurchaseDate);
      const diffMs = new Date().getTime() - lastDate.getTime();
      p.daysSinceLastVisit = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      
      // Chronological sort timeline
      p.salesTimeline.sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

      // Attempt to identify top purchased categories or SKUs
      const skuCounts: Record<string, number> = {};
      p.salesTimeline.forEach(s => s.items.forEach(it => {
        skuCounts[it.sku] = (skuCounts[it.sku] || 0) + it.qty;
      }));
      let topSku = 'N/A';
      let maxQty = 0;
      Object.entries(skuCounts).forEach(([sku, qty]) => {
        if (qty > maxQty) {
          maxQty = qty;
          topSku = sku;
        }
      });
      p.topPurchasedSku = topSku;

      return p;
    });

    // Sort customer list by total spend descending
    finalProfiles.sort((a, b) => b.totalSpend - a.totalSpend);
    return finalProfiles;
  }, [customerFilteredSales]);

  // Filtered customer profiles for customer registry view
  const filteredCustomerProfiles = useMemo(() => {
    if (!customerSearch) return customerProfiles;
    const q = customerSearch.toLowerCase();
    return customerProfiles.filter(p => 
      p.name.toLowerCase().includes(q) ||
      p.phone.includes(q) ||
      p.gst.toLowerCase().includes(q)
    );
  }, [customerProfiles, customerSearch]);

  const activeCustomerDetails = useMemo(() => {
    if (!selectedCustomerPhone) return null;
    return customerProfiles.find(p => p.phone === selectedCustomerPhone || (selectedCustomerPhone === 'Walk-in Customer' && p.name === 'Walk-in Customer')) || null;
  }, [customerProfiles, selectedCustomerPhone]);

  // Group timeline categorized into: Today, Yesterday, This Week, This Month, Older
  const customerTimelineGroups = useMemo(() => {
    if (!activeCustomerDetails) return null;

    const todayStr = new Date().toISOString().split('T')[0];
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    const startOfWeek = new Date();
    startOfWeek.setDate(startOfWeek.getDate() - 7);
    const startOfMonth = new Date();
    startOfMonth.setMonth(startOfMonth.getMonth() - 1);

    const timeline = activeCustomerDetails.salesTimeline;

    const groups = {
      today: [] as Sale[],
      yesterday: [] as Sale[],
      thisWeek: [] as Sale[],
      thisMonth: [] as Sale[],
      lifetimeOlder: [] as Sale[]
    };

    timeline.forEach(s => {
      const sDateStr = s.timestamp.split('T')[0];
      const sDate = new Date(s.timestamp);

      if (sDateStr === todayStr) {
        groups.today.push(s);
      } else if (sDateStr === yesterdayStr) {
        groups.yesterday.push(s);
      } else if (sDate >= startOfWeek) {
        groups.thisWeek.push(s);
      } else if (sDate >= startOfMonth) {
        groups.thisMonth.push(s);
      } else {
        groups.lifetimeOlder.push(s);
      }
    });

    return groups;
  }, [activeCustomerDetails]);

  // ----------------------------------------------------
  // PROCESS RETURN & CREATE CREDIT NOTE LOGIC
  // ----------------------------------------------------
  const handleProcessRefundCreditNote = () => {
    if (!selectedInvoice) return;
    
    const skewKeys = Object.keys(selectedReturnItems);
    const returnLines = skewKeys.filter(sku => selectedReturnItems[sku] > 0);

    if (returnLines.length === 0) {
      alert("Please select at least one item and enter quantity to return!");
      return;
    }

    if (!window.confirm("Confirm Item Return? This will generate a Credit Note, update stock quantities, record IN stock move operations, and mark invoice audit trails.")) {
      return;
    }

    // Calculate refund details
    let refundValueTotal = 0;
    const returnedItemsPayload: { sku: string; qty: number; timestamp: string }[] = [];

    // 1. Process variants update (Increment stock)
    setProducts(prevProducts => prevProducts.map(p => {
      return {
        ...p,
        variants: p.variants.map(v => {
          const retQty = selectedReturnItems[v.sku] || 0;
          if (retQty > 0) {
            // Find rate
            const itemMatch = selectedInvoice.items.find(it => it.sku === v.sku);
            if (itemMatch) {
              const basePrice = itemMatch.price * retQty;
              const discPrice = basePrice * (1 - (itemMatch.discount / 100));
              const lineGst = discPrice * (itemMatch.gstRate / 100);
              refundValueTotal += (discPrice + lineGst);

              returnedItemsPayload.push({
                sku: v.sku,
                qty: retQty,
                timestamp: new Date().toISOString()
              });
            }
            return {
              ...v,
              stock: v.stock + retQty // Restore stock count!
            };
          }
          return v;
        })
      };
    }));

    // 2. Post stock movements for returned products
    returnLines.forEach(sku => {
      const retQty = selectedReturnItems[sku];
      const origItem = selectedInvoice.items.find(it => it.sku === sku);
      if (origItem) {
        const movRecord: StockMovement = {
          id: 'CN_MV_' + Math.random().toString(36).substr(2, 6).toUpperCase(),
          timestamp: new Date().toISOString(),
          productId: origItem.productId,
          variantSku: sku,
          type: 'IN', // Restocking inventory on return
          qty: retQty,
          reason: `Credit Return: Credit Note for Invoice ${selectedInvoice.id}`,
          userId: 'ERP Terminal'
        };
        setMovements(prev => [movRecord, ...prev]);
      }
    });

    // 3. Update invoice status & record return items tracking
    const updatedSales = sales.map(s => {
      if (s.id === selectedInvoice.id) {
        // Merge with existing returns if any
        const currentReturned = s.returnedItems || [];
        const newReturned = [...currentReturned, ...returnedItemsPayload];
        
        // Determine if fully or partially returned
        const totalItemsOrdered = s.items.reduce((acc, it) => acc + it.qty, 0);
        const totalItemsReturned = newReturned.reduce((acc, it) => acc + it.qty, 0);
        const nextStatus = totalItemsReturned >= totalItemsOrdered ? 'RETURNED' : 'CREDIT_NOTE_ISSUED';

        const updated = {
          ...s,
          status: nextStatus as 'RETURNED' | 'CREDIT_NOTE_ISSUED',
          returnedItems: newReturned
        };

        // Sync with drills down invoice view immediately
        setSelectedInvoice(updated);
        return updated;
      }
      return s;
    });

    setSales(updatedSales);

    // 4. Log audit log
    const audit: AuditLog = {
      id: Math.random().toString(36).substr(2, 9),
      userId: 'Admin Cashier',
      action: 'CREDIT_NOTE_GENERATED',
      details: `Credit Note generated for refund of items on ${selectedInvoice.id}. Returned ${returnedItemsPayload.map(i => `${i.sku} (x${i.qty})`).join(', ')}. Refunded total ₹${Math.round(refundValueTotal).toLocaleString()}`,
      timestamp: new Date().toISOString()
    };
    setAuditLogs(prev => [audit, ...prev]);
    logActivity('CREDIT_NOTE', `Generated credit note for invoice ${selectedInvoice.id} totalling ₹${Math.round(refundValueTotal)}`);

    alert(`Credit Note generated successfully. Refund of ₹${Math.round(refundValueTotal).toLocaleString()} applied. inventory levels restocked!`);
    
    // Clear return state
    setSelectedReturnItems({});
    setReturnNotes('');
    setShowReturnPanel(false);
  };

  const handleDownloadSheet = () => {
    // Generate basic CSV of sales register
    const headers = "Invoice No,Date,Customer Name,Phone,GST Number,Items Count,Subtotal,Discount,GST Value,Grand Total,Payment Mode,Status,User\n";
    const rows = filteredSales.map(s => {
      const itemsCount = s.items.reduce((a,b) => a + b.qty, 0);
      return `"${s.id}","${new Date(s.timestamp).toLocaleDateString()}","${s.customerName}","${s.customerPhone || 'N/A'}","${s.customerGst || 'N/A'}",${itemsCount},${s.subTotal},${s.totalDiscount},${s.totalGst},${s.grandTotal},"${s.paymentMode}","${s.status || 'PAID'}","${s.userId}"`;
    }).join("\n");

    const blob = new Blob([headers + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `sales_ledger_registry_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300 font-sans">
      
      {/* Title & Stats Headers */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-[42px] font-extrabold text-slate-900 tracking-tight flex items-center gap-2.5">
            <FileText className="w-8 h-9 text-[#2563EB]" />
            Sales Ledger & Custom Intelligence Registries
          </h1>
          <p className="text-slate-500 text-base font-medium mt-1">
            Browse transaction audit registers, track customer profiles timelines, and perform stock returns
          </p>
        </div>
      </div>

      {/* ERP Segment navigation tabs */}
      <div className="bg-[var(--app-bg)] border border-[var(--border-default)] p-1.5 rounded-xl no-print shadow-sm flex items-center">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setLedgerSubTab('REGISTER');
              setSelectedCustomerPhone(null);
            }}
            className={`px-5 py-2 h-[38px] rounded-lg text-[13px] font-bold transition-colors cursor-pointer flex items-center gap-2 justify-center shrink-0 ${
              ledgerSubTab === 'REGISTER'
                ? 'bg-[var(--surface)] text-blue-600 shadow-sm border border-[var(--border-default)]'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <ShoppingCart className="w-5 h-5" />
            <span>Sales Invoices Register</span>
          </button>
          <button
            type="button"
            onClick={() => setLedgerSubTab('CUSTOMERS')}
            className={`px-5 py-2 h-[38px] rounded-lg text-[13px] font-bold transition-colors cursor-pointer flex items-center gap-2 justify-center shrink-0 ${
              ledgerSubTab === 'CUSTOMERS'
                ? 'bg-[var(--surface)] text-blue-600 shadow-sm border border-[var(--border-default)]'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <User className="w-5 h-5" />
            <span>Customer Ledgers & Intelligence profiles</span>
          </button>
        </div>
      </div>

      {/* ======================================================== */}
      {/* MODULE TAB 1: CHRONOLOGICAL SALES REGISTER */}
      {/* ======================================================== */}
      {ledgerSubTab === 'REGISTER' && (
        <div className="space-y-5">
          {/* SEARCH & FILTERS PANEL */}
          <div className="bg-[var(--surface)] border border-[var(--border-default)] rounded-2xl p-5 shadow-sm flex flex-col gap-4">
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

            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
              {/* Search text query field */}
              <div className="md:col-span-4 space-y-1.5">
                <label className="block text-[11px] font-bold uppercase text-slate-500 tracking-wider">Search Sales</label>
                <div className="relative">
                  <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search by Invoice No, Customer, Phone, GST..."
                    value={registerSearch}
                    onChange={e => setRegisterSearch(e.target.value)}
                    className="w-full bg-[var(--app-bg)] border border-[var(--border-default)] focus:border-blue-500 focus:ring-1 focus:ring-blue-500 pl-9 pr-4 py-2 rounded-xl text-[13px] outline-none transition-all font-medium text-slate-800 shadow-sm"
                  />
                </div>
              </div>

              {/* Payment Mode */}
              <div className="md:col-span-3 space-y-1.5">
                <label className="block text-[11px] font-bold uppercase text-slate-500 tracking-wider">Payment Channel</label>
                <select
                  value={payModeFilter}
                  onChange={e => setPayModeFilter(e.target.value)}
                  className="w-full bg-[var(--app-bg)] border border-[var(--border-default)] focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-xl px-4 py-2 text-[13px] font-medium text-slate-700 outline-none shadow-sm cursor-pointer"
                >
                  <option value="ALL">All Channels</option>
                  <option value="CASH">CASH Only</option>
                  <option value="UPI">UPI Only</option>
                  <option value="CARD">CARD Only</option>
                </select>
              </div>

              {/* Audit Status */}
              <div className="md:col-span-3 space-y-1.5">
                <label className="block text-[11px] font-bold uppercase text-slate-500 tracking-wider">Audit Status</label>
                <select
                  value={statusFilter}
                  onChange={e => setStatusFilter(e.target.value)}
                  className="w-full bg-[var(--app-bg)] border border-[var(--border-default)] focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-xl px-4 py-2 text-[13px] font-medium text-slate-700 outline-none shadow-sm cursor-pointer"
                >
                  <option value="ALL">All Invoices</option>
                  <option value="PAID">PAID In Full</option>
                  <option value="RETURNED">RETURNED Refund</option>
                  <option value="CREDIT_NOTE_ISSUED">PARTIALLY RETURNED</option>
                </select>
              </div>

              <div className="md:col-span-2">
                <button
                  type="button"
                  onClick={handleDownloadSheet}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 px-4 rounded-xl text-[13px] flex items-center justify-center gap-2 transition-colors shadow-sm cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  Excel export
                </button>
              </div>
            </div>
          </div>

          {/* CHRONOLOGICAL TABLE REGISTRIES LIST */}
          <div className="bg-[var(--surface)] border border-[var(--border-default)] rounded-2xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="bg-[var(--app-bg)] border-b border-[var(--border-default)] text-slate-500 uppercase tracking-wider text-[11px] font-bold select-none">
                    <th className="py-4 px-5 cursor-pointer hover:bg-[var(--surface)]" onClick={() => toggleSort('id')}>
                      <div className="flex items-center gap-1.5">
                        <span>Invoice No</span>
                        <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
                      </div>
                    </th>
                    <th className="py-4 px-5 cursor-pointer hover:bg-[var(--surface)]" onClick={() => toggleSort('timestamp')}>
                      <div className="flex items-center gap-1.5">
                        <span>Sale Date/Time</span>
                        <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
                      </div>
                    </th>
                    <th className="py-4 px-5">Customer & Contacts</th>
                    <th className="py-4 px-5 text-center">Items count</th>
                    <th className="py-4 px-5 text-right cursor-pointer hover:bg-[var(--surface)]" onClick={() => toggleSort('grandTotal')}>
                      <div className="flex items-center gap-1.5 justify-end">
                        <span>Grand Total</span>
                        <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
                      </div>
                    </th>
                    <th className="py-4 px-5 text-center">Payment mode</th>
                    <th className="py-4 px-5">Operator</th>
                    <th className="py-4 px-5 text-center">Status</th>
                    <th className="py-4 px-5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-subtle)] font-medium text-[13px] text-slate-800">
                  {filteredSales.map(sale => {
                    const itemsCount = sale.items.reduce((acc, it) => acc + it.qty, 0);
                    const isReturned = sale.status === 'RETURNED';
                    const isCreditNote = sale.status === 'CREDIT_NOTE_ISSUED';

                    return (
                      <tr 
                        key={sale.id}
                        className="hover:bg-[var(--app-bg)] transition-colors"
                      >
                        <td className="py-3 px-5 font-mono text-blue-600 font-bold">{sale.id}</td>
                        <td className="py-3 px-5 text-slate-500 select-none">
                          {new Date(sale.timestamp).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                        </td>
                        <td className="py-3 px-5">
                          <div className="font-bold text-slate-900">{sale.customerName}</div>
                          {sale.customerPhone && (
                            <div className="text-[11px] text-slate-500 font-mono tracking-tight mt-0.5">{sale.customerPhone}</div>
                          )}
                        </td>
                        <td className="py-3 px-5 text-center text-slate-500 font-mono">{itemsCount} pcs</td>
                        <td className="py-3 px-5 text-right text-slate-900 font-bold font-mono text-[14px]">
                          ₹{sale.grandTotal.toLocaleString()}
                        </td>
                        <td className="py-3 px-5 text-center">
                          <span className="text-[11px] font-bold uppercase text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-md px-2 py-0.5 font-mono">
                            {sale.paymentMode}
                          </span>
                        </td>
                        <td className="py-3 px-5 text-slate-500">{sale.userId}</td>
                        <td className="py-3 px-5 text-center">
                          {isReturned ? (
                            <span className="text-[11px] font-bold uppercase text-rose-700 bg-rose-50 border border-rose-225 px-2 py-0.5 rounded-md">
                              Fully Returned
                            </span>
                          ) : isCreditNote ? (
                            <span className="text-[11px] font-bold uppercase text-amber-700 bg-amber-50 border border-amber-225 px-2 py-0.5 rounded-md">
                              Cr-Note Issued
                            </span>
                          ) : (
                            <span className="text-[11px] font-bold uppercase text-green-700 bg-green-50 border border-green-225 px-2 py-0.5 rounded-md">
                              Paid
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-5 text-right">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedInvoice(sale);
                              setShowReturnPanel(false);
                              setSelectedReturnItems({});
                            }}
                            className="bg-slate-800 hover:bg-slate-900 text-white font-bold py-1.5 px-3 rounded-md text-[12px] transition-colors cursor-pointer flex items-center justify-center gap-1 ml-auto"
                          >
                            <span>Inspect</span>
                            <ChevronRight className="w-3 h-3" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}

                  {filteredSales.length === 0 && (
                    <tr>
                      <td colSpan={9} className="py-16 text-center italic text-slate-400 text-base">
                        No transaction audit records matched your queries.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODULE TAB 2: CLIENT LEDGERS & INTELLIGENCE */}
      {/* ======================================================== */}
      {ledgerSubTab === 'CUSTOMERS' && (
        <div className="space-y-5">
          <DateFilter
            preset={customerDatePreset as PresetKey}
            startDateStr={customerStartDate}
            endDateStr={customerEndDate}
            onChange={(newPreset, start, end) => {
              setCustomerDatePreset(newPreset);
              setCustomerStartDate(start);
              setCustomerEndDate(end);
            }}
            onReset={() => {
              setCustomerDatePreset('ALL');
              setCustomerStartDate('');
              setCustomerEndDate('');
            }}
            allowAllTime={true}
          />

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* LEFT COLUMN: CUSTOMERS LIST REGISTRY SEARCH */}
          <div className="lg:col-span-5 bg-[var(--surface)] border border-[var(--border-default)] rounded-2xl p-5 shadow-sm space-y-4">
            <h3 className="font-bold text-slate-900 text-lg flex items-center gap-2">
              <User className="w-5 h-5 text-blue-600" />
              Client Registry Index
            </h3>
            
            <div className="relative">
              <Search className="absolute left-3.5 top-2.5 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search clients by name, contact, GSTIN..."
                value={customerSearch}
                onChange={e => setCustomerSearch(e.target.value)}
                className="w-full bg-[var(--app-bg)] border border-[var(--border-default)] hover:border-slate-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 pl-10 pr-4 py-2 rounded-xl text-[13px] outline-none transition-colors font-medium text-slate-800 shadow-sm"
              />
            </div>

            {/* Profiles stack */}
            <div className="space-y-2 max-h-[500px] overflow-y-auto cursor-pointer pr-1 custom-scrollbar">
              {filteredCustomerProfiles.map(profile => {
                const isSelected = selectedCustomerPhone === profile.phone || (profile.phone === '' && selectedCustomerPhone === 'Walk-in Customer' && profile.name === 'Walk-in Customer');
                const key = profile.phone ? profile.phone : 'Walk-in Customer';

                return (
                  <div
                    key={key}
                    tabIndex={0}
                    role="button"
                    onClick={() => {
                      if (profile.phone) setSelectedCustomerPhone(profile.phone);
                      else setSelectedCustomerPhone('Walk-in Customer');
                    }}
                    onKeyDown={e => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        if (profile.phone) setSelectedCustomerPhone(profile.phone);
                        else setSelectedCustomerPhone('Walk-in Customer');
                      }
                    }}
                    className={`p-3.5 rounded-xl border transition-colors flex justify-between items-center outline-none shadow-sm ${
                      isSelected
                        ? 'border-blue-600 bg-blue-50/50'
                        : 'border-[var(--border-default)] hover:border-slate-300 bg-[var(--surface)] hover:bg-[var(--app-bg)]'
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="font-bold text-slate-900 text-[14px] truncate">{profile.name}</div>
                      <div className="flex items-center gap-1.5 text-slate-400 mt-1 select-none font-medium text-[11px]">
                        <Phone className="w-3 h-3" />
                        <span>{profile.phone || 'Walk-in Cash ledger'}</span>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-slate-900 font-bold text-[14px] font-mono">₹{profile.totalSpend.toLocaleString()}</div>
                      <div className="text-[11px] text-slate-500 uppercase tracking-wider font-bold mt-0.5">{profile.totalTransactions} bills</div>
                    </div>
                  </div>
                );
              })}

              {filteredCustomerProfiles.length === 0 && (
                <p className="text-center italic text-slate-400 py-12 text-sm">No customer profile records matched parameters.</p>
              )}
            </div>
          </div>

          {/* RIGHT COLUMN: EXPANDED CUSTOMER LEDGER METRICS */}
          <div className="lg:col-span-7 space-y-6">
            {!activeCustomerDetails ? (
              <div className="bg-[var(--surface)] border border-[var(--border-default)] rounded-3xl p-16 text-center shadow-sm flex flex-col justify-center items-center gap-4 py-36">
                <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center shadow-sm">
                  <User className="w-8 h-9" />
                </div>
                <h3 className="font-bold text-slate-800 text-xl">Select a customer profile to inspect</h3>
                <p className="text-slate-500 text-[13px] max-w-sm leading-relaxed">
                  Analyze deep client intelligence metrics, lifetime trading volumes, categories preference, and view exact chronologies of items purchased.
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* 1. Profile Bio Header */}
                <div className="bg-[var(--surface)] border border-[var(--border-default)] rounded-2xl p-6 shadow-sm flex flex-col sm:flex-row justify-between items-start gap-4">
                  <div className="space-y-1.5 w-full">
                    <span className="text-[9.5px] font-black uppercase tracking-wider text-slate-400 bg-slate-100 px-3 py-0.5 rounded-md">
                      Customer Ledger Profile
                    </span>
                    <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight mt-1">{activeCustomerDetails.name}</h2>
                    
                    <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 pt-1 text-sm font-semibold text-slate-500">
                      <span className="flex items-center gap-1">
                        <Phone className="w-3.5 h-3.5 text-slate-400" />
                        <strong>{activeCustomerDetails.phone || 'Walk-in cash sales'}</strong>
                      </span>
                      {activeCustomerDetails.gst && (
                        <span className="flex items-center gap-1 font-mono uppercase bg-slate-50 border border-slate-200 rounded-md py-0.5 px-3 text-[10.5px]">
                          <span>GSTIN:</span>
                          <strong className="text-slate-700">{activeCustomerDetails.gst}</strong>
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* 2. Customer Analytics Metrics Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-[var(--surface)] border border-[var(--border-default)] p-4 rounded-2xl shadow-sm">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block mb-1">Lifetime Spend</span>
                    <strong className="text-2xl font-bold font-mono text-[#16A34A]">₹{activeCustomerDetails.totalSpend.toLocaleString()}</strong>
                  </div>
                  <div className="bg-[var(--surface)] border border-[var(--border-default)] p-4 rounded-2xl shadow-sm">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block mb-1">Total Invoices</span>
                    <strong className="text-2xl font-bold font-mono text-slate-900">{activeCustomerDetails.totalTransactions} orders</strong>
                  </div>
                  <div className="bg-[var(--surface)] border border-[var(--border-default)] p-4 rounded-2xl shadow-sm">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block mb-1">Avg Order Value</span>
                    <strong className="text-2xl font-bold font-mono text-blue-600">₹{activeCustomerDetails.averageOrderValue.toLocaleString()}</strong>
                  </div>
                  <div className="bg-[var(--surface)] border border-[var(--border-default)] p-4 rounded-2xl shadow-sm">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block mb-1">Days Since Visit</span>
                    <strong className={`text-2xl font-bold font-mono ${activeCustomerDetails.daysSinceLastVisit > 30 ? 'text-rose-600' : 'text-slate-900'}`}>
                      {activeCustomerDetails.daysSinceLastVisit === 0 ? 'Today' : `${activeCustomerDetails.daysSinceLastVisit} days`}
                    </strong>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-[var(--surface)] border border-[var(--border-default)] rounded-2xl p-4.5 shadow-sm">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block mb-1.5">Top Purchased Sku</span>
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-9 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center shrink-0">
                        <Tags className="w-5 h-5 text-indigo-600" />
                      </div>
                      <div className="font-bold text-slate-900 text-[14px] font-mono truncate">{activeCustomerDetails.topPurchasedSku}</div>
                    </div>
                  </div>
                  <div className="bg-[var(--surface)] border border-[var(--border-default)] rounded-2xl p-4.5 shadow-sm">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block mb-1.5">Last Transaction Date</span>
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-9 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center justify-center shrink-0">
                        <Calendar className="w-5 h-5 text-emerald-600" />
                      </div>
                      <div className="font-bold text-slate-900 text-[14px] truncate select-none">
                        {new Date(activeCustomerDetails.lastPurchaseDate).toLocaleDateString([], { dateStyle: 'medium' })}
                      </div>
                    </div>
                  </div>
                </div>

                {/* 3. Chronological Customer Purchase Timeline */}
                <div className="bg-[var(--surface)] border border-[var(--border-default)] rounded-2xl p-5 shadow-sm space-y-4">
                  <h3 className="font-bold text-slate-900 text-lg">Client Purchase Timeline</h3>
                  
                  <div className="space-y-5">
                    {customerTimelineGroups && (
                      <>
                        {/* Timeline Group Today */}
                        {customerTimelineGroups.today.length > 0 && (
                          <TimelineSection title="Today" salesList={customerTimelineGroups.today} onSelectSale={setSelectedInvoice} />
                        )}
                        {/* Timeline Group Yesterday */}
                        {customerTimelineGroups.yesterday.length > 0 && (
                          <TimelineSection title="Yesterday" salesList={customerTimelineGroups.yesterday} onSelectSale={setSelectedInvoice} />
                        )}
                        {/* Timeline Group This Week */}
                        {customerTimelineGroups.thisWeek.length > 0 && (
                          <TimelineSection title="This Week" salesList={customerTimelineGroups.thisWeek} onSelectSale={setSelectedInvoice} />
                        )}
                        {/* Timeline Group This Month */}
                        {customerTimelineGroups.thisMonth.length > 0 && (
                          <TimelineSection title="This Month" salesList={customerTimelineGroups.thisMonth} onSelectSale={setSelectedInvoice} />
                        )}
                        {/* Timeline Group Lifetime */}
                        {customerTimelineGroups.lifetimeOlder.length > 0 && (
                          <TimelineSection title="Lifetime Older / Classic Histories" salesList={customerTimelineGroups.lifetimeOlder} onSelectSale={setSelectedInvoice} />
                        )}

                        {activeCustomerDetails.salesTimeline.length === 0 && (
                          <p className="text-center text-slate-400 italic text-sm py-8">No purchase history is registered for this customer yet.</p>
                        )}
                      </>
                    )}
                  </div>
                </div>

              </div>
            )}
          </div>

        </div>
      </div>
    )}

      {/* ======================================================== */}
      {/* GLOBAL MODAL: FULL DETAILED INVOICE DRILL DOWN */}
      {/* ======================================================== */}
      {selectedInvoice && (
        <div className="fixed inset-0 bg-slate-950/50 backdrop-blur-sm flex justify-center items-center z-50 p-4 font-sans no-print animate-in fade-in duration-200">
          <div className="bg-[var(--surface)] rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden shadow-2xl border border-[var(--border-default)] flex flex-col">
            
            {/* Header section of Invoice modal */}
            <div className="flex bg-slate-900 text-white p-5 justify-between items-center select-none uppercase tracking-wide shrink-0">
              <div className="flex items-center gap-2.5">
                <FileText className="w-5 h-5 text-blue-500" />
                <span className="font-bold text-[14px] font-sans">VOUCHER INVOICE REPORT • {selectedInvoice.id}</span>
              </div>
              <button 
                onClick={() => {
                  setSelectedInvoice(null);
                  setShowReturnPanel(false);
                }} 
                className="text-slate-400 hover:text-white transition duration-150 p-1 border-none bg-transparent cursor-pointer"
              >
                <X className="w-5.5 h-5.5" />
              </button>
            </div>

            {/* Scrollable invoice viewport */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              
              {/* PRINTABLE WORKSPACE COMPOSITION HEADER */}
              <div id="reprint-invoice-print-area" className="border border-slate-200 rounded-xl p-5 space-y-5 bg-[#FAFAFA]">
                
                {/* Firm branding header */}
                <div className="flex justify-between border-b border-slate-200 pb-4 flex-col sm:flex-row gap-4">
                  <div className="space-y-1 select-none">
                    <h3 className="font-extrabold text-slate-900 text-xl tracking-tight uppercase">ELECTRASTOCK PRO ERP</h3>
                    <p className="text-slate-500 font-bold text-[10.5px]">Main Bazaar Road, Electrical Plaza, New Delhi 110001</p>
                    <p className="text-slate-450 font-semibold text-[10px]">GSTIN Registration NO: 07AAAEC1214D1Z2</p>
                  </div>
                  <div className="text-left sm:text-right font-mono text-sm select-none space-y-0.5">
                    <span className="text-[10px] uppercase font-black text-slate-400 block mb-0.5">Invoice Memo</span>
                    <div>INV No: <strong className="text-slate-800 font-extrabold">{selectedInvoice.id}</strong></div>
                    <div>Date: <strong className="text-slate-800 font-bold">{new Date(selectedInvoice.timestamp).toLocaleDateString()}</strong></div>
                    <div>Time: <strong className="text-slate-800 font-medium">{new Date(selectedInvoice.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</strong></div>
                  </div>
                </div>

                {/* Customer Information Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-b border-slate-200 pb-4 text-sm font-semibold select-none">
                  <div className="space-y-1.5">
                    <span className="text-[9px] uppercase font-black tracking-widest text-slate-400 block">Billed To (Client / Ledger)</span>
                    <div className="text-slate-900 font-extrabold text-base">{selectedInvoice.customerName}</div>
                    {selectedInvoice.customerPhone && (
                      <div className="text-slate-500 font-mono text-[11px] flex items-center gap-1 text-slate-450">
                        <Phone className="w-3 h-3" />
                        <span>{selectedInvoice.customerPhone}</span>
                      </div>
                    )}
                  </div>
                  {selectedInvoice.customerGst && (
                    <div className="space-y-1.5 flex flex-col sm:items-end">
                      <span className="text-[9px] uppercase font-black tracking-widest text-slate-400 block">Customer GSTIN ID</span>
                      <strong className="text-slate-700 font-mono tracking-widest text-[11.5px] uppercase bg-white border border-slate-200/80 rounded px-3.5 py-1">
                        {selectedInvoice.customerGst}
                      </strong>
                    </div>
                  )}
                </div>

                {/* Items grid details */}
                <div className="space-y-1.5">
                  <span className="text-[9px] uppercase font-black tracking-widest text-slate-400 block select-none">Line entries catalog</span>
                  <div className="border border-slate-200 rounded-lg overflow-hidden bg-white shadow-[0_1px_2px_rgba(0,0,0,0.01)] text-sm">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200 text-slate-550 text-[9px] uppercase font-black tracking-widest select-none">
                          <th className="p-2 px-4">Item Description</th>
                          <th className="p-2 text-center">HSN</th>
                          <th className="p-2 text-center">Qty</th>
                          <th className="p-2 text-right">Rate</th>
                          <th className="p-2 text-center">GST %</th>
                          <th className="p-2 text-right">Disc %</th>
                          <th className="p-2 text-right">Total Amount</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-semibold text-slate-800">
                        {selectedInvoice.items.map((it, idx) => {
                          const baseRowVal = it.price * it.qty;
                          const discRowVal = baseRowVal * (it.discount / 100);
                          const linePostDisc = baseRowVal - discRowVal;
                          const calculatedGstVal = linePostDisc * (it.gstRate / 100);
                          const lineRowGrandTotal = linePostDisc + calculatedGstVal;

                          return (
                            <tr key={it.sku + idx}>
                              <td className="p-2 px-4">
                                <div>{it.name}</div>
                                <div className="text-[9.5px] font-mono text-slate-400 tracking-wider font-extrabold mt-0.5">{it.sku}</div>
                              </td>
                              <td className="p-2 text-center text-slate-400 font-memo">8414</td>
                              <td className="p-2 text-center font-mono">{it.qty} pcs</td>
                              <td className="p-2 text-right font-mono">₹{it.price.toLocaleString()}</td>
                              <td className="p-2 text-center font-mono text-slate-500">{it.gstRate}%</td>
                              <td className="p-2 text-center font-mono text-slate-500">{it.discount}%</td>
                              <td className="p-2 text-right font-mono font-extrabold text-slate-900">₹{Math.round(lineRowGrandTotal).toLocaleString()}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Tax Ledger reconciliation summary */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 text-sm">
                  {/* Left Notes */}
                  <div className="space-y-1 text-[10.5px] text-slate-500 font-medium select-none font-sans lowercase leading-relaxed">
                    <p>* Payment collected securely via dynamic {selectedInvoice.paymentMode} account ledger settlement.</p>
                    <p>* Taxes reconciliation includes equal splits for state CGST and SGST rules operations.</p>
                    {selectedInvoice.returnedItems && selectedInvoice.returnedItems.length > 0 && (
                      <div className="text-rose-600 font-extrabold bg-rose-50 border border-rose-200 rounded-lg p-2.5 mt-2 uppercase text-[9.5px]">
                        <strong>Returned items history:</strong>
                        <div className="mt-1 font-mono leading-tight space-y-0.5 lowercase text-slate-700 font-bold">
                          {selectedInvoice.returnedItems.map((r, i) => (
                            <div key={i}>* Returned {r.sku} (x{r.qty}) on {new Date(r.timestamp).toLocaleDateString()}</div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Right calculations totals */}
                  <div className="border border-slate-200 bg-white rounded-lg p-3 space-y-2 select-none font-semibold text-slate-700">
                    <div className="flex justify-between items-center text-[11px]">
                      <span>Subtotal before Discount:</span>
                      <strong className="text-slate-800 font-mono">₹{selectedInvoice.subTotal.toLocaleString()}</strong>
                    </div>
                    <div className="flex justify-between items-center text-[11px]">
                      <span>Voucher Discount Adjustment:</span>
                      <strong className="text-amber-700 font-mono">- ₹{selectedInvoice.totalDiscount.toLocaleString()}</strong>
                    </div>
                    <div className="flex justify-between items-center text-[11px] border-b border-slate-100 pb-1.5">
                      <span>GST Taxes reconciliation:</span>
                      <strong className="text-slate-800 font-mono">₹{selectedInvoice.totalGst.toLocaleString()}</strong>
                    </div>
                    <div className="flex justify-between items-center text-[#2563EB] text-base pt-0.5">
                      <span className="font-extrabold">Final Net Payable:</span>
                      <strong className="font-black font-mono">₹{selectedInvoice.grandTotal.toLocaleString()}</strong>
                    </div>
                  </div>
                </div>

              </div>

              {/* ACTION: ITEM RETURNS & CREDIT NOTE GENERATION (COLLAPSED BY DEFAULT) */}
              {selectedInvoice.status !== 'RETURNED' && (
                <div className="border border-[var(--border-default)] rounded-xl bg-[var(--app-bg)] p-4 space-y-3">
                  <button
                    type="button"
                    onClick={() => setShowReturnPanel(!showReturnPanel)}
                    className="w-full flex justify-between items-center bg-transparent border-none outline-none cursor-pointer font-bold text-slate-800 text-[14px]"
                  >
                    <div className="flex items-center gap-2 text-slate-900">
                      <Undo2 className="w-5 h-5 text-rose-500" />
                      <span>Process Returns / Issue Credit Note</span>
                    </div>
                    <span className="text-blue-600 hover:underline text-[13px]">
                      {showReturnPanel ? "[Hide Panel]" : "[Expand Panel]"}
                    </span>
                  </button>

                  {showReturnPanel && (
                    <div className="space-y-4 border-t border-slate-220 pt-3 text-[13px] leading-normal animate-in slide-in-from-top-2 duration-200">
                      <p className="text-slate-500 font-medium font-sans">
                        Select which product quantities the customer is returning. Returned stocks will automatically replenish physical store inventory, generate dynamic credit notes, and log transaction ledgers.
                      </p>

                      <div className="space-y-2">
                        {selectedInvoice.items.map((it, idx) => {
                          const alreadyReturned = (selectedInvoice.returnedItems || [])
                            .filter(r => r.sku === it.sku)
                            .reduce((a, b) => a + b.qty, 0);
                          const maxReturnQty = it.qty - alreadyReturned;

                          return (
                            <div key={idx} className="flex justify-between items-center p-2.5 bg-[var(--surface)] border border-[var(--border-default)] rounded-lg shadow-sm">
                              <div className="min-w-0 flex-1">
                                <span className="font-bold text-slate-900 block">{it.name}</span>
                                <span className="text-[11px] text-slate-500 font-mono tracking-wider font-bold">{it.sku} · Purchased: {it.qty} {alreadyReturned > 0 && `(Already Returned: ${alreadyReturned})`}</span>
                              </div>
                              <div className="flex items-center gap-2 hover:gap-3 shrink-0">
                                <span className="text-slate-500 font-medium">Return Qty:</span>
                                <input
                                  type="number"
                                  min={0}
                                  max={maxReturnQty}
                                  placeholder="0"
                                  value={selectedReturnItems[it.sku] ?? ''}
                                  disabled={maxReturnQty <= 0}
                                  onChange={e => {
                                    const val = Math.min(maxReturnQty, Math.max(0, Number(e.target.value)));
                                    setSelectedReturnItems(prev => ({ ...prev, [it.sku]: val }));
                                  }}
                                  className="w-14 bg-[var(--app-bg)] border border-[var(--border-default)] text-center font-bold p-1 rounded font-mono text-slate-900 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      <div className="space-y-1">
                        <label className="text-[11px] font-bold uppercase text-slate-500 tracking-wider">Adjustment ledger notes</label>
                        <textarea
                          rows={2}
                          value={returnNotes}
                          onChange={e => setReturnNotes(e.target.value)}
                          placeholder="e.g., Customer requested sweeps size exchange. restocking electrical variant CAF-BR-1200"
                          className="w-full bg-[var(--surface)] border border-[var(--border-default)] p-2 text-[13px] rounded-xl outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 shadow-sm"
                        />
                      </div>

                      <button
                        type="button"
                        onClick={handleProcessRefundCreditNote}
                        className="w-full h-11 bg-rose-600 hover:bg-rose-700 text-white font-bold text-[13px] rounded-xl flex items-center justify-center gap-1.5 transition-colors shadow-sm cursor-pointer"
                      >
                        <Undo2 className="w-5 h-5" />
                        <span>Confirm Return / Create Credit Note</span>
                      </button>
                    </div>
                  )}
                </div>
              )}

            </div>

            {/* Bottom Actions footer */}
            <div className="bg-[var(--app-bg)] border-t border-[var(--border-default)] p-4 flex flex-col sm:flex-row justify-end gap-2.5 shrink-0">
              <button
                type="button"
                onClick={() => {
                  setSelectedInvoice(null);
                  setShowReturnPanel(false);
                }}
                className="py-2.5 px-5 border border-[var(--border-default)] hover:bg-[var(--surface)] font-bold text-[13px] rounded-lg cursor-pointer text-slate-600 shrink-0 select-none uppercase tracking-wide transition-colors"
              >
                Close inspect
              </button>
              
              <button
                type="button"
                onClick={() => {
                  // Standard print area trigger
                  window.print();
                }}
                className="py-2.5 px-5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-[13px] rounded-lg cursor-pointer flex items-center justify-center gap-1.5 shrink-0 select-none shadow-sm uppercase tracking-wide transition-colors"
              >
                <Printer className="w-4 h-4" />
                <span>Reprint Invoice (F12)</span>
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};

// HELPER TIMELINE CONTAINER GROUP
const TimelineSection: React.FC<{ title: string; salesList: Sale[]; onSelectSale: (s: Sale) => void }> = ({ title, salesList, onSelectSale }) => {
  return (
    <div className="space-y-2 select-none">
      <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider block border-l-2 border-slate-300 pl-2">{title}</span>
      <div className="space-y-1.5">
        {salesList.map(sale => {
          const skuSummary = sale.items.map(it => `${it.name} (x${it.qty})`).join(', ');

          return (
            <div 
              key={sale.id}
              onClick={() => onSelectSale(sale)}
              className="flex justify-between items-center p-3.5 rounded-xl border border-slate-150 hover:border-slate-300 bg-white hover:bg-slate-50 transition cursor-pointer"
            >
              <div className="min-w-0 flex-1">
                <div className="flex gap-2 items-center">
                  <span className="font-mono text-[11.5px] font-extrabold text-[#2563EB] bg-blue-50/50 border border-blue-100/60 px-1.5 py-0.5 rounded">
                    {sale.id}
                  </span>
                  <span className="text-[11px] text-slate-400 font-medium font-mono">
                    {new Date(sale.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <p className="text-slate-600 text-sm font-semibold mt-1.5 truncate max-w-[280px]">
                  {skuSummary}
                </p>
              </div>
              <div className="text-right shrink-0 pl-3">
                <strong className="text-slate-900 font-extrabold text-sm block font-mono">₹{sale.grandTotal.toLocaleString()}</strong>
                <span className="text-[10px] text-slate-400 capitalize font-medium mt-0.5 block">{sale.paymentMode}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
