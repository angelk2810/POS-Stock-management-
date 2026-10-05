const fs = require('fs');
const path = require('path');

const componentsDir = path.resolve(__dirname, 'components');

// ============================================================
// UTILITY: Safe replace with logging
// ============================================================
function safeReplace(content, find, replace, label) {
  if (content.includes(find)) {
    content = content.replace(find, replace);
    console.log(`  ✓ ${label}`);
  }
  return content;
}

// ============================================================
// GLOBAL PASSES ON ALL COMPONENT FILES
// ============================================================
const allFiles = [
  'CategoriesModule.tsx',
  'Reports.tsx',
  'SalesLedger.tsx',
  'BulkImport.tsx',
  'BulkUpdate.tsx',
  'BarcodeManager.tsx',
  'StockMovementLog.tsx',
  'StockMovementModal.tsx',
  'ProductForm.tsx',
];

allFiles.forEach(file => {
  const filePath = path.join(componentsDir, file);
  if (!fs.existsSync(filePath)) { console.log(`Skipped: ${file} (not found)`); return; }

  let content = fs.readFileSync(filePath, 'utf-8');
  const original = content;
  console.log(`\nProcessing: ${file}`);

  // ============================================================
  // PASS 2: PAGE HEADERS
  // ============================================================
  // Upgrade h1 titles to 42px extrabold
  content = content.replace(
    /className="text-3xl font-bold text-slate-900 tracking-tight/g,
    'className="text-[36px] font-extrabold text-slate-900 tracking-tight'
  );
  content = content.replace(
    /className="text-4xl font-bold text-slate-900 tracking-tight/g,
    'className="text-[42px] font-extrabold text-slate-900 tracking-tight'
  );
  content = content.replace(
    /className="text-4xl font-extrabold text-slate-900 tracking-tight/g,
    'className="text-[42px] font-extrabold text-slate-900 tracking-tight'
  );

  // Header cards - premium elevation
  content = content.replace(
    /bg-white border border-slate-200\/60 shadow-sm([^"]*?)p-8 rounded-2xl/g,
    'bg-white border border-slate-200/60 shadow-[0_1px_3px_rgba(0,0,0,0.04)]$1p-8 rounded-2xl'
  );

  // ============================================================
  // PASS 3: FILTER TOOLBARS
  // ============================================================
  // Tint filter backgrounds
  content = content.replace(
    /bg-slate-50\/80 backdrop-blur-sm border border-slate-200\/60/g,
    'bg-slate-50/50 border border-slate-200/40 shadow-xs'
  );

  // Search inputs - premium height and focus
  content = content.replace(
    /pl-11 pr-4 py-3 text-base font-semibold rounded-xl/g,
    'pl-12 pr-4 py-3 h-12 text-base font-semibold rounded-xl shadow-xs'
  );

  // Filter dropdown select heights
  content = content.replace(
    /px-4 py-2\.5 rounded-xl/g,
    'px-4 py-3 h-12 rounded-xl'
  );

  // ============================================================
  // PASS 4: TABLES
  // ============================================================

  // Table header backgrounds - lighter, cleaner
  content = content.replace(
    /bg-slate-50 border-b border-slate-200 text-\[#0F172A\] text-sm font-semibold/g,
    'bg-slate-50/80 border-b border-slate-200/60 text-slate-500 text-sm font-semibold'
  );
  content = content.replace(
    /bg-\[#E2E8F0\] border-b border-slate-200 text-\[#0F172A\] text-sm font-bold/g,
    'bg-slate-50/80 border-b border-slate-200/60 text-slate-500 text-sm font-semibold'
  );
  content = content.replace(
    /bg-\[#E2E8F0\] border-b border-slate-200 text-\[#0F172A\] text-sm font-semibold/g,
    'bg-slate-50/80 border-b border-slate-200/60 text-slate-500 text-sm font-semibold'
  );

  // Table body - zebra striping
  content = content.replace(
    /bg-white divide-y divide-slate-100 text-\[#0F172A\] text-base/g,
    'bg-white divide-y divide-slate-100/80 text-slate-800 text-base'
  );
  content = content.replace(
    /bg-white divide-y divide-slate-100 text-\[#0F172A\] text-sm/g,
    'bg-white divide-y divide-slate-100/80 text-slate-800 text-base'
  );

  // Table row hover - premium blue tint
  content = content.replace(
    /hover:bg-blue-50\/50 even:bg-slate-50\/40/g,
    'hover:bg-blue-50/40 even:bg-slate-50/30 transition-colors duration-150'
  );
  content = content.replace(
    /hover:bg-\[#F1F5F9\]/g,
    'hover:bg-blue-50/40 even:bg-slate-50/30 transition-colors duration-150'
  );
  content = content.replace(
    /hover:bg-slate-50\/50 transition-colors/g,
    'hover:bg-blue-50/40 even:bg-slate-50/30 transition-colors duration-150'
  );

  // Selected row - stronger indicator
  content = content.replace(
    /bg-blue-50\/40 border-l-4 border-blue-600 shadow-inner/g,
    'bg-blue-50/50 border-l-[3px] border-blue-600'
  );
  content = content.replace(
    /bg-blue-50\/70 border-l-4 border-l-\[#2563EB\]/g,
    'bg-blue-50/50 border-l-[3px] border-blue-600'
  );

  // Table container shadow
  content = content.replace(
    /outline-none bg-white border border-slate-200\/60 shadow-sm rounded-xl/g,
    'outline-none bg-white border border-slate-200/60 shadow-[0_1px_3px_rgba(0,0,0,0.04)] rounded-2xl'
  );

  // ============================================================
  // PASS 5: BADGES & STATUS PILLS
  // ============================================================

  // Success badges
  content = content.replace(
    /bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-xs/g,
    'bg-emerald-50 text-emerald-700 border border-emerald-200/60 shadow-xs'
  );

  // Warning badges
  content = content.replace(
    /bg-amber-50 text-amber-700 border border-amber-200 shadow-xs/g,
    'bg-amber-50 text-amber-700 border border-amber-200/60 shadow-xs'
  );

  // Critical badges
  content = content.replace(
    /bg-rose-50 text-rose-700 border border-rose-200 shadow-xs/g,
    'bg-rose-50 text-rose-700 border border-rose-200/60 shadow-xs'
  );

  // Primary badges
  content = content.replace(
    /bg-blue-50 text-blue-700 border-blue-200 shadow-xs/g,
    'bg-blue-50 text-blue-700 border border-blue-200/60 shadow-xs'
  );

  // ============================================================
  // PASS 6: BUTTONS
  // ============================================================

  // Primary buttons - premium blue with shadow
  content = content.replace(
    /bg-blue-600 hover:bg-blue-700 text-white shadow-sm shadow-blue-500\/20/g,
    'bg-blue-600 hover:bg-blue-700 text-white shadow-sm shadow-blue-500/20 active:scale-[0.98] transition-all duration-150'
  );
  content = content.replace(
    /bg-\[#2563EB\] hover:bg-blue-700 text-white/g,
    'bg-blue-600 hover:bg-blue-700 text-white shadow-sm shadow-blue-500/20 active:scale-[0.98]'
  );

  // Secondary buttons - white elevated
  content = content.replace(
    /bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 hover:shadow-xs/g,
    'bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 shadow-xs hover:shadow-sm transition-all duration-150'
  );
  content = content.replace(
    /bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200/g,
    'bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 shadow-xs hover:shadow-sm transition-all duration-150'
  );

  // Delete/danger buttons - soft red
  content = content.replace(
    /text-rose-600 hover:text-rose-700 hover:bg-rose-50/g,
    'text-rose-600 hover:text-rose-700 hover:bg-rose-50 transition-all duration-150'
  );

  // ============================================================
  // PASS 7: DEPTH & SHADOWS
  // ============================================================

  // Card shadows - premium elevation
  content = content.replace(
    /bg-white border border-slate-200\/60 shadow-sm([^"]*?)rounded-2xl/g,
    'bg-white border border-slate-200/60 shadow-[0_1px_3px_rgba(0,0,0,0.04)]$1rounded-2xl'
  );

  // Footer bars - clean white instead of grey
  content = content.replace(
    /bg-white border-t border-slate-100 px-6 py-4 text-xs text-slate-400/g,
    'bg-white/80 border-t border-slate-100 px-6 py-4 text-xs text-slate-400'
  );

  // Pagination footer
  content = content.replace(
    /bg-white border-t border-slate-100 px-6 py-4 flex flex-col sm:flex-row justify-between items-center gap-3 text-sm font-semibold text-slate-600/g,
    'bg-white/80 border-t border-slate-100 px-6 py-5 flex flex-col sm:flex-row justify-between items-center gap-4 text-sm font-medium text-slate-500'
  );

  // ============================================================
  // PASS 8: TYPOGRAPHY
  // ============================================================

  // Section headings inside cards
  content = content.replace(
    /text-lg font-extrabold text-slate-900 tracking-tight/g,
    'text-xl font-bold text-slate-900 tracking-tight'
  );

  // Metadata font smoothing
  content = content.replace(
    /text-\[10px\] text-slate-400 uppercase font-black/g,
    'text-xs text-slate-400 uppercase font-bold'
  );

  // Fix any excessive text-[10px] labels to text-xs
  content = content.replace(
    /text-\[10px\] uppercase font-black tracking-wider/g,
    'text-xs uppercase font-bold tracking-wider'
  );

  // Keyboard hint strips
  content = content.replace(
    /text-\[9px\] shadow-xs/g,
    'text-[10px] shadow-xs'
  );

  if (content !== original) {
    fs.writeFileSync(filePath, content, 'utf-8');
    console.log(`  ✅ Saved: ${file}`);
  } else {
    console.log(`  ⏭️  No changes: ${file}`);
  }
});

console.log('\nAll component passes complete.');
