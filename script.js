
// Advanced Healthy Habit Tracker - script.js
const STORAGE_KEY = 'hh_tracker_v2';
let data = { habits: [] };

const habitForm = document.getElementById('habitForm');
const habitName = document.getElementById('habitName');
const habitCategory = document.getElementById('habitCategory');
const remindersWrap = document.getElementById('remindersWrap');
const addReminderBtn = document.getElementById('addReminderBtn');
const saveHabitBtn = document.getElementById('saveHabitBtn');
const habitsList = document.getElementById('habitsList');
const noHabits = document.getElementById('noHabits');
const debugLog = document.getElementById('debugLog');
const progressText = document.getElementById('progressText');
const progressRing = document.getElementById('progressRing');
const weekChart = document.getElementById('weekChart');

const notifyPermBtn = document.getElementById('notifyPermBtn');
const subscribeBtn = document.getElementById('subscribeBtn');
const testAlarmBtn = document.getElementById('testAlarmBtn');
const clearBtn = document.getElementById('clearBtn');
const exportBtn = document.getElementById('exportBtn');
const importBtn = document.getElementById('importBtn');
const darkToggle = document.getElementById('darkToggle');

let deferredPrompt = null;

// Utility
function todayISO(){ return new Date().toISOString().slice(0,10); }
function nowHM(){ const d=new Date(); return d.toTimeString().slice(0,5); }

function log(msg){ const t=new Date().toLocaleTimeString(); const el=document.createElement('div'); el.textContent='['+t+'] '+msg; debugLog.prepend(el); if(debugLog.childElementCount>60) debugLog.removeChild(debugLog.lastChild); console.log(msg); }

function load(){ const raw=localStorage.getItem(STORAGE_KEY); if(raw) data = JSON.parse(raw); render(); }
function save(){ localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); }

// Manage reminders inputs
addReminderBtn.addEventListener('click', ()=>{ const inp=document.createElement('input'); inp.type='time'; inp.className='remTime'; remindersWrap.appendChild(inp); });

// Dark mode
darkToggle.addEventListener('click', ()=>{
  document.body.classList.toggle('dark');
  localStorage.setItem('hh_dark', document.body.classList.contains('dark'));
});
if(localStorage.getItem('hh_dark') === 'true') document.body.classList.add('dark');

// Add habit
habitForm.addEventListener('submit', (e)=>{
  e.preventDefault();
  const name = habitName.value.trim();
  if(!name) return alert('Enter habit name');
  const category = habitCategory.value;
  const times = Array.from(remindersWrap.querySelectorAll('.remTime')).map(i=>i.value).filter(Boolean);
  const id = Date.now().toString();
  data.habits.push({ id, name, category, times, history: {} });
  save(); render();
  habitName.value=''; remindersWrap.innerHTML = '<input class="remTime" type="time"/>';
  log('Added habit: '+name + (times.length?(' @ '+times.join(', ')):''));
});

// Clear all
clearBtn.addEventListener('click', ()=>{ if(confirm('Clear all?')){ data.habits=[]; save(); render(); log('Cleared all habits'); }});

// Export / Import
exportBtn.addEventListener('click', ()=>{ const blob = new Blob([JSON.stringify(data, null, 2)], {type:'application/json'}); const url = URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download='habits_export.json'; a.click(); URL.revokeObjectURL(url); });
importBtn.addEventListener('click', ()=>{
  const inp = document.createElement('input'); inp.type='file'; inp.accept='application/json';
  inp.onchange = ()=>{ const f = inp.files[0]; const reader = new FileReader(); reader.onload = ()=>{ try{ data = JSON.parse(reader.result); save(); render(); log('Imported data'); }catch(e){ alert('Invalid file'); } }; reader.readAsText(f); };
  inp.click();
});

// Notification permission
notifyPermBtn.addEventListener('click', async ()=>{ if(!('Notification' in window)) return alert('No Notification API'); const p = await Notification.requestPermission(); log('Notification permission: '+p); alert('Permission: '+p); });

// Service worker registration
if('serviceWorker' in navigator){
  navigator.serviceWorker.register('service-worker.js').then(reg=>{ log('SW registered'); }).catch(e=>log('SW failed: '+e));
}

