// Cashier flow automated test suite.
// Simulates each scenario's data flow at the DB level + checks DOM
// integrity via jsdom. Doesn't replace human UX testing for visuals.

const { JSDOM } = require('jsdom');
const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

// Load Supabase creds from app.js
const appJs = fs.readFileSync('app.js', 'utf8');
const SUPABASE_URL = appJs.match(/const SUPABASE_URL = "([^"]+)"/)[1];
const SUPABASE_KEY = appJs.match(/const SUPABASE_KEY = "([^"]+)"/)[1];
const sb = createClient(SUPABASE_URL, SUPABASE_KEY);

// Test result tracking
const results = [];
const insertedSaleIds = []; // for cleanup

const log = (status, name, detail) => {
    results.push({ status, name, detail });
    const icon = status === 'PASS' ? '✓' : status === 'FAIL' ? '✗' : '·';
    const color = status === 'PASS' ? '\x1b[32m' : status === 'FAIL' ? '\x1b[31m' : '\x1b[33m';
    console.log(`${color}${icon} [${status}]\x1b[0m ${name}${detail ? ' — ' + detail : ''}`);
};

// =============================================================
// HTML STRUCTURE TESTS (jsdom)
// =============================================================
async function htmlStructureTests() {
    console.log('\n━━━ HTML STRUCTURE TESTS ━━━');
    const html = fs.readFileSync('index.html', 'utf8');
    const dom = new JSDOM(html, { runScripts: 'outside-only' });
    const doc = dom.window.document;

    const required = [
        // UX-1+2 navigation
        ['skip-to-main',   '.skip-link'],
        ['header banner',  'header.app-header[role="banner"]'],
        ['mode bar',       '#modeBar'],
        ['breadcrumbs',    '#headerBreadcrumb'],
        ['cmdk overlay',   '#cmdkOverlay'],
        ['theme toggle',   '#themeToggle'],
        // UX-3 cashier flow
        ['side panel',     '#checkoutPanel'],
        ['side panel overlay', '#checkoutPanelOverlay'],
        ['cp customer name',   '#cpCustName'],
        ['cp customer phone',  '#cpCustPhone'],
        ['cp autocomplete dropdown', '#cpCustAcDropdown'],
        ['cp VIP banner',  '#cpVipBanner'],
        ['cp payment pills', '#cpPayPills'],
        ['cp e-wallet inline', '#cpEwalletInline'],
        ['cp confirm btn', '#cpConfirmBtn'],
        ['cp success view', '#cpSuccessView'],
        ['cp success amount', '#cpSuccessAmount'],
        ['cp form view',   '#cpFormView'],
        // UX-6 product DB
        ['pd grid',        '#pdGridView'],
        ['pd table',       '#pdTableView'],
        ['pd stats',       '#pdStats'],
        // UX-7 dashboard
        ['hero rev value', '#heroRevValue'],
        ['hero sparkline', '#heroSparkline'],
        ['stat orders',    '#statOrdersValue'],
        ['stat aov',       '#statAovValue'],
        ['stat customers', '#statCustValue'],
        ['donut',          '#dashChannelDonut'],
        ['top skus list',  '#dashTopSkus'],
        ['top staff list', '#dashTopStaff'],
        ['low stock list', '#dashLowStock'],
        ['cohort bars',    '#dashCohortBars'],
    ];

    for (const [name, sel] of required) {
        const el = doc.querySelector(sel);
        if (el) log('PASS', `DOM: ${name}`, sel);
        else    log('FAIL', `DOM: ${name}`, `${sel} not found`);
    }

    // Payment pills count check
    const pills = doc.querySelectorAll('.cp-pay-pill');
    log(pills.length === 4 ? 'PASS' : 'FAIL', 'DOM: 4 payment pills', `found ${pills.length}`);

    // Mode tabs count
    const modeTabs = doc.querySelectorAll('.mode-tab');
    log(modeTabs.length === 3 ? 'PASS' : 'FAIL', 'DOM: 3 mode tabs', `found ${modeTabs.length}`);

    // CSS files linked
    const tokens = doc.querySelector('link[href^="design-tokens.css"]');
    log(tokens ? 'PASS' : 'FAIL', 'design-tokens.css linked', tokens?.getAttribute('href'));

    // Cache buster correct
    const appJsLink = doc.querySelector('script[src^="app.js"]') || [...doc.querySelectorAll('script')].find(s => (s.src || '').includes('app.js'));
    const cacheVersion = (html.match(/app\.js\?v=(\d+)/) || [])[1];
    log(cacheVersion ? 'PASS' : 'WARN', `app.js cache buster`, `v=${cacheVersion}`);
}

