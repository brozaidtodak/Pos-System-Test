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
let masterProducts = [
    { "sku": "BD001", "name": "Tunnel tent (dummy)", "category": "Camping Tent", "price": 1799.0, "is_published": true, "brand": "BLACKDOG", "images": ["https://loremflickr.com/500/500/tent?lock=1"] },
    { "sku": "BD002", "name": "Hexagon tarp PU (dummy)", "category": "Flysheet / Tarp", "price": 227.0, "is_published": true, "brand": "BLACKDOG", "images": ["https://loremflickr.com/500/500/camping?lock=2"] },
    { "sku": "BD003", "name": "Hexagon tarp silver coated (dummy)", "category": "Flysheet", "price": 327.0, "is_published": true, "brand": "BLACKDOG", "images": ["https://loremflickr.com/500/500/mountain?lock=3"] },
    { "sku": "BD004", "name": "Large Hexagon tarp (dummy)", "category": "Flysheet", "price": 459.0, "is_published": true, "brand": "BLACKDOG", "images": ["https://loremflickr.com/500/500/outdoor?lock=4"] },
    { "sku": "BD005", "name": "Ultrasonic picnic mat (dummy)", "category": "Accessories", "price": 95.0, "is_published": true, "brand": "BLACKDOG", "images": ["https://loremflickr.com/500/500/picnic?lock=5"] },
    { "sku": "BD006", "name": "Atmosphere Lamp (dummy)", "category": "Lighting", "price": 93.0, "is_published": true, "brand": "BLACKDOG", "images": ["https://loremflickr.com/500/500/lamp?lock=7"] },
    { "sku": "BD007", "name": "Retro Hanging Lamp (dummy)", "category": "Lighting", "price": 97.0, "is_published": true, "brand": "BLACKDOG", "images": ["https://loremflickr.com/500/500/lantern?lock=8"] },
    { "sku": "BD008", "name": "Camping cart (dummy)", "category": "Accessories", "price": 211.0, "is_published": true, "brand": "BLACKDOG", "images": ["https://loremflickr.com/500/500/cart?lock=9"] },
    { "sku": "BD009", "name": "Four-way folding cart (dummy)", "category": "Accessories", "price": 412.0, "is_published": true, "brand": "BLACKDOG", "images": ["https://loremflickr.com/500/500/wagon?lock=11"] },
    { "sku": "BD010", "name": "Feathered moon chair (dummy)", "category": "Table & Chair", "price": 189.0, "is_published": true, "brand": "BLACKDOG", "images": ["https://loremflickr.com/500/500/chair?lock=13"] },
    { "sku": "BD011", "name": "Kermit folding chair (dummy)", "category": "Table & Chair", "price": 79.0, "is_published": true, "brand": "BLACKDOG", "images": ["https://loremflickr.com/500/500/seat?lock=15"] },
    { "sku": "BD012", "name": "Storage bag (dummy)", "category": "Accessories", "price": 119.0, "is_published": true, "brand": "BLACKDOG", "images": ["https://loremflickr.com/500/500/bag?lock=16"] },
    { "sku": "BD013", "name": "Double folding chair (dummy)", "category": "Table & Chair", "price": 199.0, "is_published": true, "brand": "BLACKDOG", "images": ["https://loremflickr.com/500/500/sofa?lock=17"] },
    { "sku": "BD014", "name": "Automatic tent 2.0 (dummy)", "category": "Camping Tent", "price": 99.0, "is_published": true, "brand": "BLACKDOG", "images": ["https://loremflickr.com/500/500/tent?lock=19"] },
    { "sku": "BD015", "name": "Canopy door curtain (dummy)", "category": "Flysheet", "price": 99.0, "is_published": true, "brand": "BLACKDOG", "images": ["https://loremflickr.com/500/500/curtain?lock=21"] },
    { "sku": "BD019", "name": "Portable round table (dummy)", "category": "Table & Chair", "price": 99.0, "is_published": true, "brand": "BLACKDOG", "images": ["https://loremflickr.com/500/500/table?lock=22"] },
    { "sku": "BD020", "name": "IGT folding table (dummy)", "category": "Table & Chair", "price": 99.0, "is_published": true, "brand": "BLACKDOG", "images": ["https://loremflickr.com/500/500/desk?lock=23"] },
    { "sku": "BD021", "name": "Floating Moon Chair (dummy)", "category": "Table & Chair", "price": 99.0, "is_published": true, "brand": "BLACKDOG", "images": ["https://loremflickr.com/500/500/chair?lock=24"] },
    { "sku": "BD039", "name": "Camping incubator (dummy)", "category": "Storage", "price": 99.0, "is_published": true, "brand": "10camp", "images": ["https://loremflickr.com/500/500/box?lock=25"] },
    { "sku": "BD047", "name": "Dinner party gas stove (dummy)", "category": "Cookware", "price": 99.0, "is_published": true, "brand": "10camp", "images": ["https://loremflickr.com/500/500/stove?lock=26"] }
];

