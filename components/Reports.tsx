import React, { useState, useMemo, useRef } from 'react';
import * as XLSX from 'xlsx';
import { Product, Sale, StockMovement, AuditLog, Category } from '../types';
import { 
  ResponsiveContainer, BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, Legend, PieChart, Pie, Cell 
} from 'recharts';
import { 
  Download, FileText, X, ArrowUpRight, Eye, SlidersHorizontal, AlertTriangle, AlertOctagon,
  FolderOpen, Coins, ShoppingCart, Activity, Layers, TrendingUp, Sparkles, Calendar
} from 'lucide-react';
import { useModalEffects } from './modalUtils';
import { DateFilter, PresetKey, getPresetDateBounds, formatDateDisplay } from './DateFilter';

interface ReportsProps {
  products: Product[];
  sales: Sale[];
  movements: StockMovement[];
  auditLogs: AuditLog[];
  categories: Category[];
}

type DatePreset = PresetKey;

type ActiveReportKey = 
  | 'VALUATION' 
  | 'MOVEMENT_SUMMARY' 
  | 'LOW_STOCK' 
  | 'OUT_OF_STOCK' 
  | 'DEAD_STOCK' 
  | 'SALES_SUMMARY' 
  | 'TOP_MOVING' 
  | 'SLOW_MOVING' 
  | 'CATEGORY_PERF' 
  | 'PROFIT_LOSS' 
  | 'GST_REPORT' 
  | 'CUSTOMER_LTV'
  | 'DAILY_SALES_SUMMARY'
  | 'MONTHLY_SALES_SUMMARY'
  | 'PAYMENT_MODE_ANALYSIS'
  | 'CUSTOMER_RETENTION_ANALYSIS'
  | 'AUDIT_TRAIL';

