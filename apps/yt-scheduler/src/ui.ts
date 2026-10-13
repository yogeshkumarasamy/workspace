/** Single-file UI: no build step, talks to /api with the key saved in localStorage. */
export function renderUi(opts: { audited: boolean }): string {
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>YT Scheduler</title>
<style>
body{font:14px system-ui,sans-serif;margin:0;background:#0b0b0f;color:#e7e7ea}header{display:flex;gap:12px;align-items:center;padding:12px 20px;background:#16161d;flex-wrap:wrap}
main{padding:20px;max-width:1200px;margin:auto}h1{font-size:18px;margin:0}button,select,input,textarea{font:inherit;background:#22222b;color:inherit;border:1px solid #333;border-radius:6px;padding:6px 10px}
button{cursor:pointer}button.primary{background:#e11d48;border-color:#e11d48}table{width:100%;border-collapse:collapse}td,th{padding:8px;border-bottom:1px solid #222;text-align:left;vertical-align:top}
.b{padding:2px 8px;border-radius:99px;font-size:12px;background:#333}.queued{background:#334155}.uploading,.processing{background:#a16207}.scheduled{background:#1d4ed8}.published{background:#15803d}.failed{background:#b91c1c}.cancelled{background:#444}
.warn{background:#78350f;padding:10px 14px;border-radius:8px;margin-bottom:16px}.err{color:#fca5a5;font-size:12px}.muted{color:#9ca3af;font-size:12px}section{margin-bottom:24px}textarea{width:100%;min-height:180px;font-family:monospace}
</style></head><body>
<header><h1>📅 YT Scheduler</h1>
<select id="ch" onchange="load()"><option value="">All channels</option></select>
<button onclick="connect()">+ Connect channel</button>
<span id="quota" class="muted"></span><span style="flex:1"></span>
<button onclick="setKey()">API key</button></header>
<main>
${opts.audited ? "" : `<div class="warn"><b>Unverified API project:</b> until Google approves the YouTube API audit, every video this app uploads is locked to <b>Private</b> and scheduled publishing will not go public. See README → “API audit”.</div>`}
<section><h3>Jobs</h3><select id="st" onchange="load()"><option value="">any status</option>${["queued", "uploading", "processing", "scheduled", "published", "failed", "cancelled"].map((s) => `<option>${s}</option>`).join("")}</select>
<table><thead><tr><th>Title</th><th>Type</th><th>Status</th><th>Publish at</th><th>YouTube</th><th></th></tr></thead><tbody id="jobs"></tbody></table></section>
<section><h3>Import from Google Drive folder</h3><input id="folder" placeholder="Drive folder id" size="40"> <button onclick="driveImport(true)">Preview</button> <button class="primary" onclick="driveImport(false)">Import</button><pre id="dout" class="muted"></pre></section>
<section><h3>Create job(s) — JSON (single job or {"jobs":[...]})</h3><textarea id="json">{
  "idempotencyKey": "ep01-long",
  "channel": "@meeyazhpirai",
  "video": { "driveFileId": "DRIVE_FILE_ID" },
  "thumbnail": { "driveFileId": "DRIVE_FILE_ID" },
  "metadata": { "title": "Ep 01 - ...", "type": "long", "description": "", "tags": [] }
}</textarea><br><button class="primary" onclick="createJobs()">Submit</button> <span id="cout" class="muted"></span></section>
<section><h3>Channels</h3><div id="chans" class="muted"></div></section>
</main>
<script>
const K=()=>localStorage.getItem('ytkey')||'';function setKey(){const k=prompt('API key',K());if(k!==null){localStorage.setItem('ytkey',k);init()}}
async function api(p,o={}){const r=await fetch('/api'+p,{...o,headers:{'content-type':'application/json','x-api-key':K()}});const j=await r.json().catch(()=>({}));if(r.status===401){setKey();throw new Error('unauthorized')}return j}
const esc=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const fmt=d=>d?new Date(d).toLocaleString():'';
function connect(){location.href='/oauth/start?key='+encodeURIComponent(K())}
async function init(){if(!K())return setKey();const cs=await api('/channels');const sel=document.getElementById('ch');const cur=sel.value;sel.innerHTML='<option value="">All channels</option>'+cs.map(c=>'<option value="'+c.id+'">'+esc(c.title)+(c.handle?' ('+esc(c.handle)+')':'')+'</option>').join('');sel.value=cur;
document.getElementById('chans').innerHTML=cs.map(c=>'<div><b>'+esc(c.title)+'</b> '+esc(c.handle||'')+' · '+esc(c.youtubeChannelId)+' · '+esc(c.googleEmail||'')+' · shorts daily '+esc(c.slots.shortsTime)+', long weekday '+c.slots.longWeekday+' '+esc(c.slots.longTime)+' '+esc(c.slots.timezone)+' · <a href="#" onclick="location.href=\\'/oauth/start?purpose=drive&channelId='+c.id+'&key=\\'+encodeURIComponent(K());return false" style="color:#93c5fd">use separate Drive account</a></div>').join('')||'No channels yet — click “Connect channel”.';load()}
async function load(){const ch=document.getElementById('ch').value,st=document.getElementById('st').value;const q=new URLSearchParams();if(ch)q.set('channel',ch);if(st)q.set('status',st);
const [jobs,quota]=await Promise.all([api('/jobs?'+q),api('/quota')]);document.getElementById('quota').textContent='Quota '+quota.used+'/'+quota.limit+' · ~'+quota.uploadsLeftToday+' uploads left · resets '+fmt(quota.resetsAt);
document.getElementById('jobs').innerHTML=jobs.map(j=>'<tr><td>'+esc(j.metadata.title)+'<div class="muted">'+esc(j.idempotencyKey)+'</div>'+(j.lastError?'<div class="err">'+esc(j.lastError)+' (attempt '+j.attempts+')</div>':'')+(j.warnings||[]).map(w=>'<div class="muted">⚠ '+esc(w)+'</div>').join('')+'</td><td>'+j.metadata.type+'</td><td><span class="b '+j.status+'">'+j.status+'</span><div class="muted">run '+fmt(j.runAt)+'</div></td><td>'+fmt(j.publishAt)+'</td><td>'+(j.youtubeVideoId?'<a style="color:#93c5fd" target="_blank" href="https://studio.youtube.com/video/'+j.youtubeVideoId+'/edit">'+j.youtubeVideoId+'</a>':'')+'</td><td>'+(['queued','failed'].includes(j.status)?'<button onclick="act(\\''+j.id+'\\',\\'cancel\\')">Cancel</button> ':'')+(['failed','cancelled'].includes(j.status)?'<button onclick="act(\\''+j.id+'\\',\\'retry\\')">Retry</button>':'')+'</td></tr>').join('')}
async function act(id,a){await api('/jobs/'+id+'/'+a,{method:'POST'});load()}
async function createJobs(){let b;try{b=JSON.parse(document.getElementById('json').value)}catch(e){return document.getElementById('cout').textContent='Invalid JSON'}const r=await api('/jobs',{method:'POST',body:JSON.stringify(b)});document.getElementById('cout').textContent=JSON.stringify(r.error?r:(r.results||{created:r.created,id:r.job&&r.job.id}));load()}
async function driveImport(dry){const ch=document.getElementById('ch').value;const r=await api('/drive/import',{method:'POST',body:JSON.stringify({folderId:document.getElementById('folder').value.trim(),channel:ch||undefined,dryRun:dry})});document.getElementById('dout').textContent=JSON.stringify(r,null,2);if(!dry)load()}
init();setInterval(()=>K()&&load(),15000);
</script></body></html>`;
}
