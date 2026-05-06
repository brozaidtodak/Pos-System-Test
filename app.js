const SUPABASE_URL = "https://asehjdnfzoypbwfeazra.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFzZWhqZG5mem95cGJ3ZmVhenJhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU2MjE2NjMsImV4cCI6MjA5MTE5NzY2M30.34nAhmcNO_xN73OdsyxayKl_jipIk-M8DIBgibAOdaI";

let db = null;
try {
    if(SUPABASE_URL === "PASTE_URL_DISINI") {
        console.warn("SILA MASUKKAN SUPABASE URL DAN KEY!");
    } else {
        db = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
    }
} catch (e) {
    console.error("API Error: ", e.message);
}


// Money helper: avoid float-drift accumulation. Use after every += / arithmetic
// that contributes to a money total. Display layers can still toFixed(2).
window.round2 = function(n) { return Math.round((parseFloat(n) || 0) * 100) / 100; };
const round2 = window.round2;

// Loading overlay: full-screen translucent block during long ops.
window.showLoading = function(msg) {
    let el = document.getElementById('__globalLoadingOverlay');
    if (!el) {
        el = document.createElement('div');
        el.id = '__globalLoadingOverlay';
        el.style.cssText = 'position:fixed; inset:0; background:rgba(15,23,42,.55); z-index:9998; display:flex; align-items:center; justify-content:center; backdrop-filter:blur(2px);';
        el.innerHTML = '<div style="background:#fff; padding:24px 32px; border-radius:12px; display:flex; align-items:center; gap:14px; box-shadow:0 8px 32px rgba(0,0,0,.2); min-width:240px;"><div style="width:24px; height:24px; border:3px solid #e5e7eb; border-top-color:#CD7C32; border-radius:50%; animation:spin 0.8s linear infinite;"></div><div id="__globalLoadingMsg" style="font-weight:600; color:#111; font-size:14px;">Loading...</div></div>';
        const style = document.createElement('style');
        style.textContent = '@keyframes spin{to{transform:rotate(360deg)}}';
        el.appendChild(style);
        document.body.appendChild(el);
    }
    document.getElementById('__globalLoadingMsg').textContent = msg || 'Loading...';
    el.style.display = 'flex';
};
window.hideLoading = function() {
    const el = document.getElementById('__globalLoadingOverlay');
    if (el) el.style.display = 'none';
};

// Toast: non-blocking notification. Replaces alert() for soft messages.
window.showToast = function(msg, type) {
    type = type || 'info';
    const colors = {
        info:    { bg:'#3b82f6', icon:'i' },
        success: { bg:'#10b981', icon:'✓' },
        warning: { bg:'#f59e0b', icon:'⚠' },
        error:   { bg:'#dc2626', icon:'✕' }
    };
    const c = colors[type] || colors.info;
    const el = document.createElement('div');
    el.style.cssText = 'position:fixed; top:20px; right:20px; background:'+c.bg+'; color:#fff; padding:12px 18px; border-radius:8px; z-index:9999; font-weight:600; box-shadow:0 4px 16px rgba(0,0,0,.2); max-width:340px; font-size:13.5px; display:flex; gap:10px; align-items:center; opacity:0; transform:translateX(20px); transition:opacity .25s, transform .25s;';
    el.innerHTML = '<span style="font-size:16px;">'+c.icon+'</span><span>'+String(msg).replace(/</g,'&lt;')+'</span>';
    document.body.appendChild(el);
    requestAnimationFrame(() => { el.style.opacity='1'; el.style.transform='translateX(0)'; });
    setTimeout(() => { el.style.opacity='0'; el.style.transform='translateX(20px)'; setTimeout(()=>el.remove(), 280); }, type==='error' ? 4500 : 2800);
};

// Global ESC handler: close any visible modal/overlay.
document.addEventListener('keydown', function(e){
    if (e.key !== 'Escape') return;
    // Find topmost visible modal-like overlay
    const candidates = document.querySelectorAll([
        '#pinLoginOverlay', '#staffWelcomeModal', '#receiptModal',
        '#customerLoginGate', '#smModalOverlay.active', '.sh-modal-overlay.active',
        '.sy-conflict-modal-overlay.sy-modal-active'
    ].join(','));
    for (let i = candidates.length - 1; i >= 0; i--) {
        const el = candidates[i];
        const cs = window.getComputedStyle(el);
        if (cs.display !== 'none' && cs.visibility !== 'hidden') {
            if (el.classList.contains('active')) el.classList.remove('active');
            else el.style.display = 'none';
            return;
        }
    }
});

// Shop info — used in receipt header, defaults if not configured.
window.getShopInfo = function() {
    let s = {};
    try { s = JSON.parse(localStorage.getItem('complianceSettings_v1')) || {}; } catch(e){}
    const defaults = {
        name: '10 CAMP',
        address: '',
        phone: '',
        email: 'zaid@10camp.com',
        ssm: '',
        footer: 'THANK YOU FOR SHOPPING AT 10 CAMP'
    };
    return Object.assign({}, defaults, (s && s.shop) || {});
};

// Pagination Defaults
let publicCurrentPage = 1;
let posCurrentPage = 1;
const itemsPerPage = 21;
let lastPosSearchTerm = "";

window.changePublicPage = function(dir) {
    publicCurrentPage += dir;
    renderPublicStorefront();
    // Scroll slightly up or to top of catalog (optional, but good UX)
    document.getElementById('publicProductsList').parentElement.scrollTop = 0;
}
window.changePosPage = function(dir) {
    posCurrentPage += dir;
    renderPOS(lastPosSearchTerm);
    document.getElementById('productsList').parentElement.scrollTop = 0;
}
// Memory State
let masterProducts = [];

// Single source of truth for "is this product live in cashier?"
// Strict: only `true` counts as published. NULL / false / undefined = draft.
window.isPublished = function(p) { return !!p && p.is_published === true; };

let pettyCashLedger = [];
let customerIssues = [];
let globalMemo = { active: false, text: "" };

// Staff Scheduling Roster
let staffSchedules = [];
let pendingSchedules = [];

let publicHolidays = [
    '2026-01-01', '2026-03-20', '2026-03-21', '2026-03-22', '2026-03-23',
    '2026-05-01', '2026-05-27', '2026-06-01', '2026-06-17', '2026-08-31',
    '2026-09-16', '2026-12-11'
];

let hrSettings = {
    wedBreak: "Tiada Rehat (Non-Stop)",
    friBreak: "1:00 PM - 3:00 PM (Solat)",
    normalBreak: "2:00 PM - 3:00 PM"
};

let activeRosterMonth = new Date().getMonth();
let activeRosterYear = new Date().getFullYear();

window.setRosterMonth = function(m) {
    activeRosterMonth = parseInt(m);
    renderStaffSchedule();
};

window.setRosterYear = function(y) {
    activeRosterYear = parseInt(y);
    renderStaffSchedule();
};

let moyySettings = {
    target: 10000,
    commRate: 5
};

let staffProfiles = [
    { name: "Aliff", leave_balance: 14 },
    { name: "Farhan Moyy", leave_balance: 14 },
    { name: "Zack", leave_balance: 12 },
    { name: "Ariff", leave_balance: 10 },
    { name: "Irfan", leave_balance: 10 },
    { name: "Tarmizi", leave_balance: 8 },
    { name: "Fahmi", leave_balance: 8 }
];

let inventoryBatches = [];

let salesHistory = [];
let inventoryTransactions = [];
let purchaseOrders = [];
let poDraftItems = [];

let customersData = [];

let financeRecords = [];
let financeChartInstance = null;
let cart = [];
let salesChartInst = null; // Chart.js Object

// ===================================
// INIT & NAVIGATION
// ===================================
function toggleSidebar() {
    document.getElementById("appSidebar").classList.toggle("open");
    document.getElementById("sidebarOverlay").classList.toggle("active");
}
window.toggleSidebar = toggleSidebar;

function switchHub(sectionIds, title, btnElement) {
    // Hide all sections first
    document.querySelectorAll('.tab-section').forEach(s => s.style.display = 'none');
    
    // Show requested sections
    sectionIds.forEach(id => {
        const el = document.getElementById(id);
        if(el) el.style.display = 'block';
    });
    
    // Set Window Title
    document.getElementById('pageTitle').textContent = title;
    
    // Update active state in sidebar
    document.querySelectorAll('.menu-item').forEach(item => item.classList.remove('active'));
    if(btnElement) btnElement.classList.add('active');
    
    // Close sidebar on mobile if open
    const sidebar = document.getElementById("appSidebar");
    if(sidebar && sidebar.classList.contains("open")) toggleSidebar();

    // Contextual renders based on the hub being opened
    if(sectionIds.includes('homeSection')) renderDashboard();
    if(sectionIds.includes('posSection')) {
        const term = document.getElementById("posSearchBox") ? document.getElementById("posSearchBox").value : "";
        renderPOS(term);
    }
    if(sectionIds.includes('stockTakeSection')) renderAuditCards();

    if(sectionIds.includes('mgmtPlaceholders')) renderMgmtPlaceholders();
    if(sectionIds.includes('rosterSection')) renderStaffSchedule();
}
window.switchHub = switchHub;



window.togglePosLayoutMode = function() {
    const isMobile = document.body.classList.toggle('pos-mobile-mode');
    localStorage.setItem('posMode', isMobile ? 'mobile' : 'desktop');
}
window.toggleMobileCartSheet = function() {
    const cartSec = document.getElementById('posCartDrawer');
    if(cartSec) cartSec.classList.toggle('drawer-open');
}



let __initAppCount = 0;
async function initApp() {
    __initAppCount++;
    const isFirstLoad = __initAppCount === 1;
    if (isFirstLoad && typeof showLoading === 'function') showLoading('Memuatkan data dari awan...');
    try {
        console.log("Loading Cloud Omnichannel Data...");
        let { data: master } = await db.from('products_master').select('*');
        if(master) masterProducts = master;

        let { data: batches } = await db.from('inventory_batches').select('*').order('inbound_date', {ascending: true});
        if(batches) inventoryBatches = batches;

        let { data: txns } = await db.from('inventory_transactions').select('*').order('created_at', {ascending: false});
        if(txns) inventoryTransactions = txns;

        // Sprint 2.1+2.2: load real PO + suppliers tables
        try { if(typeof loadSuppliers === 'function') await loadSuppliers(); } catch(e) { console.warn('loadSuppliers:', e); }
        try { if(typeof loadPosV2 === 'function') await loadPosV2(); } catch(e) { console.warn('loadPosV2:', e); }
        // Sprint 3.4: load active reservations
        try { if(typeof loadReservations === 'function') await loadReservations(); } catch(e) { console.warn('loadReservations:', e); }
        // p4_4: low-stock notification check (deferred to next tick after render)
        setTimeout(() => { if(typeof checkLowStockNotify === 'function') checkLowStockNotify(); }, 5000);
        // p7_3: load promo engine rules
        try { if(typeof loadPromotions === 'function') await loadPromotions(); } catch(e) { console.warn('loadPromotions:', e); }

        // RENDER FRONTEND INSTANTLY BEFORE ADMIN BACKEND FETCHES
        renderPublicStorefront();
        renderPOS();

                try { renderQuotePOS(); } catch(e){}
        let { data: quotes } = await db.from('quotations_log').select('*').order('created_at', {ascending: false});
        if(quotes) quoteHistoryLogs = quotes;

        let { data: sales } = await db.from('sales_history').select('*').order('created_at', {ascending: false});
        if(sales) salesHistory = [...salesHistory, ...sales];

        let { data: custs } = await db.from('customers').select('*');
        if(custs) customersData = custs;
        
        let { data: fin } = await db.from('finance_records').select('*').order('year', {ascending: false});
        if(fin) financeRecords = fin;
        
        let { data: rSched } = await db.from('roster_schedules').select('*');
        if(rSched && rSched.length > 0) {
            staffSchedules = rSched;
        } else {
            // Auto-Generate April Loop if EVERYTHING is completely raw
            let pattern = ["Zack", "Aliff", "Fahmi", "Tarmizi", "Irfan", "Ariff", "Farhan Moyy"];
            let genSchedules = [];
            let todayMs = Date.now();
            for(let d=1; d<=30; d++) {
                let st = pattern[(d-1) % 7];
                let dStr = d < 10 ? '0'+d : d;
                genSchedules.push({
                    id: todayMs + d,
                    staff_name: st,
                    date: '2026-04-' + dStr,
                    shift: 'OFF',
                    mc_name: ''
                });
            }
            staffSchedules = genSchedules;
            try { await db.from('roster_schedules').insert(genSchedules); } catch(e){}
        }

        let { data: pSched } = await db.from('pending_requests').select('*');
        if(pSched && pSched.length > 0) {
            pendingSchedules = pSched;
        } else {
            pendingSchedules = [];
        }

        // Tsunami Pembersihan Zombie Cache
        localStorage.removeItem('saved_staffSchedules');
        localStorage.removeItem('saved_pendingSchedules');

        // Supabase Real-time Roster Broadcaster
        if(!window.rosterSyncChannel) {
            window.rosterSyncChannel = db.channel('roster-sync-channel')
              .on('postgres_changes', { event: '*', schema: 'public', table: 'roster_schedules' }, async (payload) => {
                  let { data } = await db.from('roster_schedules').select('*');
                  if(data) {
                      staffSchedules = data;
                      if(typeof renderStaffSchedule === 'function') renderStaffSchedule();
                  }
              })
              .on('postgres_changes', { event: '*', schema: 'public', table: 'pending_requests' }, async (payload) => {
                  let { data } = await db.from('pending_requests').select('*');
                  if(data) {
                      pendingSchedules = data;
                      if(typeof renderPendingSchedules === 'function') renderPendingSchedules();
                  }
              })
              .subscribe();
        }

        renderWMS();
        if(typeof populateEditSkuList === 'function') populateEditSkuList();
        if(typeof populateMovementSkuList === 'function') populateMovementSkuList();
        renderHistory();
        renderCustomers();
        renderPromotions();
        renderDashboard();
        if(typeof renderFinance === "function") renderFinance();
        if(typeof renderWhAudit === 'function') renderWhAudit();
        if(typeof renderInventoryLedger === 'function') renderInventoryLedger();
        if(typeof renderPoSection === 'function') renderPoSection();
        if(typeof renderValuationSection === 'function') renderValuationSection();
        if(typeof renderMgmtInventory === 'function') renderMgmtInventory();
        autoClockOutUnclosed();
        if(typeof renderPersonalCommission === "function") renderPersonalCommission();
        if (isFirstLoad) handleReorderParam();
    } catch(e) {
        if (typeof showToast === 'function') showToast('Server Error: ' + e.message, 'error'); else alert('Server Error: ' + e.message);
    } finally {
        if (isFirstLoad && typeof hideLoading === 'function') hideLoading();
    }
}

// p3_2 Reorder: parse ?reorder=<base64> and pre-fill cart with matching SKUs
function handleReorderParam() {
    try {
        const params = new URLSearchParams(window.location.search);
        const b64 = params.get('reorder');
        if (!b64) return;
        const minimal = JSON.parse(decodeURIComponent(escape(atob(decodeURIComponent(b64)))));
        if (!Array.isArray(minimal) || !minimal.length) return;

        let added = 0; let missing = [];
        minimal.forEach(it => {
            const sku = it.s; const qty = parseInt(it.q)||1;
            const product = (typeof masterProducts !== 'undefined' && Array.isArray(masterProducts)) ? masterProducts.find(p => p.sku === sku) : null;
            if (!product) { missing.push(sku); return; }
            const existing = cart.find(c => c.sku === sku);
            if (existing) existing.quantity += qty;
            else cart.push({ sku, name: product.name, price: parseFloat(product.price)||0, quantity: qty });
            added++;
        });

        if (typeof renderCart === 'function') renderCart();

        const msg = added > 0
            ? `✓ ${added} item dari reorder link ditambah ke troli`+(missing.length?` (${missing.length} SKU dah tak wujud)`:'')
            : 'Reorder link rosak atau semua item dah tak available.';
        if (typeof showToast === 'function') showToast(msg, added>0?'success':'warning');

        // Clean URL so refresh tak re-trigger
        const cleanUrl = window.location.origin + window.location.pathname;
        window.history.replaceState({}, document.title, cleanUrl);
    } catch(e) {
        console.warn('[reorder] parse failed:', e);
        if (typeof showToast === 'function') showToast('Reorder link rosak (decode gagal).', 'error');
    }
}

// ===================================
// ANALYTICS DASHBOARD (FASA 4)
// ===================================
// Dashboard date range state — default Today
window.__dashRange = window.__dashRange || 'today';
window.__setDashRange = function(range, btn) {
    window.__dashRange = range;
    document.querySelectorAll('.dash-pill').forEach(p => p.classList.toggle('active', p === btn));
    const customWrap = document.getElementById('dashCustomWrap');
    if (customWrap) customWrap.classList.toggle('active', range === 'custom');
    if (range !== 'custom') renderDashboard();
};
window.__dashGoto = function(tab) {
    const item = document.querySelector('.menu-item[data-tab="'+tab+'"]');
    if (item) item.click();
    else if (typeof showToast === 'function') showToast('Menu "'+tab+'" tak dijumpai', 'warning');
};
function __getDashDateRange() {
    const r = window.__dashRange || 'today';
    const now = new Date();
    const startOf = (d) => { const x = new Date(d); x.setHours(0,0,0,0); return x; };
    const endOf   = (d) => { const x = new Date(d); x.setHours(23,59,59,999); return x; };
    if (r === 'today')     return { start: startOf(now), end: endOf(now), label: 'Today' };
    if (r === 'yesterday') { const y = new Date(now); y.setDate(y.getDate()-1); return { start: startOf(y), end: endOf(y), label: 'Yesterday' }; }
    if (r === '7d')        { const s = new Date(now); s.setDate(s.getDate()-6); return { start: startOf(s), end: endOf(now), label: 'Last 7 days' }; }
    if (r === '30d')       { const s = new Date(now); s.setDate(s.getDate()-29); return { start: startOf(s), end: endOf(now), label: 'Last 30 days' }; }
    if (r === 'mtd')       { const s = new Date(now.getFullYear(), now.getMonth(), 1); return { start: startOf(s), end: endOf(now), label: 'Month-to-date' }; }
    if (r === 'all')       return { start: null, end: null, label: 'All time' };
    if (r === 'custom')    {
        const ss = document.getElementById('dashStartDate')?.value;
        const ee = document.getElementById('dashEndDate')?.value;
        return { start: ss ? startOf(new Date(ss)) : null, end: ee ? endOf(new Date(ee)) : null, label: (ss||'?')+' → '+(ee||'?') };
    }
    return { start: null, end: null, label: '—' };
}

window.renderDashboard = function() {
    const range = __getDashDateRange();
    let filteredSales = salesHistory;
    if (range.start && range.end) {
        filteredSales = salesHistory.filter(s => {
            const sd = new Date(s.created_at);
            return sd >= range.start && sd <= range.end;
        });
    }
    const rangeLabelEl = document.getElementById('dashRangeLabel');
    if (rangeLabelEl) rangeLabelEl.textContent = '— ' + range.label;

    // 2. Compute Core Metrics
    let totalSales = 0;
    let channelFreq = {};
    let itemCounts = {};

    let statusToFulfil = 0; let statusUnpaid = 0; let statusProcessing = 0; let statusReturn = 0;

    filteredSales.forEach(sale => {
        let rev = Number(sale.total || sale.total_amount || 0);
        totalSales = round2(totalSales + rev);
        
        // Channels
        let ch = sale.channel || 'In-Store';
        channelFreq[ch] = (channelFreq[ch] || 0) + rev;

        // Status
        let st = sale.status || 'Completed';
        if(st === 'To Fulfil') statusToFulfil++;
        if(st === 'Unpaid') statusUnpaid++;
        if(st === 'Processing') statusProcessing++;
        if(st === 'Return Request') statusReturn++;

        // Best Sellers parsing
        const itemsList = typeof sale.items === 'string' ? JSON.parse(sale.items) : sale.items;
        if(Array.isArray(itemsList)) {
            itemsList.forEach(item => {
                let sKey = item.sku;
                if(!itemCounts[sKey]) itemCounts[sKey] = { name: item.name, qty: 0, revenue: 0 };
                itemCounts[sKey].qty += Number(item.quantity);
                itemCounts[sKey].revenue = round2(itemCounts[sKey].revenue + Number(item.price) * Number(item.quantity));
            });
        }
    });

    const fmtMoney = (n) => Number(n).toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    document.getElementById("dashTotalSales").textContent = fmtMoney(totalSales);
    document.getElementById("dashTotalOrders").textContent = filteredSales.length;

    // Average Order Value
    const aov = filteredSales.length ? round2(totalSales / filteredSales.length) : 0;
    const aovEl = document.getElementById("dashAOV");
    if (aovEl) aovEl.textContent = 'RM ' + fmtMoney(aov);

    // Top Channel + share %
    let tChannel = "—"; let tVal = -1; let totalChVal = 0;
    for (let k in channelFreq) { totalChVal += channelFreq[k]; if(channelFreq[k] > tVal) { tChannel = k; tVal = channelFreq[k]; } }
    document.getElementById("dashTopChannel").textContent = tChannel;
    const shareEl = document.getElementById("dashTopChannelShare");
    if (shareEl) {
        if (totalChVal > 0 && tVal > 0) {
            const pct = Math.round((tVal / totalChVal) * 100);
            shareEl.textContent = pct + '% of revenue · RM ' + fmtMoney(tVal);
        } else { shareEl.textContent = 'No sales in range'; }
    }

    // Status Board Update
    document.getElementById("badgeToFulfil").textContent = statusToFulfil;
    document.getElementById("badgeUnpaid").textContent = statusUnpaid;
    document.getElementById("badgeProcessing").textContent = statusProcessing;
    document.getElementById("badgeReturn").textContent = statusReturn;

    // 3. Inventory Stock Health
    let activeP=0; let draftP=0; let oosP=0; let lowP=0;
    masterProducts.forEach(p => {
        if(!isPublished(p)) { draftP++; return; }
        activeP++;
        
        let qty = inventoryBatches.filter(b=>b.sku===p.sku).reduce((sum, b)=>sum+b.qty_remaining,0);
        if(qty === 0) oosP++;
        else if(qty < 5) lowP++;
    });
    
    document.getElementById("badgeActive").textContent = activeP;
    document.getElementById("badgeDraft").textContent = draftP;
    document.getElementById("badgeOos").textContent = oosP;
    document.getElementById("badgeLow").textContent = lowP;

    // 4. CRM Customer Metrics
    // Calculate new buyers based on how many unique names are in filteredSales vs customersData. 
    // Simplified for MVP:
    let repeatC = customersData.filter(c => c.points > 0).length; // Assumption: points means repeated
    let membersC = customersData.filter(c => c.is_member === true).length;
    document.getElementById("dashNewBuyers").textContent = customersData.length; // Total saved unique customers
    document.getElementById("badgeRepeat").textContent = repeatC;
    document.getElementById("badgeMembers").textContent = membersC;

    // 5. Draw Top 10 List
    const topArr = Object.values(itemCounts).sort((a,b) => b.qty - a.qty).slice(0, 10);
    const tbodyLines = document.getElementById("topSellingList");
    tbodyLines.innerHTML = "";
    if(topArr.length === 0) tbodyLines.innerHTML = "<tr><td>No sales data</td></tr>";
    
    if (topArr.length === 0) {
        tbodyLines.innerHTML = '<tr><td colspan="4" style="padding:18px; text-align:center; color:var(--text-muted); font-size:12.5px;">Belum ada sales dalam range ni. Pilih range lebih luas atau buat sale pertama.</td></tr>';
    } else {
        topArr.forEach((o, i) => {
            tbodyLines.innerHTML += `<tr style="cursor:pointer;" onclick="window.__dashGoto('inv_mapping')">
                <td style="width:24px; font-weight:bold; color:#888;">#${i+1}</td>
                <td><strong>${o.name}</strong></td>
                <td style="color:#10b981; font-weight:700;">${o.qty} sold</td>
                <td style="text-align:right; font-weight:600;">RM ${fmtMoney(o.revenue)}</td>
            </tr>`;
        });
    }

    // 6. Draw Chart.js (Daily Sales)
    let dailyMap = {};
    filteredSales.forEach(s => {
        let dStr = new Date(s.created_at).toLocaleDateString('en-GB'); 
        dailyMap[dStr] = round2((dailyMap[dStr] || 0) + Number(s.total || s.total_amount || 0));
    });
    // Sort chronological
    let sortedDates = Object.keys(dailyMap).sort((a,b)=> new Date(a.split('/').reverse().join('-')) - new Date(b.split('/').reverse().join('-')));
    let gLabels = sortedDates;
    let gData = sortedDates.map(d => dailyMap[d]);

    const ctx = document.getElementById('salesChart');
    if(!ctx) return;
    
    if(salesChartInst) salesChartInst.destroy();
    salesChartInst = new Chart(ctx.getContext('2d'), {
        type: 'line',
        data: {
            labels: gLabels,
            datasets: [{
                label: 'RM',
                data: gData,
                backgroundColor: 'rgba(205, 124, 50, 0.12)',
                borderColor: '#CD7C32',
                borderWidth: 2,
                fill: true,
                tension: 0.35,
                pointRadius: gData.length > 14 ? 0 : 2,
                pointHoverRadius: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false }, tooltip: { callbacks: { label: (c) => 'RM ' + Number(c.parsed.y).toLocaleString('en-MY', {minimumFractionDigits:2, maximumFractionDigits:2}) } } },
            scales: { x: { display: false }, y: { display: false, beginAtZero: true } }
        }
    });

    // Freshness timestamp
    const stamp = document.getElementById('dashFreshStamp');
    if (stamp) stamp.textContent = new Date().toLocaleTimeString('en-MY', { hour:'2-digit', minute:'2-digit' });
}

function renderHistory() {
    const el = document.getElementById("salesHistory");
    if(!el) return;
    el.innerHTML = "";
    salesHistory.forEach(sale => {
        let sc = sale.channel || 'In-Store';
        let st = sale.status || 'Completed';
        let stColor = st==='Completed'?'#000000': (st==='Unpaid'?'#6F6F6F': (st==='To Fulfil'?'#F37021':'#D80000'));

        const d = new Date(sale.created_at);
        el.innerHTML += `
            <div class="history-card">
                <div style="display:flex; justify-content:space-between; margin-bottom:5px;">
                    <strong>[#${sale.id}] RM ${parseFloat(sale.total || sale.total_amount || 0).toFixed(2)}</strong>
                    <span class="badge-status" style="background:${stColor};">${st}</span>
                </div>
                <div style="font-size:13px; color:#666; margin-bottom:5px;">Buyer: ${sale.customer_name||'Walk-in'} • Channel: <strong>${sc}</strong> • ${sale.payment_method}</div>
                <div style="font-size:12px; color:#aaa;">${d.toLocaleDateString() + ' ' + d.toLocaleTimeString()}</div>
            </div>
        `;
    });
}

// ===================================
// INVENTORY WMS (BACKOFFICE)
// ===================================
function renderWMS() {
    const select = document.getElementById("inboundSkuSelect");
    if(select){
        select.innerHTML = '<option value="">-- Choose SKU --</option>';
        masterProducts.forEach(p => { select.innerHTML += `<option value="${p.sku}">[${p.sku}] ${p.name}</option>`; });
    }

    const tbody = document.getElementById("inventoryTableBody");
    if(!tbody) return;
    tbody.innerHTML = "";

    let htmlBuf3 = "";

    masterProducts.forEach(p => {
        const myBatches = inventoryBatches.filter(b => b.sku === p.sku && b.qty_remaining > 0);
        const totalStock = myBatches.reduce((sum, b) => sum + b.qty_remaining, 0);
        
        let thumb = "https://placehold.co/100x100?text=Img";
        let imgs = p.images || []; if(imgs.length > 0) thumb = imgs[0];

        let sBadge = isPublished(p) ? `<span style="color:green;font-size:10px;">Active</span>` : `<span style="color:red;font-size:10px;">Draft</span>`;

        htmlBuf3 += `
            <tr>
                <td>
                    <img src="${thumb}" style="width:45px; height:45px; object-fit:cover; border-radius:6px; background:#eee;"><br>
                    ${sBadge}
                </td>
                <td>
                    <span class="sku-badge">${p.sku}</span> <span class="cat-badge">${p.category||'Uncategorized'}</span> ${p.location_bin ? `<span style="background:#fef08a; color:#854d0e; padding:3px 6px; border-radius:4px; font-size:10px;"> Loc: ${p.location_bin}</span>` : ''}<br>
                    <strong>${p.name}</strong><br>
                    <small style="color:#888;">Jenama: <strong>${p.brand || 'N/A'}</strong></small>
                </td>
                <td>
                    <div style="font-size:12px; color:#555;">
                        Model: ${p.model_no || '-'}<br>
                        Variant: ${p.variant_size || '-'} / ${p.variant_color || '-'}<br>
                        Dimensi: ${p.dimensions || '-'} (${p.weight_kg ? p.weight_kg+'Kg' : '-'})
                    </div>
                </td>
                <td style="font-weight:bold; color:${totalStock <= 0 ? 'red' : 'green'};">
                    ${totalStock} ${p.unit||'Pcs'}<br>
                    <small style="font-weight:normal; color:#888;">${myBatches.length} batch(es)</small>
                    ${myBatches.length > 0 ? (() => {
                        const sources = [...new Set(myBatches.map(b => b.po_number).filter(Boolean))];
                        const suppliers = [...new Set(myBatches.map(b => b.supplier_name).filter(Boolean))];
                        let trace = '';
                        if(sources.length) trace += `<br><span style="font-weight:normal; color:#0EA5E9; font-size:10px;">📋 ${sources.slice(0,2).join(', ')}${sources.length > 2 ? '+' : ''}</span>`;
                        if(suppliers.length) trace += `<br><span style="font-weight:normal; color:#7C3AED; font-size:10px;">🏭 ${suppliers.slice(0,2).join(', ')}${suppliers.length > 2 ? '+' : ''}</span>`;
                        return trace;
                    })() : ''}
                </td>
                <td>
                    <div style="background:#F3F4F6; padding:5px; border-radius:4px; font-family:monospace; font-size:12px; border:1px solid #ddd; display:inline-block;">
                         ${p.location_bin || "Tiada Maklumat Rak"}
                    </div>
                </td>
                <td>
                    <small>Cost: RM${parseFloat(p.cost_price||0).toFixed(2)}</small><br>
                    <strong>Sell: RM${parseFloat(p.price).toFixed(2)}</strong>
                </td>
            </tr>
        `;
    });
    tbody.innerHTML = htmlBuf3;
}

window.renderAuditCards = function() {
    renderStockTake();
}

// Global variable to keep track of audit timestamps per SKU
let auditTimestamps = {};

function renderStockTake() {
    const container = document.getElementById("auditCardsContainer");
    if(!container) return;
    
    let searchTxt = (document.getElementById("auditSearchInput")?.value || "").toLowerCase();
    let filterVal = document.getElementById("auditFilterSelect")?.value || "all";
    
    let html = "";
    
    let filteredProducts = masterProducts.filter(p => {
        let matchName = p.name.toLowerCase().includes(searchTxt);
        let matchSku = p.sku.toLowerCase().includes(searchTxt);
        if(!matchName && !matchSku) return false;
        
        let qty = inventoryBatches.filter(b => b.sku === p.sku && b.qty_remaining > 0).reduce((sum, b) => sum + b.qty_remaining, 0);
        
        if(filterVal === "laku" && qty <= 10) return false; // fast moving is >10
        if(filterVal === "tak-laku" && qty > 10) return false; // dead stock is <=10
        
        return true;
    });

    if(filteredProducts.length === 0) {
        container.innerHTML = "<p style='text-align:center; padding:20px; color:#888;'>Tiada produk dijumpai yang padan dengan tapisan.</p>";
        return;
    }

    filteredProducts.forEach(p => {
        const myBatches = inventoryBatches.filter(b => b.sku === p.sku && b.qty_remaining > 0);
        const totalStock = myBatches.reduce((sum, b) => sum + b.qty_remaining, 0);
        
        // Mock properties based on user request:
        const modelNo = p.sku + "-X";
        const erpBarcode = "884" + p.sku.replace(/\D/g,'') + Math.floor(Math.random()*10);
        const locText = "Rak T" + ((p.sku.charCodeAt(2)||48)%3+1) + "/B" + ((p.sku.charCodeAt(3)||48)%6+1);
        const statusStok = totalStock > 10 ? "Fast-Moving (Laku)" : "Dead Stock (Perlahan)";
        const statusColor = totalStock > 10 ? "var(--success)" : "var(--danger)";
        const imgUrl = (p.images && p.images[0]) ? p.images[0] : "https://via.placeholder.com/150?text=No+Image";
        
        let stampHtml = auditTimestamps[p.sku] ? `<p style="color:var(--success); font-size:11px; margin-top:5px; font-weight:bold;"> Disemak pada: ${auditTimestamps[p.sku]}</p>` : "";

        const currentLoc = p.location_bin || locText;
        const currentStatus = p.stock_status || statusStok;
        const currentStatusColor = currentStatus.includes("Fast") ? "var(--success)" : currentStatus.includes("Dead") ? "var(--danger)" : "#6B7280";

        html += `
            <div class="admin-card" style="padding:15px; border-left:5px solid var(--primary); margin-bottom:0px; background:#fff; display:flex; gap:15px; flex-wrap:wrap;">
                
                <!-- Product Image & Basic Info (Left) -->
                <div style="flex:1; min-width:200px; display:flex; gap:10px;">
                    <img src="${imgUrl}" style="width:80px; height:80px; object-fit:cover; border-radius:6px; border:1px solid var(--border-color);">
                    <div>
                        <strong style="color:var(--primary); font-size:16px;">${p.sku}</strong>
                        <p style="font-size:14px; font-weight:bold; margin-bottom:5px;">${p.name}</p>
                        <p style="font-size:11px; color:#888; margin-bottom:2px;">Model No: ${modelNo}</p>
                        <p style="font-size:11px; color:#888; margin-bottom:2px;">ERP Barcode: ${erpBarcode}</p>
                    </div>
                    

                </div>

                <!-- Stock Location & Status (Middle) -->
                <div style="flex:1; min-width:220px; padding-left:10px; border-left:1px dashed var(--border-color);">
                    <div style="display:flex; justify-content:space-between; align-items:center;">
                        <p class="small-lbl" style="margin:0;">Lokasi Stok</p>
                        <button onclick="openLocModal('${p.sku}')" style="background:none; border:none; cursor:pointer; font-size:12px; color:var(--primary);">️ Ubah</button>
                    </div>
                    <div id="locDisplay-${p.sku}" style="display:flex; gap:6px; margin-bottom:10px; flex-wrap:wrap;">
                        <span style="font-family:monospace; font-size:11px; font-weight:bold; background:#E0F2FE; padding:3px 8px; border-radius:4px; border:1px solid #BAE6FD;">${p.location_bin || p.loc_level || 'Belum Ditetapkan'}</span>
                    </div>
                    
                    <p class="small-lbl" style="margin:0; margin-bottom:3px;">Status Stok</p>
                    <select id="statusSelect-${p.sku}" onchange="updateStockStatus('${p.sku}', this.value)" style="font-size:11px; padding:3px; border-radius:4px; border:1px solid #ccc; font-weight:bold; background-color:${currentStatusColor}; color:white; width:100%; max-width:160px; cursor:pointer;">
                        <option value="Fast-Moving (Laku)" style="background:white; color:black;" ${currentStatus.includes('Fast') ? 'selected' : ''}>Fast-Moving (Laku)</option>
                        <option value="Dead Stock (Perlahan)" style="background:white; color:black;" ${currentStatus.includes('Dead') ? 'selected' : ''}>Dead Stock (Perlahan)</option>
                        <option value="Normal / Baru" style="background:white; color:black;" ${(!currentStatus.includes('Fast') && !currentStatus.includes('Dead')) ? 'selected' : ''}>Normal / Baru</option>
                    </select>
                </div>

                <!-- Audit Execution Panel (Right) -->
                <div style="flex:1.5; min-width:280px; padding-left:10px; border-left:1px dashed var(--border-color); background:#FAFAFA; border-radius:6px; padding:10px;">
                    <div style="display:flex; justify-content:space-between; margin-bottom:10px; align-items:center;">
                        <div style="text-align:center;">
                            <p class="small-lbl" style="margin:0;">Stok Sistem</p>
                            <span style="font-size:20px; font-weight:900;" id="sysQty-${p.sku}">${totalStock}</span>
                        </div>
                        <div style="text-align:center;">
                            <p class="small-lbl" style="margin:0; color:var(--primary);">Kiraan Fizikal</p>
                            <input type="number" id="fizikalQty-${p.sku}" onkeyup="calculateVariance('${p.sku}')" class="login-input" style="width:80px; text-align:center; margin:0; padding:8px; border-color:var(--primary);" placeholder="Qty">
                        </div>
                        <div style="text-align:center;">
                            <p class="small-lbl" style="margin:0;">Selisih (+/-)</p>
                            <span style="font-size:16px; font-weight:bold;" id="varianceQty-${p.sku}">0</span>
                        </div>
                    </div>
                    
                    <div style="background:#e0f2fe; border:1px dashed #bae6fd; padding:10px; border-radius:6px; margin-bottom:10px; text-align:center;">
                        <label style="font-size:11px; font-weight:bold; color:#0369a1; display:block; margin-bottom:5px;"> Tally Scan Fizikal (+1)</label>
                        <input type="text" onkeyup="handleTallyScan(event, '${p.sku}', '${erpBarcode}')" class="login-input" style="width:100%; text-align:center; padding:6px; margin:0; border-color:#0ea5e9; font-size:12px;" placeholder="Tumpu di sini & scan barcode...">
                    </div>

                    <input type="text" id="auditKomen-${p.sku}" class="login-input" style="margin:0; padding:8px; font-size:12px; margin-bottom:10px;" placeholder="Tulis catatan (Cth: 2 item rosak)...">
                    
                    <button onclick="submitAuditSingle('${p.sku}')" class="btn-primary" style="width:100%; margin:0; padding:10px;">SUBMIT KIRAAN ITEM</button>
                    <div id="stampWrapper-${p.sku}">${stampHtml}</div>
                </div>
            </div>
        `;
    });
    
    container.innerHTML = html;
}

window.openLocModal = function(sku) {
    let p = masterProducts.find(x => x.sku === sku);
    if(!p) return;
    document.getElementById('locModalSku').textContent = sku;
    document.getElementById('locModalName').textContent = p.name;
    document.getElementById('locModalSkuHidden').value = sku;
    
    let parts = (p.location_bin || "").split('-');
    if(parts.length >= 2) {
        document.getElementById('locZone').value = parts[0] || '';
        document.getElementById('locAisle').value = parts[1] || '';
        document.getElementById('locRack').value = parts[2] || '';
        document.getElementById('locTier').value = parts[3] || '';
        document.getElementById('locBin').value = parts[4] || '';
    } else {
        document.getElementById('locZone').value = p.loc_level || '';
        document.getElementById('locAisle').value = '';
        document.getElementById('locRack').value = p.loc_rack || '';
        document.getElementById('locTier').value = p.loc_tier || '';
        document.getElementById('locBin').value = '';
    }
    document.getElementById('locationUpdateModal').style.display = 'flex';
}

window.submitLocUpdate = function() {
    let sku = document.getElementById('locModalSkuHidden').value;
    let zone = document.getElementById('locZone').value.trim().toUpperCase();
    let aisle = document.getElementById('locAisle').value.trim().toUpperCase();
    let rack = document.getElementById('locRack').value.trim().toUpperCase();
    let tier = document.getElementById('locTier').value.trim().toUpperCase();
    let bin = document.getElementById('locBin').value.trim().toUpperCase();
    
    if(!zone && !aisle && !rack && !tier && !bin) { alert('Sila isikan sekurang-kurangnya satu ruangan!'); return; }
    
    let fullLoc = [zone, aisle, rack, tier, bin].filter(Boolean).join('-');
    
    let p = masterProducts.find(x => x.sku === sku);
    if(p) {
        p.location_bin = fullLoc;
        p.loc_level = zone;
        p.loc_rack = aisle;
        p.loc_tier = rack;
        
        try { if(db) db.from('products_master').update({ location_bin: fullLoc, loc_level: zone, loc_rack: aisle, loc_tier: rack }).eq('sku', sku).then(); } catch(e){}
    }
    
    let display = document.getElementById('locDisplay-'+sku);
    if(display) {
        display.innerHTML = `<span style="font-family:monospace; font-size:11px; font-weight:bold; background:#dcfce7; padding:3px 8px; border-radius:4px; border:1px solid #86efac; animation:fadeIn 0.3s;">${fullLoc}</span>`;
    }
    
    document.getElementById('locationUpdateModal').style.display = 'none';
}


window.updateStockStatus = function(sku, val) {
    let p = masterProducts.find(x => x.sku === sku);
    if(p) {
        p.stock_status = val; // Update memory
        // Update cloud asynchronously
        try { if(db) db.from('products_master').update({stock_status: val}).eq('sku', sku).then(); } catch(e){}
    }
    
    let selectEl = document.getElementById("statusSelect-"+sku);
    if(val.includes("Fast")) {
        selectEl.style.backgroundColor = "var(--success)";
    } else if(val.includes("Dead")) {
        selectEl.style.backgroundColor = "var(--danger)";
    } else {
        selectEl.style.backgroundColor = "#6B7280";
    }
}

window.calculateVariance = function(sku) {
    let sys = parseInt(document.getElementById("sysQty-"+sku).textContent) || 0;
    let fiz = parseInt(document.getElementById("fizikalQty-"+sku).value);
    let vDom = document.getElementById("varianceQty-"+sku);
    
    if(isNaN(fiz)) {
        vDom.textContent = "0";
        vDom.style.color = "var(--text-main)";
        return;
    }
    
    let diff = fiz - sys;
    if(diff > 0) {
        vDom.textContent = "+" + diff;
        vDom.style.color = "var(--success)";
    } else if(diff < 0) {
        vDom.textContent = diff;
        vDom.style.color = "var(--danger)";
    } else {
        vDom.textContent = "Tepat (0)";
        vDom.style.color = "var(--text-main)";
    }
}

window.submitAuditSingle = function(sku) {
    let fizDom = document.getElementById("fizikalQty-"+sku);
    if(fizDom.value === "") {
        alert("Sila masukkan nilai kiraan fizikal dahulu!");
        return;
    }
    
    // Save timestamp
    let today = new Date();
    auditTimestamps[sku] = today.toLocaleString('en-MY', { weekday:'short', day:'numeric', month:'short', hour:'numeric', minute:'numeric', hour12:true });
    
    // Refresh that component
    let stampWrap = document.getElementById("stampWrapper-"+sku);
    if(stampWrap) {
        stampWrap.innerHTML = `<p style="color:var(--success); font-size:11px; margin-top:5px; font-weight:bold; animation: fadeIn 0.5s;"> Disemak pada: ${auditTimestamps[sku]}</p>`;
    }
    
    // Optional border color change to signify done
    fizDom.parentElement.parentElement.parentElement.style.background = "#F0FDF4";
}

window.handleTallyScan = function(e, correctSku, correctErp) {
    if(e.key === 'Enter') {
        let val = e.target.value.trim().toUpperCase();
        e.target.value = ""; // Reset box for next scan
        if(!val) return;
        
        if(val === correctSku.toUpperCase() || val === correctErp.toUpperCase()) {
            let fizDom = document.getElementById("fizikalQty-"+correctSku);
            let currentFiz = parseInt(fizDom.value) || 0;
            fizDom.value = currentFiz + 1;
            window.calculateVariance(correctSku);
            
            // Visual success feedback
            fizDom.style.transition = "background-color 0.2s";
            fizDom.style.backgroundColor = "#dcfce7";
            setTimeout(() => fizDom.style.backgroundColor = "#fff", 300);
        } else {
            alert("Ralat: Barcode yang diimbas (" + val + ") TIDAK padan dengan produk ini!");
        }
    }
}

window.openBarcodeScannerModal = function() {
    document.getElementById('barcodeScannerModal').style.display = 'flex';
    document.getElementById('barcodeScanResult').style.display = 'none';
    document.getElementById('btnSubmitBarcodeAudit').style.display = 'none';
    const input = document.getElementById('barcodeScannerInput');
    input.value = '';
    setTimeout(() => input.focus(), 100);
}

window.handleMainAuditScan = function(e) {
    if(e.key === 'Enter') {
        const query = e.target.value.trim().toLowerCase();
        e.target.value = ""; // Reset box for next scan
        if(!query) return;
        
        const product = masterProducts.find(p => 
            p.sku.toLowerCase() === query ||
            (p.erp_barcode && p.erp_barcode.toLowerCase() === query) ||
            p.name.toLowerCase() === query ||
            (p.model_no && p.model_no.toLowerCase() === query)
        );
        
        if(!product) {
            alert("Ralat: Produk (" + query + ") tidak dijumpai dalam sistem!");
            return;
        }
        
        const myBatches = inventoryBatches.filter(b => b.sku === product.sku && b.qty_remaining > 0);
        const totalStock = myBatches.reduce((sum, b) => sum + b.qty_remaining, 0);
        
        document.getElementById('bcScanSku').textContent = product.sku;
        document.getElementById('bcScanName').textContent = product.name;
        document.getElementById('bcScanSysQty').textContent = totalStock;
        document.getElementById('bcScanFizikalQty').value = "";
        document.getElementById('bcScanVariance').textContent = "0";
        document.getElementById('bcScanVariance').style.color = "var(--text-main)";
        
        document.getElementById('barcodeScannerModal').style.display = 'flex';
        document.getElementById('barcodeScanResult').style.display = 'block';
        document.getElementById('btnSubmitBarcodeAudit').style.display = 'block';
        
        // Let the DOM render the modal, then focus the physical quantity field
        setTimeout(() => document.getElementById('bcScanFizikalQty').focus(), 100);
    }
}

window.handleBarcodeScan = function(e) {
    if(e.key === 'Enter') {
        const query = e.target.value.trim().toLowerCase();
        if(!query) return;
        
        const product = masterProducts.find(p => 
            p.sku.toLowerCase() === query ||
            (p.erp_barcode && p.erp_barcode.toLowerCase() === query) ||
            p.name.toLowerCase() === query ||
            (p.model_no && p.model_no.toLowerCase() === query)
        );
        
        if(!product) {
            alert("Produk tidak dijumpai dalam rekod!");
            e.target.select();
            return;
        }
        
        const myBatches = inventoryBatches.filter(b => b.sku === product.sku && b.qty_remaining > 0);
        const totalStock = myBatches.reduce((sum, b) => sum + b.qty_remaining, 0);
        
        document.getElementById('bcScanSku').textContent = product.sku;
        document.getElementById('bcScanName').textContent = product.name;
        document.getElementById('bcScanSysQty').textContent = totalStock;
        document.getElementById('bcScanFizikalQty').value = "";
        document.getElementById('bcScanVariance').textContent = "0";
        document.getElementById('bcScanVariance').style.color = "var(--text-main)";
        
        document.getElementById('barcodeScanResult').style.display = 'block';
        document.getElementById('btnSubmitBarcodeAudit').style.display = 'block';
        
        document.getElementById('bcScanFizikalQty').focus();
    }
}

window.calcBarcodeVariance = function() {
    let sys = parseInt(document.getElementById("bcScanSysQty").textContent) || 0;
    let fiz = parseInt(document.getElementById("bcScanFizikalQty").value);
    let vDom = document.getElementById("bcScanVariance");
    
    if(isNaN(fiz)) {
        vDom.textContent = "0";
        vDom.style.color = "var(--text-main)";
        return;
    }
    
    let diff = fiz - sys;
    if(diff > 0) {
        vDom.textContent = "+" + diff;
        vDom.style.color = "var(--success)";
    } else if(diff < 0) {
        vDom.textContent = diff;
        vDom.style.color = "var(--danger)";
    } else {
        vDom.textContent = "Tepat (0)";
        vDom.style.color = "var(--text-main)";
    }
}

window.processBarcodeAudit = function() {
    const sku = document.getElementById('bcScanSku').textContent;
    const fizDom = document.getElementById("bcScanFizikalQty");
    if(fizDom.value === "") {
        alert("Sila masukkan nilai kiraan fizikal dahulu!");
        return;
    }
    
    let today = new Date();
    auditTimestamps[sku] = today.toLocaleString('en-MY', { weekday:'short', day:'numeric', month:'short', hour:'numeric', minute:'numeric', hour12:true });
    
    if (typeof showToast==='function') showToast(`Kiraan fizikal untuk ${sku} disahkan`, 'success'); else alert(`Kiraan fizikal untuk ${sku} disahkan!`);
    
    if (document.getElementById("auditCardsContainer").innerHTML !== "") {
        renderStockTake();
        setTimeout(() => {
            let stampWrap = document.getElementById("stampWrapper-"+sku);
            if(stampWrap) {
                const mainFizDom = document.getElementById("fizikalQty-"+sku);
                if(mainFizDom) {
                    mainFizDom.value = fizDom.value;
                    window.calculateVariance(sku);
                    mainFizDom.parentElement.parentElement.parentElement.style.background = "#F0FDF4";
                }
            }
        }, 100);
    }
    
    document.getElementById('barcodeScannerModal').style.display='none';
}





document.getElementById("startCsvBtn").onclick = async function() {
    const fileInput = document.getElementById("csvFileInput");
    if(!fileInput.files.length) return alert("Pilih fail Spreadsheet (.csv atau .xlsx)!");
    const file = fileInput.files[0];
    const fileExt = file.name.split('.').pop().toLowerCase();
    
    this.disabled = true; this.textContent = "Analyzing Smart Migrator...";

    const processData = async (dataArray, headers) => {
        const typeSelect = document.getElementById("csvImportType");
        const importMode = typeSelect ? typeSelect.value : "products";
        const btn = document.getElementById("startCsvBtn");
        
        if(importMode === "sales") {
            const isShopSales = headers.includes("Name") && headers.includes("Total");
            const isEasySales = headers.includes("Order Number") && headers.includes("Total");
            let salesPayload = [];
            
            dataArray.forEach(r => {
                let s_oid = "", s_amt = 0, s_cust = "Unknown", s_date = new Date().toISOString();
                if(isShopSales) {
                    s_oid = r["Name"]; s_amt = r["Total"] || r["Subtotal"]; s_cust = r["Email"] || "Shopify Customer";
                    s_date = r["Created at"] || s_date;
                } else if(isEasySales) {
                    s_oid = r["Order Number"]; s_amt = r["Total"]; s_cust = r["Customer Name"];
                    s_date = r["Date"] || s_date;
                } else {
                    s_oid = r.order_id || r.id; s_amt = r.amount || r.total; s_cust = r.customer || r.name;
                }
                if(s_oid) {
                    salesPayload.push({
                        order_id: s_oid,
                        platform: isShopSales ? "Shopify" : (isEasySales ? "EasyStore" : "Imported"),
                        amount: parseFloat(s_amt || 0),
                        customer_name: s_cust || "Unknown",
                        created_at: new Date(s_date).toISOString()
                    });
                }
            });
            
            if(salesPayload.length === 0) {
                alert("Format CSV/Excel Sales Tidak Sah / Kosong.");
                btn.disabled = false; btn.textContent = " Process Robot Upload";
                return;
            }
            try {
                let chunkSize = 500;
                for(let i=0; i<salesPayload.length; i+=chunkSize) {
                    btn.textContent = `Pushing Sales: ${Math.min(i+chunkSize, salesPayload.length)} / ${salesPayload.length}...`;
                    let chunk = salesPayload.slice(i, i+chunkSize);
                    let { error } = await db.from('sales_history').upsert(chunk, { onConflict: 'order_id' });
                    if(error) throw error;
                }
                alert(`Migrasi ${salesPayload.length} Rekod Jualan Berjaya!`);
                await initApp();
            } catch(e) { alert("Error: " + e.message); } finally { btn.disabled = false; btn.textContent = " Process Robot Upload"; }
            return;
        }

        // Products Migration Flow
        const isShopify = headers.includes("Variant SKU");
        const isEasyStore = headers.includes("Product Name") && headers.includes("Price");
        
        let payload = [];
        let inventoryPayload = [];

        dataArray.forEach(r => {
            let s_sku = "", s_name = "", s_price = 0, s_cost = 0, s_img = "", s_qty = 0;
            if(isShopify) {
                s_sku = r["Variant SKU"]; s_name = r["Handle"] || r["Title"]; s_price = r["Variant Price"];
                s_cost = r["Variant Compare At Price"] || 0; s_img = r["Image Src"] || "";
                s_qty = parseInt(r["Variant Inventory Qty"] || 0);
            } else if(isEasyStore) {
                s_sku = r["SKU"]; s_name = r["Product Name"]; s_price = r["Price"]; s_cost = r["Cost"];
                s_qty = parseInt(r["Quantity"] || 0);
            } else {
                s_sku = r.sku || r.SKU; s_name = r.name || r.NAME; s_price = r.price || r.PRICE; s_cost = r.cost_price || r.COST;
            }
            
            s_sku = (s_sku || "").toString().trim().toUpperCase();
            if(s_sku && s_sku !== "NAN") {
                payload.push({
                    sku: s_sku, name: s_name || "Migrated Item",
                    category: r.category || "Migrated", unit: "Pcs", cost_price: parseFloat(s_cost || 0),
                    price: parseFloat(s_price || 0), commission_rate: 0,
                    is_published: true, images: s_img ? [s_img] : []
                });
                if(s_qty > 0) {
                    inventoryPayload.push({
                        sku: s_sku, batch_year: new Date().getFullYear(),
                        qty_received: s_qty, qty_remaining: s_qty
                    });
                }
            }
        });

        if(payload.length === 0) {
            alert("Format Dokumen Tidak Dikenalpasti / Tiada SKU.");
            btn.disabled = false; btn.textContent = " Process Robot Upload";
            return;
        }
        
        try {
            // Chunking logic (500 items per chunk) to avoid Server Timeout
            let chunkSize = 500;
            for(let i=0; i<payload.length; i+=chunkSize) {
                btn.textContent = `Upserting Products: ${Math.min(i+chunkSize, payload.length)} / ${payload.length}...`;
                let chunk = payload.slice(i, i+chunkSize);
                let { error } = await db.from('products_master').upsert(chunk, { onConflict: 'sku' });
                if(error) throw error;
            }
            
            if(inventoryPayload.length > 0) {
                for(let i=0; i<inventoryPayload.length; i+=chunkSize) {
                    btn.textContent = `Migrating Inventory: ${Math.min(i+chunkSize, inventoryPayload.length)} / ${inventoryPayload.length}...`;
                    let chunk = inventoryPayload.slice(i, i+chunkSize);
                    let { error } = await db.from('inventory_batches').insert(chunk);
                    if(error) throw error;
                }
            }

            alert(`Migrasi Berjaya! dipindahkan sebanyak: ${payload.length} produk & ${inventoryPayload.length} susunan stok.`); 
            await initApp(); 
            
        } catch(e) {
            alert("Migration Error: " + e.message);
        } finally {
            btn.disabled = false; btn.textContent = " Process Robot Upload";
        }
    };

    if (fileExt === 'csv') {
        Papa.parse(file, {
            header: true, skipEmptyLines: true,
            complete: function(res) {
                processData(res.data, res.meta.fields || []);
            }
        });
    } else if (fileExt === 'xlsx' || fileExt === 'xls') {
        const reader = new FileReader();
        reader.onload = function(e) {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, {type: 'array'});
            const firstSheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[firstSheetName];
            const jsonData = XLSX.utils.sheet_to_json(worksheet, {defval: ""});
            
            if (jsonData.length === 0) {
                alert("Fail bersheet kosong!");
                document.getElementById("startCsvBtn").disabled = false;
                document.getElementById("startCsvBtn").textContent = " Process Robot Upload";
                return;
            }
            const headers = Object.keys(jsonData[0]);
            processData(jsonData, headers);
        };
        reader.readAsArrayBuffer(file);
    } else {
        alert("Sila muat naik format fail yang sah (.csv atau .xlsx / .xls)!");
        this.disabled = false; this.textContent = " Process Robot Upload";
    }
};

document.getElementById("exportExcelBtn").onclick = function() {
    if(masterProducts.length === 0) return alert("Gudang kosong! Tiada apa untuk dieksport.");
    this.textContent = "Mengeksport...";
    
    let exportData = masterProducts.map(p => {
        let matchedBatches = inventoryBatches.filter(b => b.sku === p.sku);
        let totalStok = matchedBatches.reduce((sum, b) => sum + (b.qty_remaining || 0), 0);
        
        return {
            "SKU": p.sku,
            "NAME": p.name,
            "CATEGORY": p.category,
            "COST": p.cost_price,
            "PRICE": p.price,
            "QUANTITY": totalStok,
            "BRAND": p.brand || "",
            "DIMENSIONS": p.dimensions || "",
            "WEIGHT_KG": p.weight_kg || 0
        };
    });
    
    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Inventory Data");
    
    XLSX.writeFile(workbook, `10CAMP_Inventory_Export_${new Date().toISOString().split('T')[0]}.xlsx`);
    this.textContent = " Export Products (.xlsx)";
};



// ===================================
// POS CASHIER FRONTEND
// ===================================
function renderPOS(searchTerm = "") {
    const list = document.getElementById("productsList");
    if(!list) return;
    let htmlBuf = "";
    
    // Reset page if searching
    if(searchTerm !== lastPosSearchTerm) {
        lastPosSearchTerm = searchTerm;
        posCurrentPage = 1;
    }

    let filtered = masterProducts.filter(p => {
        if(!isPublished(p)) return false;
        if(searchTerm && !p.name.toLowerCase().includes(searchTerm.toLowerCase()) && !p.sku.toLowerCase().includes(searchTerm.toLowerCase())) return false;
        return true;
    });

    const totalPages = Math.ceil(filtered.length / itemsPerPage) || 1;
    if(posCurrentPage > totalPages) posCurrentPage = totalPages;
    if(posCurrentPage < 1) posCurrentPage = 1;

    let sliced = filtered.slice((posCurrentPage - 1) * itemsPerPage, posCurrentPage * itemsPerPage);

    sliced.forEach(p => {

        const myBatches = inventoryBatches.filter(b => b.sku === p.sku && b.qty_remaining > 0);
        const totalStock = myBatches.reduce((sum, b) => sum + b.qty_remaining, 0);
        let thumb = p.images && p.images[0] ? p.images[0] : "https://placehold.co/300x200?text=No+Img";

        htmlBuf += `
            <div class="product-card">
                <img src="${thumb}">
                <span class="sku-badge">${p.sku}</span><span class="cat-badge">${p.category||'Uncat'}</span>
                <h3 style="margin-top:5px; font-size:14px; height:35px; overflow:hidden;">${p.name}</h3>
                <p class="price">RM ${parseFloat(p.price).toFixed(2)}</p>
                <p style="font-size:12px; margin-bottom:8px;">Instock: ${totalStock} ${p.unit||''}</p>
                <button onclick="addToCart('${p.sku}')" ${totalStock <= 0 ? 'disabled' : ''}>${totalStock <= 0 ? 'Out of Stock' : 'Add >'}</button>
            </div>
        `;
    });
    
    // Pagination Controls UI
    htmlBuf += `
        <div style="width:100%; display:flex; justify-content:center; align-items:center; gap:15px; margin-top:20px; grid-column: 1 / -1; font-size:14px; color:#555;">
            <button onclick="changePosPage(-1)" ${posCurrentPage <= 1 ? 'disabled style="opacity:0.5"' : 'style="cursor:pointer"'} class="custom-btn"> < Prev </button>
            <span>Page <b>${posCurrentPage}</b> of ${totalPages}</span>
            <button onclick="changePosPage(1)" ${posCurrentPage >= totalPages ? 'disabled style="opacity:0.5"' : 'style="cursor:pointer"'} class="custom-btn"> Next > </button>
        </div>
    `;
    list.innerHTML = htmlBuf;
}

window.addToCart = function(sku) {
    const p = masterProducts.find(x => x.sku === sku);
    const totalAvail = inventoryBatches.filter(b => b.sku === sku && b.qty_remaining > 0).reduce((s, b) => s + b.qty_remaining, 0);
    const cartItem = cart.find(c => c.sku === sku);
    
    if(cartItem) { if (cartItem.quantity < totalAvail) cartItem.quantity++; else (typeof showToast==='function'?showToast('Stok tak cukup','warning'):alert('Limits reached!')); }
    else { if (totalAvail > 0) cart.push({ sku: sku, name: p.name, price: parseFloat(p.price), quantity: 1 }); }
    renderCart();
}

window.decreaseQuantity = function(sku) {
    const c = cart.find(x => x.sku === sku);
    if(c) { if(c.quantity > 1) c.quantity--; else cart = cart.filter(x => x.sku !== sku); }
    renderCart();
}
window.removeFromCart = function(sku) { cart = cart.filter(c => c.sku !== sku); renderCart(); }

function renderCart() {
    const container = document.getElementById("cartItems");
    const label = document.getElementById("totalPrice");
    const subLabel = document.getElementById("cartSubtotalVal");
    const btnPay = document.getElementById("btnOpenPayment");
    if(!container) return; container.innerHTML = ""; let total = 0; let totalItems = 0;
    
    // safe update helper for mobile bar
    const updateMobileBar = (t, i) => {
        const tEl = document.getElementById("mobileCartTotal");
        const iEl = document.getElementById("mobileCartItemCount");
        if(tEl) tEl.textContent = t.toFixed(2);
        if(iEl) iEl.textContent = i.toString();
    };

    if(cart.length === 0) { 
        container.innerHTML = "<p class='empty-cart-message'>Tiada barang di-scan.</p>"; 
        label.textContent = "0.00";
        if(subLabel) subLabel.textContent = "0.00";
        if(btnPay) btnPay.disabled = true;
        updateMobileBar(0, 0);
        return; 
    }

    cart.forEach(item => {
        total = round2(total + item.price * item.quantity);
        totalItems += item.quantity;
        container.innerHTML += `
            <div class="cart-item">
                <div style="flex:1;"><strong style="font-size:13px; color:#111;">[${item.sku}] ${item.name}</strong><br><small style="color:#666;">RM${item.price.toFixed(2)} x ${item.quantity}</small></div>
                <div style="display:flex; gap:8px; align-items:center;">
                    <button onclick="decreaseQuantity('${item.sku}')" style="background:#eee; border:none; width:25px; height:25px; border-radius:5px; font-weight:bold;">-</button>
                    <span style="font-weight:bold;">${item.quantity}</span>
                    <button onclick="addToCart('${item.sku}')" style="background:#eee; border:none; width:25px; height:25px; border-radius:5px; font-weight:bold;">+</button>
                    <button onclick="removeFromCart('${item.sku}')" style="color:#EF4444; background:#fee2e2; border:none; width:25px; height:25px; border-radius:5px; font-weight:bold; margin-left:5px;">X</button>
                </div>
            </div>`;
    });
    label.textContent = total.toFixed(2);
    if(subLabel) subLabel.textContent = total.toFixed(2);
    if(btnPay) btnPay.disabled = false;
    updateMobileBar(total, totalItems);
    // p4_7 Customer-facing display: broadcast cart for second screen
    if(typeof writeCustomerDisplayCart === 'function') writeCustomerDisplayCart();
}

// p4_7 Customer-facing display sync
window.writeCustomerDisplayCart = function() {
    try {
        const payload = {
            items: cart,
            vip: window.__currentCheckoutVip || null,
            updatedAt: new Date().toISOString()
        };
        localStorage.setItem('customerDisplayCart_v1', JSON.stringify(payload));
    } catch(e) {}
};

window.openCustomerDisplay = function() {
    const win = window.open('customer-display.html', '_blank',
        'width=1024,height=768,menubar=no,toolbar=no,location=no');
    if(!win) showToast('Pop-up blocked. Allow pop-ups for this site.', 'warn');
    else showToast('Customer display opened — drag to second screen', 'success');
};

// Payment Modal Logics
window.openPaymentModal = function() {
    if(cart.length === 0) return;
    let total = round2(cart.reduce((sum, c) => sum + (c.price * c.quantity), 0));
    document.getElementById('paymentTotalDisplay').textContent = total.toFixed(2);
    document.getElementById('checkoutPaymentModal').style.display = 'flex';
    // Reset VIP state from any previous session
    window.__currentCheckoutVip = null;
    const vb = document.getElementById('checkoutVipBadge'); if(vb) vb.style.display = 'none';
    const vl = document.getElementById('checkoutVipDiscountLine'); if(vl) vl.remove();
    // Auto-lookup if customer name/phone already filled
    if(typeof checkoutVipLookup === 'function') checkoutVipLookup();
}

window.setPaymentMethod = function(method, btnElement) {
    document.getElementById('paymentMethod').value = method;
    let btns = document.querySelectorAll('#checkoutPaymentModal .pay-btn');
    btns.forEach(b => {
        b.classList.remove('active');
        b.style.border = "1px solid var(--border-color)";
        b.style.background = "#FFF";
        b.style.color = "var(--text-muted)";
    });
    btnElement.classList.add('active');
    btnElement.style.border = "2px solid var(--primary)";
    btnElement.style.background = "#FFF5eb";
    btnElement.style.color = "var(--text-main)";

    // E-Wallet sub-panel: show & populate dropdown of enabled wallets
    const sub = document.getElementById('ewalletSubPanel');
    if (sub) {
        if (method === 'E-Wallet') {
            sub.style.display = 'block';
            const sel = document.getElementById('ewalletProvider');
            const emptyMsg = document.getElementById('ewalletEmptyMsg');
            if (sel) {
                let settings = {};
                try { settings = JSON.parse(localStorage.getItem('complianceSettings_v1')) || {}; } catch(e){}
                const ew = (settings && settings.ewallet) || {};
                const wallets = [
                    { id:'tng', name:'Touch \'n Go eWallet', refPattern: /^\d{16,20}$/, refHint:'16-20 digit' },
                    { id:'boost', name:'Boost', refPattern: /^[A-Za-z0-9]{8,}$/, refHint:'min 8 alphanumeric' },
                    { id:'grabpay', name:'GrabPay', refPattern: /^[A-Z0-9]{10,}$/i, refHint:'min 10 alphanumeric' },
                    { id:'shopeepay', name:'ShopeePay', refPattern: /^[A-Z0-9-]{10,}$/i, refHint:'min 10 alphanumeric' },
                    { id:'mae', name:'MAE by Maybank', refPattern: /^\d{6,}$/, refHint:'min 6 digit' }
                ];
                const enabled = wallets.filter(w => ew[w.id] && ew[w.id].enabled);
                if (enabled.length === 0) {
                    // B12: show empty state instead of fallback
                    sel.innerHTML = '<option value="">— Configure e-wallets dulu di Compliance —</option>';
                    sel.disabled = true;
                    if (emptyMsg) emptyMsg.style.display = 'block';
                    window.__ewalletPatterns = {};
                } else {
                    sel.disabled = false;
                    if (emptyMsg) emptyMsg.style.display = 'none';
                    sel.innerHTML = '<option value="">— Pilih e-wallet —</option>'
                        + enabled.map(w => '<option value="'+w.name+'" data-pattern="'+w.refPattern.source+'" data-hint="'+w.refHint+'">'+w.name+'</option>').join('');
                    // Stash patterns for validation in checkout
                    window.__ewalletPatterns = {};
                    enabled.forEach(w => { window.__ewalletPatterns[w.name] = { pattern: w.refPattern, hint: w.refHint }; });
                }
            }
            const ref = document.getElementById('ewalletRef'); if (ref) ref.value = '';
        } else {
            sub.style.display = 'none';
        }
    }
}

window.clearCart = function() {
    cart = [];
    renderCart();
}

window.processNewCheckout = async function() {
    if(cart.length === 0) { if (typeof showToast==='function') showToast('Troli kosong — scan barang dulu','warning'); else alert('Empty Cart!'); return; }
    const btn = document.getElementById("checkoutBtn");
    btn.disabled = true; 
    btn.textContent = "Processing Omnichannel FIFO...";

    try {
        let transactionsPayload = []; let totalVal = 0;
        const cn = document.getElementById("checkoutChannel").value;
        const cst = document.getElementById("checkoutStatus").value;
        let pm = document.getElementById("paymentMethod").value;
        const custNameText = document.getElementById("customerName").value.trim() || 'Walk-In';
        const custPhoneText = document.getElementById("customerPhone").value.trim();

        // E-Wallet manual-confirm: require provider + ref number with format validation (B11)
        let ewalletRef = null, ewalletProvider = null;
        if (pm === 'E-Wallet') {
            ewalletProvider = document.getElementById("ewalletProvider").value;
            ewalletRef = document.getElementById("ewalletRef").value.trim();
            const fail = (msg) => {
                btn.disabled=false; btn.textContent="PENGESAHAN BAYARAN";
                if (typeof showToast === 'function') showToast(msg, 'error'); else alert(msg);
            };
            if (!ewalletProvider) { fail('Pilih e-wallet provider.'); return; }
            if (!ewalletRef) { fail('Ref # dari customer\'s confirmation screen wajib.'); return; }
            const patterns = window.__ewalletPatterns || {};
            const meta = patterns[ewalletProvider];
            if (meta && !meta.pattern.test(ewalletRef)) { fail('Ref # format tak match '+ewalletProvider+' ('+meta.hint+'). Verify dengan customer.'); return; }
            pm = ewalletProvider + ' (Ref: ' + ewalletRef + ')';
        }
        // B14: optional buyer TIN for e-Invoice
        const buyerTin = (document.getElementById("customerBuyerTin")?.value || '').trim();

        for (const item of cart) {
            totalVal = round2(totalVal + item.price * item.quantity);
            let needed = item.quantity;
            let batches = inventoryBatches.filter(b => b.sku===item.sku && b.qty_remaining>0).sort((a,b) => new Date(a.inbound_date) - new Date(b.inbound_date));
            // Track exact batch allocation per item (B7 perfect fix — refund can restock to same batches)
            item.batch_alloc = [];
            for (let batch of batches) {
                if (needed <= 0) break;
                let deduct = Math.min(needed, batch.qty_remaining);
                needed -= deduct;
                await db.from('inventory_batches').update({qty_remaining: batch.qty_remaining - deduct}).eq('id', batch.id);
                transactionsPayload.push({sku: item.sku, batch_id: batch.id, transaction_type: 'OUTBOUND_SALE', qty_change: -deduct});
                item.batch_alloc.push({ batch_id: batch.id, qty: deduct });
            }
        }

        if(transactionsPayload.length > 0) await db.from('inventory_transactions').insert(transactionsPayload);

        // Points & CRM System
        const earnedPoints = Math.floor(totalVal);
        if(custNameText !== 'Walk-In') {
             const existing = customersData.find(c => c.name.toLowerCase() === custNameText.toLowerCase() || (c.phone === custPhoneText && custPhoneText !== ''));
             if(!existing) {
                 await db.from('customers').insert([{name: custNameText, phone: custPhoneText, points: earnedPoints}]);
             } else {
                 await db.from('customers').update({points: (existing.points || 0) + earnedPoints, phone: custPhoneText || existing.phone}).eq('id', existing.id);
             }
        }

        // VIP auto-discount: apply if window.__currentCheckoutVip is set
        let vipDiscountAmt = 0;
        let finalTotal = totalVal;
        const vip = window.__currentCheckoutVip;
        if(vip && vip.discount_pct > 0) {
            vipDiscountAmt = round2(totalVal * vip.discount_pct / 100);
            finalTotal = round2(totalVal - vipDiscountAmt);
        }

        const saleMeta = {};
        if(ewalletProvider) {
            saleMeta.ewallet_provider = ewalletProvider;
            saleMeta.ewallet_ref = ewalletRef;
        }
        if(vip) {
            saleMeta.vip_discount_applied = true;
            saleMeta.vip_discount_pct = vip.discount_pct;
            saleMeta.vip_discount_amount = vipDiscountAmt;
            saleMeta.vip_subtotal_before_discount = totalVal;
            saleMeta.vip_customer_id = vip.customer_id;
        }

        await db.from('sales_history').insert([{
            customer_name: custNameText, customer_phone: custPhoneText, payment_method: pm, channel: cn, status: cst,
            total: finalTotal, total_amount: finalTotal, items: cart,
            staff_name: currentUser ? currentUser.name : 'Unknown',
            buyer_tin: buyerTin || null,
            metadata: Object.keys(saleMeta).length ? saleMeta : null
        }]);
        // Use finalTotal downstream
        totalVal = finalTotal;

        const invId = "INV-10C-" + Math.floor(1000 + Math.random() * 9000);
        const email = document.getElementById("customerEmail").value.trim();
        showReceiptModal(invId, custNameText, email, totalVal, [...cart]);

        cart = [];
        document.getElementById("customerName").value = "";
        document.getElementById("customerPhone").value = "";
        document.getElementById("customerEmail").value = "";
        const tinEl = document.getElementById("customerBuyerTin"); if (tinEl) tinEl.value = "";
        const ewRefEl = document.getElementById("ewalletRef"); if (ewRefEl) ewRefEl.value = "";
        const ewProvEl = document.getElementById("ewalletProvider"); if (ewProvEl) ewProvEl.value = "";
        const ewSub = document.getElementById("ewalletSubPanel"); if (ewSub) ewSub.style.display = "none";
        document.getElementById('checkoutPaymentModal').style.display = 'none';
        await initApp(); 
        renderCart();
    } catch (e) { console.error(e); if (typeof showToast==='function') showToast('Fatal Error: ' + e.message, 'error'); else alert('Fatal Error: ' + e.message); }
    
    if(btn) { btn.disabled = false; btn.textContent = "PENGESAHAN BAYARAN"; }
}

window.dispatchEmailReceipt = function() {
    const emailStr = document.getElementById('customerEmail')?.value;
    const btn = document.getElementById('sendEmailBtn');
    
    if(!emailStr) {
        alert("Sila isikan alamat e-mel pelanggan terlebih dahulu!");
        return;
    }
    
    // Dummy EmailJS integration implementation for Phase 1
    btn.innerHTML = "Menghantar...";
    btn.disabled = true;
    
    setTimeout(() => {
        btn.innerHTML = " Berjaya Dihantar!";
        btn.style.background = "var(--success)";
        alert("E-Resit berjaya diviralkan ke: " + emailStr + "\\n(Nota Fasa 1: E-Mel dihantar menerusi mock-service. EmailJS sedia disambungkan!).");
    }, 1500);
}

// ===================================
// CUSTOMERS CRM TABLE & HISTORY
// ===================================
window.viewCustomerHistory = function(cName) {
    const hist = salesHistory.filter(s => s.customer_name === cName);
    const container = document.getElementById("staffHistoryContent");
    document.getElementById("staffHistoryCustName").textContent = `Pelanggan: ${cName} (Keseluruhan: ${hist.length} Rekod)`;
    
    if(hist.length === 0) {
        container.innerHTML = '<p style="text-align:center; color:var(--text-muted); margin-top:20px;">Tiada rekod pembelian dijumpai untuk pelanggan ini.</p>';
    } else {
        container.innerHTML = hist.map(h => `
            <div style="background:#FFF; padding:15px; border-radius:8px; border:1px solid var(--border-color); margin-bottom:10px;">
                <div style="display:flex; justify-content:space-between; margin-bottom:8px;">
                    <strong style="font-size:14px;">${new Date(h.created_at).toLocaleString('en-GB')}</strong>
                    <span style="font-weight:bold; color:var(--primary);">RM ${parseFloat(h.total || 0).toFixed(2)}</span>
                </div>
                <div style="font-size:12px; color:var(--text-muted); margin-bottom:10px;">
                    Channel: ${h.channel} | Kaedah: ${h.payment_method}
                </div>
                <div style="font-size:12px; border-top:1px dashed #eee; padding-top:8px;">
                    ${(h.items || []).map(i => `${i.quantity}x ${i.name}`).join('<br>')}
                </div>
            </div>
        `).join('');
    }
    document.getElementById("staffCustomerHistoryModal").style.display = "flex";
};

function renderCustomers() {
    // Delegate to v2 if it exists (post Shopify migration enrichment)
    if(typeof renderCustomersV2 === 'function') return renderCustomersV2();
    // Fallback: old shape
    const tbody = document.getElementById("customersTableBody");
    if(!tbody) return;
    tbody.innerHTML = '<tr><td colspan="9">Loading...</td></tr>';
}

// ===================================
// PROMOTIONS TABLE
// ===================================
function renderPromotions() {
    const tbody = document.getElementById("promotionsTableBody");
    if(!tbody) return;
    tbody.innerHTML = "";
    db.from('promotions').select('*').then(({data}) => {
        if(!data || data.length === 0) { tbody.innerHTML = '<tr><td colspan="4">Tiada promosi aktif.</td></tr>'; return; }
        data.forEach(p => {
            tbody.innerHTML += `<tr>
                <td><strong>${p.code}</strong></td>
                <td>${p.discount_type}</td>
                <td style="font-weight:bold;">${p.discount_type === 'percent' ? p.discount_value + '%' : 'RM' + parseFloat(p.discount_value).toFixed(2)}</td>
                <td>${p.active ? '<span style="color:#10B981; font-weight:bold;">Active </span>' : '<span style="color:#EF4444;">Inactive</span>'}</td>
            </tr>`;
        });
    });
}

// ===================================
// AUTHENTICATION LOGIC (MULTI-USER)
// ===================================

// Salt format: <staff_id>:<pin>:10camp_salt_v1, SHA-256 hex
async function hashPin(staffId, pin) {
    const text = `${staffId}:${pin}:10camp_salt_v1`;
    const buf = new TextEncoder().encode(text);
    const hashBuf = await crypto.subtle.digest('SHA-256', buf);
    return Array.from(new Uint8Array(hashBuf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

const authUsers = [
    { name: 'brozaidtodak', role: 'superior', pin_hash: '50d1e0682d0e472acc6a9dc109911c4703ddb14ebfa90c3b051f541111626343', dept: 'Managing Director', email: 'zaid@10camp.com', staff_id: 'CMP001', full_name: 'Muhammad Zaid Ariffuddin Bin Zainal Ariffin', join_date: '2020-02-03' },
    { name: 'Aliff', role: 'mgmt', pin_hash: '33ffc079d45afe132295ee5e09980e872c3be2334df23aeb1ee52d0c7c9cfcec', dept: 'Administrative Department', email: 'aliff@10camp.com', staff_id: 'CMP008', full_name: 'Muhammad Aliff Ashraf Bin Johar', join_date: '2024-07-01' },
    { name: 'Farhan Moyy', role: 'mgmt', pin_hash: 'bed579f196a5bbb1ffbf1ba2b3c9bdd754a28680861ce96103794e25527d914e', dept: 'Business Development Department', email: 'farhanwakiman@10camp.com', staff_id: 'CMP010', full_name: 'Mohamad Farhan Bin Wakiman', join_date: '2025-09-01' },
    { name: 'Zack', role: 'mgmt', pin_hash: 'e5f99d4a4886603bb5c9dd78b4c529ee3657dcf6818a93aff697f7436eef36ca', dept: 'System Manager Department', email: 'zack@10camp.com', staff_id: 'CMP005', full_name: 'Muhammad Nur Zakwan Bin Md Mahalli', join_date: '2024-07-01' },
    { name: 'Ariff', role: 'sales', pin_hash: '3392222a8b235180e57307768e7f2200e8ca4ae32ea6cd065572d22f5a7923d7', dept: 'Sales & Product Department', email: 'ariff@10camp.com', staff_id: 'CMP006', full_name: 'Muhammad Zaimuddin Ariff Bin Zainal Ariffin', join_date: '2024-07-01' },
    { name: 'Irfan', role: 'sales', pin_hash: '1ac46628226b2db70ab61adf7e7912aa6456b7c703c1b922a9a5bba78d16396c', dept: 'Marketing Interim', email: 'irfan@10camp.com', staff_id: 'CMP003', full_name: 'Muhammad Irfansyah Bin Abd Fattah', join_date: '2024-07-01' },
    { name: 'Tarmizi Kael', role: 'inventory', pin_hash: '4c3c39d9b9cd41540b359ffed45b97d5b76b04a6461d1cdedb79eb4003727779', dept: 'Chief Inventory', email: 'tarmizi@10camp.com', staff_id: 'CMP011', full_name: 'Tarmizi bin Rusli', join_date: '2025-08-11' },
    { name: 'Fahmi', role: 'inventory', pin_hash: '1eeab06ad295d2d41259419cb3a5d1d914ddd9c9e70c66e658042341986c91de', dept: 'Inventory Assistance', email: 'fahmi@10camp.com', staff_id: 'CMP009', full_name: 'Shahrul Fahmi Bin Ramlee', join_date: '2024-07-01' }
];


let currentUser = null;
let currentUserRole = null;
let currentPublicCustomer = null;

window.handleCustomerLogin = async function() {
    const phone = document.getElementById("customerLoginPhone").value.trim();
    if(!phone) return alert("Sila masukkan nombor telefon yang sah.");
    
    // Check if customer exists in current customersData
    let existing = customersData.find(c => c.phone === phone);
    
    if(!existing) {
        // Pseudo-registration: create a new skeleton record without name to force them to fill their name at checkout
        const newCustomerObj = { name: "Pelanggan VIP", phone: phone, points: 0, address: "" };
        try {
            const { data } = await db.from('customers').insert([newCustomerObj]).select();
            if(data) {
                existing = data[0];
                customersData.push(existing);
            } else {
                existing = newCustomerObj; // Fallback
            }
        } catch(e) {
            existing = newCustomerObj; 
        }
    }
    
    currentPublicCustomer = existing;
    document.getElementById("customerLoginGate").style.display = "none";
    
    const btn = document.getElementById("btnCustomerPortal");
    if(btn) {
        btn.textContent = `Hi, ${existing.name.split(' ')[0]} (Pts: ${existing.points || 0})`;
    }
    
    if (typeof showToast==='function') showToast(`Berjaya Log Masuk · ${existing.points || 0} Points`, 'success'); else alert(`Berjaya Log Masuk. Anda kini mempunyai ${existing.points || 0} Points.`);
};

// Open the PIN login overlay; populate the staff dropdown (active only).
function handleLogin() {
    const overlay = document.getElementById('pinLoginOverlay');
    if(!overlay) {
        console.error('pinLoginOverlay not found in DOM');
        return;
    }
    let inactive = [];
    try { inactive = JSON.parse(localStorage.getItem('staffInactive_v1') || '[]'); } catch(e){}
    const sel = document.getElementById('pinLoginStaff');
    if(sel) {
        sel.innerHTML = authUsers
            .filter(u => !inactive.includes(u.staff_id))
            .map(u => `<option value="${u.staff_id}">${u.name} — ${u.dept}</option>`)
            .join('');
    }
    const pinInput = document.getElementById('pinLoginInput');
    if(pinInput) pinInput.value = '';
    const errEl = document.getElementById('pinLoginError');
    if(errEl) errEl.textContent = '';
    overlay.style.display = 'flex';
    // Refresh lockout state for whoever is currently selected
    if(typeof refreshPinLockoutMsg === 'function') refreshPinLockoutMsg();
    setTimeout(() => { if(pinInput) pinInput.focus(); }, 50);
}

// Per-staff lockout: 5 wrong attempts -> locked for 5 minutes.
const PIN_LOCKOUT_KEY = 'pinLockout_v1';
const PIN_MAX_ATTEMPTS = 5;
const PIN_LOCKOUT_MS = 5 * 60 * 1000;

function getPinLockoutState() {
    try { return JSON.parse(localStorage.getItem(PIN_LOCKOUT_KEY) || '{}'); }
    catch(e) { return {}; }
}
function setPinLockoutState(state) {
    localStorage.setItem(PIN_LOCKOUT_KEY, JSON.stringify(state));
}
function refreshPinLockoutMsg() {
    const sel = document.getElementById('pinLoginStaff');
    const errEl = document.getElementById('pinLoginError');
    if(!sel || !errEl) return;
    const staffId = sel.value;
    const state = getPinLockoutState();
    const rec = state[staffId];
    if(rec && rec.lockedUntil && rec.lockedUntil > Date.now()) {
        const mins = Math.ceil((rec.lockedUntil - Date.now()) / 60000);
        errEl.textContent = `Akaun terkunci. Cuba semula dalam ~${mins} minit.`;
        errEl.style.color = '#dc2626';
    } else {
        errEl.textContent = '';
    }
}

window.handleLogin = handleLogin;
window.refreshPinLockoutMsg = refreshPinLockoutMsg;

window.submitPinLogin = async function() {
    const sel = document.getElementById('pinLoginStaff');
    const pinInput = document.getElementById('pinLoginInput');
    const errEl = document.getElementById('pinLoginError');
    if(!sel || !pinInput || !errEl) return;

    const staffId = sel.value;
    const pin = (pinInput.value || '').trim();
    const user = authUsers.find(u => u.staff_id === staffId);
    if(!user) { errEl.textContent = 'Staff tidak dijumpai.'; errEl.style.color = '#dc2626'; return; }
    if(!/^\d{4,8}$/.test(pin)) { errEl.textContent = 'PIN mesti 4-8 digit nombor.'; errEl.style.color = '#dc2626'; return; }

    const state = getPinLockoutState();
    const rec = state[staffId] || { attempts: 0, lockedUntil: 0 };
    if(rec.lockedUntil && rec.lockedUntil > Date.now()) {
        const mins = Math.ceil((rec.lockedUntil - Date.now()) / 60000);
        errEl.textContent = `Akaun terkunci. Cuba semula dalam ~${mins} minit.`;
        errEl.style.color = '#dc2626';
        return;
    }

    const computed = await hashPin(staffId, pin);
    if(computed !== user.pin_hash) {
        rec.attempts = (rec.attempts || 0) + 1;
        if(rec.attempts >= PIN_MAX_ATTEMPTS) {
            rec.lockedUntil = Date.now() + PIN_LOCKOUT_MS;
            rec.attempts = 0;
            errEl.textContent = `Salah PIN ${PIN_MAX_ATTEMPTS} kali. Akaun dikunci 5 minit.`;
        } else {
            const left = PIN_MAX_ATTEMPTS - rec.attempts;
            errEl.textContent = `PIN salah. Tinggal ${left} cubaan.`;
        }
        errEl.style.color = '#dc2626';
        state[staffId] = rec;
        setPinLockoutState(state);
        pinInput.value = '';
        return;
    }

    // Success — clear lockout, close overlay, boot session
    delete state[staffId];
    setPinLockoutState(state);
    pinInput.value = '';
    const overlay = document.getElementById('pinLoginOverlay');
    if(overlay) overlay.style.display = 'none';
    loginAs(user);
};

// Onboarding wizard state — first-run setup for superior on fresh install.
const ONBOARDING_KEY = 'onboardingCompleted_v1';
let __obwStep = 1;
const __obwTotalSteps = 4;

function obwShowStep(n) {
    __obwStep = Math.max(1, Math.min(__obwTotalSteps, n));
    document.querySelectorAll('#onboardingOverlay .obw-step').forEach(el => {
        el.style.display = (parseInt(el.getAttribute('data-step')) === __obwStep) ? 'block' : 'none';
    });
    const stepNumEl = document.getElementById('obwStepNum'); if (stepNumEl) stepNumEl.textContent = __obwStep;
    const prog = document.getElementById('obwProgress'); if (prog) prog.style.width = (__obwStep * 100 / __obwTotalSteps) + '%';
    const back = document.getElementById('obwBackBtn'); if (back) back.style.display = (__obwStep === 1) ? 'none' : 'block';
    const next = document.getElementById('obwNextBtn'); if (next) next.textContent = (__obwStep === __obwTotalSteps) ? '✓ Finish' : 'Next →';
    const err = document.getElementById('obwError'); if (err) err.textContent = '';
}

window.__obwBack = function() { obwShowStep(__obwStep - 1); };

window.__obwSkip = function() {
    if (!confirm('Skip semua wizard? Boleh setup manual lepas ni di Compliance section.')) return;
    localStorage.setItem(ONBOARDING_KEY, 'skipped');
    document.getElementById('onboardingOverlay').style.display = 'none';
};

window.__obwNext = async function() {
    const errEl = document.getElementById('obwError');
    if (errEl) errEl.textContent = '';

    // Step 1: validate + save shop info
    if (__obwStep === 1) {
        const name = document.getElementById('obwShopName').value.trim();
        if (!name) { if(errEl) errEl.textContent = 'Nama kedai wajib.'; return; }
        let s = {};
        try { s = JSON.parse(localStorage.getItem('complianceSettings_v1')) || {}; } catch(e){}
        s.shop = Object.assign({}, s.shop || {}, {
            name,
            phone: document.getElementById('obwShopPhone').value.trim(),
            email: document.getElementById('obwShopEmail').value.trim(),
            address: document.getElementById('obwShopAddress').value.trim(),
            footer: 'THANK YOU FOR SHOPPING AT ' + name.toUpperCase()
        });
        localStorage.setItem('complianceSettings_v1', JSON.stringify(s));
    }

    // Step 2: SST
    if (__obwStep === 2) {
        const reg = document.getElementById('obwSstRegistered').checked;
        let s = {};
        try { s = JSON.parse(localStorage.getItem('complianceSettings_v1')) || {}; } catch(e){}
        s.sst = {
            registered: reg,
            number: reg ? document.getElementById('obwSstNumber').value.trim() : '',
            rate: parseFloat(document.getElementById('obwSstRate').value) || 6,
            inclusive: document.getElementById('obwSstInclusive').checked
        };
        localStorage.setItem('complianceSettings_v1', JSON.stringify(s));
    }

    // Step 3: optional sample product
    if (__obwStep === 3) {
        const sku = document.getElementById('obwProdSku').value.trim();
        const pName = document.getElementById('obwProdName').value.trim();
        const pPrice = parseFloat(document.getElementById('obwProdPrice').value);
        const pQty = parseInt(document.getElementById('obwProdQty').value);
        if (sku || pName || !isNaN(pPrice) || !isNaN(pQty)) {
            // User filled at least one field — require all
            if (!sku || !pName || isNaN(pPrice) || isNaN(pQty)) {
                if(errEl) errEl.textContent = 'Isi SEMUA field, atau kosongkan SEMUA untuk skip step ni.';
                return;
            }
            try {
                if (typeof db !== 'undefined' && db) {
                    const { error: e1 } = await db.from('products_master').insert([{ sku, name: pName, price: pPrice, is_published: true }]);
                    if (e1 && !String(e1.message||'').toLowerCase().includes('duplicate')) throw e1;
                    const { error: e2 } = await db.from('inventory_batches').insert([{ sku, qty_remaining: pQty, qty_initial: pQty, inbound_date: new Date().toISOString().slice(0,10), cost_price: pPrice * 0.6 }]);
                    if (e2) console.warn('[obw] batch insert warn:', e2);
                }
            } catch(e) {
                console.error('[obw] sample insert failed:', e);
                if(errEl) errEl.textContent = 'Gagal save produk: '+(e.message||e);
                return;
            }
        }
    }

    // Step 4: finish
    if (__obwStep === __obwTotalSteps) {
        localStorage.setItem(ONBOARDING_KEY, 'completed');
        document.getElementById('onboardingOverlay').style.display = 'none';
        if (typeof showToast === 'function') showToast('Setup siap. Selamat berniaga!', 'success');
        if (typeof initApp === 'function') { try { await initApp(); } catch(e){} }
        if (typeof renderCompliancePanel === 'function') renderCompliancePanel();
        return;
    }

    obwShowStep(__obwStep + 1);
};

function maybeShowOnboarding(user) {
    if (!user || user.role !== 'superior') return;
    const status = localStorage.getItem(ONBOARDING_KEY);
    if (status) return; // already completed or skipped
    const overlay = document.getElementById('onboardingOverlay');
    if (!overlay) return;
    // Pre-fill from existing settings if any (re-running scenario)
    try {
        const s = JSON.parse(localStorage.getItem('complianceSettings_v1')) || {};
        const shop = s.shop || {}; const sst = s.sst || {};
        const setVal = (id, v) => { const el = document.getElementById(id); if (el && v !== undefined) el.value = v; };
        setVal('obwShopName', shop.name);
        setVal('obwShopPhone', shop.phone);
        setVal('obwShopEmail', shop.email);
        setVal('obwShopAddress', shop.address);
        const sstReg = document.getElementById('obwSstRegistered'); if (sstReg) { sstReg.checked = !!sst.registered; }
        const sstFields = document.getElementById('obwSstFields'); if (sstFields) sstFields.style.display = sst.registered ? 'block' : 'none';
        setVal('obwSstNumber', sst.number);
        setVal('obwSstRate', sst.rate || 6);
        const sstIncl = document.getElementById('obwSstInclusive'); if (sstIncl) sstIncl.checked = sst.inclusive !== false;
    } catch(e){}
    // Wire SST checkbox toggle inside wizard
    const sstCb = document.getElementById('obwSstRegistered');
    if (sstCb && !sstCb.dataset.bound) {
        sstCb.addEventListener('change', () => {
            document.getElementById('obwSstFields').style.display = sstCb.checked ? 'block' : 'none';
        });
        sstCb.dataset.bound = '1';
    }
    obwShowStep(1);
    overlay.style.display = 'flex';
}

// Boot a session for the given user (was the body of handleLogin).
function loginAs(user) {
    if(!user) return;
    currentUser = user;
    currentUserRole = user.role;
    setTimeout(() => maybeShowOnboarding(user), 600); // run after welcome modal closes


    checkMyAttendanceStatus();
    if(typeof renderPersonalCommission === "function") renderPersonalCommission();
    
    // Popup Greeting Staff
    if(globalMemo.active) {
        alert(" PENGUMUMAN DARI PENGURUSAN:\n\n" + globalMemo.text);
    }

    const modalName = document.getElementById("welcomeStaffName");
    const modalDept = document.getElementById("welcomeStaffDept");
    if(modalName) modalName.textContent = `Staff Mode Diaktifkan`;
    if(modalDept) modalDept.textContent = `Akses Penuh: System Admin`;
    
    const welcomeModal = document.getElementById("staffWelcomeModal");
    if(welcomeModal) welcomeModal.style.display = "flex";
    
    document.getElementById("shopAppLayout").style.display = "none";
    document.getElementById("posAppLayout").style.display = "block";
    
    // Crown indicator for top tiers
    let displayCrown = ['superior', 'mgmt', 'inventory'].includes(user.role) ? ' ' : '';
    document.getElementById("sessionUsername").textContent = "Hi, " + (user.name.split(' ')[1] || user.name) + displayCrown;
    
    const salesMenus = document.querySelectorAll(".sales-only");
    const invMenus = document.querySelectorAll(".inv-only");
    const mgmtMenus = document.querySelectorAll(".mgmt-only");
    const superiorMenus = document.querySelectorAll(".superior-only");
    
    // Hide all restricted menus initially
    salesMenus.forEach(el => el.style.display = "none");
    invMenus.forEach(el => el.style.display = "none");
    mgmtMenus.forEach(el => el.style.display = "none");
    superiorMenus.forEach(el => el.style.display = "none");

    if (user.role === 'superior') {
        // Superior sees everything
        salesMenus.forEach(el => el.style.display = "block");
        invMenus.forEach(el => el.style.display = "block");
        mgmtMenus.forEach(el => el.style.display = "block");
        superiorMenus.forEach(el => el.style.display = "block");
        switchHub(['homeSection'], 'Overview', document.querySelector('.menu-item[data-tab="overview"]'));
    } else if (user.role === 'mgmt') {
        // Management sees Mgmt, Sales, Inv, but NOT superior
        salesMenus.forEach(el => el.style.display = "block");
        invMenus.forEach(el => el.style.display = "block");
        mgmtMenus.forEach(el => el.style.display = "block");
        switchHub(['homeSection'], 'Overview', document.querySelector('.menu-item[data-tab="overview"]'));
    } else if (user.role === 'inventory') {
        // Inventory team rules
        invMenus.forEach(el => el.style.display = "block");
        switchHub(['inventorySection'], 'Product Mapping', document.querySelector('.menu-item[data-tab="inv_mapping"]'));
    } else if (user.role === 'sales') {
        // Sales team rules
        salesMenus.forEach(el => el.style.display = "block");
        switchHub(['commissionSection'], 'Personal Sales & Commission', document.querySelector('.menu-item[data-tab="sales_commission"]'));
    }
}

function handleLogout() {
    currentUser = null;
    currentUserRole = null;
    document.getElementById("shopAppLayout").style.display = "block";
    document.getElementById("posAppLayout").style.display = "none";
    document.getElementById("sessionUsername").textContent = "EasyPOS PRO";
    document.getElementById("appSidebar").classList.remove('open');
    document.getElementById("sidebarOverlay").classList.remove('active');
    
    const allSections = document.querySelectorAll(".tab-section");
    allSections.forEach(el => el.style.display = "none");
}

setTimeout(() => {
    document.getElementById("searchInput")?.addEventListener('input', e => renderPOS(e.target.value));
    const dateObj = new Date();
    const firstDay = new Date(dateObj.getFullYear(), dateObj.getMonth(), 1);
    document.getElementById('dashStartDate').value = firstDay.toISOString().split('T')[0];
    document.getElementById('dashEndDate').value = dateObj.toISOString().split('T')[0];
    
    if(localStorage.getItem('posMode') === 'mobile') {
        document.body.classList.add('pos-mobile-mode');
    }

    if(db) initApp();
}, 200);

// ===================================
// PUBLIC E-COMMERCE ENGINE
// ===================================
function renderPublicStorefront() {
    const list = document.getElementById("publicProductsList");
    if(!list) return;
    let htmlBuf2 = "";

    let filtered = masterProducts.filter(p => isPublished(p));
    const totalPages = Math.ceil(filtered.length / itemsPerPage) || 1;
    if(publicCurrentPage > totalPages) publicCurrentPage = totalPages;
    if(publicCurrentPage < 1) publicCurrentPage = 1;

    let sliced = filtered.slice((publicCurrentPage - 1) * itemsPerPage, publicCurrentPage * itemsPerPage);

    sliced.forEach(p => {

        const myBatches = inventoryBatches.filter(b => b.sku === p.sku && b.qty_remaining > 0);
        const totalStock = myBatches.reduce((sum, b) => sum + b.qty_remaining, 0);
        let thumb = p.images && p.images[0] ? p.images[0] : "https://placehold.co/300x200?text=No+Img";

        htmlBuf2 += `
            <div class="product-card" style="border:none; box-shadow:0 4px 15px rgba(0,0,0,0.05); padding:0; overflow:hidden;">
                <img src="${thumb}" style="width:100%; height:200px; object-fit:cover;">
                <div style="padding:15px;">
                    <span class="cat-badge">${p.category||'Uncat'}</span>
                    <h3 style="margin-top:10px; font-size:16px; height:40px; overflow:hidden; font-weight:700;">${p.name}</h3>
                    <p class="price" style="font-size:18px; font-weight:900;">RM ${parseFloat(p.price).toFixed(2)}</p>
                    <button onclick="addToPublicCart('${p.sku}')" style="width:100%; border-radius:50px; background:#111; color:white; padding:12px; border:none; margin-top:10px; cursor:pointer; font-weight:bold; font-size:13px;" ${totalStock <= 0 ? 'disabled' : ''}>${totalStock <= 0 ? 'Sold Out' : 'Add to Cart '}</button>
                </div>
            </div>
        `;
    });
    
    htmlBuf2 += `
        <div style="width:100%; display:flex; justify-content:center; align-items:center; gap:20px; margin-top:30px; grid-column: 1 / -1; font-family:Inter;">
            <button onclick="changePublicPage(-1)" ${publicCurrentPage <= 1 ? 'disabled style="opacity:0.5"' : 'style="cursor:pointer"'} style="padding:10px 20px; background:#f0f0f0; border:none; border-radius:5px; font-weight:bold;"> Back</button>
            <span style="font-size:15px; color:#444;">Page <b>${publicCurrentPage}</b> / ${totalPages}</span>
            <button onclick="changePublicPage(1)" ${publicCurrentPage >= totalPages ? 'disabled style="opacity:0.5"' : 'style="cursor:pointer"'} style="padding:10px 20px; background:#111; color:white; border:none; border-radius:5px; font-weight:bold;">Next </button>
        </div>
    `;
    list.innerHTML = htmlBuf2;
}

let publicCart = [];

window.togglePublicCart = function() {
    const drw = document.getElementById("publicCartDrawer");
    if(drw.style.display === "none") {
        if(currentPublicCustomer) {
            document.getElementById("custNamePub").value = currentPublicCustomer.name !== "Pelanggan VIP" ? currentPublicCustomer.name : "";
            document.getElementById("custPhonePub").value = currentPublicCustomer.phone || "";
            document.getElementById("custAddressPub").value = currentPublicCustomer.address || "";
        }
        drw.style.display = "flex";
        renderPublicCart();
    } else {
        drw.style.display = "none";
    }
}

window.addToPublicCart = function(sku) {
    const p = masterProducts.find(x => x.sku === sku);
    const totalAvail = inventoryBatches.filter(b => b.sku === sku && b.qty_remaining > 0).reduce((s, b) => s + b.qty_remaining, 0);
    const cartItem = publicCart.find(c => c.sku === sku);
    
    if(cartItem) { if (cartItem.quantity < totalAvail) cartItem.quantity++; else (typeof showToast==='function'?showToast('Stok tak cukup','warning'):alert('Limits reached!')); }
    else { if (totalAvail > 0) publicCart.push({ sku: sku, name: p.name, price: parseFloat(p.price), quantity: 1 }); }
    
    document.getElementById("btnPublicCartCount").textContent = `Cart (${publicCart.reduce((s, c) => s + c.quantity, 0)})`;
    if (typeof showToast==='function') showToast('Ditambah ke troli', 'success'); else alert('Ditambah ke troli!');
}

window.decreasePublicQty = function(sku) {
    const c = publicCart.find(x => x.sku === sku);
    if(c) { if(c.quantity > 1) c.quantity--; else publicCart = publicCart.filter(x => x.sku !== sku); }
    renderPublicCart();
}

window.increasePublicQty = function(sku) {
    const p = masterProducts.find(x => x.sku === sku);
    const totalAvail = inventoryBatches.filter(b => b.sku === sku && b.qty_remaining > 0).reduce((s, b) => s + b.qty_remaining, 0);
    const cartItem = publicCart.find(c => c.sku === sku);
    if(cartItem) { if (cartItem.quantity < totalAvail) cartItem.quantity++; } 
    renderPublicCart();
}

window.removePublicCart = function(sku) {
    publicCart = publicCart.filter(c => c.sku !== sku); 
    renderPublicCart(); 
}

function renderPublicCart() {
    const container = document.getElementById("publicCartItems");
    const label = document.getElementById("publicCartTotalLabel");
    document.getElementById("btnPublicCartCount").textContent = `Cart (${publicCart.reduce((s, c) => s + c.quantity, 0)})`;
    
    if(!container) return; 
    container.innerHTML = ""; 
    let total = 0;
    
    if(publicCart.length === 0) { container.innerHTML = '<p style="color:var(--text-muted); text-align:center; padding-top:20px;">Your cart is empty.</p>'; label.textContent = "0.00"; return; }

    publicCart.forEach(item => {
        total = round2(total + item.price * item.quantity);
        container.innerHTML += `
            <div style="display:flex; justify-content:space-between; margin-bottom:15px; border-bottom:1px solid #f9f9f9; padding-bottom:10px;">
                <div>
                    <strong style="font-size:14px; display:block;">${item.name}</strong>
                    <small style="color:var(--text-muted);">RM${item.price.toFixed(2)} x ${item.quantity}</small>
                </div>
                <div style="display:flex; gap:8px; align-items:center;">
                    <button onclick="decreasePublicQty('${item.sku}')" style="border:1px solid #ddd; background:#fff; width:24px; height:24px; cursor:pointer;">-</button>
                    <span>${item.quantity}</span>
                    <button onclick="increasePublicQty('${item.sku}')" style="border:1px solid #ddd; background:#fff; width:24px; height:24px; cursor:pointer;">+</button>
                    <button onclick="removePublicCart('${item.sku}')" style="color:red; background:none; border:none; cursor:pointer; margin-left:5px;">X</button>
                </div>
            </div>`;
    });
    label.textContent = total.toFixed(2);
}

window.processPublicCheckout = async function() {
    if(publicCart.length === 0) return alert("Cart is empty!");
    
    const cName = document.getElementById("custNamePub").value.trim();
    const cPhone = document.getElementById("custPhonePub").value.trim();
    const cAddr = document.getElementById("custAddressPub").value.trim();
    
    if(!cName || !cPhone || !cAddr) return alert("Sila isikan Nama, Telefon, dan Alamat Penghantaran dengan lengkap!");
    
    const btn = document.getElementById("btnPublicCheckout");
    btn.disabled = true; btn.textContent = "Processing Payment...";

    try {
        let transactionsPayload = []; let totalVal = 0;

        for (const item of publicCart) {
            totalVal = round2(totalVal + item.price * item.quantity);
            let needed = item.quantity;
            let batches = inventoryBatches.filter(b => b.sku===item.sku && b.qty_remaining>0).sort((a,b) => new Date(a.inbound_date) - new Date(b.inbound_date));
            
            for (let batch of batches) {
                if (needed <= 0) break;
                let deduct = Math.min(needed, batch.qty_remaining);
                needed -= deduct;
                await db.from('inventory_batches').update({qty_remaining: batch.qty_remaining - deduct}).eq('id', batch.id);
                transactionsPayload.push({sku: item.sku, batch_id: batch.id, transaction_type: 'OUTBOUND_SALE', qty_change: -deduct});
            }
        }

        if(transactionsPayload.length > 0) await db.from('inventory_transactions').insert(transactionsPayload);

        // Points System Concept (RM 1 = 1 Point)
        const earnedPoints = Math.floor(totalVal);
        let existing = null;
        if(currentPublicCustomer) {
            existing = currentPublicCustomer;
            currentPublicCustomer.name = cName;
            currentPublicCustomer.address = cAddr;
            await db.from('customers').update({name: cName, address: cAddr, points: (existing.points || 0) + earnedPoints}).eq('id', existing.id);
        } else {
            existing = customersData.find(c => c.phone === cPhone || c.name.toLowerCase() === cName.toLowerCase());
            if(!existing) {
                await db.from('customers').insert([{name: cName, phone: cPhone, address: cAddr, points: earnedPoints}]);
            } else {
                await db.from('customers').update({points: (existing.points || 0) + earnedPoints}).eq('id', existing.id);
            }
        }

        // Push to Sales History as E-Commerce Website Order
        const invStr = "WEB-10C-" + Math.floor(1000 + Math.random() * 9000);
        await db.from('sales_history').insert([{
            channel: 'Website',
            status: 'Pending Fulfillment',
            customer_name: cName, 
            payment_method: 'Online Transfer',
            total: totalVal, 
            items: publicCart
        }]);

        publicCart = []; 
        document.getElementById("custNamePub").value = "";
        document.getElementById("custPhonePub").value = "";
        document.getElementById("custAddressPub").value = "";
        
        // Let the customer see the simulated success pop up
        togglePublicCart();
        alert(`Pembayaran Berjaya! Nombor Resit: ${invStr}.\nTerima kasih kerana membeli bersama 10camp.`);
        
        await initApp(); // refresh background dashboard data
    } catch (e) { console.error(e); if (typeof showToast==='function') showToast('Fatal Error: ' + e.message, 'error'); else alert('Fatal Error: ' + e.message); }
    
    btn.disabled = false; btn.textContent = "Confirm Order";
}

// ===================================
// E-RECEIPT & EMAIL SYSTEM
// ===================================
let currentReceiptContext = null;

function showReceiptModal(invId, custName, email, total, cartData) {
    const rc = document.getElementById("receiptContent");
    const d = new Date().toLocaleString('en-GB');
    const shop = (typeof window.getShopInfo === 'function') ? window.getShopInfo() : { name:'10 CAMP', footer:'THANK YOU FOR SHOPPING AT 10 CAMP' };
    let itemsHtml = "";
    cartData.forEach(c => {
        itemsHtml += `<div style="margin-bottom:5px;">${c.quantity}x ${c.name} <span style="float:right">RM ${(c.price * c.quantity).toFixed(2)}</span></div>`;
    });

    let header = `<div style="text-align:center; font-size:16px; font-weight:900; letter-spacing:1px;">${shop.name}</div>`;
    if (shop.address) header += `<div style="text-align:center; font-size:11px; color:var(--text-muted);">${shop.address}</div>`;
    if (shop.phone)   header += `<div style="text-align:center; font-size:11px; color:var(--text-muted);">Tel: ${shop.phone}</div>`;
    if (shop.ssm)     header += `<div style="text-align:center; font-size:10.5px; color:var(--text-muted);">SSM: ${shop.ssm}</div>`;

    rc.innerHTML = `
        ${header}
        <hr style="border-top:1px dashed #ccc; margin:10px 0;">
        <div style="font-weight:bold; margin-bottom:10px;">INVOICE: ${invId}</div>
        <div style="color:var(--text-muted);">Date: ${d}</div>
        <div style="color:var(--text-muted);">Customer: ${custName}</div>
        <div style="color:var(--text-muted); margin-bottom:10px;">Cashier: ${currentUser?.name || 'Staff'}</div>
        <hr style="border-top:1px dashed #ccc; margin:10px 0;">
        ${itemsHtml}
        <hr style="border-top:1px dashed #ccc; margin:10px 0;">
        <div style="font-size:16px; font-weight:bold;">TOTAL <span style="float:right">RM ${total.toFixed(2)}</span></div>
        <div style="text-align:center; margin-top:30px; font-weight:bold; font-size:11px; color:var(--text-muted);">${shop.footer || 'THANK YOU'}</div>
    `;
    
    const phone = (document.getElementById("customerPhone")?.value || '').trim();
    currentReceiptContext = {
        invId, custName, email, phone, total,
        itemsText: cartData.map(c => `${c.quantity}x ${c.name} - RM ${(c.price * c.quantity).toFixed(2)}`).join('%0D%0A'),
        cartData: cartData.map(c => ({ sku:c.sku, name:c.name, price:c.price, quantity:c.quantity }))
    };
    document.getElementById("receiptModal").style.display = "flex";
}

// Build reorder deep-link: same site + ?reorder=<base64 JSON>
function buildReorderLink(cartItems) {
    try {
        const minimal = (cartItems||[]).map(c => ({ s:c.sku, q:c.quantity }));
        const b64 = btoa(unescape(encodeURIComponent(JSON.stringify(minimal))));
        const base = window.location.origin + window.location.pathname.replace(/\/[^/]*$/, '/');
        return base + 'index.html?reorder=' + encodeURIComponent(b64);
    } catch(e) { return ''; }
}

// Send receipt via WhatsApp using wa.me link (opens user's WhatsApp app)
window.dispatchWhatsAppReceipt = function() {
    if (!currentReceiptContext) return;
    const { invId, custName, phone, total, cartData } = currentReceiptContext;
    let target = (phone||'').replace(/[^\d+]/g, '');
    // Normalize to international format. Default MY +60 if local.
    if (target.startsWith('0')) target = '60' + target.slice(1);
    else if (target.startsWith('+')) target = target.slice(1);

    const shop = (typeof window.getShopInfo === 'function') ? window.getShopInfo() : { name:'10 CAMP' };
    const itemsList = (cartData||[]).map(c => `• ${c.quantity}x ${c.name} — RM ${(c.price*c.quantity).toFixed(2)}`).join('\n');
    const reorderUrl = buildReorderLink(cartData);

    const lines = [
        `Hi ${custName||'there'},`,
        ``,
        `Terima kasih beli barang dari *${shop.name}*!`,
        ``,
        `📄 Receipt: *${invId}*`,
        `📅 ${new Date().toLocaleString('en-MY')}`,
        ``,
        `*Items:*`,
        itemsList,
        ``,
        `*TOTAL: RM ${total.toFixed(2)}*`,
        ``
    ];
    if (reorderUrl) {
        lines.push(`🔁 Reorder semua benda ni: ${reorderUrl}`);
        lines.push('');
    }
    lines.push(shop.footer || 'Hope to see you again!');
    const text = lines.join('\n');

    // wa.me opens WhatsApp Web/app with pre-filled message. Phone target optional.
    const url = target
        ? `https://wa.me/${target}?text=${encodeURIComponent(text)}`
        : `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
};

window.closeReceipt = function() {
    document.getElementById("receiptModal").style.display = "none";
};

document.getElementById("sendEmailBtn").onclick = function() {
    if(!currentReceiptContext) return;
    const { invId, custName, email, total, itemsText } = currentReceiptContext;
    const targetEmail = email || "";
    if(!targetEmail) { alert("Sila masukkan emel pelanggan terlebih dahulu sebelum menghantar resit."); return; }

    const subject = `E-Receipt ${invId} from 10camp`;
    const body = `Hi ${custName},%0D%0A%0D%0AThank you for shopping at 10camp! Here is your e-receipt:%0D%0A%0D%0AInvoice: ${invId}%0D%0A%0D%0AItems:%0D%0A${itemsText}%0D%0A%0D%0ATOTAL: RM ${total.toFixed(2)}%0D%0A%0D%0AHope to see you again soon!`;
    
    window.location.href = `mailto:${targetEmail}?subject=${subject}&body=${body}`;
};

// ===================================
// FINANCE & P&L MODULE (SUPER ADMIN)
// ===================================
function renderFinance() {
    const list = document.getElementById("financeLedgerBody");
    if(!list) return;

    // 1. Render Ledger Table
    let html = "";
    let totalExp = 0;
    financeRecords.forEach(f => {
        totalExp = round2(totalExp + parseFloat(f.amount || 0));
        html += `
            <tr>
                <td>${f.month} ${f.year}</td>
                <td><span class="cat-badge" style="background:#EF4444; color:#fff;">${f.category}</span></td>
                <td>${f.description}</td>
                <td style="color:#EF4444;">-RM ${parseFloat(f.amount).toFixed(2)}</td>
                <td><button onclick="deleteFinance(${f.id})" style="background:none; border:none; color:red; cursor:pointer;" title="Delete Record"></button></td>
            </tr>
        `;
    });
    list.innerHTML = html || '<tr><td colspan="5">No expenses recorded yet.</td></tr>';

    // 2. Calculate Gross Revenue from Sales History
    let totalRev = 0;
    salesHistory.forEach(s => { totalRev = round2(totalRev + parseFloat(s.amount || 0)); });

    // 3. Update P&L KPI Widgets
    document.getElementById("financeGrossRev").textContent = `RM ${totalRev.toFixed(2)}`;
    document.getElementById("financeTotalExp").textContent = `RM ${totalExp.toFixed(2)}`;
    
    let net = totalRev - totalExp;
    const netEl = document.getElementById("financeNetProfit");
    netEl.textContent = `RM ${net.toFixed(2)}`;
    netEl.style.color = net >= 0 ? "#22C55E" : "#EF4444";

    // 4. Render Chart.js P&L Trend
    const ctx = document.getElementById('financeChart');
    if(!ctx) return;
    
    // Group Revenue by Month/Year (Naive representation based on salesHistory dates)
    const revMap = {};
    salesHistory.forEach(s => {
        let d = new Date(s.created_at);
        let key = d.toLocaleString('default', { month: 'short' }) + ' ' + d.getFullYear();
        revMap[key] = (revMap[key] || 0) + parseFloat(s.amount || 0);
    });

    // Group Expenses by Month/Year
    const expMap = {};
    financeRecords.forEach(f => {
        let key = f.month + ' ' + f.year;
        expMap[key] = (expMap[key] || 0) + parseFloat(f.amount || 0);
    });

    // Combine Keys
    const labels = [...new Set([...Object.keys(revMap), ...Object.keys(expMap)])].sort();
    
    const revData = labels.map(l => revMap[l] || 0);
    const expData = labels.map(l => expMap[l] || 0);
    const netData = labels.map(l => (revMap[l] || 0) - (expMap[l] || 0));

    if(financeChartInstance) financeChartInstance.destroy();
    financeChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [
                { label: 'Revenue ', data: revData, backgroundColor: 'rgba(34, 197, 94, 0.5)', borderColor: '#22C55E', borderWidth: 1 },
                { label: 'Expenses ', data: expData, backgroundColor: 'rgba(239, 68, 68, 0.5)', borderColor: '#EF4444', borderWidth: 1 },
                { label: 'Net Profit ', data: netData, type: 'line', borderColor: '#8B5CF6', backgroundColor: '#8B5CF6', tension: 0.3 }
            ]
        },
        options: { responsive: true, maintainAspectRatio: false }
    });
}

document.getElementById("saveExpenseBtn")?.addEventListener("click", async function() {
    const month = document.getElementById("expMonth").value.trim();
    const year = parseInt(document.getElementById("expYear").value);
    const category = document.getElementById("expCategory").value;
    const amount = parseFloat(document.getElementById("expAmount").value);
    const desc = document.getElementById("expNote").value.trim();

    if(!month || isNaN(year) || isNaN(amount) || amount <= 0 || !desc) return alert("Fill all expense fields correctly!");

    this.textContent = "Recording..."; this.disabled = true;
    
    let payload = { month, year, category, amount, description: desc };
    
    // Fallback if table doesn't exist, use local array
    try {
        const { data, error } = await db.from('finance_records').insert([payload]).select();
        if(error && error.code !== "PGRST204") {
            // Table might not exist, save locally to avoid failure in UI mock
            console.warn("Supabase Finance table missing? Saving locally. Error: ", error.message);
            payload.id = Date.now();
            financeRecords.push(payload);
        } else if(data) {
            financeRecords.unshift(data[0]); // Push generated ID from Supabase
        }
    } catch(e) {
        payload.id = Date.now();
        financeRecords.push(payload);
    }
    
    alert("Expense Recorded.");
    this.textContent = "Record Ledger"; this.disabled = false;
    document.getElementById("expAmount").value = "";
    document.getElementById("expNote").value = "";
    renderFinance();
});

window.deleteFinance = async function(id) {
    if(!confirm("Hapus rekod ini? Ini akan mengubah P&L bulanan.")) return;
    try {
        await db.from('finance_records').delete().eq('id', id);
    } catch(e) {}
    financeRecords = financeRecords.filter(f => f.id !== id);
    renderFinance();
};

// ===================================
// MANAGEMENT EXECUTIVE MODULES
// ===================================
function renderMgmtPlaceholders() {
    // 1. Logic for determining identity
    let isZack = currentUser && currentUser.name === 'Zack';
    let isMoyy = currentUser && currentUser.name === 'Farhan Moyy';
    let isSuperior = currentUser && currentUser.role === 'superior';
    let isAliff = currentUser && currentUser.name === 'Aliff';

    // Management pills are removed, flattened to sidebar.
    renderPettyCash();
    renderMgmtStaffSales();
    renderCustomerIssues();
    
    if (isAliff || isSuperior || (!isZack && !isMoyy)) {
        renderStaffSchedule();
        loadAdminAttendance();
    }
    
    // Warehouse functions
    if (isZack || isSuperior) {
        renderWarehouseLowStock();
    }
    
    // Sales functions
    if (isMoyy || isSuperior) {
        renderSalesMgmtTarget();
        if(typeof renderSalesGraph === 'function') renderSalesGraph();
    }
    
    // update memo switch
    document.getElementById("memoToggle").checked = globalMemo.active;
    document.getElementById("memoStatusLabel").textContent = globalMemo.active ? "AKTIF" : "TIDAK AKTIF";
    document.getElementById("memoStatusLabel").style.color = globalMemo.active ? "#10B981" : "red";
    document.getElementById("memoInputText").value = globalMemo.text;
    
    // Global Staff Directory Rendering
    renderGlobalStaffDirectory();
    
    // HR Audit Logs Rendering
    if(typeof renderAuditLogs === 'function') renderAuditLogs();
}

function renderGlobalStaffDirectory() {
    const tbody = document.getElementById("staffDirectoryTbody");
    if(!tbody) return;

    let html = "";
    authUsers.forEach(u => {
        let los = "-";
        if(u.join_date) {
            const joinDate = new Date(u.join_date);
            const now = new Date();
            let years = now.getFullYear() - joinDate.getFullYear();
            let months = now.getMonth() - joinDate.getMonth();
            let days = now.getDate() - joinDate.getDate();

            if (days < 0) {
                months -= 1;
                const prevMonth = new Date(now.getFullYear(), now.getMonth(), 0);
                days += prevMonth.getDate();
            }
            if (months < 0) {
                years -= 1;
                months += 12;
            }
            los = `${years} Years ${months} Months ${days} Days`;
        }
        
        let deptLabel = "";
        if(u.dept) deptLabel = `<br><span style="font-size:10px; color:#888;">${u.dept}</span>`;

        html += `<tr>
            <td style="font-weight:bold; color:var(--primary);">${u.staff_id || "-"}</td>
            <td>${u.name}</td>
            <td style="font-weight:bold;">${u.full_name || "-"}${deptLabel}</td>
            <td>${u.join_date || "-"}</td>
            <td>${los}</td>
        </tr>`;
    });
    
    tbody.innerHTML = html;
}

window.switchMgmtTab = function(tabId, pillId) {
    // Deprecated. Routed via switchHub now.
};

window.updateMoyySettings = function() {
    moyySettings.target = parseFloat(document.getElementById("moyyTargetInput").value) || 10000;
    moyySettings.commRate = parseFloat(document.getElementById("moyyCommInput").value) || 5;
    alert(`Sasaran Jualan dikemaskini: RM ${moyySettings.target} | Komisen: ${moyySettings.commRate}%`);
    renderSalesMgmtTarget();
};

function renderSalesMgmtTarget() {
    // 1. Tally Ariff and Irfan performance
    let ariffTotal = 0;
    let irfanTotal = 0;
    
    // Tally Omnichannel
    let channels = { 'In-Store': 0, 'Tiktok': 0, 'Shopee': 0, 'Website': 0, 'Lain-Lain': 0 };
    let totalSalesSystem = 0;
    let totalTransactions = salesHistory.length;

    salesHistory.forEach(sale => {
        let amt = parseFloat(sale.total_amount || sale.total || 0);
        
        if(sale.staff_name === 'Ariff') ariffTotal = round2(ariffTotal + amt);
        if(sale.staff_name === 'Irfan') irfanTotal = round2(irfanTotal + amt);
        
        // Taburan Omnichannel
        let ch = sale.channel || 'Lain-Lain';
        if(!channels[ch]) channels[ch] = 0;
        channels[ch] += amt;
        totalSalesSystem = round2(totalSalesSystem + amt);
    });
    
    // 2. Render Target & Commission
    const domAriff = document.getElementById("tgtAriffSales");
    const domIrfan = document.getElementById("tgtIrfanSales");
    const commAriff = document.getElementById("tgtAriffComm");
    const commIrfan = document.getElementById("tgtIrfanComm");
    const subtitle = document.getElementById("moyyTargetSubtitle");
    
    if(subtitle) subtitle.textContent = `Pantauan prestasi jualan Ariff & Irfan berbanding target bulanan (RM ${moyySettings.target.toLocaleString()}).`;
    
    let ariffPct = Math.min((ariffTotal / (moyySettings.target || 1)) * 100, 100);
    let irfanPct = Math.min((irfanTotal / (moyySettings.target || 1)) * 100, 100);
    
    if(domAriff) domAriff.innerHTML = `RM ${ariffTotal.toFixed(2)} / RM ${moyySettings.target} <br><div style="width:100%;background:#eee;height:5px;border-radius:5px;"><div style="width:${ariffPct}%;background:var(--primary);height:100%;border-radius:5px;"></div></div>`;
    if(domIrfan) domIrfan.innerHTML = `RM ${irfanTotal.toFixed(2)} / RM ${moyySettings.target} <br><div style="width:100%;background:#eee;height:5px;border-radius:5px;"><div style="width:${irfanPct}%;background:#10B981;height:100%;border-radius:5px;"></div></div>`;
    
    if(commAriff) commAriff.textContent = `RM ${(ariffTotal * (moyySettings.commRate / 100)).toFixed(2)}`;
    if(commIrfan) commIrfan.textContent = `RM ${(irfanTotal * (moyySettings.commRate / 100)).toFixed(2)}`;

    // 3. Render Omnichannel Dist
    const tbodyOmni = document.getElementById("salesChannelTbody");
    if(tbodyOmni) {
        let omniHtml = "";
        for (let ch in channels) {
            if(channels[ch] > 0 || ch === 'In-Store' || ch === 'Tiktok') {
                let pct = totalSalesSystem > 0 ? ((channels[ch] / totalSalesSystem) * 100).toFixed(1) : 0;
                let count = salesHistory.filter(s => (s.channel || 'Lain-Lain') === ch).length;
                omniHtml += `<tr>
                    <td><strong>${ch}</strong></td>
                    <td>${count} resit</td>
                    <td>RM ${channels[ch].toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2})}</td>
                    <td>${pct}%</td>
                </tr>`;
            }
        }
        tbodyOmni.innerHTML = omniHtml;
    }

    // 4. Render Pending / Unpaid Invoices (Follow up Tracker)
    const tbodyPending = document.getElementById("salesMgmtPendingTbody");
    if(tbodyPending) {
        let pendingRecords = salesHistory.filter(s => s.status === 'Unpaid' || s.status === 'To Fulfil');
        if(pendingRecords.length === 0) {
            tbodyPending.innerHTML = `<tr><td colspan="6" style="text-align:center; padding:10px; color:#10B981; font-weight:bold;"> Hebat! Tiada sebarang hutang atau invois tergantung.</td></tr>`;
        } else {
            let phtml = "";
            pendingRecords.forEach(p => {
                let amt = parseFloat(p.total_amount || p.total || 0).toFixed(2);
                let phone = p.customer_phone || "Tiada";
                let btn = `<button onclick="window.open('https://wa.me/6${phone.replace(/[^0-9]/g, '')}', '_blank')" style="background:#25D366; color:white; border:none; padding:4px 8px; border-radius:4px; font-size:10px; cursor:pointer;" ${phone === 'Tiada' ? 'disabled' : ''}>WhatsApp</button>`;
                phtml += `<tr>
                    <td>#${p.id} <br><span style="font-size:9px; background:#fecaca; color:#7f1d1d; padding:2px 4px; border-radius:3px;">${p.status}</span></td>
                    <td style="font-weight:bold;">${p.customer_name || 'Pelanggan'}</td>
                    <td>${phone}</td>
                    <td style="color:#b91c1c; font-weight:bold;">RM ${amt}</td>
                    <td>${p.staff_name || '-'}</td>
                    <td>${btn}</td>
                </tr>`;
            });
            tbodyPending.innerHTML = phtml;
        }
    }
}

// Staff Scheduling & HR Logic
window.toggleMcUpload = function(val) {
    const box = document.getElementById("mcAttachmentBox");
    if(box) box.style.display = (val === 'MC') ? 'block' : 'none';
};

window.saveHrSettings = function() {
    hrSettings.friBreak = document.getElementById("setRestFri").value;
    hrSettings.wedBreak = document.getElementById("setRestWed").value;
    hrSettings.normalBreak = document.getElementById("setRestNor").value;
    document.getElementById("hrSettingsModal").style.display='none';
    alert("Ketetapan masa rehat mingguan berjaya diselaraskan.");
    renderStaffSchedule();
};

function getBreakTimeString(dateStr) {
    const d = new Date(dateStr);
    const day = d.getDay(); // 0=Sun, 1=Mon, ..., 3=Wed, ..., 5=Fri, 6=Sat
    if(day === 5) return hrSettings.friBreak;
    if(day === 3) return hrSettings.wedBreak;
    return hrSettings.normalBreak;
}

document.getElementById("saveScheduleBtn")?.addEventListener('click', async () => {
    const name = document.getElementById("scheduleStaffName").value;
    const dateStrInput = document.getElementById("scheduleDate").value; // e.g. YYYY-MM-DD
    const shift = document.getElementById("scheduleShift").value;
    const fileInput = document.getElementById("scheduleMcFile");

    if(!name || !dateStrInput || !shift) {
        alert("Sila lengkapkan nama, tarikh, dan syif.");
        return;
    }

    const existingIndex = staffSchedules.findIndex(s => s.staff_name === name && s.date === dateStrInput);
    if(existingIndex !== -1) {
        // Pulangkan semula baki cuti jika rekod lama adalah AL
        let oldObj = staffSchedules[existingIndex];
        if(oldObj.shift === 'AL') {
             let profile = staffProfiles.find(p => p.name === name);
             if(profile) profile.leave_balance += 1;
        }
        // Buang rekod lama (Overwrite)
        await db.from('roster_schedules').delete().eq('id', oldObj.id);
        staffSchedules.splice(existingIndex, 1);
    }

    // Pemotongan Baki Cuti jika AL baru
    if(shift === 'AL') {
        let profile = staffProfiles.find(p => p.name === name);
        if(profile && profile.leave_balance <= 0) {
            if(!confirm(`Baki cuti (AL) ${name} telah habis! Teruskan potong baki negatif?`)) return;
        }
        if(profile) profile.leave_balance -= 1;
    }

    // MC logic
    let mcNameStr = "";
    if(shift === 'MC' && fileInput && fileInput.files.length > 0) {
        mcNameStr = fileInput.files[0].name;
    } else if (shift === 'MC') {
        mcNameStr = "Tiada Sijil";
    }

    let newSched = {
        id: Date.now(),
        staff_name: name,
        date: dateStrInput,
        shift: shift,
        mc_name: mcNameStr
    };
    staffSchedules.push(newSched);
    await db.from('roster_schedules').insert([newSched]);
    
    alert(`Jadual Harian (${shift}) berjaya ditetapkan untuk ${name}!`);
    renderStaffSchedule();
});

// Listener untuk butang Pemohonan Umum (Ordinary Staff Request)
document.getElementById("reqScheduleBtn")?.addEventListener('click', async () => {
    let name = currentUser ? currentUser.name : "Tarmizi"; // fallback if anon
    if (!currentUser) {
        alert("Sila Log Masuk (Login) terlebih dahulu untuk membuat permohonan.");
        return;
    }
    name = currentUser.name;

    const dateStrInput = document.getElementById("reqScheduleDate").value;
    const shift = document.getElementById("reqScheduleShift").value;
    const fileInput = document.getElementById("reqMcFile");

    if(!dateStrInput || !shift) {
        alert("Sila lengkapkan tarikh dan pilihan syif/cuti.");
        return;
    }

    let mcNameStr = "";
    if(shift === 'MC' && fileInput && fileInput.files.length > 0) {
        mcNameStr = fileInput.files[0].name;
    } else if (shift === 'MC') {
        mcNameStr = "Tiada Sijil";
    }

    let newReq = {
        id: Date.now(),
        staff_name: name,
        date: dateStrInput,
        shift: shift,
        mc_name: mcNameStr
    };
    pendingSchedules.push(newReq);
    await db.from('pending_requests').insert([newReq]);
    
    alert(`Permohonan ${shift} pada ${dateStrInput} dihantar! Sila tunggu kelulusan bos.`);
    document.getElementById("reqScheduleDate").value = '';
    renderPendingSchedules();
});

window.renderStaffSchedule = function() {
    const theadAdmin = document.getElementById("adminRosterThead");
    const tbodyAdmin = document.getElementById("scheduleTbody");
    const theadPublic = document.getElementById("publicRosterThead");
    const tbodyPublic = document.getElementById("publicRosterTbody");
    
    if(!tbodyAdmin && !tbodyPublic) return;

    // Fix: dynamically inject missing names from staffSchedules to prevent invisible rows
    let existingNames = staffProfiles.map(p => p.name);
    staffSchedules.forEach(s => {
        if(!existingNames.includes(s.staff_name)) {
            staffProfiles.push({ name: s.staff_name, leave_balance: 0 });
            existingNames.push(s.staff_name);
        }
    });
    // Fix: also from pendingSchedules so they appear in leave balances even if not approved yet
    pendingSchedules.forEach(s => {
        if(!existingNames.includes(s.staff_name)) {
            staffProfiles.push({ name: s.staff_name, leave_balance: 0 });
            existingNames.push(s.staff_name);
        }
    });

    // Refresh Leave Balance panel
    const leaveTbody = document.getElementById("leaveBalanceTbody");
    if(leaveTbody) {
        leaveTbody.innerHTML = staffProfiles.map(p => {
            let color = p.leave_balance > 3 ? "var(--text-main)" : "var(--danger)";
            return `<tr><td><b>${p.name}</b></td><td style="color:${color}; font-weight:bold;">${p.leave_balance} Hari</td></tr>`;
        }).join("");
    }

    // Tentukan bulan. (Guna Global Navigasi)
    const year = activeRosterYear;
    const month = activeRosterMonth;
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    let baseDate = new Date(year, month, 1);

    // Lukis butang bulan di navigator
    const monthNames = ["Jan", "Feb", "Mac", "Apr", "Mei", "Jun", "Jul", "Ogo", "Sep", "Okt", "Nov", "Dis"];
    let btnHtml = "";
    monthNames.forEach((mn, mIdx) => {
        let isAct = mIdx === month ? "background:var(--primary); color:#fff; font-weight:bold;" : "background:#efefef; color:#555;";
        btnHtml += `<button onclick="setRosterMonth(${mIdx})" style="${isAct} border:1px solid #ddd; padding:6px 12px; border-radius:4px; font-size:11px; cursor:pointer; flex:1; min-width:40px;">${mn}</button>`;
    });
    
    // Kemaskini Navigator (Public dan Admin jika wujud)
    const pubBtns = document.getElementById("publicMonthBtns");
    if(pubBtns) pubBtns.innerHTML = btnHtml;
    const pubYr = document.getElementById("publicRosterYear");
    if(pubYr) pubYr.value = year;

    const admBtns = document.getElementById("adminMonthBtns");
    if(admBtns) admBtns.innerHTML = btnHtml;
    const admYr = document.getElementById("adminRosterYear");
    if(admYr) admYr.value = year;

    // 1. Build Headers (1 to 31)
    let headerStr = `<tr><th style="min-width:120px; text-align:left; position:sticky; left:0; background:var(--secondary); z-index:3;">Staf / Tarikh<br><small style="font-weight:normal;">${baseDate.toLocaleString('default', { month: 'long' })} ${year}</small></th>`;
    
    for(let d=1; d<=daysInMonth; d++) {
        const loopDate = new Date(year, month, d);
        const hariArr = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
        const dayName = hariArr[loopDate.getDay()];
        let bgHead = loopDate.getDay() === 0 || loopDate.getDay() === 6 ? "#888" : "inherit"; // Gelapkan sikit hjg minggu
        headerStr += `<th style="min-width:30px; font-weight:bold; background:${bgHead}; border:1px solid rgba(255,255,255,0.2);">${d}<br><small style="font-size:9px; font-weight:normal;">${dayName}</small></th>`;
    }
    headerStr += `</tr>`;

    if(theadAdmin) theadAdmin.innerHTML = headerStr;
    if(theadPublic) theadPublic.innerHTML = headerStr;

    // 2. Build Grid Rows
    const generateTbody = (isAdmin) => {
        let rows = "";
        staffProfiles.forEach((staff, index) => {
            let rowBg = index % 2 === 0 ? "#FAFAFA" : "#FFF";
            rows += `<tr><td style="text-align:left; font-weight:600; font-size:11px; position:sticky; left:0; background:${rowBg}; border-right:1px solid #ccc;">${staff.name}</td>`;
            
            for(let d=1; d<=daysInMonth; d++) {
                let dayStr = d < 10 ? '0'+d : d;
                let monthStr = (month+1) < 10 ? '0'+(month+1) : (month+1);
                let targetDate = `${year}-${monthStr}-${dayStr}`;
                
                let shiftData = staffSchedules.find(s => s.staff_name === staff.name && s.date === targetDate);
                let code = '';
                if(shiftData) {
                    code = shiftData.shift;
                } else if(publicHolidays.includes(targetDate)) {
                    code = 'PH';
                } else {
                    const loopDate = new Date(year, month, d);
                    const dayOfWeek = loopDate.getDay();
                    
                    // Fixed Permanent Off Days
                    const offDaysConfig = {
                        "Aliff": 4,          // Khamis
                        "Fahmi": 5,          // Jumaat
                        "Tarmizi": 6,        // Sabtu (Short Name UI)
                        "Tarmizi Kael": 6,   // Sabtu (Auth Name UI)
                        "Irfan": 0,          // Ahad
                        "Ariff": 1,          // Isnin
                        "Farhan Moyy": 2,    // Selasa
                        "Zack": 3            // Rabu
                    };

                    if(offDaysConfig[staff.name] !== undefined && offDaysConfig[staff.name] === dayOfWeek) {
                        code = 'OFF';
                    } else if(staff.name === 'Zack' && dayOfWeek === 4) {
                        code = 'B';
                    } else {
                        code = dayOfWeek === 3 ? 'B' : 'C'; // 3 is Wednesday default
                    }
                }
                
                let bg = rowBg, col = "#333", fw = "normal";
                if(code === 'A') { bg = "#fde047"; fw = "bold"; }
                else if(code === 'B') { bg = "#86efac"; fw = "bold"; }
                else if(code === 'C') { bg = "#c4b5fd"; fw = "bold"; }
                else if(code === 'OFF') { col = "red"; fw = "bold"; }
                else if(code === 'AL') { bg = "#3b82f6"; col = "white"; fw = "bold"; }
                else if(code === 'MC') { bg = "#fbbf24"; fw = "bold"; }
                else if(code === 'EL') { bg = "#ef4444"; col = "white"; fw = "bold"; }
                else if(code === 'PH') { bg = "#f472b6"; col = "white"; fw = "bold"; }
                
                let attachStr = code === 'MC' && shiftData && shiftData.mc_name ? `<br><span style="font-size:9px;" title="${shiftData.mc_name}"></span>` : "";

                if(isAdmin && window.isRosterEditMode) {
                    let selStr = `<select onchange="saveQuickShiftInline(this, '${staff.name}', '${targetDate}', ${shiftData ? shiftData.id : null}, this.value)" style="width:100%; height:100%; border:none; background:transparent; outline:none; text-align:center; font-size:11px; font-weight:${fw}; color:${col}; cursor:pointer; appearance:none; -webkit-appearance:none; padding:8px 2px;">`;
                    selStr += `<option value="KOSONG" ${!code ? 'selected' : ''}>-</option>`;
                    selStr += `<option value="A" ${code==='A' ? 'selected' : ''}>A</option>`;
                    selStr += `<option value="B" ${code==='B' ? 'selected' : ''}>B</option>`;
                    selStr += `<option value="C" ${code==='C' ? 'selected' : ''}>C</option>`;
                    selStr += `<option value="OFF" ${code==='OFF' ? 'selected' : ''}>OFF</option>`;
                    selStr += `<option value="AL" ${code==='AL' ? 'selected' : ''}>AL</option>`;
                    selStr += `<option value="MC" ${code==='MC' ? 'selected' : ''}>MC</option>`;
                    selStr += `<option value="EL" ${code==='EL' ? 'selected' : ''}>EL</option>`;
                    selStr += `<option value="PH" ${code==='PH' ? 'selected' : ''}>PH</option>`;
                    selStr += `</select>`;
                    rows += `<td style="border:1px solid #aaa; background:${bg}; padding:0; min-width:35px;">${selStr}${attachStr}</td>`;
                } else {
                    if(!code) {
                        rows += `<td style="border:1px solid #ddd; background:${rowBg}; color:#ccc; text-align:center; font-size:10px;">-</td>`;
                    } else {
                        rows += `<td style="border:1px solid #ddd; background:${bg}; color:${col}; text-align:center; font-weight:${fw}; font-size:11px;">${code}${attachStr}</td>`;
                    }
                }
            }
            rows += `</tr>`;
        });
        return rows;
    };

    if(tbodyAdmin) tbodyAdmin.innerHTML = generateTbody(true);
    if(tbodyPublic) tbodyPublic.innerHTML = generateTbody(false);
}

window.isRosterEditMode = false;

window.toggleRosterEditMode = function() {
    window.isRosterEditMode = !window.isRosterEditMode;
    let btnEdit = document.getElementById("btnEditRoster");
    let btnSubmit = document.getElementById("btnSubmitRoster");
    
    if(window.isRosterEditMode) {
        if(btnEdit) { btnEdit.style.background = "#4f46e5"; btnEdit.style.borderColor = "#4f46e5"; btnEdit.innerHTML = " KELUAR EDIT"; }
        if(btnSubmit) btnSubmit.style.display = "flex";
    } else {
        if(btnEdit) { btnEdit.style.background = "#6b7280"; btnEdit.style.borderColor = "#6b7280"; btnEdit.innerHTML = "️ MULA EDIT"; }
        if(btnSubmit) btnSubmit.style.display = "none";
    }
    renderStaffSchedule();
};

window.saveQuickShiftInline = function(el, staff, date, id, shiftCode) {
    // Kemaskini Memori RAM sahaja (Silent Local Sync)
    staffSchedules = staffSchedules.filter(s => !(s.staff_name === staff && s.date === date));
    
    if(shiftCode !== 'KOSONG') {
        let newId = id || (Math.floor(Date.now() / 100) + Math.floor(Math.random() * 9999));
        staffSchedules.push({
            id: newId,
            staff_name: staff,
            date: date,
            shift: shiftCode,
            mc_name: ''
        });
    }

    // Kemaskini visual kotak serta merta tanpa render seluruh jadual
    let bg = "#FAFAFA", col = "#333", fw = "normal";
    if(shiftCode === 'A') { bg = "#fde047"; fw = "bold"; }
    else if(shiftCode === 'B') { bg = "#86efac"; fw = "bold"; }
    else if(shiftCode === 'C') { bg = "#c4b5fd"; fw = "bold"; }
    else if(shiftCode === 'OFF') { bg = "#FAFAFA"; col = "red"; fw = "bold"; }
    else if(shiftCode === 'AL') { bg = "#3b82f6"; col = "white"; fw = "bold"; }
    else if(shiftCode === 'MC') { bg = "#fbbf24"; fw = "bold"; }
    else if(shiftCode === 'EL') { bg = "#ef4444"; col = "white"; fw = "bold"; }
    else { bg = "#FFF"; col = "#ccc"; }

    let td = el.parentElement;
    if(td) td.style.background = bg;
    el.style.color = col;
    el.style.fontWeight = fw;
};

window.submitBulkRoster = async function() {
    if(!confirm("Sahkan simpankan keseluruhan tarikh ini ke pelayan Awan (Supabase)?\\n\\nTindakan ini akan menggantikan rekod sedia ada bagi bulan ini.")) return;
    
    let btnSubmit = document.getElementById("btnSubmitRoster");
    if(btnSubmit) { btnSubmit.disabled = true; btnSubmit.innerHTML = " MENYIMPAN..."; }

    try {
        const year = activeRosterYear;
        const month = activeRosterMonth;
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        let startD = `${year}-${(month+1).toString().padStart(2, '0')}-01`;
        let endD = `${year}-${(month+1).toString().padStart(2, '0')}-${daysInMonth}`;
        
        // 1. Flush API for current month
        await db.from('roster_schedules').delete().gte('date', startD).lte('date', endD);
        
        // 2. Filter local memory payload for current month
        let payload = staffSchedules.filter(s => s.date.startsWith(`${year}-${(month+1).toString().padStart(2, '0')}`));
        
        // 3. Chunk Bulk Insert
        const CHUNK_SIZE = 500;
        for (let i = 0; i < payload.length; i += CHUNK_SIZE) {
            let chunk = payload.slice(i, i + CHUNK_SIZE);
            await db.from('roster_schedules').insert(chunk);
        }

        alert("Berjaya! Jadual telah di-'Upload' secara rasmi.");
        
        window.toggleRosterEditMode(); // Exit edit mode
        
        // Force refresh API fallback
        let { data: newRoster } = await db.from('roster_schedules').select('*');
        if(newRoster) {
             staffSchedules = newRoster;
             renderStaffSchedule();
        }
        
    } catch(err) {
        alert("Ralat Menyimpan Pukal: " + err.message);
    }
    
    if(btnSubmit) { btnSubmit.disabled = false; btnSubmit.innerHTML = " SIMPAN PERUBAHAN"; }
};


window.renderPendingSchedules = function() {
    const tbody = document.getElementById("pendingRequestsTbody");
    if(!tbody) return;

    if(pendingSchedules.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:10px;">Tiada permohonan terkini.</td></tr>';
        return;
    }

    let html = "";
    pendingSchedules.forEach(req => {
        let badgeBg = "#eee"; let col = "#333";
        if(req.shift === 'OFF') { col = "red"; }
        else if(req.shift === 'AL') { badgeBg = "#3b82f6"; col="white"; }
        else if(req.shift === 'MC') { badgeBg = "#fbbf24"; }
        else if(req.shift === 'EL') { badgeBg = "#ef4444"; col="white"; }

        let attachStr = req.shift === 'MC' ? ` ${req.mc_name}` : "-";

        html += `
            <tr style="border-bottom:1px solid #fee2e2;">
                <td style="font-weight:bold;">${req.staff_name}</td>
                <td>${req.date}</td>
                <td><span style="background:${badgeBg}; color:${col}; padding:3px 8px; border-radius:4px; font-weight:bold;">${req.shift}</span></td>
                <td><small>${attachStr}</small></td>
                <td>
                    <button onclick="approveRequest(${req.id})" style="background:#10b981; color:white; border:none; padding:4px 8px; border-radius:4px; font-size:10px; cursor:pointer; margin-right:5px;">Terima</button>
                    <button onclick="rejectRequest(${req.id})" style="background:#ef4444; color:white; border:none; padding:4px 8px; border-radius:4px; font-size:10px; cursor:pointer;">Tolak</button>
                </td>
            </tr>
        `;
    });
    tbody.innerHTML = html;
};

window.approveRequest = async function(id) {
    let reqIndex = pendingSchedules.findIndex(r => r.id === id);
    if(reqIndex === -1) return;
    let req = pendingSchedules[reqIndex];

    // Proses semakan Overwrite & Potong AL seperti admin biasa
    const existingIndex = staffSchedules.findIndex(s => s.staff_name === req.staff_name && s.date === req.date);
    if(existingIndex !== -1) {
        let oldSched = staffSchedules[existingIndex];
        if(oldSched.shift === 'AL') {
             let profile = staffProfiles.find(p => p.name === req.staff_name);
             if(profile) profile.leave_balance += 1;
        }
        await db.from('roster_schedules').delete().eq('id', oldSched.id);
        staffSchedules.splice(existingIndex, 1);
    }

    if(req.shift === 'AL') {
        let profile = staffProfiles.find(p => p.name === req.staff_name);
        if(profile && profile.leave_balance <= 0) {
            if(!confirm(`Baki AL pemohon habis! Teruskan meluluskan AL (baki jadi negatif)?`)) return;
        }
        if(profile) profile.leave_balance -= 1;
    }

    let newSched = {
        id: Date.now(),
        staff_name: req.staff_name,
        date: req.date,
        shift: req.shift,
        mc_name: req.mc_name
    };
    staffSchedules.push(newSched);
    await db.from('roster_schedules').insert([newSched]);

    pendingSchedules.splice(reqIndex, 1); // Remove from pending
    await db.from('pending_requests').delete().eq('id', id);
    
    //  Inject Audit Log (Kelulusan)
    try {
        let adminName = currentUser ? currentUser.name : 'Sistem Automasi';
        await db.from('audit_logs').insert([{
            action_type: 'LULUS',
            actor_name: adminName,
            target_staff: req.staff_name,
            details: `Meluluskan ${req.shift} pada ${req.date}`
        }]);
    } catch(e) {}
    
    renderPendingSchedules();
    renderStaffSchedule();
    if(typeof renderAuditLogs === 'function') renderAuditLogs();
    alert(`Permohonan ${req.staff_name} DILULUSKAN!`);
};

window.rejectRequest = async function(id) {
    if(!confirm("Tolak permohonan staf ini?")) return;
    
    let reqIndex = pendingSchedules.findIndex(r => r.id === id);
    if(reqIndex !== -1) {
        let req = pendingSchedules[reqIndex];
        
        //  Inject Audit Log (Penolakan)
        try {
            let adminName = currentUser ? currentUser.name : 'Sistem Automasi';
            await db.from('audit_logs').insert([{
                action_type: 'TOLAK',
                actor_name: adminName,
                target_staff: req.staff_name,
                details: `Menolak permohonan ${req.shift} pada ${req.date}`
            }]);
        } catch(e) {}
    }

    pendingSchedules = pendingSchedules.filter(r => r.id !== id);
    await db.from('pending_requests').delete().eq('id', id);
    renderPendingSchedules();
    if(typeof renderAuditLogs === 'function') renderAuditLogs();
};

window.renderAuditLogs = async function() {
    const tbody = document.getElementById("auditLogsTbody");
    if(!tbody) return;
    
    try {
        let { data: logs, error } = await db.from('audit_logs').select('*').order('created_at', { ascending: false }).limit(20);
        if(error || !logs || logs.length === 0) {
            tbody.innerHTML = `<tr><td colspan="4" style="text-align:center; padding:10px;">Tiada rekod (atau jadual audit_logs belum wujud di Supabase).</td></tr>`;
            return;
        }

        let html = "";
        logs.forEach(log => {
            let actDate = new Date(log.created_at).toLocaleString('ms-MY', { day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' });
            let badge = log.action_type === 'LULUS' 
                        ? `<span style="background:#10B981; color:white; padding:2px 6px; border-radius:4px; font-weight:bold; font-size:10px;">LULUS</span>` 
                        : `<span style="background:#ef4444; color:white; padding:2px 6px; border-radius:4px; font-weight:bold; font-size:10px;">TOLAK</span>`;
            
            html += `<tr>
                <td style="font-size:11px; color:#555;">${actDate}</td>
                <td style="font-weight:bold; color:#4c1d95;">${log.actor_name}</td>
                <td>${badge} <span style="font-weight:bold;">${log.target_staff}</span></td>
                <td style="font-size:11px;">${log.details}</td>
            </tr>`;
        });
        tbody.innerHTML = html;
        
    } catch(err) {
        tbody.innerHTML = `<tr><td colspan="4" style="text-align:center; padding:10px; color:red;">Ralat mengambil data: ${err.message}</td></tr>`;
    }
};

// Call renderPending in main switchHub
const oldRenderStaffSchedule = renderStaffSchedule;
renderStaffSchedule = function() {
    oldRenderStaffSchedule();
    renderPendingSchedules();
};

function renderWarehouseLowStock() {
    const tbody = document.getElementById("whLowStockTbody");
    if(!tbody) return;

    // Sprint 2.5: per-SKU reorder_point (fallback to 10 if NULL)
    let lowStocks = [];
    masterProducts.forEach(p => {
        const total = inventoryBatches.filter(b => b.sku === p.sku)
            .reduce((acc, b) => acc + parseInt(b.qty_remaining || 0), 0);
        const threshold = (p.reorder_point != null) ? parseInt(p.reorder_point) : 10;
        if(total < threshold) {
            lowStocks.push({
                sku: p.sku, name: p.name,
                remaining: total,
                threshold,
                reorderQty: p.reorder_qty,
                leadDays: p.lead_time_days
            });
        }
    });

    // Sort: 0-stock first, then by ratio
    lowStocks.sort((a, b) => {
        if(a.remaining === 0 && b.remaining !== 0) return -1;
        if(b.remaining === 0 && a.remaining !== 0) return 1;
        return (a.remaining / a.threshold) - (b.remaining / b.threshold);
    });

    if(lowStocks.length === 0) {
        tbody.innerHTML = '<tr><td colspan="3" style="text-align:center; color:#10B981;">✓ Semua stok di atas reorder point.</td></tr>';
        return;
    }

    tbody.innerHTML = lowStocks.slice(0, 50).map(s => {
        const color = s.remaining === 0 ? "#DC2626" : (s.remaining < s.threshold * 0.5 ? "#D97706" : "#CA8A04");
        const reorderHint = s.reorderQty
            ? `<br><span style="font-size:9px; color:#0EA5E9;">📦 Order ${s.reorderQty}${s.leadDays ? ' (lead ' + s.leadDays + 'd)' : ''}</span>`
            : '';
        return `
        <tr>
            <td><strong>${s.sku}</strong></td>
            <td>${(s.name || '').slice(0, 50)}${reorderHint}</td>
            <td style="color:${color}; font-weight:bold;">${s.remaining} <span style="color:#9CA3AF; font-weight:normal;">/ ${s.threshold}</span></td>
        </tr>`;
    }).join('');
}

// 1. Petty Cash Ledger
document.getElementById("savePettyBtn")?.addEventListener('click', () => {
    const type = document.getElementById("pcType").value;
    const amount = parseFloat(document.getElementById("pcAmount").value);
    const notes = document.getElementById("pcNotes").value.trim();
    
    if(!amount || !notes) return alert("Sila isi Amaun dan Nota!");
    
    pettyCashLedger.push({
        id: Date.now(),
        date: new Date().toISOString(),
        type: type,
        amount: amount,
        notes: notes
    });
    
    alert("Buku tunai dikemaskini.");
    document.getElementById("pcAmount").value = "";
    document.getElementById("pcNotes").value = "";
    renderPettyCash();
});

function renderPettyCash() {
    const tbody = document.getElementById("pettyTbody");
    if(!tbody) return;
    
    if(pettyCashLedger.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;">Tiada rekod.</td></tr>';
        return;
    }
    
    let runningBalance = 0;
    let html = "";
    
    // Sort chronological to build balance
    const sorted = [...pettyCashLedger].sort((a,b) => new Date(a.date) - new Date(b.date));
    
    sorted.forEach(p => {
        if(p.type === 'IN') runningBalance = round2(runningBalance + p.amount);
        else runningBalance = round2(runningBalance - p.amount);
        
        let color = p.type === 'IN' ? 'green' : 'red';
        let op = p.type === 'IN' ? '+' : '-';
        
        html += `<tr>
            <td>${new Date(p.date).toLocaleString('en-GB')}</td>
            <td><strong style="color:${color}">${p.type}</strong></td>
            <td>${p.notes}</td>
            <td style="color:${color}">${op} RM${p.amount.toFixed(2)}</td>
            <td style="font-weight:bold;">RM${runningBalance.toFixed(2)}</td>
        </tr>`;
    });
    
    // Render descending for view but balance remains correct
    tbody.innerHTML = html;
}

window.downloadPettyCSV = function() {
    if(pettyCashLedger.length === 0) return alert("Tiada data.");
    let csvStr = "Date,Type,Notes,Amount\n";
    pettyCashLedger.forEach(p => {
        csvStr += `"${p.date}","${p.type}","${p.notes}","${p.amount}"\n`;
    });
    
    const blob = new Blob([csvStr], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Petty_Cash_${new Date().getTime()}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
}

// 2. Memo Module
document.getElementById("saveMemoBtn")?.addEventListener('click', () => {
    const isActive = document.getElementById("memoToggle").checked;
    const text = document.getElementById("memoInputText").value.trim();
    
    if(isActive && !text) return alert("Sila isikan teks memo jika anda ingin AKTIFKAN.");
    
    globalMemo.active = isActive;
    globalMemo.text = text;
    
    alert("Status Memo dikemaskini.");
    renderMgmtPlaceholders();
});

// 2.A Render Sales Graph (Time-Series Modes)
window.currentGraphMode = '7days';

window.changeGraphMode = function(mode) {
    window.currentGraphMode = mode;
    
    // Toggle active state on buttons
    ['btnGraph7', 'btnGraphMonth', 'btnGraphYear', 'btnGraphCustom'].forEach(id => {
        let btn = document.getElementById(id);
        if(!btn) return;
        btn.style.backgroundColor = 'var(--bg-light)';
        btn.style.color = 'var(--text-main)';
        btn.style.borderColor = 'var(--border-color)';
    });
    
    let activeBtnId = "";
    if(mode === '7days') activeBtnId = "btnGraph7";
    if(mode === 'thismonth') activeBtnId = "btnGraphMonth";
    if(mode === 'thisyear') activeBtnId = "btnGraphYear";
    if(mode === 'custom') activeBtnId = "btnGraphCustom";
    
    if(activeBtnId) {
        let activeBtn = document.getElementById(activeBtnId);
        if(activeBtn) {
            activeBtn.style.backgroundColor = '#3b82f6';
            activeBtn.style.color = '#fff';
            activeBtn.style.borderColor = '#3b82f6';
        }
    }

    const customBox = document.getElementById("graphCustomRangeBox");
    if(mode === 'custom') {
        if(customBox) customBox.style.display = 'flex';
    } else {
        if(customBox) customBox.style.display = 'none';
        renderSalesGraph(mode);
    }
};

window.applyCustomGraphRange = function() {
    renderSalesGraph('custom');
};

let adminSalesChartInstance = null;
window.renderSalesGraph = function(mode = window.currentGraphMode) {
    const canvas = document.getElementById("adminSalesChart");
    if(!canvas) return;

    let dailyTotals = {};
    let dailyTx = {};
    let now = new Date();
    
    let tStartKey = 0;
    let tEndKey = 0;

    if (mode === '7days') {
        for(let i=6; i>=0; i--) {
            let d = new Date();
            d.setDate(d.getDate() - i);
            let k = d.toLocaleDateString('ms-MY', { day:'2-digit', month:'short' });
            dailyTotals[k] = 0; dailyTx[k] = 0;
        }
    } else if (mode === 'thismonth') {
        let daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
        for(let i=1; i<=daysInMonth; i++) {
            let d = new Date(now.getFullYear(), now.getMonth(), i);
            let k = d.toLocaleDateString('ms-MY', { day:'2-digit', month:'short' });
            dailyTotals[k] = 0; dailyTx[k] = 0;
        }
    } else if (mode === 'thisyear') {
        const monthNames = ["Jan", "Feb", "Mac", "Apr", "Mei", "Jun", "Jul", "Ogo", "Sep", "Okt", "Nov", "Dis"];
        for(let m=0; m<12; m++) {
            dailyTotals[monthNames[m]] = 0; dailyTx[monthNames[m]] = 0;
        }
    } else if (mode === 'custom') {
        let s = document.getElementById("graphStartDate").value;
        let e = document.getElementById("graphEndDate").value;
        if(!s || !e) return alert("Sila masukkan kedua-dua tarikh Mula dan Akhir sebelum papar.");
        let sDate = new Date(s); sDate.setHours(0,0,0,0);
        let eDate = new Date(e); eDate.setHours(23,59,59,999);
        if(sDate > eDate) return alert("Tarikh Mula tidak boleh mendahului Tarikh Akhir.");
        
        let loop = new Date(sDate);
        // limit loop visual span to avoid killing memory (e.g. max 90 days visual)
        let daysDiff = (eDate - sDate) / (1000 * 3600 * 24);
        if(daysDiff > 100) return alert("Julat carian tidak boleh melebihi 100 hari untuk graf harian.");
        
        while(loop <= eDate) {
            let k = loop.toLocaleDateString('ms-MY', { day:'2-digit', month:'short' });
            dailyTotals[k] = 0; dailyTx[k] = 0;
            loop.setDate(loop.getDate() + 1);
        }
        tStartKey = sDate.getTime();
        tEndKey = eDate.getTime();
    }

    salesHistory.forEach(sale => {
        let ts = sale.created_at || sale.date; 
        if(!ts) return;
        let sDate = new Date(ts);
        
        // Logical Filters
        if (mode === 'thisyear' && sDate.getFullYear() !== now.getFullYear()) return;
        if (mode === 'thismonth' && (sDate.getMonth() !== now.getMonth() || sDate.getFullYear() !== now.getFullYear())) return;
        if (mode === 'custom') {
            if (sDate.getTime() < tStartKey || sDate.getTime() > tEndKey) return;
        }

        let key = "";
        if(mode === 'thisyear') {
            const monthNames = ["Jan", "Feb", "Mac", "Apr", "Mei", "Jun", "Jul", "Ogo", "Sep", "Okt", "Nov", "Dis"];
            key = monthNames[sDate.getMonth()];
        } else {
            key = sDate.toLocaleDateString('ms-MY', { day:'2-digit', month:'short' });
        }
        
        if(dailyTotals[key] !== undefined) {
            dailyTotals[key] = round2((dailyTotals[key] || 0) + parseFloat(sale.total_amount || sale.total || 0));
            dailyTx[key]++;
        } else if (mode === '7days') {
            // Out of 7 days scope, safely ignore
        }
    });

    let labels = Object.keys(dailyTotals);
    let dataPoints = Object.values(dailyTotals);
    
    if(adminSalesChartInstance) {
        adminSalesChartInstance.destroy();
    }
    
    const ctx = canvas.getContext('2d');
    adminSalesChartInstance = new window.Chart(ctx, {
        type: mode === 'thisyear' ? 'bar' : 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Gross Sales (RM)',
                data: dataPoints,
                borderColor: '#3b82f6',
                backgroundColor: mode === 'thisyear' ? 'rgba(59, 130, 246, 0.6)' : 'rgba(59, 130, 246, 0.2)',
                borderWidth: 2,
                pointBackgroundColor: '#fff',
                pointBorderColor: '#3b82f6',
                pointRadius: 4,
                fill: true,
                tension: 0.3
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: function(c) { return 'RM ' + c.raw.toFixed(2); },
                        afterLabel: function(c) { return 'Resit Cetak: ' + dailyTx[c.label]; }
                    }
                }
            },
            scales: {
                y: { beginAtZero: true, grid: { color: '#f3f4f6' } },
                x: { grid: { display: false } }
            }
        }
    });
};

// 3. Staff Leaderboard (Mgmt Only)
function renderMgmtStaffSales() {
    const tbody = document.getElementById("mgmtStaffSalesTbody");
    if(!tbody) return;
    
    const targetStaff = ["Aliff", "Irfan", "Ariff", "Tarmizi Kael", "Farhan Moyy"];
    let performance = {};
    
    targetStaff.forEach(s => performance[s] = { txCount: 0, gross: 0 });
    
    salesHistory.forEach(sale => {
        let name = sale.staff_name;
        if(name && performance[name]) {
            performance[name].txCount++;
            performance[name].gross = round2(performance[name].gross + parseFloat(sale.total || 0));
        }
    });
    
    const sortedPerformers = Object.entries(performance)
                            .map(([name, data]) => ({name, ...data}))
                            .sort((a,b) => b.gross - a.gross);
                            
    tbody.innerHTML = sortedPerformers.map((p, index) => `
        <tr>
            <td><h3>#${index+1}</h3></td>
            <td><strong>${p.name}</strong></td>
            <td>${p.txCount} Resit</td>
            <td style="color:green; font-weight:bold;">RM ${p.gross.toFixed(2)}</td>
        </tr>
    `).join('');
}

// 4. Customer Issues Tracker
document.getElementById("saveIssueBtn")?.addEventListener('click', () => {
    const cust = document.getElementById("issueCustName").value.trim();
    const desc = document.getElementById("issueDesc").value.trim();
    if(!cust || !desc) return alert("Maklumat pelanggan & aduan wajib diisi.");
    
    customerIssues.unshift({
        id: Date.now(),
        cust: cust,
        desc: desc,
        status: 'OPEN'
    });
    
    document.getElementById("issueCustName").value = "";
    document.getElementById("issueDesc").value = "";
    renderCustomerIssues();
});

function renderCustomerIssues() {
    const tbody = document.getElementById("issueTbody");
    if(!tbody) return;
    
    if(customerIssues.length === 0) {
        tbody.innerHTML = '<tr><td colspan="3" style="text-align:center;">Tiada isu dilaporkan.</td></tr>';
        return;
    }
    
    tbody.innerHTML = customerIssues.map(c => `
        <tr>
            <td><strong>${c.cust}</strong></td>
            <td>${c.desc}</td>
            <td>
                ${c.status === 'OPEN' 
                    ? `<button class="btn-success" style="padding:2px 8px; font-size:10px; background:var(--secondary);" onclick="resolveIssue(${c.id})">Mark Resolved</button>` 
                    : `<span style="color:#10B981; font-weight:bold;">TUTUP </span>`}
            </td>
        </tr>
    `).join('');
}

window.resolveIssue = function(id) {
    const issue = customerIssues.find(c => c.id === id);
    if(issue) issue.status = 'RESOLVED';
    renderCustomerIssues();
}

// ===================================
// STAFF ATTENDANCE MODULE (CLOCK)
// ===================================
let clockStream = null;
let currentAttendanceStatus = null; // null | IN | OUT

// 1. Math Formula for Distance
function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371e3; // metres
    const φ1 = lat1 * Math.PI/180;
    const φ2 = lat2 * Math.PI/180;
    const Δφ = (lat2-lat1) * Math.PI/180;
    const Δλ = (lon2-lon1) * Math.PI/180;
    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c; 
}

// 2. Fetch or Mock DB
async function checkMyAttendanceStatus() {
    if(!currentUser) return;
    document.getElementById("floatingClockBtn").style.display = "flex";
    
    const today = new Date().toISOString().split('T')[0];
    
    if(db) {
        let { data, error } = await db.from('staff_attendance').select('*').eq('staff_name', currentUser.name).eq('date', today);
        if(data && data.length > 0) {
            let record = data[0];
            if(record.clock_out_time) {
                currentAttendanceStatus = "OUT";
                document.getElementById("lblClockFace").textContent = "Anda Telah Clock-Out";
                document.getElementById("floatingClockBtn").style.background = "linear-gradient(135deg, #6B7280, #4B5563)";
                document.getElementById("floatingClockBtn").style.pointerEvents = "none";
                document.getElementById("floatingClockBtn").style.animation = "none";
            } else {
                currentAttendanceStatus = "IN";
                document.getElementById("lblClockFace").textContent = "Clock Out Sekarang";
                document.getElementById("floatingClockBtn").style.background = "linear-gradient(135deg, #EF4444, #DC2626)";
            }
        } else {
            currentAttendanceStatus = null;
            document.getElementById("lblClockFace").textContent = "Clock In Sekarang";
            document.getElementById("floatingClockBtn").style.background = "linear-gradient(135deg, #10B981, #059669)";
        }
    }
}

window.setPremiseLocation = function() {
    if(!navigator.geolocation) return alert("Browser tak support GPS.");
    navigator.geolocation.getCurrentPosition(pos => {
        let lat = pos.coords.latitude;
        let lng = pos.coords.longitude;
        localStorage.setItem("premise_lat", lat);
        localStorage.setItem("premise_lng", lng);
        alert(`Koordinat Kedai diset pada:\nLat: ${lat}\nLng: ${lng}`);
        document.getElementById("txtPremiseDist").textContent = "400";
    }, err => alert("Gagal dpt GPS: " + err.message));
}

window.openClockModal = function() {
    let pLat = localStorage.getItem("premise_lat") || 2.9250;
    let pLng = localStorage.getItem("premise_lng") || 101.6570;
    let radius = 400; // 400 meters

    document.getElementById("clockInOutModal").style.display = "flex";
    const statusTxt = document.getElementById("clockModalStatus");
    const btn = document.getElementById("btnSubmitAttendance");
    const video = document.getElementById("clockVideoFeed");
    const loadTxt = document.getElementById("cameraLoadingText");

    statusTxt.textContent = " Mengesan koordinat GPS anda...";
    statusTxt.style.color = "#0369a1";
    statusTxt.style.background = "#e0f2fe";
    btn.style.display = "none";
    video.style.display = "none";
    loadTxt.style.display = "block";

    navigator.geolocation.getCurrentPosition(pos => {
        let cLat = pos.coords.latitude;
        let cLng = pos.coords.longitude;
        let dist = calculateDistance(pLat, pLng, cLat, cLng);

        if(dist <= radius) {
            statusTxt.textContent = ` Disahkan: Anda berada ${Math.round(dist)}m dari Premis. Mengaktifkan Kamera...`;
            statusTxt.style.color = "#065f46";
            statusTxt.style.background = "#d1fae5";
            
            // Invoke Camera
            navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" }, audio: false })
            .then(stream => {
                clockStream = stream;
                video.srcObject = stream;
                video.style.display = "block";
                loadTxt.style.display = "none";
                btn.style.display = "block";
                btn.disabled = false;
            })
            .catch(err => {
                statusTxt.textContent = " Kamera Gagal Diakses. Sila allow permission.";
                statusTxt.style.color = "#991b1b";
                statusTxt.style.background = "#fee2e2";
                loadTxt.textContent = "Akses Ditolak";
            });

        } else {
            statusTxt.textContent = ` Terkeluar Jarak! Anda sejauh ${Math.round(dist)}m (Maksima ${radius}m).`;
            statusTxt.style.color = "#991b1b";
            statusTxt.style.background = "#fee2e2";
            loadTxt.textContent = "Kamera tidak diperlukan";
        }

    }, err => {
        statusTxt.textContent = " Gagal mengesan GPS anda. Pastikan Location dibenarkan.";
        statusTxt.style.color = "#991b1b";
        statusTxt.style.background = "#fee2e2";
    }, { enableHighAccuracy: true });
}

window.closeClockModal = function() {
    if(clockStream) {
        clockStream.getTracks().forEach(t => t.stop());
    }
    document.getElementById("clockInOutModal").style.display = "none";
}

window.submitAttendance = async function() {
    const video = document.getElementById("clockVideoFeed");
    const canvas = document.getElementById("clockSnapshotCanvas");
    const btn = document.getElementById("btnSubmitAttendance");
    
    btn.textContent = " Memproses Rekod...";
    btn.disabled = true;

    // Squeeze Image
    canvas.width = 300;
    canvas.height = 300;
    let ctx = canvas.getContext("2d");
    
    // Crop center
    let size = Math.min(video.videoWidth, video.videoHeight);
    let sx = (video.videoWidth - size) / 2;
    let sy = (video.videoHeight - size) / 2;
    ctx.drawImage(video, sx, sy, size, size, 0, 0, 300, 300);
    
    // Convert base64
    let b64 = canvas.toDataURL("image/jpeg", 0.5); 
    
    let timeStr = new Date().toTimeString().split(' ')[0];
    let today = new Date().toISOString().split('T')[0];

    if(!db) { alert("Tiada akses DB."); closeClockModal(); return; }

    if(currentAttendanceStatus === "IN") {
        // Must Clock Out
        let { error } = await db.from('staff_attendance')
        .update({ clock_out_time: timeStr, clock_out_photo: b64 })
        .eq('staff_name', currentUser.name).eq('date', today);
        
        if(!error) { alert("Berjaya Clock-Out!"); }
        else { alert("Gagal Clock-Out: " + (error.message || JSON.stringify(error))); }
    } else {
        // Must Clock In
        let { error } = await db.from('staff_attendance')
        .insert([{ staff_name: currentUser.name, date: today, clock_in_time: timeStr, clock_in_photo: b64 }]);
        
        if(!error) { alert("Berjaya Clock-In. Mulakan kerja anda!"); }
        else { alert("Gagal Clock-In: " + (error.message || JSON.stringify(error))); }
    }
    
    closeClockModal();
    checkMyAttendanceStatus();
    if(typeof loadAdminAttendance === 'function') loadAdminAttendance();
}

window.loadAdminAttendance = async function() {
    const tbody = document.getElementById("attendanceAdminTbody");
    const distT = document.getElementById("txtPremiseDist");
    if(distT) distT.textContent = (localStorage.getItem("premise_lat") ? "400" : "400");
    
    if(!tbody || !db) return;
    
    const today = new Date().toISOString().split('T')[0];
    let { data, error } = await db.from('staff_attendance').select('*').eq('date', today);
    
    if(error) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding:10px; color:red;">RALAT PANGKALAN DATA: ${error.message}. Adakah jadual ini belum dicipta?</td></tr>`;
        return;
    }
    
    if(!data || data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding:10px;">Belum ada staf clock in hari ini.</td></tr>';
        return;
    }
    
    let html = "";
    data.forEach(r => {
        let p1 = r.clock_in_photo ? `<img src="${r.clock_in_photo}" style="width:40px; height:40px; border-radius:50%; object-fit:cover;">` : "-";
        let p2 = r.clock_out_photo ? `<img src="${r.clock_out_photo}" style="width:40px; height:40px; border-radius:50%; object-fit:cover;">` : "-";
        
        let warnAuto = r.is_auto_clockout ? `<br><small style="color:red;">(Auto 8PM)</small>` : "";
        let cout = r.clock_out_time ? (r.clock_out_time + warnAuto) : "-";

        html += `
            <tr>
                <td style="font-weight:bold;">${r.staff_name}</td>
                <td>${r.date}</td>
                <td style="color:#10B981;">${r.clock_in_time}</td>
                <td>${p1}</td>
                <td style="color:#EF4444;">${cout}</td>
                <td>${p2}</td>
            </tr>
        `;
    });
    tbody.innerHTML = html;
}

// p4_1: per-staff commission rate lookup with fallback chain
function __getCommissionRate(staffName) {
    let rates = {}; try { rates = JSON.parse(localStorage.getItem('staffCommissionRates_v1')||'{}'); } catch(e){}
    const u = (typeof authUsers !== 'undefined' && Array.isArray(authUsers))
        ? authUsers.find(a => a.name === staffName) : null;
    if (u && rates[u.staff_id] !== undefined) return parseFloat(rates[u.staff_id])||0;
    if (u && u.commission_rate !== undefined) return parseFloat(u.commission_rate)||0;
    // Legacy fallback to moyySettings if defined
    if (typeof moyySettings !== 'undefined' && moyySettings.commRate !== undefined) return parseFloat(moyySettings.commRate)||0;
    return 5; // sensible default
}

// Commission period state
window.__cmRange = window.__cmRange || 'month';
window.__cmSetRange = function(range, btn) {
    window.__cmRange = range;
    document.querySelectorAll('.cm-pill').forEach(p => p.classList.toggle('active', p === btn));
    renderPersonalCommission();
};

function __cmGetDateRange() {
    const now = new Date();
    const startOf = (d) => { const x = new Date(d); x.setHours(0,0,0,0); return x; };
    const endOf   = (d) => { const x = new Date(d); x.setHours(23,59,59,999); return x; };
    const r = window.__cmRange || 'month';
    if (r === 'month') { const s = new Date(now.getFullYear(), now.getMonth(), 1); return { start:startOf(s), end:endOf(now), label: now.toLocaleDateString('en-MY', {month:'long', year:'numeric'}) }; }
    if (r === 'lastmonth') { const s = new Date(now.getFullYear(), now.getMonth()-1, 1); const e = new Date(now.getFullYear(), now.getMonth(), 0); return { start:startOf(s), end:endOf(e), label: s.toLocaleDateString('en-MY', {month:'long', year:'numeric'}) }; }
    if (r === 'week') { const s = new Date(now); s.setDate(s.getDate() - s.getDay()); return { start:startOf(s), end:endOf(now), label: 'This week' }; }
    if (r === 'ytd') { const s = new Date(now.getFullYear(), 0, 1); return { start:startOf(s), end:endOf(now), label: now.getFullYear() + ' YTD' }; }
    return { start: null, end: null, label: 'All time' };
}

window.renderPersonalCommission = function() {
    if (!currentUser) return;
    const isManager = currentUser.role === 'mgmt' || currentUser.role === 'superior';
    const range = __cmGetDateRange();

    // Filter sales by date range
    const sales = (Array.isArray(salesHistory) ? salesHistory : []).filter(s => {
        if (!range.start || !range.end) return true;
        const t = s.created_at ? new Date(s.created_at).getTime() : 0;
        return t >= range.start.getTime() && t <= range.end.getTime();
    });

    // Header label + badge
    const lbl = document.getElementById('cmRangeLabel'); if (lbl) lbl.textContent = '· ' + range.label;
    const badge = document.getElementById('cmHeaderBadge');
    if (badge) badge.textContent = isManager ? 'Manager view · all staff' : ('Personal view · ' + currentUser.name);

    // Per-staff aggregator
    function aggregateForStaff(staffName) {
        const own = sales.filter(s => s.staff_name === staffName);
        let gross = 0, refunds = 0, txCount = 0, refundCount = 0;
        own.forEach(s => {
            const amt = parseFloat(s.total_amount || s.total || 0);
            if (amt < 0) { refunds = round2(refunds + Math.abs(amt)); refundCount++; }
            else { gross = round2(gross + amt); txCount++; }
        });
        const net = round2(gross - refunds);
        const rate = __getCommissionRate(staffName);
        const earned = round2(net * rate / 100);
        return { staffName, gross, refunds, net, rate, earned, txCount, refundCount, sales: own };
    }

    // === Personal stats (always show for current user) ===
    const personal = aggregateForStaff(currentUser.name);
    const fmt = (n) => 'RM ' + Number(n).toLocaleString('en-MY', {minimumFractionDigits:2, maximumFractionDigits:2});
    document.getElementById('cmGross').textContent = fmt(personal.gross);
    document.getElementById('cmRefunds').textContent = '−' + fmt(personal.refunds);
    document.getElementById('cmNet').textContent = fmt(personal.net);
    document.getElementById('cmCommission').textContent = fmt(personal.earned);
    document.getElementById('cmTxCount').textContent = personal.txCount;
    document.getElementById('cmRefundCount').textContent = personal.refundCount;
    document.getElementById('cmRateInfo').textContent = 'at ' + personal.rate + '%';

    // === Manager view: all staff ===
    const mgrWrap = document.getElementById('cmManagerWrap');
    if (mgrWrap) mgrWrap.style.display = isManager ? 'block' : 'none';
    if (isManager) {
        const mgrTbody = document.getElementById('cmManagerTbody');
        if (mgrTbody) {
            const allStaff = (typeof authUsers !== 'undefined') ? authUsers : [];
            let inactive = []; try { inactive = JSON.parse(localStorage.getItem('staffInactive_v1')||'[]'); } catch(e){}
            const rows = allStaff
                .filter(u => !inactive.includes(u.staff_id))
                .map(u => aggregateForStaff(u.name))
                .sort((a,b) => b.earned - a.earned);
            mgrTbody.innerHTML = rows.length ? rows.map(r => {
                const u = allStaff.find(a => a.name === r.staffName) || {};
                const isMe = r.staffName === currentUser.name;
                const rowStyle = isMe ? ' style="background:#fffbeb;"' : '';
                return '<tr'+rowStyle+'>'
                    + '<td style="padding:8px 10px;"><strong>'+r.staffName+'</strong>'+(isMe?' <span style="font-size:10px; color:var(--primary);">(you)</span>':'')+'</td>'
                    + '<td style="padding:8px 10px;"><span style="font-size:10.5px; padding:2px 7px; background:#e5e7eb; border-radius:10px; font-weight:700;">'+(u.role||'—')+'</span></td>'
                    + '<td style="padding:8px 10px;">'+r.txCount+(r.refundCount?' <span style="color:#dc2626; font-size:11px;">/'+r.refundCount+'rf</span>':'')+'</td>'
                    + '<td style="padding:8px 10px; text-align:right;">'+fmt(r.gross)+'</td>'
                    + '<td style="padding:8px 10px; text-align:right; color:#dc2626;">'+(r.refunds>0?'−'+fmt(r.refunds):'—')+'</td>'
                    + '<td style="padding:8px 10px; text-align:right; font-weight:700;">'+fmt(r.net)+'</td>'
                    + '<td style="padding:8px 10px; text-align:right;">'+r.rate+'%</td>'
                    + '<td style="padding:8px 10px; text-align:right; color:var(--primary); font-weight:800;">'+fmt(r.earned)+'</td>'
                    + '</tr>';
            }).join('') : '<tr><td colspan="8" style="text-align:center; padding:18px; color:var(--text-muted);">No staff data in range.</td></tr>';
        }
    }

    // === Detail table for current user ===
    const tbody = document.getElementById("myCommissionTbody");
    if (tbody) {
        if (personal.sales.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:18px; color:var(--text-muted);">Tiada rekod dalam '+range.label+'.</td></tr>';
        } else {
            const rate = personal.rate;
            tbody.innerHTML = personal.sales
                .slice().sort((a,b) => new Date(b.created_at) - new Date(a.created_at))
                .map(s => {
                    const amt = parseFloat(s.total_amount || s.total || 0);
                    const dateStr = new Date(s.created_at).toLocaleDateString('en-MY', {day:'numeric', month:'short', year:'numeric'});
                    const ref = s.id ? '#'+s.id : '—';
                    const isRefund = amt < 0;
                    const comm = round2(amt * rate / 100);
                    const amtCol = isRefund ? '#dc2626' : '#059669';
                    return '<tr>'
                        + '<td>'+dateStr+'</td>'
                        + '<td>'+ref+(isRefund?' <span style="font-size:10px; color:#dc2626; font-weight:700;">REFUND</span>':'')+'</td>'
                        + '<td>'+(s.customer_name||'Walk-in')+'</td>'
                        + '<td style="text-align:right; color:'+amtCol+'; font-weight:bold;">'+(isRefund?'−':'')+'RM '+Math.abs(amt).toFixed(2)+'</td>'
                        + '<td style="text-align:right; color:'+amtCol+'; font-weight:bold;">'+(isRefund?'−':'')+'RM '+Math.abs(comm).toFixed(2)+'</td>'
                        + '</tr>';
                }).join('');
        }
    }

    // Backwards-compat hidden spans
    const domSales = document.getElementById("myCommissionSalesTotal"); if (domSales) domSales.textContent = fmt(personal.gross);
    const domEst = document.getElementById("myCommissionEstTotal"); if (domEst) domEst.textContent = fmt(personal.earned);
};

// Auto Clock Out Check Function
async function autoClockOutUnclosed() {
    if(!db) return;
    const now = new Date();
    const isPast8PM = now.getHours() >= 20;
    
    if(isPast8PM) {
        const today = new Date().toISOString().split('T')[0];
        // Fetch anybody who clocked in today but no out yet
        let { data } = await db.from('staff_attendance').select('*').eq('date', today).is('clock_out_time', null);
        if(data && data.length > 0) {
            for(let p of data) {
                 await db.from('staff_attendance').update({
                     clock_out_time: "20:00:00",
                     is_auto_clockout: true
                 }).eq('id', p.id);
            }
        }
    }
}


// ============================================
// QUOTATIONS & RENTALS MODULE
// ============================================
let quoteCart = [];
let quoteHistoryLogs = []; // Array of saved quotes
let currentQuoteRef = null; // e.g. "QT-1001"
let currentQuoteVersion = 1; // e.g. 1
let nextQuoteIdNum = 1001;

window.renderQuotePOS = function(searchTerm = "") {
    const list = document.getElementById('quoteProductsList');
    if (!list) return;
    list.innerHTML = "";
    
    // Filter published products
    let activeProducts = masterProducts.filter(p => isPublished(p));
    
    if(searchTerm) {
        let q = searchTerm.toLowerCase();
        activeProducts = activeProducts.filter(p => 
            p.name.toLowerCase().includes(q) || 
            p.sku.toLowerCase().includes(q) || 
            (p.brand && p.brand.toLowerCase().includes(q))
        );
    }
    
    activeProducts.slice(0, 50).forEach(product => {
        const hasStock = true; // Use master inventory logic if needed in future
        const stockStatusHtml = `<p class="product-stock" style="color:#10B981">Available</p>`;
        
        const card = document.createElement('div');
        card.className = "product-card";
        card.onclick = () => window.addToQuoteCart(product.sku);
        
        // Find main image
        let imgUrl = (product.images && product.images.length > 0) ? product.images[0] : "https://placehold.co/150x150?text=No+Photo";
        
        card.innerHTML = `
            <img src="${imgUrl}" alt="${product.name}" class="product-img">
            <h3 class="product-title">${product.name}</h3>
            <p class="product-sku">${product.sku}</p>
            ${stockStatusHtml}
            <p class="product-price">RM ${parseFloat(product.price).toFixed(2)}</p>
        `;
        list.appendChild(card);
    });
};

window.addToQuoteCart = function(sku) {
    const product = masterProducts.find(p => p.sku === sku);
    if (!product) return;

    const existing = quoteCart.find(item => item.sku === sku);
    if (existing) {
        existing.qty += 1;
    } else {
        quoteCart.push({
            sku: product.sku,
            name: product.name,
            price: parseFloat(product.price),
            qty: 1
        });
    }
    window.renderQuoteCart();
};

window.updateQuoteCartQty = function(sku, change) {
    const item = quoteCart.find(i => i.sku === sku);
    if (!item) return;
    
    item.qty += change;
    if (item.qty <= 0) {
        quoteCart = quoteCart.filter(i => i.sku !== sku);
    }
    window.renderQuoteCart();
};

window.updateQuoteCartPrice = function(sku, val) {
    const item = quoteCart.find(i => i.sku === sku);
    if (!item) return;
    let np = parseFloat(val);
    item.price = isNaN(np) ? 0 : np;
    window.renderQuoteCart();
};

window.renderQuoteCart = function() {
    const container = document.getElementById('quoteCartItems');
    let total = 0;
    container.innerHTML = "";

    const emptyState = document.getElementById('quoteEmptyState');
    if (emptyState) emptyState.style.display = quoteCart.length === 0 ? "block" : "none";

    if (quoteCart.length === 0) {
        container.innerHTML = ``;
        document.getElementById('quoteTotalPrice').innerText = "0.00";
        return;
    }

    quoteCart.forEach(item => {
        let lineTotal = round2(item.price * item.qty);
        total = round2(total + lineTotal);
        const div = document.createElement('div');
        div.className = "cart-item";
        div.style.display = "flex";
        div.style.flexDirection = "column";
        div.innerHTML = `
            <div style="display:flex; justify-content:space-between; width:100%; margin-bottom:5px;">
                <span style="font-weight:600; font-size:13px;">${item.name} <br><small style="color:#888;">${item.sku}</small></span>
                <span style="font-weight:bold; color:var(--primary);">RM ${lineTotal.toFixed(2)}</span>
            </div>
            <div style="display:flex; justify-content:space-between; width:100%; align-items:center;">
                <div style="display:flex; align-items:center; gap:5px;">
                    RM <input type="number" step="0.01" value="${item.price.toFixed(2)}" onchange="updateQuoteCartPrice('${item.sku}', this.value)" style="width:70px; padding:2px; text-align:center; border:1px solid #ccc;">
                </div>
                <div class="cart-qty-controls">
                    <button class="qty-btn" onclick="updateQuoteCartQty('${item.sku}', -1)">-</button>
                    <span>${item.qty}</span>
                    <button class="qty-btn" onclick="updateQuoteCartQty('${item.sku}', 1)">+</button>
                </div>
            </div>
        `;
        container.appendChild(div);
    });

    document.getElementById('quoteTotalPrice').innerText = total.toFixed(2);
};

window.toggleQuoteFields = function() {
    const type = document.getElementById("quoteType").value;
    const rentalDiv = document.getElementById("quoteRentalFields");
    const termsEl = document.getElementById("quoteTerms");
    
    if (type === "Rental") {
        rentalDiv.style.display = "block";
        termsEl.value = "1. Penyewa bertanggungjawab menjaga kelengkapan dengan baik.\n2. Denda akan dikenakan jika barang rosak atau hilang mengikut kos ganti.\n3. Barang perlu dipulangkan sebelum 12 tengahari pada tarikh pulang.\n4. Deposit (Cagaran) akan dipulangkan dlm masa 3 hari bekerja slepas barang dipulangkan dengan kuantiti & kondisi yang sama disewa.";
    } else {
        rentalDiv.style.display = "none";
        termsEl.value = "Harga sah untuk 7 hari. Bayaran penuh diperlukan sebelum penyerahan bermula.";
    }
};

window.calculateRentalDays = function() {
    const sStr = document.getElementById("quoteStartDate").value;
    const eStr = document.getElementById("quoteEndDate").value;
    const durEl = document.getElementById("quoteDuration");
    
    if (sStr && eStr) {
        let d1 = new Date(sStr);
        let d2 = new Date(eStr);
        let timeDiff = d2.getTime() - d1.getTime();
        let daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));
        if (daysDiff <= 0) daysDiff = 1; // at least 1 day minimum
        durEl.value = daysDiff;
    }
};

window.clearQuoteCart = function() {
    quoteCart = [];
    currentQuoteRef = null;
    currentQuoteVersion = 1;
    document.getElementById("quoteEditIndicator").style.display = "none";
    document.getElementById("quoteType").value = "Sales";
    document.getElementById("quoteCustDetail").value = "";
    document.getElementById("quoteStartDate").value = "";
    document.getElementById("quoteEndDate").value = "";
    document.getElementById("quoteDeposit").value = "";
    document.getElementById("quoteTerms").value = "";
    window.renderQuoteCart();
};

window.saveAndPreviewQuotationParams = async function(docType, docTitle, isViewOnly = false) {
    // Removed the block constraint so the template can be blank
    // if (quoteCart.length === 0) return alert("Sila tambahkan barang ke dalam senarai Quotation dahulu.");
    
    // Only inject default terms if the box is completely empty (prevent overwriting loaded logs)
    document.getElementById("quoteType").value = docType;
    if (!document.getElementById("quoteTerms").value.trim()) {
        if(docType === "Rental") {
            document.getElementById("quoteTerms").value = "1. Penyewa bertanggungjawab menjaga kelengkapan dengan baik.\n2. Denda akan dikenakan jika hilang/rosak.\n3. Deposit cagaran akan dipulangkan dlm masa 3 hari bekerja slepas barang dipulangkan dengan kuantiti & kondisi asal.";
        } else {
            document.getElementById("quoteTerms").value = "Harga sah untuk 7 hari. Bayaran penuh diperlukan sebelum penyerahan bermula.";
        }
    }

    const type = docType;
    document.getElementById("quoteValProjectName").innerText = "Sila taip acara/projek";
    const custDetail = document.getElementById("quoteCustDetail").value || "Walk-In / Guest";
    const terms = document.getElementById("quoteTerms").value;
    
    let subtotal = parseFloat(document.getElementById("quoteTotalPrice").innerText) || 0;
    
    // Logic for Quotation Saving and Versioning
    if (!isViewOnly) {
        let isNew = !currentQuoteRef;
        if(isNew) {
            currentQuoteRef = "QT-" + nextQuoteIdNum++;
            currentQuoteVersion = 1;
        } else {
            currentQuoteVersion++;
        }
    }

    let qId = currentQuoteRef + "-v" + currentQuoteVersion;
    
    let genDateInput = document.getElementById("quoteGeneratedDate") ? document.getElementById("quoteGeneratedDate").value : "";
    let selectedDate = genDateInput ? new Date(genDateInput) : new Date();
    let displayDate = selectedDate.toLocaleDateString('en-GB');

    document.getElementById("quoteHeaderTitle").innerText = docTitle;
    document.getElementById("quoteHeaderSubmitDate").innerText = displayDate;
    document.getElementById("quoteValCurrentDate").innerText = displayDate;
    document.getElementById("quoteValQuoteId").innerText = qId;
    
    let parts = custDetail.split("-");
    document.getElementById("quoteValCustName").innerText = custDetail;
    
    // Rental UI now just uses the deposit row
    let depositBlock = document.getElementById("quoteDepositRowUI");
    
    let grandTotal = round2(subtotal);
    let deposit = 0;
    let rentalData = null;

    if (type === "Rental") {
        const sStr = document.getElementById("quoteStartDate").value;
        const eStr = document.getElementById("quoteEndDate").value;
        const dur = parseInt(document.getElementById("quoteDuration").value) || 1;
        deposit = parseFloat(document.getElementById("quoteDeposit").value) || 0;

        // Rental meta added to project name
        document.getElementById("quoteValProjectName").innerText = `Rental: ${sStr||"TBD"} - ${eStr||"TBD"} (${dur} Hari)`;

        document.getElementById("quotePreviewValDeposit").innerText = deposit.toFixed(2);
        depositBlock.style.display = "flex";

        grandTotal = round2(subtotal + deposit);
        rentalData = { startDate: sStr, endDate: eStr, duration: dur, deposit: deposit };
    } else {
        // no rental container anymore
        depositBlock.style.display = "none";
    }
    
    const tbody = document.getElementById("quoteItemsTableBody");
    tbody.innerHTML = "";
    
    let workingCart = [...quoteCart];
    if(workingCart.length === 0) {
        workingCart = [{
            sku: "CUST-ITEM",
            name: "[Sila Edit Nama Servis/Barang]",
            price: 0.00,
            qty: 1
        }];
    }

    subtotal = 0;
    let rowCount = 0;
    workingCart.forEach((item, index) => {
        let line = round2(item.price * item.qty);
        subtotal = round2(subtotal + line);
        let bg = rowCount % 2 === 0 ? "#F8F8F8" : "#FFFFFF";
        tbody.innerHTML += `
            <tr class="editable-row" style="background-color: ${bg}; border-bottom:1px solid #f1f1f1;">
                <td style="padding:8px 10px; color:#555;">
                    <div style="font-style:italic; font-weight:bold; color:#000;" contenteditable="true" spellcheck="false" class="editable-field editable-name">${item.name}</div>
                </td>
                <td style="text-align:center; padding:8px 10px; color:#555;">
                    <span contenteditable="true" class="editable-field editable-qty" oninput="window.calculateEditableTotal()">${item.qty}</span>
                </td>
                <td style="text-align:right; padding:8px 10px; color:#555;">
                    <span contenteditable="true" class="editable-field editable-price" oninput="window.calculateEditableTotal()">RM ${item.price.toFixed(2)}</span>
                </td>
                <td style="text-align:right; padding:8px 10px; color:#555; font-weight:bold;">
                    RM <span class="row-total">${line.toFixed(2)}</span>
                </td>
            </tr>
        `;
        rowCount++;
    });
    
    if (type === "Rental") grandTotal = round2(subtotal + deposit);
    else grandTotal = round2(subtotal);

    document.getElementById("quotePreviewGrandTotal").innerText = grandTotal.toFixed(2);
    document.getElementById("quoteSubtotal").innerText = "RM " + subtotal.toFixed(2);
    document.getElementById("quoteValSubtotal").innerText = subtotal.toFixed(2);
    document.getElementById("quoteGrandTotal").innerText = "RM " + grandTotal.toFixed(2);
    
    // Fix: Match correct ID from index.html (quotePreviewTnc instead of quoteTermsText)
    const tncNode = document.getElementById("quotePreviewTnc") || document.getElementById("quoteTermsText");
    if(tncNode) tncNode.innerText = terms;
    
    // Save to Log History Array
    const logEntry = {
        id: qId,
        ref: currentQuoteRef,
        version: currentQuoteVersion,
        type: type,
        customer: custDetail,
        terms: terms,
        subtotal: subtotal,
        grand_total: grandTotal,
        rental_data: rentalData,
        items: JSON.parse(JSON.stringify(quoteCart)),
        superseded: false
    };
    if(genDateInput) logEntry.created_at = selectedDate.toISOString();

    // Mark previous instances of this ref as superseded in Cloud
    if (!isViewOnly) {
        try {
            if(currentQuoteVersion > 1) {
                await db.from('quotations_log')
                    .update({ superseded: true })
                    .eq('ref', currentQuoteRef)
                    .lt('version', currentQuoteVersion);
                    
                // Update local state temporarily mapping
                quoteHistoryLogs.forEach(log => {
                    if(log.ref === currentQuoteRef && log.version < currentQuoteVersion) {
                        log.superseded = true;
                    }
                });
            }
            
            let { data, error } = await db.from('quotations_log').insert([logEntry]).select();
            if(data && data.length > 0) {
                // Convert to camelCase locally for UI consistency (Supabase uses snake_case based on our SQL script)
                let sc = data[0];
                quoteHistoryLogs.unshift({
                    id: sc.id,
                    ref: sc.ref,
                    version: sc.version,
                    type: sc.type,
                    customer: sc.customer,
                    terms: sc.terms,
                    subtotal: sc.subtotal,
                    grandTotal: sc.grand_total,
                    rentalData: sc.rental_data,
                    items: sc.items,
                    createdAt: sc.created_at,
                    superseded: sc.superseded
                });
            } else if (error) {
                console.error("Supabase Save Quote Error:", error.message);
                alert("Fail saving to Cloud: " + error.message);
            }
        } catch(e) {
            console.error("Save Quote Exception:", e);
        }
    }

    // Update Editing Indicator UI
    document.getElementById("quoteEditRefLabel").innerText = currentQuoteRef + " (v" + currentQuoteVersion + ")";
    document.getElementById("quoteEditIndicator").style.display = "flex";

    document.getElementById("quoteModal").style.display = "flex";
};

window.deleteQuoteLog = async function(logId) {
    if(!confirm('Adakah anda pasti mahu memadam Quotation/Invoice ini secara kekal?')) return;
    try {
        if(db) await db.from('quotations_log').delete().eq('id', logId);
        quoteHistoryLogs = quoteHistoryLogs.filter(l => l.id !== logId);
        window.renderQuoteLogs();
        alert('Rekod berjaya dipadam.');
    } catch(e) {
        alert('Gagal memadam rekod: ' + e.message);
    }
};

window.renderQuoteLogs = function() {
    const tbody = document.getElementById("quoteLogsTableBody");
    if (!tbody) return;
    
    if (quoteHistoryLogs.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding:20px;">Tiada Sebut Harga. Sila buat satu.</td></tr>`;
        document.getElementById("quoteLogsModal").style.display = "flex";
        return;
    }
    
    let searchInput = document.getElementById("quoteLogSearch");
    let filterVal = searchInput ? searchInput.value.toLowerCase() : "";
    let yearInput = document.getElementById("quoteLogYearFilter");
    let yearFilter = yearInput ? yearInput.value : "All";

    tbody.innerHTML = "";
    let filteredLogs = [...quoteHistoryLogs];
    if(filterVal) {
        filteredLogs = filteredLogs.filter(l => (l.id && l.id.toLowerCase().includes(filterVal)) || (l.customer && l.customer.toLowerCase().includes(filterVal)));
    }
    if(yearFilter !== "All") {
        filteredLogs = filteredLogs.filter(l => {
            let d = new Date(l.createdAt || l.created_at);
            return d.getFullYear().toString() === yearFilter;
        });
    }

    if(filteredLogs.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding:20px;">Tiada rekod jumpa.</td></tr>`;
    }

    filteredLogs.forEach(log => {
        let isSuper = log.superseded ? `<span style="background:#EF4444; color:white; padding:2px 6px; border-radius:4px; font-size:10px;">Lama</span>` : `<span style="background:#10B981; color:white; padding:2px 6px; border-radius:4px; font-size:10px;">Latest</span>`;
        let custPart = (log.customer || "").split("-")[0] || "Guest";
        let dateObj = new Date(log.createdAt || log.created_at);
        let logYear = isNaN(dateObj) ? "-" : dateObj.getFullYear();
        let displayStr = isNaN(dateObj) ? "Tiada Tarikh" : dateObj.toLocaleString('ms-MY');
        
        tbody.innerHTML += `
            <tr style="background:${log.superseded ? '#f9f9f9' : '#fff'}; color:${log.superseded ? '#888' : '#000'}">
                <td><strong>${log.id}</strong><br><small style="color:#aaa;">${displayStr}</small></td>
                <td><strong>${logYear}</strong></td>
                <td>${custPart}</td>
                <td>${log.type}</td>
                <td>RM ${(log.subtotal || 0).toFixed(2)}</td>
                <td>v${log.version} ${isSuper}</td>
                <td>
                    <button onclick="window.loadQuoteIntoCart('${log.id}')" class="btn-dark" style="padding:6px 10px; font-size:10px; margin:0; margin-right:5px;">Edit / Load</button>
                    <button onclick="window.deleteQuoteLog('${log.id}')" class="btn-primary" style="background:#EF4444; padding:6px 10px; font-size:10px; margin:0;">Delete</button>
                </td>
            </tr>
        `;
    });
    
    document.getElementById("quoteLogsModal").style.display = "flex";
};

window.loadQuoteIntoCart = function(logId) {
    const log = quoteHistoryLogs.find(l => l.id === logId);
    if(!log) return;
    
    if(!confirm(`Adakah anda pasti mahu edit ` + logId + `? Ini akan memadamkan troli sekarang.`)) return;
    
    // Set variables
    currentQuoteRef = log.ref;
    currentQuoteVersion = log.version;
    
    quoteCart = JSON.parse(JSON.stringify(log.items));
    
    // Fill UI
    document.getElementById("quoteType").value = log.type;
    document.getElementById("quoteCustDetail").value = log.customer;
    document.getElementById("quoteTerms").value = log.terms;
    
    if (log.createdAt || log.created_at) {
        let d = new Date(log.createdAt || log.created_at);
        if (!isNaN(d)) {
            let yyyy = d.getFullYear();
            let mm = String(d.getMonth() + 1).padStart(2, '0');
            let dd = String(d.getDate()).padStart(2, '0');
            let qDateEl = document.getElementById("quoteGeneratedDate");
            if(qDateEl) qDateEl.value = `${yyyy}-${mm}-${dd}`;
        }
    } else {
        let qDateEl = document.getElementById("quoteGeneratedDate");
        if(qDateEl) qDateEl.value = "";
    }
    
    if(log.rentalData) {
        document.getElementById("quoteStartDate").value = log.rentalData.startDate || log.rentalData.start_date || "";
        document.getElementById("quoteEndDate").value = log.rentalData.endDate || log.rentalData.end_date || "";
        document.getElementById("quoteDuration").value = log.rentalData.duration || 1;
        document.getElementById("quoteDeposit").value = log.rentalData.deposit !== undefined ? log.rentalData.deposit.toFixed(2) : "";
    }
    
    window.renderQuoteCart();
    
    document.getElementById("quoteEditRefLabel").innerText = currentQuoteRef + " (Loading v" + currentQuoteVersion + "...)";
    document.getElementById("quoteEditIndicator").style.display = "flex";
    document.getElementById("quoteLogsModal").style.display = "none";
    
    // Auto-open PDF Preview in View-Only state to satisfy user UX
    let dTitle = log.type === 'Rental' ? 'RENTAL QUO.' : 'QUOTATION';
    window.saveAndPreviewQuotationParams(log.type, dTitle, true);
};

document.getElementById('quoteSearchInput')?.addEventListener('input', (e) => {
    renderQuotePOS(e.target.value);
});
window.syncQuoteModalToCloud = async function() {
    window.calculateEditableTotal();
    
    if(!confirm("Anda pasti mahu merakam rekod ini dan menjadikannya versi rasmi baharu (v+)?")) return;
    
    // 1. Kutip kesemua HTML dari tag dalam modal supaya susunan bold/font tersimpan
    let updatedCart = [];
    document.querySelectorAll('#quoteItemsTableBody tr').forEach(row => {
        let nameEl = row.querySelector('.editable-name');
        let qtyEl = row.querySelector('.editable-qty');
        let priceEl = row.querySelector('.editable-price');
        if(nameEl && qtyEl && priceEl) {
            updatedCart.push({
                sku: "CUST-ITEM",
                name: nameEl.innerHTML,
                qty: parseFloat(qtyEl.innerText.replace(/[^0-9.-]+/g,"")) || 1,
                price: parseFloat(priceEl.innerText.replace(/[^0-9.-]+/g,"")) || 0
            });
        }
    });
    
    if(updatedCart.length === 0) return alert("Sila isikan sekurang-kurangnya 1 item.");
    
    quoteCart = updatedCart;
    window.renderQuoteCart();
    
    // 2. Petik tajuk supaya kekal cantik
    let custVal = document.getElementById("quoteValCustName").innerText;
    let titleVal = document.getElementById("quoteHeaderTitle").innerText;
    let tncVal = document.getElementById("quotePreviewTnc").innerHTML;
    
    document.getElementById("quoteCustDetail").value = custVal;
    document.getElementById("quoteTerms").value = tncVal;
    
    // 3. Tolak ke Supabase sbg versi baharu
    await window.saveAndPreviewQuotationParams(document.getElementById("quoteType").value, titleVal, false);
    
    alert("Kerja Berjaya! Versi telah disimpan dengan sempurna. Sila tekan Print PDF.");
};

window.addNewQuoteRow = function() {
    const tbody = document.getElementById("quoteItemsTableBody");
    if(!tbody) return;
    
    let rowsCount = document.querySelectorAll('#quoteItemsTableBody tr').length;
    let bg = rowsCount % 2 === 0 ? "#F8F8F8" : "#FFFFFF";
    
    let newTr = document.createElement("tr");
    newTr.className = "editable-row";
    newTr.style.cssText = `background-color: ${bg}; border-bottom:1px solid #f1f1f1;`;
    
    newTr.innerHTML = `
        <td style="padding:8px 10px; color:#555;">
            <div style="font-style:italic; font-weight:bold; color:#000;" contenteditable="true" spellcheck="false" class="editable-field editable-name">[Nama Item Baru]</div>
        </td>
        <td style="text-align:center; padding:8px 10px; color:#555;">
            <span contenteditable="true" class="editable-field editable-qty" oninput="window.calculateEditableTotal()">1</span>
        </td>
        <td style="text-align:right; padding:8px 10px; color:#555;">
            <span contenteditable="true" class="editable-field editable-price" oninput="window.calculateEditableTotal()">RM 0.00</span>
        </td>
        <td style="text-align:right; padding:8px 10px; color:#555; font-weight:bold;">
            RM <span class="row-total">0.00</span>
        </td>
    `;
    
    tbody.appendChild(newTr);
};

window.calculateEditableTotal = function() {
    let subtotal = 0;
    const rows = document.querySelectorAll('#quoteItemsTableBody tr');
    
    rows.forEach(row => {
        let qtyEl = row.querySelector('.editable-qty');
        let priceEl = row.querySelector('.editable-price');
        let rowTotalEl = row.querySelector('.row-total');
        
        if(qtyEl && priceEl && rowTotalEl) {
            let q = parseFloat(qtyEl.innerText.replace(/[^0-9.-]+/g,"")) || 0;
            let p = parseFloat(priceEl.innerText.replace(/[^0-9.-]+/g,"")) || 0;
            let lineTotal = round2(q * p);
            subtotal = round2(subtotal + lineTotal);
            rowTotalEl.innerText = lineTotal.toFixed(2);
        }
    });

    let depositEl = document.getElementById("quotePreviewValDeposit");
    let deposit = 0;
    if(depositEl) deposit = parseFloat(depositEl.innerText.replace(/[^0-9.-]+/g,"")) || 0;

    let discountEl = document.getElementById("quoteValDiscount");
    let discount = 0;
    if(discountEl) discount = parseFloat(discountEl.innerText.replace(/[^0-9.-]+/g,"")) || 0;

    let grandTotal = round2(subtotal + deposit - discount);
    let gtEl = document.getElementById("quotePreviewGrandTotal");
    if(gtEl) gtEl.innerText = grandTotal.toFixed(2);
    
    let subEl2 = document.getElementById("quoteValSubtotal");
    if(subEl2) subEl2.innerText = subtotal.toFixed(2);
    
    // Hidden inputs update
    let subEl = document.getElementById("quoteSubtotal");
    if(subEl) subEl.innerText = subtotal.toFixed(2);
    let gtEl2 = document.getElementById("quoteGrandTotal");
    if(gtEl2) gtEl2.innerText = grandTotal.toFixed(2);
};
// ===================================
// PRODUCT REGISTRATION MODE
// ===================================
window.saveMasterProduct = async function() {
    const get = (id) => (document.getElementById(id)?.value || '').trim();
    const getNum = (id) => {
        const v = document.getElementById(id)?.value;
        return v === '' || v == null ? null : parseFloat(v);
    };

    const name = get('mpName');
    const sku = get('mpSku').toUpperCase();
    const price = getNum('mpPrice');

    if(!name || !sku || price == null || isNaN(price)) {
        return showToast('Nama, SKU, Harga Jualan wajib diisi.', 'warn');
    }

    if(masterProducts.find(p => p.sku === sku)) {
        return showToast(`SKU "${sku}" sudah wujud. Guna Edit untuk update.`, 'warn');
    }

    const imageUrl = get('mpImageUrl');
    const payload = {
        sku, name,
        unit: get('mpUnit') || 'pcs',
        price,
        cost_price: getNum('mpCostPrice'),
        category: get('mpCategory') || null,
        brand: get('mpBrand') || null,
        model_no: get('mpModelNo') || null,
        parent_sku: get('mpParentSku').toUpperCase() || null,
        erp_barcode: get('mpErpBarcode') || null,
        variant_color: get('mpVariantColor') || null,
        variant_size: get('mpVariantSize') || null,
        weight_kg: getNum('mpWeightKg'),
        length_cm: getNum('mpLengthCm'),
        width_cm: getNum('mpWidthCm'),
        height_cm: getNum('mpHeightCm'),
        location_bin: get('mpLocationBin') || null,
        description: get('mpDescription') || null,
        commission_rate: getNum('mpCommissionRate'),
        reorder_point: getNum('mpReorderPoint'),
        reorder_qty: getNum('mpReorderQty'),
        lead_time_days: getNum('mpLeadTimeDays'),
        images: imageUrl ? [imageUrl] : null,
        is_published: get('mpIsPublished') === 'true'
    };

    // Strip null fields so PG defaults / nulls land cleanly
    const cleaned = {};
    for(const [k, v] of Object.entries(payload)) {
        if(v !== null && v !== '' && !(typeof v === 'number' && isNaN(v))) cleaned[k] = v;
    }

    const { data: newProd, error } = await db.from('products_master').insert([cleaned]).select();
    if(error) {
        console.error('Master Product insert error:', error);
        return showToast('Ralat: ' + error.message, 'error');
    }
    if(newProd && newProd.length > 0) masterProducts.push(newProd[0]);

    try {
        await db.from('audit_logs').insert([{
            action_type: 'master_product_create',
            actor_name: currentUser ? currentUser.name : 'System',
            details: JSON.stringify({ sku, name, brand: cleaned.brand, price, published: cleaned.is_published }),
            created_at: new Date().toISOString()
        }]);
    } catch(_){}

    showToast(`Profil "${name}" (${sku}) berjaya dicipta!`, 'success');

    // Clear all fields
    ['mpName','mpSku','mpBrand','mpCategory','mpModelNo','mpParentSku','mpPrice','mpCostPrice',
     'mpVariantColor','mpVariantSize','mpErpBarcode','mpWeightKg','mpLengthCm','mpWidthCm','mpHeightCm',
     'mpLocationBin','mpDescription','mpImageUrl','mpCommissionRate',
     'mpReorderPoint','mpReorderQty','mpLeadTimeDays'
    ].forEach(id => { const el = document.getElementById(id); if(el) el.value = ''; });
    const unitEl = document.getElementById('mpUnit'); if(unitEl) unitEl.value = 'pcs';
    const pubEl = document.getElementById('mpIsPublished'); if(pubEl) pubEl.value = 'false';
};

// Auto-populate brand & category datalists from existing products
window.refreshMpDatalists = function() {
    const bList = document.getElementById('mpBrandList');
    const cList = document.getElementById('mpCategoryList');
    if(!bList || !cList || typeof masterProducts === 'undefined') return;
    const brands = [...new Set(masterProducts.map(p => p.brand).filter(Boolean))].sort();
    const cats = [...new Set(masterProducts.map(p => p.category).filter(Boolean))].sort();
    bList.innerHTML = brands.map(b => `<option value="${b}">`).join('');
    cList.innerHTML = cats.map(c => `<option value="${c}">`).join('');
};
window.saveProductRegistration = async function() {
    let shipmentNo = document.getElementById("prShipmentNo").value.trim();
    let shipmentDate = document.getElementById("prShipmentDate").value;
    let sku = document.getElementById("prSku").value.trim().toUpperCase();
    let priceRmb = document.getElementById("prPriceRmb").value;
    let units = document.getElementById("prUnitPurchased").value;
    let shippingCost = document.getElementById("prShippingCost").value;
    
    if(!shipmentNo || !shipmentDate || !sku || !priceRmb || !units || !shippingCost) {
        alert("Sila lengkapkan semua maklumat pendaftaran produk.");
        return;
    }
    
    // Parse values
    let qtyReceived = parseInt(units);
    
    // Only send columns that are proven to exist in inventory_batches
    const batchPayload = {
        sku: sku,
        batch_year: new Date(shipmentDate).getFullYear() || new Date().getFullYear(),
        inbound_date: shipmentDate,
        qty_received: qtyReceived,
        qty_remaining: qtyReceived
    };
    
    // Insert to Supabase (inventory_batches)
    let { data: newBatch, error: batchErr } = await db.from('inventory_batches').insert([batchPayload]).select();
    
    if(batchErr) {
        console.error("Batch Insert Error:", batchErr);
        alert("Ralat menyimpan Batch. Pastikan SKU wujud di Master Product.");
        return;
    }

    // Combine extra data into the reason text for tracking
    let trackingInfo = `PO: ${shipmentNo} | RMB: ${priceRmb} | Ship: RM${shippingCost}`;

    // Insert Transaction Audit Trail
    const txnPayload = {
        sku: sku,
        transaction_type: 'PO_IN',
        qty: qtyReceived,
        reason: trackingInfo,
        staff_name: currentUser ? currentUser.name : 'System',
        created_at: new Date().toISOString()
    };
    
    let { data: newTxn, error: txnErr } = await db.from('inventory_transactions').insert([txnPayload]).select();
    
    if(txnErr) {
        console.error("Transaction Insert Error:", txnErr);
    }
    
    // Update Local State
    if(newBatch && newBatch.length > 0) inventoryBatches.push(newBatch[0]);
    if(newTxn && newTxn.length > 0) inventoryTransactions.unshift(newTxn[0]);
    
    alert(`Batch PO (${shipmentNo}) Berjaya Didaftarkan untuk SKU: ${sku}!`);
    
    // Clear fields
    document.getElementById("prShipmentNo").value = "";
    document.getElementById("prShipmentDate").value = "";
    document.getElementById("prSku").value = "";
    document.getElementById("prPriceRmb").value = "";
    document.getElementById("prUnitPurchased").value = "";
    document.getElementById("prShippingCost").value = "";
    
    // Refresh relevant UI if they are open
    if(typeof renderLowStockAlert === "function") renderLowStockAlert();
};

window.populateEditSkuList = function() {
    const list = document.getElementById('editSkuList');
    if(!list) return;
    list.innerHTML = masterProducts.map(p => `<option value="${p.sku}">${p.name}</option>`).join('');
};

window.loadProductForEdit = function(sku) {
    if(!sku) return;
    const prod = masterProducts.find(p => p.sku === sku);
    if(!prod) return alert("SKU tidak dijumpai di Gudang Pusat.");
    
    document.getElementById('epName').value = prod.name || '';
    document.getElementById('epCategory').value = prod.category || '';
    document.getElementById('epPrice').value = prod.price || 0;
    document.getElementById('epCost').value = prod.cost_price || 0;
    document.getElementById('epImages').value = (prod.images || []).join(', ');
    
    // Parse location_bin assuming format "RACK-TIER-BIN" or just text
    let loc = prod.location_bin || '';
    let locParts = loc.split('-');
    document.getElementById('epRack').value = locParts[0] || '';
    document.getElementById('epTier').value = locParts[1] || '';
    document.getElementById('epBin').value = locParts[2] || '';

    
    document.getElementById('editProductFields').style.display = 'grid';
};

window.saveProductEdit = async function() {
    const sku = document.getElementById('editSkuSearch').value;
    if(!sku) return;
    
    const name = document.getElementById('epName').value;
    const category = document.getElementById('epCategory').value;
    const price = parseFloat(document.getElementById('epPrice').value) || 0;
    const cost = parseFloat(document.getElementById('epCost').value) || 0;
    const imagesRaw = document.getElementById('epImages').value;
    const images = imagesRaw ? imagesRaw.split(',').map(s => s.trim()).filter(Boolean) : [];
    
    const rack = document.getElementById('epRack').value.trim();
    const tier = document.getElementById('epTier').value.trim();
    const bin = document.getElementById('epBin').value.trim();
    const locationStr = [rack, tier, bin].filter(Boolean).join('-');

    
    const updatePayload = {
        name: name,
        category: category,
        price: price,
        cost_price: cost,
        images: images,
        location_bin: locationStr
    };
    
    try {
        let { error } = await db.from('products_master').update(updatePayload).eq('sku', sku);
        if(error) throw error;
        
        alert(`Berjaya kemas kini profil SKU: ${sku}`);
        await window.initApp(); // reload masterProducts
        document.getElementById('editProductFields').style.display = 'none';
        document.getElementById('editSkuSearch').value = '';
    } catch(e) {
        alert("Ralat mengemaskini produk: " + e.message);
    }
};

window.populateMovementSkuList = function() {
    const list = document.getElementById('movementSkuList');
    if(!list) return;
    list.innerHTML = masterProducts.map(p => `<option value="${p.sku}">${p.name}</option>`).join('');
};

window.processInbound = async function() {
    const sku = (document.getElementById('inboundSkuSearch').value || '').trim();
    const qty = parseInt(document.getElementById('inboundQty').value) || 0;
    const costEl = document.getElementById('inboundCost');
    const cost = costEl ? parseFloat(costEl.value) : null;
    const supplier = (document.getElementById('inboundSupplier')?.value || '').trim();
    const ref = (document.getElementById('inboundRef').value || '').trim();

    if(!sku || qty <= 0) return showToast('SKU & kuantiti wajib.', 'warn');
    const prod = masterProducts.find(p => p.sku === sku);
    if(!prod) return showToast('SKU tak wujud dalam Master Product.', 'warn');

    try {
        const batchPayload = {
            sku, qty_received: qty, qty_remaining: qty,
            inbound_date: new Date().toISOString().split('T')[0]
        };
        if(!isNaN(cost) && cost != null && cost > 0) {
            batchPayload.cost_price = cost;
            batchPayload.landed_cost = cost;
        }
        if(supplier) batchPayload.supplier_name = supplier;
        if(ref) batchPayload.notes = ref;

        const { error } = await db.from('inventory_batches').insert([batchPayload]);
        if(error) throw error;

        const reasonText = `Manual Inbound${supplier ? ' from ' + supplier : ''}${ref ? ' (' + ref + ')' : ''}${cost ? ' @ RM' + cost.toFixed(2) : ''}`;
        await db.from('inventory_transactions').insert([{
            sku, transaction_type: 'IN', qty, reason: reasonText,
            staff_name: currentUser ? currentUser.name : 'System',
            created_at: new Date().toISOString()
        }]);

        showToast(`+${qty} ${sku} diterima${cost ? ' @ RM' + cost.toFixed(2) : ''}`, 'success');
        ['inboundSkuSearch','inboundQty','inboundCost','inboundSupplier','inboundRef'].forEach(id => {
            const el = document.getElementById(id); if(el) el.value = '';
        });
        await window.initApp();
    } catch(e) {
        showToast('Ralat Inbound: ' + e.message, 'error');
    }
};

window.processOutbound = async function() {
    const sku = document.getElementById('outboundSkuSearch').value.trim();
    const qty = parseInt(document.getElementById('outboundQty').value) || 0;
    const reason = document.getElementById('outboundReason').value;
    const note = document.getElementById('outboundNote').value.trim();

    if(!sku || qty <= 0) return showToast("Sila isikan SKU dan kuantiti sah untuk Outbound.", 'warn');

    let relevantBatches = inventoryBatches.filter(b => b.sku === sku && b.qty_remaining > 0)
        .sort((a, b) => new Date(a.inbound_date) - new Date(b.inbound_date));
    let totalStock = relevantBatches.reduce((sum, b) => sum + b.qty_remaining, 0);
    if(totalStock < qty) return showToast(`Stok tak cukup. Baki sistem: ${totalStock}`, 'warn');

    // Compute write-off RM value (rough — uses master price)
    const prod = masterProducts.find(p => p.sku === sku);
    const unitCost = prod ? (prod.cost_price || prod.price || 0) : 0;
    const writeoffValue = unitCost * qty;

    // Decide if Manager PIN required
    const HIGH_RISK = ['Kerosakan / Pecah', 'Lain-lain'];
    const VALUE_THRESHOLD = 100; // RM
    const needsPin = HIGH_RISK.includes(reason) || writeoffValue >= VALUE_THRESHOLD;

    let approval = null;
    if(needsPin) {
        const detailsHtml = `
            <strong>SKU:</strong> ${sku}<br>
            <strong>Qty keluar:</strong> ${qty} unit<br>
            <strong>Sebab dari staf:</strong> ${reason}${note ? ' — ' + note : ''}<br>
            <strong>Anggaran nilai write-off:</strong> RM ${writeoffValue.toFixed(2)}
        `;
        approval = await requireManagerPin({
            title: 'Kelulusan Write-Off / Outbound',
            subtitle: 'Outbound bernilai tinggi atau berisiko fraud — perlu sahkan dengan Manager PIN.',
            detailsHtml,
            reasons: [
                'Sah — kerosakan diperakui',
                'Sah — transfer cawangan',
                'Sah — display/marketing',
                'Sah — promosi / sample',
                'Sah — kos operasi',
                'Lain-lain (catat dalam note)'
            ]
        });
        if(!approval) return showToast('Outbound dibatalkan (tiada kelulusan).', 'warn');
    }

    try {
        let remaining = qty;
        for(const batch of relevantBatches) {
            if(remaining <= 0) break;
            const deduct = Math.min(batch.qty_remaining, remaining);
            const { error } = await db.from('inventory_batches')
                .update({ qty_remaining: batch.qty_remaining - deduct }).eq('id', batch.id);
            if(error) throw error;
            remaining -= deduct;
        }

        const fullReason = approval
            ? `${reason} | Approved by: ${approval.manager.name} (${approval.reason})${approval.note ? ' — ' + approval.note : ''}${note ? ' | Staf note: ' + note : ''}`
            : reason + (note ? ' - ' + note : '');

        await db.from('inventory_transactions').insert([{
            sku, transaction_type: 'OUT', qty, reason: fullReason,
            staff_name: currentUser ? currentUser.name : 'System',
            created_at: new Date().toISOString()
        }]);

        if(approval) {
            await db.from('audit_logs').insert([{
                action_type: 'outbound_writeoff',
                actor_name: approval.manager.name,
                target_staff: currentUser ? currentUser.name : null,
                details: JSON.stringify({
                    sku, qty, reason, staff_note: note,
                    approver_reason: approval.reason, approver_note: approval.note,
                    estimated_value_rm: writeoffValue
                }),
                created_at: new Date().toISOString()
            }]);
        }

        showToast(`${qty} unit ${sku} ditolak. ${approval ? 'Approved by ' + approval.manager.name : ''}`, 'success');
        document.getElementById('outboundSkuSearch').value = '';
        document.getElementById('outboundQty').value = '';
        document.getElementById('outboundNote').value = '';
        await window.initApp();
    } catch(e) {
        showToast('Ralat Outbound: ' + e.message, 'error');
    }
};

window.loadAuditProduct = function() {
    const sku = document.getElementById('auditSku').value.trim();
    if(!sku) return;
    
    const prod = masterProducts.find(p => p.sku === sku);
    if(!prod) return; // Silent return if not found, wait for full typing
    
    const myBatches = inventoryBatches.filter(b => b.sku === sku && b.qty_remaining > 0);
    const totalStock = myBatches.reduce((sum, b) => sum + b.qty_remaining, 0);
    
    document.getElementById('auditSysQty').value = totalStock;
    document.getElementById('auditPhysQty').focus();
};

window.submitStockAudit = async function() {
    const sku = document.getElementById('auditSku').value.trim();
    const sysQty = parseInt(document.getElementById('auditSysQty').value) || 0;
    const physQtyStr = document.getElementById('auditPhysQty').value;
    
    if(!sku || physQtyStr === '') return alert("Sila isikan SKU dan Kuantiti Fizikal.");
    const physQty = parseInt(physQtyStr);
    
    if(sysQty === physQty) {
        alert(`Tiada perbezaan stok untuk ${sku}. Selesai audit.`);
        document.getElementById('auditSku').value = '';
        document.getElementById('auditSysQty').value = '';
        document.getElementById('auditPhysQty').value = '';
        return;
    }
    
    const diff = physQty - sysQty;
    const diffText = diff > 0 ? `+${diff} (Berlebihan)` : `${diff} (Hilang/Rosak)`;
    
    const confirmAudit = confirm(`Perbezaan dikesan: ${diffText}\nKuantiti Sistem: ${sysQty}\nKuantiti Fizikal: ${physQty}\n\nAdakah anda pasti mahu hantar laporan Discrepancy ini?`);
    if(!confirmAudit) return;
    
    try {
        const payload = {
            request_type: 'Discrepancy',
            status: 'Pending',
            metadata: {
                sku: sku,
                system_qty: sysQty,
                physical_qty: physQty,
                difference: diff,
                reported_by: currentUser ? currentUser.name : 'Unknown'
            }
        };
        let { error } = await db.from('pending_requests').insert([payload]);
        if(error) throw error;
        
        alert(`Laporan Discrepancy ${sku} berjaya dihantar untuk kelulusan.`);
        document.getElementById('auditSku').value = '';
        document.getElementById('auditSysQty').value = '';
        document.getElementById('auditPhysQty').value = '';
        // Wait for realtime UI update
    } catch(e) {
        alert("Ralat menghantar laporan audit: " + e.message);
    }
};

window.renderWhAudit = function() {
    const tbody = document.getElementById("whAuditTbody");
    if(!tbody) return;
    
    const audits = pendingSchedules.filter(r => r.request_type === 'Discrepancy' && r.status === 'Pending');
    if(audits.length === 0) {
        tbody.innerHTML = `<tr><td colspan="3" style="text-align:center; color:#888;">Tiada laporan Discrepancy yang menunggu kelulusan.</td></tr>`;
        return;
    }
    
    tbody.innerHTML = audits.map(a => {
        let meta = a.metadata || {};
        let diffColor = meta.difference > 0 ? '#10B981' : '#EF4444';
        return `
            <tr>
                <td><strong>${meta.sku || 'N/A'}</strong><br><span style="color:${diffColor}; font-weight:bold;">${meta.difference > 0 ? '+'+meta.difference : meta.difference} unit</span></td>
                <td>${meta.reported_by || 'Staf'}</td>
                <td>
                    <button class="btn-success" style="padding:4px 8px; font-size:10px; margin-bottom:4px;" onclick="window.approveDiscrepancy('${a.id}', '${meta.sku}', ${meta.difference})">Lulus</button><br>
                    <button class="btn-primary" style="background:#EF4444; border:none; padding:4px 8px; font-size:10px;" onclick="window.rejectRequest('${a.id}')">Tolak</button>
                </td>
            </tr>
        `;
    }).join('');
};

window.approveDiscrepancy = async function(reqId, sku, difference) {
    if(!confirm(`Luluskan pelarasan stok ${difference > 0 ? '+'+difference : difference} unit untuk ${sku}?`)) return;
    
    try {
        // Find batch to adjust
        if(difference > 0) {
            // Surplus, create a new inbound batch
            await db.from('inventory_batches').insert([{
                sku: sku, qty_received: difference, qty_remaining: difference, inbound_date: new Date().toISOString().split('T')[0]
            }]);
        } else {
            // Shortage, deduct from oldest batch (similar to outbound)
            let qtyToDeduct = Math.abs(difference);
            let relevantBatches = inventoryBatches.filter(b => b.sku === sku && b.qty_remaining > 0).sort((a,b) => new Date(a.inbound_date) - new Date(b.inbound_date));
            
            for(let batch of relevantBatches) {
                if(qtyToDeduct <= 0) break;
                let deductAmount = Math.min(batch.qty_remaining, qtyToDeduct);
                await db.from('inventory_batches').update({ qty_remaining: batch.qty_remaining - deductAmount }).eq('id', batch.id);
                qtyToDeduct -= deductAmount;
            }
        }
        
        await db.from('pending_requests').update({status: 'Approved'}).eq('id', reqId);
        
        await db.from('inventory_transactions').insert([{
            sku: sku,
            transaction_type: 'ADJUSTMENT',
            qty: difference,
            reason: 'Audit Discrepancy Approved',
            staff_name: currentUser ? currentUser.name : 'System',
            created_at: new Date().toISOString()
        }]);
        
        alert(`Discrepancy diluluskan. Baki stok ${sku} telah diselaraskan.`);
        await window.initApp();
    } catch(e) {
        alert("Ralat menyelaraskan stok: " + e.message);
    }
};

window.rejectRequest = async function(reqId) {
    if(!confirm('Tolak permintaan ini secara rasmi?')) return;
    try {
        await db.from('pending_requests').update({status: 'Rejected'}).eq('id', reqId);
        alert('Permintaan ditolak.');
        await window.initApp();
    } catch(e) {
        alert("Ralat menolak permintaan: " + e.message);
    }
};

// ===================================
// PRODUCT DETAILS PAGE (PDP) MODAL
// ===================================

let currentPdpMetafields = {};

window.openPdpModal = function(sku) {
    const prod = masterProducts.find(p => p.sku === sku);
    if(!prod) return alert("Product not found");

    document.getElementById('pdpOriginalSku').value = prod.sku;
    document.getElementById('pdpHeaderTitle').innerText = `${prod.sku} | ${prod.name}`;
    document.getElementById('pdpStatus').value = isPublished(prod) ? "true" : "false";
    document.getElementById('pdpName').value = prod.name || '';
    document.getElementById('pdpCategory').value = prod.category || '';
    document.getElementById('pdpBrand').value = prod.brand || '';
    document.getElementById('pdpPrice').value = prod.price || 0;
    document.getElementById('pdpCost').value = prod.cost_price || 0;

    // Media
    let imgs = prod.images || [];
    document.getElementById('pdpMediaUrls').value = imgs.join(',');
    renderPdpMediaGallery(imgs);

    // Inventory
    const myBatches = inventoryBatches.filter(b => b.sku === sku && b.qty_remaining > 0);
    const totalStock = myBatches.reduce((sum, b) => sum + b.qty_remaining, 0);
    document.getElementById('pdpStockAvailable').innerText = totalStock;

    // Metafields
    currentPdpMetafields = {};
    if(prod.metafields) {
        try {
            currentPdpMetafields = typeof prod.metafields === 'string' ? JSON.parse(prod.metafields) : prod.metafields;
        } catch(e) {}
    }
    renderMetafields();

    document.getElementById('pdpModal').style.display = 'block';
};

window.renderPdpMediaGallery = function(urls) {
    const container = document.getElementById('pdpMediaGallery');
    container.innerHTML = '';
    urls.forEach((url, idx) => {
        container.innerHTML += `
            <div style="position:relative; width:80px; height:80px; border-radius:8px; border:1px solid #e1e3e5; overflow:hidden; flex-shrink:0;">
                <img src="${url}" style="width:100%; height:100%; object-fit:cover;">
                <button onclick="window.removePdpMedia(${idx})" style="position:absolute; top:2px; right:2px; background:rgba(255,255,255,0.8); border:none; border-radius:50%; width:20px; height:20px; font-size:10px; cursor:pointer; color:red;"></button>
            </div>
        `;
    });
};

window.addPdpMedia = function() {
    let url = prompt("Enter Image URL:");
    if(url) {
        let currentStr = document.getElementById('pdpMediaUrls').value;
        let urls = currentStr ? currentStr.split(',') : [];
        urls.push(url.trim());
        document.getElementById('pdpMediaUrls').value = urls.join(',');
        renderPdpMediaGallery(urls);
    }
};

window.removePdpMedia = function(idx) {
    let currentStr = document.getElementById('pdpMediaUrls').value;
    let urls = currentStr ? currentStr.split(',') : [];
    urls.splice(idx, 1);
    document.getElementById('pdpMediaUrls').value = urls.join(',');
    renderPdpMediaGallery(urls);
};

window.renderMetafields = function() {
    const container = document.getElementById('pdpMetafieldsContainer');
    container.innerHTML = '';
    for(let key in currentPdpMetafields) {
        container.innerHTML += `
            <div style="display:flex; gap:10px; align-items:center;">
                <input type="text" class="login-input" value="${key}" disabled style="flex:1; background:#f9fafb; margin:0;">
                <input type="text" class="login-input" value="${currentPdpMetafields[key]}" onchange="window.updateMetafield('${key}', this.value)" style="flex:2; margin:0;">
                <button onclick="window.removeMetafield('${key}')" style="background:none; border:none; color:#d82c0d; cursor:pointer; padding:5px;">️</button>
            </div>
        `;
    }
};

window.addMetafieldRow = function() {
    let key = prompt("Enter Field Name (e.g. Color, Hardware material):");
    if(key && !currentPdpMetafields[key]) {
        currentPdpMetafields[key] = "";
        renderMetafields();
    }
};

window.updateMetafield = function(key, val) {
    currentPdpMetafields[key] = val;
};

window.removeMetafield = function(key) {
    delete currentPdpMetafields[key];
    renderMetafields();
};

window.savePdpData = async function() {
    const sku = document.getElementById('pdpOriginalSku').value;
    const updatePayload = {
        name: document.getElementById('pdpName').value.trim(),
        category: document.getElementById('pdpCategory').value.trim(),
        brand: document.getElementById('pdpBrand').value.trim(),
        price: parseFloat(document.getElementById('pdpPrice').value) || 0,
        cost_price: parseFloat(document.getElementById('pdpCost').value) || 0,
        is_published: document.getElementById('pdpStatus').value === "true",
        metafields: JSON.stringify(currentPdpMetafields)
    };

    let imgStr = document.getElementById('pdpMediaUrls').value;
    updatePayload.images = imgStr ? imgStr.split(',').map(s=>s.trim()).filter(Boolean) : [];

    try {
        let { error } = await db.from('products_master').update(updatePayload).eq('sku', sku);
        if(error) throw error;
        
        alert("Product saved successfully.");
        document.getElementById('pdpModal').style.display = 'none';
        await window.initApp(); // reload everything
    } catch(e) {
        alert("Error saving product: " + e.message);
    }
};

window.renderMgmtInventory = function() {
    const tbody = document.getElementById("mgmtInventoryTableBody");
    if(!tbody) return;
    tbody.innerHTML = "";

    let htmlBuf = "";

    masterProducts.forEach(p => {
        const myBatches = inventoryBatches.filter(b => b.sku === p.sku && b.qty_remaining > 0);
        const totalStock = myBatches.reduce((sum, b) => sum + b.qty_remaining, 0);
        
        let thumb = "https://placehold.co/100x100?text=Img";
        let imgs = p.images || []; if(imgs.length > 0) thumb = imgs[0];

        let sBadge = isPublished(p) ? `<span style="color:green;font-size:10px;">Active</span>` : `<span style="color:red;font-size:10px;">Draft</span>`;

        let metaHtml = "";
        try {
            if (p.metafields) {
                let m = typeof p.metafields === 'string' ? JSON.parse(p.metafields) : p.metafields;
                for (let k in m) {
                    metaHtml += `<span style="display:inline-block; background:#e5e7eb; color:#374151; padding:2px 6px; border-radius:4px; font-size:10px; margin:2px 2px 0 0;"><b>${k}:</b> ${m[k]}</span>`;
                }
            }
        } catch(e) {}
        if (!metaHtml) metaHtml = `<span style="color:#aaa; font-style:italic; font-size:11px;">Tiada data</span>`;

        htmlBuf += `
            <tr>
                <td>
                    <img src="${thumb}" style="width:45px; height:45px; object-fit:cover; border-radius:6px; background:#eee;"><br>
                    ${sBadge}
                </td>
                <td>
                    <span class="sku-badge">${p.sku}</span> <span class="cat-badge">${p.category||'Uncategorized'}</span> ${p.location_bin ? `<span style="background:#fef08a; color:#854d0e; padding:3px 6px; border-radius:4px; font-size:10px;"> Loc: ${p.location_bin}</span>` : ''}<br>
                    <strong>${p.name}</strong><br>
                    <small style="color:#888;">Jenama: <strong>${p.brand || 'N/A'}</strong></small>
                </td>
                <td>
                    <div style="font-size:12px; color:#555;">
                        Model: ${p.model_no || '-'}<br>
                        Variant: ${p.variant_size || '-'} / ${p.variant_color || '-'}<br>
                        Dimensi: ${p.dimensions || '-'} (${p.weight_kg ? p.weight_kg+'Kg' : '-'})
                    </div>
                </td>
                <td>
                    ${metaHtml}
                </td>
                <td style="font-weight:bold; color:${totalStock <= 0 ? 'red' : 'green'};">
                    ${totalStock} ${p.unit||'Pcs'}<br>
                    <small style="font-weight:normal; color:#888;">${myBatches.length} batch(es)</small>
                    ${myBatches.length > 0 ? (() => {
                        const sources = [...new Set(myBatches.map(b => b.po_number).filter(Boolean))];
                        const suppliers = [...new Set(myBatches.map(b => b.supplier_name).filter(Boolean))];
                        let trace = '';
                        if(sources.length) trace += `<br><span style="font-weight:normal; color:#0EA5E9; font-size:10px;">📋 ${sources.slice(0,2).join(', ')}${sources.length > 2 ? '+' : ''}</span>`;
                        if(suppliers.length) trace += `<br><span style="font-weight:normal; color:#7C3AED; font-size:10px;">🏭 ${suppliers.slice(0,2).join(', ')}${suppliers.length > 2 ? '+' : ''}</span>`;
                        return trace;
                    })() : ''}
                </td>
                <td>
                    <div style="background:#F3F4F6; padding:5px; border-radius:4px; font-family:monospace; font-size:12px; border:1px solid #ddd; display:inline-block;">
                         ${p.location_bin || "Tiada Maklumat Rak"}
                    </div>
                </td>
                <td>
                    <small>Cost: RM${parseFloat(p.cost_price||0).toFixed(2)}</small><br>
                    <strong>Sell: RM${parseFloat(p.price).toFixed(2)}</strong>
                </td>
                <td>
                    <button class="btn-success" style="padding:4px 8px; font-size:12px; cursor:pointer; width:100%; white-space:nowrap; background:#F59E0B;" onclick="window.openPricingCalc('${p.sku}')"> Harga</button>
                </td>
                <td>
                    <button class="btn-primary" style="padding:4px 8px; font-size:12px; cursor:pointer; width:100%; white-space:nowrap;" onclick="window.openPdpModal('${p.sku}')">️ Edit Details</button>
                </td>
            </tr>
        `;
    });
    tbody.innerHTML = htmlBuf;
};

// ===================================
// PRICING CALCULATOR LOGIC
// ===================================

window.openPricingCalc = function(sku) {
    const p = masterProducts.find(x => x.sku === sku);
    if(!p) return;

    document.getElementById('calcSku').value = sku;
    document.getElementById('calcSkuTitle').innerText = `SKU: ${sku} | ${p.name}`;
    
    // Parse existing Metafields for calculator memory
    let m = {};
    try {
        if(p.metafields) m = typeof p.metafields === 'string' ? JSON.parse(p.metafields) : p.metafields;
    } catch(e) {}

    document.getElementById('calcBaseCost').value = p.cost_price || 0;
    document.getElementById('calcShipping').value = parseFloat(m['_calc_shipping']) || 0;
    document.getElementById('calcLabor').value = parseFloat(m['_calc_labor']) || 0;
    document.getElementById('calcMarginPct').value = parseFloat(m['_calc_margin_pct']) || 20; // default 20%
    document.getElementById('calcCommPct').value = parseFloat(m['_calc_comm_pct']) || 5; // default 5%

    window.calcPricing();
    document.getElementById('pricingCalcModal').style.display = 'flex';
};

window.calcPricing = function() {
    let base = parseFloat(document.getElementById('calcBaseCost').value) || 0;
    let ship = parseFloat(document.getElementById('calcShipping').value) || 0;
    let labor = parseFloat(document.getElementById('calcLabor').value) || 0;
    let marginPct = parseFloat(document.getElementById('calcMarginPct').value) || 0;
    let commPct = parseFloat(document.getElementById('calcCommPct').value) || 0;

    let totalCost = base + ship + labor;
    document.getElementById('calcTotalCost').value = totalCost.toFixed(2);

    let profit = totalCost * (marginPct / 100);
    let grossPrice = totalCost + profit;
    
    // finalPrice = grossPrice / (1 - commPct)
    let finalPrice = 0;
    if(commPct >= 100) finalPrice = grossPrice; // avoid division by zero/negative
    else finalPrice = grossPrice / (1 - (commPct / 100));

    let commAmount = finalPrice * (commPct / 100);

    document.getElementById('calcProfitAmount').innerText = profit.toFixed(2);
    document.getElementById('calcCommAmount').innerText = commAmount.toFixed(2);
    document.getElementById('calcFinalPrice').innerText = finalPrice.toFixed(2);
};

window.applyCalculatedPrice = async function() {
    const sku = document.getElementById('calcSku').value;
    const p = masterProducts.find(x => x.sku === sku);
    if(!p) return;

    let finalPrice = parseFloat(document.getElementById('calcFinalPrice').innerText);
    let baseCost = parseFloat(document.getElementById('calcBaseCost').value) || 0;
    let ship = parseFloat(document.getElementById('calcShipping').value) || 0;
    let labor = parseFloat(document.getElementById('calcLabor').value) || 0;
    let marginPct = parseFloat(document.getElementById('calcMarginPct').value) || 0;
    let commPct = parseFloat(document.getElementById('calcCommPct').value) || 0;

    let m = {};
    try {
        if(p.metafields) m = typeof p.metafields === 'string' ? JSON.parse(p.metafields) : p.metafields;
    } catch(e) {}

    // Save calculation config to metafields
    m['_calc_shipping'] = ship;
    m['_calc_labor'] = labor;
    m['_calc_margin_pct'] = marginPct;
    m['_calc_comm_pct'] = commPct;

    const payload = {
        cost_price: baseCost,
        price: finalPrice,
        metafields: JSON.stringify(m)
    };

    try {
        const { error } = await db.from('products_master').update(payload).eq('sku', sku);
        if(error) throw error;
        
        alert("Harga Jualan & Data Kalkulator berjaya disimpan!");
        document.getElementById('pricingCalcModal').style.display = 'none';
        await window.initApp(); // reload everything to update UI
    } catch(e) {
        alert("Ralat semasa menyimpan: " + e.message);
    }
};

// Start Ledger UI Logic
window.renderInventoryLedger = function() {
    const tbody = document.getElementById('inventoryLedgerTbody');
    if(!tbody) return;
    
    if(!inventoryTransactions || inventoryTransactions.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;">Tiada log direkodkan atau sedang dimuatkan...</td></tr>';
        return;
    }
    
    const recentTxns = inventoryTransactions.slice(0, 100);
    
    tbody.innerHTML = recentTxns.map(t => {
        const dateObj = new Date(t.created_at);
        const dateStr = dateObj.toLocaleDateString('ms-MY') + ' ' + dateObj.toLocaleTimeString('ms-MY', {hour: '2-digit', minute:'2-digit'});
        
        let qtyColor = t.transaction_type === 'OUT' || t.qty < 0 ? '#EF4444' : '#10B981';
        let qtyPrefix = (t.transaction_type === 'OUT' || t.qty < 0) && t.qty > 0 ? '-' : (t.qty > 0 ? '+' : '');
        let actionStr = t.transaction_type; 
        
        if(t.transaction_type === 'SALE') { actionStr = '<span style="background:#DBEAFE; color:#1E40AF; padding:2px 6px; border-radius:4px; font-weight:bold;">SALE</span>'; }
        else if(t.transaction_type === 'IN') { actionStr = '<span style="background:#D1FAE5; color:#065F46; padding:2px 6px; border-radius:4px; font-weight:bold;">INBOUND</span>'; }
        else if(t.transaction_type === 'OUT') { actionStr = '<span style="background:#FEE2E2; color:#991B1B; padding:2px 6px; border-radius:4px; font-weight:bold;">OUTBOUND</span>'; }
        else if(t.transaction_type === 'ADJUSTMENT') { actionStr = '<span style="background:#FEF3C7; color:#92400E; padding:2px 6px; border-radius:4px; font-weight:bold;">AUDIT ADJUST</span>'; }

        return `
            <tr>
                <td>${dateStr}</td>
                <td style="font-weight:bold;">${t.staff_name || 'System'}</td>
                <td>${actionStr}</td>
                <td>${t.sku}</td>
                <td style="color:${qtyColor}; font-weight:bold; font-size:14px;">${qtyPrefix}${Math.abs(t.qty)}</td>
                <td>${t.reason || '-'}</td>
            </tr>
        `;
    }).join('');
};

window.downloadLedgerCsv = function() {
    if(!inventoryTransactions || inventoryTransactions.length === 0) return alert("Tiada data untuk dieksport.");
    let csv = "Tarikh,Staf,Jenis,SKU,Kuantiti,Rujukan/Sebab\n";
    inventoryTransactions.forEach(t => {
        csv += `"${t.created_at}","${t.staff_name || 'System'}","${t.transaction_type}","${t.sku}","${t.qty}","${t.reason || ''}"\n`;
    });
    
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `Inventory_Ledger_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};
// End Ledger UI Logic

// Start Purchase Order (PO) Module Logic
window.addPoItemLine = function() {
    const sku = document.getElementById("poSkuSearch").value.trim();
    const qty = parseInt(document.getElementById("poQtyInput").value);
    const cost = parseFloat(document.getElementById("poCostInput").value);
    
    if(!sku || isNaN(qty) || qty <= 0 || isNaN(cost) || cost < 0) {
        return alert("Sila masukkan SKU, Kuantiti, dan Kos yang sah.");
    }
    
    const prod = masterProducts.find(p => p.sku === sku);
    if(!prod) {
        return alert("SKU tidak wujud di dalam sistem utama.");
    }
    
    poDraftItems.push({ sku, qty, cost, total: qty * cost });
    document.getElementById("poSkuSearch").value = "";
    document.getElementById("poQtyInput").value = "";
    document.getElementById("poCostInput").value = "";
    
    renderPoDraftTable();
};

window.renderPoDraftTable = function() {
    const tbody = document.getElementById("poDraftTbody");
    const totalCostEl = document.getElementById("poTotalCost");
    
    if(poDraftItems.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; color:#999;">Belum ada barang dimasukkan.</td></tr>';
        totalCostEl.textContent = "RM 0.00";
        return;
    }
    
    let html = "";
    let grandTotal = 0;
    
    poDraftItems.forEach((item, index) => {
        grandTotal = round2(grandTotal + item.total);
        html += `
            <tr>
                <td style="font-weight:bold;">${item.sku}</td>
                <td>${item.qty}</td>
                <td>RM ${item.cost.toFixed(2)}</td>
                <td style="font-weight:bold;">RM ${item.total.toFixed(2)}</td>
                <td><button class="btn-danger" style="padding:2px 8px; font-size:10px;" onclick="removePoDraftItem(${index})">X</button></td>
            </tr>
        `;
    });
    
    tbody.innerHTML = html;
    totalCostEl.textContent = `RM ${grandTotal.toFixed(2)}`;
};

window.removePoDraftItem = function(index) {
    poDraftItems.splice(index, 1);
    renderPoDraftTable();
};

window.submitPurchaseOrder = async function() {
    const poNo = document.getElementById("poNumber").value.trim() || `PO-${Date.now()}`;
    const supplier = document.getElementById("poSupplier").value.trim();
    const eta = document.getElementById("poEtaDate").value;
    
    if(!supplier || !eta) return alert("Sila masukkan Nama Pembekal dan Tarikh ETA.");
    if(poDraftItems.length === 0) return alert("Tiada barang dalam draf PO.");
    
    const newPO = {
        po_number: poNo,
        supplier: supplier,
        eta_date: eta,
        status: 'Pending',
        items: JSON.stringify(poDraftItems),
        created_at: new Date().toISOString()
    };
    
    try {
        let { error } = await db.from('purchase_orders').insert([newPO]);
        if(error) throw error;
    } catch(e) {
        console.log("Saving PO locally as fallback.");
        purchaseOrders.push(newPO);
        localStorage.setItem('local_purchase_orders', JSON.stringify(purchaseOrders));
    }
    
    alert(`Purchase Order ${poNo} berjaya dicipta!`);
    
    // Reset Form
    poDraftItems = [];
    document.getElementById("poNumber").value = "";
    document.getElementById("poSupplier").value = "";
    document.getElementById("poEtaDate").value = "";
    renderPoDraftTable();
    
    await window.initApp();
};

window.renderPoSection = function() {
    const tbody = document.getElementById("poListTbody");
    if(!tbody) return;
    
    if(!purchaseOrders || purchaseOrders.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;">Tiada Purchase Order dijumpai.</td></tr>';
        return;
    }
    
    const html = purchaseOrders.map(po => {
        let items = [];
        try { items = typeof po.items === 'string' ? JSON.parse(po.items) : po.items; } catch(e){}
        
        let skus = items.map(i => `${i.sku} (${i.qty})`).join(', ');
        if(skus.length > 50) skus = skus.substring(0, 50) + '...';
        
        let statusBadge = po.status === 'Completed' 
            ? '<span style="background:#D1FAE5; color:#065F46; padding:2px 6px; border-radius:4px; font-weight:bold;">Completed</span>' 
            : '<span style="background:#FEF3C7; color:#92400E; padding:2px 6px; border-radius:4px; font-weight:bold;">Pending</span>';
            
        let actionBtn = po.status === 'Pending' 
            ? `<button class="btn-success" style="font-size:10px; padding:4px 8px; margin:0;" onclick="receivePO('${po.po_number}')">Terima Stok (Receive)</button>` 
            : '-';
            
        return `
            <tr>
                <td style="font-weight:bold;">${po.po_number}</td>
                <td>${po.supplier}</td>
                <td>${po.eta_date}</td>
                <td>${statusBadge}</td>
                <td style="font-size:11px;">${skus}</td>
                <td>${actionBtn}</td>
            </tr>
        `;
    }).join('');
    
    tbody.innerHTML = html;
};

window.receivePO = async function(poNo) {
    if(!confirm(`Adakah anda pasti stok fizikal untuk ${poNo} telah tiba di gudang dan sedia untuk di-Inbound?`)) return;
    
    const po = purchaseOrders.find(p => p.po_number === poNo);
    if(!po) return;
    
    let items = [];
    try { items = typeof po.items === 'string' ? JSON.parse(po.items) : po.items; } catch(e){}
    
    try {
        for(let item of items) {
            // Add to batches
            await db.from('inventory_batches').insert([{
                sku: item.sku,
                qty_received: item.qty,
                qty_remaining: item.qty,
                inbound_date: new Date().toISOString().split('T')[0]
            }]);
            
            // Add to transactions ledger
            await db.from('inventory_transactions').insert([{
                sku: item.sku,
                transaction_type: 'IN',
                qty: item.qty,
                reason: `PO Received: ${poNo} from ${po.supplier}`,
                staff_name: currentUser ? currentUser.name : 'System',
                created_at: new Date().toISOString()
            }]);
        }
        
        // Update PO Status
        try {
            await db.from('purchase_orders').update({status: 'Completed'}).eq('po_number', poNo);
        } catch(e) {
            po.status = 'Completed';
            localStorage.setItem('local_purchase_orders', JSON.stringify(purchaseOrders));
        }
        
        alert(`Semua item dari ${poNo} berjaya di-Inbound!`);
        await window.initApp();
    } catch(e) {
        alert("Ralat semasa Inbound PO: " + e.message);
    }
};
// End PO Logic

// Start Smart Picking List Module Logic
let pickingListItems = [];

window.addPickingItem = function() {
    const sku = document.getElementById("pickingSkuSearch").value.trim().toUpperCase();
    if(!sku) return;
    
    const p = masterProducts.find(x => x.sku === sku);
    if(!p) return alert("SKU tidak wujud.");
    
    // Check if already in list
    if(pickingListItems.find(x => x.sku === sku)) {
        return alert("SKU ini sudah ada dalam senarai kutipan.");
    }
    
    const loc = p.location_bin || p.loc_level || 'ZZZZZ-NO-LOCATION'; // Items without location go to bottom
    pickingListItems.push({ sku: p.sku, name: p.name, location: loc });
    
    document.getElementById("pickingSkuSearch").value = "";
    renderPickingListUI();
};

window.generatePickingPath = function() {
    if(pickingListItems.length === 0) return alert("Sila tambah barang dahulu.");
    
    // Sort alphanumerically by location string to generate the shortest path
    pickingListItems.sort((a, b) => {
        if(a.location > b.location) return 1;
        if(a.location < b.location) return -1;
        return 0;
    });
    
    renderPickingListUI(true);
};

window.clearPickingList = function() {
    pickingListItems = [];
    renderPickingListUI();
};

window.renderPickingListUI = function(isSorted = false) {
    const container = document.getElementById("pickingListContainer");
    if(!container) return;
    
    if(pickingListItems.length === 0) {
        container.innerHTML = '<p style="color:#999; text-align:center; margin-top:20px;">Senarai item kutipan kosong.</p>';
        return;
    }
    
    let html = isSorted ? `<h3 style="color:#10B981; margin-bottom:15px; font-size:16px;">▶ Laluan Kutipan Dijana</h3>` : `<h3 style="color:#6B7280; margin-bottom:15px; font-size:14px;">Senarai Draf (Belum Disusun)</h3>`;
    
    html += '<div style="display:flex; flex-direction:column; gap:10px;">';
    
    pickingListItems.forEach((item, idx) => {
        let stepNum = isSorted ? `<div style="background:#10B981; color:white; width:24px; height:24px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-weight:bold; font-size:12px;">${idx+1}</div>` : '';
        let locBadge = item.location.includes('ZZZZZ') ? `<span style="color:#EF4444; font-weight:bold;">Tiada Lokasi Ditetapkan</span>` : `<span style="background:#E0E7FF; color:#3730A3; padding:4px 8px; border-radius:4px; font-weight:bold; font-family:monospace;">${item.location}</span>`;
        
        html += `
            <div style="background:white; border:1px solid #D1D5DB; border-radius:8px; padding:15px; display:flex; align-items:center; gap:15px; box-shadow:0 2px 4px rgba(0,0,0,0.02);">
                ${stepNum}
                <div style="flex:1;">
                    <p style="margin:0; font-weight:bold; font-size:14px;">${item.sku}</p>
                    <p style="margin:0; font-size:12px; color:#666;">${item.name}</p>
                </div>
                <div style="text-align:right;">
                    <p style="margin:0; font-size:10px; color:#888; margin-bottom:4px;">Lokasi</p>
                    ${locBadge}
                </div>
                ${!isSorted ? `<button class="btn-danger" style="padding:4px 8px; font-size:12px; margin:0;" onclick="pickingListItems.splice(${idx}, 1); renderPickingListUI();">X</button>` : ''}
            </div>
        `;
    });
    
    html += '</div>';
};

// Start Barcode Generator Logic
window.generateBarcodes = function() {
    const sku = document.getElementById("barcodeSkuInput").value.trim().toUpperCase();
    const qty = parseInt(document.getElementById("barcodeQtyInput").value) || 1;
    const printArea = document.getElementById("printLabelArea");
    
    if(!sku) return alert("Sila masukkan SKU produk.");
    if(qty < 1) return alert("Kuantiti tidak sah.");
    
    const p = masterProducts.find(x => x.sku === sku);
    const productName = p ? p.name : "Produk Am";
    const price = p && p.price ? `RM ${p.price.toFixed(2)}` : "";
    
    printArea.innerHTML = ""; // Clear area
    
    for(let i=0; i<qty; i++) {
        // Create wrapper for thermal roll standard (1 label per row)
        const wrapper = document.createElement("div");
        wrapper.className = "barcode-label-wrapper";
        wrapper.style.cssText = "padding:10px; border:1px solid #ccc; width:240px; text-align:center; background:#fff; font-family:sans-serif;";
        
        // Header (Store Name)
        const header = document.createElement("div");
        header.style.cssText = "font-weight:900; font-size:14px; margin-bottom:2px;";
        header.innerText = "10CAMP STORE";
        wrapper.appendChild(header);
        
        // Product Name (Truncated if long)
        const title = document.createElement("div");
        title.style.cssText = "font-size:10px; font-weight:bold; margin-bottom:5px; line-height:1.2; height:24px; overflow:hidden;";
        title.innerText = productName.length > 35 ? productName.substring(0, 32) + '...' : productName;
        wrapper.appendChild(title);
        
        // Barcode SVG Element
        const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        wrapper.appendChild(svg);
        
        // Price Tag
        if(price) {
            const priceTag = document.createElement("div");
            priceTag.style.cssText = "font-weight:bold; font-size:14px; margin-top:3px;";
            priceTag.innerText = price;
            wrapper.appendChild(priceTag);
        }
        
        printArea.appendChild(wrapper);
        
        // Generate Barcode Graphic
        try {
            if(typeof JsBarcode === 'undefined') {
                throw new Error("JsBarcode library belum dimuatkan.");
            }
            JsBarcode(svg, sku, {
                format: "CODE128",
                width: 1.8,
                height: 40,
                displayValue: true,
                fontSize: 12,
                margin: 5
            });
        } catch(e) {
            console.error("Barcode generation failed:", e);
            printArea.innerHTML = `<p style="color:red; text-align:center;">Ralat: Sila pastikan ada capaian internet untuk memuat turun skrip Barcode.</p>`;
            break;
        }
    }
};

window.printBarcodes = function() {
    const printArea = document.getElementById("printLabelArea");
    if(printArea.innerHTML.includes("Prebiu label") || printArea.innerHTML === "") {
        return alert("Sila jana kod bar dahulu sebelum mencetak.");
    }
    window.print();
};
// End Barcode Generator Logic

// Start Stock Valuation Logic
window.renderValuationSection = function() {
    // Sprint 2.3: prefer per-batch cost (weighted-avg) over master fallback
    let totalCostAsset = 0;
    let totalRetailAsset = 0;
    let assetsData = [];

    masterProducts.forEach(p => {
        const stockBatches = inventoryBatches.filter(b => b.sku === p.sku && b.qty_remaining > 0);
        const stockQty = stockBatches.reduce((sum, b) => sum + b.qty_remaining, 0);

        if(stockQty > 0) {
            // Compute weighted-avg cost: sum(qty × batch_cost) / total_qty
            // Fall back to master cost_price for batches without their own cost.
            const masterCost = parseFloat(p.cost_price) || 0;
            let weightedCost = 0;
            stockBatches.forEach(b => {
                const c = (b.cost_price != null) ? parseFloat(b.cost_price) : masterCost;
                weightedCost += b.qty_remaining * c;
            });
            const cost = stockQty > 0 ? weightedCost / stockQty : masterCost;
            const retail = parseFloat(p.price) || 0;

            const totalCost = weightedCost;
            const totalRetail = retail * stockQty;

            totalCostAsset = round2(totalCostAsset + totalCost);
            totalRetailAsset = round2(totalRetailAsset + totalRetail);

            assetsData.push({
                sku: p.sku, name: p.name, stock: stockQty,
                cost: cost, totalCost: totalCost
            });
        }
    });

    const projectedProfit = totalRetailAsset - totalCostAsset;

    document.getElementById("valTotalCost").innerText = `RM ${totalCostAsset.toFixed(2)}`;
    document.getElementById("valTotalRetail").innerText = `RM ${totalRetailAsset.toFixed(2)}`;
    document.getElementById("valTotalProfit").innerText = `RM ${projectedProfit.toFixed(2)}`;

    // Sort descending by totalCost to find Top 10 High Value Assets
    assetsData.sort((a, b) => b.totalCost - a.totalCost);
    const top10 = assetsData.slice(0, 10);

    const tbody = document.getElementById("valuationTableBody");
    if(!tbody) return;

    if(top10.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;">Tiada aset bernilai ditemui.</td></tr>';
        return;
    }

    let html = '';
    top10.forEach((item, index) => {
        html += `
            <tr>
                <td><b>${index + 1}</b></td>
                <td><span class="sku-badge">${item.sku}</span></td>
                <td>${item.name}</td>
                <td><span style="font-weight:bold; color:var(--primary);">${item.stock}</span></td>
                <td>RM ${item.cost.toFixed(2)}</td>
                <td><b style="color:#991B1B;">RM ${item.totalCost.toFixed(2)}</b></td>
            </tr>
        `;
    });
    tbody.innerHTML = html;
};
// End Stock Valuation Logic

// Danger Zone: Wipe Data
window.wipeAllProductsData = async function() {
    let passcode = prompt("AMARAN Keras: Ini akan memadam KESEMUA data produk dan stok secara kekal dari pangkalan data.\n\nSila taip 'PADAM' (huruf besar) untuk sahkan:");
    if(passcode !== 'PADAM') {
        alert("Operasi dibatalkan.");
        return;
    }
    
    if(!db) return alert("Pangkalan data belum disambungkan.");

    try {
        // Delete inventory batches
        await db.from('inventory_batches').delete().neq('id', 0);
        
        // Delete master products (primary key is sku)
        await db.from('products_master').delete().neq('sku', 'DUMMY_SKU_HANTU');
        
        alert("Bagus! Kesemua data produk telah berjaya dipadam bersih. Sistem akan di muat semula.");
        window.location.reload();
    } catch(e) {
        console.error(e);
        alert("Gagal memadam data. Sila semak console log atau padam secara manual di Supabase.");
    }
};

// ===================================
// BULK OPERATIONS (Sprint 1.2)
// ===================================
let bulkSelected = new Set();      // SKUs currently ticked
let bulkVisibleSkus = [];          // SKUs in current filtered render

window.bulkComputeStock = function(sku) {
    if(typeof inventoryBatches === 'undefined') return 0;
    return inventoryBatches.filter(b => b.sku === sku)
        .reduce((s, b) => s + (b.qty_remaining || 0), 0);
};

window.bulkPopulateFilters = function() {
    const brandSel = document.getElementById('bulkFilterBrand');
    const catSel = document.getElementById('bulkFilterCategory');
    if(!brandSel || !catSel) return;
    const prevB = brandSel.value, prevC = catSel.value;
    const brands = [...new Set(masterProducts.map(p => p.brand).filter(Boolean))].sort();
    const cats = [...new Set(masterProducts.map(p => p.category).filter(Boolean))].sort();
    brandSel.innerHTML = '<option value="">Semua Brand</option>' +
        brands.map(b => `<option value="${b}"${b === prevB ? ' selected' : ''}>${b}</option>`).join('');
    catSel.innerHTML = '<option value="">Semua Kategori</option>' +
        cats.map(c => `<option value="${c}"${c === prevC ? ' selected' : ''}>${c}</option>`).join('');
};

window.renderBulkOps = function() {
    const tbody = document.getElementById('bulkOpsTbody');
    if(!tbody) return;
    bulkPopulateFilters();

    const q = (document.getElementById('bulkSearchInput').value || '').trim().toLowerCase();
    const filterBrand = document.getElementById('bulkFilterBrand').value;
    const filterCat = document.getElementById('bulkFilterCategory').value;
    const filterStatus = document.getElementById('bulkFilterStatus').value;
    const pageSize = parseInt(document.getElementById('bulkPageSize').value) || 100;

    let filtered = masterProducts.filter(p => {
        if(filterBrand && p.brand !== filterBrand) return false;
        if(filterCat && p.category !== filterCat) return false;
        if(filterStatus === 'draft' && isPublished(p)) return false;
        if(filterStatus === 'published' && !isPublished(p)) return false;
        if(q) {
            const hay = `${p.sku||''} ${p.name||''} ${p.brand||''} ${p.category||''}`.toLowerCase();
            if(!hay.includes(q)) return false;
        }
        return true;
    });

    const total = filtered.length;
    filtered = filtered.slice(0, pageSize);
    bulkVisibleSkus = filtered.map(p => p.sku);

    document.getElementById('bulkSummaryLine').innerHTML =
        `Match: <strong>${total}</strong> produk · Tunjuk: <strong>${filtered.length}</strong>` +
        (total > filtered.length ? ` <span style="color:#DC2626;">(turunkan saiz halaman atau tightenkan filter untuk lihat semua)</span>` : '');

    if(filtered.length === 0) {
        tbody.innerHTML = '<tr><td colspan="10" style="text-align:center; padding:30px; color:#999;">Tiada produk match filter. Cuba tukar Status ke "Semua".</td></tr>';
        bulkUpdateActionBar();
        return;
    }

    const html = filtered.map(p => {
        const stock = bulkComputeStock(p.sku);
        const checked = bulkSelected.has(p.sku) ? 'checked' : '';
        const thumb = (p.images && p.images[0]) ? p.images[0] : 'https://placehold.co/40x40?text=?';
        const pub = isPublished(p);
        const statusBadge = pub
            ? '<span style="background:#D1FAE5; color:#065F46; padding:2px 8px; border-radius:4px; font-weight:bold; font-size:10px;">PUBLISHED</span>'
            : '<span style="background:#FEE2E2; color:#991B1B; padding:2px 8px; border-radius:4px; font-weight:bold; font-size:10px;">DRAFT</span>';
        const stockTakeBadge = (p.description || '').includes('STOK BELUM DISAHKAN')
            ? ' <span title="Stock-take pending" style="background:#FEF3C7; color:#92400E; padding:1px 5px; border-radius:3px; font-weight:bold; font-size:9px;">⚠</span>'
            : '';
        return `
            <tr>
                <td><input type="checkbox" data-sku="${p.sku}" ${checked} onchange="bulkToggleRow('${p.sku.replace(/'/g, "\\'")}', this.checked)"></td>
                <td><img src="${thumb}" style="width:40px; height:40px; object-fit:cover; border-radius:4px; background:#F3F4F6;" loading="lazy" onerror="this.src='https://placehold.co/40x40?text=?'"></td>
                <td style="font-family:monospace; font-size:11px;">${p.sku}</td>
                <td>${(p.name || '').slice(0, 90)}${stockTakeBadge}</td>
                <td>${p.brand || '-'}</td>
                <td>${p.category || '-'}</td>
                <td style="text-align:right; font-weight:bold;">RM ${(p.price || 0).toFixed(2)}</td>
                <td style="text-align:right; color:#666;">${p.cost_price != null ? 'RM ' + Number(p.cost_price).toFixed(2) : '-'}</td>
                <td style="text-align:right; ${stock <= 0 ? 'color:#DC2626;' : ''}">${stock}</td>
                <td style="text-align:center;">${statusBadge}</td>
            </tr>
        `;
    }).join('');
    tbody.innerHTML = html;
    bulkUpdateActionBar();
    if(typeof lucide !== 'undefined') lucide.createIcons();
};

window.bulkToggleRow = function(sku, checked) {
    if(checked) bulkSelected.add(sku); else bulkSelected.delete(sku);
    bulkUpdateActionBar();
};

window.bulkToggleAll = function(checkbox) {
    bulkVisibleSkus.forEach(sku => {
        if(checkbox.checked) bulkSelected.add(sku); else bulkSelected.delete(sku);
    });
    document.querySelectorAll('#bulkOpsTbody input[type="checkbox"][data-sku]').forEach(cb => {
        cb.checked = checkbox.checked;
    });
    bulkUpdateActionBar();
};

window.bulkUpdateActionBar = function() {
    const c = document.getElementById('bulkSelectedCount');
    const v = document.getElementById('bulkVisibleCount');
    if(c) c.textContent = bulkSelected.size;
    if(v) v.textContent = `· ${bulkVisibleSkus.length} terlihat`;
    const all = document.getElementById('bulkSelectAll');
    if(all && bulkVisibleSkus.length) {
        const visTicked = bulkVisibleSkus.filter(s => bulkSelected.has(s)).length;
        all.checked = visTicked === bulkVisibleSkus.length;
        all.indeterminate = visTicked > 0 && visTicked < bulkVisibleSkus.length;
    }
};

window.bulkAction = async function(action) {
    if(bulkSelected.size === 0) return showToast('Pilih sekurang-kurangnya 1 produk dulu', 'warn');
    const skus = [...bulkSelected];
    let confirmMsg, payload, descNote;
    if(action === 'publish') {
        confirmMsg = `Publish ${skus.length} produk? Mereka akan muncul dalam Cashier mode.`;
        payload = { is_published: true };
    } else if(action === 'unpublish') {
        confirmMsg = `Unpublish ${skus.length} produk? Mereka akan disorok dari Cashier mode.`;
        payload = { is_published: false };
    } else if(action === 'strip-stocktake-tag') {
        confirmMsg = `Buang tag "STOK BELUM DISAHKAN" dari ${skus.length} produk? Gunakan ini selepas stock-take fizikal selesai.`;
        descNote = 'strip';
    } else { return; }
    if(!confirm(confirmMsg)) return;

    let ok = 0, fail = 0;
    for(const sku of skus) {
        try {
            if(descNote === 'strip') {
                const p = masterProducts.find(x => x.sku === sku);
                if(!p) { fail++; continue; }
                const cleaned = (p.description || '').replace(/^\[STOK BELUM DISAHKAN[^\]]*\]\s*\n*\n*/, '').trim();
                const { error } = await db.from('products_master').update({ description: cleaned }).eq('sku', sku);
                if(error) { fail++; continue; }
                p.description = cleaned;
                ok++;
            } else {
                const { error } = await db.from('products_master').update(payload).eq('sku', sku);
                if(error) { fail++; continue; }
                const p = masterProducts.find(x => x.sku === sku);
                if(p) p.is_published = payload.is_published;
                ok++;
            }
        } catch(e) { fail++; }
    }

    try {
        await db.from('audit_logs').insert([{
            action_type: 'bulk_' + action,
            actor_name: currentUser ? currentUser.name : 'System',
            details: JSON.stringify({ sku_count: skus.length, succeeded: ok, failed: fail, sample_skus: skus.slice(0, 5) }),
            created_at: new Date().toISOString()
        }]);
    } catch(_){}

    showToast(`Bulk ${action}: ${ok} berjaya, ${fail} gagal`, fail ? 'warn' : 'success');
    bulkSelected.clear();
    renderBulkOps();
};

window.bulkOpenPriceModal = function() {
    if(bulkSelected.size === 0) return showToast('Pilih produk dulu', 'warn');
    const mode = prompt(
        `Edit harga untuk ${bulkSelected.size} produk.\n\n` +
        `Pilih cara:\n` +
        `1 = Set harga absolute (e.g. 99.00)\n` +
        `2 = Tambah % (e.g. 10 = naik 10%)\n` +
        `3 = Tolak % (e.g. 5 = turun 5%)\n\n` +
        `Taip 1, 2 atau 3:`
    );
    if(!['1', '2', '3'].includes(mode)) return;
    const valStr = prompt(mode === '1' ? 'Harga baru (RM):' : 'Peratus (%):');
    const v = parseFloat(valStr);
    if(isNaN(v) || v < 0) return showToast('Nilai tak sah', 'warn');
    bulkApplyPrice(mode, v);
};

window.bulkApplyPrice = async function(mode, val) {
    const skus = [...bulkSelected];
    if(!confirm(`Apply price change ke ${skus.length} produk?`)) return;
    let ok = 0, fail = 0;
    for(const sku of skus) {
        const p = masterProducts.find(x => x.sku === sku);
        if(!p) { fail++; continue; }
        let newPrice = p.price;
        if(mode === '1') newPrice = val;
        else if(mode === '2') newPrice = Number((p.price * (1 + val/100)).toFixed(2));
        else if(mode === '3') newPrice = Number((p.price * (1 - val/100)).toFixed(2));
        try {
            const { error } = await db.from('products_master').update({ price: newPrice }).eq('sku', sku);
            if(error) { fail++; continue; }
            p.price = newPrice;
            ok++;
        } catch(e) { fail++; }
    }
    try {
        await db.from('audit_logs').insert([{
            action_type: 'bulk_price_update',
            actor_name: currentUser ? currentUser.name : 'System',
            details: JSON.stringify({ mode, value: val, sku_count: skus.length, succeeded: ok, failed: fail }),
            created_at: new Date().toISOString()
        }]);
    } catch(_){}
    showToast(`Price update: ${ok} berjaya, ${fail} gagal`, fail ? 'warn' : 'success');
    bulkSelected.clear();
    renderBulkOps();
};

window.bulkOpenCategoryModal = function() {
    if(bulkSelected.size === 0) return showToast('Pilih produk dulu', 'warn');
    const newCat = prompt(`Reassign ${bulkSelected.size} produk ke kategori baru.\n\nKategori baru (kosongkan untuk clear):`);
    if(newCat === null) return;
    bulkApplyCategory(newCat.trim() || null);
};

window.bulkApplyCategory = async function(newCat) {
    const skus = [...bulkSelected];
    if(!confirm(`Set category = "${newCat || '(kosong)'}" untuk ${skus.length} produk?`)) return;
    let ok = 0, fail = 0;
    for(const sku of skus) {
        try {
            const { error } = await db.from('products_master').update({ category: newCat }).eq('sku', sku);
            if(error) { fail++; continue; }
            const p = masterProducts.find(x => x.sku === sku);
            if(p) p.category = newCat;
            ok++;
        } catch(e) { fail++; }
    }
    try {
        await db.from('audit_logs').insert([{
            action_type: 'bulk_category_update',
            actor_name: currentUser ? currentUser.name : 'System',
            details: JSON.stringify({ new_category: newCat, sku_count: skus.length, succeeded: ok, failed: fail }),
            created_at: new Date().toISOString()
        }]);
    } catch(_){}
    showToast(`Category update: ${ok} berjaya, ${fail} gagal`, fail ? 'warn' : 'success');
    bulkSelected.clear();
    renderBulkOps();
};

// ===================================
// MANAGER PIN APPROVAL MODAL (Sprint 1.3 + 1.4)
// ===================================
// Generic reusable modal — opens, returns Promise that resolves with
// { manager, reason, note } on success or null on cancel/wrong-PIN.
let __mgrPinResolver = null;

window.requireManagerPin = function(opts) {
    return new Promise((resolve) => {
        __mgrPinResolver = resolve;
        const overlay = document.getElementById('mgrPinOverlay');
        if(!overlay) { resolve(null); return; }

        document.getElementById('mgrPinTitle').textContent = opts.title || 'Kelulusan Manager Diperlukan';
        document.getElementById('mgrPinSubtitle').textContent = opts.subtitle || '';
        document.getElementById('mgrPinDetails').innerHTML = opts.detailsHtml || '';
        document.getElementById('mgrPinError').textContent = '';
        document.getElementById('mgrPinInput').value = '';
        document.getElementById('mgrPinNote').value = '';

        // Manager dropdown — only mgmt/superior, active only
        const inactive = JSON.parse(localStorage.getItem('staffInactive_v1') || '[]');
        const managers = (typeof authUsers !== 'undefined' ? authUsers : [])
            .filter(u => (u.role === 'mgmt' || u.role === 'superior') && !inactive.includes(u.staff_id));
        const sel = document.getElementById('mgrPinStaff');
        sel.innerHTML = managers.map(m =>
            `<option value="${m.staff_id}">${m.name} (${m.role})</option>`
        ).join('') || '<option value="">Tiada manager aktif</option>';

        // Reason dropdown
        const reasons = opts.reasons || ['Lain-lain'];
        const reasonSel = document.getElementById('mgrPinReason');
        reasonSel.innerHTML = reasons.map(r => `<option value="${r}">${r}</option>`).join('');

        // Wire submit
        const submitBtn = document.getElementById('mgrPinSubmit');
        submitBtn.onclick = window.__mgrPinSubmit;

        // Enter key on PIN
        document.getElementById('mgrPinInput').onkeyup = function(e) {
            if(e.key === 'Enter') window.__mgrPinSubmit();
        };

        overlay.style.display = 'flex';
        setTimeout(() => document.getElementById('mgrPinInput').focus(), 100);
    });
};

window.__mgrPinSubmit = async function() {
    const errEl = document.getElementById('mgrPinError');
    const staffId = document.getElementById('mgrPinStaff').value;
    const pin = (document.getElementById('mgrPinInput').value || '').trim();
    const reason = document.getElementById('mgrPinReason').value;
    const note = document.getElementById('mgrPinNote').value.trim();

    if(!staffId) { errEl.textContent = 'Sila pilih manager.'; return; }
    if(!/^\d{4,8}$/.test(pin)) { errEl.textContent = 'PIN mesti 4-8 digit.'; return; }

    const manager = authUsers.find(u => u.staff_id === staffId);
    if(!manager) { errEl.textContent = 'Manager tak dijumpai.'; return; }

    // Lockout check
    const state = JSON.parse(localStorage.getItem('pinLockout_v1') || '{}');
    const rec = state[staffId] || { attempts: 0, lockedUntil: 0 };
    if(rec.lockedUntil && rec.lockedUntil > Date.now()) {
        const mins = Math.ceil((rec.lockedUntil - Date.now()) / 60000);
        errEl.textContent = `Akaun terkunci. Cuba semula ~${mins} min.`;
        return;
    }

    const computed = await hashPin(staffId, pin);
    if(computed !== manager.pin_hash) {
        rec.attempts = (rec.attempts || 0) + 1;
        if(rec.attempts >= 5) {
            rec.lockedUntil = Date.now() + 5 * 60 * 1000;
            rec.attempts = 0;
            errEl.textContent = `Salah PIN 5 kali. Akaun dikunci 5 minit.`;
        } else {
            errEl.textContent = `PIN salah. Tinggal ${5 - rec.attempts} cubaan.`;
        }
        state[staffId] = rec;
        localStorage.setItem('pinLockout_v1', JSON.stringify(state));
        return;
    }

    // Success
    delete state[staffId];
    localStorage.setItem('pinLockout_v1', JSON.stringify(state));
    document.getElementById('mgrPinOverlay').style.display = 'none';
    if(__mgrPinResolver) {
        __mgrPinResolver({ manager, reason, note });
        __mgrPinResolver = null;
    }
};

window.mgrPinCancel = function() {
    document.getElementById('mgrPinOverlay').style.display = 'none';
    if(__mgrPinResolver) { __mgrPinResolver(null); __mgrPinResolver = null; }
};

// ===================================
// DISCREPANCY APPROVAL — REWIRED (Sprint 1.3)
// Replaces the previous direct-approve flow with PIN gate + audit log + reason capture.
// ===================================
const DISCREPANCY_REASONS = [
    'Hilang (suspect theft)',
    'Rosak / Pecah masa storan',
    'Salah kira sebelumnya',
    'Salah masuk sistem (data entry)',
    'Stok belum direkod (newly arrived)',
    'Sample / Display unit',
    'Lain-lain'
];

// Override the old approveDiscrepancy with PIN-gated version
const __originalApproveDiscrepancy = window.approveDiscrepancy;
window.approveDiscrepancy = async function(reqId, sku, difference) {
    const detailsHtml = `
        <strong>SKU:</strong> ${sku}<br>
        <strong>Variance:</strong> ${difference > 0 ? '+' + difference : difference} unit
        ${difference > 0 ? ' <em>(stok berlebihan)</em>' : ' <em>(stok kurang)</em>'}
    `;
    const result = await requireManagerPin({
        title: 'Lulus Pelarasan Stok',
        subtitle: 'Manager kena sahkan & rekod sebab perbezaan ini.',
        detailsHtml,
        reasons: DISCREPANCY_REASONS
    });
    if(!result) return;

    // Pre-flight: confirm enough stock for shortage
    if(difference < 0) {
        const totalStock = (typeof inventoryBatches !== 'undefined' ? inventoryBatches : [])
            .filter(b => b.sku === sku && b.qty_remaining > 0)
            .reduce((s, b) => s + b.qty_remaining, 0);
        if(totalStock < Math.abs(difference)) {
            return showToast(`Tak boleh tolak ${Math.abs(difference)} unit — sistem cuma ada ${totalStock}.`, 'warn');
        }
    }

    try {
        if(difference > 0) {
            await db.from('inventory_batches').insert([{
                sku, qty_received: difference, qty_remaining: difference,
                inbound_date: new Date().toISOString().split('T')[0]
            }]);
        } else {
            let qtyToDeduct = Math.abs(difference);
            const batches = (typeof inventoryBatches !== 'undefined' ? inventoryBatches : [])
                .filter(b => b.sku === sku && b.qty_remaining > 0)
                .sort((a, b) => new Date(a.inbound_date) - new Date(b.inbound_date));
            for(const batch of batches) {
                if(qtyToDeduct <= 0) break;
                const deduct = Math.min(batch.qty_remaining, qtyToDeduct);
                const { error } = await db.from('inventory_batches')
                    .update({ qty_remaining: batch.qty_remaining - deduct })
                    .eq('id', batch.id);
                if(error) throw error;
                qtyToDeduct -= deduct;
            }
        }

        await db.from('pending_requests').update({
            status: 'Approved',
            metadata: { approved_by: result.manager.name, reason: result.reason, note: result.note }
        }).eq('id', reqId);

        await db.from('inventory_transactions').insert([{
            sku, transaction_type: 'ADJUSTMENT', qty: difference,
            reason: `Discrepancy: ${result.reason}${result.note ? ' — ' + result.note : ''}`,
            staff_name: currentUser ? currentUser.name : 'System',
            created_at: new Date().toISOString()
        }]);

        await db.from('audit_logs').insert([{
            action_type: 'discrepancy_approved',
            actor_name: result.manager.name,
            target_staff: currentUser ? currentUser.name : null,
            details: JSON.stringify({
                sku, difference, reason: result.reason,
                note: result.note, request_id: reqId
            }),
            created_at: new Date().toISOString()
        }]);

        showToast(`Discrepancy ${sku} diluluskan oleh ${result.manager.name}`, 'success');
        await window.initApp();
    } catch(e) {
        showToast(`Ralat: ${e.message}`, 'error');
    }
};

// ===================================
// SPRINT 2.2 — SUPPLIERS CRUD
// ===================================
let suppliersList = [];
let purchaseOrdersV2 = [];   // new DB-backed PO list
let purchaseOrderItemsV2 = [];

window.loadSuppliers = async function() {
    try {
        const { data, error } = await db.from('suppliers').select('*').order('name');
        if(error) throw error;
        suppliersList = data || [];
    } catch(e) {
        console.error('loadSuppliers:', e);
        suppliersList = [];
    }
    renderSupplierList();
    refreshSupplierDropdowns();
};

window.renderSupplierList = function() {
    const tbody = document.getElementById('supplierListTbody');
    if(!tbody) return;
    if(!suppliersList.length) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; color:#999;">Tiada pembekal lagi. Klik "+ Tambah" untuk daftar.</td></tr>';
        return;
    }
    tbody.innerHTML = suppliersList.map(s => `
        <tr>
            <td><a href="#" onclick="event.preventDefault(); window.openSupplierModal(${s.id})" style="color:var(--primary); font-weight:bold; text-decoration:none;">${s.name}</a><br><span style="color:#888; font-size:10px;">${s.contact_person || ''}</span></td>
            <td>${s.country || '-'}</td>
            <td>${s.lead_time_days ? s.lead_time_days + 'd' : '-'}</td>
            <td>${s.is_active ? '<span style="color:#10B981; font-weight:bold;">Aktif</span>' : '<span style="color:#9CA3AF;">Tak Aktif</span>'}</td>
            <td><button class="btn-danger" style="font-size:10px; padding:2px 6px; margin:0;" onclick="window.toggleSupplierActive(${s.id}, ${!s.is_active})">${s.is_active ? 'Disable' : 'Enable'}</button></td>
        </tr>
    `).join('');
};

window.openSupplierModal = function(id) {
    document.getElementById('supplierEditId').value = id || '';
    const titleEl = document.getElementById('supplierModalTitle');
    if(id) {
        const s = suppliersList.find(x => x.id === id);
        if(!s) return;
        titleEl.textContent = `Edit Pembekal: ${s.name}`;
        document.getElementById('supplierName').value = s.name || '';
        document.getElementById('supplierCountry').value = s.country || '';
        document.getElementById('supplierContact').value = s.contact_person || '';
        document.getElementById('supplierPhone').value = s.phone || '';
        document.getElementById('supplierEmail').value = s.email || '';
        document.getElementById('supplierCurrency').value = s.currency || 'RM';
        document.getElementById('supplierLeadTime').value = s.lead_time_days || '';
        document.getElementById('supplierPayTerms').value = s.payment_terms || '';
        document.getElementById('supplierNotes').value = s.notes || '';
        document.getElementById('supplierActive').checked = s.is_active !== false;
    } else {
        titleEl.textContent = 'Pembekal Baru';
        ['supplierName','supplierCountry','supplierContact','supplierPhone','supplierEmail',
         'supplierLeadTime','supplierPayTerms','supplierNotes'].forEach(i => document.getElementById(i).value = '');
        document.getElementById('supplierCurrency').value = 'RM';
        document.getElementById('supplierActive').checked = true;
    }
    document.getElementById('supplierModal').style.display = 'flex';
};

window.saveSupplier = async function() {
    const id = document.getElementById('supplierEditId').value;
    const name = document.getElementById('supplierName').value.trim();
    if(!name) return showToast('Nama pembekal wajib.', 'warn');

    const payload = {
        name,
        country: document.getElementById('supplierCountry').value.trim() || null,
        contact_person: document.getElementById('supplierContact').value.trim() || null,
        phone: document.getElementById('supplierPhone').value.trim() || null,
        email: document.getElementById('supplierEmail').value.trim() || null,
        currency: document.getElementById('supplierCurrency').value,
        lead_time_days: parseInt(document.getElementById('supplierLeadTime').value) || null,
        payment_terms: document.getElementById('supplierPayTerms').value.trim() || null,
        notes: document.getElementById('supplierNotes').value.trim() || null,
        is_active: document.getElementById('supplierActive').checked
    };

    try {
        if(id) {
            const { error } = await db.from('suppliers').update(payload).eq('id', parseInt(id));
            if(error) throw error;
        } else {
            const { error } = await db.from('suppliers').insert([payload]);
            if(error) throw error;
        }
        showToast(id ? 'Pembekal dikemaskini' : 'Pembekal ditambah', 'success');
        document.getElementById('supplierModal').style.display = 'none';
        await loadSuppliers();
    } catch(e) {
        showToast('Ralat: ' + e.message, 'error');
    }
};

window.toggleSupplierActive = async function(id, newState) {
    try {
        const { error } = await db.from('suppliers').update({ is_active: newState }).eq('id', id);
        if(error) throw error;
        await loadSuppliers();
    } catch(e) {
        showToast('Ralat: ' + e.message, 'error');
    }
};

window.refreshSupplierDropdowns = function() {
    // PO supplier dropdown — replace input with list-backed select if exists
    const datalist = document.getElementById('supplierDatalist') || (() => {
        const dl = document.createElement('datalist');
        dl.id = 'supplierDatalist';
        document.body.appendChild(dl);
        return dl;
    })();
    datalist.innerHTML = suppliersList.filter(s => s.is_active)
        .map(s => `<option value="${s.name}" data-id="${s.id}">${s.country || ''}</option>`).join('');
    const poSupplierInput = document.getElementById('poSupplier');
    if(poSupplierInput && !poSupplierInput.getAttribute('list')) {
        poSupplierInput.setAttribute('list', 'supplierDatalist');
    }
};

// ===================================
// SPRINT 2.1 — PO V2 (DB-BACKED)
// ===================================
window.loadPosV2 = async function() {
    try {
        const [poRes, itemRes] = await Promise.all([
            db.from('purchase_orders').select('*').order('created_at', { ascending: false }),
            db.from('purchase_order_items').select('*')
        ]);
        purchaseOrdersV2 = poRes.data || [];
        purchaseOrderItemsV2 = itemRes.data || [];
    } catch(e) {
        console.error('loadPosV2:', e);
        purchaseOrdersV2 = []; purchaseOrderItemsV2 = [];
    }
    if(typeof renderPoSection === 'function') renderPoSection();
};

// Override submitPurchaseOrder to use DB tables
window.submitPurchaseOrder = async function() {
    const poNo = (document.getElementById('poNumber').value || '').trim() || `PO-${Date.now()}`;
    const supplierName = (document.getElementById('poSupplier').value || '').trim();
    const eta = document.getElementById('poEtaDate').value;

    if(!supplierName || !eta) return showToast('Nama Pembekal + ETA wajib.', 'warn');
    if(!poDraftItems || poDraftItems.length === 0) return showToast('Tiada barang dalam draf PO.', 'warn');

    // Resolve supplier_id (create on-fly if not in DB)
    let supplier = suppliersList.find(s => s.name === supplierName);
    if(!supplier) {
        const created = await db.from('suppliers').insert([{ name: supplierName, is_active: true }]).select();
        if(created.data && created.data.length) {
            supplier = created.data[0];
            suppliersList.push(supplier);
        }
    }

    const subtotal = poDraftItems.reduce((s, i) => s + (i.qty * (i.cost || 0)), 0);

    try {
        const { data: poRow, error: poErr } = await db.from('purchase_orders').insert([{
            po_number: poNo,
            supplier_id: supplier ? supplier.id : null,
            supplier_name: supplierName,
            eta_date: eta,
            status: 'Pending',
            currency: supplier ? supplier.currency : 'RM',
            subtotal_rm: subtotal, total_rm: subtotal,
            created_by: currentUser ? currentUser.name : 'System'
        }]).select();
        if(poErr) throw poErr;
        const newPo = poRow[0];

        const itemRows = poDraftItems.map(i => ({
            po_id: newPo.id,
            po_number: poNo,
            sku: i.sku,
            qty_ordered: i.qty,
            qty_received: 0,
            unit_cost_rm: i.cost || 0,
            line_total_rm: i.qty * (i.cost || 0)
        }));
        const { error: itemErr } = await db.from('purchase_order_items').insert(itemRows);
        if(itemErr) throw itemErr;

        showToast(`PO ${poNo} dicipta · RM ${subtotal.toFixed(2)}`, 'success');
        poDraftItems = [];
        ['poNumber','poSupplier','poEtaDate'].forEach(id => { const el = document.getElementById(id); if(el) el.value = ''; });
        if(typeof renderPoDraftTable === 'function') renderPoDraftTable();
        await loadPosV2();
    } catch(e) {
        showToast('Ralat cipta PO: ' + e.message, 'error');
    }
};

// Override renderPoSection to read from V2 tables
window.renderPoSection = function() {
    const tbody = document.getElementById('poListTbody');
    if(!tbody) return;
    if(!purchaseOrdersV2 || !purchaseOrdersV2.length) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; color:#999;">Tiada Purchase Order. Cipta PO baru di atas.</td></tr>';
        return;
    }
    tbody.innerHTML = purchaseOrdersV2.map(po => {
        const items = purchaseOrderItemsV2.filter(i => i.po_id === po.id);
        const skus = items.map(i => `${i.sku} (${i.qty_received}/${i.qty_ordered})`).join(', ').slice(0, 60);
        const statusColor = {
            'Draft':     { bg:'#F3F4F6', fg:'#374151' },
            'Pending':   { bg:'#FEF3C7', fg:'#92400E' },
            'Partial':   { bg:'#DBEAFE', fg:'#1E40AF' },
            'Completed': { bg:'#D1FAE5', fg:'#065F46' },
            'Cancelled': { bg:'#FEE2E2', fg:'#991B1B' }
        }[po.status] || { bg:'#F3F4F6', fg:'#374151' };
        const action = (po.status === 'Pending' || po.status === 'Partial')
            ? `<button class="btn-success" style="font-size:10px; padding:4px 8px; margin:0;" onclick="window.openReceivePOModal(${po.id})">Terima Stok</button>`
            : '-';
        return `
            <tr>
                <td style="font-weight:bold; font-family:monospace;">${po.po_number}</td>
                <td>${po.supplier_name || '-'}</td>
                <td>${po.eta_date || '-'}</td>
                <td><span style="background:${statusColor.bg}; color:${statusColor.fg}; padding:2px 8px; border-radius:4px; font-weight:bold; font-size:10px;">${po.status}</span></td>
                <td style="font-size:11px;">${skus}${items.length > 3 ? '...' : ''}</td>
                <td>${action}</td>
            </tr>
        `;
    }).join('');
};

window.openReceivePOModal = async function(poId) {
    const po = purchaseOrdersV2.find(p => p.id === poId);
    if(!po) return;
    const items = purchaseOrderItemsV2.filter(i => i.po_id === poId);

    // Build per-line rows
    const linesHtml = items.map((it, idx) => {
        const remaining = it.qty_ordered - it.qty_received;
        const prod = masterProducts.find(p => p.sku === it.sku);
        const barcode = prod?.erp_barcode || '';
        return `
            <tr id="grnRow_${idx}" data-sku="${it.sku}" data-barcode="${barcode}">
                <td><strong>${it.sku}</strong>${barcode ? '<br><span style="font-size:10px; color:#9CA3AF;">📊 ' + barcode + '</span>' : ''}<br><span style="font-size:10px; color:#666;">${(prod?.name || '').slice(0,40)}</span></td>
                <td style="text-align:center;">${it.qty_ordered}</td>
                <td style="text-align:center;">${it.qty_received}</td>
                <td><input type="number" id="grnQty_${idx}" data-itemid="${it.id}" data-sku="${it.sku}" min="0" max="${remaining}" value="${remaining}" class="login-input" style="margin:0; padding:4px; width:70px; text-align:center;"></td>
                <td><input type="number" id="grnCost_${idx}" min="0" step="0.01" value="${it.unit_cost_rm}" class="login-input" style="margin:0; padding:4px; width:80px;"></td>
            </tr>
        `;
    }).join('');

    const modalHtml = `
        <div id="grnOverlay" class="login-overlay" style="display:flex; z-index:3700; align-items:center; justify-content:center;">
            <div class="login-box" style="max-width:820px; width:96%; padding:24px;">
                <button onclick="document.getElementById('grnOverlay').remove()" style="float:right; border:none; background:none; font-size:24px; cursor:pointer; color:var(--text-muted);">×</button>
                <h2 style="font-weight:800; font-size:20px; margin-bottom:6px;">📦 Goods Received Note (GRN)</h2>
                <p style="font-size:12px; color:#666; margin-bottom:14px;">PO <strong>${po.po_number}</strong> · Pembekal: <strong>${po.supplier_name}</strong> · ETA: ${po.eta_date || '-'}</p>

                <!-- Scanner input -->
                <div style="background:#EFF6FF; border:2px dashed #60A5FA; padding:10px; border-radius:6px; margin-bottom:12px;">
                    <label class="small-lbl" style="color:#1E40AF; font-weight:bold;">📱 Scan Barcode untuk auto-tick qty (atau taip SKU + Enter)</label>
                    <input type="text" id="grnScannerInput" class="login-input" placeholder="Beep!" style="text-align:center; font-weight:bold; letter-spacing:1px; margin:6px 0 0;" onkeyup="window.handleGrnScan(event)" autofocus>
                    <p id="grnScanFeedback" style="font-size:11px; color:#666; margin-top:4px; min-height:14px;"></p>
                </div>

                <div class="table-responsive" style="max-height:300px; border:1px solid var(--border-color);">
                    <table class="data-table" style="font-size:12px;">
                        <thead style="position:sticky; top:0; background:#FAFAFA;"><tr><th>SKU / Barcode / Nama</th><th>Ordered</th><th>Sebelum</th><th>Terima Sekarang</th><th>Kos/Unit (RM)</th></tr></thead>
                        <tbody>${linesHtml}</tbody>
                    </table>
                </div>

                <label class="small-lbl" style="margin-top:12px;">Catatan (kondisi barang, kerosakan, dsb)</label>
                <textarea id="grnNotes" class="login-input" rows="2" placeholder="3 box ada kemek di sudut, foto disertakan via WhatsApp..."></textarea>

                <div style="display:flex; gap:8px; margin-top:14px;">
                    <button onclick="document.getElementById('grnOverlay').remove()" class="login-btn" style="background:#6B7280; flex:1;">Tutup</button>
                    <button onclick="window.printGrn(${poId})" class="login-btn" style="background:#0EA5E9; flex:1;">🖨️ Print GRN Slip</button>
                    <button onclick="window.confirmReceivePO(${poId})" class="login-btn" style="flex:2;">✓ Sahkan Penerimaan</button>
                </div>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    setTimeout(() => document.getElementById('grnScannerInput')?.focus(), 200);
};

// Scanner handler — match by SKU OR barcode, increment that line's "terima" qty
window.handleGrnScan = function(e) {
    if(e.key !== 'Enter') return;
    const input = e.target;
    const code = input.value.trim().toUpperCase();
    const fb = document.getElementById('grnScanFeedback');
    if(!code) return;
    let found = false;
    document.querySelectorAll('#grnOverlay tr[data-sku]').forEach((row, idx) => {
        const sku = (row.dataset.sku || '').toUpperCase();
        const bc = (row.dataset.barcode || '').toUpperCase();
        if(sku === code || (bc && bc === code)) {
            const qtyInput = row.querySelector('input[id^="grnQty_"]');
            if(qtyInput) {
                const cur = parseInt(qtyInput.value) || 0;
                const max = parseInt(qtyInput.max) || 9999;
                qtyInput.value = Math.min(cur + 1, max);
                row.style.background = '#D1FAE5';
                setTimeout(() => row.style.background = '', 600);
                fb.innerHTML = `✓ <strong style="color:#065F46;">${sku}</strong> +1 → ${qtyInput.value}`;
                found = true;
            }
        }
    });
    if(!found) fb.innerHTML = `⚠️ <span style="color:#DC2626;">"${code}" tiada dalam PO ini</span>`;
    input.value = '';
};

// Printable GRN — opens new window with formatted slip
window.printGrn = function(poId) {
    const po = purchaseOrdersV2.find(p => p.id === poId);
    if(!po) return;
    const items = purchaseOrderItemsV2.filter(i => i.po_id === poId);

    // Read current form state for "received now" qty + cost
    const lines = items.map((it, idx) => {
        const qty = parseInt(document.getElementById(`grnQty_${idx}`)?.value) || 0;
        const cost = parseFloat(document.getElementById(`grnCost_${idx}`)?.value) || 0;
        const prod = masterProducts.find(p => p.sku === it.sku);
        return { sku: it.sku, name: prod?.name || '', ordered: it.qty_ordered, prevReceived: it.qty_received, qty, cost };
    });
    const total = lines.reduce((s, l) => s + l.qty * l.cost, 0);
    const notes = (document.getElementById('grnNotes')?.value || '').trim();

    const settings = JSON.parse(localStorage.getItem('complianceSettings_v1') || '{}').shop || {};
    const shopName = settings.name || '10 CAMP STORE';
    const shopAddr = settings.address || '';
    const ssm = settings.ssm || '';
    const today = new Date().toLocaleDateString('en-MY', { day: '2-digit', month: 'short', year: 'numeric' });

    const win = window.open('', '_blank', 'width=800,height=900');
    win.document.write(`<!DOCTYPE html><html><head><title>GRN ${po.po_number}</title>
        <style>
            body { font-family: 'Helvetica Neue', Arial, sans-serif; max-width:780px; margin:auto; padding:30px; color:#111; }
            h1 { font-size:22px; margin:0 0 4px; }
            .header { border-bottom:3px solid #111; padding-bottom:10px; margin-bottom:20px; }
            .meta { display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-bottom:20px; }
            .meta div { font-size:13px; }
            table { width:100%; border-collapse:collapse; font-size:12px; margin-bottom:20px; }
            th, td { border:1px solid #999; padding:6px 8px; text-align:left; }
            th { background:#f3f4f6; }
            .right { text-align:right; }
            .center { text-align:center; }
            .total-row { font-weight:bold; background:#fef3c7; }
            .signoff { display:grid; grid-template-columns:1fr 1fr; gap:40px; margin-top:50px; }
            .signoff div { border-top:1px solid #111; padding-top:6px; font-size:11px; }
            .notes { background:#fff7ed; border:1px solid #fed7aa; padding:10px; border-radius:4px; margin-bottom:20px; font-size:12px; }
            @media print { @page { margin:1.5cm; } button { display:none; } }
        </style>
    </head><body>
        <div class="header">
            <h1>${shopName}</h1>
            <p style="margin:0; font-size:11px; color:#666;">${shopAddr}${ssm ? ' · SSM: ' + ssm : ''}</p>
            <h2 style="font-size:18px; margin:12px 0 0; color:#0EA5E9;">📦 GOODS RECEIVED NOTE (GRN)</h2>
        </div>
        <div class="meta">
            <div><strong>GRN #:</strong> GRN-${po.po_number}-${Date.now().toString(36).slice(-4).toUpperCase()}</div>
            <div><strong>Tarikh:</strong> ${today}</div>
            <div><strong>PO No.:</strong> ${po.po_number}</div>
            <div><strong>Pembekal:</strong> ${po.supplier_name || '-'}</div>
            <div><strong>ETA:</strong> ${po.eta_date || '-'}</div>
            <div><strong>Penerima:</strong> ${currentUser ? currentUser.name : '___________'}</div>
        </div>
        <table>
            <thead><tr><th>#</th><th>SKU</th><th>Nama Produk</th><th class="center">Ordered</th><th class="center">Diterima Kini</th><th class="right">Kos/Unit (RM)</th><th class="right">Total (RM)</th></tr></thead>
            <tbody>
                ${lines.map((l, i) => `
                    <tr>
                        <td>${i + 1}</td>
                        <td><strong>${l.sku}</strong></td>
                        <td>${(l.name || '').slice(0, 60)}</td>
                        <td class="center">${l.ordered}</td>
                        <td class="center"><strong>${l.qty}</strong></td>
                        <td class="right">${l.cost.toFixed(2)}</td>
                        <td class="right">${(l.qty * l.cost).toFixed(2)}</td>
                    </tr>
                `).join('')}
                <tr class="total-row">
                    <td colspan="6" class="right">TOTAL DITERIMA (RM):</td>
                    <td class="right">${total.toFixed(2)}</td>
                </tr>
            </tbody>
        </table>
        ${notes ? `<div class="notes"><strong>Catatan:</strong> ${notes}</div>` : ''}
        <div class="signoff">
            <div><strong>Penerima (Receiver)</strong><br><br>Nama: ___________________________<br>Tandatangan: ________________________<br>Tarikh: ${today}</div>
            <div><strong>Lulus Manager (Approver)</strong><br><br>Nama: ___________________________<br>Tandatangan: ________________________<br>Tarikh: ___________</div>
        </div>
        <p style="margin-top:30px; font-size:10px; color:#999; text-align:center;">Auto-generated by 10 CAMP POS · GRN-${po.po_number}-${Date.now().toString(36).toUpperCase()}</p>
        <button onclick="window.print()" style="position:fixed; top:20px; right:20px; padding:10px 20px; background:#0EA5E9; color:white; border:none; border-radius:6px; font-weight:bold; cursor:pointer;">🖨️ Print</button>
    </body></html>`);
    win.document.close();
};

window.confirmReceivePO = async function(poId) {
    const po = purchaseOrdersV2.find(p => p.id === poId);
    if(!po) return;
    const items = purchaseOrderItemsV2.filter(i => i.po_id === poId);
    const notes = document.getElementById('grnNotes').value.trim();

    // Read each line's qty + cost
    const receipts = [];
    items.forEach((it, idx) => {
        const qtyEl = document.getElementById(`grnQty_${idx}`);
        const costEl = document.getElementById(`grnCost_${idx}`);
        const qty = parseInt(qtyEl.value) || 0;
        const cost = parseFloat(costEl.value) || 0;
        if(qty > 0) receipts.push({ item: it, qty, cost });
    });

    if(receipts.length === 0) return showToast('Tiada qty diterima.', 'warn');

    if(!confirm(`Sahkan penerimaan ${receipts.length} item untuk ${po.po_number}?`)) return;

    try {
        const inboundDate = new Date().toISOString().split('T')[0];
        // Insert one batch per received line — with cost + PO link
        const batchRows = receipts.map(r => ({
            sku: r.item.sku,
            qty_received: r.qty,
            qty_remaining: r.qty,
            inbound_date: inboundDate,
            cost_price: r.cost,
            landed_cost: r.cost,    // for now equal; freight/tax can be added later
            po_number: po.po_number,
            supplier_name: po.supplier_name,
            notes: notes || null
        }));
        const { error: bErr } = await db.from('inventory_batches').insert(batchRows);
        if(bErr) throw bErr;

        // Update PO line qty_received
        for(const r of receipts) {
            const newQtyReceived = r.item.qty_received + r.qty;
            await db.from('purchase_order_items').update({ qty_received: newQtyReceived }).eq('id', r.item.id);
        }

        // Update PO status
        const updatedItems = purchaseOrderItemsV2.filter(i => i.po_id === poId).map(it => {
            const r = receipts.find(x => x.item.id === it.id);
            return r ? { ...it, qty_received: it.qty_received + r.qty } : it;
        });
        const allComplete = updatedItems.every(i => i.qty_received >= i.qty_ordered);
        const someReceived = updatedItems.some(i => i.qty_received > 0);
        const newStatus = allComplete ? 'Completed' : (someReceived ? 'Partial' : 'Pending');

        await db.from('purchase_orders').update({
            status: newStatus,
            received_date: allComplete ? inboundDate : po.received_date,
            received_by: currentUser ? currentUser.name : 'System'
        }).eq('id', poId);

        // Inventory transactions log
        await db.from('inventory_transactions').insert(receipts.map(r => ({
            sku: r.item.sku,
            transaction_type: 'IN',
            qty: r.qty,
            reason: `PO ${po.po_number} received from ${po.supplier_name}${notes ? ' — ' + notes : ''}`,
            staff_name: currentUser ? currentUser.name : 'System',
            created_at: new Date().toISOString()
        })));

        // Audit log
        await db.from('audit_logs').insert([{
            action_type: 'po_received',
            actor_name: currentUser ? currentUser.name : 'System',
            details: JSON.stringify({
                po_number: po.po_number, supplier: po.supplier_name,
                items_count: receipts.length,
                total_qty: receipts.reduce((s, r) => s + r.qty, 0),
                new_status: newStatus, notes
            }),
            created_at: new Date().toISOString()
        }]);

        document.getElementById('grnOverlay').remove();
        showToast(`PO ${po.po_number} → ${newStatus}`, 'success');
        await loadPosV2();
        await window.initApp();
    } catch(e) {
        showToast('Ralat: ' + e.message, 'error');
    }
};

// ===================================
// SPRINT 2.4 — BIN LOCATION BULK IMPORT
// ===================================
let __binImportRows = [];  // parsed + validated rows ready to commit

window.bulkImportBinPreview = function() {
    const txt = (document.getElementById('binImportTextarea').value || '').trim();
    const preview = document.getElementById('binImportPreview');
    const confirmBtn = document.getElementById('binImportConfirmBtn');
    if(!txt) { preview.innerHTML = ''; confirmBtn.disabled = true; return; }

    const lines = txt.split('\n').map(l => l.trim()).filter(Boolean);
    const parsed = [];
    const errors = [];
    lines.forEach((line, idx) => {
        const parts = line.split(',').map(s => s.trim());
        if(parts.length < 2) {
            errors.push(`Baris ${idx + 1}: format salah ("${line}")`);
            return;
        }
        const sku = parts[0].toUpperCase();
        const loc = parts.slice(1).join(',').trim();
        const prod = masterProducts.find(p => p.sku === sku);
        if(!prod) {
            errors.push(`Baris ${idx + 1}: SKU "${sku}" tak wujud`);
            return;
        }
        parsed.push({ sku, name: prod.name, oldLoc: prod.location_bin || '-', newLoc: loc });
    });

    __binImportRows = parsed;

    let html = `<div style="background:#EFF6FF; border:1px solid #BFDBFE; padding:10px; border-radius:6px; margin-bottom:8px;">
        ✓ <strong>${parsed.length}</strong> baris valid · ✗ <strong>${errors.length}</strong> baris error
    </div>`;
    if(parsed.length > 0) {
        html += `<div style="max-height:240px; overflow-y:auto; border:1px solid var(--border-color); border-radius:6px;">
            <table class="data-table" style="font-size:11px;">
                <thead style="background:#FAFAFA; position:sticky; top:0;"><tr><th>SKU</th><th>Nama</th><th>Sebelum</th><th>Selepas</th></tr></thead>
                <tbody>${parsed.slice(0, 100).map(r => `
                    <tr><td><strong>${r.sku}</strong></td><td>${r.name.slice(0,50)}</td><td style="color:#999;">${r.oldLoc}</td><td style="color:#10B981; font-weight:bold;">${r.newLoc}</td></tr>
                `).join('')}</tbody>
            </table>
        </div>`;
        if(parsed.length > 100) html += `<p style="font-size:11px; color:#666; margin-top:6px;">+ ${parsed.length - 100} baris lagi (akan diimport semua)</p>`;
    }
    if(errors.length > 0) {
        html += `<details style="margin-top:8px;"><summary style="cursor:pointer; color:#DC2626;">Lihat ${errors.length} error</summary>
            <ul style="font-size:11px; color:#991B1B; margin-top:6px;">${errors.slice(0, 50).map(e => `<li>${e}</li>`).join('')}</ul>
        </details>`;
    }
    preview.innerHTML = html;
    confirmBtn.disabled = parsed.length === 0;
};

window.bulkImportBinConfirm = async function() {
    if(__binImportRows.length === 0) return;
    if(!confirm(`Update lokasi bin untuk ${__binImportRows.length} produk?`)) return;

    let ok = 0, fail = 0;
    for(const row of __binImportRows) {
        try {
            const { error } = await db.from('products_master').update({ location_bin: row.newLoc }).eq('sku', row.sku);
            if(error) { fail++; continue; }
            const p = masterProducts.find(x => x.sku === row.sku);
            if(p) p.location_bin = row.newLoc;
            ok++;
        } catch(e) { fail++; }
    }

    try {
        await db.from('audit_logs').insert([{
            action_type: 'bulk_bin_import',
            actor_name: currentUser ? currentUser.name : 'System',
            details: JSON.stringify({ count: __binImportRows.length, succeeded: ok, failed: fail }),
            created_at: new Date().toISOString()
        }]);
    } catch(_){}

    showToast(`Bin import: ${ok} berjaya, ${fail} gagal`, fail ? 'warn' : 'success');
    __binImportRows = [];
    document.getElementById('binImportTextarea').value = '';
    document.getElementById('binImportPreview').innerHTML = '';
    document.getElementById('binImportConfirmBtn').disabled = true;
};

// ===================================
// SPRINT 3.4 — STOCK RESERVATION
// ===================================
let stockReservations = [];

window.loadReservations = async function() {
    try {
        const { data } = await db.from('stock_reservations').select('*').is('released_at', null);
        stockReservations = data || [];
    } catch(e) { stockReservations = []; }
};

window.getAvailableQty = function(sku) {
    // Total physical stock minus active reservations
    const stock = (inventoryBatches || [])
        .filter(b => b.sku === sku && b.qty_remaining > 0)
        .reduce((s, b) => s + b.qty_remaining, 0);
    const reserved = stockReservations
        .filter(r => r.sku === sku && !r.released_at)
        .reduce((s, r) => s + (r.qty || 0), 0);
    return Math.max(0, stock - reserved);
};

window.reserveStock = async function(sku, qty, sourceType, sourceRef, notes) {
    const avail = getAvailableQty(sku);
    if(avail < qty) return { ok: false, error: `Hanya ${avail} unit available untuk reserve.` };
    try {
        const { data, error } = await db.from('stock_reservations').insert([{
            sku, qty, source_type: sourceType || 'manual',
            source_ref: sourceRef || null,
            reserved_by: currentUser ? currentUser.name : 'System',
            expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),  // 7 days default
            notes: notes || null
        }]).select();
        if(error) throw error;
        if(data?.length) stockReservations.push(data[0]);
        return { ok: true, reservation: data[0] };
    } catch(e) {
        return { ok: false, error: e.message };
    }
};

window.releaseReservation = async function(reservationId) {
    try {
        const { error } = await db.from('stock_reservations')
            .update({ released_at: new Date().toISOString() })
            .eq('id', reservationId);
        if(error) throw error;
        stockReservations = stockReservations.filter(r => r.id !== reservationId);
        return { ok: true };
    } catch(e) {
        return { ok: false, error: e.message };
    }
};

// ===================================
// SPRINT 3.5 + 3.6 — AGING REPORT + MONTHLY SNAPSHOT
// ===================================
window.renderInventoryAging = function() {
    const tbody = document.getElementById('agingTbody');
    const summaryEl = document.getElementById('agingSummary');
    if(!tbody) return;

    const now = Date.now();
    const buckets = {
        '0-30':   { label: '0–30 hari (fresh)',     min: 0,    max: 30,  qty: 0, cost: 0, retail: 0, items: [] },
        '31-90':  { label: '31–90 hari',            min: 31,   max: 90,  qty: 0, cost: 0, retail: 0, items: [] },
        '91-180': { label: '91–180 hari',           min: 91,   max: 180, qty: 0, cost: 0, retail: 0, items: [] },
        '181-365':{ label: '181–365 hari',          min: 181,  max: 365, qty: 0, cost: 0, retail: 0, items: [] },
        '>365':   { label: '> 365 hari (dead?)',    min: 366,  max: 99999, qty: 0, cost: 0, retail: 0, items: [] }
    };

    inventoryBatches.filter(b => b.qty_remaining > 0).forEach(b => {
        const ageDays = Math.floor((now - new Date(b.inbound_date).getTime()) / (24 * 60 * 60 * 1000));
        const prod = masterProducts.find(p => p.sku === b.sku);
        const cost = b.cost_price != null ? parseFloat(b.cost_price) : (prod?.cost_price || 0);
        const retail = prod?.price || 0;
        const lineCost = b.qty_remaining * cost;
        const lineRetail = b.qty_remaining * retail;

        for(const k in buckets) {
            const bk = buckets[k];
            if(ageDays >= bk.min && ageDays <= bk.max) {
                bk.qty += b.qty_remaining;
                bk.cost += lineCost;
                bk.retail += lineRetail;
                bk.items.push({ sku: b.sku, name: prod?.name || '?', age: ageDays, qty: b.qty_remaining, cost: lineCost, batch: b });
                break;
            }
        }
    });

    const totalQty = Object.values(buckets).reduce((s, b) => s + b.qty, 0);
    const totalCost = Object.values(buckets).reduce((s, b) => s + b.cost, 0);
    const totalRetail = Object.values(buckets).reduce((s, b) => s + b.retail, 0);

    if(summaryEl) {
        const deadPct = totalCost > 0 ? (buckets['>365'].cost / totalCost * 100).toFixed(1) : '0';
        summaryEl.innerHTML = `
            <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(150px, 1fr)); gap:10px;">
                <div style="background:#F0FDF4; padding:10px; border-radius:6px;"><div style="font-size:10px; color:#166534;">Total Stock</div><div style="font-size:18px; font-weight:bold;">${totalQty} unit</div></div>
                <div style="background:#EFF6FF; padding:10px; border-radius:6px;"><div style="font-size:10px; color:#1E40AF;">Modal Diikat</div><div style="font-size:18px; font-weight:bold;">RM ${totalCost.toFixed(2)}</div></div>
                <div style="background:#FEF3C7; padding:10px; border-radius:6px;"><div style="font-size:10px; color:#92400E;">Potensi Jualan</div><div style="font-size:18px; font-weight:bold;">RM ${totalRetail.toFixed(2)}</div></div>
                <div style="background:#FEE2E2; padding:10px; border-radius:6px;"><div style="font-size:10px; color:#991B1B;">Dead Stock %</div><div style="font-size:18px; font-weight:bold;">${deadPct}%</div></div>
            </div>
        `;
    }

    let html = '';
    Object.values(buckets).forEach(bk => {
        const pct = totalCost > 0 ? (bk.cost / totalCost * 100) : 0;
        const color = bk.min >= 366 ? '#DC2626' : bk.min >= 181 ? '#D97706' : bk.min >= 91 ? '#CA8A04' : '#10B981';
        html += `
            <tr style="background:${bk.qty > 0 ? '#FFF' : '#FAFAFA'};">
                <td><strong style="color:${color};">${bk.label}</strong></td>
                <td style="text-align:right;">${bk.qty}</td>
                <td style="text-align:right;">RM ${bk.cost.toFixed(2)}</td>
                <td style="text-align:right;">RM ${bk.retail.toFixed(2)}</td>
                <td style="text-align:right;">
                    <div style="background:#E5E7EB; border-radius:4px; height:8px; position:relative; width:80px; display:inline-block;">
                        <div style="background:${color}; height:8px; border-radius:4px; width:${pct}%;"></div>
                    </div>
                    <span style="margin-left:6px;">${pct.toFixed(0)}%</span>
                </td>
                <td>
                    ${bk.items.length > 0 ? `<button class="btn-primary" style="font-size:10px; padding:2px 8px; margin:0;" onclick="window.showAgingDrilldown('${bk.label.replace(/'/g, '\\\'')}')">${bk.items.length} item</button>` : '-'}
                </td>
            </tr>
        `;
    });
    tbody.innerHTML = html;

    // Stash for drilldown
    window.__agingBuckets = buckets;
};

window.showAgingDrilldown = function(bucketLabel) {
    const bucket = Object.values(window.__agingBuckets || {}).find(b => b.label === bucketLabel);
    if(!bucket) return;
    bucket.items.sort((a, b) => b.cost - a.cost);
    const top20 = bucket.items.slice(0, 50);
    const html = `
        <div id="agingDrillOverlay" class="login-overlay" style="display:flex; z-index:3700;">
            <div class="login-box" style="max-width:760px; width:96%; padding:24px;">
                <button onclick="document.getElementById('agingDrillOverlay').remove()" style="float:right; border:none; background:none; font-size:24px; cursor:pointer;">×</button>
                <h2 style="margin-bottom:14px;">Drilldown: ${bucket.label}</h2>
                <p style="font-size:12px; color:#666; margin-bottom:10px;">${bucket.items.length} item · ${bucket.qty} unit · modal RM ${bucket.cost.toFixed(2)}</p>
                <div class="table-responsive" style="max-height:400px;">
                    <table class="data-table" style="font-size:12px;">
                        <thead><tr><th>SKU</th><th>Nama</th><th style="text-align:right;">Age (hari)</th><th style="text-align:right;">Qty</th><th style="text-align:right;">Total Modal</th></tr></thead>
                        <tbody>
                            ${top20.map(it => `
                                <tr>
                                    <td><strong>${it.sku}</strong></td>
                                    <td>${(it.name || '').slice(0, 60)}</td>
                                    <td style="text-align:right;">${it.age}</td>
                                    <td style="text-align:right;">${it.qty}</td>
                                    <td style="text-align:right;">RM ${it.cost.toFixed(2)}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', html);
};

window.exportInventorySnapshot = async function() {
    const dateStr = document.getElementById('snapshotDate')?.value;
    if(!dateStr) return showToast('Pilih tarikh dulu.', 'warn');
    const cutoff = new Date(dateStr + 'T23:59:59Z').toISOString();

    try {
        // Approximate snapshot: current batches that were created on or before cutoff
        // Plus replay txns to reconstruct historical qty (safer)
        const [{ data: batches }, { data: txns }] = await Promise.all([
            db.from('inventory_batches').select('*').lte('inbound_date', cutoff),
            db.from('inventory_transactions').select('*').lte('created_at', cutoff)
        ]);

        // Build per-SKU qty by replaying txns (approximate; current state minus everything after cutoff)
        const allTxns = await db.from('inventory_transactions').select('*');
        const txnsAfter = (allTxns.data || []).filter(t => new Date(t.created_at) > new Date(cutoff));

        const skuQty = {};
        masterProducts.forEach(p => {
            const cur = inventoryBatches.filter(b => b.sku === p.sku).reduce((s, b) => s + b.qty_remaining, 0);
            // Reverse-apply post-cutoff transactions: IN → subtract, OUT → add, ADJUSTMENT → flip sign
            const adj = txnsAfter.filter(t => t.sku === p.sku).reduce((s, t) => {
                if(t.transaction_type === 'IN') return s - t.qty;
                if(t.transaction_type === 'OUT') return s + t.qty;
                return s - t.qty;  // ADJUSTMENT (positive added forward, so subtract)
            }, 0);
            skuQty[p.sku] = cur + adj;
        });

        const rows = masterProducts.filter(p => (skuQty[p.sku] || 0) > 0).map(p => {
            const qty = skuQty[p.sku] || 0;
            const cost = parseFloat(p.cost_price) || 0;
            const retail = parseFloat(p.price) || 0;
            return { sku: p.sku, name: p.name, brand: p.brand, category: p.category, qty, cost, retail, total_cost: qty * cost, total_retail: qty * retail };
        });

        // CSV download
        const header = ['SKU', 'Name', 'Brand', 'Category', 'Qty', 'Cost/Unit (RM)', 'Retail/Unit (RM)', 'Total Modal (RM)', 'Total Retail (RM)'];
        const csv = [header.join(',')].concat(
            rows.map(r => [r.sku, `"${(r.name || '').replace(/"/g, '""')}"`, `"${r.brand || ''}"`, `"${r.category || ''}"`,
                r.qty, r.cost.toFixed(2), r.retail.toFixed(2), r.total_cost.toFixed(2), r.total_retail.toFixed(2)].join(','))
        ).join('\n');

        const totalCost = rows.reduce((s, r) => s + r.total_cost, 0);
        const totalRetail = rows.reduce((s, r) => s + r.total_retail, 0);
        const summary = `\n,,,,SUMMARY,,,${totalCost.toFixed(2)},${totalRetail.toFixed(2)}\n,,,,Sebagai pada ${dateStr},,,RM ${totalCost.toFixed(2)},RM ${totalRetail.toFixed(2)}`;

        const blob = new Blob([csv + summary], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `stock_snapshot_${dateStr}.csv`;
        link.click();

        showToast(`Snapshot ${dateStr}: ${rows.length} SKU, modal RM ${totalCost.toFixed(2)}`, 'success');
    } catch(e) {
        showToast('Ralat: ' + e.message, 'error');
    }
};

// ===================================
// SALES LEDGER + PRODUCT SALES SUMMARY (post-Shopify migration)
// ===================================
let __ledgerPage = 1;
let __prodSalesCache = null;   // memoised (sku → stats) — invalidated when sales/products reload

window.renderSalesLedger = function() {
    const tbody = document.getElementById('ledgerTbody');
    if(!tbody) return;
    if(typeof salesHistory === 'undefined' || !Array.isArray(salesHistory)) {
        tbody.innerHTML = '<tr><td colspan="9" style="text-align:center; padding:30px; color:#999;">No sales history loaded yet.</td></tr>';
        return;
    }

    // Populate filter dropdowns lazily
    const channels = [...new Set(salesHistory.map(s => s.channel).filter(Boolean))].sort();
    const staff = [...new Set(salesHistory.map(s => s.staff_name).filter(Boolean))].sort();
    const chSel = document.getElementById('ledgerChannel');
    const stSel = document.getElementById('ledgerStaff');
    if(chSel && chSel.options.length <= 1) {
        chSel.innerHTML = '<option value="">Semua Channel</option>' + channels.map(c => `<option value="${c}">${c}</option>`).join('');
    }
    if(stSel && stSel.options.length <= 1) {
        stSel.innerHTML = '<option value="">Semua</option>' + staff.map(s => `<option value="${s}">${s}</option>`).join('') + '<option value="__null__">(Pending Backfill)</option>';
    }

    // Read filters
    const q = (document.getElementById('ledgerSearch').value || '').trim().toLowerCase();
    const filterCh = document.getElementById('ledgerChannel').value;
    const filterStaff = document.getElementById('ledgerStaff').value;
    const filterStatus = document.getElementById('ledgerStatus').value;
    const dateFrom = document.getElementById('ledgerDateFrom').value;
    const dateTo = document.getElementById('ledgerDateTo').value;
    const pageSize = parseInt(document.getElementById('ledgerPageSize').value) || 50;

    let filtered = salesHistory.filter(s => {
        if(filterCh && s.channel !== filterCh) return false;
        if(filterStaff === '__null__') {
            if(s.staff_name) return false;
        } else if(filterStaff && s.staff_name !== filterStaff) return false;
        if(filterStatus && s.status !== filterStatus) return false;
        if(dateFrom && s.created_at && s.created_at.slice(0, 10) < dateFrom) return false;
        if(dateTo && s.created_at && s.created_at.slice(0, 10) > dateTo) return false;
        if(q) {
            const orderRef = (s.metadata?.shopify_order_name || s.id || '').toString().toLowerCase();
            const cust = (s.customer_name || '').toLowerCase();
            const items = (s.items || []).map(i => `${i.sku||''} ${i.name||''}`).join(' ').toLowerCase();
            if(!orderRef.includes(q) && !cust.includes(q) && !items.includes(q)) return false;
        }
        return true;
    });

    // Sort by date desc
    filtered.sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''));

    // Stats summary
    const totalRev = filtered.filter(s => s.total > 0).reduce((sum, s) => sum + (s.total || 0), 0);
    const refundTotal = filtered.filter(s => s.total < 0).reduce((sum, s) => sum + (s.total || 0), 0);
    const summaryEl = document.getElementById('ledgerSummary');
    if(summaryEl) {
        summaryEl.innerHTML = `
            <div style="background:#EFF6FF; padding:10px; border-radius:6px;"><div style="font-size:10px; color:#1E40AF;">Match</div><div style="font-size:18px; font-weight:bold;">${filtered.length} orders</div></div>
            <div style="background:#F0FDF4; padding:10px; border-radius:6px;"><div style="font-size:10px; color:#166534;">Revenue</div><div style="font-size:18px; font-weight:bold;">RM ${totalRev.toFixed(2)}</div></div>
            <div style="background:#FEF2F2; padding:10px; border-radius:6px;"><div style="font-size:10px; color:#991B1B;">Refunds</div><div style="font-size:18px; font-weight:bold;">RM ${refundTotal.toFixed(2)}</div></div>
            <div style="background:#FAF5FF; padding:10px; border-radius:6px;"><div style="font-size:10px; color:#6B21A8;">Net</div><div style="font-size:18px; font-weight:bold;">RM ${(totalRev + refundTotal).toFixed(2)}</div></div>
        `;
    }

    document.getElementById('ledgerSummaryLine').innerHTML =
        `Match: <strong>${filtered.length}</strong> · sorted by date (newest first) · page ${__ledgerPage} of ${Math.max(1, Math.ceil(filtered.length / pageSize))}`;

    // Pagination
    const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
    if(__ledgerPage > totalPages) __ledgerPage = totalPages;
    const start = (__ledgerPage - 1) * pageSize;
    const slice = filtered.slice(start, start + pageSize);

    const pagEl = document.getElementById('ledgerPagination');
    if(pagEl) {
        pagEl.innerHTML = `
            <div style="font-size:12px; color:#666;">Showing ${start + 1}–${Math.min(start + pageSize, filtered.length)} of ${filtered.length}</div>
            <div style="display:flex; gap:6px;">
                <button class="btn-primary" style="padding:4px 10px; font-size:12px; margin:0;" onclick="window.ledgerGoPage(1)" ${__ledgerPage <= 1 ? 'disabled' : ''}>« First</button>
                <button class="btn-primary" style="padding:4px 10px; font-size:12px; margin:0;" onclick="window.ledgerGoPage(${__ledgerPage - 1})" ${__ledgerPage <= 1 ? 'disabled' : ''}>‹ Prev</button>
                <span style="padding:4px 10px; font-size:12px;">${__ledgerPage} / ${totalPages}</span>
                <button class="btn-primary" style="padding:4px 10px; font-size:12px; margin:0;" onclick="window.ledgerGoPage(${__ledgerPage + 1})" ${__ledgerPage >= totalPages ? 'disabled' : ''}>Next ›</button>
                <button class="btn-primary" style="padding:4px 10px; font-size:12px; margin:0;" onclick="window.ledgerGoPage(${totalPages})" ${__ledgerPage >= totalPages ? 'disabled' : ''}>Last »</button>
            </div>
        `;
    }

    if(slice.length === 0) {
        tbody.innerHTML = '<tr><td colspan="9" style="text-align:center; padding:30px; color:#999;">Tiada baris match filter.</td></tr>';
        return;
    }

    tbody.innerHTML = slice.map((s, i) => {
        const dateStr = (s.created_at || '').replace('T', ' ').slice(0, 16);
        const orderRef = s.metadata?.shopify_order_name || `#${s.id}`;
        const items = s.items || [];
        const itemCount = items.reduce((n, it) => n + (it.qty || 1), 0);
        const cust = s.customer_name || '<span style="color:#999;">-</span>';
        const total = (s.total || 0);
        const channel = s.channel || '-';
        const staff = s.staff_name || (s.metadata?.pending_staff_backfill ? '<span style="color:#D97706; font-style:italic;">⏳ Pending</span>' : '-');
        const totalColor = total < 0 ? '#DC2626' : '#111';
        const statusColor = {
            'Completed': { bg:'#D1FAE5', fg:'#065F46' },
            'Refunded':  { bg:'#FEE2E2', fg:'#991B1B' },
            'Refund':    { bg:'#FEE2E2', fg:'#991B1B' },
            'Voided':    { bg:'#F3F4F6', fg:'#6B7280' },
            'Pending':   { bg:'#FEF3C7', fg:'#92400E' },
        }[s.status] || { bg:'#F3F4F6', fg:'#374151' };
        const rowId = `ledger_row_${start + i}`;
        return `
            <tr style="cursor:pointer;" onclick="window.ledgerToggleExpand('${rowId}', ${start + i})">
                <td>▸</td>
                <td style="white-space:nowrap;">${dateStr}</td>
                <td style="font-family:monospace; font-size:11px;">${orderRef}</td>
                <td>${cust}</td>
                <td style="text-align:center;">${itemCount} <span style="color:#999;">(${items.length} sku)</span></td>
                <td style="text-align:right; font-weight:bold; color:${totalColor};">${total < 0 ? '−' : ''}${Math.abs(total).toFixed(2)}</td>
                <td><span style="background:#E0E7FF; color:#3730A3; padding:2px 6px; border-radius:4px; font-size:10px;">${channel}</span></td>
                <td>${staff}</td>
                <td style="text-align:center;"><span style="background:${statusColor.bg}; color:${statusColor.fg}; padding:2px 8px; border-radius:4px; font-weight:bold; font-size:10px;">${s.status || 'Completed'}</span></td>
            </tr>
            <tr id="${rowId}_detail" style="display:none; background:#F9FAFB;">
                <td colspan="9" style="padding:12px 20px;">
                    <strong>Line items:</strong>
                    <table style="width:100%; font-size:11px; margin-top:6px;">
                        <thead><tr style="border-bottom:1px solid #ddd;"><th style="text-align:left;">SKU</th><th style="text-align:left;">Name</th><th style="text-align:right;">Qty</th><th style="text-align:right;">Price</th><th style="text-align:right;">Subtotal</th></tr></thead>
                        <tbody>
                            ${items.map(it => `<tr><td style="font-family:monospace;">${it.sku||'-'}</td><td>${(it.name||'').slice(0, 80)}</td><td style="text-align:right;">${it.qty||1}</td><td style="text-align:right;">RM ${(it.price||0).toFixed(2)}</td><td style="text-align:right;">RM ${((it.qty||1) * (it.price||0)).toFixed(2)}</td></tr>`).join('')}
                        </tbody>
                    </table>
                    ${s.payment_method ? `<p style="font-size:11px; color:#666; margin-top:6px;">💳 Payment: ${s.payment_method}</p>` : ''}
                    ${s.metadata?.shopify_order_id ? `<p style="font-size:11px; color:#666;">Shopify ID: ${s.metadata.shopify_order_id}</p>` : ''}
                </td>
            </tr>
        `;
    }).join('');
};

window.ledgerGoPage = function(n) {
    __ledgerPage = Math.max(1, n);
    renderSalesLedger();
};

window.ledgerToggleExpand = function(rowId, idx) {
    const detail = document.getElementById(rowId + '_detail');
    if(!detail) return;
    detail.style.display = detail.style.display === 'none' ? 'table-row' : 'none';
};

window.exportSalesLedgerCsv = function() {
    if(typeof salesHistory === 'undefined') return showToast('No data', 'warn');
    const q = (document.getElementById('ledgerSearch').value || '').trim().toLowerCase();
    const filterCh = document.getElementById('ledgerChannel').value;
    const filterStaff = document.getElementById('ledgerStaff').value;
    const filterStatus = document.getElementById('ledgerStatus').value;
    const dateFrom = document.getElementById('ledgerDateFrom').value;
    const dateTo = document.getElementById('ledgerDateTo').value;

    const filtered = salesHistory.filter(s => {
        if(filterCh && s.channel !== filterCh) return false;
        if(filterStaff === '__null__') { if(s.staff_name) return false; }
        else if(filterStaff && s.staff_name !== filterStaff) return false;
        if(filterStatus && s.status !== filterStatus) return false;
        if(dateFrom && (s.created_at || '').slice(0, 10) < dateFrom) return false;
        if(dateTo && (s.created_at || '').slice(0, 10) > dateTo) return false;
        if(q) {
            const orderRef = (s.metadata?.shopify_order_name || s.id || '').toString().toLowerCase();
            const cust = (s.customer_name || '').toLowerCase();
            if(!orderRef.includes(q) && !cust.includes(q)) return false;
        }
        return true;
    }).sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''));

    const header = ['Date','Order','Customer','Phone','Items_Count','Total_RM','Channel','Staff','Status','Payment','SKUs'];
    const csv = [header.join(',')].concat(filtered.map(s => {
        const items = s.items || [];
        const skus = items.map(i => `${i.sku||'?'} x${i.qty||1}`).join('; ');
        return [
            (s.created_at || '').replace('T', ' ').slice(0, 19),
            s.metadata?.shopify_order_name || s.id || '',
            `"${(s.customer_name || '').replace(/"/g, '""')}"`,
            s.customer_phone || '',
            items.reduce((n, it) => n + (it.qty || 1), 0),
            (s.total || 0).toFixed(2),
            s.channel || '',
            `"${s.staff_name || ''}"`,
            s.status || 'Completed',
            `"${s.payment_method || ''}"`,
            `"${skus.replace(/"/g, '""')}"`
        ].join(',');
    })).join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `sales_ledger_${new Date().toISOString().slice(0,10)}.csv`;
    link.click();
    showToast(`Exported ${filtered.length} rows`, 'success');
};

// ===================================
// PRODUCT SALES SUMMARY (with negative balance flag)
// ===================================
function __computeProductSales() {
    if(__prodSalesCache) return __prodSalesCache;
    const cutoff6mo = Date.now() - 180 * 24 * 60 * 60 * 1000;
    const stats = new Map();
    masterProducts.forEach(p => {
        stats.set(p.sku, {
            sku: p.sku, name: p.name, brand: p.brand, category: p.category,
            price: parseFloat(p.price) || 0,
            cost: parseFloat(p.cost_price) || 0,
            reorder_point: p.reorder_point,
            stock: 0, totalSold: 0, recentSold: 0, revenue: 0, lastSale: null
        });
    });
    // Compute current stock
    inventoryBatches.forEach(b => {
        const st = stats.get(b.sku);
        if(st) st.stock += (b.qty_remaining || 0);
    });
    // Walk sales_history
    (salesHistory || []).forEach(s => {
        if(s.total <= 0) return;  // skip refunds for "sold" tally — they reduce gross but separate count
        const dt = s.created_at ? new Date(s.created_at).getTime() : 0;
        (s.items || []).forEach(it => {
            const sku = (it.sku || '').toUpperCase();
            const qty = parseFloat(it.qty) || 0;
            const price = parseFloat(it.price) || 0;
            const st = stats.get(sku);
            if(!st || qty <= 0) return;
            st.totalSold += qty;
            st.revenue += qty * price;
            if(dt >= cutoff6mo) st.recentSold += qty;
            if(!st.lastSale || dt > new Date(st.lastSale).getTime()) st.lastSale = s.created_at;
        });
    });
    // Subtract refunds from totalSold
    (salesHistory || []).forEach(s => {
        if(s.total >= 0) return;
        (s.items || []).forEach(it => {
            const sku = (it.sku || '').toUpperCase();
            const qty = parseFloat(it.qty) || 0;
            const st = stats.get(sku);
            if(st && qty > 0) {
                st.totalSold = Math.max(0, st.totalSold - qty);
                st.revenue -= qty * (parseFloat(it.price) || 0);
            }
        });
    });
    __prodSalesCache = stats;
    return stats;
}

window.invalidateProductSalesCache = function() { __prodSalesCache = null; };

window.renderProductSales = function() {
    const tbody = document.getElementById('prodSalesTbody');
    if(!tbody) return;

    const stats = __computeProductSales();
    const all = [...stats.values()];

    // Populate brand filter
    const brandSel = document.getElementById('prodSalesBrand');
    if(brandSel && brandSel.options.length <= 1) {
        const brands = [...new Set(all.map(s => s.brand).filter(Boolean))].sort();
        brandSel.innerHTML = '<option value="">Semua</option>' + brands.map(b => `<option value="${b}">${b}</option>`).join('');
    }

    const q = (document.getElementById('prodSalesSearch').value || '').trim().toLowerCase();
    const filterBrand = document.getElementById('prodSalesBrand').value;
    const filterMode = document.getElementById('prodSalesFilter').value;
    const sortMode = document.getElementById('prodSalesSort').value;
    const pageSize = parseInt(document.getElementById('prodSalesPageSize').value) || 100;

    // Compute balance
    all.forEach(r => {
        r.balance = r.stock - r.totalSold;
    });

    let filtered = all.filter(r => {
        if(filterBrand && r.brand !== filterBrand) return false;
        if(filterMode === 'negative' && r.balance >= 0) return false;
        if(filterMode === 'zero_stock' && r.stock !== 0) return false;
        if(filterMode === 'movers' && r.totalSold === 0) return false;
        if(filterMode === 'dead' && r.totalSold > 0) return false;
        if(q) {
            const hay = `${r.sku} ${r.name||''} ${r.brand||''}`.toLowerCase();
            if(!hay.includes(q)) return false;
        }
        return true;
    });

    // Sort
    filtered.sort((a, b) => {
        switch(sortMode) {
            case 'balance_asc':  return a.balance - b.balance;
            case 'sold_desc':    return b.totalSold - a.totalSold;
            case 'recent_desc':  return b.recentSold - a.recentSold;
            case 'stock_asc':    return a.stock - b.stock;
            case 'sku':          return a.sku.localeCompare(b.sku);
            default:             return a.balance - b.balance;
        }
    });

    const total = filtered.length;
    const slice = filtered.slice(0, pageSize);

    // Stats cards
    const totalSold = all.reduce((s, r) => s + r.totalSold, 0);
    const totalRevenue = all.reduce((s, r) => s + r.revenue, 0);
    const negativeBalance = all.filter(r => r.balance < 0).length;
    const zeroStock = all.filter(r => r.stock === 0).length;
    document.getElementById('prodSalesSummaryStats').innerHTML = `
        <div style="background:#EFF6FF; padding:10px; border-radius:6px;"><div style="font-size:10px; color:#1E40AF;">Total Unit Sold</div><div style="font-size:18px; font-weight:bold;">${totalSold.toLocaleString()}</div></div>
        <div style="background:#F0FDF4; padding:10px; border-radius:6px;"><div style="font-size:10px; color:#166534;">Total Revenue</div><div style="font-size:18px; font-weight:bold;">RM ${totalRevenue.toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2})}</div></div>
        <div style="background:#FEF2F2; padding:10px; border-radius:6px;"><div style="font-size:10px; color:#991B1B;">Negative Balance</div><div style="font-size:18px; font-weight:bold;">${negativeBalance} SKU</div></div>
        <div style="background:#FEF3C7; padding:10px; border-radius:6px;"><div style="font-size:10px; color:#92400E;">Zero Stock</div><div style="font-size:18px; font-weight:bold;">${zeroStock} SKU</div></div>
    `;

    document.getElementById('prodSalesSummaryLine').innerHTML =
        `Match: <strong>${total}</strong> · Show: <strong>${slice.length}</strong>${total > slice.length ? ` <span style="color:#DC2626;">(turunkan saiz halaman / tightenkan filter untuk lihat semua)</span>` : ''}`;

    if(slice.length === 0) {
        tbody.innerHTML = '<tr><td colspan="9" style="text-align:center; padding:30px; color:#999;">Tiada produk match filter.</td></tr>';
        return;
    }

    tbody.innerHTML = slice.map(r => {
        const balanceColor = r.balance < 0 ? '#DC2626' : (r.balance < 5 ? '#D97706' : '#10B981');
        const balanceText = r.balance < 0 ? `−${Math.abs(r.balance).toFixed(0)}` : r.balance.toFixed(0);
        const lastSaleStr = r.lastSale ? new Date(r.lastSale).toISOString().slice(0,10) : '-';
        const lastSaleColor = r.lastSale && (Date.now() - new Date(r.lastSale).getTime()) < 90*86400000 ? '#10B981' : '#9CA3AF';
        const stockColor = r.stock === 0 ? '#DC2626' : (r.stock < (r.reorder_point || 5) ? '#D97706' : '#111');
        const recentBadge = r.recentSold > 0 ? `<span style="background:#D1FAE5; color:#065F46; padding:1px 5px; border-radius:3px; font-size:10px; margin-left:4px;">🔥</span>` : '';
        return `
            <tr>
                <td style="font-family:monospace; font-size:11px;"><strong>${r.sku}</strong></td>
                <td style="max-width:280px;"><div>${(r.name || '').slice(0, 70)}</div><span style="color:#888; font-size:10px;">${r.brand || '-'} · ${r.category || '-'}</span></td>
                <td style="text-align:right; font-weight:bold;">${r.totalSold.toFixed(0)}</td>
                <td style="text-align:right;">${r.recentSold.toFixed(0)}${recentBadge}</td>
                <td style="text-align:right; color:${stockColor}; font-weight:bold;">${r.stock}</td>
                <td style="text-align:right; color:${balanceColor}; font-weight:bold; font-size:14px;">${balanceText}</td>
                <td style="text-align:right; color:#666;">${r.reorder_point ?? '-'}</td>
                <td style="text-align:right; color:#666;">${r.revenue.toFixed(2)}</td>
                <td style="text-align:center; color:${lastSaleColor}; font-size:11px;">${lastSaleStr}</td>
            </tr>
        `;
    }).join('');
};

window.exportProductSalesCsv = function() {
    const stats = __computeProductSales();
    const all = [...stats.values()];
    all.forEach(r => r.balance = r.stock - r.totalSold);
    all.sort((a, b) => a.balance - b.balance);

    const header = ['SKU','Name','Brand','Category','Total_Sold_Lifetime','Last_6mo_Sold','Stock_Now','Balance','Reorder_Point','Revenue_RM','Last_Sale_Date'];
    const csv = [header.join(',')].concat(all.map(r => [
        r.sku,
        `"${(r.name || '').replace(/"/g, '""')}"`,
        `"${r.brand || ''}"`,
        `"${r.category || ''}"`,
        r.totalSold.toFixed(0),
        r.recentSold.toFixed(0),
        r.stock,
        r.balance.toFixed(0),
        r.reorder_point ?? '',
        r.revenue.toFixed(2),
        r.lastSale ? new Date(r.lastSale).toISOString().slice(0,10) : ''
    ].join(','))).join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `product_sales_summary_${new Date().toISOString().slice(0,10)}.csv`;
    link.click();
    showToast(`Exported ${all.length} rows`, 'success');
};

// ===================================
// CRM V2 — enriched customers + segments
// ===================================
window.renderCustomersV2 = function() {
    const tbody = document.getElementById('customersTableBody');
    if(!tbody) return;
    if(typeof customersData === 'undefined' || !Array.isArray(customersData)) {
        tbody.innerHTML = '<tr><td colspan="9" style="text-align:center; color:#999;">Loading customer data...</td></tr>';
        return;
    }

    const all = customersData;
    const q = (document.getElementById('crmSearch')?.value || '').trim().toLowerCase();
    const segment = document.getElementById('crmSegment')?.value || '';
    const sortMode = document.getElementById('crmSort')?.value || 'spent_desc';
    const pageSize = parseInt(document.getElementById('crmPageSize')?.value) || 50;

    let filtered = all.filter(c => {
        if(q) {
            const hay = `${c.name||''} ${c.phone||''} ${c.email||''} ${c.tags||''}`.toLowerCase();
            if(!hay.includes(q)) return false;
        }
        switch(segment) {
            case 'vip':            if(!c.is_member) return false; break;
            case 'email_consent':  if(!c.accepts_email_marketing) return false; break;
            case 'sms_consent':    if(!c.accepts_sms_marketing) return false; break;
            case 'tiktok':         if(!(c.tags||'').toLowerCase().includes('tiktok')) return false; break;
            case 'shopee':         if(!(c.tags||'').toLowerCase().includes('shopee')) return false; break;
            case 'never_bought':   if((c.total_orders||0) > 0) return false; break;
            case 'big_spender':    if((c.total_spent||0) < 1000) return false; break;
        }
        return true;
    });

    filtered.sort((a, b) => {
        switch(sortMode) {
            case 'spent_desc':  return (b.total_spent||0) - (a.total_spent||0);
            case 'orders_desc': return (b.total_orders||0) - (a.total_orders||0);
            case 'recent':      return (b.created_at||'').localeCompare(a.created_at||'');
            case 'name':        return (a.name||'').localeCompare(b.name||'');
        }
        return 0;
    });

    const totalSpent = filtered.reduce((s, c) => s + (c.total_spent||0), 0);
    const totalOrders = filtered.reduce((s, c) => s + (c.total_orders||0), 0);
    const vipCount = filtered.filter(c => c.is_member).length;
    const emailConsent = filtered.filter(c => c.accepts_email_marketing).length;

    document.getElementById('crmStats').innerHTML = `
        <div style="background:#EFF6FF; padding:10px; border-radius:6px;"><div style="font-size:10px; color:#1E40AF;">Match</div><div style="font-size:18px; font-weight:bold;">${filtered.length}</div></div>
        <div style="background:#F0FDF4; padding:10px; border-radius:6px;"><div style="font-size:10px; color:#166534;">Total Spent</div><div style="font-size:18px; font-weight:bold;">RM ${totalSpent.toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2})}</div></div>
        <div style="background:#FEF3C7; padding:10px; border-radius:6px;"><div style="font-size:10px; color:#92400E;">Total Orders</div><div style="font-size:18px; font-weight:bold;">${totalOrders}</div></div>
        <div style="background:#FAF5FF; padding:10px; border-radius:6px;"><div style="font-size:10px; color:#6B21A8;">VIP Members</div><div style="font-size:18px; font-weight:bold;">${vipCount}</div></div>
        <div style="background:#FEE2E2; padding:10px; border-radius:6px;"><div style="font-size:10px; color:#991B1B;">Email Consent</div><div style="font-size:18px; font-weight:bold;">${emailConsent}</div></div>
    `;

    const slice = filtered.slice(0, pageSize);
    document.getElementById('crmSummaryLine').innerHTML =
        `Match: <strong>${filtered.length}</strong> · Show: <strong>${slice.length}</strong>`;

    if(slice.length === 0) {
        tbody.innerHTML = '<tr><td colspan="9" style="text-align:center; color:#999;">Tiada customer match filter.</td></tr>';
        return;
    }

    tbody.innerHTML = slice.map(c => {
        const consent = [];
        if(c.accepts_email_marketing) consent.push('<span title="Email consent" style="color:#10B981;">📧</span>');
        if(c.accepts_sms_marketing) consent.push('<span title="SMS consent" style="color:#10B981;">📱</span>');
        const tags = (c.tags || '').split(',').map(t => t.trim()).filter(Boolean).slice(0, 3);
        const tagBadges = tags.map(t => `<span style="background:#E0E7FF; color:#3730A3; padding:1px 6px; border-radius:3px; font-size:9px; margin-right:2px;">${t}</span>`).join('');
        const memberBadge = c.is_member
            ? '<span style="background:#FEF3C7; color:#92400E; padding:2px 8px; border-radius:4px; font-weight:bold; font-size:10px;">⭐ VIP</span>'
            : '<span style="color:#999; font-size:11px;">-</span>';
        return `
            <tr>
                <td><strong>${(c.name||'').slice(0, 50)}</strong></td>
                <td style="font-family:monospace; font-size:11px;">${c.phone || '-'}</td>
                <td style="font-size:11px;">${c.email || '-'}</td>
                <td style="text-align:right; font-weight:bold; color:${(c.total_spent||0) > 1000 ? '#10B981' : '#111'};">${(c.total_spent||0).toFixed(2)}</td>
                <td style="text-align:right;">${c.total_orders || 0}</td>
                <td style="text-align:right; color:#F59E0B; font-weight:bold;">${c.points || 0}</td>
                <td style="text-align:center;">${memberBadge}</td>
                <td style="text-align:center; font-size:14px;">${consent.join(' ') || '<span style="color:#999;">-</span>'}</td>
                <td>${tagBadges || '-'}</td>
            </tr>
        `;
    }).join('');
};

window.exportCustomersCsv = function() {
    if(typeof customersData === 'undefined') return showToast('No data', 'warn');
    const q = (document.getElementById('crmSearch')?.value || '').trim().toLowerCase();
    const segment = document.getElementById('crmSegment')?.value || '';
    const all = customersData.filter(c => {
        if(q) {
            const hay = `${c.name||''} ${c.phone||''} ${c.email||''}`.toLowerCase();
            if(!hay.includes(q)) return false;
        }
        switch(segment) {
            case 'vip':            return c.is_member;
            case 'email_consent':  return c.accepts_email_marketing;
            case 'sms_consent':    return c.accepts_sms_marketing;
            case 'tiktok':         return (c.tags||'').toLowerCase().includes('tiktok');
            case 'shopee':         return (c.tags||'').toLowerCase().includes('shopee');
            case 'never_bought':   return (c.total_orders||0) === 0;
            case 'big_spender':    return (c.total_spent||0) >= 1000;
        }
        return true;
    });

    const header = ['Name','Phone','Email','Total_Spent_RM','Total_Orders','Points','Is_Member','Email_Consent','SMS_Consent','Tags','Address_City','Address_State'];
    const csv = [header.join(',')].concat(all.map(c => {
        const addr = c.address || {};
        return [
            `"${(c.name||'').replace(/"/g, '""')}"`,
            c.phone || '',
            c.email || '',
            (c.total_spent||0).toFixed(2),
            c.total_orders || 0,
            c.points || 0,
            c.is_member ? 'yes' : 'no',
            c.accepts_email_marketing ? 'yes' : 'no',
            c.accepts_sms_marketing ? 'yes' : 'no',
            `"${(c.tags||'').replace(/"/g, '""')}"`,
            `"${addr.city || ''}"`,
            `"${addr.state || ''}"`
        ].join(',');
    })).join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `customers_${new Date().toISOString().slice(0,10)}.csv`;
    link.click();
    showToast(`Exported ${all.length} customers`, 'success');
};

// ===================================
// EMAIL BLAST GENERATOR (mailto fallback)
// ===================================
window.openEmailBlast = function() {
    if(typeof customersData === 'undefined') return showToast('No customer data', 'warn');
    const segment = document.getElementById('crmSegment')?.value || '';
    // Auto-suggest: if user already filtered email_consent, use that. Else default to consent-only.
    const eligible = customersData.filter(c => c.email && c.accepts_email_marketing);
    document.getElementById('emailBlastRecipients').innerHTML =
        `<strong>${eligible.length}</strong> customers dengan email consent · ${customersData.filter(c => c.accepts_sms_marketing).length} dengan SMS consent.<br>` +
        `<span style="color:#666;">Email blast ni ambik HANYA yang ada email + accepts_email_marketing=true (compliance).</span>`;
    document.getElementById('emailBlastOverlay').style.display = 'flex';
};

window.generateEmailBlast = function() {
    const subject = (document.getElementById('emailBlastSubject').value || '').trim();
    const body = (document.getElementById('emailBlastBody').value || '').trim();
    if(!subject || !body) return showToast('Subject + body wajib diisi.', 'warn');

    const eligible = customersData.filter(c => c.email && c.accepts_email_marketing);
    if(eligible.length === 0) return showToast('Tiada customer dengan email consent.', 'warn');

    const bccList = eligible.map(c => c.email).join(', ');
    const fileContent =
        `EMAIL BLAST PACKAGE — Generated ${new Date().toISOString()}\n` +
        `Total recipients: ${eligible.length}\n` +
        `=====================================\n\n` +
        `SUBJECT:\n${subject}\n\n` +
        `BODY:\n${body}\n\n` +
        `=====================================\n` +
        `BCC LIST (${eligible.length} addresses, comma-separated):\n${bccList}\n\n` +
        `=====================================\n` +
        `BCC LIST (one per line):\n${eligible.map(c => c.email).join('\n')}\n`;

    const blob = new Blob([fileContent], { type: 'text/plain;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `email_blast_${new Date().toISOString().slice(0,16).replace(':','')}.txt`;
    link.click();

    // Audit log
    try {
        db.from('audit_logs').insert([{
            action_type: 'email_blast_generated',
            actor_name: currentUser ? currentUser.name : 'System',
            details: JSON.stringify({ subject, recipient_count: eligible.length, segment: 'email_consent' }),
            created_at: new Date().toISOString()
        }]).then(() => {});
    } catch(_){}

    showToast(`Email package generated for ${eligible.length} recipients`, 'success');
    document.getElementById('emailBlastOverlay').style.display = 'none';
};

// ===================================
// VIP AUTO-DISCOUNT
// ===================================
window.__currentCheckoutVip = null;

function getVipDiscountPercent() {
    try {
        const s = JSON.parse(localStorage.getItem('complianceSettings_v1') || '{}');
        return parseFloat(s?.vip?.discountPercent) || 5;  // default 5%
    } catch(e) { return 5; }
}

function normalisePhoneForMatch(raw) {
    if(!raw) return null;
    const digits = String(raw).replace(/\D/g, '');
    if(!digits || digits.length < 7) return null;
    if(digits.startsWith('60')) return digits;
    if(digits.startsWith('0')) return '60' + digits.slice(1);
    return digits;
}

window.checkoutVipLookup = function() {
    const nameEl = document.getElementById('customerName');
    const phoneEl = document.getElementById('customerPhone');
    const badge = document.getElementById('checkoutVipBadge');
    const totalDisplay = document.getElementById('paymentTotalDisplay');
    if(!badge) return;

    const name = (nameEl?.value || '').trim().toLowerCase();
    const phoneRaw = (phoneEl?.value || '').trim();
    const phone = normalisePhoneForMatch(phoneRaw);

    let match = null;
    if(typeof customersData !== 'undefined' && Array.isArray(customersData)) {
        if(phone) {
            match = customersData.find(c => c.phone === phone);
        }
        if(!match && name && name.length >= 3) {
            match = customersData.find(c => (c.name || '').toLowerCase() === name);
        }
    }

    window.__currentCheckoutVip = null;
    if(!match) {
        badge.style.display = 'none';
        recomputeCheckoutTotal();
        return;
    }

    if(match.is_member) {
        const pct = getVipDiscountPercent();
        window.__currentCheckoutVip = {
            customer_id: match.id,
            customer_name: match.name,
            customer_phone: match.phone,
            discount_pct: pct,
            total_orders: match.total_orders || 0,
            total_spent: match.total_spent || 0
        };
        badge.style.background = '#FEF3C7';
        badge.style.color = '#92400E';
        badge.style.border = '2px solid #FCD34D';
        badge.style.display = 'block';
        badge.innerHTML = `⭐ <strong>VIP MEMBER</strong> · ${match.name} · ${match.total_orders} orders · RM${(match.total_spent||0).toFixed(0)} spent — auto-discount <strong>${pct}%</strong> applied`;
    } else {
        badge.style.background = '#EFF6FF';
        badge.style.color = '#1E40AF';
        badge.style.border = '1px solid #BFDBFE';
        badge.style.display = 'block';
        badge.innerHTML = `👤 Customer found · ${match.name} · ${match.total_orders||0} order(s) · RM${(match.total_spent||0).toFixed(0)} spent — needs ${3 - (match.total_orders||0)} more order to unlock VIP`;
    }
    recomputeCheckoutTotal();
};

window.recomputeCheckoutTotal = function() {
    const totalEl = document.getElementById('paymentTotalDisplay');
    if(!totalEl) return;
    // Read raw cart total
    const cart = (typeof window.cart !== 'undefined' && Array.isArray(window.cart)) ? window.cart : (typeof cart !== 'undefined' ? cart : []);
    let raw = 0;
    cart.forEach(it => { raw += (it.qty || 1) * (parseFloat(it.price) || 0); });
    let final = raw;
    let discountAmt = 0;
    if(window.__currentCheckoutVip) {
        discountAmt = round2(raw * window.__currentCheckoutVip.discount_pct / 100);
        final = round2(raw - discountAmt);
    }
    totalEl.textContent = final.toFixed(2);
    // Tag in DOM as data-attrs for downstream
    totalEl.setAttribute('data-raw', raw.toFixed(2));
    totalEl.setAttribute('data-discount', discountAmt.toFixed(2));
    totalEl.setAttribute('data-final', final.toFixed(2));

    // Update line if exists
    let vipLine = document.getElementById('checkoutVipDiscountLine');
    if(window.__currentCheckoutVip && discountAmt > 0) {
        if(!vipLine) {
            const parent = totalEl.closest('p, div');
            if(parent) {
                parent.insertAdjacentHTML('afterend',
                    `<p id="checkoutVipDiscountLine" style="font-size:12px; color:#92400E; margin:-12px 0 12px 0;">⭐ VIP discount: −RM <strong>${discountAmt.toFixed(2)}</strong> (${window.__currentCheckoutVip.discount_pct}% off RM ${raw.toFixed(2)})</p>`);
            }
        } else {
            vipLine.innerHTML = `⭐ VIP discount: −RM <strong>${discountAmt.toFixed(2)}</strong> (${window.__currentCheckoutVip.discount_pct}% off RM ${raw.toFixed(2)})`;
            vipLine.style.display = 'block';
        }
    } else if(vipLine) {
        vipLine.style.display = 'none';
    }
};

// =============================================================
// SPRINT A — OPERATIONS POLISH
// =============================================================

// ============= p4_3 MANAGER DASHBOARD =============
let __dashPeriod = '30d';

window.dashSetPeriod = function(p) {
    __dashPeriod = p;
    document.querySelectorAll('.dash-period-btn').forEach(b => b.classList.toggle('active', b.dataset.period === p));
    renderManagerDashboard();
};

function dashGetCutoff() {
    const now = Date.now();
    const day = 24 * 60 * 60 * 1000;
    switch(__dashPeriod) {
        case '7d': return now - 7 * day;
        case '30d': return now - 30 * day;
        case '90d': return now - 90 * day;
        case 'ytd': {
            const yr = new Date(); yr.setMonth(0, 1); yr.setHours(0,0,0,0);
            return yr.getTime();
        }
        case 'all': return 0;
    }
    return now - 30 * day;
}

window.renderManagerDashboard = function() {
    if(typeof salesHistory === 'undefined') return;
    const cutoff = dashGetCutoff();
    const sales = salesHistory.filter(s => {
        const dt = s.created_at ? new Date(s.created_at).getTime() : 0;
        return dt >= cutoff;
    });
    const positives = sales.filter(s => (s.total||0) > 0);
    const refunds = sales.filter(s => (s.total||0) < 0);

    const totalRev = positives.reduce((s, x) => s + (x.total||0), 0);
    const refundTotal = Math.abs(refunds.reduce((s, x) => s + (x.total||0), 0));
    const netRev = totalRev - refundTotal;
    const orderCount = positives.length;
    const aov = orderCount > 0 ? totalRev / orderCount : 0;

    // Unique customers in period
    const periodCustomers = new Set(positives.map(s => s.customer_phone || s.customer_name).filter(Boolean));

    // Period label
    const labelMap = { '7d':'Last 7 days', '30d':'Last 30 days', '90d':'Last 90 days', 'ytd':'Year-to-date', 'all':'All-time' };
    document.getElementById('dashPeriodLabel').textContent = `${labelMap[__dashPeriod]} · ${sales.length} orders`;

    // KPI cards
    document.getElementById('dashKpiCards').innerHTML = `
        <div style="background:#F0FDF4; padding:12px; border-radius:8px; border-left:4px solid #10B981;"><div style="font-size:10px; color:#166534; font-weight:700; text-transform:uppercase;">Revenue</div><div style="font-size:20px; font-weight:800;">RM ${totalRev.toFixed(2)}</div><div style="font-size:10px; color:#666;">Net: RM ${netRev.toFixed(2)}</div></div>
        <div style="background:#EFF6FF; padding:12px; border-radius:8px; border-left:4px solid #2563EB;"><div style="font-size:10px; color:#1E40AF; font-weight:700; text-transform:uppercase;">Orders</div><div style="font-size:20px; font-weight:800;">${orderCount}</div><div style="font-size:10px; color:#666;">+${refunds.length} refunds</div></div>
        <div style="background:#FAF5FF; padding:12px; border-radius:8px; border-left:4px solid #A855F7;"><div style="font-size:10px; color:#6B21A8; font-weight:700; text-transform:uppercase;">AOV</div><div style="font-size:20px; font-weight:800;">RM ${aov.toFixed(2)}</div></div>
        <div style="background:#FEF3C7; padding:12px; border-radius:8px; border-left:4px solid #F59E0B;"><div style="font-size:10px; color:#92400E; font-weight:700; text-transform:uppercase;">Customers</div><div style="font-size:20px; font-weight:800;">${periodCustomers.size}</div></div>
        <div style="background:#FEE2E2; padding:12px; border-radius:8px; border-left:4px solid #DC2626;"><div style="font-size:10px; color:#991B1B; font-weight:700; text-transform:uppercase;">Refund Rate</div><div style="font-size:20px; font-weight:800;">${orderCount ? (refunds.length*100/orderCount).toFixed(1) : '0.0'}%</div></div>
    `;

    // Revenue trend chart (canvas)
    const canvas = document.getElementById('dashRevenueChart');
    if(canvas) drawRevenueChart(canvas, positives, cutoff);

    // Channel mix
    const channelTotals = {};
    positives.forEach(s => {
        const ch = s.channel || 'Unknown';
        channelTotals[ch] = (channelTotals[ch] || 0) + (s.total||0);
    });
    const sortedCh = Object.entries(channelTotals).sort((a,b) => b[1] - a[1]);
    const grandCh = sortedCh.reduce((s, [_,v]) => s+v, 0) || 1;
    document.getElementById('dashChannelMix').innerHTML = sortedCh.map(([ch, v]) => {
        const pct = (v/grandCh*100);
        return `<div style="margin-bottom:8px;"><div style="display:flex; justify-content:space-between; font-size:11px; margin-bottom:3px;"><strong>${ch}</strong><span>RM ${v.toFixed(0)} · ${pct.toFixed(1)}%</span></div><div style="background:#E5E7EB; height:6px; border-radius:3px;"><div style="background:var(--primary); height:6px; border-radius:3px; width:${pct}%;"></div></div></div>`;
    }).join('') || '<p style="color:#999; font-size:12px;">No data.</p>';

    // Top 10 SKUs
    const skuQty = {}; const skuRev = {};
    positives.forEach(s => (s.items||[]).forEach(it => {
        const sku = (it.sku || 'NO_SKU').toUpperCase();
        const qty = parseInt(it.qty || 1);
        skuQty[sku] = (skuQty[sku] || 0) + qty;
        skuRev[sku] = (skuRev[sku] || 0) + qty * (parseFloat(it.price)||0);
    }));
    const topSku = Object.entries(skuQty).sort((a,b) => b[1] - a[1]).slice(0, 10);
    document.getElementById('dashTopSkus').innerHTML = topSku.map(([sku, qty], i) => {
        const p = masterProducts.find(p => p.sku === sku);
        const name = p ? (p.name || '').slice(0, 35) : '-';
        return `<tr><td style="font-weight:bold; color:#666;">#${i+1}</td><td style="font-family:monospace; font-size:10px;">${sku}</td><td>${name}</td><td style="text-align:right; font-weight:bold;">${qty}</td><td style="text-align:right; color:#666;">${(skuRev[sku]||0).toFixed(0)}</td></tr>`;
    }).join('') || '<tr><td colspan="5" style="text-align:center; color:#999;">No sales.</td></tr>';

    // Top staff
    const staffStats = {};
    positives.forEach(s => {
        const sn = s.staff_name || '(Unassigned)';
        if(!staffStats[sn]) staffStats[sn] = { rev:0, orders:0 };
        staffStats[sn].rev += (s.total||0);
        staffStats[sn].orders++;
    });
    const topStaff = Object.entries(staffStats).sort((a,b) => b[1].rev - a[1].rev).slice(0, 8);
    document.getElementById('dashTopStaff').innerHTML = topStaff.map(([name, st], i) =>
        `<tr><td style="font-weight:bold; color:#666;">#${i+1}</td><td>${name}</td><td style="text-align:right;">${st.orders}</td><td style="text-align:right; font-weight:bold;">${st.rev.toFixed(0)}</td></tr>`
    ).join('') || '<tr><td colspan="4" style="text-align:center; color:#999;">No sales.</td></tr>';

    // Low stock
    const low = [];
    masterProducts.forEach(p => {
        const stock = inventoryBatches.filter(b => b.sku === p.sku).reduce((s, b) => s + (b.qty_remaining||0), 0);
        const rp = p.reorder_point || 10;
        if(stock < rp && skuQty[p.sku]) low.push({ sku:p.sku, name:p.name, stock, rp, recent:skuQty[p.sku] });
    });
    low.sort((a,b) => b.recent - a.recent);
    document.getElementById('dashLowStock').innerHTML = low.slice(0, 8).map(it =>
        `<tr><td style="font-family:monospace; font-size:10px;">${it.sku}</td><td>${(it.name||'').slice(0, 28)}</td><td style="text-align:right; color:#DC2626; font-weight:bold;">${it.stock}/${it.rp}</td></tr>`
    ).join('') || '<tr><td colspan="3" style="text-align:center; color:#10B981;">✓ Semua healthy.</td></tr>';

    // Top customers
    const custStats = {};
    positives.forEach(s => {
        const key = s.customer_phone || s.customer_name;
        if(!key || key === 'Walk-In') return;
        if(!custStats[key]) custStats[key] = { name:s.customer_name||'Unknown', spend:0, orders:0 };
        custStats[key].spend += (s.total||0);
        custStats[key].orders++;
    });
    const topCust = Object.values(custStats).sort((a,b) => b.spend - a.spend).slice(0, 10);
    document.getElementById('dashTopCustomers').innerHTML = topCust.map((c, i) =>
        `<tr><td style="font-weight:bold; color:#666;">#${i+1}</td><td>${(c.name||'').slice(0, 30)}</td><td style="text-align:right;">${c.orders}</td><td style="text-align:right; font-weight:bold;">${c.spend.toFixed(0)}</td></tr>`
    ).join('') || '<tr><td colspan="4" style="text-align:center; color:#999;">No data.</td></tr>';

    // Cohort: new customers per month
    const monthSet = {};
    if(typeof customersData !== 'undefined') {
        customersData.forEach(c => {
            if(!c.created_at) return;
            const m = c.created_at.slice(0, 7);
            monthSet[m] = (monthSet[m] || 0) + 1;
        });
    }
    const sortedMonths = Object.entries(monthSet).sort((a,b) => b[0].localeCompare(a[0])).slice(0, 8);
    document.getElementById('dashCohort').innerHTML = sortedMonths.map(([m, n]) =>
        `<tr><td>${m}</td><td style="text-align:right; font-weight:bold;">${n} new</td></tr>`
    ).join('') || '<tr><td colspan="2" style="text-align:center; color:#999;">No data.</td></tr>';
};

function drawRevenueChart(canvas, sales, cutoff) {
    const ctx = canvas.getContext('2d');
    canvas.width = canvas.offsetWidth * 2;
    canvas.height = 240 * 2;
    canvas.style.height = '240px';
    ctx.scale(2, 2);
    const W = canvas.offsetWidth, H = 240;
    ctx.clearRect(0, 0, W, H);

    if(sales.length === 0) {
        ctx.fillStyle = '#9CA3AF'; ctx.font = '14px sans-serif'; ctx.textAlign = 'center';
        ctx.fillText('No data for this period', W/2, H/2); return;
    }

    // Bucket by day
    const dayMap = {};
    sales.forEach(s => {
        const dt = s.created_at ? new Date(s.created_at).toISOString().slice(0,10) : null;
        if(!dt) return;
        dayMap[dt] = (dayMap[dt] || 0) + (s.total||0);
    });
    const days = Object.keys(dayMap).sort();
    const maxRev = Math.max(...Object.values(dayMap), 1);

    // Axes + line
    const padL = 50, padR = 20, padT = 20, padB = 30;
    const plotW = W - padL - padR, plotH = H - padT - padB;
    ctx.strokeStyle = '#E5E7EB'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(padL, padT); ctx.lineTo(padL, H-padB); ctx.lineTo(W-padR, H-padB); ctx.stroke();

    // Grid + Y labels
    ctx.fillStyle = '#9CA3AF'; ctx.font = '10px sans-serif'; ctx.textAlign = 'right';
    for(let i = 0; i <= 4; i++) {
        const y = padT + plotH * (1 - i/4);
        const v = maxRev * i / 4;
        ctx.fillText('RM ' + v.toFixed(0), padL - 6, y + 3);
        ctx.strokeStyle = '#F3F4F6';
        ctx.beginPath(); ctx.moveTo(padL, y); ctx.lineTo(W-padR, y); ctx.stroke();
    }

    // Line
    if(days.length > 1) {
        ctx.strokeStyle = '#CD7C32'; ctx.lineWidth = 2;
        ctx.beginPath();
        days.forEach((d, i) => {
            const x = padL + plotW * i / (days.length - 1);
            const y = padT + plotH * (1 - dayMap[d] / maxRev);
            if(i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        });
        ctx.stroke();
        // Fill area
        ctx.fillStyle = 'rgba(205, 124, 50, 0.1)';
        ctx.lineTo(padL + plotW, H - padB);
        ctx.lineTo(padL, H - padB);
        ctx.closePath(); ctx.fill();
    }

    // X labels (first / mid / last)
    ctx.fillStyle = '#666'; ctx.textAlign = 'center';
    if(days.length) {
        ctx.fillText(days[0].slice(5), padL, H - padB + 16);
        ctx.fillText(days[days.length-1].slice(5), padL + plotW, H - padB + 16);
        if(days.length > 5) {
            const mid = Math.floor(days.length / 2);
            ctx.fillText(days[mid].slice(5), padL + plotW/2, H - padB + 16);
        }
    }
}

// ============= p4_4 LOW STOCK PUSH NOTIFICATIONS =============
window.checkLowStockNotify = async function() {
    if(!('Notification' in window)) return;
    const enabled = localStorage.getItem('lowStockNotifyEnabled_v1') === 'true';
    if(!enabled || Notification.permission !== 'granted') return;
    const lastNotify = parseInt(localStorage.getItem('lowStockLastNotify_v1') || '0');
    if(Date.now() - lastNotify < 4 * 60 * 60 * 1000) return;  // throttle 4hr

    const low = masterProducts.filter(p => {
        const stock = inventoryBatches.filter(b => b.sku === p.sku).reduce((s, b) => s + (b.qty_remaining||0), 0);
        const rp = p.reorder_point || 10;
        return isPublished(p) && stock < rp;
    });
    if(low.length === 0) return;

    new Notification('⚠️ 10 CAMP — Low Stock Alert', {
        body: `${low.length} produk bawah reorder point. Top 3: ${low.slice(0,3).map(p => p.sku).join(', ')}`,
        icon: 'https://placehold.co/64x64?text=10C',
        tag: 'low-stock'
    });
    localStorage.setItem('lowStockLastNotify_v1', String(Date.now()));
};

window.requestNotifyPermission = async function() {
    if(!('Notification' in window)) return showToast('Browser tak support notification', 'warn');
    const r = await Notification.requestPermission();
    if(r === 'granted') {
        localStorage.setItem('lowStockNotifyEnabled_v1', 'true');
        showToast('Low stock notifications enabled. Akan check setiap 4 jam.', 'success');
        checkLowStockNotify();
    } else {
        showToast('Permission denied. Boleh enable balik dari browser settings.', 'warn');
    }
};

// ============= SC1 p4_2 ROSTER ↔ ATTENDANCE RECONCILIATION =============
window.renderRosterRecon = async function() {
    const tbody = document.getElementById('rrTbody');
    if(!tbody) return;

    // Default date range: last 30 days
    const fromEl = document.getElementById('rrFromDate');
    const toEl = document.getElementById('rrToDate');
    if(fromEl && !fromEl.value) {
        const d = new Date(); d.setDate(d.getDate() - 30);
        fromEl.value = d.toISOString().slice(0,10);
    }
    if(toEl && !toEl.value) toEl.value = new Date().toISOString().slice(0,10);

    const fromDate = fromEl?.value || '';
    const toDate = toEl?.value || '';
    const filterStaff = document.getElementById('rrStaff')?.value || '';

    let rosters = [], attendance = [];
    try {
        const r1 = await db.from('roster_schedules').select('*');
        const r2 = await db.from('staff_attendance').select('*');
        rosters = r1.data || [];
        attendance = r2.data || [];
    } catch(e) {
        tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; color:#999;">Error: ${e.message}</td></tr>`;
        return;
    }

    // Populate staff filter
    const staffSel = document.getElementById('rrStaff');
    if(staffSel && staffSel.options.length <= 1) {
        const names = [...new Set([...rosters, ...attendance].map(r => r.staff_name).filter(Boolean))].sort();
        staffSel.innerHTML = '<option value="">Semua</option>' + names.map(n => `<option value="${n}">${n}</option>`).join('');
    }

    // Build per-day-per-staff records
    const byKey = {};
    rosters.forEach(r => {
        const date = (r.shift_date || r.date || '').slice(0, 10);
        if(!date) return;
        if(fromDate && date < fromDate) return;
        if(toDate && date > toDate) return;
        if(filterStaff && r.staff_name !== filterStaff) return;
        const key = `${date}|${r.staff_name||''}`;
        if(!byKey[key]) byKey[key] = { date, staff:r.staff_name||'-', plan:null, in:null, out:null };
        byKey[key].plan = `${r.shift_start||r.start||'09:00'}–${r.shift_end||r.end||'18:00'}`;
    });
    attendance.forEach(a => {
        const date = (a.attendance_date || a.created_at || '').slice(0, 10);
        if(!date) return;
        if(fromDate && date < fromDate) return;
        if(toDate && date > toDate) return;
        if(filterStaff && a.staff_name !== filterStaff) return;
        const key = `${date}|${a.staff_name||''}`;
        if(!byKey[key]) byKey[key] = { date, staff:a.staff_name||'-', plan:null, in:null, out:null };
        byKey[key].in = a.check_in || a.clock_in || null;
        byKey[key].out = a.check_out || a.clock_out || null;
    });

    const rows = Object.values(byKey).sort((a,b) => b.date.localeCompare(a.date));
    let onTime = 0, late = 0, noShow = 0, unscheduled = 0;
    rows.forEach(r => {
        if(r.plan && !r.in) { r.status = 'NO-SHOW'; noShow++; }
        else if(!r.plan && r.in) { r.status = 'UNSCHEDULED'; unscheduled++; }
        else if(r.plan && r.in) {
            const planStart = (r.plan.split('–')[0] || '09:00').slice(0, 5);
            const inTime = (r.in.match(/\d{2}:\d{2}/) || ['09:00'])[0];
            if(inTime > planStart) { r.status = 'LATE'; late++; }
            else { r.status = 'ON-TIME'; onTime++; }
        } else { r.status = '-'; }
    });

    document.getElementById('rrSummary').innerHTML = `
        <div style="background:#F0FDF4; padding:10px; border-radius:6px;"><div style="font-size:10px; color:#166534;">On-Time</div><div style="font-size:18px; font-weight:bold;">${onTime}</div></div>
        <div style="background:#FEF3C7; padding:10px; border-radius:6px;"><div style="font-size:10px; color:#92400E;">Late</div><div style="font-size:18px; font-weight:bold;">${late}</div></div>
        <div style="background:#FEE2E2; padding:10px; border-radius:6px;"><div style="font-size:10px; color:#991B1B;">No-Show</div><div style="font-size:18px; font-weight:bold;">${noShow}</div></div>
        <div style="background:#EFF6FF; padding:10px; border-radius:6px;"><div style="font-size:10px; color:#1E40AF;">Unscheduled</div><div style="font-size:18px; font-weight:bold;">${unscheduled}</div></div>
        <div style="background:#FAF5FF; padding:10px; border-radius:6px;"><div style="font-size:10px; color:#6B21A8;">Total Days</div><div style="font-size:18px; font-weight:bold;">${rows.length}</div></div>
    `;

    if(rows.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; color:#999;">Tiada data dalam tempoh ini. (Roster + Attendance kena ada data dulu.)</td></tr>';
        return;
    }

    tbody.innerHTML = rows.slice(0, 200).map(r => {
        const colors = {
            'ON-TIME':     { bg:'#D1FAE5', fg:'#065F46' },
            'LATE':        { bg:'#FEF3C7', fg:'#92400E' },
            'NO-SHOW':     { bg:'#FEE2E2', fg:'#991B1B' },
            'UNSCHEDULED': { bg:'#DBEAFE', fg:'#1E40AF' },
            '-':           { bg:'#F3F4F6', fg:'#6B7280' }
        };
        const c = colors[r.status] || colors['-'];
        return `<tr><td>${r.date}</td><td>${r.staff}</td><td style="font-family:monospace; font-size:11px;">${r.plan||'-'}</td><td>${r.in||'-'}</td><td>${r.out||'-'}</td><td>${r.plan && r.in ? 'auto' : '-'}</td><td><span style="background:${c.bg}; color:${c.fg}; padding:2px 8px; border-radius:4px; font-weight:bold; font-size:10px;">${r.status}</span></td></tr>`;
    }).join('');
};

// =============================================================
// SPRINT B — GROWTH & LOYALTY
// =============================================================

// ============= p7_1 TIERED LOYALTY =============
// Tier rules: Bronze (3-9 orders), Silver (10-29), Gold (30+).
// Discount % per tier configurable in settings (defaults: 3 / 5 / 10).
window.getCustomerTier = function(customer) {
    const orders = customer ? (customer.total_orders || 0) : 0;
    if(orders >= 30) return 'Gold';
    if(orders >= 10) return 'Silver';
    if(orders >= 3)  return 'Bronze';
    return null;
};

window.getTierDiscount = function(tier) {
    try {
        const s = JSON.parse(localStorage.getItem('complianceSettings_v1') || '{}');
        const t = s.tiers || {};
        const defaults = { Bronze: 3, Silver: 5, Gold: 10 };
        return parseFloat(t[tier]) || defaults[tier] || 0;
    } catch(e) { return 0; }
};

window.getTierColor = function(tier) {
    const map = {
        Bronze: { bg:'#FED7AA', fg:'#9A3412', emoji:'🥉' },
        Silver: { bg:'#E5E7EB', fg:'#374151', emoji:'🥈' },
        Gold:   { bg:'#FEF3C7', fg:'#92400E', emoji:'🥇' }
    };
    return map[tier] || { bg:'#E5E7EB', fg:'#6B7280', emoji:'•' };
};

// Override checkoutVipLookup to use tier system
const __originalCheckoutVipLookup = window.checkoutVipLookup;
window.checkoutVipLookup = function() {
    const nameEl = document.getElementById('customerName');
    const phoneEl = document.getElementById('customerPhone');
    const badge = document.getElementById('checkoutVipBadge');
    if(!badge) return;

    const name = (nameEl?.value || '').trim().toLowerCase();
    const phoneRaw = (phoneEl?.value || '').trim();
    const phone = (typeof normalisePhoneForMatch === 'function') ? normalisePhoneForMatch(phoneRaw) : phoneRaw;

    let match = null;
    if(typeof customersData !== 'undefined') {
        if(phone) match = customersData.find(c => c.phone === phone);
        if(!match && name && name.length >= 3) match = customersData.find(c => (c.name || '').toLowerCase() === name);
    }

    window.__currentCheckoutVip = null;
    if(!match) {
        badge.style.display = 'none';
        recomputeCheckoutTotal();
        return;
    }

    const tier = getCustomerTier(match);
    if(tier) {
        const pct = getTierDiscount(tier);
        const c = getTierColor(tier);
        window.__currentCheckoutVip = {
            customer_id: match.id,
            customer_name: match.name,
            customer_phone: match.phone,
            tier, discount_pct: pct,
            total_orders: match.total_orders || 0,
            total_spent: match.total_spent || 0
        };
        badge.style.background = c.bg;
        badge.style.color = c.fg;
        badge.style.border = `2px solid ${c.fg}`;
        badge.style.display = 'block';
        badge.innerHTML = `${c.emoji} <strong>${tier.toUpperCase()} TIER</strong> · ${match.name} · ${match.total_orders} orders · RM${(match.total_spent||0).toFixed(0)} spent — auto-discount <strong>${pct}%</strong> applied`;
    } else {
        const orders = match.total_orders || 0;
        const need = 3 - orders;
        badge.style.background = '#EFF6FF';
        badge.style.color = '#1E40AF';
        badge.style.border = '1px solid #BFDBFE';
        badge.style.display = 'block';
        badge.innerHTML = `👤 ${match.name} · ${orders} order(s) · ${need > 0 ? need + ' more order to unlock 🥉 Bronze' : 'qualifies next checkout'}`;
    }
    recomputeCheckoutTotal();
};

// ============= p7_3 PROMO ENGINE (rules-based) =============
let __activePromos = [];

window.loadPromotions = async function() {
    try {
        const { data } = await db.from('promotions').select('*').eq('active', true);
        __activePromos = data || [];
    } catch(e) { __activePromos = []; }
};

window.evaluatePromos = function(cart, customer) {
    if(!cart || cart.length === 0) return [];
    const today = new Date().toISOString().slice(0, 10);
    const cartTotal = cart.reduce((s, it) => s + (it.qty||it.quantity||1) * (it.price||0), 0);
    const cartQty = cart.reduce((s, it) => s + (it.qty||it.quantity||1), 0);
    const tier = customer ? getCustomerTier(customer) : null;

    const eligible = [];
    __activePromos.forEach(p => {
        if(!p.active) return;
        if(p.start_date && p.start_date > today) return;
        if(p.end_date && p.end_date < today) return;
        if(p.max_uses && (p.uses_count || 0) >= p.max_uses) return;
        if(p.min_spend && cartTotal < p.min_spend) return;
        if(p.min_qty && cartQty < p.min_qty) return;
        if(p.customer_tier && p.customer_tier !== tier) return;

        // Compute discount based on scope
        let discount = 0;
        const dv = parseFloat(p.discount_value) || 0;
        const matchItems = (p.scope === 'cart_total')
            ? cart
            : cart.filter(it => {
                if(p.scope === 'sku')      return (it.sku || '').toUpperCase() === (p.scope_value || '').toUpperCase();
                if(p.scope === 'brand') {
                    const prod = masterProducts.find(m => m.sku === it.sku);
                    return prod && (prod.brand || '').toLowerCase() === (p.scope_value || '').toLowerCase();
                }
                if(p.scope === 'category') {
                    const prod = masterProducts.find(m => m.sku === it.sku);
                    return prod && (prod.category || '').toLowerCase() === (p.scope_value || '').toLowerCase();
                }
                return false;
            });
        if(matchItems.length === 0 && p.scope !== 'cart_total') return;

        const matchTotal = matchItems.reduce((s, it) => s + (it.qty||it.quantity||1) * (it.price||0), 0);

        if(p.discount_type === 'percent') {
            discount = matchTotal * dv / 100;
        } else if(p.discount_type === 'fixed') {
            discount = Math.min(dv, matchTotal);
        } else if(p.discount_type === 'bogo') {
            // Buy 1 get 1 — half the qty pairs get free
            const matchQty = matchItems.reduce((s, it) => s + (it.qty||it.quantity||1), 0);
            const freeQty = Math.floor(matchQty / 2);
            const avgPrice = matchTotal / matchQty;
            discount = freeQty * avgPrice;
        }

        if(discount > 0) {
            eligible.push({ promo: p, discount, applies_to: p.scope, value_target: p.scope_value });
        }
    });

    // Sort by priority (lower number = higher priority) then by discount desc
    eligible.sort((a, b) => (a.promo.priority||100) - (b.promo.priority||100) || b.discount - a.discount);
    return eligible;
};

// ============= p7_4 CUSTOMER SEGMENTS / RFM =============
window.renderSegments = function() {
    if(typeof customersData === 'undefined' || typeof salesHistory === 'undefined') return;

    // RFM compute
    const now = Date.now();
    const customerAgg = {};
    salesHistory.filter(s => (s.total||0) > 0).forEach(s => {
        const key = s.customer_phone || s.customer_name;
        if(!key || key === 'Walk-In') return;
        if(!customerAgg[key]) customerAgg[key] = { phone:s.customer_phone, name:s.customer_name||'-', orders:0, spent:0, lastOrder:null };
        customerAgg[key].orders++;
        customerAgg[key].spent += (s.total||0);
        if(!customerAgg[key].lastOrder || (s.created_at||'') > customerAgg[key].lastOrder) customerAgg[key].lastOrder = s.created_at;
    });

    // Classify per RFM
    const buckets = {
        'Champion':            { desc:'High recency + freq + spend', filter:c => daysSince(c.lastOrder) < 60 && c.orders >= 5 && c.spent >= 1000 },
        'Loyal':               { desc:'Frequent + recent', filter:c => daysSince(c.lastOrder) < 90 && c.orders >= 3 },
        'Potential Loyalist':  { desc:'Recent but low frequency', filter:c => daysSince(c.lastOrder) < 60 && c.orders < 3 },
        'New Customer':        { desc:'1 order, recent', filter:c => c.orders === 1 && daysSince(c.lastOrder) < 30 },
        'At Risk':             { desc:'Last bought 90-180 days ago', filter:c => daysSince(c.lastOrder) >= 90 && daysSince(c.lastOrder) < 180 && c.orders >= 2 },
        'Hibernating':         { desc:'Inactive 180+ days', filter:c => daysSince(c.lastOrder) >= 180 },
    };

    const segmentMap = {};
    Object.keys(buckets).forEach(k => segmentMap[k] = []);

    Object.values(customerAgg).forEach(c => {
        for(const [name, b] of Object.entries(buckets)) {
            if(b.filter(c)) { segmentMap[name].push(c); break; }
        }
    });

    // Stats cards
    const totalCust = Object.values(customerAgg).length;
    const totalSpent = Object.values(customerAgg).reduce((s, c) => s + c.spent, 0);
    const totalOrders = Object.values(customerAgg).reduce((s, c) => s + c.orders, 0);
    const avgAOV = totalOrders > 0 ? totalSpent / totalOrders : 0;
    document.getElementById('segStats').innerHTML = `
        <div style="background:#EFF6FF; padding:10px; border-radius:6px;"><div style="font-size:10px; color:#1E40AF;">Active Customers</div><div style="font-size:18px; font-weight:bold;">${totalCust}</div></div>
        <div style="background:#F0FDF4; padding:10px; border-radius:6px;"><div style="font-size:10px; color:#166534;">Total Spent</div><div style="font-size:18px; font-weight:bold;">RM ${totalSpent.toLocaleString(undefined,{maximumFractionDigits:0})}</div></div>
        <div style="background:#FEF3C7; padding:10px; border-radius:6px;"><div style="font-size:10px; color:#92400E;">Avg Order Value</div><div style="font-size:18px; font-weight:bold;">RM ${avgAOV.toFixed(2)}</div></div>
        <div style="background:#FAF5FF; padding:10px; border-radius:6px;"><div style="font-size:10px; color:#6B21A8;">Champions</div><div style="font-size:18px; font-weight:bold;">${segmentMap['Champion'].length}</div></div>
        <div style="background:#FEE2E2; padding:10px; border-radius:6px;"><div style="font-size:10px; color:#991B1B;">At Risk + Hibernating</div><div style="font-size:18px; font-weight:bold;">${segmentMap['At Risk'].length + segmentMap['Hibernating'].length}</div></div>
    `;

    // RFM table
    const segColors = {
        'Champion':           '#10B981',
        'Loyal':              '#3B82F6',
        'Potential Loyalist': '#A855F7',
        'New Customer':       '#F59E0B',
        'At Risk':            '#EF4444',
        'Hibernating':        '#9CA3AF'
    };
    document.getElementById('segRfmTbody').innerHTML = Object.entries(segmentMap).map(([name, list]) => {
        const spend = list.reduce((s, c) => s + c.spent, 0);
        const orders = list.reduce((s, c) => s + c.orders, 0);
        const aov = orders > 0 ? spend / orders : 0;
        return `<tr>
            <td><span style="background:${segColors[name]}; color:#FFF; padding:2px 8px; border-radius:50px; font-weight:bold; font-size:10px;">${name}</span><br><span style="font-size:10px; color:#888;">${buckets[name].desc}</span></td>
            <td style="text-align:right; font-weight:bold;">${list.length}</td>
            <td style="text-align:right;">RM ${spend.toFixed(0)}</td>
            <td style="text-align:right;">RM ${aov.toFixed(2)}</td>
        </tr>`;
    }).join('');

    // Cohort
    const cohort = {};
    customersData.forEach(c => {
        if(!c.created_at) return;
        const m = c.created_at.slice(0, 7);
        if(!cohort[m]) cohort[m] = { count:0, spent:0 };
        cohort[m].count++;
        cohort[m].spent += (c.total_spent||0);
    });
    const sortedCohort = Object.entries(cohort).sort((a,b) => b[0].localeCompare(a[0])).slice(0, 12);
    document.getElementById('segCohortTbody').innerHTML = sortedCohort.map(([m, d]) =>
        `<tr><td>${m}</td><td style="text-align:right;">${d.count}</td><td style="text-align:right;">RM ${d.spent.toFixed(0)}</td><td style="text-align:right;">RM ${(d.spent / d.count).toFixed(2)}</td></tr>`
    ).join('') || '<tr><td colspan="4" style="text-align:center; color:#999;">No data.</td></tr>';

    // Top 20
    const top = Object.values(customerAgg).sort((a,b) => b.spent - a.spent).slice(0, 20);
    document.getElementById('segTopTbody').innerHTML = top.map((c, i) => {
        // tier
        const cust = customersData.find(cu => cu.phone === c.phone || cu.name === c.name);
        const tier = getCustomerTier(cust);
        const tierBadge = tier ? `<span style="background:${getTierColor(tier).bg}; color:${getTierColor(tier).fg}; padding:1px 6px; border-radius:50px; font-weight:bold; font-size:10px;">${getTierColor(tier).emoji} ${tier}</span>` : '-';
        const aov = c.orders > 0 ? c.spent / c.orders : 0;
        const lastDate = c.lastOrder ? c.lastOrder.slice(0, 10) : '-';
        return `<tr>
            <td><strong>#${i+1}</strong></td>
            <td>${(c.name||'').slice(0, 40)}</td>
            <td style="font-family:monospace; font-size:11px;">${c.phone||'-'}</td>
            <td>${tierBadge}</td>
            <td style="text-align:right;">${c.orders}</td>
            <td style="text-align:right; font-weight:bold;">${c.spent.toFixed(2)}</td>
            <td style="text-align:right;">${aov.toFixed(2)}</td>
            <td style="font-size:11px;">${lastDate}</td>
        </tr>`;
    }).join('');
};

function daysSince(iso) {
    if(!iso) return 999999;
    return Math.floor((Date.now() - new Date(iso).getTime()) / (24*60*60*1000));
}

// ============= p7_5 FESTIVAL TEMPLATES =============
const FESTIVAL_TEMPLATES = [
    { id:'raya',    label:'🌙 Hari Raya Aidilfitri',    code:'RAYA2026',    type:'percent', value:20, scope:'cart_total', minSpend:200, desc:'Diskaun 20% sempena Raya untuk pembelian melebihi RM200' },
    { id:'cny',     label:'🧧 Chinese New Year',        code:'CNY2026',     type:'percent', value:15, scope:'cart_total', minSpend:150, desc:'Diskaun 15% sempena CNY untuk pembelian melebihi RM150' },
    { id:'depavali',label:'🪔 Deepavali',                code:'DEEPAVALI',   type:'percent', value:15, scope:'cart_total', minSpend:150, desc:'Diskaun 15% sempena Deepavali' },
    { id:'merdeka', label:'🇲🇾 Hari Merdeka',           code:'MERDEKA31',   type:'percent', value:31, scope:'cart_total', minSpend:300, desc:'31% off sempena Merdeka untuk pembelian melebihi RM300' },
    { id:'malaysia',label:'🇲🇾 Hari Malaysia',          code:'MALAYSIA16',  type:'percent', value:16, scope:'cart_total', minSpend:200, desc:'16% off sempena Hari Malaysia' },
    { id:'xmas',    label:'🎄 Christmas',                code:'XMAS2026',    type:'fixed',   value:50, scope:'cart_total', minSpend:300, desc:'RM50 off sempena Christmas untuk pembelian melebihi RM300' },
    { id:'newyear', label:'🎉 New Year',                 code:'NY2026',      type:'percent', value:10, scope:'cart_total', desc:'10% off New Year sale' },
    { id:'pekerja', label:'💼 Hari Pekerja',             code:'WORKER',      type:'fixed',   value:30, scope:'cart_total', minSpend:200, desc:'RM30 off Hari Pekerja' },
    { id:'campday', label:'🏕️ 10 CAMP Anniversary',      code:'TENCAMP',     type:'percent', value:10, scope:'cart_total', desc:'10% off semua sempena anniversary 10 CAMP' },
];

window.openFestivalTemplates = function() {
    const html = `
        <div id="festOverlay" class="login-overlay" style="display:flex; z-index:3700;">
            <div class="login-box" style="max-width:760px; width:96%; padding:24px;">
                <button onclick="document.getElementById('festOverlay').remove()" style="float:right; border:none; background:none; font-size:24px; cursor:pointer; color:var(--text-muted);">×</button>
                <h2 style="margin:0 0 8px;">🎉 Festival Promo Templates</h2>
                <p style="font-size:13px; color:#666; margin-bottom:14px;">One-click recipe untuk promo festival. Klik "Add" untuk insert ke promotions table sebagai inactive — pergi Promotions section untuk activate.</p>
                <div style="max-height:520px; overflow-y:auto; display:grid; grid-template-columns:1fr 1fr; gap:10px;">
                    ${FESTIVAL_TEMPLATES.map(t => `
                        <div style="background:#FFF; border:1px solid var(--border-color); border-radius:8px; padding:14px;">
                            <h4 style="margin:0 0 4px; font-size:14px;">${t.label}</h4>
                            <p style="font-size:11px; color:#666; margin:0 0 8px; min-height:30px;">${t.desc}</p>
                            <div style="font-size:11px; margin-bottom:8px;">
                                <span style="background:#F3F4F6; padding:1px 6px; border-radius:3px; font-family:monospace;">${t.code}</span>
                                · ${t.type === 'percent' ? t.value + '%' : 'RM' + t.value}
                                ${t.minSpend ? ' · min RM' + t.minSpend : ''}
                            </div>
                            <button class="btn-success" style="width:100%; padding:6px; font-size:11px; margin:0;" onclick="window.applyFestivalTemplate('${t.id}')">+ Add to Promotions</button>
                        </div>
                    `).join('')}
                </div>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', html);
};

window.applyFestivalTemplate = async function(id) {
    const t = FESTIVAL_TEMPLATES.find(x => x.id === id);
    if(!t) return;
    try {
        const { error } = await db.from('promotions').insert([{
            code: t.code,
            discount_type: t.type,
            discount_value: t.value,
            scope: t.scope,
            min_spend: t.minSpend || null,
            description: t.desc,
            active: false  // start inactive — admin must enable
        }]);
        if(error) throw error;
        showToast(`${t.label} added (inactive). Activate dari Promotions.`, 'success');
        await loadPromotions();
    } catch(e) {
        showToast('Ralat: ' + e.message, 'error');
    }
};

// Promo Engine — improved Promotions section render
window.renderPromotionsV2 = async function() {
    const tbody = document.getElementById('promotionsTableBody');
    if(!tbody) return;
    try {
        const { data: promos } = await db.from('promotions').select('*').order('priority').order('id', {ascending:false});
        if(!promos || promos.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; color:#999;">Tiada promo. Klik "+ Festival Templates" untuk add satu set.</td></tr>';
            return;
        }
        tbody.innerHTML = promos.map(p => {
            const today = new Date().toISOString().slice(0, 10);
            const isLive = p.active && (!p.start_date || p.start_date <= today) && (!p.end_date || p.end_date >= today);
            const valDisp = p.discount_type === 'percent' ? p.discount_value + '%' : (p.discount_type === 'fixed' ? 'RM' + parseFloat(p.discount_value).toFixed(2) : 'BOGO');
            const cond = [];
            if(p.scope && p.scope !== 'cart_total') cond.push(`${p.scope}=${p.scope_value||'-'}`);
            if(p.min_spend) cond.push(`min RM${p.min_spend}`);
            if(p.min_qty) cond.push(`${p.min_qty}+ items`);
            if(p.customer_tier) cond.push(`${p.customer_tier} tier`);
            const condStr = cond.length ? cond.join(' · ') : 'all carts';
            return `<tr>
                <td><strong>${p.code||'-'}</strong><br><span style="font-size:10px; color:#666;">${p.description||''}</span></td>
                <td>${p.discount_type||'-'}<br><span style="font-size:10px; color:#666;">${condStr}</span></td>
                <td style="font-weight:bold;">${valDisp}</td>
                <td>
                    ${isLive ? '<span style="color:#10B981; font-weight:bold;">🟢 Active</span>' : (p.active ? '<span style="color:#F59E0B;">⏰ Scheduled</span>' : '<span style="color:#9CA3AF;">⚪ Inactive</span>')}
                    <br><button onclick="window.togglePromoActive(${p.id}, ${!p.active})" class="btn-primary" style="font-size:10px; padding:2px 8px; margin-top:4px;">${p.active ? 'Disable' : 'Enable'}</button>
                </td>
            </tr>`;
        }).join('');
    } catch(e) {
        tbody.innerHTML = `<tr><td colspan="4" style="color:#DC2626;">Error: ${e.message}</td></tr>`;
    }
};

window.togglePromoActive = async function(id, newState) {
    try {
        await db.from('promotions').update({ active: newState }).eq('id', id);
        showToast(`Promo ${newState ? 'enabled' : 'disabled'}`, 'success');
        await loadPromotions();
        renderPromotionsV2();
    } catch(e) { showToast('Ralat: ' + e.message, 'error'); }
};

// Override the old renderPromotions
window.renderPromotions = window.renderPromotionsV2;

// =============================================================
// SPRINT C — CLOSE THE LOOP
// =============================================================

// ============= SC2 p4_5 EOD CLOSE / DAILY Z-REPORT =============
window.openEodClose = async function() {
    const today = new Date().toISOString().slice(0, 10);
    const todaySales = (salesHistory || []).filter(s => (s.created_at||'').slice(0, 10) === today);

    if(todaySales.length === 0) {
        return showToast('Tiada transaksi hari ini.', 'warn');
    }

    // Aggregate
    const positives = todaySales.filter(s => (s.total||0) > 0);
    const refunds = todaySales.filter(s => (s.total||0) < 0);
    const totalRev = positives.reduce((s, x) => s + (x.total||0), 0);
    const refundTotal = Math.abs(refunds.reduce((s, x) => s + (x.total||0), 0));
    const netRev = totalRev - refundTotal;

    const byPayment = {};
    positives.forEach(s => {
        const pm = s.payment_method || '(Unknown)';
        byPayment[pm] = (byPayment[pm] || 0) + (s.total||0);
    });
    const byChannel = {};
    positives.forEach(s => {
        const ch = s.channel || '(Unknown)';
        byChannel[ch] = (byChannel[ch] || 0) + (s.total||0);
    });
    const byStaff = {};
    positives.forEach(s => {
        const st = s.staff_name || '(Unassigned)';
        if(!byStaff[st]) byStaff[st] = { rev:0, orders:0 };
        byStaff[st].rev += (s.total||0);
        byStaff[st].orders++;
    });

    const detailsHtml = `
        <div style="display:grid; grid-template-columns:1fr 1fr 1fr; gap:6px; font-size:11px;">
            <div><strong>Tarikh:</strong> ${today}</div>
            <div><strong>Orders:</strong> ${positives.length} (+${refunds.length} refunds)</div>
            <div><strong>Net Revenue:</strong> RM ${netRev.toFixed(2)}</div>
        </div>
    `;

    const result = await requireManagerPin({
        title: 'End-of-Day Close',
        subtitle: `Lock ${today} sales — generate Z-report dan rekod ke finance_records.`,
        detailsHtml,
        reasons: ['Closing — normal day', 'Closing — high variance day', 'Closing — manual reconciliation needed', 'Lain-lain']
    });
    if(!result) return;

    // Build Z-report html for printing
    const settings = JSON.parse(localStorage.getItem('complianceSettings_v1') || '{}').shop || {};
    const shopName = settings.name || '10 CAMP STORE';
    const win = window.open('', '_blank', 'width=600,height=900');
    win.document.write(`<!DOCTYPE html><html><head><title>Z-Report ${today}</title>
        <style>
            body { font-family: monospace; padding:20px; max-width:580px; margin:auto; font-size:12px; }
            h1 { font-size:16px; text-align:center; margin:0 0 4px; }
            h2 { font-size:13px; margin:14px 0 4px; border-bottom:2px solid #111; padding-bottom:4px; }
            .row { display:flex; justify-content:space-between; padding:2px 0; }
            .total { font-weight:bold; border-top:2px solid #111; padding-top:4px; margin-top:6px; }
            .meta { font-size:10px; color:#666; text-align:center; margin-bottom:14px; }
            @media print { @page { margin:1cm; } button { display:none; } }
        </style></head><body>
        <h1>${shopName}</h1>
        <p class="meta">Z-REPORT (DAILY CLOSE)</p>
        <p class="meta">${today} · Approved by ${result.manager.name}</p>

        <h2>Summary</h2>
        <div class="row"><span>Total Orders:</span><span>${positives.length}</span></div>
        <div class="row"><span>Refunds:</span><span>${refunds.length}</span></div>
        <div class="row"><span>Gross Revenue:</span><span>RM ${totalRev.toFixed(2)}</span></div>
        <div class="row"><span>Refund Total:</span><span>−RM ${refundTotal.toFixed(2)}</span></div>
        <div class="row total"><span>NET REVENUE:</span><span>RM ${netRev.toFixed(2)}</span></div>

        <h2>By Payment Method</h2>
        ${Object.entries(byPayment).map(([k, v]) => `<div class="row"><span>${k}</span><span>RM ${v.toFixed(2)}</span></div>`).join('')}

        <h2>By Channel</h2>
        ${Object.entries(byChannel).map(([k, v]) => `<div class="row"><span>${k}</span><span>RM ${v.toFixed(2)}</span></div>`).join('')}

        <h2>By Staff</h2>
        ${Object.entries(byStaff).map(([k, v]) => `<div class="row"><span>${k} (${v.orders})</span><span>RM ${v.rev.toFixed(2)}</span></div>`).join('')}

        <h2>Approval Reason</h2>
        <p style="font-size:11px;">${result.reason}${result.note ? ' — '+result.note : ''}</p>

        <p class="meta" style="margin-top:30px;">Generated by 10 CAMP POS · ${new Date().toLocaleString()}</p>
        <button onclick="window.print()" style="margin-top:20px; padding:8px 16px; background:#0EA5E9; color:#FFF; border:none; border-radius:4px; cursor:pointer;">🖨️ Print Z-Report</button>
        </body></html>`);
    win.document.close();

    // Persist to finance_records + audit_logs
    try {
        await db.from('finance_records').insert([{
            month: new Date().toLocaleString('en-MY', { month:'short' }),
            year: new Date().getFullYear(),
            category: 'EOD_CLOSE',
            amount: netRev,
            description: `Z-Report ${today} · ${positives.length} orders · approved by ${result.manager.name}`,
            metadata: { date: today, gross: totalRev, refunds: refundTotal, net: netRev, byPayment, byChannel, byStaff }
        }]);
    } catch(e) { /* finance_records may have different schema; non-blocking */ }

    try {
        await db.from('audit_logs').insert([{
            action_type: 'eod_close',
            actor_name: result.manager.name,
            target_staff: currentUser ? currentUser.name : null,
            details: JSON.stringify({ date:today, orders:positives.length, refunds:refunds.length, net:netRev, reason:result.reason, note:result.note }),
            created_at: new Date().toISOString()
        }]);
    } catch(_){}

    showToast(`Z-Report ${today} generated · approved by ${result.manager.name}`, 'success');
};

// ============= SC3 p8_1+p8_2 IN-APP VELOCITY ANALYSIS =============
window.openVelocityAnalysis = function() {
    if(typeof salesHistory === 'undefined' || !salesHistory.length) {
        return showToast('Tiada sales data. Run velocity selepas ada data.', 'warn');
    }

    // Compute velocity per SKU
    const now = Date.now();
    const window6mo = now - 180 * 24*60*60*1000;
    const skuStats = new Map();
    masterProducts.forEach(p => {
        skuStats.set(p.sku, {
            sku:p.sku, name:p.name, brand:p.brand,
            recent:0, lifetime:0, firstSale:null, lastSale:null,
            stock: 0,
            currentRP: p.reorder_point, currentRQ: p.reorder_qty,
            lead: p.lead_time_days || 14
        });
    });
    inventoryBatches.forEach(b => {
        const st = skuStats.get(b.sku);
        if(st) st.stock += (b.qty_remaining||0);
    });
    salesHistory.filter(s => (s.total||0) > 0).forEach(s => {
        const dt = s.created_at ? new Date(s.created_at).getTime() : 0;
        (s.items || []).forEach(it => {
            const sku = (it.sku||'').toUpperCase();
            const qty = parseFloat(it.qty) || 0;
            const st = skuStats.get(sku);
            if(!st || qty <= 0) return;
            st.lifetime += qty;
            if(dt >= window6mo) st.recent += qty;
            if(!st.firstSale || dt < new Date(st.firstSale).getTime()) st.firstSale = s.created_at;
            if(!st.lastSale || dt > new Date(st.lastSale).getTime()) st.lastSale = s.created_at;
        });
    });
    salesHistory.filter(s => (s.total||0) < 0).forEach(s => {
        (s.items || []).forEach(it => {
            const sku = (it.sku||'').toUpperCase();
            const st = skuStats.get(sku);
            if(st) st.lifetime = Math.max(0, st.lifetime - (parseFloat(it.qty)||0));
        });
    });

    // Compute recommendations
    const SAFETY_FACTOR = 1.5, COVER_MONTHS = 2.0, MIN_RP = 2;
    const recs = [];
    skuStats.forEach(st => {
        let avgMonthly = 0, window = 'no-sales';
        if(st.recent > 0) { avgMonthly = st.recent / 6; window = '6mo'; }
        else if(st.lifetime > 0 && st.firstSale && st.lastSale) {
            const months = Math.max(1, (new Date(st.lastSale) - new Date(st.firstSale)) / (1000*60*60*24*30));
            avgMonthly = st.lifetime / months; window = `lifetime(${Math.round(months)}mo)`;
        }
        let newRP = avgMonthly === 0 ? MIN_RP : Math.max(MIN_RP, Math.ceil(avgMonthly/30 * st.lead * SAFETY_FACTOR));
        let newRQ = avgMonthly === 0 ? 5 : Math.max(MIN_RP, Math.ceil(avgMonthly * COVER_MONTHS));
        const isStale = st.lastSale && (now - new Date(st.lastSale).getTime()) > 180*24*60*60*1000 && st.lifetime > 0;
        if(isStale) { newRP = MIN_RP; newRQ = 5; }
        recs.push({ ...st, avgMonthly, window, newRP, newRQ, isStale, urgent: st.recent > 0 && st.stock < newRP });
    });

    // Stats
    const totalUpdate = recs.length;
    const moving = recs.filter(r => r.recent > 0).length;
    const stale = recs.filter(r => r.isStale).length;
    const urgent = recs.filter(r => r.urgent).length;
    const recsSorted = recs.sort((a, b) => (b.urgent ? 1 : 0) - (a.urgent ? 1 : 0) || b.recent - a.recent);

    const html = `
        <div id="velocityOverlay" class="login-overlay" style="display:flex; z-index:3700;">
            <div class="login-box" style="max-width:880px; width:96%; padding:24px;">
                <button onclick="document.getElementById('velocityOverlay').remove()" style="float:right; border:none; background:none; font-size:24px; cursor:pointer; color:var(--text-muted);">×</button>
                <h2 style="margin:0 0 8px;">📊 Velocity Analysis (in-app)</h2>
                <p style="font-size:12px; color:#666; margin-bottom:14px;">Auto-suggest reorder_point + reorder_qty based on real sales velocity. Window: 6 months recent, fallback to lifetime.</p>

                <div style="display:grid; grid-template-columns:repeat(4, 1fr); gap:8px; margin-bottom:14px;">
                    <div style="background:#EFF6FF; padding:10px; border-radius:6px; text-align:center;"><div style="font-size:10px; color:#1E40AF;">Total SKU</div><div style="font-size:18px; font-weight:bold;">${totalUpdate}</div></div>
                    <div style="background:#F0FDF4; padding:10px; border-radius:6px; text-align:center;"><div style="font-size:10px; color:#166534;">Active (6mo)</div><div style="font-size:18px; font-weight:bold;">${moving}</div></div>
                    <div style="background:#FEF3C7; padding:10px; border-radius:6px; text-align:center;"><div style="font-size:10px; color:#92400E;">Stale (180d+)</div><div style="font-size:18px; font-weight:bold;">${stale}</div></div>
                    <div style="background:#FEE2E2; padding:10px; border-radius:6px; text-align:center;"><div style="font-size:10px; color:#991B1B;">⚠️ Urgent (under-stocked)</div><div style="font-size:18px; font-weight:bold;">${urgent}</div></div>
                </div>

                <div style="max-height:380px; overflow-y:auto; border:1px solid var(--border-color); border-radius:6px; margin-bottom:14px;">
                    <table class="data-table" style="font-size:11px;"><thead style="position:sticky; top:0; background:#FAFAFA;"><tr><th>SKU</th><th>Brand</th><th style="text-align:right;">6mo Qty</th><th style="text-align:right;">Avg/mo</th><th style="text-align:right;">Cur RP</th><th style="text-align:right;">New RP</th><th style="text-align:right;">New RQ</th><th style="text-align:right;">Stock</th></tr></thead><tbody>
                    ${recsSorted.slice(0, 100).map(r => `
                        <tr style="${r.urgent ? 'background:#FEF2F2;' : (r.isStale ? 'color:#9CA3AF;' : '')}">
                            <td><strong>${r.sku}</strong>${r.urgent ? ' ⚠️' : ''}${r.isStale ? ' 💤' : ''}</td>
                            <td>${(r.brand||'-').slice(0, 14)}</td>
                            <td style="text-align:right;">${r.recent.toFixed(0)}</td>
                            <td style="text-align:right;">${r.avgMonthly.toFixed(1)}</td>
                            <td style="text-align:right; color:#666;">${r.currentRP||'-'}</td>
                            <td style="text-align:right; font-weight:bold;">${r.newRP}</td>
                            <td style="text-align:right;">${r.newRQ}</td>
                            <td style="text-align:right; color:${r.stock===0?'#DC2626':'#111'};">${r.stock}</td>
                        </tr>
                    `).join('')}
                    ${recsSorted.length > 100 ? `<tr><td colspan="8" style="text-align:center; color:#666;">+ ${recsSorted.length - 100} lagi (akan diupdate juga)</td></tr>` : ''}
                    </tbody></table>
                </div>

                <div style="background:#FEF3C7; padding:10px; border-radius:6px; margin-bottom:14px; font-size:11px; color:#92400E;">
                    💡 Klik "Apply" untuk update reorder_point + reorder_qty pada ${totalUpdate} produk. Boleh re-run anytime, akan recompute dari latest sales data.
                </div>

                <div style="display:flex; gap:8px;">
                    <button onclick="document.getElementById('velocityOverlay').remove()" class="login-btn" style="background:#6B7280; flex:1;">Tutup</button>
                    <button onclick="window.applyVelocityRecs()" class="login-btn" style="flex:2;">✓ Apply ke ${totalUpdate} Produk</button>
                </div>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', html);
    window.__pendingVelocityRecs = recsSorted;
};

window.applyVelocityRecs = async function() {
    const recs = window.__pendingVelocityRecs || [];
    if(recs.length === 0) return;
    if(!confirm(`Apply velocity recommendations ke ${recs.length} produk?`)) return;

    let ok = 0, fail = 0;
    const chunk = 50;
    for(let i = 0; i < recs.length; i += chunk) {
        const slice = recs.slice(i, i + chunk);
        await Promise.all(slice.map(async r => {
            try {
                await db.from('products_master').update({
                    reorder_point: r.newRP,
                    reorder_qty: r.newRQ,
                    lead_time_days: r.lead
                }).eq('sku', r.sku);
                const p = masterProducts.find(x => x.sku === r.sku);
                if(p) { p.reorder_point = r.newRP; p.reorder_qty = r.newRQ; p.lead_time_days = r.lead; }
                ok++;
            } catch(e) { fail++; }
        }));
    }

    try {
        await db.from('audit_logs').insert([{
            action_type: 'velocity_reorder_applied',
            actor_name: currentUser ? currentUser.name : 'System',
            details: JSON.stringify({ updated:ok, failed:fail, total:recs.length }),
            created_at: new Date().toISOString()
        }]);
    } catch(_){}

    showToast(`Velocity update: ${ok} berjaya, ${fail} gagal`, fail ? 'warn' : 'success');
    document.getElementById('velocityOverlay').remove();
};
