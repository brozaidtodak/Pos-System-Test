import sys

with open('app.js', 'r', encoding='utf-8') as f:
    lines = f.readlines()

replacement = """document.getElementById("startCsvBtn").onclick = async function() {
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
"""

new_lines = lines[:763] + [replacement + "\\n"] + lines[887:]

with open('app.js', 'w', encoding='utf-8') as f:
    f.writelines(new_lines)

print("PATCHED!")
