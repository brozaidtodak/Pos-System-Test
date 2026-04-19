import os

with open('../app_backup.js', 'r') as f:
    backup_lines = f.readlines()

append_block = "".join(backup_lines[8690:9078])

with open('app.js', 'r') as f:
    app_js = f.read()

# Add to initApp
if "await db.from('quotations_log')" not in app_js:
    old_fetch = "let { data: sales } = await db.from('sales_history').select('*').order('created_at', {ascending: false});"
    new_fetch = """        try { renderQuotePOS(); } catch(e){}
        let { data: quotes } = await db.from('quotations_log').select('*').order('created_at', {ascending: false});
        if(quotes) quoteHistoryLogs = quotes;

        let { data: sales } = await db.from('sales_history').select('*').order('created_at', {ascending: false});"""
    app_js = app_js.replace(old_fetch, new_fetch)

# Append block if not present
if "QUOTATIONS & RENTALS MODULE" not in app_js:
    app_js = app_js + "\n\n" + append_block

with open('app.js', 'w') as f:
    f.write(app_js)

print("Updated app.js")
