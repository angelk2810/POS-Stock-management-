const fs = require('fs');
const path = require('path');

const appPath = path.resolve(__dirname, 'App.tsx');
let app = fs.readFileSync(appPath, 'utf-8');

// ============================================================
// PASS 1: SIDEBAR & NAVIGATION
// ============================================================

// 1a. NavButton active state - replace flat bg with left-border indicator
app = app.replace(
  `active 
            ? 'bg-[#EEF4FF] text-[#2563EB]' 
            : 'text-[#64748B] hover:bg-slate-50 hover:text-slate-900'`,
  `active 
            ? 'bg-blue-50/70 text-blue-700 font-bold shadow-xs' 
            : 'text-slate-500 hover:bg-slate-50/80 hover:text-slate-800'`
);

// 1b. Sidebar container - enhance with better background
app = app.replace(
  "className={`bg-white border-r border-slate-250 flex flex-col p-4 gap-4 no-print z-40 transition-all duration-300 ease-in-out shadow-sm shadow-slate-100/50",
  "className={`bg-white border-r border-slate-200/80 flex flex-col p-4 gap-3 no-print z-40 transition-all duration-300 ease-in-out shadow-[2px_0_8px_rgba(0,0,0,0.03)]"
);

// 1c. Sidebar system health panel - softer
app = app.replace(
  'className="p-3 bg-slate-50 rounded-xl border border-slate-200/60 w-full"',
  'className="p-3.5 bg-gradient-to-b from-slate-50 to-slate-50/50 rounded-xl border border-slate-200/60 w-full"'
);

// ============================================================
// PASS 2: PAGE HEADERS - Inventory Products
// ============================================================

// 2a. Inventory Products header title
app = app.replace(
  `<h1 className="text-4xl font-bold text-slate-900 tracking-tight flex items-center gap-2">📦 Master Product Catalog</h1>`,
  `<h1 className="text-[42px] font-extrabold text-slate-900 tracking-tight flex items-center gap-3">📦 Master Product Catalog</h1>`
);

// 2b. Inventory products subtitle
app = app.replace(
  `<p className="text-slate-500 text-base font-medium mt-1">Manage electrical variants, specifications, pricing, and stock health</p>`,
  `<p className="text-slate-500 text-base font-medium mt-2">Manage electrical variants, specifications, pricing, and stock health</p>`
);

// 2c. Add product button - premium
app = app.replace(
  `className="flex items-center gap-2 bg-[#2563EB] hover:bg-blue-700 text-white font-bold px-6 py-3.5 rounded-xl shadow-md shadow-blue-500/10 transition-all text-base"`,
  `className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-3.5 rounded-xl shadow-sm shadow-blue-500/20 transition-all duration-150 active:scale-[0.98] text-base"`
);

// ============================================================
// PASS 3: FILTER TOOLBARS - Inventory Products
// ============================================================

// 3a. Products filter panel - tinted background
app = app.replace(
  `className="bg-white rounded-2xl border border-slate-200 p-5 mb-6 shadow-[0_2px_8px_rgba(0,0,0,0.03)] flex flex-col gap-4"`,
  `className="bg-slate-50/60 rounded-2xl border border-slate-200/40 p-6 mb-6 shadow-xs flex flex-col gap-5"`
);

// 3b. Products search input - larger, premium
app = app.replace(
  `className="w-full bg-slate-50 border border-slate-200 hover:border-slate-300 focus:border-[#2563EB] pl-10 pr-4 py-2.5.5 rounded-xl text-base outline-none transition-all font-semibold text-slate-800"`,
  `className="w-full h-12 bg-white border border-slate-200 hover:border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 pl-11 pr-4 rounded-xl text-base outline-none transition-all duration-150 font-semibold text-slate-800 shadow-xs"`
);

// 3c. Category filter dropdown - larger, premium
app = app.replace(
  `className="w-full bg-slate-50 border border-slate-200 hover:border-slate-300 focus:border-[#2563EB] px-4 py-2.5.5 rounded-xl text-base outline-none transition-all font-bold text-slate-700 cursor-pointer"`,
  `className="w-full h-12 bg-white border border-slate-200 hover:border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 px-4 rounded-xl text-base outline-none transition-all duration-150 font-semibold text-slate-700 cursor-pointer shadow-xs"`
);

// 3d. Stock status filter dropdown - same treatment (second occurrence)
// Need to handle the second instance of the same className pattern for stock status
// Both the category and stock status selects were identical, but since we already replaced all,
// we just need to handle the Reset button

