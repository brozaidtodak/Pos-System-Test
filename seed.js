const SUPABASE_URL = "https://asehjdnfzoypbwfeazra.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFzZWhqZG5mem95cGJ3ZmVhenJhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU2MjE2NjMsImV4cCI6MjA5MTE5NzY2M30.34nAhmcNO_xN73OdsyxayKl_jipIk-M8DIBgibAOdaI";

const pattern = [
  "Zakwan",
  "Aliff",
  "Fahmi",
  "Tarmizi",
  "Irfan",
  "Ariff",
  "Farhan Moyy"
];

let payload = [];
let today = Date.now(); // random IDs

for (let d = 1; d <= 30; d++) {
  let dayStr = d < 10 ? '0' + d : String(d);
  let dateStr = `2026-04-${dayStr}`;
  let staffIndex = (d - 1) % 7;
  let staffName = pattern[staffIndex];
  
  payload.push({
    id: today + d,
    staff_name: staffName,
    date: dateStr,
    shift: 'OFF',
    mc_name: ''
  });
}

async function seed() {
  console.log("Seeding payload of length", payload.length);
  const res = await fetch(`${SUPABASE_URL}/rest/v1/roster_schedules`, {
    method: 'POST',
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=minimal'
    },
    body: JSON.stringify(payload)
  });

  if (!res.ok) {
    let err = await res.text();
    console.error("FAILED!", err);
  } else {
    console.log("SUCCESSFULLY PLANTED APRIL LOOP!");
  }
}

seed();