let inventoryBatches = [
    { "id": 1, "sku": "BD001", "qty_remaining": 15, "inbound_date": "2025-01-01" },
    { "id": 2, "sku": "BD002", "qty_remaining": 20, "inbound_date": "2025-01-01" },
    { "id": 3, "sku": "BD003", "qty_remaining": 30, "inbound_date": "2025-01-01" },
    { "id": 4, "sku": "BD004", "qty_remaining": 5, "inbound_date": "2025-01-01" },
    { "id": 5, "sku": "BD005", "qty_remaining": 40, "inbound_date": "2025-01-01" },
    { "id": 6, "sku": "BD006", "qty_remaining": 10, "inbound_date": "2025-01-01" },
    { "id": 7, "sku": "BD007", "qty_remaining": 8, "inbound_date": "2025-01-01" },
    { "id": 8, "sku": "BD008", "qty_remaining": 12, "inbound_date": "2025-01-01" },
    { "id": 9, "sku": "BD009", "qty_remaining": 6, "inbound_date": "2025-01-01" },
    { "id": 10, "sku": "BD010", "qty_remaining": 25, "inbound_date": "2025-01-01" },
    { "id": 11, "sku": "BD011", "qty_remaining": 50, "inbound_date": "2025-01-01" },
    { "id": 12, "sku": "BD012", "qty_remaining": 100, "inbound_date": "2025-01-01" },
    { "id": 13, "sku": "BD013", "qty_remaining": 18, "inbound_date": "2025-01-01" },
    { "id": 14, "sku": "BD014", "qty_remaining": 2, "inbound_date": "2025-01-01" },
    { "id": 15, "sku": "BD015", "qty_remaining": 0, "inbound_date": "2025-01-01" },
    { "id": 16, "sku": "BD019", "qty_remaining": 11, "inbound_date": "2025-01-01" },
    { "id": 17, "sku": "BD020", "qty_remaining": 0, "inbound_date": "2025-01-01" },
    { "id": 18, "sku": "BD021", "qty_remaining": 14, "inbound_date": "2025-01-01" },
    { "id": 19, "sku": "BD039", "qty_remaining": 33, "inbound_date": "2025-01-01" },
    { "id": 20, "sku": "BD047", "qty_remaining": 7, "inbound_date": "2025-01-01" }
];

let salesHistory = [
    { id: 101, created_at: new Date(Date.now() - 86400000*2).toISOString(), customer_name: 'Ahmad Faiz (dummy)', payment_method: 'Online Transfer', channel: 'Website', status: 'Completed', total: 1799.00, items: [{sku: 'BD001', name: 'Tunnel tent (dummy)', quantity: 1, price: 1799.0}] },
    { id: 102, created_at: new Date(Date.now() - 86400000*1).toISOString(), customer_name: 'Siti Sarah (dummy)', payment_method: 'Card', channel: 'In-Store', status: 'Completed', total: 454.00, items: [{sku: 'BD002', name: 'Hexagon tarp PU (dummy)', quantity: 2, price: 227.0}] },
    { id: 103, created_at: new Date(Date.now() - 3600000*5).toISOString(), customer_name: 'Kevin (dummy)', payment_method: 'E-Wallet', channel: 'TikTok', status: 'To Fulfil', total: 95.00, items: [{sku: 'BD005', name: 'Ultrasonic picnic mat (dummy)', quantity: 1, price: 95.0}] },
    { id: 104, created_at: new Date(Date.now() - 3600000*2).toISOString(), customer_name: 'Muthu (dummy)', payment_method: 'Cash', channel: 'In-Store', status: 'Completed', total: 211.00, items: [{sku: 'BD008', name: 'Camping cart (dummy)', quantity: 1, price: 211.0}] },
    { id: 105, created_at: new Date().toISOString(), customer_name: 'Siti Sarah (dummy)', payment_method: 'Card', channel: 'Website', status: 'Processing', total: 186.00, items: [{sku: 'BD006', name: 'Atmosphere Lamp (dummy)', quantity: 2, price: 93.0}] }
];

