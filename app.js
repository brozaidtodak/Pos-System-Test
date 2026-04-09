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

// Memory State
let masterProducts = [];
let inventoryBatches = [];
let salesHistory = [];
let customersData = [];
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

function switchTab(tabName, title) {
    document.querySelectorAll('.tab-section').forEach(s => s.style.display = 'none');
    document.getElementById(tabName + 'Section').style.display = 'block';
    document.getElementById('pageTitle').textContent = title;
    document.querySelectorAll('.menu-item').forEach(item => {
        item.classList.remove('active');
        if(item.dataset.tab === tabName) item.classList.add('active');
    });
    const sidebar = document.getElementById("appSidebar");
    if(sidebar.classList.contains("open")) toggleSidebar();

    // Re-render chart if going to home
    if(tabName === 'home') renderDashboard();
}
window.switchTab = switchTab;

window.toggleInvForm = function(formId) {
    const f1 = document.getElementById("newSkuForm");
    const f2 = document.getElementById("inboundForm");
    const f3 = document.getElementById("csvForm");
    if(formId === 'newSkuForm') { f1.style.display = 'block'; f2.style.display = 'none'; f3.style.display = 'none';}
    if(formId === 'inboundForm') { f2.style.display = 'block'; f1.style.display = 'none'; f3.style.display = 'none';}
    if(formId === 'csvForm') { f3.style.display = 'block'; f1.style.display = 'none'; f2.style.display = 'none';}
    if(!formId) { f1.style.display = 'none'; f2.style.display = 'none'; f3.style.display = 'none'; }
}

