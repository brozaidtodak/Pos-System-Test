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

let pettyCashLedger = [];
let customerIssues = [];
let globalMemo = { active: false, text: "" };

// Staff Scheduling Roster
let staffSchedules = [];
let pendingSchedules = [];

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
    if(sectionIds.includes('packagingSection')) renderPackaging();
    if(sectionIds.includes('mgmtPlaceholders')) renderMgmtPlaceholders();
    if(sectionIds.includes('rosterSection')) renderStaffSchedule();
}
window.switchHub = switchHub;

window.toggleInvForm = function(formId) {
    const f1 = document.getElementById("newSkuForm");
    const f2 = document.getElementById("inboundForm");
    const f3 = document.getElementById("csvForm");
    if(formId === 'newSkuForm') { f1.style.display = 'block'; f2.style.display = 'none'; f3.style.display = 'none';}
    if(formId === 'inboundForm') { f2.style.display = 'block'; f1.style.display = 'none'; f3.style.display = 'none';}
    if(formId === 'csvForm') { f3.style.display = 'block'; f1.style.display = 'none'; f2.style.display = 'none';}
    if(!formId) { f1.style.display = 'none'; f2.style.display = 'none'; f3.style.display = 'none'; }
}

window.togglePosLayoutMode = function() {
    const isMobile = document.body.classList.toggle('pos-mobile-mode');
    localStorage.setItem('posMode', isMobile ? 'mobile' : 'desktop');
}
window.toggleMobileCartSheet = function() {
    const cartSec = document.getElementById('posCartDrawer');
    if(cartSec) cartSec.classList.toggle('drawer-open');
}



async function initApp() {
    try {
        console.log("Loading Cloud Omnichannel Data...");
        let { data: master } = await db.from('products_master').select('*');
        if(master) masterProducts = master;

        let { data: batches } = await db.from('inventory_batches').select('*').order('inbound_date', {ascending: true});
        if(batches) inventoryBatches = batches;

        // RENDER FRONTEND INSTANTLY BEFORE ADMIN BACKEND FETCHES
        renderPublicStorefront();
        renderPOS();

        let { data: sales } = await db.from('sales_history').select('*').order('created_at', {ascending: false});
        if(sales) salesHistory = [...salesHistory, ...sales];

        let { data: custs } = await db.from('customers').select('*');
        if(custs) customersData = [...customersData, ...custs];
        
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
        db.channel('roster-sync-channel')
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

        renderWMS();
        renderHistory();
        renderCustomers();
        renderPromotions();
        renderDashboard();
        if(typeof renderFinance === "function") renderFinance();
        autoClockOutUnclosed();
        if(typeof renderPersonalCommission === "function") renderPersonalCommission();
    } catch(e) {
        alert("Server Error: " + e.message);
    }
}