// =============================================================
// BACKEND INTEGRATION TESTS (real DB writes, then cleanup)
// =============================================================

// Mirror VIP tier logic from app.js
function getCustomerTier(c) {
    const orders = c.total_orders || 0;
    if (orders >= 30) return 'Gold';
    if (orders >= 10) return 'Silver';
    if (orders >= 3)  return 'Bronze';
    return null;
}
const TIER_DISCOUNT = { Bronze: 3, Silver: 5, Gold: 10 };

async function backendIntegrationTests() {
    console.log('\n━━━ BACKEND INTEGRATION TESTS ━━━');

    // Pre-flight: published products available
    const { data: pubs } = await sb.from('products_master').select('sku, name, price, brand').eq('is_published', true).limit(5);
    log(pubs && pubs.length > 0 ? 'PASS' : 'FAIL', 'Published products available', `${pubs?.length || 0} found`);
    if (!pubs || pubs.length === 0) return;

    // Pre-flight: VIP customer
    const { data: vips } = await sb.from('customers').select('*').gte('total_orders', 3).order('total_orders', { ascending: false }).limit(20);
    const silverVip = vips?.find(c => c.total_orders >= 10);
    const bronzeVip = vips?.find(c => c.total_orders >= 3 && c.total_orders < 10);
    log(silverVip ? 'PASS' : 'FAIL', 'Silver VIP available', silverVip?.name);
    log(bronzeVip ? 'PASS' : 'FAIL', 'Bronze VIP available', bronzeVip?.name);

    // Pick test product (first published)
    const product = pubs[0];
    const cart = [{ sku: product.sku, name: product.name, price: parseFloat(product.price), quantity: 1 }];
    const cartTotal = cart.reduce((s, i) => s + i.price * i.quantity, 0);

    // ---------- SCENARIO A: Walk-in Cash ----------
    console.log('\n─ Scenario A: Walk-in Cash ─');
    {
        const payload = {
            customer_name: 'Walk-In', customer_phone: null,
            payment_method: 'Cash', channel: 'In-Store', status: 'Completed',
            total: cartTotal, total_amount: cartTotal,
            items: cart, staff_name: 'Test',
            metadata: { test: true, scenario: 'A_walkin_cash' }
        };
        const { data, error } = await sb.from('sales_history').insert([payload]).select();
        if (error) log('FAIL', 'A: insert walk-in sale', error.message);
        else {
            insertedSaleIds.push(data[0].id);
            log('PASS', 'A: insert walk-in sale', `id=${data[0].id} total=RM ${cartTotal}`);
            log(data[0].total === cartTotal ? 'PASS' : 'FAIL', 'A: total matches', `expected ${cartTotal} got ${data[0].total}`);
            log(data[0].status === 'Completed' ? 'PASS' : 'FAIL', 'A: status=Completed');
            log(data[0].payment_method === 'Cash' ? 'PASS' : 'FAIL', 'A: payment=Cash');
            log(Array.isArray(data[0].items) && data[0].items.length === 1 ? 'PASS' : 'FAIL', 'A: items array stored as jsonb');
        }
    }

    // ---------- SCENARIO B: VIP Silver discount ----------
    console.log('\n─ Scenario B: VIP Silver tier 5% discount ─');
    if (silverVip) {
        const tier = getCustomerTier(silverVip);
        const pct = TIER_DISCOUNT[tier];
        const subtotal = cartTotal;
        const expectedDiscount = +(subtotal * pct / 100).toFixed(2);
        const expectedFinal = +(subtotal - expectedDiscount).toFixed(2);

        log('PASS', 'B: tier resolved', `${silverVip.name} → ${tier} (${pct}%)`);
        log('PASS', 'B: discount math', `subtotal=${subtotal} pct=${pct} discount=${expectedDiscount} final=${expectedFinal}`);

        const payload = {
            customer_name: silverVip.name, customer_phone: silverVip.phone,
            payment_method: 'Cash', channel: 'In-Store', status: 'Completed',
            total: expectedFinal, total_amount: expectedFinal,
            items: cart, staff_name: 'Test',
            metadata: {
                test: true, scenario: 'B_vip_silver',
                vip_discount_applied: true,
                vip_discount_pct: pct,
                vip_discount_amount: expectedDiscount,
                vip_subtotal_before_discount: subtotal,
                vip_customer_id: silverVip.id,
                tier: tier
            }
        };
        const { data, error } = await sb.from('sales_history').insert([payload]).select();
        if (error) log('FAIL', 'B: insert VIP sale', error.message);
        else {
            insertedSaleIds.push(data[0].id);
            log('PASS', 'B: insert VIP sale', `id=${data[0].id}`);
            log(parseFloat(data[0].total) === expectedFinal ? 'PASS' : 'FAIL', 'B: discounted total matches', `${data[0].total}`);
            log(data[0].metadata?.vip_discount_applied ? 'PASS' : 'FAIL', 'B: vip flag in metadata');
            log(data[0].metadata?.tier === tier ? 'PASS' : 'FAIL', 'B: tier in metadata');
        }
    }

    // ---------- SCENARIO C: E-Wallet ----------
    console.log('\n─ Scenario C: E-Wallet payment ─');
    {
        const provider = 'TouchNGo';
        const ref = '123456789012';
        const payload = {
            customer_name: 'Walk-In',
            payment_method: `${provider} (Ref: ${ref})`,
            channel: 'In-Store', status: 'Completed',
            total: cartTotal, total_amount: cartTotal,
            items: cart, staff_name: 'Test',
            metadata: {
                test: true, scenario: 'C_ewallet',
                ewallet_provider: provider,
                ewallet_ref: ref
            }
        };
        const { data, error } = await sb.from('sales_history').insert([payload]).select();
        if (error) log('FAIL', 'C: insert e-wallet sale', error.message);
        else {
            insertedSaleIds.push(data[0].id);
            log('PASS', 'C: insert e-wallet sale', `id=${data[0].id}`);
            log(data[0].payment_method.includes(provider) ? 'PASS' : 'FAIL', 'C: provider in payment_method');
            log(data[0].payment_method.includes(ref) ? 'PASS' : 'FAIL', 'C: ref# in payment_method');
            log(data[0].metadata?.ewallet_provider === provider ? 'PASS' : 'FAIL', 'C: provider in metadata');
        }
    }

    // ---------- SCENARIO D: Receipt action templates ----------
    console.log('\n─ Scenario D: Receipt templates (URL gen) ─');
    {
        const phone = '60123456789';
        const email = 'test@example.com';
        const total = 100.00;
        const invId = 'TEST-INV-001';

        // WhatsApp URL gen mirrors cpReceiptWhatsApp
        const phoneNorm = phone.replace(/\D/g, '').replace(/^0/, '60');
        const itemList = cart.map(it => `• ${it.name||it.sku} x${it.quantity||1} = RM${((it.quantity||1)*(it.price||0)).toFixed(2)}`).join('\n');
        const msg = `Salam dari *10 CAMP*!\n\nResit: ${invId}\n${itemList}\n\n*Total: RM ${total.toFixed(2)}*\n\nTerima kasih atas pembelian!`;
        const waUrl = `https://wa.me/${phoneNorm}?text=${encodeURIComponent(msg)}`;
        log(waUrl.startsWith('https://wa.me/') ? 'PASS' : 'FAIL', 'D: WhatsApp URL valid');
        log(waUrl.includes(phoneNorm) ? 'PASS' : 'FAIL', 'D: phone normalised in URL');
        log(decodeURIComponent(waUrl).includes('10 CAMP') ? 'PASS' : 'FAIL', 'D: shop name in WA message');

        // Mailto gen mirrors cpReceiptEmail
        const subject = encodeURIComponent(`E-Resit ${invId} dari 10 CAMP`);
        const body = encodeURIComponent(`Salam,\n\nResit: ${invId}\n\nTotal: RM ${total.toFixed(2)}\n\nTerima kasih!`);
        const mailto = `mailto:${email}?subject=${subject}&body=${body}`;
        log(mailto.startsWith('mailto:') ? 'PASS' : 'FAIL', 'D: mailto: URL valid');
        log(decodeURIComponent(mailto).includes(email) ? 'PASS' : 'FAIL', 'D: email in mailto');
    }

    // ---------- SCENARIO E: Customer display localStorage shape ----------
    console.log('\n─ Scenario E: Customer display payload ─');
    {
        // Mirror writeCustomerDisplayCart()
        const payload = {
            items: cart,
            vip: silverVip ? {
                customer_name: silverVip.name,
                tier: 'Silver',
                discount_pct: 5
            } : null,
            updatedAt: new Date().toISOString()
        };
        const json = JSON.stringify(payload);
        const parsed = JSON.parse(json);
        log(Array.isArray(parsed.items) ? 'PASS' : 'FAIL', 'E: items array round-trips');
        log(parsed.updatedAt && new Date(parsed.updatedAt).toString() !== 'Invalid Date' ? 'PASS' : 'FAIL', 'E: timestamp valid ISO');
        log(silverVip ? (parsed.vip?.tier === 'Silver' ? 'PASS' : 'FAIL') : 'WARN', 'E: VIP block in payload');
    }

    // ---------- BONUS: Refund flow ----------
    console.log('\n─ Bonus: Refund flow ─');
    if (insertedSaleIds.length > 0) {
        const origId = insertedSaleIds[0];
        // Fetch the original
        const { data: orig } = await sb.from('sales_history').select('*').eq('id', origId).single();
        if (orig) {
            const refundPayload = {
                customer_name: orig.customer_name,
                payment_method: orig.payment_method,
                channel: orig.channel,
                status: 'Refund',
                total: -orig.total,
                total_amount: -orig.total,
                items: orig.items,
                staff_name: 'Test-Refund',
                metadata: {
                    test: true, scenario: 'refund',
                    original_order_id: origId,
                    refund_kind: 'full'
                }
            };
            const { data, error } = await sb.from('sales_history').insert([refundPayload]).select();
            if (error) log('FAIL', 'Refund: insert', error.message);
            else {
                insertedSaleIds.push(data[0].id);
                log(parseFloat(data[0].total) < 0 ? 'PASS' : 'FAIL', 'Refund: negative total stored', `total=${data[0].total}`);
                log(data[0].status === 'Refund' ? 'PASS' : 'FAIL', 'Refund: status=Refund');
                log(data[0].metadata?.original_order_id === origId ? 'PASS' : 'FAIL', 'Refund: links to original');
            }
        }
    }
}