// Subscribe for push (stores subscription in localStorage for demo)
subscribeBtn.addEventListener('click', async ()=>{
  if(!('serviceWorker' in navigator) || !('PushManager' in window)) return alert('Push not supported');
  try{
    const reg = await navigator.serviceWorker.ready;
    // VAPID public key must come from your server; for demo we'll ask user to paste key after creating server.
    const vapidPublicKey = prompt('Paste VAPID public key (leave empty for demo subscription):','');
    const options = vapidPublicKey ? { applicationServerKey: urlBase64ToUint8Array(vapidPublicKey), userVisibleOnly: true } : { userVisibleOnly: true };
    const sub = await reg.pushManager.subscribe(options);
    localStorage.setItem('hh_push_sub', JSON.stringify(sub));
    alert('Subscribed (demo). Save this subscription on your server to send pushes.');
    log('Push subscription saved locally (demo).');
  }catch(e){ alert('Subscription failed: '+e); log('Push subscribe failed: '+e); }
});

// Helpers for VAPID key
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) outputArray[i] = rawData.charCodeAt(i);
  return outputArray;
}

// Test alarm
testAlarmBtn.addEventListener('click', ()=>{ playBeep(700,880,0.09); if(navigator.serviceWorker && navigator.serviceWorker.controller){ navigator.serviceWorker.controller.postMessage({type:'show-notification', title:'Test Reminder', body:'This is a test'}); } else if(Notification.permission==='granted'){ new Notification('Test Reminder', { body:'This is a test' }); } alert('Test alarm sent'); });

// Play beep
function playBeep(duration=600,freq=880,vol=0.08){ try{ const ctx = new (window.AudioContext||window.webkitAudioContext)(); const o = ctx.createOscillator(); const g = ctx.createGain(); o.type='sine'; o.frequency.value=freq; g.gain.value=vol; o.connect(g); g.connect(ctx.destination); o.start(); setTimeout(()=>{ o.stop(); try{ ctx.close(); }catch(e){}}, duration); }catch(e){ console.warn('beep fail',e); } }

// Render
function render(){
  habitsList.innerHTML=''; if(data.habits.length===0){ noHabits.style.display='block'; }else noHabits.style.display='none';
  let done=0;
  data.habits.forEach(h=>{
    const div=document.createElement('div'); div.className='habit';
    const left=document.createElement('div'); left.className='left';
    const name=document.createElement('div'); name.className='name'; name.textContent=h.name;
    const meta=document.createElement('div'); meta.className='meta'; meta.textContent = (h.times && h.times.length? ('Reminders: '+h.times.join(', ')) : 'No reminders') + ' • ' + h.category;
    left.appendChild(name); left.appendChild(meta);
    const right=document.createElement('div'); const markBtn=document.createElement('button'); markBtn.className='btn'; const doneToday = h.history && h.history[todayISO()];
    if(doneToday){ markBtn.textContent='Done'; markBtn.disabled=true; done++; } else markBtn.textContent='Mark';
    markBtn.addEventListener('click', ()=>{ if(!h.history) h.history={}; h.history[todayISO()] = true; save(); render(); log('Marked done: '+h.name); });
    const editBtn=document.createElement('button'); editBtn.className='btn'; editBtn.textContent='Edit'; editBtn.addEventListener('click', ()=>{ editHabit(h.id); });
    const delBtn=document.createElement('button'); delBtn.className='btn'; delBtn.textContent='Delete'; delBtn.addEventListener('click', ()=>{ if(confirm('Delete?')){ data.habits = data.habits.filter(x=>x.id!==h.id); save(); render(); }});
    right.appendChild(markBtn); right.appendChild(editBtn); right.appendChild(delBtn);
    div.appendChild(left); div.appendChild(right); habitsList.appendChild(div);
  });
  const pct = data.habits.length===0?0:Math.round((done/data.habits.length)*100);
  progressText.textContent = pct + '%';
  drawRing(progressRing, pct);
  drawWeekChart();
}

// Edit habit
function editHabit(id){
  const h = data.habits.find(x=>x.id===id); if(!h) return;
  habitName.value = h.name; habitCategory.value = h.category; remindersWrap.innerHTML = ''; (h.times||[]).forEach(t=>{ const i=document.createElement('input'); i.type='time'; i.className='remTime'; i.value=t; remindersWrap.appendChild(i); });
  // On save, remove old and add new
  data.habits = data.habits.filter(x=>x.id!==id);
  save();
}