// ===================================
// ANALYTICS DASHBOARD (FASA 4)
// ===================================
window.renderDashboard = function() {
    const startStr = document.getElementById('dashStartDate').value;
    const endStr = document.getElementById('dashEndDate').value;
    
    // 1. Array Filtering by Date
    let filteredSales = salesHistory;
    if(startStr && endStr) {
        const dStart = new Date(startStr);  
        dStart.setHours(0,0,0,0);
        const dEnd = new Date(endStr);      
        dEnd.setHours(23,59,59,999);
        
        filteredSales = salesHistory.filter(s => {
            const sd = new Date(s.created_at);
            return sd >= dStart && sd <= dEnd;
        });
    }

    // 2. Compute Core Metrics
    let totalSales = 0;
    let channelFreq = {};
    let itemCounts = {};

    let statusToFulfil = 0; let statusUnpaid = 0; let statusProcessing = 0; let statusReturn = 0;

    filteredSales.forEach(sale => {
        let rev = Number(sale.total || sale.total_amount || 0);
        totalSales += rev;
        
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
                itemCounts[sKey].revenue += (Number(item.price) * Number(item.quantity));
            });
        }
    });

    document.getElementById("dashTotalSales").textContent = totalSales.toFixed(2);
    document.getElementById("dashTotalOrders").textContent = filteredSales.length;

    // Top Channel logic
    let tChannel = "None"; let tVal = -1;
    for (let k in channelFreq) { if(channelFreq[k] > tVal) { tChannel = k; tVal = channelFreq[k]; } }
    document.getElementById("dashTopChannel").textContent = tChannel;

    // Status Board Update
    document.getElementById("badgeToFulfil").textContent = statusToFulfil;
    document.getElementById("badgeUnpaid").textContent = statusUnpaid;
    document.getElementById("badgeProcessing").textContent = statusProcessing;
    document.getElementById("badgeReturn").textContent = statusReturn;

    // 3. Inventory Stock Health
    let activeP=0; let draftP=0; let oosP=0; let lowP=0;
    masterProducts.forEach(p => {
        if(p.is_published === false) { draftP++; return; }
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
    
    topArr.forEach((o, i) => {
        tbodyLines.innerHTML += `<tr>
            <td style="width:20px; font-weight:bold; color:#888;">#${i+1}</td>
            <td><strong>${o.name}</strong></td>
            <td style="color:#000000; font-weight:bold;">${o.qty} Sold</td>
            <td style="text-align:right;">RM${o.revenue.toFixed(2)}</td>
        </tr>`;
    });

    // 6. Draw Chart.js (Daily Sales)
    let dailyMap = {};
    filteredSales.forEach(s => {
        let dStr = new Date(s.created_at).toLocaleDateString('en-GB'); 
        dailyMap[dStr] = (dailyMap[dStr] || 0) + Number(s.total || s.total_amount || 0);
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
                label: 'Gross Sales (RM)',
                data: gData,
                backgroundColor: 'rgba(0, 0, 0, 0.1)',
                borderColor: '#000000',
                borderWidth: 2,
                fill: true,
                tension: 0.3,
                pointRadius: 4
            }]
        },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }
    });
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

        let sBadge = p.is_published ? `<span style="color:green;font-size:10px;">Active</span>` : `<span style="color:red;font-size:10px;">Draft</span>`;

        htmlBuf3 += `
            <tr>
                <td>
                    <img src="${thumb}" style="width:45px; height:45px; object-fit:cover; border-radius:6px; background:#eee;"><br>
                    ${sBadge}
                </td>
                <td>
                    <span class="sku-badge">${p.sku}</span> <span class="cat-badge">${p.category||'Uncategorized'}</span><br>
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
                </td>
                <td>
                    <div style="background:#F3F4F6; padding:5px; border-radius:4px; font-family:monospace; font-size:12px; border:1px solid #ddd; display:inline-block;">
                        📍 ${p.location_bin || "Tiada Maklumat Rak"}
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
        
        let stampHtml = auditTimestamps[p.sku] ? `<p style="color:var(--success); font-size:11px; margin-top:5px; font-weight:bold;">✅ Disemak pada: ${auditTimestamps[p.sku]}</p>` : "";

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
                    
                    <!-- GLOBAL STAFF DIRECTORY -->
                    <div class="table-responsive" style="border:1px solid var(--border-color); margin-top:20px;">
                        <table class="data-table" style="font-size:12px; width:100%; text-align:center; border-collapse:collapse;">
                            <thead style="background:#3b82f6; color:#fff;">
                                <tr><th>CMP ID</th><th>Staf Asal</th><th>Nama Syarikat (Penuh)</th><th>Length of Service</th></tr>
                            </thead>
                            <tbody id="staffDirectoryTbody">
                                <tr><td colspan="4">Loading Staff Directory...</td></tr>
                            </tbody>
                        </table>
                    </div>
                </div>

                <!-- Stock Location & Status (Middle) -->
                <div style="flex:1; min-width:220px; padding-left:10px; border-left:1px dashed var(--border-color);">
                    <div style="display:flex; justify-content:space-between; align-items:center;">
                        <p class="small-lbl" style="margin:0;">Lokasi Stok</p>
                        <button onclick="openLocModal('${p.sku}')" style="background:none; border:none; cursor:pointer; font-size:12px; color:var(--primary);">✏️ Ubah</button>
                    </div>
                    <div id="locDisplay-${p.sku}" style="display:flex; gap:6px; margin-bottom:10px; flex-wrap:wrap;">
                        <span style="font-family:monospace; font-size:11px; font-weight:bold; background:#E0F2FE; padding:3px 8px; border-radius:4px; border:1px solid #BAE6FD;">📍 ${p.loc_level || 'G'}</span>
                        <span style="font-family:monospace; font-size:11px; font-weight:bold; background:#FEF3C7; padding:3px 8px; border-radius:4px; border:1px solid #FDE68A;">🗄️ ${p.loc_rack || '-'}</span>
                        <span style="font-family:monospace; font-size:11px; font-weight:bold; background:#E0E7FF; padding:3px 8px; border-radius:4px; border:1px solid #C7D2FE;">⬆️ ${p.loc_tier || '-'}</span>
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
                        <label style="font-size:11px; font-weight:bold; color:#0369a1; display:block; margin-bottom:5px;">📷 Tally Scan Fizikal (+1)</label>
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
    document.getElementById('locLevel').value = p.loc_level || '';
    document.getElementById('locRack').value = p.loc_rack || '';
    document.getElementById('locTier').value = p.loc_tier || '';
    document.getElementById('locationUpdateModal').style.display = 'flex';
}

window.submitLocUpdate = function() {
    let sku = document.getElementById('locModalSkuHidden').value;
    let level = document.getElementById('locLevel').value.trim();
    let rack = document.getElementById('locRack').value.trim();
    let tier = document.getElementById('locTier').value.trim();
    
    if(!level && !rack && !tier) { alert('Sila isikan sekurang-kurangnya satu ruangan!'); return; }
    
    let p = masterProducts.find(x => x.sku === sku);
    if(p) {
        p.loc_level = level;
        p.loc_rack = rack;
        p.loc_tier = tier;
        p.location_bin = [level, rack, tier].filter(Boolean).join(' / ');
        
        try { if(db) db.from('products_master').update({ loc_level: level, loc_rack: rack, loc_tier: tier, location_bin: p.location_bin }).eq('sku', sku).then(); } catch(e){}
    }
    
    // Update the display on the card immediately
    let display = document.getElementById('locDisplay-'+sku);
    if(display) {
        display.innerHTML = `
            <span style="font-family:monospace; font-size:11px; font-weight:bold; background:#dcfce7; padding:3px 8px; border-radius:4px; border:1px solid #86efac; animation:fadeIn 0.3s;">📍 ${level || '-'}</span>
            <span style="font-family:monospace; font-size:11px; font-weight:bold; background:#dcfce7; padding:3px 8px; border-radius:4px; border:1px solid #86efac; animation:fadeIn 0.3s;">🗄️ ${rack || '-'}</span>
            <span style="font-family:monospace; font-size:11px; font-weight:bold; background:#dcfce7; padding:3px 8px; border-radius:4px; border:1px solid #86efac; animation:fadeIn 0.3s;">⬆️ ${tier || '-'}</span>
        `;
        setTimeout(() => {
            display.innerHTML = `
                <span style="font-family:monospace; font-size:11px; font-weight:bold; background:#E0F2FE; padding:3px 8px; border-radius:4px; border:1px solid #BAE6FD;">📍 ${level || '-'}</span>
                <span style="font-family:monospace; font-size:11px; font-weight:bold; background:#FEF3C7; padding:3px 8px; border-radius:4px; border:1px solid #FDE68A;">🗄️ ${rack || '-'}</span>
                <span style="font-family:monospace; font-size:11px; font-weight:bold; background:#E0E7FF; padding:3px 8px; border-radius:4px; border:1px solid #C7D2FE;">⬆️ ${tier || '-'}</span>
            `;
        }, 800);
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
        stampWrap.innerHTML = `<p style="color:var(--success); font-size:11px; margin-top:5px; font-weight:bold; animation: fadeIn 0.5s;">✅ Disemak pada: ${auditTimestamps[sku]}</p>`;
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
    
    alert(`Kiraan fizikal untuk ${sku} disahkan!`);
    
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

function renderPackaging() {
    const container = document.getElementById("packagingCardsContainer");
    if(!container) return;
    
    // Filter dummy or real orders that need packing (e.g., status pending/processing)
    const toPack = salesHistory.filter(s => s.status && s.status.toLowerCase() !== 'completed' && s.status !== 'Refunded');
    
    if(toPack.length === 0) {
        container.innerHTML = '<p style="color:#888;">Hebat! Tiada pesanan yang tertunggak untuk dibungkus hari ini.</p>';
        return;
    }
    
    container.innerHTML = toPack.map(s => `
        <div class="dash-card" style="border-left:5px solid #F37021;">
            <div style="display:flex; justify-content:space-between; margin-bottom:10px;">
                <strong>Order: ${s.id || '#INV_XXX'}</strong>
                <span style="font-size:12px; color:#F37021; font-weight:bold;">To Pack</span>
            </div>
            <p style="font-size:13px; margin-bottom:5px;"><strong>Customer:</strong> ${s.customer_name}</p>
            <p style="font-size:13px; color:#888; margin-bottom:10px;"><strong>Channel:</strong> ${s.channel}</p>
            <div style="background:#f9f9f9; padding:8px; border-radius:4px; font-size:12px; margin-bottom:15px; border:1px solid #eee;">
                ${(s.items || []).map(i => `• ${i.quantity}x ${i.name}`).join('<br>')}
            </div>
            <button class="btn-primary" style="width:100%; font-size:12px;" onclick="alert('Consignment Note sedang dijana untuk ${s.customer_name}!')">Print AWB & Selesai</button>
        </div>
    `).join('');
}

window.toggleVariantBuilder = function(isEnabled) {
    const singleFields = document.getElementById("singleVariantFields");
    const builderSection = document.getElementById("variantBuilderSection");
    
    if(isEnabled) {
        singleFields.style.display = 'none';
        builderSection.style.display = 'block';
        if(document.getElementById("variantTableBody").children.length === 0) {
            window.addVariantRow(); // add 1st row automatically
        }
    } else {
        singleFields.style.display = 'block';
        builderSection.style.display = 'none';
    }
};

window.addVariantRow = function() {
    const tbody = document.getElementById("variantTableBody");
    const rowId = Date.now() + Math.floor(Math.random()*1000);
    const tr = document.createElement("tr");
    tr.id = "varRow-" + rowId;
    
    tr.innerHTML = `
        <td style="text-align:center;">▶</td>
        <td><input type="text" class="login-input var-sku" style="margin:0; padding:5px; height:30px;" placeholder="Cth: BD-HITAM-L"></td>
        <td><input type="text" class="login-input var-size" style="margin:0; padding:5px; height:30px;" placeholder="Saiz (L)"></td>
        <td><input type="text" class="login-input var-color" style="margin:0; padding:5px; height:30px;" placeholder="Warna (Hitam)"></td>
        <td><input type="number" class="login-input var-qty" style="margin:0; padding:5px; height:30px;" placeholder="0"></td>
        <td><input type="number" class="login-input var-price" style="margin:0; padding:5px; height:30px;" placeholder="(Ikut Induk)"></td>
        <td style="text-align:center;"><button onclick="document.getElementById('varRow-${rowId}').remove()" style="background:#EF4444; color:white; padding:5px 10px; margin:0; border:none; border-radius:3px; cursor:pointer;">X</button></td>
    `;
    tbody.appendChild(tr);
};

document.getElementById("saveMasterBtn").onclick = async function() {
    const btn = this;
    
    // 1. Tangkap A. Identiti
    const sku = document.getElementById("regSku")?.value.trim().toUpperCase();
    const name = document.getElementById("regName")?.value.trim() || 'New Product';
    const model = document.getElementById("regModel")?.value.trim() || '';
    const barcode = document.getElementById("regBarcode")?.value.trim() || '';
    const vSize = document.getElementById("regVarSize")?.value.trim() || '';
    const vColor = document.getElementById("regVarColor")?.value.trim() || '';
    
    // 2. Tangkap B. Ekonomi & Logistik
    const price = document.getElementById("regPrice")?.value || 0;
    const priceCap = document.getElementById("regPriceCompare")?.value || 0;
    const cost = document.getElementById("regCost")?.value || 0;
    const qty = parseInt(document.getElementById("regQty")?.value || 0);
    const loc = document.getElementById("regLocation")?.value || '';
    const len_cm = parseFloat(document.getElementById("regLen")?.value || 0);
    const wid_cm = parseFloat(document.getElementById("regWid")?.value || 0);
    const hei_cm = parseFloat(document.getElementById("regHei")?.value || 0);
    const weight = document.getElementById("regWeight")?.value || 0;
    
    // 3. Tangkap C. Klasifikasi & Media
    const col1 = document.getElementById("regColl1")?.value || '';
    const col2 = document.getElementById("regColl2")?.value || '';
    const col3 = document.getElementById("regColl3")?.value || '';
    const collectionString = [col1, col2, col3].filter(Boolean).join(" > ");
    
    const selVen = document.getElementById("regVendorSel")?.value;
    const custVen = document.getElementById("regVendorCust")?.value;
    const vendorFinal = selVen === "CUSTOM" ? custVen : selVen;
    
    const hasVariants = document.getElementById("hasVariantsCheck")?.checked;
    if(!hasVariants && !sku) { alert("Sila isikan ruangan Wajib: SKU Code!"); return; }
    
    // Process Images Fast (Mock UI blob URLs instead of waiting for cloud)
    btn.textContent = "Menyusun Data..."; btn.disabled = true;
    let localImageUrls = [];
    
    // Check URL inputs first
    const imgUrl = document.getElementById("regImageUrl")?.value.trim();
    const vidUrl = document.getElementById("regVideoUrl")?.value.trim();
    if(imgUrl) localImageUrls.push(imgUrl);
    if(vidUrl) localImageUrls.push(vidUrl);

    const files = document.getElementById("regImages")?.files;
    if(files && files.length > 0) {
        const len = Math.min(files.length, 20);
        for(let i=0; i<len; i++) {
            localImageUrls.push(URL.createObjectURL(files[i]));
        }
    }
    
    if(localImageUrls.length === 0) {
        localImageUrls = ["https://via.placeholder.com/500?text=Barang+Baru"];
    }

    let productsPayloads = [];
    let batchesPayloads = [];

    let baseProd = {
        name: name,
        category: collectionString || "Uncategorized",
        price: parseFloat(price),
        cost_price: parseFloat(cost),
        compare_price: parseFloat(priceCap),
        is_published: true,
        brand: vendorFinal || "Unknown",
        images: localImageUrls,
        model_no: model,
        erp_barcode: barcode,
        location_bin: loc,
        length_cm: len_cm,
        width_cm: wid_cm,
        height_cm: hei_cm,
        weight_kg: parseFloat(weight)
    };

    if(hasVariants) {
        const trs = document.getElementById("variantTableBody").querySelectorAll("tr");
        if(trs.length === 0) { alert("Pilihan Variasi kosong!"); btn.disabled=false; btn.textContent="Sahkan & Masukkan Ke Rekod Rasmi"; return; }
        
        trs.forEach((tr, idx) => {
            let vSku = tr.querySelector('.var-sku').value.trim().toUpperCase();
            let vSize = tr.querySelector('.var-size').value.trim();
            let vColor = tr.querySelector('.var-color').value.trim();
            let vQty = parseInt(tr.querySelector('.var-qty').value || 0);
            let vPrice = tr.querySelector('.var-price').value;
            
            if(!vSku) vSku = sku ? `${sku}-V${idx+1}` : `VAR-${Date.now()}-${idx}`;
            
            let prod = { ...baseProd };
            prod.sku = vSku;
            
            let combinedLabels = [vSize, vColor].filter(Boolean).join(" - ");
            prod.name = combinedLabels ? `${name} - ${combinedLabels}` : name;
            prod.variant_size = vSize;
            prod.variant_color = vColor;
            if(vPrice && vPrice.trim() !== "") prod.price = parseFloat(vPrice);
            
            productsPayloads.push(prod);
            if(vQty > 0) {
                batchesPayloads.push({
                    id: Date.now() + idx,
                    sku: vSku,
                    qty_remaining: vQty,
                    inbound_date: new Date().toISOString().split('T')[0]
                });
            }
        });
    } else {
        let prod = { ...baseProd };
        prod.sku = sku;
        prod.variant_size = vSize;
        prod.variant_color = vColor;
        productsPayloads.push(prod);
        
        if(qty > 0) {
            batchesPayloads.push({
                id: Date.now(),
                sku: sku,
                qty_remaining: qty,
                inbound_date: new Date().toISOString().split('T')[0]
            });
        }
    }

    try {
        productsPayloads.forEach(p => masterProducts.push(p));
        batchesPayloads.forEach(b => inventoryBatches.push(b));
        
        let { error: errP } = await db.from('products_master').insert(productsPayloads);
        if(errP) throw errP;
        
        if(batchesPayloads.length > 0) {
            let { error: errB } = await db.from('inventory_batches').insert(batchesPayloads);
            if(errB) throw errB;
        }
    } catch(e) {
        console.error(e);
        alert("Pendaftaran Ralat: " + e.message);
        btn.disabled = false; btn.textContent = "Sahkan & Masukkan Ke Rekod Rasmi";
        return;
    }

    alert(`Pendaftaran Berjaya! Sebanyak ${productsPayloads.length} entiti SKU dihasilkan dalam pangkalan data Gudang.`);
    
    // Reset Form & UI
    document.getElementById("newSkuForm").querySelectorAll("input").forEach(i => i.value = "");
    btn.textContent = "Sahkan & Masukkan Ke Rekod Rasmi"; 
    btn.disabled = false;
    
    if(typeof toggleInvForm === 'function') toggleInvForm('');
    if(typeof renderWMS === 'function') renderWMS();
};

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
                btn.disabled = false; btn.textContent = "📥 Process Robot Upload";
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
                await initApp(); toggleInvForm('');
            } catch(e) { alert("Error: " + e.message); } finally { btn.disabled = false; btn.textContent = "📥 Process Robot Upload"; }
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
            btn.disabled = false; btn.textContent = "📥 Process Robot Upload";
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
            toggleInvForm('');
        } catch(e) {
            alert("Migration Error: " + e.message);
        } finally {
            btn.disabled = false; btn.textContent = "📥 Process Robot Upload";
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
                document.getElementById("startCsvBtn").textContent = "📥 Process Robot Upload";
                return;
            }
            const headers = Object.keys(jsonData[0]);
            processData(jsonData, headers);
        };
        reader.readAsArrayBuffer(file);
    } else {
        alert("Sila muat naik format fail yang sah (.csv atau .xlsx / .xls)!");
        this.disabled = false; this.textContent = "📥 Process Robot Upload";
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
    this.textContent = "📤 Export Products (.xlsx)";
};

document.getElementById("saveInboundBtn").onclick = async function() {
    const sku = document.getElementById("inboundSkuSelect").value;
    const qty = parseInt(document.getElementById("inboundQty").value);
    if(!sku || isNaN(qty) || qty<=0) return alert("Pilih SKU & Kuantiti Valid!");
    
    const { data: newB, error: err1 } = await db.from('inventory_batches').insert([{
        sku: sku, batch_year: new Date().getFullYear(), qty_received: qty, qty_remaining: qty
    }]).select();

    if(err1) return alert(err1.message);
    await db.from('inventory_transactions').insert([{ sku: sku, batch_id: newB[0].id, transaction_type: 'INBOUND', qty_change: qty }]);
    alert("Inbound Registered."); document.getElementById("inboundQty").value = ""; await initApp();
}


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
        if(p.is_published === false) return false;
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
    
    if(cartItem) { if (cartItem.quantity < totalAvail) cartItem.quantity++; else alert("Limits reached!"); } 
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
        total += item.price * item.quantity;
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
}

// Payment Modal Logics
window.openPaymentModal = function() {
    if(cart.length === 0) return;
    let total = cart.reduce((sum, c) => sum + (c.price * c.quantity), 0);
    document.getElementById('paymentTotalDisplay').textContent = total.toFixed(2);
    document.getElementById('checkoutPaymentModal').style.display = 'flex';
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
}

window.clearCart = function() {
    cart = [];
    renderCart();
}

window.processNewCheckout = async function() {
    if(cart.length === 0) return alert("Empty Cart!");
    const btn = document.getElementById("checkoutBtn");
    btn.disabled = true; 
    btn.textContent = "Processing Omnichannel FIFO...";

    try {
        let transactionsPayload = []; let totalVal = 0;
        const cn = document.getElementById("checkoutChannel").value;
        const cst = document.getElementById("checkoutStatus").value;
        const pm = document.getElementById("paymentMethod").value;
        const custNameText = document.getElementById("customerName").value.trim() || 'Walk-In';
        const custPhoneText = document.getElementById("customerPhone").value.trim();

        for (const item of cart) {
            totalVal += item.price * item.quantity;
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

        await db.from('sales_history').insert([{
            customer_name: custNameText, customer_phone: custPhoneText, payment_method: pm, channel: cn, status: cst, total_amount: totalVal, items: cart, staff_name: currentUser ? currentUser.name : 'Unknown'
        }]);

        const invId = "INV-10C-" + Math.floor(1000 + Math.random() * 9000);
        const email = document.getElementById("customerEmail").value.trim();
        showReceiptModal(invId, custNameText, email, totalVal, [...cart]);

        cart = []; 
        document.getElementById("customerName").value = "";
        document.getElementById("customerPhone").value = "";
        document.getElementById("customerEmail").value = "";
        document.getElementById('checkoutPaymentModal').style.display = 'none';
        await initApp(); 
        renderCart();
    } catch (e) { alert("Fatal Error: " + e.message); }
    
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
        btn.innerHTML = "✅ Berjaya Dihantar!";
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
    const tbody = document.getElementById("customersTableBody");
    if(!tbody) return;
    tbody.innerHTML = "";
    if(customersData.length === 0) { tbody.innerHTML = '<tr><td colspan="5">Tiada pelanggan berdaftar.</td></tr>'; return; }
    customersData.forEach(c => {
        tbody.innerHTML += `<tr>
            <td><strong>${c.name}</strong></td>
            <td>${c.phone || '-'}</td>
            <td style="color:#F59E0B; font-weight:bold;">${c.points || 0} pts</td>
            <td>${c.is_member ? '<span style="color:#10B981; font-weight:bold;">VIP ✓</span>' : '<span style="color:#aaa;">Non-Member</span>'}</td>
            <td><button onclick="viewCustomerHistory('${c.name}')" style="background:var(--bg-color); border:1px solid var(--border-color); padding:5px 10px; border-radius:4px; font-size:11px; cursor:pointer; font-weight:bold;">Lihat Rekod</button></td>
        </tr>`;
    });
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
                <td>${p.active ? '<span style="color:#10B981; font-weight:bold;">Active ✓</span>' : '<span style="color:#EF4444;">Inactive</span>'}</td>
            </tr>`;
        });
    });
}