export const Reports: React.FC<ReportsProps> = ({ 
  products, sales, movements, auditLogs, categories
}) => {
  // Analytics Filter States
  const [datePreset, setDatePreset] = useState<DatePreset>('ALL');
  const [customStart, setCustomStart] = useState<string>('');
  const [customEnd, setCustomEnd] = useState<string>('');
  const [filterCategory, setFilterCategory] = useState<string>('ALL');
  const [reportSearch, setReportSearch] = useState<string>('');

  // Selected Report State (Modal Viewer)
  const [previewReport, setPreviewReport] = useState<ActiveReportKey | null>(null);

  const previewReportRef = useRef<HTMLDivElement>(null);
  useModalEffects({
    onClose: () => setPreviewReport(null),
    containerRef: previewReportRef,
    isActive: previewReport !== null,
  });

  // ----------------------------------------------------
  // DATE FILTERING HELPER (ESTABLISH REPORT BOUNDS)
  // ----------------------------------------------------
  const dateRange = useMemo(() => {
    return getPresetDateBounds(datePreset, customStart, customEnd);
  }, [datePreset, customStart, customEnd]);

  // FILTERED RECORDS
  const filteredSales = useMemo(() => {
    return sales.filter(s => {
      if (dateRange) {
        const t = new Date(s.timestamp);
        if (t < dateRange.start || t > dateRange.end) return false;
      }
      return true;
    });
  }, [sales, dateRange]);

  const filteredMovements = useMemo(() => {
    return movements.filter(m => {
      if (dateRange) {
        const t = new Date(m.timestamp);
        if (t < dateRange.start || t > dateRange.end) return false;
      }
      return true;
    });
  }, [movements, dateRange]);

  // ----------------------------------------------------
  // REPORT CALCULATIONS COMPILERS
  // ----------------------------------------------------
  const reportsData = useMemo(() => {
    // 1. Inventory Valuation
    const valuationList = products.flatMap(p => {
      if (filterCategory !== 'ALL' && p.categoryId !== filterCategory) return [];
      const catObj = categories.find(c => c.id === p.categoryId);
      const catName = catObj ? `${catObj.name} (${catObj.code})` : 'Default';
      return p.variants.map(v => ({
        sku: v.sku,
        name: p.name,
        category: catName,
        stock: v.stock,
        cost: v.costPrice,
        price: v.price,
        totalCost: v.stock * v.costPrice,
        totalValue: v.stock * v.price,
        profitPotential: (v.price - v.costPrice) * v.stock
      }));
    }).filter(it => !reportSearch || it.name.toLowerCase().includes(reportSearch.toLowerCase()) || it.sku.toLowerCase().includes(reportSearch.toLowerCase()));

    // 2. Stock Movement Summary
    const movementSummary = products.flatMap(p => {
      if (filterCategory !== 'ALL' && p.categoryId !== filterCategory) return [];
      const catObj = categories.find(c => c.id === p.categoryId);
      const catName = catObj ? `${catObj.name} (${catObj.code})` : 'Default';
      return p.variants.map(v => {
        const skuMovs = filteredMovements.filter(m => m.variantSku === v.sku);
        const stockIn = skuMovs.filter(m => m.type === 'IN').reduce((a, b) => a + b.qty, 0);
        const stockOut = skuMovs.filter(m => m.type === 'OUT').reduce((a, b) => a + b.qty, 0);
        const adjustments = skuMovs.filter(m => m.type === 'ADJUST');
        const lastAdj = adjustments.length > 0 ? adjustments[adjustments.length - 1].qty : 0;
        
        const computedIn = stockIn + (adjustments.length > 0 ? lastAdj : 0);
        const openingStock = Math.max(0, v.stock + stockOut - computedIn);
        
        return {
          sku: v.sku,
          name: p.name,
          category: catName,
          opening: openingStock,
          stockIn,
          stockOut,
          closing: v.stock
        };
      });
    }).filter(it => !reportSearch || it.name.toLowerCase().includes(reportSearch.toLowerCase()) || it.sku.toLowerCase().includes(reportSearch.toLowerCase()));

    // 3. Low Stock List
    const lowStockList = products.flatMap(p => {
      if (filterCategory !== 'ALL' && p.categoryId !== filterCategory) return [];
      const catObj = categories.find(c => c.id === p.categoryId);
      const catName = catObj ? `${catObj.name} (${catObj.code})` : 'Default';
      return p.variants.filter(v => v.stock <= v.lowStockThreshold).map(v => ({
        sku: v.sku,
        name: p.name,
        category: catName,
        stock: v.stock,
        threshold: v.lowStockThreshold,
        suggestedReorder: Math.max(10, v.lowStockThreshold * 2 - v.stock)
      }));
    }).filter(it => !reportSearch || it.name.toLowerCase().includes(reportSearch.toLowerCase()) || it.sku.toLowerCase().includes(reportSearch.toLowerCase()));

    // 4. Out of Stock List
    const outOfStockList = products.flatMap(p => {
      if (filterCategory !== 'ALL' && p.categoryId !== filterCategory) return [];
      const catObj = categories.find(c => c.id === p.categoryId);
      const catName = catObj ? `${catObj.name} (${catObj.code})` : 'Default';
      return p.variants.filter(v => v.stock <= 0).map(v => ({
        sku: v.sku,
        name: p.name,
        category: catName,
        stock: 0
      }));
    }).filter(it => !reportSearch || it.name.toLowerCase().includes(reportSearch.toLowerCase()) || it.sku.toLowerCase().includes(reportSearch.toLowerCase()));

    // 5. Dead / Dormant Stock
    const deadStockList = products.flatMap(p => {
      if (filterCategory !== 'ALL' && p.categoryId !== filterCategory) return [];
      const catObj = categories.find(c => c.id === p.categoryId);
      const catName = catObj ? `${catObj.name} (${catObj.code})` : 'Default';
      return p.variants.filter(v => v.stock > 0).map(v => {
        const hasSalesInPeriod = sales.some(s => s.items.some(it => it.sku === v.sku));
        return {
          sku: v.sku,
          name: p.name,
          category: catName,
          stock: v.stock,
          cost: v.costPrice,
          daysSilent: hasSalesInPeriod ? 'Low sales velocity' : 'Dormant (>30 days)'
        };
      });
    }).filter(it => !reportSearch || it.name.toLowerCase().includes(reportSearch.toLowerCase()) || it.sku.toLowerCase().includes(reportSearch.toLowerCase()));

    // 6. Sales Performance Lists
    let itemsAgg: Record<string, { sku: string; name: string; category: string; soldCount: number; revenue: number; cost: number; tax: number; profit: number }> = {};
    filteredSales.forEach(s => {
      s.items.forEach(item => {
        if (!itemsAgg[item.sku]) {
          const prodObj = products.find(p => p.variants.some(v => v.sku === item.sku));
          const catObj = prodObj ? categories.find(c => c.id === prodObj.categoryId) : undefined;
          const catName = catObj ? `${catObj.name} (${catObj.code})` : 'Default';
          const costVal = prodObj?.variants.find(v => v.sku === item.sku)?.costPrice || 0;
          itemsAgg[item.sku] = {
            sku: item.sku,
            name: item.name,
            category: catName,
            soldCount: 0,
            revenue: 0,
            cost: costVal,
            tax: 0,
            profit: 0
          };
        }
        const itemRev = item.qty * item.price * (1 - item.discount / 100);
        const itemTax = itemRev * (item.gstRate / 100);
        const totalBaseCost = item.qty * itemsAgg[item.sku].cost;
        itemsAgg[item.sku].soldCount += item.qty;
        itemsAgg[item.sku].revenue += itemRev;
        itemsAgg[item.sku].tax += itemTax;
        itemsAgg[item.sku].profit += (itemRev - totalBaseCost);
      });
    });

    const salesList = Object.values(itemsAgg).filter(it => !reportSearch || it.name.toLowerCase().includes(reportSearch.toLowerCase()) || it.sku.toLowerCase().includes(reportSearch.toLowerCase()));
    const topMoving = [...salesList].sort((a, b) => b.soldCount - a.soldCount);
    const slowMoving = [...salesList].sort((a, b) => a.soldCount - b.soldCount);

    // 9. Category aggregation
    let catAggr: Record<string, { productsCount: number, revenue: number, profit: number, tax: number }> = {};
    categories.forEach(c => {
      catAggr[c.id] = { productsCount: products.filter(p => p.categoryId === c.id).length, revenue: 0, profit: 0, tax: 0 };
    });

    salesList.forEach(s => {
      const prodObj = products.find(p => p.variants.some(v => v.sku === s.sku));
      if (prodObj && catAggr[prodObj.categoryId]) {
        catAggr[prodObj.categoryId].revenue += s.revenue;
        catAggr[prodObj.categoryId].profit += s.profit;
        catAggr[prodObj.categoryId].tax += s.tax;
      }
    });

    const categoryPerformanceList = categories.map(c => ({
      id: c.id,
      name: `${c.name} (${c.code})`,
      templatesCount: catAggr[c.id]?.productsCount || 0,
      revenue: catAggr[c.id]?.revenue || 0,
      tax: catAggr[c.id]?.tax || 0,
      profit: catAggr[c.id]?.profit || 0
    })).filter(it => !reportSearch || it.name.toLowerCase().includes(reportSearch.toLowerCase()));

    // GST Tax Ledger
    const gstReportList = filteredSales.flatMap(s => {
      return s.items.map((item, idz) => {
        const itemVal = item.qty * item.price * (1 - item.discount / 100);
        const gstAmount = itemVal * (item.gstRate / 100);
        return {
          id: `${s.id}-${idz}`,
          billId: s.id,
          customer: s.customerName,
          productName: item.name,
          sku: item.sku,
          taxableValue: itemVal,
          totalGst: gstAmount,
          cgst: gstAmount / 2,
          sgst: gstAmount / 2,
          timestamp: s.timestamp
        };
      });
    }).filter(it => !reportSearch || it.productName.toLowerCase().includes(reportSearch.toLowerCase()) || it.billId.toLowerCase().includes(reportSearch.toLowerCase()));

    // Profit Loss Summary
    const profitLossOverall = salesList.reduce((acc, s) => {
      acc.revenue += s.revenue;
      acc.cost += s.cost * s.soldCount;
      acc.profit += s.profit;
      acc.tax += s.tax;
      return acc;
    }, { revenue: 0, cost: 0, profit: 0, tax: 0 });

    // Customer purchase values List
    let custMap: Record<string, { name: string, phone: string, count: number, totalspent: number, lastVisit: string }> = {};
    sales.forEach(s => {
      const phoneSim = s.customerMobile || 'Walk-in / Cash'; 
      const key = s.customerName || 'Walk-in Customer';
      if (!custMap[key]) {
        custMap[key] = { name: key, phone: phoneSim, count: 0, totalspent: 0, lastVisit: s.timestamp };
      }
      custMap[key].count += 1;
      custMap[key].totalspent += s.grandTotal;
      if (new Date(s.timestamp) > new Date(custMap[key].lastVisit)) {
        custMap[key].lastVisit = s.timestamp;
      }
    });
    const customerList = Object.values(custMap).filter(it => !reportSearch || it.name.toLowerCase().includes(reportSearch.toLowerCase()));

    return {
      valuationList,
      movementSummary,
      lowStockList,
      outOfStockList,
      deadStockList,
      salesList,
      topMoving,
      slowMoving,
      categoryPerformanceList,
      gstReportList,
      profitLossOverall,
      customerList
    };
  }, [products, filteredSales, filteredMovements, categories, movements, filterCategory, reportSearch, sales]);

  // Total Summary Counters
  const summaryStats = useMemo(() => {
    const totalAssetCostVal = reportsData.valuationList.reduce((sum, v) => sum + v.totalCost, 0);
    const lowStockAlertCount = reportsData.lowStockList.length;
    const outOfStockCount = reportsData.outOfStockList.length;
    
    const overallRevenue = filteredSales.reduce((sum, s) => sum + s.grandTotal, 0);
    const overallProfit = reportsData.profitLossOverall.profit;
    const overallTransactions = filteredSales.length;

    return {
      totalAssetCostVal,
      lowStockAlertCount,
      outOfStockCount,
      overallRevenue,
      overallProfit,
      overallTransactions
    };
  }, [reportsData, filteredSales]);

  // Extract Report Headers & Cells
  const getReportPayload = (reportType: ActiveReportKey): { headers: string[]; rows: any[][]; title: string } => {
    let headers: string[] = [];
    let rows: any[][] = [];
    let title = 'Detailed Ledger';

    switch(reportType) {
      case 'VALUATION':
        title = 'Inventory Asset Valuation Report';
        headers = ['SKU Code', 'Product Name', 'Category', 'Stock Qty', 'Unit Cost (₹)', 'Unit Selling (₹)', 'Asset Cost Value (₹)', 'Asset Selling Value (₹)'];
        rows = reportsData.valuationList.map(v => [v.sku, v.name, v.category, v.stock, v.cost, v.price, v.totalCost, v.totalValue]);
        break;
      case 'MOVEMENT_SUMMARY':
        title = 'Warehouse Stock Movement Summary';
        headers = ['SKU Code', 'Product Name', 'Category', 'Opening Stock', 'Total Stock In', 'Total Stock Out', 'Closing Stock'];
        rows = reportsData.movementSummary.map(m => [m.sku, m.name, m.category, m.opening, m.stockIn, m.stockOut, m.closing]);
        break;
      case 'LOW_STOCK':
        title = 'System Low Stock Register';
        headers = ['SKU Code', 'Product Name', 'Category', 'In-Stock Qty', 'Minimum Threshold Limit', 'Suggested Reorder Qty'];
        rows = reportsData.lowStockList.map(l => [l.sku, l.name, l.category, l.stock, l.threshold, l.suggestedReorder]);
        break;
      case 'OUT_OF_STOCK':
        title = 'Absolute Out of Stock Register';
        headers = ['SKU Code', 'Product Product Name', 'Category Name', 'Stock Count'];
        rows = reportsData.outOfStockList.map(o => [o.sku, o.name, o.category, 0]);
        break;
      case 'DEAD_STOCK':
        title = 'Dormant Dead Stock Sheet';
        headers = ['SKU Code', 'Product Name', 'Category Name', 'Stock Qty', 'Cost Price (₹)', 'Status / Inactivity'];
        rows = reportsData.deadStockList.map(d => [d.sku, d.name, d.category, d.stock, d.cost, d.daysSilent]);
        break;
      case 'SALES_SUMMARY':
        title = 'Sales Gross Business Summary';
        headers = ['SKU Code', 'Product Name', 'Category Name', 'Units Sold', 'Gross Revenue (₹)', 'Tax (GST) (₹)', 'Margin Profit (₹)'];
        rows = reportsData.salesList.map(s => [s.sku, s.name, s.category, s.soldCount, s.revenue, s.tax, s.profit]);
        break;
      case 'TOP_MOVING':
        title = 'High Turnover Best Sellers';
        headers = ['Rank', 'Product Name', 'Category', 'Quantity Sold Out', 'Gross Revenue (₹)', 'Calculated Profit (₹)'];
        rows = reportsData.topMoving.map((s, idx) => [idx + 1, s.name, s.category, s.soldCount, s.revenue, s.profit]);
        break;
      case 'SLOW_MOVING':
        title = 'Slow Turnover Low Sales SKU Report';
        headers = ['SKU Code', 'Product Name', 'Category', 'Quantity Sold Out', 'Gross Revenue (₹)', 'Completed Profit (₹)'];
        rows = reportsData.slowMoving.map(s => [s.sku, s.name, s.category, s.soldCount, s.revenue, s.profit]);
        break;
      case 'CATEGORY_PERF':
        title = 'Group Category Capital Productivity';
        headers = ['Category Template', 'Product Count', 'Aggregated Revenue (₹)', 'Total GST Liability (₹)', 'Net profit (₹)'];
        rows = reportsData.categoryPerformanceList.map(c => [c.name, c.templatesCount, c.revenue, c.tax, c.profit]);
        break;
      case 'PROFIT_LOSS':
        title = 'Profit & Loss Statement Ledger';
        headers = ['SKU Code', 'Product Name', 'Units Sold', 'Cost price Value (₹)', 'Gross Turnover (₹)', 'Profit Earned (₹)'];
        rows = reportsData.salesList.map(s => [s.sku, s.name, s.soldCount, s.cost * s.soldCount, s.revenue, s.profit]);
        break;
      case 'GST_REPORT':
        title = 'GST symmetric tax liability registers';
        headers = ['Record ID', 'Invoice #', 'Customer Name', 'Product Item', 'SKU Code', 'Taxable Value (₹)', 'CGST (9%) (₹)', 'SGST (9%) (₹)', 'Total GST (₹)'];
        rows = reportsData.gstReportList.map(g => [g.id, g.billId, g.customer, g.productName, g.sku, g.taxableValue, g.cgst, g.sgst, g.totalGst]);
        break;
      case 'CUSTOMER_LTV':
        title = 'Customer LTV Lifetime ledger';
        headers = ['Customer Phone/Name', 'Contact Info', 'Booking Transactions ClickCount', 'Spent volume sum (₹)', 'Last Visit Dated'];
        rows = reportsData.customerList.map(c => [c.name, c.phone, c.count, c.totalspent, c.lastVisit]);
        break;
      case 'DAILY_SALES_SUMMARY':
        title = 'Daily Sales Summary Register';
        headers = ['Date', 'Invoices Count', 'Gross Base Total (₹)', 'Discounts Written Off (₹)', 'Taxes Collected (₹)', 'Net Revenue Settled (₹)'];
        {
          const dailyMap: Record<string, { date: string, count: number, sub: number, disc: number, gst: number, net: number }> = {};
          sales.forEach(s => {
            const day = s.timestamp.split('T')[0];
            if (!dailyMap[day]) {
              dailyMap[day] = { date: day, count: 0, sub: 0, disc: 0, gst: 0, net: 0 };
            }
            dailyMap[day].count++;
            dailyMap[day].sub += s.subTotal;
            dailyMap[day].disc += s.totalDiscount;
            dailyMap[day].gst += s.totalGst;
            dailyMap[day].net += s.grandTotal;
          });
          rows = Object.values(dailyMap).sort((a,b) => b.date.localeCompare(a.date)).map(d => [d.date, d.count, d.sub, d.disc, d.gst, d.net]);
        }
        break;
      case 'MONTHLY_SALES_SUMMARY':
        title = 'Monthly Sales Performance Summary';
        headers = ['Month-Year', 'Transactions Count', 'Base Subtotal (₹)', 'Discounts Waived (₹)', 'Taxes Liability (₹)', 'Net Business Settled (₹)'];
        {
          const monthlyMap: Record<string, { month: string, count: number, sub: number, disc: number, gst: number, net: number }> = {};
          sales.forEach(s => {
            const mId = s.timestamp.substring(0, 7); // YYYY-MM
            if (!monthlyMap[mId]) {
              monthlyMap[mId] = { month: mId, count: 0, sub: 0, disc: 0, gst: 0, net: 0 };
            }
            monthlyMap[mId].count++;
            monthlyMap[mId].sub += s.subTotal;
            monthlyMap[mId].disc += s.totalDiscount;
            monthlyMap[mId].gst += s.totalGst;
            monthlyMap[mId].net += s.grandTotal;
          });
          rows = Object.values(monthlyMap).sort((a,b) => b.month.localeCompare(a.month)).map(m => [m.month, m.count, m.sub, m.disc, m.gst, m.net]);
        }
        break;
      case 'PAYMENT_MODE_ANALYSIS':
        title = 'Payment Mode Settlement Analysis';
        headers = ['Payment Channel', 'Invoices Registered', 'Percentage of Invoices', 'Total Settlement Amount (₹)', 'Percentage of Revenue'];
        {
          const payAggSelect: Record<string, { count: number, total: number }> = {
            CASH: { count: 0, total: 0 },
            UPI: { count: 0, total: 0 },
            CARD: { count: 0, total: 0 }
          };
          sales.forEach(s => {
            const m = s.paymentMode;
            if (payAggSelect[m]) {
              payAggSelect[m].count++;
              payAggSelect[m].total += s.grandTotal;
            }
          });
          const totalBills = sales.length || 1;
          const totalRevenue = sales.reduce((a,b) => a + b.grandTotal, 0) || 1;
          rows = Object.entries(payAggSelect).map(([mode, data]) => [
            mode,
            data.count,
            `${Math.round((data.count / totalBills) * 100)}%`,
            data.total,
            `${Math.round((data.total / totalRevenue) * 100)}%`
          ]);
        }
        break;
      case 'CUSTOMER_RETENTION_ANALYSIS':
        title = 'Customer Retention and Recency Analysis';
        headers = ['Customer Name', 'Last Purchase Date', 'Recency (Days)', 'Retention Status', 'LTV Spends (₹)'];
        rows = reportsData.customerList.map(c => {
          const diff = Math.floor((new Date().getTime() - new Date(c.lastVisit).getTime()) / (1000 * 3600 * 24));
          let status = 'RETENTIVE / ACTIVE';
          if (diff > 45) status = 'CHURN RISK (RESTOCK OR RECONNECT)';
          else if (diff > 15) status = 'DORMANT CLIENT';
          return [c.name, new Date(c.lastVisit).toLocaleDateString(), diff === 0 ? 'Today' : `${diff} days since last purchase`, status, c.totalspent];
        });
        break;
      case 'AUDIT_TRAIL':
        title = 'System operator audit logs';
        headers = ['Operator User', 'Operational Action', 'Specifications Description', 'Timestamp Logs'];
        rows = auditLogs.map(a => [a.userId, a.action, a.details, a.timestamp]);
        break;
    }

    return { headers, rows, title };
  };

  // 1. EXPORT TO CSV
  const handleExportCSV = (reportType: ActiveReportKey) => {
    const { headers, rows, title } = getReportPayload(reportType);
    const filename = `${reportType.toLowerCase()}_report.csv`;

    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" 
      + [headers.join(','), ...rows.map(e => e.map(item => `"${String(item).replace(/"/g, '""')}"`).join(','))].join('\n');
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // 2. EXPORT TO EXCEL (.xlsx)
  const handleExportExcel = (reportType: ActiveReportKey) => {
    const { headers, rows, title } = getReportPayload(reportType);
    const worksheet = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Report Sheet");
    
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const fileBlob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(fileBlob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `${reportType.toLowerCase()}_ledger_sheet.xlsx`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // 3. EXPORT TO PRINT-READY PDF WINDOW
  const handleExportPDF = (reportType: ActiveReportKey) => {
    const { headers, rows, title } = getReportPayload(reportType);
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const dateRangeStr = dateRange 
      ? `Report Period: ${formatDateDisplay(dateRange.start)} to ${formatDateDisplay(dateRange.end)}`
      : 'Report Period: All Time';

    const headersHtml = headers.map(h => `<th>${h}</th>`).join('');
    const rowsHtml = rows.map(r => `
      <tr>
        ${r.map(cell => `<td>${typeof cell === 'number' ? cell.toLocaleString() : cell}</td>`).join('')}
      </tr>
    `).join('');

    printWindow.document.write(`
      <html>
        <head>
          <title>${title} - PDF Export</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; padding: 30px; color: #1e293b; }
            h1 { text-align: center; font-size: 20px; text-transform: uppercase; margin-bottom: 2px; letter-spacing: 0.5px; }
            .subtitle { text-align: center; font-size: 11px; color: #64748b; margin-bottom: 25px; font-weight: 500; }
            table { width: 100%; border-collapse: collapse; margin-top: 15px; font-size: 11px; }
            th { background-color: #f8fafc; color: #475569; border: 1px solid #e2e8f0; padding: 10px; font-weight: 800; text-align: left; text-transform: uppercase; font-size: 9px; }
            td { border: 1px solid #e2e8f0; padding: 10px; color: #334155; }
            tr:nth-child(even) { background-color: #f8fafc/40; }
            @media print {
              body { padding: 0; }
            }
          </style>
        </head>
        <body onload="window.print(); window.close();">
          <h1>ElectraStock Pro BI Statement Ledger</h1>
          <div class="subtitle">${title} | ${dateRangeStr} | Generated: ${new Date().toLocaleString()}</div>
          <table>
            <thead>
              <tr>${headersHtml}</tr>
            </thead>
            <tbody>
              ${rowsHtml}
            </tbody>
          </table>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const renderInteractiveReportModal = () => {
    if (!previewReport) return null;
    const key = previewReport;
    const { headers, rows, title } = getReportPayload(key);

    let totalsSummary = null;
    let chartSection = null;

    // Compile aggregates for specific report visual preview
    switch(key) {
      case 'VALUATION':
        const totalCValue = reportsData.valuationList.reduce((s, r) => s + r.totalCost, 0);
        const totalSValue = reportsData.valuationList.reduce((s, r) => s + r.totalValue, 0);
        totalsSummary = (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-505 block">Total Asset Buy Cost Cost</span>
              <strong className="text-2xl font-mono text-slate-900">₹{totalCValue.toLocaleString()}</strong>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-505 block">Total Asset Sell Value</span>
              <strong className="text-2xl font-mono text-[#2563EB]">₹{totalSValue.toLocaleString()}</strong>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-505 block">Potential Gross Profit margin</span>
              <strong className="text-2xl font-mono text-emerald-600">₹{(totalSValue - totalCValue).toLocaleString()}</strong>
            </div>
          </div>
        );
        chartSection = (
          <div className="bg-[var(--surface)] p-4 rounded-xl border border-[var(--border-default)] h-64 shadow-sm">
            <h4 className="text-[11px] font-bold text-slate-500 mb-3 uppercase tracking-wider">Category Asset Share Value</h4>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={reportsData.valuationList.slice(0, 8)}>
                <XAxis dataKey="sku" stroke="#94a3b8" fontSize={11} />
                <YAxis stroke="#94a3b8" fontSize={11} />
                <Tooltip />
                <Bar dataKey="totalValue" fill="#2563EB" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        );
        break;

      case 'MOVEMENT_SUMMARY':
        totalsSummary = (
          <div className="bg-[var(--app-bg)] border border-[var(--border-default)] p-3.5 rounded-lg text-[13px] text-slate-600 italic shadow-sm">
            This ledger tracks real-time inwards stock entries, point of sale invoice checkouts, and system audits.
          </div>
        );
        chartSection = (
          <div className="bg-[var(--surface)] p-4 rounded-xl border border-[var(--border-default)] h-64 shadow-sm">
            <h4 className="text-[11px] font-bold text-slate-500 mb-3 uppercase tracking-wider">Inwards vs Outwards Velocity</h4>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={reportsData.movementSummary.slice(0, 8)}>
                <XAxis dataKey="sku" stroke="#94a3b8" fontSize={11} />
                <YAxis stroke="#94a3b8" fontSize={11} />
                <Tooltip />
                <Legend />
                <Bar dataKey="stockIn" name="Stock In" fill="#10B981" />
                <Bar dataKey="stockOut" name="Stock Out" fill="#EF4444" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        );
        break;

      case 'LOW_STOCK':
        totalsSummary = (
          <div className="bg-rose-50 border border-rose-100 p-4 rounded-xl flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
            <div>
              <span className="font-bold text-sm text-rose-800 block">Critical Low Stock Levels Detected</span>
              <p className="text-[11px] text-rose-700 font-medium">There are currently {reportsData.lowStockList.length} item variants operating at and below their target reorder threshold.</p>
            </div>
          </div>
        );
        break;

      case 'OUT_OF_STOCK':
        totalsSummary = (
          <div className="bg-red-50 border border-red-100 p-4 rounded-xl flex items-center gap-3">
            <AlertOctagon className="w-5 h-5 text-red-650 shrink-0" />
            <div>
              <span className="font-bold text-sm text-red-800 block">Severe Stockout Alert</span>
              <p className="text-[11px] text-red-700 font-medium">{reportsData.outOfStockList.length} product SKU variants contain zero stock.</p>
            </div>
          </div>
        );
        break;

      case 'DEAD_STOCK':
        totalsSummary = (
          <div className="bg-[var(--app-bg)] p-4 rounded-xl border border-[var(--border-default)] shadow-sm">
            <span className="text-[11px] uppercase font-bold text-slate-500 block">Dormant Capital Asset Value Value</span>
            <strong className="text-2xl font-mono text-slate-900">₹{reportsData.deadStockList.reduce((s, r) => s + (r.stock * r.cost), 0).toLocaleString()}</strong>
          </div>
        );
        break;

      case 'SALES_SUMMARY':
        const totalSalesG = reportsData.salesList.reduce((s, r) => s + r.revenue, 0);
        const totalTaxG = reportsData.salesList.reduce((s, r) => s + r.tax, 0);
        totalsSummary = (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-[var(--app-bg)] p-4 rounded-xl border border-[var(--border-default)] shadow-sm">
            <div>
              <span className="text-[11px] uppercase font-bold text-slate-500 block">Gross Sales Revenue Collected</span>
              <strong className="text-2xl font-mono text-slate-900">₹{totalSalesG.toLocaleString()}</strong>
            </div>
            <div>
              <span className="text-[11px] uppercase font-bold text-slate-500 block">Accumulated GST Liability</span>
              <strong className="text-2xl font-mono text-[#D97706]">₹{totalTaxG.toLocaleString()}</strong>
            </div>
          </div>
        );
        break;

      case 'CATEGORY_PERF':
        chartSection = (
          <div className="bg-[var(--surface)] p-4 rounded-xl border border-[var(--border-default)] h-[260px] flex flex-col md:flex-row gap-4 items-center shadow-sm">
            <div className="flex-1 h-full min-h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={reportsData.categoryPerformanceList.filter(r => r.revenue > 0)}
                    dataKey="revenue"
                    nameKey="name"
                    cx="50%"
                    cy="55%"
                    outerRadius={70}
                    label
                  >
                    {reportsData.categoryPerformanceList.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'][index % 5]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        );
        break;

      case 'PROFIT_LOSS':
        const totalProfitOverall = reportsData.profitLossOverall.revenue - reportsData.profitLossOverall.cost;
        const marginPercent = reportsData.profitLossOverall.revenue > 0 
          ? (totalProfitOverall / reportsData.profitLossOverall.revenue) * 100 
          : 0;
        totalsSummary = (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-[var(--app-bg)] p-4 rounded-xl border border-[var(--border-default)] shadow-sm">
            <div>
              <span className="text-[11px] uppercase font-bold text-slate-500 block">Gross Sales Collected</span>
              <strong className="text-xl font-mono text-slate-900">₹{reportsData.profitLossOverall.revenue.toLocaleString()}</strong>
            </div>
            <div>
              <span className="text-[11px] uppercase font-bold text-slate-500 block">Cost of Goods Sold (CGS)</span>
              <strong className="text-xl font-mono text-slate-600">₹{reportsData.profitLossOverall.cost.toLocaleString()}</strong>
            </div>
            <div>
              <span className="text-[11px] uppercase font-bold text-slate-500 block">Net Gross Operating Profit</span>
              <strong className="text-xl font-mono text-emerald-600">₹{totalProfitOverall.toLocaleString()}</strong>
            </div>
            <div>
              <span className="text-[11px] uppercase font-bold text-slate-500 block">Operating Margin Profit %</span>
              <strong className="text-xl font-mono text-blue-600">{marginPercent.toFixed(2)}%</strong>
            </div>
          </div>
        );
        break;

      case 'GST_REPORT':
        const totalTaxSumValue = reportsData.gstReportList.reduce((sum, g) => sum + g.totalGst, 0);
        totalsSummary = (
          <div className="bg-[var(--app-bg)] p-4 rounded-xl border border-[var(--border-default)] grid grid-cols-1 md:grid-cols-3 gap-4 shadow-sm">
            <div>
              <span className="text-[11px] uppercase font-bold text-slate-500 block">CGST Central tax (9%)</span>
              <strong className="text-xl font-mono text-slate-900">₹{(totalTaxSumValue / 2).toLocaleString()}</strong>
            </div>
            <div>
              <span className="text-[11px] uppercase font-bold text-slate-500 block">SGST State tax (9%)</span>
              <strong className="text-xl font-mono text-slate-900">₹{(totalTaxSumValue / 2).toLocaleString()}</strong>
            </div>
            <div>
              <span className="text-[11px] uppercase font-bold text-slate-500 block">Overall GST Collected liability</span>
              <strong className="text-xl font-mono text-[#D97706]">₹{totalTaxSumValue.toLocaleString()}</strong>
            </div>
          </div>
        );
        break;
    }

    const handleBackdropClick = (e: React.MouseEvent) => {
      if (e.target === e.currentTarget) {
        setPreviewReport(null);
      }
    };

    return (
      <div 
        onClick={handleBackdropClick}
        className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/50 backdrop-blur-sm flex items-center justify-center p-4 select-text"
      >
        <div 
          ref={previewReportRef}
          onClick={(e) => e.stopPropagation()}
          className="bg-[var(--surface)] rounded-2xl max-w-5xl w-full border border-[var(--border-default)] shadow-2xl overflow-hidden animate-in zoom-in duration-200 flex flex-col max-h-[90vh]"
        >
          
          {/* Header */}
          <div className="bg-[var(--app-bg)] border-b border-[var(--border-default)] px-6 py-4 flex justify-between items-center shrink-0">
            <div>
              <h3 className="text-[14px] font-bold text-slate-900 uppercase tracking-wide">{title}</h3>
              <p className="text-[11px] text-slate-500 mt-0.5 font-medium">ElectraStock BI System Ledger Workspace</p>
            </div>
            <button 
              onClick={() => setPreviewReport(null)}
              className="text-slate-400 hover:text-slate-700 bg-[var(--surface)] border border-[var(--border-default)] rounded-lg p-1.5 transition-colors shadow-sm cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-6 overflow-y-auto space-y-6">
            {chartSection && <div>{chartSection}</div>}
            {totalsSummary}

            {/* Grid Table display */}
            <div className="border border-[var(--border-default)] rounded-xl overflow-hidden bg-[var(--surface)] max-h-72 overflow-y-auto shadow-sm">
              <table className="w-full text-left border-collapse">
                <thead className="bg-[var(--app-bg)] text-slate-500 text-[11px] uppercase tracking-wider font-bold border-b border-[var(--border-default)]">
                  <tr>
                    {headers.map((h, i) => (
                      <th key={i} className="px-4 py-3">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-subtle)] text-slate-800 text-[13px]">
                  {rows.map((row, i) => (
                    <tr key={i} className="hover:bg-[var(--app-bg)] text-[13px] font-medium transition-colors">
                      {row.map((cell, cellIdx) => (
                        <td key={cellIdx} className="px-4 py-3 text-slate-800 font-mono">
                          {typeof cell === 'number' ? cell.toLocaleString() : String(cell)}
                        </td>
                      ))}
                    </tr>
                  ))}
                  {rows.length === 0 && (
                    <tr>
                      <td colSpan={headers.length} className="text-center py-10 text-slate-400 font-bold">
                        No financial records matching filters found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Ledger bottom actions row */}
          <div className="bg-[var(--app-bg)] border-t border-[var(--border-default)] px-6 py-4 flex flex-col sm:flex-row justify-between items-center gap-3 shrink-0">
            <span className="text-[11px] text-slate-500 font-bold">Rows loaded: {rows.length} records</span>
            <div className="flex flex-wrap gap-2">
              <button 
                onClick={() => handleExportCSV(key)}
                className="bg-[var(--surface)] border border-[var(--border-default)] hover:bg-[var(--app-bg)] font-bold text-[13px] text-slate-700 px-4 py-2 rounded-xl transition-colors flex items-center gap-2 cursor-pointer shadow-sm"
              >
                <Download className="w-4 h-4 text-slate-500" />
                <span>Export CSV</span>
              </button>
              <button 
                onClick={() => handleExportExcel(key)}
                className="bg-[var(--surface)] border border-[var(--border-default)] hover:bg-[var(--app-bg)] font-bold text-[13px] text-slate-700 px-4 py-2 rounded-xl transition-colors flex items-center gap-2 cursor-pointer shadow-sm"
              >
                <FileText className="w-4 h-4 text-emerald-600" />
                <span>Export XLSX (Excel)</span>
              </button>
              <button 
                onClick={() => handleExportPDF(key)}
                className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm active:scale-[0.98] font-bold px-4 py-2 rounded-xl text-[13px] transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <FileText className="w-4 h-4" />
                <span>Print PDF Record</span>
              </button>
            </div>
          </div>

        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6 select-text max-w-7xl mx-auto p-2">
      
      {/* Title Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-[var(--surface)] border border-[var(--border-default)] p-6 rounded-3xl shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-blue-600" />
            <span>Master Enterprise Business Intelligence Dashboard</span>
          </h1>
          <p className="text-[13px] text-slate-500 mt-1">
            Browse regulatory compliance ledgers, physical asset valuation reports, slow-moving assets, and profit contribution margins with native exports.
          </p>
        </div>
      </div>

      <div className="space-y-6">
        {/* Global Report Filters Panel */}
        <div className="bg-[var(--surface)] border border-[var(--border-default)] rounded-3xl p-5 shadow-sm space-y-4">
          <div className="flex items-center gap-2 text-[11px] font-bold text-slate-500 uppercase tracking-wider pb-2 border-b border-[var(--border-subtle)]">
            <SlidersHorizontal className="w-4 h-4 text-slate-400" />
            <span>Operational Constraints Dynamic Filters</span>
          </div>

          <DateFilter
            preset={datePreset}
            startDateStr={customStart}
            endDateStr={customEnd}
            onChange={(newPreset, start, end) => {
              setDatePreset(newPreset);
              setCustomStart(start);
              setCustomEnd(end);
            }}
            onReset={() => {
              setDatePreset('ALL');
              setCustomStart('');
              setCustomEnd('');
            }}
            allowAllTime={true}
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">Focus category template:</label>
              <select
                value={filterCategory}
                onChange={e => setFilterCategory(e.target.value)}
                className="w-full bg-[var(--app-bg)] border border-[var(--border-default)] focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-xl px-4 py-2 text-[13px] font-medium text-slate-700 outline-none shadow-sm cursor-pointer"
              >
                <option value="ALL">All Categories</option>
                {categories.map(c => (
                  <option key={c.id} value={c.id}>{c.name} ({c.code})</option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">Filter matching columns:</label>
              <input
                type="text"
                placeholder="Type query to filter results..."
                value={reportSearch}
                onChange={e => setReportSearch(e.target.value)}
                className="w-full bg-[var(--app-bg)] border border-[var(--border-default)] focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-xl px-4 py-2 text-[13px] font-medium text-slate-800 outline-none shadow-sm"
              />
            </div>
          </div>
        </div>

        {/* Dynamic Aggregated Metric Boxes */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-5">
          <div className="bg-[var(--surface)] border border-[var(--border-default)] rounded-3xl p-4 shadow-sm">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Overall Sales Revenue</span>
            <strong className="text-xl font-mono text-slate-900 block mt-1">₹{summaryStats.overallRevenue.toLocaleString()}</strong>
          </div>
          <div className="bg-[var(--surface)] border border-[var(--border-default)] rounded-3xl p-4 shadow-sm">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Overall Net Profit</span>
            <strong className="text-xl font-mono text-emerald-600 block mt-1">₹{summaryStats.overallProfit.toLocaleString()}</strong>
          </div>
          <div className="bg-[var(--surface)] border border-[var(--border-default)] rounded-3xl p-4 shadow-sm">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Asset buy Value value</span>
            <strong className="text-xl font-mono text-blue-600 block mt-1">₹{summaryStats.totalAssetCostVal.toLocaleString()}</strong>
          </div>
          <div className="bg-[var(--surface)] border border-[var(--border-default)] rounded-3xl p-4 shadow-sm">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Low stock alerts</span>
            <strong className="text-xl font-mono text-rose-600 block mt-1">{summaryStats.lowStockAlertCount} SKUs</strong>
          </div>
          <div className="bg-[var(--surface)] border border-[var(--border-default)] rounded-3xl p-4 shadow-sm">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Checkout voucher transactions</span>
            <strong className="text-xl font-mono text-slate-500 block mt-1">{summaryStats.overallTransactions} total</strong>
          </div>
        </div>

        {/* Reports Cards Grid Container */}
        <div className="bg-[var(--app-bg)] border border-[var(--border-default)] rounded-3xl p-6 shadow-sm">
          <h3 className="font-bold text-[13px] text-slate-500 uppercase tracking-widest mb-4">Certified Financial Compliance Reports</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

            {/* LOW STOCK */}
            <div className="bg-[var(--surface)] border border-[var(--border-default)] p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between group rounded-2xl">
              <div>
                <div className="w-10 h-11 rounded-xl bg-rose-50 flex items-center justify-center mb-4">
                  <AlertTriangle className="w-5 h-5 text-rose-650" />
                </div>
                <h4 className="text-base font-black text-slate-900 uppercase">Low Stock Threshold Register</h4>
                <p className="text-sm text-slate-500 mt-1 min-h-[36px]">Spikes alerts on inventory variants operating below reorder target buffers.</p>
              </div>
              <div className="flex gap-2 mt-4 pt-3 border-t border-[var(--border-subtle)]">
                <button 
                  onClick={() => setPreviewReport('LOW_STOCK')}
                  className="flex-1 bg-[var(--app-bg)] hover:bg-blue-600 hover:text-white text-slate-700 px-4 py-1.5 rounded-lg text-[13px] font-bold transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Open Report</span>
                </button>
              </div>
            </div>

            {/* OUT OF STOCK */}
            <div className="bg-[var(--surface)] border border-[var(--border-default)] p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between group rounded-2xl">
              <div>
                <div className="w-10 h-11 rounded-xl bg-red-50 flex items-center justify-center mb-4">
                  <AlertOctagon className="w-5 h-5 text-red-600" />
                </div>
                <h4 className="text-base font-black text-slate-900 uppercase">Critical stockout checklist</h4>
                <p className="text-sm text-slate-500 mt-1 min-h-[36px]">Tracks zero stock items that directly block sales transactions.</p>
              </div>
              <div className="flex gap-2 mt-4 pt-3 border-t border-[var(--border-subtle)]">
                <button 
                  onClick={() => setPreviewReport('OUT_OF_STOCK')}
                  className="flex-1 bg-[var(--app-bg)] hover:bg-blue-600 hover:text-white text-slate-700 px-4 py-1.5 rounded-lg text-[13px] font-bold transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Open Report</span>
                </button>
              </div>
            </div>

            {/* VALUATION */}
            <div className="bg-[var(--surface)] border border-[var(--border-default)] p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between group rounded-2xl">
              <div>
                <div className="w-10 h-11 rounded-xl bg-blue-50 flex items-center justify-center mb-4">
                  <Coins className="w-5 h-5 text-blue-600" />
                </div>
                <h4 className="text-base font-black text-slate-900 uppercase">Capital Valuation (Asset sheets)</h4>
                <p className="text-sm text-slate-500 mt-1 min-h-[36px]">Provides current buy cost, sell rates, and potential margin valuations.</p>
              </div>
              <div className="flex gap-2 mt-4 pt-3 border-t border-[var(--border-subtle)]">
                <button 
                  onClick={() => setPreviewReport('VALUATION')}
                  className="flex-1 bg-[var(--app-bg)] hover:bg-blue-600 hover:text-white text-slate-700 px-4 py-1.5 rounded-lg text-[13px] font-bold transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Open Report</span>
                </button>
              </div>
            </div>

            {/* MOVEMENT */}
            <div className="bg-[var(--surface)] border border-[var(--border-default)] p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between group rounded-2xl">
              <div>
                <div className="w-10 h-11 rounded-xl bg-yellow-50 flex items-center justify-center mb-4">
                  <TrendingUp className="w-5 h-5 text-yellow-600" />
                </div>
                <h4 className="text-base font-black text-slate-900 uppercase">Stock velocity summaries</h4>
                <p className="text-sm text-slate-500 mt-1 min-h-[36px]">Displays inward catalog flow against checkout velocities.</p>
              </div>
              <div className="flex gap-2 mt-4 pt-3 border-t border-[var(--border-subtle)]">
                <button 
                  onClick={() => setPreviewReport('MOVEMENT_SUMMARY')}
                  className="flex-1 bg-[var(--app-bg)] hover:bg-blue-600 hover:text-white text-slate-700 px-4 py-1.5 rounded-lg text-[13px] font-bold transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Open Report</span>
                </button>
              </div>
            </div>

            {/* SALES PERFORMANCE */}
            <div className="bg-[var(--surface)] border border-[var(--border-default)] p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between group rounded-2xl">
              <div>
                <div className="w-10 h-11 rounded-xl bg-orange-50 flex items-center justify-center mb-4">
                  <ShoppingCart className="w-5 h-5 text-orange-600" />
                </div>
                <h4 className="text-base font-black text-slate-900 uppercase">Product Turnover performance</h4>
                <p className="text-sm text-slate-500 mt-1 min-h-[36px]">Computes gross items sold, revenue, and product profit contributions.</p>
              </div>
              <div className="flex gap-2 mt-4 pt-3 border-t border-[var(--border-subtle)]">
                <button 
                  onClick={() => setPreviewReport('SALES_SUMMARY')}
                  className="flex-1 bg-[var(--app-bg)] hover:bg-blue-600 hover:text-white text-slate-700 px-4 py-1.5 rounded-lg text-[13px] font-bold transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Open Report</span>
                </button>
              </div>
            </div>

            {/* PROFIT LOSS */}
            <div className="bg-[var(--surface)] border border-[var(--border-default)] p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between group rounded-2xl">
              <div>
                <div className="w-10 h-11 rounded-xl bg-emerald-50 flex items-center justify-center mb-4">
                  <Activity className="w-5 h-5 text-emerald-650" />
                </div>
                <h4 className="text-base font-black text-slate-900 uppercase">Profit & Loss ledger</h4>
                <p className="text-sm text-slate-500 mt-1 min-h-[36px]">Compares raw merchandise cost of goods against POS sales prices.</p>
              </div>
              <div className="flex gap-2 mt-4 pt-3 border-t border-[var(--border-subtle)]">
                <button 
                  onClick={() => setPreviewReport('PROFIT_LOSS')}
                  className="flex-1 bg-[var(--app-bg)] hover:bg-blue-600 hover:text-white text-slate-700 px-4 py-1.5 rounded-lg text-[13px] font-bold transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Open Report</span>
                </button>
              </div>
            </div>

            {/* GST */}
            <div className="bg-[var(--surface)] border border-[var(--border-default)] p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between group rounded-2xl">
              <div>
                <div className="w-10 h-11 rounded-xl bg-teal-50 flex items-center justify-center mb-4">
                  <Layers className="w-5 h-5 text-teal-605" />
                </div>
                <h4 className="text-base font-black text-slate-900 uppercase">GST Tax Liability records</h4>
                <p className="text-sm text-slate-500 mt-1 min-h-[36px]">Computes CGST (9%) and SGST (9%) taxes on invoices matching tax codes.</p>
              </div>
              <div className="flex gap-2 mt-4 pt-3 border-t border-[var(--border-subtle)]">
                <button 
                  onClick={() => setPreviewReport('GST_REPORT')}
                  className="flex-1 bg-[var(--app-bg)] hover:bg-blue-600 hover:text-white text-slate-700 px-4 py-1.5 rounded-lg text-[13px] font-bold transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Open Report</span>
                </button>
              </div>
            </div>

            {/* CUSTOMER LIFE LTV */}
            <div className="bg-[var(--surface)] border border-[var(--border-default)] p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between group rounded-2xl">
              <div>
                <div className="w-10 h-11 rounded-xl bg-purple-50 flex items-center justify-center mb-4">
                  <FolderOpen className="w-5 h-5 text-purple-650" />
                </div>
                <h4 className="text-base font-black text-slate-900 uppercase">Customer lifetime values (LTV)</h4>
                <p className="text-sm text-slate-500 mt-1 min-h-[36px]">Ranks customers by billing count, lifetime spent, and last visited dates.</p>
              </div>
              <div className="flex gap-2 mt-4 pt-3 border-t border-[var(--border-subtle)]">
                <button 
                  onClick={() => setPreviewReport('CUSTOMER_LTV')}
                  className="flex-1 bg-[var(--app-bg)] hover:bg-blue-600 hover:text-white text-slate-700 px-4 py-1.5 rounded-lg text-[13px] font-bold transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Open Report</span>
                </button>
              </div>
            </div>

            {/* DEAD STOCK */}
            <div className="bg-[var(--surface)] border border-[var(--border-default)] p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between group rounded-2xl">
              <div>
                <div className="w-10 h-11 rounded-xl bg-slate-50 flex items-center justify-center mb-4">
                  <AlertTriangle className="w-5 h-5 text-slate-655" />
                </div>
                <h4 className="text-base font-black text-slate-900 uppercase">Dormant Capital (Dead stock)</h4>
                <p className="text-sm text-slate-500 mt-1 min-h-[36px]">Exposes product variants sitting on shelves with 0 billing actions.</p>
              </div>
              <div className="flex gap-2 mt-4 pt-3 border-t border-[var(--border-subtle)]">
                <button 
                  onClick={() => setPreviewReport('DEAD_STOCK')}
                  className="flex-1 bg-[var(--app-bg)] hover:bg-blue-600 hover:text-white text-slate-700 px-4 py-1.5 rounded-lg text-[13px] font-bold transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Open Report</span>
                </button>
              </div>
            </div>

            {/* DAILY SALES SUMMARY */}
            <div className="bg-[var(--surface)] border border-[var(--border-default)] p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between group rounded-2xl">
              <div>
                <div className="w-10 h-11 rounded-xl bg-blue-50 flex items-center justify-center mb-4">
                  <Calendar className="w-5 h-5 text-blue-600" />
                </div>
                <h4 className="text-base font-black text-slate-900 uppercase">Daily Sales Summaries</h4>
                <p className="text-sm text-slate-500 mt-1 min-h-[36px]">Aggregates chronological daily invoices, gross taxes, and net business settled.</p>
              </div>
              <div className="flex gap-2 mt-4 pt-3 border-t border-[var(--border-subtle)]">
                <button 
                  onClick={() => setPreviewReport('DAILY_SALES_SUMMARY')}
                  className="flex-1 bg-[var(--app-bg)] hover:bg-blue-600 hover:text-white text-slate-700 px-4 py-1.5 rounded-lg text-[13px] font-bold transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Open Report</span>
                </button>
              </div>
            </div>

            {/* MONTHLY SALES SUMMARY */}
            <div className="bg-[var(--surface)] border border-[var(--border-default)] p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between group rounded-2xl">
              <div>
                <div className="w-10 h-11 rounded-xl bg-purple-50 flex items-center justify-center mb-4">
                  <TrendingUp className="w-5 h-5 text-purple-600" />
                </div>
                <h4 className="text-base font-black text-slate-900 uppercase">Monthly Sales Registers</h4>
                <p className="text-sm text-slate-500 mt-1 min-h-[36px]">Exhibits monthly financial benchmarks, waivers, and net consolidated turnover.</p>
              </div>
              <div className="flex gap-2 mt-4 pt-3 border-t border-[var(--border-subtle)]">
                <button 
                  onClick={() => setPreviewReport('MONTHLY_SALES_SUMMARY')}
                  className="flex-1 bg-[var(--app-bg)] hover:bg-blue-600 hover:text-white text-slate-700 px-4 py-1.5 rounded-lg text-[13px] font-bold transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Open Report</span>
                </button>
              </div>
            </div>

            {/* PAYMENT MODE ANALYSIS */}
            <div className="bg-[var(--surface)] border border-[var(--border-default)] p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between group rounded-2xl">
              <div>
                <div className="w-10 h-11 rounded-xl bg-orange-50 flex items-center justify-center mb-4">
                  <Coins className="w-5 h-5 text-orange-600" />
                </div>
                <h4 className="text-base font-black text-slate-900 uppercase">Payment Channels Analysis</h4>
                <p className="text-sm text-slate-500 mt-1 min-h-[36px]">Breaks down billing settlements by CASH vs UPI vs electronic CARD percentages.</p>
              </div>
              <div className="flex gap-2 mt-4 pt-3 border-t border-[var(--border-subtle)]">
                <button 
                  onClick={() => setPreviewReport('PAYMENT_MODE_ANALYSIS')}
                  className="flex-1 bg-[var(--app-bg)] hover:bg-blue-600 hover:text-white text-slate-700 px-4 py-1.5 rounded-lg text-[13px] font-bold transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Open Report</span>
                </button>
              </div>
            </div>

            {/* CUSTOMER RETENTION ANALYSIS */}
            <div className="bg-[var(--surface)] border border-[var(--border-default)] p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between group rounded-2xl">
              <div>
                <div className="w-10 h-11 rounded-xl bg-emerald-50 flex items-center justify-center mb-4">
                  <ShoppingCart className="w-5 h-5 text-emerald-600" />
                </div>
                <h4 className="text-base font-black text-slate-900 uppercase">Client Retention Retention</h4>
                <p className="text-sm text-slate-500 mt-1 min-h-[36px]">Audits customer recency intervals to identify active vs churning ledgers.</p>
              </div>
              <div className="flex gap-2 mt-4 pt-3 border-t border-[var(--border-subtle)]">
                <button 
                  onClick={() => setPreviewReport('CUSTOMER_RETENTION_ANALYSIS')}
                  className="flex-1 bg-[var(--app-bg)] hover:bg-blue-600 hover:text-white text-slate-700 px-4 py-1.5 rounded-lg text-[13px] font-bold transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Open Report</span>
                </button>
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* Light box viewer report viewport modals */}
      {renderInteractiveReportModal()}

    </div>
  );
};
