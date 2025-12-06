
// Mobile-first PWA script (responsive behavior)
// Minimal script to manage habits + install prompt and alarms
const STORAGE = 'hh_mobile_v1';
let data = { habits: [] };

const habitForm = document.getElementById('habitForm');
const habitName = document.getElementById('habitName');
const habitTime = document.getElementById('habitTime');
const habitsList = document.getElementById('habitsList');
const noHabits = document.getElementById('noHabits');
const debugLog = document.getElementById('debugLog');
const installBtn = document.getElementById('installBtn');
const installHint = document.getElementById('installHint');
const menuBtn = document.getElementById('menuBtn');
const sidebar = document.getElementById('sidebar');

function log(msg){ const d=new Date().toLocaleTimeString(); const el=document.createElement('div'); el.textContent='['+d+'] '+msg; debugLog.prepend(el); if(debugLog.childElementCount>40) debugLog.removeChild(debugLog.lastChild); }

function load(){ const raw=localStorage.getItem(STORAGE); if(raw) data = JSON.parse(raw); render(); }
function save(){ localStorage.setItem(STORAGE, JSON.stringify(data)); }

habitForm.addEventListener('submit', (e)=>{ e.preventDefault(); const name=habitName.value.trim(); const time=habitTime.value; if(!name) return alert('Enter habit name'); data.habits.push({id:Date.now().toString(), name, time, history:{}}); save(); habitName.value=''; habitTime.value=''; render(); log('Added '+name+(time?(' @ '+time):'')); });

function render(){ habitsList.innerHTML=''; if(data.habits.length===0){ noHabits.style.display='block'; } else noHabits.style.display='none'; data.habits.forEach(h=>{ const div=document.createElement('div'); div.className='habit'; const left=document.createElement('div'); left.textContent = h.name + (h.time?(' • '+h.time):''); const right=document.createElement('div'); const mark=document.createElement('button'); mark.className='btn'; const doneToday = h.history && h.history[new Date().toISOString().slice(0,10)]; if(doneToday){ mark.textContent='Done'; mark.disabled=true; } else { mark.textContent='Mark'; mark.addEventListener('click', ()=>{ if(!h.history) h.history={}; h.history[new Date().toISOString().slice(0,10)] = true; save(); render(); log('Marked '+h.name); }); } const del=document.createElement('button'); del.className='btn'; del.textContent='Delete'; del.addEventListener('click', ()=>{ if(confirm('Delete?')){ data.habits=data.habits.filter(x=>x.id!==h.id); save(); render(); } }); right.appendChild(mark); right.appendChild(del); div.appendChild(left); div.appendChild(right); habitsList.appendChild(div); }); }

document.getElementById('clearBtn').addEventListener('click', ()=>{ if(confirm('Clear all?')){ data.habits=[]; save(); render(); log('Cleared all'); }});

// WebAudio beep for alarm
function playBeep(d=700,f=880,v=0.08){ try{ const ctx=new (window.AudioContext||window.webkitAudioContext)(); const o=ctx.createOscillator(); const g=ctx.createGain(); o.type='sine'; o.frequency.value=f; g.gain.value=v; o.connect(g); g.connect(ctx.destination); o.start(); setTimeout(()=>{ o.stop(); try{ ctx.close(); }catch(e){} }, d); }catch(e){ console.warn('beep fail', e); } }

// Test alarm button
document.getElementById('testAlarmBtn').addEventListener('click', ()=>{ playBeep(); alert('Test alarm (beep)'); });

// Register service worker
if('serviceWorker' in navigator){ navigator.serviceWorker.register('service-worker.js').then(()=>{ log('SW registered'); }).catch(e=>log('SW failed: '+e)); }

// Install prompt handling
let deferredInstall = null;
window.addEventListener('beforeinstallprompt', (e)=>{ e.preventDefault(); deferredInstall = e; installBtn.style.display='inline-block'; installHint.style.display='block'; installBtn.addEventListener('click', async ()=>{ installBtn.style.display='none'; deferredInstall.prompt(); const choice = await deferredInstall.userChoice; log('Install: '+choice.outcome); deferredInstall=null; installHint.style.display='none'; }); });
window.addEventListener('appinstalled', ()=>{ log('App installed'); installBtn.style.display='none'; installHint.style.display='none'; });

// Menu toggle for small screens
menuBtn.addEventListener('click', ()=>{ if(window.innerWidth<720){ sidebar.classList.toggle('open'); }});

// Alarm check loop
function checkAlarms(){ const now=new Date(); const cur = String(now.getHours()).padStart(2,'0')+':'+String(now.getMinutes()).padStart(2,'0'); log('Checking '+cur); data.habits.forEach(h=>{ if(h.time===cur){ if(!h._last || h._last!==cur){ h._last=cur; save(); playBeep(); if(navigator.serviceWorker && navigator.serviceWorker.controller){ navigator.serviceWorker.controller.postMessage({type:'show-notification', title:'Habit: '+h.name, body:'Tap to open'}); } else if(Notification.permission==='granted'){ new Notification('Habit: '+h.name, { body:'Tap to open' }); } else { alert('Reminder: '+h.name); } log('Triggered '+h.name); } } }); }

load();
setInterval(checkAlarms, 20000);