// ===================================
// AUTHENTICATION LOGIC (MULTI-USER)
// ===================================

const authUsers = [
    { name: 'brozaidtodak', role: 'superior', pin: '1999', dept: 'Managing Director', email: 'zaid@10camp.com', staff_id: 'CMP001', full_name: 'Muhammad Zaid Ariffuddin Bin Zainal Ariffin', join_date: '2020-02-03' },
    { name: 'Aliff', role: 'mgmt', pin: '1111', dept: 'Administrative Department', email: 'aliff@10camp.com', staff_id: 'CMP008', full_name: 'Muhammad Aliff Ashraf Bin Johar', join_date: '2024-07-01' },
    { name: 'Farhan Moyy', role: 'mgmt', pin: '2222', dept: 'Business Development Department', email: 'farhanwakiman@10camp.com', staff_id: 'CMP010', full_name: 'Mohamad Farhan Bin Wakiman', join_date: '2025-09-01' },
    { name: 'Zack', role: 'mgmt', pin: '3333', dept: 'System Manager Department', email: 'zack@10camp.com', staff_id: 'CMP005', full_name: 'Muhammad Nur Zakwan Bin Md Mahalli', join_date: '2024-07-01' },
    { name: 'Ariff', role: 'sales', pin: '4444', dept: 'Sales & Product Department', email: 'ariff@10camp.com', staff_id: 'CMP006', full_name: 'Muhammad Zaimuddin Ariff Bin Zainal Ariffin', join_date: '2024-07-01' },
    { name: 'Irfan', role: 'sales', pin: '5555', dept: 'Marketing Interim', email: 'irfan@10camp.com', staff_id: 'CMP003', full_name: 'Muhammad Irfansyah Bin Abd Fattah', join_date: '2024-07-01' },
    { name: 'Tarmizi Kael', role: 'inventory', pin: '6666', dept: 'Chief Inventory', email: 'tarmizi@10camp.com', staff_id: 'CMP011', full_name: 'Tarmizi bin Rusli', join_date: '2025-08-11' },
    { name: 'Fahmi', role: 'inventory', pin: '7777', dept: 'Inventory Assistance', email: 'fahmi@10camp.com', staff_id: 'CMP009', full_name: 'Shahrul Fahmi Bin Ramlee', join_date: '2024-07-01' }
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
    
    alert(`Berjaya Log Masuk. Anda kini mempunyai ${existing.points || 0} Points.`);
};function handleLogin() {
    const pin = document.getElementById("loginPin").value;
    if(!pin) { alert("Sila masukkan PIN!"); return; }
    
    const user = authUsers.find(u => u.pin === pin);
    if(!user) { alert("Akses Ditolak: PIN Salah atau Tidak Wujud!"); return; }
    
    currentUser = user;
    currentUserRole = user.role;
    
    document.getElementById("loginGate").style.display = "none";
    checkMyAttendanceStatus();
    if(typeof renderPersonalCommission === "function") renderPersonalCommission();
    
    // Popup Greeting Staff
    if(globalMemo.active) {
        alert("📢 PENGUMUMAN DARI PENGURUSAN:\n\n" + globalMemo.text);
    }

    const modalName = document.getElementById("welcomeStaffName");
    const modalDept = document.getElementById("welcomeStaffDept");
    if(modalName) modalName.textContent = `Selamat Datang, ${user.name}!`;
    if(modalDept) modalDept.textContent = `Jawatan: ${user.dept || 'Staff'}`;
    
    const welcomeModal = document.getElementById("staffWelcomeModal");
    if(welcomeModal) welcomeModal.style.display = "flex";
    
    document.getElementById("shopAppLayout").style.display = "none";
    document.getElementById("posAppLayout").style.display = "block";
    
    // Crown indicator for top tiers
    let displayCrown = ['superior', 'mgmt', 'inventory'].includes(user.role) ? ' 👑' : '';
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
    document.getElementById("loginGate").style.display = "none";
    document.getElementById("shopAppLayout").style.display = "block";
    document.getElementById("posAppLayout").style.display = "none";
    document.getElementById("loginPin").value = "";
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

    let filtered = masterProducts.filter(p => p.is_published !== false);
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
                    <button onclick="addToPublicCart('${p.sku}')" style="width:100%; border-radius:50px; background:#111; color:white; padding:12px; border:none; margin-top:10px; cursor:pointer; font-weight:bold; font-size:13px;" ${totalStock <= 0 ? 'disabled' : ''}>${totalStock <= 0 ? 'Sold Out' : 'Add to Cart 🛒'}</button>
                </div>
            </div>
        `;
    });
    
    htmlBuf2 += `
        <div style="width:100%; display:flex; justify-content:center; align-items:center; gap:20px; margin-top:30px; grid-column: 1 / -1; font-family:Inter;">
            <button onclick="changePublicPage(-1)" ${publicCurrentPage <= 1 ? 'disabled style="opacity:0.5"' : 'style="cursor:pointer"'} style="padding:10px 20px; background:#f0f0f0; border:none; border-radius:5px; font-weight:bold;">◀ Back</button>
            <span style="font-size:15px; color:#444;">Page <b>${publicCurrentPage}</b> / ${totalPages}</span>
            <button onclick="changePublicPage(1)" ${publicCurrentPage >= totalPages ? 'disabled style="opacity:0.5"' : 'style="cursor:pointer"'} style="padding:10px 20px; background:#111; color:white; border:none; border-radius:5px; font-weight:bold;">Next ▶</button>
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
    
    if(cartItem) { if (cartItem.quantity < totalAvail) cartItem.quantity++; else alert("Limits reached!"); } 
    else { if (totalAvail > 0) publicCart.push({ sku: sku, name: p.name, price: parseFloat(p.price), quantity: 1 }); }
    
    document.getElementById("btnPublicCartCount").textContent = `Cart (${publicCart.reduce((s, c) => s + c.quantity, 0)})`;
    alert("Ditambah ke troli!");
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
        total += item.price * item.quantity;
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
            totalVal += item.price * item.quantity;
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
    } catch (e) { alert("Fatal Error: " + e.message); }
    
    btn.disabled = false; btn.textContent = "Confirm Order";
}

