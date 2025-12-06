
// Healthy Habit Tracker UI/UX polished script
const STORAGE = 'hh_uiux_v1';
let data = { habits: [] };

const habitForm = document.getElementById('habitForm');
const habitName = document.getElementById('habitName');
const habitTime = document.getElementById('habitTime');
const habitCategory = document.getElementById('habitCategory');
const addBtn = document.getElementById('addBtn');
const notifyPermBtn = document.getElementById('notifyPermBtn');
const exportBtn = document.getElementById('exportBtn');
const importBtn = document.getElementById('importBtn');
const ring = document.getElementById('ring');
const progressText = document.getElementById('progressText');
const habitsList = document.getElementById('habitsList');
const noHabits = document.getElementById('noHabits');
const debugLog = document.getElementById('debugLog');
const dateLabel = document.getElementById('dateLabel');
const weekChart = document.getElementById('weekChart');
const installBtn = document.getElementById('installBtn');
const darkToggle = document.getElementById('darkToggle');
const categoryChips = document.getElementById('categoryChips');
const search = document.getElementById('search');

let deferredInstall = null;

// Utils
function todayISO(){ return new Date().toISOString().slice(0,10); }
function log(msg){ const t=new Date().toLocaleTimeString(); const el=document.createElement('div'); el.textContent = '['+t+'] '+msg; debugLog.prepend(el); if(debugLog.childElementCount>80) debugLog.removeChild(debugLog.lastChild); }
function load(){ const raw = localStorage.getItem(STORAGE); if(raw) data = JSON.parse(raw); }
function save(){ localStorage.setItem(STORAGE, JSON.stringify(data)); }

// Init UI
dateLabel.textContent = new Date().toLocaleDateString();

// Service worker
if('serviceWorker' in navigator){
  navigator.serviceWorker.register('service-worker.js').then(()=>{ log('SW registered'); }).catch(e=>log('SW err '+e));
}

// Add habit
habitForm.addEventListener('submit', (e)=>{
  e.preventDefault();
  const name = habitName.value.trim();
  const time = habitTime.value;
  const category = habitCategory.value || 'other';
  if(!name) return alert('Enter habit name');
  const id = Date.now().toString();
  data.habits.push({id,name,time,category,history:{}});
  save(); render(); habitName.value=''; habitTime.value=''; log('Added '+name);
});

// Render
function render(){
  habitsList.innerHTML = '';
  if(data.habits.length === 0){ noHabits.style.display = 'block'; } else noHabits.style.display = 'none';
  let done = 0;
  const filterCat = document.querySelector('.chip.active')?.dataset?.cat || 'all';
  const q = search.value.trim().toLowerCase();
  data.habits.forEach(h=>{
    if(filterCat !== 'all' && h.category !== filterCat) return;
    if(q && !h.name.toLowerCase().includes(q)) return;
    const div = document.createElement('div'); div.className='habit';
    const left = document.createElement('div');
    const name = document.createElement('div'); name.textContent = h.name; name.style.fontWeight='700';
    const meta = document.createElement('div'); meta.className='meta'; meta.textContent = (h.time?('Reminder: '+h.time+' • '):'') + h.category;
    left.appendChild(name); left.appendChild(meta);
    const right = document.createElement('div');
    const mark = document.createElement('button'); mark.className='btn'; const doneToday = h.history && h.history[todayISO()];
    if(doneToday){ mark.textContent='Done'; mark.disabled=true; done++; }
    else { mark.textContent='Mark'; mark.addEventListener('click', ()=>{ if(!h.history) h.history={}; h.history[todayISO()] = true; save(); render(); log('Marked '+h.name); }); }
    const del = document.createElement('button'); del.className='btn'; del.textContent='Delete'; del.addEventListener('click', ()=>{ if(confirm('Delete?')){ data.habits = data.habits.filter(x=>x.id!==h.id); save(); render(); log('Deleted '+h.name); }});
    right.appendChild(mark); right.appendChild(del);
    div.appendChild(left); div.appendChild(right);
    habitsList.appendChild(div);
  });
  const pct = data.habits.length? Math.round((done/data.habits.length)*100):0;
  progressText.textContent = pct + '%';
  drawRing(parseInt(pct));
  drawWeek();
}

// Draw ring
function drawRing(pct){
  const c = ring.getContext('2d'); const w = ring.width; const h = ring.height; c.clearRect(0,0,w,h);
  const cx = w/2, cy = h/2, r = 28;
  c.beginPath(); c.arc(cx,cy,r,0,Math.PI*2); c.fillStyle = '#f0fbfa'; c.fill();
  c.beginPath(); c.lineWidth = 6; c.strokeStyle = '#0ea5a4'; c.arc(cx,cy,r,-Math.PI/2, -Math.PI/2 + 2*Math.PI*(pct/100)); c.stroke();
}