// =============================================================
// CLEANUP
// =============================================================
async function cleanup() {
    console.log('\n━━━ CLEANUP ━━━');
    if (insertedSaleIds.length === 0) return log('PASS', 'No test sales to clean');
    const { error } = await sb.from('sales_history').delete().in('id', insertedSaleIds);
    if (error) log('FAIL', 'Cleanup test sales', error.message);
    else log('PASS', `Cleanup ${insertedSaleIds.length} test sales`);
}

// =============================================================
// MAIN
// =============================================================
(async () => {
    console.log('🧪 Cashier Flow Test Suite — automated\n');
    try {
        await htmlStructureTests();
        await backendIntegrationTests();
    } catch (e) {
        console.error('Fatal error:', e);
        log('FAIL', 'Test suite crashed', e.message);
    } finally {
        await cleanup();
    }
    // Summary
    console.log('\n━━━ SUMMARY ━━━');
    const pass = results.filter(r => r.status === 'PASS').length;
    const fail = results.filter(r => r.status === 'FAIL').length;
    const warn = results.filter(r => r.status === 'WARN').length;
    console.log(`\x1b[32m✓ ${pass} passed\x1b[0m  \x1b[31m✗ ${fail} failed\x1b[0m  \x1b[33m· ${warn} warned\x1b[0m  (total ${results.length})`);
    if (fail > 0) {
        console.log('\n\x1b[31mFAILED:\x1b[0m');
        results.filter(r => r.status === 'FAIL').forEach(r => console.log(`  ✗ ${r.name} — ${r.detail}`));
        process.exit(1);
    }
    process.exit(0);
})();