// ===================================
// E-RECEIPT & EMAIL SYSTEM
// ===================================
let currentReceiptContext = null;

function showReceiptModal(invId, custName, email, total, cartData) {
    const rc = document.getElementById("receiptContent");
    const d = new Date().toLocaleString('en-GB');
    let itemsHtml = "";
    cartData.forEach(c => {
        itemsHtml += `<div style="margin-bottom:5px;">${c.quantity}x ${c.name} <span style="float:right">RM ${(c.price * c.quantity).toFixed(2)}</span></div>`;
    });

    rc.innerHTML = `
        <div style="font-weight:bold; margin-bottom:10px;">INVOICE: ${invId}</div>
        <div style="color:var(--text-muted);">Date: ${d}</div>
        <div style="color:var(--text-muted);">Customer: ${custName}</div>
        <div style="color:var(--text-muted); margin-bottom:10px;">Cashier: ${currentUser?.name || 'Staff'}</div>
        <hr style="border-top:1px dashed #ccc; margin:10px 0;">
        ${itemsHtml}
        <hr style="border-top:1px dashed #ccc; margin:10px 0;">
        <div style="font-size:16px; font-weight:bold;">TOTAL <span style="float:right">RM ${total.toFixed(2)}</span></div>
        <div style="text-align:center; margin-top:30px; font-weight:bold; font-size:11px; color:var(--text-muted);">THANK YOU FOR SHOPPING AT 10CAMP</div>
    `;
    
    currentReceiptContext = { invId, custName, email, total, itemsText: cartData.map(c => `${c.quantity}x ${c.name} - RM ${(c.price * c.quantity).toFixed(2)}`).join('%0D%0A') };
    document.getElementById("receiptModal").style.display = "flex";
}

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
        totalExp += parseFloat(f.amount || 0);
        html += `
            <tr>
                <td>${f.month} ${f.year}</td>
                <td><span class="cat-badge" style="background:#EF4444; color:#fff;">${f.category}</span></td>
                <td>${f.description}</td>
                <td style="color:#EF4444;">-RM ${parseFloat(f.amount).toFixed(2)}</td>
                <td><button onclick="deleteFinance(${f.id})" style="background:none; border:none; color:red; cursor:pointer;" title="Delete Record">🚮</button></td>
            </tr>
        `;
    });
    list.innerHTML = html || '<tr><td colspan="5">No expenses recorded yet.</td></tr>';

    // 2. Calculate Gross Revenue from Sales History
    let totalRev = 0;
    salesHistory.forEach(s => totalRev += parseFloat(s.amount || 0));

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
                { label: 'Revenue 📈', data: revData, backgroundColor: 'rgba(34, 197, 94, 0.5)', borderColor: '#22C55E', borderWidth: 1 },
                { label: 'Expenses 📉', data: expData, backgroundColor: 'rgba(239, 68, 68, 0.5)', borderColor: '#EF4444', borderWidth: 1 },
                { label: 'Net Profit 💰', data: netData, type: 'line', borderColor: '#8B5CF6', backgroundColor: '#8B5CF6', tension: 0.3 }
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

    // Show/Hide Pill buttons based on Access Roles
    let pillRoster = document.getElementById("pillRoster");
    let pillFinance = document.getElementById("pillFinance");
    let pillSales = document.getElementById("pillSales");
    let pillWarehouse = document.getElementById("pillWarehouse");
    let pillSuperior = document.getElementById("pillSuperior");
    
    if(pillRoster) pillRoster.style.display = (isSuperior || isAliff || (!isZack && !isMoyy)) ? "inline-block" : "none";
    if(pillFinance) pillFinance.style.display = (isSuperior || isAliff || (!isZack && !isMoyy)) ? "inline-block" : "none";
    if(pillSales) pillSales.style.display = (isSuperior || isMoyy || (!isZack && !isMoyy)) ? "inline-block" : "none";
    if(pillWarehouse) pillWarehouse.style.display = (isSuperior || isZack || (!isZack && !isMoyy)) ? "inline-block" : "none";
    if(pillSuperior) pillSuperior.style.display = (isSuperior) ? "inline-block" : "none";

    // Auto-switch to default Tab based on user identity logic
    if(!window.currentMgmtTabHasInit) {
        window.currentMgmtTabHasInit = true; // prevent auto-switch re-trigger on data reload
        if(isSuperior || isAliff || (!isZack && !isMoyy)) window.switchMgmtTab('subtabRoster', 'pillRoster');
        else if(isZack) window.switchMgmtTab('subtabWarehouse', 'pillWarehouse');
        else if(isMoyy) window.switchMgmtTab('subtabSales, salesMgmtView', 'pillSales');
    }

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
    }
    
    // update memo switch
    document.getElementById("memoToggle").checked = globalMemo.active;
    document.getElementById("memoStatusLabel").textContent = globalMemo.active ? "AKTIF" : "TIDAK AKTIF";
    document.getElementById("memoStatusLabel").style.color = globalMemo.active ? "#10B981" : "red";
    document.getElementById("memoInputText").value = globalMemo.text;
    
    // Global Staff Directory Rendering
    renderGlobalStaffDirectory();
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
    document.querySelectorAll('.mgmt-subtab').forEach(el => el.style.display = 'none');
    document.querySelectorAll('.pill-btn').forEach(el => el.classList.remove('active'));
    
    let targets = tabId.split(','); 
    targets.forEach(t => {
        let el = document.getElementById(t.trim());
        if(el) el.style.display = 'block';
    });
    
    let pill = document.getElementById(pillId);
    if(pill) pill.classList.add('active');
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
        
        if(sale.staff_name === 'Ariff') ariffTotal += amt;
        if(sale.staff_name === 'Irfan') irfanTotal += amt;
        
        // Taburan Omnichannel
        let ch = sale.channel || 'Lain-Lain';
        if(!channels[ch]) channels[ch] = 0;
        channels[ch] += amt;
        totalSalesSystem += amt;
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
            tbodyPending.innerHTML = `<tr><td colspan="6" style="text-align:center; padding:10px; color:#10B981; font-weight:bold;">✨ Hebat! Tiada sebarang hutang atau invois tergantung.</td></tr>`;
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
                let code = shiftData ? shiftData.shift : '';
                
                let bg = rowBg, col = "#333", fw = "normal";
                if(code === 'A') { bg = "#fde047"; fw = "bold"; }
                else if(code === 'B') { bg = "#86efac"; fw = "bold"; }
                else if(code === 'C') { bg = "#c4b5fd"; fw = "bold"; }
                else if(code === 'OFF') { col = "red"; fw = "bold"; }
                else if(code === 'AL') { bg = "#3b82f6"; col = "white"; fw = "bold"; }
                else if(code === 'MC') { bg = "#fbbf24"; fw = "bold"; }
                else if(code === 'EL') { bg = "#ef4444"; col = "white"; fw = "bold"; }
                
                let attachStr = code === 'MC' && shiftData && shiftData.mc_name ? `<br><span style="font-size:9px;" title="${shiftData.mc_name}">📎</span>` : "";

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
        if(btnEdit) { btnEdit.style.background = "#4f46e5"; btnEdit.style.borderColor = "#4f46e5"; btnEdit.innerHTML = "❌ KELUAR EDIT"; }
        if(btnSubmit) btnSubmit.style.display = "flex";
    } else {
        if(btnEdit) { btnEdit.style.background = "#6b7280"; btnEdit.style.borderColor = "#6b7280"; btnEdit.innerHTML = "✏️ MULA EDIT"; }
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
    if(btnSubmit) { btnSubmit.disabled = true; btnSubmit.innerHTML = "⏳ MENYIMPAN..."; }

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
    
    if(btnSubmit) { btnSubmit.disabled = false; btnSubmit.innerHTML = "✅ SIMPAN PERUBAHAN"; }
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

        let attachStr = req.shift === 'MC' ? `📎 ${req.mc_name}` : "-";

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
    
    renderPendingSchedules();
    renderStaffSchedule();
    alert(`Permohonan ${req.staff_name} DILULUSKAN!`);
};