// Weekly chart
function drawWeek(){
  const ctx = weekChart.getContext('2d'); const w = weekChart.width; const h = weekChart.height; ctx.clearRect(0,0,w,h);
  const days = 7; const labels = []; const vals = [];
  for(let i=days-1;i>=0;i--){ const d=new Date(); d.setDate(d.getDate()-i); const key = d.toISOString().slice(0,10); labels.push(d.toLocaleDateString()); let total=0, done=0; data.habits.forEach(h=>{ total++; if(h.history && h.history[key]) done++; }); vals.push(total?Math.round((done/total)*100):0); }
  const bw = w/(days*2); vals.forEach((v,i)=>{ const x = i*(bw*2)+bw/2; const barH = (v/100)*(h-20); ctx.fillStyle = '#7c3aed'; ctx.fillRect(x, h-20-barH, bw, barH); ctx.fillStyle = '#000'; ctx.fillText(labels[i].split('/')[0], x, h-4); });
}

// Notifications
notifyPermBtn.addEventListener('click', async ()=>{
  if(!('Notification' in window)) return alert('Notifications not supported');
  const p = await Notification.requestPermission();
  alert('Permission: '+p);
  log('Notification permission: '+p);
});

// Export / Import
exportBtn.addEventListener('click', ()=>{ const blob = new Blob([JSON.stringify(data,null,2)],{type:'application/json'}); const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'habits.json'; a.click(); });
importBtn.addEventListener('click', ()=>{ const inp = document.createElement('input'); inp.type='file'; inp.accept='application/json'; inp.onchange = ()=>{ const fr = new FileReader(); fr.onload = ()=>{ try{ data = JSON.parse(fr.result); save(); render(); log('Imported data'); }catch(e){ alert('Invalid file'); } }; fr.readAsText(inp.files[0]); }; inp.click(); });

// Install prompt
window.addEventListener('beforeinstallprompt', (e)=>{ e.preventDefault(); deferredInstall = e; installBtn.style.display='inline-block'; });
installBtn.addEventListener('click', async ()=>{ if(!deferredInstall) return; deferredInstall.prompt(); const choice = await deferredInstall.userChoice; log('Install: '+choice.outcome); deferredInstall = null; installBtn.style.display='none'; });

// Dark mode
darkToggle.addEventListener('click', ()=>{ document.body.classList.toggle('dark'); localStorage.setItem('hh_dark', document.body.classList.contains('dark')); });
if(localStorage.getItem('hh_dark') === 'true') document.body.classList.add('dark');

// Category chips
categoryChips.addEventListener('click', (e)=>{ if(e.target.classList.contains('chip')){ document.querySelectorAll('.chip').forEach(c=>c.classList.remove('active')); e.target.classList.add('active'); render(); } });

// Search
search.addEventListener('input', ()=>render());

// Alarms check
function playBeep(d=700,f=880,v=0.08){ try{ const ctx = new (window.AudioContext||window.webkitAudioContext)(); const o = ctx.createOscillator(); const g = ctx.createGain(); o.type='sine'; o.frequency.value=f; g.gain.value=v; o.connect(g); g.connect(ctx.destination); o.start(); setTimeout(()=>{ o.stop(); try{ ctx.close(); }catch(e){} }, d); }catch(e){ console.warn('beep fail', e); } }
function checkAlarms(){ const now = new Date(); const cur = String(now.getHours()).padStart(2,'0')+':'+String(now.getMinutes()).padStart(2,'0'); log('Checking '+cur); data.habits.forEach(h=>{ if(h.time && h.time === cur){ if(!h._last || h._last !== cur){ h._last = cur; save(); playBeep(); // notify via SW
      if(navigator.serviceWorker && navigator.serviceWorker.controller){
        navigator.serviceWorker.controller.postMessage({type:'show-notification', title:'Habit: '+h.name, body:'Time to do '+h.name});
      } else if(Notification.permission === 'granted'){
        new Notification('Habit: '+h.name, { body: 'Time to do '+h.name });
      } else {
        alert('Reminder: '+h.name);
      }
      log('Triggered '+h.name);
    } } }); }

load(); render();
setInterval(checkAlarms, 20000);
setInterval(()=>{ if(localStorage.getItem('hh_last_date') !== todayISO()){ localStorage.setItem('hh_last_date', todayISO()); data.habits.forEach(h=>{ if(h.history){ Object.keys(h.history).forEach(k=>{ const age = (new Date() - new Date(k))/(1000*60*60*24); if(age>30) delete h.history[k]; }); } delete h._last; }); save(); render(); log('Daily reset'); } }, 60000);