// 3e. Reset Filters button - refined
app = app.replace(
  `className="w-full bg-slate-50 hover:bg-rose-50 border border-slate-200 hover:border-rose-200 text-slate-600 hover:text-rose-600 font-bold py-2.5.5 px-4 rounded-xl text-base transition-all shadow-sm cursor-pointer"`,
  `className="w-full h-12 bg-white hover:bg-rose-50 border border-slate-200 hover:border-rose-200 text-slate-600 hover:text-rose-600 font-semibold px-4 rounded-xl text-base transition-all duration-150 shadow-xs cursor-pointer"`
);

// ============================================================
// PASS 4: TABLES - Inventory Products
// ============================================================

// 4a. Table container
app = app.replace(
  `className="bg-white rounded-2xl border border-slate-200 shadow-[0_2px_8px_rgba(0,0,0,0.04)] overflow-hidden"`,
  `className="bg-white rounded-2xl border border-slate-200/60 shadow-sm overflow-hidden"`
);

// 4b. Table header row
app = app.replace(
  `className="bg-slate-50/80 border-b border-slate-200 text-slate-500 text-sm font-bold uppercase tracking-wider"`,
  `className="bg-slate-50 border-b border-slate-200/60 text-slate-500 text-sm font-semibold uppercase tracking-wider"`
);

// 4c. Table data rows - zebra + hover
app = app.replace(
  `className="hover:bg-slate-50/50 transition-colors group"`,
  `className="hover:bg-blue-50/40 even:bg-slate-50/30 transition-colors duration-150 group"`
);

// 4d. Spec attribute pills - purple theme
app = app.replace(
  `className="text-sm bg-slate-100 border border-slate-200/50 px-3 py-0.5 rounded-md text-slate-600 font-medium"`,
  `className="text-[13px] bg-purple-50 border border-purple-200/60 px-3 py-1 rounded-full text-purple-700 font-semibold"`
);

// 4e. Status badges - Low Stock
app = app.replace(
  `className="bg-rose-50 text-rose-600 px-4 py-1 rounded-full text-sm font-bold border border-rose-100 inline-block"`,
  `className="bg-rose-50 text-rose-700 px-4 py-1.5 rounded-full text-[13px] font-semibold border border-rose-200/60 inline-block shadow-xs"`
);

// 4f. Status badges - Healthy
app = app.replace(
  `className="bg-emerald-50 text-emerald-600 px-4 py-1 rounded-full text-sm font-bold border border-emerald-100 inline-block"`,
  `className="bg-emerald-50 text-emerald-700 px-4 py-1.5 rounded-full text-[13px] font-semibold border border-emerald-200/60 inline-block shadow-xs"`
);

// 4g. Edit/Delete action buttons - replace plain text with styled buttons
app = app.replace(
  `className="text-[#2563EB] hover:text-blue-800 font-bold text-sm cursor-pointer inline-flex"`,
  `className="text-blue-600 hover:text-blue-800 hover:bg-blue-50 font-semibold text-sm cursor-pointer inline-flex px-3 py-1.5 rounded-lg border border-transparent hover:border-blue-200/60 transition-all duration-150"`
);
app = app.replace(
  `className="text-rose-500 hover:text-rose-700 font-bold text-sm cursor-pointer inline-flex"`,
  `className="text-rose-500 hover:text-rose-700 hover:bg-rose-50 font-semibold text-sm cursor-pointer inline-flex px-3 py-1.5 rounded-lg border border-transparent hover:border-rose-200/60 transition-all duration-150"`
);

// 4h. Inventory sub-tab nav - polish
app = app.replace(
  `className="bg-white border border-[#E2E8F0] p-2 rounded-xl no-print shadow-[0_1px_3px_rgba(0,0,0,0.02)]"`,
  `className="bg-white border border-slate-200/60 p-2 rounded-2xl no-print shadow-xs"`
);

// 4i. Category badge in product row
app = app.replace(
  `className="text-[10px] bg-blue-50 border border-blue-100 text-[#2563EB] font-bold px-3.5 py-0.5 rounded-full font-sans shadow-sm"`,
  `className="text-[13px] bg-blue-50 border border-blue-200/60 text-blue-700 font-semibold px-3 py-1 rounded-full"`
);

// ============================================================
// PASS 5: DASHBOARD HEADER REFINEMENTS
// ============================================================

// 5a. Main page background in App.tsx
app = app.replace(
  `className="flex h-screen bg-[#F8FAFC] text-slate-800 overflow-hidden font-sans select-none"`,
  `className="flex h-screen bg-[#F1F5F9] text-slate-800 overflow-hidden font-sans select-none"`
);

// 5b. Main content area background
app = app.replace(
  "className={`flex-1 overflow-auto bg-[#F8FAFC] text-slate-900 relative transition-all duration-300",
  "className={`flex-1 overflow-auto bg-[#F1F5F9] text-slate-900 relative transition-all duration-300"
);

// ============================================================
// SAVE
// ============================================================
fs.writeFileSync(appPath, app, 'utf-8');
console.log('App.tsx updated successfully (Passes 1-5)');