// Check alarms every 20s
function checkAlarms(){
  const now = new Date(); const hh = String(now.getHours()).padStart(2,'0'); const mm = String(now.getMinutes()).padStart(2,'0'); const cur = hh+':'+mm;
  log('Checking alarms: '+cur);
  data.habits.forEach(h=>{
    (h.times||[]).forEach(t=>{
      if(t===cur){
        if(!h._lastTriggered || h._lastTriggered !== cur){
          h._lastTriggered = cur; save();
          triggerReminder(h);
          log('Triggered: '+h.name+' @ '+cur);
        }
      }
    });
  });
}

// Trigger reminder: beep + notification via SW
function triggerReminder(habit){
  playBeep(700,800,0.09);
  if(navigator.serviceWorker && navigator.serviceWorker.controller){
    navigator.serviceWorker.controller.postMessage({type:'show-notification', title:'Habit: '+habit.name, body:'Tap to open. Actions: Snooze / Mark' });
  } else if(Notification.permission==='granted'){
    new Notification('Habit: '+habit.name, { body:'Open app to mark or snooze' });
  } else {
    alert('Reminder: '+habit.name);
  }
}

// Daily reset housekeeping
function dailyReset(){
  const last = localStorage.getItem('hh_last_date'); const today = todayISO();
  if(last !== today){
    data.habits.forEach(h=>{ if(h.history){ Object.keys(h.history).forEach(k=>{ const age = (new Date() - new Date(k))/(1000*60*60*24); if(age>30) delete h.history[k]; }); } delete h._lastTriggered; });
    localStorage.setItem('hh_last_date', today); save(); render(); log('Daily reset for '+today);
  }
}

// Draw ring
function drawRing(canvas, pct){
  const ctx = canvas.getContext('2d'); const w=canvas.width; const h=canvas.height; ctx.clearRect(0,0,w,h);
  const cx=w/2, cy=h/2, r=30;
  ctx.beginPath(); ctx.arc(cx,cy,r,0,Math.PI*2); ctx.fillStyle='#f1f6f5'; ctx.fill();
  ctx.beginPath(); ctx.arc(cx,cy,r,-Math.PI/2, (-Math.PI/2)+(2*Math.PI*(pct/100))); ctx.lineWidth=8; ctx.strokeStyle='#16a34a'; ctx.stroke();
}

// Week chart (simple)
function drawWeekChart(){
  const ctx = weekChart.getContext('2d'); const w=weekChart.width; const h=weekChart.height; ctx.clearRect(0,0,w,h);
  const days = 7; const labels=[]; const values=[];
  for(let i=days-1;i>=0;i--){ const d = new Date(); d.setDate(d.getDate()-i); const key = d.toISOString().slice(0,10); labels.push(d.toLocaleDateString()); let total=0, done=0; data.habits.forEach(h=>{ total++; if(h.history && h.history[key]) done++; }); values.push(total? Math.round((done/total)*100):0); }
  // draw bars
  const bw = w/(days*2); values.forEach((v,i)=>{ const x = i*(bw*2)+bw/2; const barH = (v/100)*(h-20); ctx.fillStyle='#7c3aed'; ctx.fillRect(x, h-10-barH, bw, barH); ctx.fillStyle='#000'; ctx.fillText(labels[i].split('/')[0], x, h-2); });
}

// Listen to SW messages (notification actions)
navigator.serviceWorker && navigator.serviceWorker.addEventListener('message', event=>{
  const d = event.data;
  if(d && d.type === 'notification-action'){
    const action = d.action;
    log('Notification action: '+action);
    // For demo: if mark => mark first habit done; if snooze => schedule snooze by setting timeout in page
    if(action === 'mark'){ if(data.habits[0]){ if(!data.habits[0].history) data.habits[0].history = {}; data.habits[0].history[todayISO()] = true; save(); render(); log('Marked first habit done via action'); } }
    if(action === 'snooze'){ // schedule 10 minutes snooze - post message to SW not needed
      setTimeout(()=>{ if(data.habits[0]) triggerReminder(data.habits[0]); }, 10*60*1000);
      log('Snoozed first habit by 10 minutes (demo)');
    }
  }
});

// Boot
load();
dailyReset();
render();
setInterval(checkAlarms, 20000);
setInterval(dailyReset, 60*1000);