async function initApp() {
    try {
        console.log("Loading Cloud Omnichannel Data...");
        let { data: master } = await db.from('products_master').select('*');
        if(master) masterProducts = master;

        let { data: batches } = await db.from('inventory_batches').select('*').order('inbound_date', {ascending: true});
        if(batches) inventoryBatches = batches;

        let { data: sales } = await db.from('sales_history').select('*').order('created_at', {ascending: false});
        if(sales) salesHistory = sales;

        let { data: custs } = await db.from('customers').select('*');
        if(custs) customersData = custs;

        renderWMS();
        renderPOS();
        renderHistory();
        renderCustomers();
        renderPromotions();
        renderDashboard();
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

    masterProducts.forEach(p => {
        const myBatches = inventoryBatches.filter(b => b.sku === p.sku && b.qty_remaining > 0);
        const totalStock = myBatches.reduce((sum, b) => sum + b.qty_remaining, 0);
        
        let thumb = "https://placehold.co/100x100?text=Img";
        let imgs = p.images || []; if(imgs.length > 0) thumb = imgs[0];

        let sBadge = p.is_published ? `<span style="color:green;font-size:10px;">Active</span>` : `<span style="color:red;font-size:10px;">Draft</span>`;

        tbody.innerHTML += `
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
                <td>
                    <small>Dim: ${p.length_cm||0}x${p.width_cm||0}x${p.height_cm||0}cm</small><br>
                    <small>Comm: ${p.commission_rate||0}%</small>
                </td>
                <td style="font-weight:bold; color:${totalStock <= 0 ? 'red' : 'green'};">
                    ${totalStock} ${p.unit}<br>
                    <small style="font-weight:normal; color:#888;">${myBatches.length} batch(es)</small>
                </td>
                <td>
                    <small>Cost: RM${parseFloat(p.cost_price||0).toFixed(2)}</small><br>
                    <strong>Sell: RM${parseFloat(p.price).toFixed(2)}</strong>
                </td>
            </tr>
        `;
    });
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
    
    this.disabled = true; this.textContent = "Parsing Excel...";
    Papa.parse(fileInput.files[0], {
        header: true, skipEmptyLines: true,
        complete: async function(res) {
            let payload = res.data.map(r => ({
                sku: (r.sku || "").toUpperCase(), name: r.name || "Untitled",
                parent_sku: (r.parent_sku || "").toUpperCase(), category: r.category || "General",
                unit: r.unit || "Pcs", cost_price: parseFloat(r.cost_price || 0),
                price: parseFloat(r.price || 0), commission_rate: parseFloat(r.commission_rate || 0),
                is_published: true, images: []
            })).filter(x => x.sku !== "");

            if(payload.length === 0) return alert("Format CSV Salah.");
            const { error } = await db.from('products_master').insert(payload);
            if(error) alert("Error: " + error.message); else { alert("Excel Imported!"); await initApp(); toggleInvForm(''); }
            
            document.getElementById("startCsvBtn").disabled = false; 
            document.getElementById("startCsvBtn").textContent = "Process Robot Upload";
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
    list.innerHTML = "";

    masterProducts.forEach(p => {
        if(p.is_published === false) return; // Hide drafts
        if(searchTerm && !p.name.toLowerCase().includes(searchTerm.toLowerCase()) && !p.sku.toLowerCase().includes(searchTerm.toLowerCase())) return;

        const myBatches = inventoryBatches.filter(b => b.sku === p.sku && b.qty_remaining > 0);
        const totalStock = myBatches.reduce((sum, b) => sum + b.qty_remaining, 0);
        let thumb = p.images && p.images[0] ? p.images[0] : "https://placehold.co/300x200?text=No+Img";

        list.innerHTML += `
            <div class="product-card">
                <img src="${thumb}">
                <span class="sku-badge">${p.sku}</span><span class="cat-badge">${p.category||'Uncat'}</span>
                <h3 style="margin-top:5px; font-size:14px; height:35px; overflow:hidden;">${p.name}</h3>
                <p class="price">RM ${parseFloat(p.price).toFixed(2)}</p>
                <p style="font-size:12px; margin-bottom:8px;">Instock: ${totalStock} ${p.unit}</p>
                <button onclick="addToCart('${p.sku}')" ${totalStock <= 0 ? 'disabled' : ''}>${totalStock <= 0 ? 'Out of Stock' : 'Add >'}</button>
            </div>
        `;
    });
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
    if(!container) return; container.innerHTML = ""; let total = 0;
    if(cart.length === 0) { container.innerHTML = "<p>Cart Empty.</p>"; label.textContent = "0.00"; return; }

    cart.forEach(item => {
        total += item.price * item.quantity;
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

        // Simple CRM Insert (Checks if name exist, if not, save as basic returning mechanism)
        if(custNameText !== 'Walk-In') {
             const existing = customersData.find(c => c.name.toLowerCase() === custNameText.toLowerCase());
             if(!existing) await db.from('customers').insert([{name: custNameText, points: 10}]);
        }

        await db.from('sales_history').insert([{
            customer_name: custNameText, payment_method: pm, channel: cn, status: cst, total: totalVal, items: cart
        }]);

        cart = []; alert("Order Successfully Pushed to Queue!");
        document.getElementById("customerName").value = "";
        await initApp(); renderCart();
    } catch (e) { alert("Fatal Error: " + e.message); }
    
    this.disabled = false; this.textContent = "Send Order to Queue";
}

// ===================================
// CUSTOMERS CRM TABLE
// ===================================
function renderCustomers() {
    const tbody = document.getElementById("customersTableBody");
    if(!tbody) return;
    tbody.innerHTML = "";
    if(customersData.length === 0) { tbody.innerHTML = '<tr><td colspan="4">Tiada pelanggan berdaftar.</td></tr>'; return; }
    customersData.forEach(c => {
        tbody.innerHTML += `<tr>
            <td><strong>${c.name}</strong></td>
            <td>${c.phone || '-'}</td>
            <td style="color:#F59E0B; font-weight:bold;">${c.points || 0} pts</td>
            <td>${c.is_member ? '<span style="color:#10B981; font-weight:bold;">VIP ✓</span>' : '<span style="color:#aaa;">Non-Member</span>'}</td>
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

setTimeout(() => {
    switchTab("home", "Dashboard");
    document.getElementById("searchInput")?.addEventListener('input', e => renderPOS(e.target.value));
    
    // Set default date range to Current Month
    const dateObj = new Date();
    const firstDay = new Date(dateObj.getFullYear(), dateObj.getMonth(), 1);
    document.getElementById('dashStartDate').value = firstDay.toISOString().split('T')[0];
    document.getElementById('dashEndDate').value = dateObj.toISOString().split('T')[0];

    if(db) initApp();
}, 200);