let customersData = [
    { id: 1, name: 'Ahmad Faiz (dummy)', phone: '0123456789', points: 1799, is_member: true },
    { id: 2, name: 'Siti Sarah (dummy)', phone: '0134567890', points: 640, is_member: true },
    { id: 3, name: 'Kevin (dummy)', phone: '0145678901', points: 95, is_member: false },
    { id: 4, name: 'Muthu (dummy)', phone: '0156789012', points: 211, is_member: false },
    { id: 5, name: 'Farah (dummy)', phone: '0167890123', points: 0, is_member: false }
];

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
    if(sectionIds.includes('stockTakeSection')) renderStockTake();
    if(sectionIds.includes('packagingSection')) renderPackaging();
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
        // Temporarily Disabled to allow 600+ items dummy injection test
        // let { data: master } = await db.from('products_master').select('*');
        // if(master) masterProducts = master;

        // let { data: batches } = await db.from('inventory_batches').select('*').order('inbound_date', {ascending: true});
        // if(batches) inventoryBatches = batches;

        // RENDER FRONTEND INSTANTLY BEFORE ADMIN BACKEND FETCHES
        renderPublicStorefront();
        renderPOS();

        let { data: sales } = await db.from('sales_history').select('*').order('created_at', {ascending: false});
        if(sales) salesHistory = [...salesHistory, ...sales];

        let { data: custs } = await db.from('customers').select('*');
        if(custs) customersData = [...customersData, ...custs];
        
        let { data: fin } = await db.from('finance_records').select('*').order('year', {ascending: false});
        if(fin) financeRecords = fin;
        renderWMS();
        renderHistory();
        renderCustomers();
        renderPromotions();
        renderDashboard();
        if(typeof renderFinance === "function") renderFinance();
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
        totalSales += Number(sale.total);
        
        // Channels
        let ch = sale.channel || 'In-Store';
        channelFreq[ch] = (channelFreq[ch] || 0) + Number(sale.total);

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
        dailyMap[dStr] = (dailyMap[dStr] || 0) + Number(s.total);
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
                    <strong>[#${sale.id}] RM ${sale.total.toFixed(2)}</strong>
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
                    <img src="${thumb}"><br>
                    ${sBadge}
                </td>
                <td>
                    <span class="sku-badge">${p.sku}</span> <span class="cat-badge">${p.category||'Uncategorized'}</span><br>
                    <strong>${p.name}</strong><br>
                    <small style="color:#888;">${p.parent_sku ? 'Variant: '+p.parent_sku : 'Main Product'}</small>
                </td>
                <td style="font-weight:bold; color:${totalStock <= 0 ? 'red' : 'green'};">
                    ${totalStock} ${p.unit||'Pcs'}<br>
                    <small style="font-weight:normal; color:#888;">${myBatches.length} batch(es)</small>
                </td>
                <td>
                    <div style="background:#F3F4F6; padding:5px; border-radius:4px; font-family:monospace; font-size:12px; border:1px solid #ddd; display:inline-block;">
                        📍 T${(p.sku.charCodeAt(2)||48)%3+1} / B${(p.sku.charCodeAt(3)||48)%6+1} / R${(p.sku.charCodeAt(4)||48)%10+1} / L${(p.sku.charCodeAt(4)||48)%4+1}
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

function renderStockTake() {
    const tbody = document.getElementById("stockTakeTableBody");
    if(!tbody) return;
    
    let html = "";
    masterProducts.forEach(p => {
        const myBatches = inventoryBatches.filter(b => b.sku === p.sku && b.qty_remaining > 0);
        const totalStock = myBatches.reduce((sum, b) => sum + b.qty_remaining, 0);
        const locText = "T" + ((p.sku.charCodeAt(2)||48)%3+1) + "/B" + ((p.sku.charCodeAt(3)||48)%6+1) + "/R" + ((p.sku.charCodeAt(4)||48)%10+1) + "/L" + ((p.sku.charCodeAt(4)||48)%4+1);
        
        html += `
            <tr>
                <td><strong>${p.sku}</strong><br><small>${p.name}</small></td>
                <td><span style="background:#eee; padding:3px 6px; border-radius:4px; font-family:monospace;">${locText}</span></td>
                <td style="text-align:center; font-weight:bold; font-size:16px;">${totalStock}</td>
                <td style="text-align:center; background:#FFFBEB;">
                    <input type="number" class="login-input" style="width:80px; text-align:center; margin:0;" placeholder="0">
                </td>
                <td><input type="text" class="login-input" style="margin:0;" placeholder="Catatan..."></td>
            </tr>
        `;
    });
    tbody.innerHTML = html;
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

document.getElementById("saveMasterBtn").onclick = async function() {
    const btn = this;
    const sku = document.getElementById("newSkuCode").value.trim().toUpperCase();
    const name = document.getElementById("newSkuName").value.trim();
    const price = document.getElementById("newSkuPrice").value;
    const cost = document.getElementById("newCostPrice").value;
    const category = document.getElementById("newCategory").value.trim();
    const pub = document.getElementById("newSkuPublished").value === "true";
    
    if(!sku || !name || !price || !cost || !category) { alert("Sila isikan ruangan Wajib!"); return; }
    btn.textContent = "Uploading Images (Sabar)..."; btn.disabled = true;

    const files = document.getElementById("productImages").files;
    let uploadedUrls = [];
    for(let i=0; i<files.length; i++) {
        const file = files[i];
        const fileName = `${sku}-${Date.now()}-${i}.${file.name.split('.').pop()}`;
        const { error } = await db.storage.from('product-images').upload(fileName, file);
        if(!error) {
            const { data } = db.storage.from('product-images').getPublicUrl(fileName);
            uploadedUrls.push(data.publicUrl);
        }
    }

    btn.textContent = "Saving to Server...";
    const { error } = await db.from('products_master').insert([{
        sku: sku, name: name, unit: document.getElementById("newSkuUnit").value, 
        price: parseFloat(price), cost_price: parseFloat(cost), category: category, 
        parent_sku: document.getElementById("newParentSku").value.trim().toUpperCase(), 
        commission_rate: parseFloat(document.getElementById("newCommission").value || 0),
        length_cm: parseFloat(document.getElementById("newLength").value || 0), 
        width_cm: parseFloat(document.getElementById("newWidth").value || 0), 
        height_cm: parseFloat(document.getElementById("newHeight").value || 0),
        description: document.getElementById("newDescription").value.trim(), 
        images: uploadedUrls, is_published: pub
    }]);

    if(error) alert(error.message); else { alert("Saved!"); await initApp(); toggleInvForm(''); }
    btn.textContent = "Save Heavy Data Profile"; btn.disabled = false;
};

document.getElementById("startCsvBtn").onclick = function() {
    const fileInput = document.getElementById("csvFileInput");
    if(!fileInput.files.length) return alert("Pilih fail CSV!");
    
    this.disabled = true; this.textContent = "Analyzing Smart Migrator...";
    Papa.parse(fileInput.files[0], {
        header: true, skipEmptyLines: true,
        complete: async function(res) {
            const typeSelect = document.getElementById("csvImportType");
            const importMode = typeSelect ? typeSelect.value : "products";
            const headers = res.meta.fields || [];
            
            if(importMode === "sales") {
                const isShopSales = headers.includes("Name") && headers.includes("Total");
                const isEasySales = headers.includes("Order Number") && headers.includes("Total");
                let salesPayload = [];
                
                res.data.forEach(r => {
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
                
                if(salesPayload.length === 0) return alert("Format CSV Sales Tidak Sah / Kosong.");
                const btn = document.getElementById("startCsvBtn");
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
                } catch(e) { alert("Error: " + e.message); } finally { btn.disabled = false; btn.textContent = "Process Robot Upload"; }
                return;
            }

            // Products Migration Flow
            const isShopify = headers.includes("Variant SKU");
            const isEasyStore = headers.includes("Product Name") && headers.includes("Price");
            
            let payload = [];
            let inventoryPayload = [];

            res.data.forEach(r => {
                let s_sku = "", s_name = "", s_price = 0, s_cost = 0, s_img = "", s_qty = 0;
                if(isShopify) {
                    s_sku = r["Variant SKU"]; s_name = r["Handle"] || r["Title"]; s_price = r["Variant Price"];
                    s_cost = r["Variant Compare At Price"] || 0; s_img = r["Image Src"] || "";
                    s_qty = parseInt(r["Variant Inventory Qty"] || 0);
                } else if(isEasyStore) {
                    s_sku = r["SKU"]; s_name = r["Product Name"]; s_price = r["Price"]; s_cost = r["Cost"];
                    s_qty = parseInt(r["Quantity"] || 0);
                } else {
                    s_sku = r.sku; s_name = r.name; s_price = r.price; s_cost = r.cost_price;
                }
                
                s_sku = (s_sku || "").trim().toUpperCase();
                if(s_sku && s_sku !== "NAN") {
                    payload.push({
                        sku: s_sku, name: s_name || "Migrated Item",
                        category: "Migrated", unit: "Pcs", cost_price: parseFloat(s_cost || 0),
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

            if(payload.length === 0) return alert("Format CSV Tidak Dikenalpasti / Tiada SKU.");
            const btn = document.getElementById("startCsvBtn");
            
            try {
                // Chunking logic (500 items per chunk) to avoid Server Timeout
                let chunkSize = 500;
                for(let i=0; i<payload.length; i+=chunkSize) {
                    btn.textContent = `Upserting Products: ${Math.min(i+chunkSize, payload.length)} / ${payload.length}...`;
                    let chunk = payload.slice(i, i+chunkSize);
                    let { error } = await db.from('products_master').upsert(chunk, { onConflict: 'sku' });
                    if(error) throw error;
                }
                
                for(let i=0; i<inventoryPayload.length; i+=chunkSize) {
                    btn.textContent = `Migrating Inventory: ${Math.min(i+chunkSize, inventoryPayload.length)} / ${inventoryPayload.length}...`;
                    let chunk = inventoryPayload.slice(i, i+chunkSize);
                    let { error } = await db.from('inventory_batches').insert(chunk);
                    if(error) throw error;
                }

                alert(`Migrasi Berjaya! dipindahkan sebanyak: ${payload.length} produk & ${inventoryPayload.length} susunan stok.`); 
                await initApp(); 
                toggleInvForm('');
            } catch(e) {
                alert("Migration Error: " + e.message);
            } finally {
                btn.disabled = false; 
                btn.textContent = "Process Robot Upload";
            }
        }
    });
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
    if(!container) return; container.innerHTML = ""; let total = 0; let totalItems = 0;
    
    // safe update helper for mobile bar
    const updateMobileBar = (t, i) => {
        const tEl = document.getElementById("mobileCartTotal");
        const iEl = document.getElementById("mobileCartItemCount");
        if(tEl) tEl.textContent = t.toFixed(2);
        if(iEl) iEl.textContent = i.toString();
    };

    if(cart.length === 0) { 
        container.innerHTML = "<p>Cart Empty.</p>"; 
        label.textContent = "0.00"; 
        updateMobileBar(0, 0);
        return; 
    }

    cart.forEach(item => {
        total += item.price * item.quantity;
        totalItems += item.quantity;
        container.innerHTML += `
            <div class="cart-item">
                <div><strong style="font-size:14px;">[${item.sku}] ${item.name}</strong><br><small>RM${item.price.toFixed(2)} x ${item.quantity}</small></div>
                <div style="display:flex; gap:5px; align-items:center;">
                    <button onclick="decreaseQuantity('${item.sku}')">-</button><span>${item.quantity}</span>
                    <button onclick="addToCart('${item.sku}')">+</button><button onclick="removeFromCart('${item.sku}')" style="color:red; background:none; border:none;">X</button>
                </div>
            </div>`;
    });
    label.textContent = total.toFixed(2);
    updateMobileBar(total, totalItems);
}

document.getElementById("checkoutBtn").onclick = async function() {
    if(cart.length === 0) return alert("Empty Cart!");
    this.disabled = true; this.textContent = "Processing Omnichannel FIFO...";

    try {
        let transactionsPayload = []; let totalVal = 0;
        const cn = document.getElementById("checkoutChannel").value;
        const cst = document.getElementById("checkoutStatus").value;
        const pm = document.getElementById("paymentMethod").value;
        const custNameText = document.getElementById("customerName").value.trim() || 'Walk-In';

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
             const existing = customersData.find(c => c.name.toLowerCase() === custNameText.toLowerCase());
             if(!existing) {
                 await db.from('customers').insert([{name: custNameText, points: earnedPoints}]);
             } else {
                 await db.from('customers').update({points: (existing.points || 0) + earnedPoints}).eq('id', existing.id);
             }
        }

        await db.from('sales_history').insert([{
            customer_name: custNameText, payment_method: pm, channel: cn, status: cst, total: totalVal, items: cart
        }]);

        const invId = "INV-10C-" + Math.floor(1000 + Math.random() * 9000);
        const email = document.getElementById("customerEmail").value.trim();
        showReceiptModal(invId, custNameText, email, totalVal, [...cart]);

        cart = []; 
        document.getElementById("customerName").value = "";
        document.getElementById("customerEmail").value = "";
        await initApp(); renderCart();
    } catch (e) { alert("Fatal Error: " + e.message); }
    
    this.disabled = false; this.textContent = "Send Order to Queue";
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
    { name: 'brozaidtodak', role: 'mgmt', pin: '1999', dept: 'Managing Director' },
    { name: 'Aliff', role: 'mgmt', pin: '1111', dept: 'Administrative Department' },
    { name: 'Farhan Moyy', role: 'mgmt', pin: '2222', dept: 'Business Development Department' },
    { name: 'Zack', role: 'mgmt', pin: '3333', dept: 'System Manager Department' },
    { name: 'Ariff', role: 'staff', pin: '4444', dept: 'Sales & Product Department' },
    { name: 'Irfan', role: 'admin', pin: '5555', dept: 'Marketing Interim' },
    { name: 'Tarmizi Kael', role: 'admin', pin: '6666', dept: 'Chief Inventory' },
    { name: 'Fahmi', role: 'staff', pin: '7777', dept: 'Inventory Assistance' }
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
    
    // Popup Greeting Staff
    const modalName = document.getElementById("welcomeStaffName");
    const modalDept = document.getElementById("welcomeStaffDept");
    if(modalName) modalName.textContent = `Selamat Datang, ${user.name}!`;
    if(modalDept) modalDept.textContent = `Jawatan: ${user.dept || 'Staff'}`;
    
    const welcomeModal = document.getElementById("staffWelcomeModal");
    if(welcomeModal) welcomeModal.style.display = "flex";
    
    document.getElementById("shopAppLayout").style.display = "none";
    document.getElementById("posAppLayout").style.display = "block";
    switchHub(['homeSection'], 'Overview', document.querySelector('.menu-item[data-tab="overview"]'));
    document.getElementById("sessionUsername").textContent = "Hi, " + (user.name.split(' ')[1] || user.name) + (['admin', 'mgmt'].includes(user.role) ? ' 👑' : '');
    
    const adminMenus = document.querySelectorAll(".admin-only");
    const mgmtMenus = document.querySelectorAll(".mgmt-only");
    
    // Default hiding
    adminMenus.forEach(el => el.style.display = "none");
    mgmtMenus.forEach(el => el.style.display = "none");

    if (user.role === 'mgmt') {
        adminMenus.forEach(el => el.style.display = "block");
        mgmtMenus.forEach(el => el.style.display = "block");
    } else if (user.role === 'admin') {
        adminMenus.forEach(el => el.style.display = "block");
    } else {
        // 'staff' role
        // all admin/mgmt menus stay hidden
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
