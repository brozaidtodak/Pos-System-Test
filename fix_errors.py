import re

with open('app.js', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Fix roster-sync-channel
roster_old = """        // Supabase Real-time Roster Broadcaster
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
          .subscribe();"""

roster_new = """        // Supabase Real-time Roster Broadcaster
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
        }"""

if roster_old in content:
    content = content.replace(roster_old, roster_new)
    print("Fixed roster-sync-channel")
else:
    print("Could not find roster-sync-channel block")

# 2. Fix toggleInvForm Error
content = content.replace("await initApp(); toggleInvForm('');", "await initApp();")
content = content.replace("toggleInvForm('');", "")

# 3. Remove toggleInvForm definition completely
toggle_def = """window.toggleInvForm = function(formId) {
    const f1 = document.getElementById("newSkuForm");
    const f2 = document.getElementById("inboundForm");
    const f3 = document.getElementById("csvForm");
    if(formId === 'newSkuForm') { f1.style.display = 'block'; f2.style.display = 'none'; f3.style.display = 'none';}
    if(formId === 'inboundForm') { f2.style.display = 'block'; f1.style.display = 'none'; f3.style.display = 'none';}
    if(formId === 'csvForm') { f3.style.display = 'block'; f1.style.display = 'none'; f2.style.display = 'none';}
    if(!formId) { f1.style.display = 'none'; f2.style.display = 'none'; f3.style.display = 'none'; }
}"""

if toggle_def in content:
    content = content.replace(toggle_def, "")
    print("Fixed toggleInvForm")
else:
    print("Could not find toggleInvForm definition. Attempting regex...")
    content = re.sub(r'window\.toggleInvForm = function\(formId\)\s*\{.*?\n\}', '', content, flags=re.DOTALL)


with open('app.js', 'w', encoding='utf-8') as f:
    f.write(content)