window.rejectRequest = async function(id) {
    if(!confirm("Tolak permohonan staf ini?")) return;
    pendingSchedules = pendingSchedules.filter(r => r.id !== id);
    await db.from('pending_requests').delete().eq('id', id);
    renderPendingSchedules();
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
    
    let lowStocks = [];
    masterProducts.forEach(p => {
        let total = inventoryBatches.filter(b => b.sku === p.sku).reduce((acc, b) => acc + parseInt(b.qty_remaining), 0);
        if(total < 10) {
            lowStocks.push({ sku: p.sku, name: p.name, remaining: total });
        }
    });

    if(lowStocks.length === 0) {
        tbody.innerHTML = '<tr><td colspan="3" style="text-align:center;">Tiada stok kritikal.</td></tr>';
        return;
    }

    tbody.innerHTML = lowStocks.map(s => {
        let color = s.remaining === 0 ? "red" : "#D97706";
        return `
        <tr>
            <td><strong>${s.sku}</strong></td>
            <td>${s.name}</td>
            <td style="color:${color}; font-weight:bold;">${s.remaining} Pcs</td>
        </tr>
        `;
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
        if(p.type === 'IN') runningBalance += p.amount;
        else runningBalance -= p.amount;
        
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
            performance[name].gross += parseFloat(sale.total || 0);
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
                    : `<span style="color:#10B981; font-weight:bold;">TUTUP ✓</span>`}
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

    statusTxt.textContent = "🔍 Mengesan koordinat GPS anda...";
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
            statusTxt.textContent = `📍 Disahkan: Anda berada ${Math.round(dist)}m dari Premis. Mengaktifkan Kamera...`;
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
                statusTxt.textContent = "❌ Kamera Gagal Diakses. Sila allow permission.";
                statusTxt.style.color = "#991b1b";
                statusTxt.style.background = "#fee2e2";
                loadTxt.textContent = "Akses Ditolak";
            });

        } else {
            statusTxt.textContent = `❌ Terkeluar Jarak! Anda sejauh ${Math.round(dist)}m (Maksima ${radius}m).`;
            statusTxt.style.color = "#991b1b";
            statusTxt.style.background = "#fee2e2";
            loadTxt.textContent = "Kamera tidak diperlukan";
        }

    }, err => {
        statusTxt.textContent = "❌ Gagal mengesan GPS anda. Pastikan Location dibenarkan.";
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
    
    btn.textContent = "⏳ Memproses Rekod...";
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

window.renderPersonalCommission = function() {
    const tbody = document.getElementById("myCommissionTbody");
    const domSales = document.getElementById("myCommissionSalesTotal");
    const domEst = document.getElementById("myCommissionEstTotal");

    if(!tbody || !currentUser) return;
    
    let mySales = salesHistory.filter(s => s.staff_name === currentUser.name);
    let totalSale = 0;
    
    let html = "";
    if(mySales.length === 0) {
        html = `<tr><td colspan="4" style="text-align:center;">Tiada rekod jualan peribadi untuk ditunjukkan.</td></tr>`;
    } else {
        mySales.forEach(s => {
            let amt = parseFloat(s.total_amount || 0);
            totalSale += amt;
            let dateStr = new Date(s.created_at).toLocaleDateString('ms-MY', {day:'numeric', month:'short', year:'numeric'});
            let ref = s.id ? ("INV-10C-" + s.id) : "-";
            let comm = (amt * (moyySettings.commRate / 100)).toFixed(2);
            html += `<tr><td>${dateStr}</td><td>${ref}</td><td style="color:#059669; font-weight:bold;">RM ${amt.toFixed(2)}</td><td>RM ${comm}</td></tr>`;
        });
    }
    
    tbody.innerHTML = html;
    if(domSales) domSales.textContent = `RM ${totalSale.toFixed(2)}`;
    if(domEst) domEst.textContent = `RM ${(totalSale * (moyySettings.commRate / 100)).toFixed(2)}`;
}

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
