/* =========================================================
 *  DLTV ครูต้นทาง – Front-end
 * ========================================================= */
const $ = (s, el) => (el || document).querySelector(s);
const $$ = (s, el) => Array.from((el || document).querySelectorAll(s));
const S = { init: null, records: [], ready: false, plan: null, prop: null, step: 1, edit: -1, sel: '', panelMode: 'teach' };
const TH_M = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
const TH_D = ['อา.', 'จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.'];
const TH_DAY = ['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์'];
const TH_MONTH = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];
function thDateLong(s) { const d = parseD(s); return d ? TH_D[d.getDay()] + ' ' + d.getDate() + ' ' + TH_M[d.getMonth()] + ' ' + (d.getFullYear() + 543) : ''; }
function iso(d) { return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }

/* ---------- utilities ---------- */
function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
function nl(s) { return esc(s).replace(/\n/g, '<br>'); }
function parseD(s) { const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s || ''); return m ? new Date(+m[1], +m[2] - 1, +m[3]) : null; }
function thDate(s, full) {
  const d = parseD(s); if (!d) return s || '';
  const y = d.getFullYear() + 543;
  return d.getDate() + ' ' + TH_M[d.getMonth()] + ' ' + (full ? y : String(y).slice(-2));
}
function thDay(s) { const d = parseD(s); return d ? TH_D[d.getDay()] : ''; }
function thTime(t) { return t ? t.replace(':', '.') + ' น.' : ''; }
function thRange(a, b) { if (!a && !b) return ''; if (a && b) return thTime(a) + ' – ' + thTime(b); return thTime(a || b); }
function thRangeDates(a, b) {
  const da = parseD(a), db = parseD(b);
  if (da && db && da.getMonth() === db.getMonth() && da.getFullYear() === db.getFullYear())
    return da.getDate() + ' – ' + db.getDate() + ' ' + TH_M[db.getMonth()] + ' ' + (db.getFullYear() + 543);
  return [thDate(a, 1), thDate(b, 1)].filter(Boolean).join(' – ');
}
function since(ts) {
  if (!ts) return '';
  const d = new Date(ts.replace(' ', 'T')); if (isNaN(d)) return ts;
  const m = Math.round((Date.now() - d) / 60000);
  if (m < 1) return 'เมื่อสักครู่'; if (m < 60) return m + ' นาทีที่แล้ว';
  if (m < 1440) return Math.round(m / 60) + ' ชม.ที่แล้ว';
  return thDate(ts.slice(0, 10), 1);
}

/* ---------- API (GAS web app) ---------- */
const CFG = window.APP_CONFIG || {};
const MODE = !CFG.API_URL ? 'demo' : (CFG.GOOGLE_CLIENT_ID ? 'google' : 'lite');
const AUTH = { token: '', email: '', name: '', picture: '', exp: 0 };

async function api(action, ...args) {
  if (MODE === 'demo') return DemoAPI.call(action, args);
  if (MODE === 'google' && (!AUTH.token || AUTH.exp * 1000 < Date.now() + 30000)) {
    showLogin('เซสชันหมดอายุ กรุณาลงชื่อเข้าใช้อีกครั้ง');
    throw new Error('กรุณาลงชื่อเข้าใช้อีกครั้ง');
  }
  let res;
  try {
    const r = await fetch(CFG.API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' }, // simple request: ไม่ต้อง preflight (CORS)
      body: JSON.stringify({ action, args, token: AUTH.token, email: AUTH.email, name: AUTH.name })
    });
    res = await r.json();
  } catch (e) {
    throw new Error('เชื่อมต่อเซิร์ฟเวอร์ไม่ได้ – ตรวจสอบ API_URL และการ deploy เว็บแอป GAS');
  }
  if (!res.ok) {
    if (res.code === 'AUTH') showLogin(res.error);
    throw new Error(res.error || 'เกิดข้อผิดพลาด');
  }
  return res.data;
}

/* ---------- โหมดทดลอง: จำลองหลังบ้านใน localStorage ---------- */
const DemoAPI = (() => {
  const K = 'dltv_demo_db';
  const load = () => { try { return JSON.parse(localStorage.getItem(K)) || { plans: {}, props: {} }; } catch (e) { return { plans: {}, props: {} }; } };
  const save = db => { try { localStorage.setItem(K, JSON.stringify(db)); } catch (e) { } };
  const now = () => { const d = new Date(); return new Date(d - d.getTimezoneOffset() * 60000).toISOString().slice(0, 19).replace('T', ' '); };
  const id = p => p + Date.now().toString().slice(-9) + Math.floor(Math.random() * 900 + 100);
  const F = {
    getInit: () => ({ email: AUTH.email, name: AUTH.name, picture: AUTH.picture || '', profile: (load().profiles || {})[AUTH.email] || { teacher: AUTH.name }, isAdmin: true, originSchool: 'โรงเรียนวังไกลกังวล ในพระบรมราชูปถัมภ์', periodsPerWeek: 8, schools: ['โรงเรียนบ้านหนองหญ้าปล้อง'], subjects: ['ภาษาไทย', 'คณิตศาสตร์', 'วิทยาศาสตร์', 'ภาษาอังกฤษ', 'สังคมศึกษา'], affiliations: ['สพป.ประจวบคีรีขันธ์ เขต 1', 'สพป.ประจวบคีรีขันธ์ เขต 2', 'กองบัญชาการตำรวจตระเวนชายแดน (ตชด.)', 'องค์กรปกครองส่วนท้องถิ่น (อปท.)'] }),
    savePlan: p => {
      const db = load(); p = JSON.parse(JSON.stringify(p));
      p.items = (p.items || []).filter(i => i.date || i.detail || i.subject);
      const old = p.id && db.plans[p.id];
      p.id = old ? p.id : id('PL'); p.created = old ? old.created : now(); p.updated = now(); p.email = AUTH.email;
      p.periods = p.items.filter(i => i.type === 'เข้าสอน').length;
      db.plans[p.id] = p; db.profiles = db.profiles || {};
      const pf = db.profiles[AUTH.email] = db.profiles[AUTH.email] || {};
      ['teacher', 'originSubject', 'destSubject', 'destSchool', 'affiliation', 'district', 'province'].forEach(k => { if (p[k]) pf[k] = p[k]; });
      save(db); return { id: p.id, periods: p.periods };
    },
    getPlan: i => { const p = load().plans[i]; if (!p) throw new Error('ไม่พบแผนปฏิบัติงาน'); return p; },
    saveProposal: p => {
      const db = load(); p = JSON.parse(JSON.stringify(p));
      p.items = (p.items || []).filter(i => i.problem || i.before || i.after || i.topic);
      const old = p.id && db.props[p.id];
      p.id = old ? p.id : id('PR'); p.created = old ? old.created : now(); p.updated = now(); p.email = AUTH.email;
      db.props[p.id] = p; save(db); return { id: p.id, count: p.items.length };
    },
    getProposal: i => { const p = load().props[i]; if (!p) throw new Error('ไม่พบข้อเสนอ'); return p; },
    deleteRecord: (k, i) => { const db = load(); delete db[k === 'plan' ? 'plans' : 'props'][i]; save(db); return true; },
    listRecords: () => {
      const db = load();
      const plans = Object.values(db.plans).map(p => ({ kind: 'plan', id: p.id, created: p.created, updated: p.updated, email: p.email, teacher: p.teacher, school: p.destSchool, affiliation: p.affiliation, subject: p.destSubject, startDate: p.startDate, endDate: p.endDate, periods: p.periods }));
      const props = Object.values(db.props).map(p => ({ kind: 'proposal', id: p.id, created: p.created, updated: p.updated, email: p.email, teacher: p.teacher, school: p.destSchool, affiliation: p.affiliation, subject: p.destSubject, planId: p.planId, count: p.items.length }));
      const all = plans.concat(props).sort((a, b) => a.updated < b.updated ? 1 : -1);
      return { records: all, isAdmin: true, stat: { plans: plans.length, proposals: props.length, items: props.reduce((s, x) => s + x.count, 0), periods: plans.reduce((s, x) => s + x.periods, 0), schools: new Set(all.map(x => x.school).filter(Boolean)).size } };
    }
  };
  return { call: (a, args) => new Promise((res, rej) => setTimeout(() => { try { res(F[a](...args)); } catch (e) { rej(e); } }, 120)) };
})();

/* ---------- เข้าสู่ระบบ ---------- */
function decodeJwt(t) {
  try {
    const b = t.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(decodeURIComponent(atob(b).split('').map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join('')));
  } catch (e) { return {}; }
}
function setAuth(a) {
  Object.assign(AUTH, a);
  try { localStorage.setItem('dltv_auth', JSON.stringify(AUTH)); } catch (e) { }   // จำการเข้าสู่ระบบไว้ในเครื่อง
}
function restoreAuth() {
  try { const a = JSON.parse(localStorage.getItem('dltv_auth')); if (a) Object.assign(AUTH, a); } catch (e) { }
  if (MODE !== 'google') { const l = store.get('lite'); if (l && !AUTH.email) Object.assign(AUTH, l); }
  if (MODE === 'google') return !!AUTH.token && AUTH.exp * 1000 > Date.now() + 60000;
  return !!AUTH.email;
}
let gsiReady = false;
function initGoogle() {
  if (gsiReady) return true;
  if (!(window.google && google.accounts && google.accounts.id)) return false;
  google.accounts.id.initialize({
    client_id: CFG.GOOGLE_CLIENT_ID,
    callback: r => {
      const p = decodeJwt(r.credential);
      const prev = AUTH.email;
      setAuth({ token: r.credential, email: p.email || '', name: p.name || '', picture: p.picture || '', exp: p.exp || 0 });
      if (started && prev && prev !== AUTH.email) started = false;   // เปลี่ยนบัญชี
      hideLogin(); startApp();
    },
    auto_select: true,
    hd: CFG.ALLOWED_DOMAIN_HINT || undefined,
    use_fedcm_for_prompt: true
  });
  google.accounts.id.renderButton($('#gBtn'), { theme: 'filled_blue', size: 'large', shape: 'pill', text: 'signin_with', locale: 'th', width: 300 });
  gsiReady = true;
  return true;
}
function showLogin(msg) {
  $('#login').classList.add('on');
  $('#loginGoogle').classList.toggle('hide', MODE !== 'google');
  $('#loginLite').classList.toggle('hide', MODE !== 'lite');
  $('#loginDemo').classList.toggle('hide', MODE !== 'demo');
  if (MODE === 'google') {
    const tryInit = n => { if (initGoogle()) google.accounts.id.prompt(); else if (n > 0) setTimeout(() => tryInit(n - 1), 300); else toast('โหลดบริการ Google Sign-In ไม่สำเร็จ', 'bad'); };
    tryInit(30);
  }
  if (MODE === 'lite') { $('#lgName').value = AUTH.name || ''; $('#lgEmail').value = AUTH.email || ''; }
  if (msg) toast(msg, 'bad');
}
function hideLogin() { $('#login').classList.remove('on'); }
function logout() {
  const email = AUTH.email;
  Object.assign(AUTH, { token: '', email: '', name: '', picture: '', exp: 0 });
  S.ready = false; S.init = null; S.records = []; S.plan = null; S.prop = null;
  try { localStorage.removeItem('dltv_auth'); } catch (e) { }
  store.del('lite');
  if (MODE === 'google' && window.google && google.accounts) { google.accounts.id.disableAutoSelect(); if (email) google.accounts.id.revoke(email, () => { }); }
  started = false;
  showLogin();
}

function loading(on) { $('#loader').classList.toggle('on', !!on); }
function toast(msg, type) {
  const t = document.createElement('div');
  t.className = 'toast ' + (type || 'ok');
  t.innerHTML = '<svg class="ico"><use href="#' + (type === 'bad' ? 'i-alert' : 'i-check') + '"/></svg><span>' + esc(msg) + '</span>';
  $('#toasts').appendChild(t);
  while ($('#toasts').children.length > 2) $('#toasts').firstChild.remove();
  setTimeout(() => { t.style.transition = '.3s'; t.style.opacity = 0; setTimeout(() => t.remove(), 300); }, 3200);
}
function errMsg(e) { return (e && e.message) ? e.message.replace(/^Exception:\s*/, '') : String(e); }
function confirmBox(title, text, yes) {
  return new Promise(res => {
    $('#mTitle').textContent = title; $('#mText').textContent = text || '';
    $('#mYes').textContent = yes || 'ยืนยัน';
    $('#ovl').classList.add('on');
    const done = v => { $('#ovl').classList.remove('on'); $('#mYes').onclick = $('#mNo').onclick = null; res(v); };
    $('#mYes').onclick = () => done(true); $('#mNo').onclick = () => done(false);
  });
}
const store = {
  get(k) { try { return JSON.parse(localStorage.getItem('dltv_' + k)); } catch (e) { return null; } },
  set(k, v) { try { localStorage.setItem('dltv_' + k, JSON.stringify(v)); } catch (e) { } },
  del(k) { try { localStorage.removeItem('dltv_' + k); } catch (e) { } }
};


/* =========================================================
 *  ปฏิทินไทย (พ.ศ.) และตัวเลือกเวลา 24 ชม.
 * ========================================================= */
const PK = { el: null, input: null, view: null };
function pkPlace(input) {
  const pk = $('#picker'), r = input.getBoundingClientRect();
  pk.classList.add('on');
  const w = pk.offsetWidth, h = pk.offsetHeight;
  let left = Math.min(r.left, window.innerWidth - w - 10), top = r.bottom + 6;
  if (top + h > window.innerHeight - 10 && r.top - h - 6 > 0) top = r.top - h - 6;
  pk.style.left = Math.max(10, left) + 'px'; pk.style.top = top + 'px';
}
function pkClose() { $('#picker').classList.remove('on'); $('#picker').innerHTML = ''; PK.input = null; }
function pkDate(input) {
  PK.input = input; PK.mode = 'date';
  const cur = parseD(input.dataset.iso);
  const hint = input.id === 'pl-endDate' ? parseD(getV($('#pl-startDate'))) : (input.dataset.k === 'date' ? parseD(getV($('#pl-startDate'))) : null);
  const base = cur || hint || new Date();
  PK.view = new Date(base.getFullYear(), base.getMonth(), 1);
  pkRenderDate(); pkPlace(input);
}
function pkRenderDate() {
  const v = PK.view, y = v.getFullYear(), m = v.getMonth();
  const sel = PK.input.dataset.iso, today = iso(new Date());
  const s = parseD(getV($('#pl-startDate'))), e = parseD(getV($('#pl-endDate')));
  const first = new Date(y, m, 1).getDay(), days = new Date(y, m + 1, 0).getDate();
  let cells = '';
  for (let i = 0; i < first; i++) cells += '<span></span>';
  for (let d = 1; d <= days; d++) {
    const dt = new Date(y, m, d), k = iso(dt);
    const inR = s && e && dt >= s && dt <= e;
    cells += '<button type="button" data-d="' + k + '" class="' + [k === sel ? 'sel' : '', k === today ? 'today' : '', inR ? 'range' : '', dt.getDay() === 0 || dt.getDay() === 6 ? 'we' : ''].join(' ') + '">' + d + '</button>';
  }
  $('#picker').innerHTML =
    '<div class="pk-h"><button type="button" class="ibtn" data-nav="-1"><span class="ms">chevron_left</span></button>' +
    '<b>' + TH_MONTH[m] + ' ' + (y + 543) + '</b>' +
    '<button type="button" class="ibtn" data-nav="1"><span class="ms">chevron_right</span></button></div>' +
    '<div class="pk-w">' + TH_D.map(d => '<span>' + d + '</span>').join('') + '</div>' +
    '<div class="pk-g">' + cells + '</div>' +
    '<div class="pk-f"><button type="button" class="btn ghost sm" data-clear>ล้าง</button><button type="button" class="btn ghost sm" data-today>วันนี้</button></div>';
}
function pkTime(input) {
  PK.input = input; PK.mode = 'time';
  const cur = input.value;
  let html = '<div class="pk-h"><b>เลือกเวลา (24 ชั่วโมง)</b></div><div class="pk-t">';
  for (let h = 7; h <= 18; h++) for (const mm of ['00', '30']) {
    const t = String(h).padStart(2, '0') + ':' + mm;
    html += '<button type="button" data-t="' + t + '" class="' + (t === cur ? 'sel' : '') + '">' + t.replace(':', '.') + '</button>';
  }
  html += '</div><div class="pk-f"><small style="color:var(--muted)">พิมพ์เองได้ เช่น 8.15</small><button type="button" class="btn ghost sm" data-clear>ล้าง</button></div>';
  $('#picker').innerHTML = html; pkPlace(input);
}
function normTime(v) {
  const m = /^(\d{1,2})(?:[.:\s]?(\d{1,2}))?$/.exec(String(v).trim().replace(/\s*น\.?$/, ''));
  if (!m) return '';
  const h = +m[1], mi = m[2] ? +(m[2].length === 1 ? m[2] + '0' : m[2]) : 0;
  if (h > 23 || mi > 59) return '';
  return String(h).padStart(2, '0') + ':' + String(mi).padStart(2, '0');
}
function pkCommit(input) { input.dispatchEvent(new Event('input', { bubbles: true })); input.dispatchEvent(new Event('change', { bubbles: true })); }
document.addEventListener('focusin', e => {
  const t = e.target;
  if (t.classList && t.classList.contains('thdate')) pkDate(t);
  else if (t.classList && t.classList.contains('thtime')) pkTime(t);
  else if (!t.closest || !t.closest('#picker')) pkClose();
});
document.addEventListener('click', e => {
  const t = e.target;
  if (t.classList && (t.classList.contains('thdate') || t.classList.contains('thtime'))) { if (PK.input !== t) t.classList.contains('thdate') ? pkDate(t) : pkTime(t); return; }
  if (!t.closest('#picker')) { if (PK.input) pkClose(); return; }
  const inp = PK.input; if (!inp) return;
  const nav = t.closest('[data-nav]'), d = t.closest('[data-d]'), tm = t.closest('[data-t]');
  if (nav) { PK.view.setMonth(PK.view.getMonth() + +nav.dataset.nav); pkRenderDate(); return; }
  if (d) { setV(inp, d.dataset.d); pkCommit(inp); pkClose(); return; }
  if (tm) { inp.value = tm.dataset.t; pkCommit(inp); pkClose(); return; }
  if (t.closest('[data-today]')) { setV(inp, iso(new Date())); pkCommit(inp); pkClose(); return; }
  if (t.closest('[data-clear]')) { setV(inp, ''); pkCommit(inp); pkClose(); }
});
document.addEventListener('focusout', e => {
  const t = e.target;
  if (t.classList && t.classList.contains('thtime') && t.value) { const n = normTime(t.value); if (n !== t.value) { t.value = n; pkCommit(t); } }
});
document.addEventListener('keydown', e => { if (e.key === 'Escape' && PK.input) pkClose(); if (e.key === 'Enter' && PK.mode === 'time' && PK.input) { PK.input.blur(); pkClose(); } });
window.addEventListener('scroll', () => { if (PK.input) pkPlace(PK.input); }, true);
window.addEventListener('resize', () => { if (PK.input) pkPlace(PK.input); });
document.addEventListener('keydown', e => { if (e.target.classList && e.target.classList.contains('thdate') && !['Tab', 'Escape'].includes(e.key)) e.preventDefault(); });



/* ---------- ค่าในช่องกรอก (รองรับปฏิทินไทย) ---------- */
function getV(f) { return f.classList.contains('thdate') ? (f.dataset.iso || '') : f.value.trim(); }
function setV(f, v) {
  v = v == null ? '' : String(v);
  if (f.classList.contains('thdate')) { f.dataset.iso = /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : ''; f.value = f.dataset.iso ? thDateLong(f.dataset.iso) : ''; }
  else f.value = v;
}

/* ---------- ค่าคงที่ ---------- */
const TARGET = () => (S.init && S.init.periodsPerWeek) || 8;
const PAT_NAME = { '1': 'ดูว่านักเรียนเข้าใจเทปไหม', '2': 'ดูครูปลายทางคุมชั้นเรียน', '3': 'สอนเองจริง' };
const PAT_TASK = { '1': 'สอนเปิดเทปสังเกตนักเรียน', '2': 'สอนเปิดเทปสังเกตการกำกับห้องเรียน', '3': 'สอนจริง' };
const TASK_PAT = { 'สอนเปิดเทปสังเกตนักเรียน': '1', 'สอนเปิดเทปสังเกตการกำกับห้องเรียน': '2', 'สอนจริง': '3' };
const GRADES = ['ป.1', 'ป.2', 'ป.3', 'ป.4', 'ป.5', 'ป.6', 'ม.1', 'ม.2', 'ม.3'];
const PLAN_F = ['teacher', 'originSchool', 'originSubject', 'destSubject', 'startDate', 'endDate', 'destSchool', 'affiliation', 'district', 'province', 'note'];
const PROFILE_F = ['teacher', 'originSubject', 'destSubject', 'destSchool', 'affiliation', 'district', 'province'];
const BAR = 'โครงการจัดการเรียนรู้ด้วยการศึกษาทางไกลผ่านดาวเทียม (DLTV) ร่วมกับโรงเรียนปลายทาง';

function thShort(a, b) { const f = t => t ? t.replace(':', '.') : ''; return a && b ? f(a) + '–' + f(b) + ' น.' : (a || b ? f(a || b) + ' น.' : ''); }
function addHour(t) { const m = /^(\d{2}):(\d{2})$/.exec(t || ''); if (!m) return ''; const h = Math.min(23, +m[1] + 1); return String(h).padStart(2, '0') + ':' + m[2]; }
function isTeach(i) { return i.type === 'เข้าสอน'; }
function patOf(i) { return i.pattern || TASK_PAT[i.task] || ''; }
function teachItems(p) { return ((p && p.items) || []).filter(isTeach); }
function sortItems(items) { return items.slice().sort((a, b) => ((a.date || '9') + (a.start || '')).localeCompare((b.date || '9') + (b.start || ''))); }
function dk(k) { return k + '_' + (AUTH.email || 'anon'); }
function profile() { return (S.init && S.init.profile) || {}; }
function rememberLocal(p) {
  if (!S.init) return;
  const pf = S.init.profile = S.init.profile || {};
  PROFILE_F.forEach(k => { if (p[k]) pf[k] = p[k]; });
}
function firstWord(s) { return String(s || '').split(/[\s(]/)[0]; }

/* =========================================================
 *  การนำทาง
 * ========================================================= */
let page = 'home';
function go(p) {
  page = p;
  pkClose();
  $$('.page').forEach(x => x.classList.toggle('on', x.id === 'pg-' + p));
  $$('.nav [data-go]').forEach(b => { b.classList.toggle('on', b.dataset.go === p); b.setAttribute('aria-current', b.dataset.go === p ? 'page' : 'false'); });
  window.scrollTo({ top: 0, behavior: 'smooth' });
  if (p === 'home') loadRecords();
  if (p === 'plan') {
    if (!S.plan) {
      const cur = S.records.find(r => r.kind === 'plan' && r.email === AUTH.email);
      if (cur) { openPlan(cur.id); return; }
      newPlan();
    }
    renderPlan();
  }
  if (p === 'proposal') openProposalPage();
}
document.addEventListener('click', e => {
  const b = e.target.closest('[data-go]'); if (b) go(b.dataset.go);
});

/* =========================================================
 *  บันทึกอัตโนมัติ
 * ========================================================= */
function makeSaver(kind) {
  const st = { timer: 0, busy: false, again: false };
  const dot = () => $(kind === 'plan' ? '#planDot' : '#propDot');
  const txt = () => $(kind === 'plan' ? '#planStatus' : '#propStatus');
  function show(cls, msg) { dot().className = 'dot ' + cls; txt().textContent = msg; }
  async function run() {
    clearTimeout(st.timer);
    if (st.busy) { st.again = true; return st.pending; }
    st.busy = true;
    show('busy', 'กำลังบันทึก…');
    st.pending = (async () => {
      try {
        if (kind === 'plan') await doSavePlan(); else await doSaveProp();
        const t = new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
        show('ok', 'บันทึกแล้ว ' + t + ' น.');
        return true;
      } catch (e) {
        if (e && e.skip) { show('', e.message); return false; }
        show('err', 'บันทึกไม่สำเร็จ – ' + errMsg(e)); return false;
      } finally {
        st.busy = false;
        if (st.again) { st.again = false; run(); }
      }
    })();
    return st.pending;
  }
  return {
    soon() { if (!S.ready) return; show('busy', 'มีการแก้ไข…'); clearTimeout(st.timer); st.timer = setTimeout(run, 1200); },
    now: run,
    reset(msg) { clearTimeout(st.timer); show(msg ? 'ok' : '', msg || 'ยังไม่ได้บันทึก'); }
  };
}
const planSaver = makeSaver('plan');
const propSaver = makeSaver('prop');
function skip(msg) { const e = new Error(msg); e.skip = true; return e; }

/* =========================================================
 *  แผน 8 คาบ
 * ========================================================= */
function newPlan() {
  const pf = profile();
  S.plan = { id: '', teacher: pf.teacher || AUTH.name, originSchool: (S.init && S.init.originSchool) || '', originSubject: pf.originSubject || '',
    destSubject: pf.destSubject || '', destSchool: pf.destSchool || '', affiliation: pf.affiliation || '', district: pf.district || '',
    province: pf.province || '', startDate: '', endDate: '', note: '', items: [] };
  S.step = 1; S.edit = -1;
  fillPlanForm();
  planSaver.reset();
}
function normalizePlan(p) {
  p.items = (p.items || []).map(i => Object.assign({}, i, { pattern: patOf(i) }));
  return p;
}
async function openPlan(id, step) {
  loading(true);
  try {
    S.plan = normalizePlan(await api('getPlan', id));
    S.step = step || (S.plan.startDate && S.plan.destSchool ? 2 : 1); S.edit = -1;
    fillPlanForm();
    planSaver.reset('บันทึกล่าสุด ' + since(S.plan.updated));
    go('plan');
  } catch (e) { toast(errMsg(e), 'bad'); } finally { loading(false); }
}
function fillPlanForm() {
  PLAN_F.forEach(k => { const el = $('#pl-' + k); if (el) { setV(el, S.plan[k] || ''); el.classList.remove('err'); } });
}
function readPlanForm() { PLAN_F.forEach(k => { const el = $('#pl-' + k); if (el) S.plan[k] = getV(el); }); }

function validStep1(showErr) {
  readPlanForm();
  const need = ['teacher', 'destSchool', 'startDate', 'endDate'];
  let ok = true;
  need.forEach(k => { const bad = !S.plan[k]; if (showErr) $('#pl-' + k).classList.toggle('err', bad); ok = ok && !bad; });
  if (ok && S.plan.endDate < S.plan.startDate) { if (showErr) { $('#pl-endDate').classList.add('err'); toast('วันที่สิ้นสุดต้องไม่ก่อนวันที่เริ่ม', 'bad'); } return false; }
  return ok;
}

async function doSavePlan() {
  readPlanForm();
  if (!S.plan.teacher || !S.plan.destSchool) throw skip('กรอกชื่อครูและโรงเรียนปลายทางก่อน ระบบจึงจะบันทึกให้');
  const p = Object.assign({}, S.plan, { items: sortItems(S.plan.items).map(i => Object.assign({}, i, { task: isTeach(i) ? PAT_TASK[i.pattern] || '' : '' })) });
  const r = await api('savePlan', p);
  S.plan.id = r.id;
  rememberLocal(S.plan);
  store.del(dk('planDraft'));
}
function planChanged() { store.set(dk('planDraft'), S.plan); planSaver.soon(); }

/* ---------- วันในตาราง ---------- */
function planDays() {
  const out = new Set();
  const s = parseD(S.plan.startDate), e = parseD(S.plan.endDate);
  if (s && e && e >= s) {
    for (let d = new Date(s), n = 0; d <= e && n < 31; d.setDate(d.getDate() + 1), n++) {
      const k = iso(d), wd = d.getDay();
      if (wd !== 0 && wd !== 6) out.add(k);
    }
  }
  S.plan.items.forEach(i => { if (i.date) out.add(i.date); });
  return Array.from(out).sort();
}

function renderPlan() {
  if (!S.plan) return;
  // stepper
  const done1 = validStep1(false), n = teachItems(S.plan).length, t = TARGET();
  $$('#stepper button').forEach(b => {
    const k = +b.dataset.step;
    b.className = k === S.step ? 'cur' : (k === 1 && done1) || (k === 2 && n >= t) ? 'done' : '';
    $('small', b).textContent = k === S.step ? 'กำลังทำ' : k === 1 ? (done1 ? 'เสร็จแล้ว' : 'ยังไม่ครบ') : k === 2 ? (n + ' จาก ' + t + ' คาบ') : 'ขั้นสุดท้าย';
    if (b.className === 'done') $('.n', b).innerHTML = '<svg class="ico" style="width:18px;height:18px;stroke-width:3"><use href="#i-check"/></svg>';
    else $('.n', b).textContent = k;
  });
  ['#st1', '#st2', '#st3'].forEach((id, i) => $(id).classList.toggle('hide', S.step !== i + 1));
  $('#btnBack').classList.toggle('hide', S.step === 1);
  $('#btnPrintPlan').classList.toggle('hide', S.step !== 3);
  const nx = $('#btnNext');
  nx.innerHTML = S.step === 1 ? 'ถัดไป: เลือกคาบสอน <svg class="ico"><use href="#i-arrow"/></svg>'
    : S.step === 2 ? 'ถัดไป: ตรวจและพิมพ์ <svg class="ico"><use href="#i-arrow"/></svg>'
    : 'ไปเขียนข้อเสนอ <svg class="ico"><use href="#i-arrow"/></svg>';
  nx.className = S.step === 3 ? 'btn gold big' : 'btn pri big';
  if (S.step === 2) renderWeek();
  if (S.step === 3) renderReview();
}

function renderWeek() {
  const p = S.plan, t = TARGET();
  $('#planStrip').innerHTML = '<b>' + esc(p.destSchool || '-') + '</b>' + (p.affiliation ? ' · ' + esc(p.affiliation) : '') + ' · ' + esc(thRangeDates(p.startDate, p.endDate));
  const n = teachItems(p).length;
  $('#wkCount').textContent = n;
  $('#wkBar').classList.toggle('full', n >= t);
  $('#wkBar i').style.width = Math.min(100, n / t * 100) + '%';
  const days = planDays();
  const box = $('#days');
  box.style.gridTemplateColumns = 'repeat(' + Math.max(1, days.length) + ', minmax(120px, 1fr))';
  box.style.minWidth = Math.max(300, days.length * 130) + 'px';
  if (!days.length) { box.innerHTML = '<div class="empty">กำหนดวันที่ไปในขั้นที่ 1 ก่อน</div>'; return; }
  box.innerHTML = days.map(d => {
    const dt = parseD(d), we = dt.getDay() === 0 || dt.getDay() === 6;
    const its = p.items.map((it, idx) => ({ it, idx })).filter(x => x.it.date === d).sort((a, b) => (a.it.start || '').localeCompare(b.it.start || ''));
    const cards = its.map(({ it, idx }) => {
      const sel = idx === S.edit ? ' sel' : '';
      if (!isTeach(it)) return '<button type="button" class="pc o' + sel + '" data-i="' + idx + '"><b>' + esc(thShort(it.start, it.end) || '—') + '</b>' + esc(it.detail || it.type) + '</button>';
      const pt = it.pattern || '0';
      return '<button type="button" class="pc p' + pt + sel + '" data-i="' + idx + '"><b>' + esc(thShort(it.start, it.end) || '—') + '</b>' + esc([it.grade, it.subject].filter(Boolean).join(' ')) +
        (it.pattern ? '<br><span class="tag p' + pt + '">แบบที่ ' + pt + '</span>' : '<br><span style="font-size:12.5px;color:var(--bad)">ยังไม่เลือกแบบ</span>') + '</button>';
    }).join('');
    return '<div class="day"><div class="day-h' + (we ? ' we' : '') + '"><b>' + TH_DAY[dt.getDay()] + '</b><br><span>' + dt.getDate() + ' ' + TH_M[dt.getMonth()] + '</span></div>' + cards +
      '<button type="button" class="add-day" data-add="' + d + '">+ เพิ่มคาบ</button></div>';
  }).join('');
  renderPanel();
}

/* ---------- แผงเพิ่ม/แก้ไขคาบ ---------- */
function panelGrade() { const b = $('#pnGrades button[aria-pressed="true"]'); return b ? b.dataset.v : ''; }
function setPanelGrade(g) { $$('#pnGrades button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.v === g))); }
function setPanelMode(m) {
  S.panelMode = m;
  $('#pnTeach').classList.toggle('hide', m !== 'teach');
  $('#pnOther').classList.toggle('hide', m === 'teach');
  $('#pnMode').textContent = m === 'teach' ? '+ เพิ่มการเดินทาง / ประชุม (ไม่นับเป็นคาบสอน)' : '← กลับไปเพิ่มคาบสอน';
  $('#pnMode').classList.toggle('hide', S.edit >= 0);
}
function renderPanel() {
  const days = planDays();
  const cur = $('#pnDay').value;
  $('#pnDay').innerHTML = days.map(d => '<option value="' + d + '">' + esc(TH_DAY[parseD(d).getDay()] + ' ' + thDate(d, 1)) + '</option>').join('');
  if (cur && days.includes(cur)) $('#pnDay').value = cur;
  const editing = S.edit >= 0 && S.plan.items[S.edit];
  $('#pnTitle').textContent = editing ? (isTeach(editing) ? 'แก้ไขคาบสอน' : 'แก้ไขกิจกรรม') : (S.panelMode === 'teach' ? 'เพิ่มคาบสอน' : 'เพิ่มการเดินทาง / ประชุม');
  $('#pnSave').textContent = editing ? 'บันทึกการแก้ไข' : 'เพิ่มลงตาราง';
  $('#pnDel').classList.toggle('hide', !editing);
  $('#pnCancel').classList.toggle('hide', !editing);
  $('#panel').style.borderColor = editing ? 'var(--gold)' : '';
  if (!$('#pnSubject').value) $('#pnSubject').value = firstWord(S.plan.destSubject || S.plan.originSubject);
}
function clearPanel(keepDay) {
  const d = $('#pnDay').value;
  S.edit = -1;
  if (!keepDay) $('#pnDay').selectedIndex = 0; else $('#pnDay').value = d;
  $$('input[name=pnPat]').forEach(r => r.checked = false);
  $('#pnDetail').value = '';
  setPanelMode('teach');
  renderWeek();
}
function editItem(idx) {
  const it = S.plan.items[idx]; if (!it) return;
  S.edit = idx;
  setPanelMode(isTeach(it) ? 'teach' : 'other');
  renderWeek();
  $('#pnDay').value = it.date;
  $('#pnStart').value = it.start || ''; $('#pnEnd').value = it.end || '';
  if (isTeach(it)) {
    setPanelGrade(it.grade || '');
    $('#pnSubject').value = it.subject || '';
    $$('input[name=pnPat]').forEach(r => r.checked = r.value === it.pattern);
  } else {
    $('#pnType').value = it.type || 'เดินทาง';
    $('#pnDetail').value = it.detail || '';
  }
  $('#panel').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}
function savePanel() {
  const date = $('#pnDay').value, start = normTime($('#pnStart').value), end = normTime($('#pnEnd').value);
  if (!date) { toast('เลือกวันก่อน', 'bad'); return; }
  if (!start) { $('#pnStart').classList.add('err'); toast('ใส่เวลาเริ่มก่อน', 'bad'); return; }
  $('#pnStart').classList.remove('err');
  let item;
  if (S.panelMode === 'teach') {
    const grade = panelGrade(), pr = $('input[name=pnPat]:checked');
    if (!grade) { toast('เลือกชั้นก่อน', 'bad'); return; }
    if (!pr) { toast('เลือกว่าจะไปทำอะไรในคาบนี้ (แบบที่ 1, 2 หรือ 3)', 'bad'); return; }
    item = { type: 'เข้าสอน', date, start, end, grade, subject: $('#pnSubject').value.trim(), pattern: pr.value, period: '', detail: '' };
  } else {
    item = { type: $('#pnType').value, date, start, end, grade: '', subject: '', pattern: '', period: '', detail: $('#pnDetail').value.trim() };
  }
  const was = S.edit >= 0;
  if (was) S.plan.items[S.edit] = Object.assign({}, S.plan.items[S.edit], item);
  else S.plan.items.push(item);
  planChanged();
  const n = teachItems(S.plan).length;
  if (was) toast('แก้ไขแล้ว');
  else if (S.panelMode === 'teach' && n === TARGET()) toast('ครบ ' + n + ' คาบแล้ว กด “ถัดไป” เพื่อตรวจและพิมพ์');
  // เตรียมคาบถัดไป: วันเดิม เริ่มเวลาที่จบ
  $('#pnStart').value = end || ''; $('#pnEnd').value = end ? addHour(end) : '';
  clearPanel(true);
  renderPlan();
}
async function deletePanelItem() {
  if (S.edit < 0) return;
  if (!await confirmBox('ลบรายการนี้?', 'รายการนี้จะถูกลบออกจากตาราง', 'ลบ')) return;
  S.plan.items.splice(S.edit, 1);
  planChanged();
  clearPanel(true);
  renderPlan();
}

/* ---------- ขั้นที่ 3: ตรวจ ---------- */
function renderReview() {
  const p = S.plan, n = teachItems(p).length, t = TARGET();
  const noPat = teachItems(p).filter(i => !i.pattern).length;
  const checks = [];
  checks.push(n >= t ? ['ok', 'มีคาบสอนครบ ' + n + ' คาบ'] : ['warn', 'มีคาบสอน ' + n + ' คาบ ยังขาดอีก ' + (t - n) + ' คาบ (บันทึกและพิมพ์ได้ แต่ควรเพิ่มให้ครบ)']);
  if (noPat) checks.push(['warn', 'มี ' + noPat + ' คาบที่ยังไม่ได้เลือกว่าจะไปทำอะไร (แบบที่ 1–3)']);
  if (!p.affiliation) checks.push(['warn', 'ยังไม่ได้ใส่สังกัดของโรงเรียนปลายทาง']);
  $('#checks').innerHTML = checks.map(c => '<div class="check ' + c[0] + '"><svg class="ico"><use href="#' + (c[0] === 'ok' ? 'i-check' : 'i-alert') + '"/></svg>' + esc(c[1]) + '</div>').join('');
  $('#planPreview').innerHTML = planDoc(p);
}

/* ---------- ปุ่มด้านล่าง ---------- */
function stepTo(k) {
  if (k > 1 && !validStep1(true)) { toast('กรอกช่องที่มีเครื่องหมาย * ให้ครบก่อน', 'bad'); S.step = 1; renderPlan(); return; }
  S.step = k; S.edit = -1;
  if (k === 2 && !$('#pnSubject').value) $('#pnSubject').value = firstWord(S.plan.destSubject || S.plan.originSubject);
  renderPlan();
  window.scrollTo({ top: 0, behavior: 'smooth' });
  if (k > 1) planSaver.now();
}
async function nextFromPlan() {
  if (S.step < 3) return stepTo(S.step + 1);
  await planSaver.now();
  if (!S.plan.id) return;
  await loadRecords();
  openProposalForPlan(S.plan.id);
}

/* =========================================================
 *  ข้อเสนอปรับปรุงเทป
 * ========================================================= */
function slotKey(date, time) { return (date || '') + '|' + String(time || '').replace(/[^0-9]/g, ''); }
function written(it) { return !!(it && (it.problem || it.before || it.after || it.cause)); }

async function openProposalPage() {
  if (!S.records.length) await loadRecords();
  const plans = S.records.filter(r => r.kind === 'plan');
  const id = (S.plan && S.plan.id) || (S.prop && S.prop.planId) || (plans[0] && plans[0].id) || '';
  if (S.prop && S.prop.planId === id && S.propPlan && S.propPlan.id === id) { renderProposal(); return; }
  if (!id) { $('#prNoPlan').classList.remove('hide'); $('#prMain').classList.add('hide'); return; }
  openProposalForPlan(id);
}
async function openProposalForPlan(planId, propId) {
  loading(true);
  try {
    const plan = normalizePlan(await api('getPlan', planId));
    S.propPlan = plan;
    const rec = propId ? { id: propId } : S.records.find(r => r.kind === 'proposal' && r.planId === planId);
    if (rec) S.prop = await api('getProposal', rec.id);
    else S.prop = { id: '', planId, teacher: plan.teacher, destSchool: plan.destSchool, affiliation: plan.affiliation, destSubject: firstWord(plan.destSubject) || plan.destSubject, items: [] };
    S.prop.planId = planId;
    S.sel = '';
    propSaver.reset(S.prop.updated ? 'บันทึกล่าสุด ' + since(S.prop.updated) : '');
    if (page !== 'proposal') { page = 'proposal'; $$('.page').forEach(x => x.classList.toggle('on', x.id === 'pg-proposal')); $$('.nav [data-go]').forEach(b => b.classList.toggle('on', b.dataset.go === 'proposal')); window.scrollTo({ top: 0 }); }
    renderProposal();
  } catch (e) { toast(errMsg(e), 'bad'); } finally { loading(false); }
}
async function openOrphanProposal(id) {
  loading(true);
  try {
    S.propPlan = null; S.prop = await api('getProposal', id); S.sel = '';
    propSaver.reset('บันทึกล่าสุด ' + since(S.prop.updated));
    page = 'proposal'; $$('.page').forEach(x => x.classList.toggle('on', x.id === 'pg-proposal'));
    $$('.nav [data-go]').forEach(b => b.classList.toggle('on', b.dataset.go === 'proposal'));
    renderProposal();
  } catch (e) { toast(errMsg(e), 'bad'); } finally { loading(false); }
}

/** รายการคาบให้เลือก: คาบสอนในแผน + ข้อเสนอเดิมที่ไม่ตรงกับคาบใด */
function periodList() {
  const out = [], used = new Set();
  const items = (S.prop && S.prop.items) || [];
  sortItems(teachItems(S.propPlan)).forEach(i => {
    const key = slotKey(i.date, thShort(i.start, i.end));
    const pi = items.find(x => slotKey(x.date, x.time) === key);
    if (pi) used.add(pi);
    out.push({ key, date: i.date, time: thShort(i.start, i.end), grade: i.grade, subject: i.subject, mode: i.pattern === '3' ? 'สอนสด' : 'เปิดเทป', item: pi });
  });
  items.forEach((x, n) => { if (!used.has(x)) out.push({ key: slotKey(x.date, x.time) + '#' + n, date: x.date, time: x.time, grade: x.grade, mode: x.mode, item: x }); });
  return out;
}
function renderProposal() {
  $('#prNoPlan').classList.add('hide'); $('#prMain').classList.remove('hide');
  const plans = S.records.filter(r => r.kind === 'plan');
  const pid = S.prop && S.prop.planId;
  $('#prPlan').innerHTML = (pid && !plans.some(p => p.id === pid) ? '<option value="' + esc(pid) + '">แผนรหัส ' + esc(pid) + '</option>' : '') + (!pid ? '<option value="">— ข้อเสนอที่ไม่ผูกกับแผน —</option>' : '') +
    plans.map(p => '<option value="' + esc(p.id) + '">' + esc((S.init && S.init.isAdmin ? p.teacher + ' · ' : '') + thRangeDates(p.startDate, p.endDate) + ' · ' + (p.school || '-')) + '</option>').join('');
  $('#prPlan').value = pid || '';
  const list = periodList();
  if (!list.length) {
    $('#periods').innerHTML = '<div class="empty" style="grid-column:1/-1">แผนนี้ยังไม่มีคาบสอน <button type="button" class="btn line sm" id="goPlanFromProp">ไปเพิ่มคาบสอนในแผน</button></div>';
    $('#qcard').classList.add('hide'); return;
  }
  $('#qcard').classList.remove('hide');
  if (!S.sel || !list.some(x => x.key === S.sel)) { const f = list.find(x => !written(x.item)) || list[0]; S.sel = f.key; }
  $('#periods').innerHTML = list.map(x => {
    const d = parseD(x.date), done = written(x.item), sel = x.key === S.sel;
    const st = sel ? 'กำลังเขียน' : done ? 'เขียนแล้ว' : 'ยังไม่เขียน';
    return '<button type="button" class="per' + (done ? ' done' : '') + (sel ? ' sel' : '') + '" data-key="' + esc(x.key) + '"><span class="s">' + st + '</span><br><b>' +
      esc(d ? TH_D[d.getDay()] + ' ' + d.getDate() + ' ' + TH_M[d.getMonth()] : 'ไม่ระบุวัน') + '</b><br><span>' + esc([String(x.time || '').split('–')[0].replace(' น.', ''), x.grade].filter(Boolean).join(' · ')) + '</span></button>';
  }).join('');
  const cur = list.find(x => x.key === S.sel);
  const it = cur.item || {};
  const d = parseD(cur.date);
  $('#qMeta').textContent = [d ? TH_DAY[d.getDay()] + ' ' + thDate(cur.date, 1) : '', cur.time, [cur.grade, cur.subject].filter(Boolean).join(' '), cur.mode].filter(Boolean).join(' · ');
  $$('[data-q]').forEach(f => { f.value = it[f.dataset.q] || ''; });
  const remaining = list.filter(x => !written(x.item) && x.key !== S.sel).length;
  $('#btnNextPeriod').innerHTML = remaining ? 'บันทึก แล้วไปคาบถัดไป <svg class="ico"><use href="#i-arrow"/></svg>' : 'บันทึก <svg class="ico"><use href="#i-check"/></svg>';
}
function currentSlot() { return periodList().find(x => x.key === S.sel); }
function onQuestionInput(e) {
  const f = e.target.closest('[data-q]'); if (!f) return;
  const cur = currentSlot(); if (!cur) return;
  let it = cur.item;
  if (!it) { it = { date: cur.date, time: cur.time, grade: cur.grade, mode: cur.mode }; S.prop.items.push(it); }
  it[f.dataset.q] = f.value;
  // อัปเดตสถานะบนการ์ดโดยไม่วาดใหม่ทั้งหมด (ไม่ให้เคอร์เซอร์หลุด)
  const card = $('#periods .per.sel'); if (card) card.classList.toggle('done', written(it));
  store.set(dk('propDraft'), S.prop);
  propSaver.soon();
}
async function doSaveProp() {
  const p = S.prop;
  if (S.propPlan) { p.teacher = p.teacher || S.propPlan.teacher; p.destSchool = p.destSchool || S.propPlan.destSchool; p.affiliation = p.affiliation || S.propPlan.affiliation; }
  if (!p.teacher || !p.destSchool) throw skip('ข้อมูลครู/โรงเรียนไม่ครบ');
  const items = sortItems(p.items.filter(i => i.problem || i.cause || i.before || i.after || i.topic || i.tape));
  if (!items.length) throw skip('ยังไม่มีข้อเสนอที่ต้องบันทึก');
  const r = await api('saveProposal', Object.assign({}, p, { items }));
  p.id = r.id;
  store.del(dk('propDraft'));
}
async function nextPeriod() {
  await propSaver.now();
  const list = periodList();
  const idx = list.findIndex(x => x.key === S.sel);
  const nx = list.slice(idx + 1).concat(list.slice(0, idx)).find(x => !written(x.item));
  if (nx) { S.sel = nx.key; renderProposal(); $('#qcard').scrollIntoView({ behavior: 'smooth', block: 'start' }); $('[data-q=tape]').focus({ preventScroll: true }); }
  else { renderProposal(); toast('เขียนข้อเสนอครบทุกคาบแล้ว'); }
}

/* =========================================================
 *  หน้าแรก
 * ========================================================= */
let loadingRecs = null;
function loadRecords() {
  if (loadingRecs) return loadingRecs;
  loadingRecs = (async () => {
    try { const r = await api('listRecords'); S.records = r.records; renderHome(); }
    catch (e) { toast(errMsg(e), 'bad'); $('#recList').innerHTML = '<div class="empty">' + esc(errMsg(e)) + '</div>'; }
    finally { loadingRecs = null; }
  })();
  return loadingRecs;
}
function propOf(planId) { return S.records.find(r => r.kind === 'proposal' && r.planId === planId); }
function renderHome() {
  const t = TARGET();
  const mine = S.records.filter(r => r.kind === 'plan' && r.email === AUTH.email);
  const cur = mine[0] || null;
  const n = cur ? cur.periods : 0;
  $('#h1Count').textContent = n + ' จาก ' + t + ' คาบ';
  $('#h1Bar').style.width = Math.min(100, n / t * 100) + '%';
  $('#h1Hint').textContent = !cur ? 'ยังไม่ได้เริ่มวางแผน' : n >= t ? 'ครบแล้ว · ' + thRangeDates(cur.startDate, cur.endDate) : 'ขาดอีก ' + (t - n) + ' คาบ · ' + thRangeDates(cur.startDate, cur.endDate);
  $('#h1Hint').classList.toggle('ok', !!cur && n >= t);
  $('#h1Btn').innerHTML = (!cur ? 'เริ่มวางแผน' : n >= t ? 'ดูแผน / พิมพ์' : 'วางแผนต่อ') + ' <svg class="ico"><use href="#i-arrow"/></svg>';
  $('#h1Btn').onclick = () => cur ? openPlan(cur.id, n >= t ? 3 : 2) : (newPlan(), go('plan'));
  const pr = cur && propOf(cur.id), w = pr ? pr.count : 0;
  $('#h2Count').textContent = w + ' จาก ' + n + ' คาบที่สอน';
  $('#h2Bar').style.width = n ? Math.min(100, w / n * 100) + '%' : '0';
  $('#h2Hint').textContent = !cur ? 'วางแผนขั้นที่ 1 ก่อน' : !n ? 'เพิ่มคาบสอนในแผนก่อน' : w >= n ? 'เขียนครบทุกคาบแล้ว' : 'เหลืออีก ' + (n - w) + ' คาบที่ยังไม่ได้เขียน';
  $('#h2Hint').classList.toggle('ok', !!n && w >= n);
  $('#h2Btn').onclick = () => cur ? openProposalForPlan(cur.id) : go('proposal');
  $('#h2Btn').disabled = !cur;
  $('#q').classList.toggle('hide', !(S.init && S.init.isAdmin));
  renderRecList();
}
function renderRecList() {
  const q = $('#q').value.trim().toLowerCase();
  const admin = S.init && S.init.isAdmin;
  const plans = S.records.filter(r => r.kind === 'plan');
  const linked = new Set(plans.map(p => p.id));
  const orphans = S.records.filter(r => r.kind === 'proposal' && !linked.has(r.planId));
  const match = r => !q || [r.teacher, r.school, r.affiliation, r.subject].join(' ').toLowerCase().includes(q);
  const t = TARGET();
  const rows = plans.filter(match).map(p => {
    const pr = propOf(p.id), w = pr ? pr.count : 0;
    return '<div class="row"><div class="t"><b>' + (admin ? esc(p.teacher) + ' · ' : '') + 'แผนการสอน · ' + esc(p.school || '-') + '</b><span>' + esc(thRangeDates(p.startDate, p.endDate) || 'ยังไม่กำหนดวันที่') + (p.affiliation ? ' · ' + esc(p.affiliation) : '') + '</span></div>' +
      '<span class="badge ' + (p.periods >= t ? 'ok' : 'warn') + '">คาบสอน ' + p.periods + '/' + t + '</span>' +
      '<span class="badge ' + (p.periods && w >= p.periods ? 'ok' : w ? 'info' : 'warn') + '">ข้อเสนอ ' + w + '/' + p.periods + '</span>' +
      '<button type="button" class="btn line sm" data-act="plan" data-id="' + esc(p.id) + '">แผน</button>' +
      '<button type="button" class="btn line sm" data-act="prop" data-id="' + esc(p.id) + '">ข้อเสนอ</button>' +
      '<button type="button" class="btn ghost sm" data-act="print" data-id="' + esc(p.id) + '"><svg class="ico"><use href="#i-print"/></svg>พิมพ์</button>' +
      '<button type="button" class="btn danger sm" data-act="del" data-id="' + esc(p.id) + '" aria-label="ลบแผนนี้"><svg class="ico"><use href="#i-trash"/></svg></button></div>';
  }).concat(orphans.filter(match).map(r => '<div class="row"><div class="t"><b>' + (admin ? esc(r.teacher) + ' · ' : '') + 'ข้อเสนอปรับปรุงเทป · ' + esc(r.school || '-') + '</b><span>' + esc(r.subject || '') + ' · ' + r.count + ' ข้อ (ไม่ผูกกับแผน)</span></div>' +
    '<button type="button" class="btn line sm" data-act="oprop" data-id="' + esc(r.id) + '">เปิด</button>' +
    '<button type="button" class="btn ghost sm" data-act="oprint" data-id="' + esc(r.id) + '"><svg class="ico"><use href="#i-print"/></svg>พิมพ์</button>' +
    '<button type="button" class="btn danger sm" data-act="odel" data-id="' + esc(r.id) + '" aria-label="ลบข้อเสนอนี้"><svg class="ico"><use href="#i-trash"/></svg></button></div>'));
  $('#recList').innerHTML = rows.join('') || '<div class="empty">ยังไม่มีงานที่บันทึกไว้ เริ่มจาก “ขั้นที่ 1 วางแผนการสอน” ได้เลย</div>';
}
async function onRecAction(e) {
  const b = e.target.closest('[data-act]'); if (!b) return;
  const id = b.dataset.id, a = b.dataset.act;
  if (a === 'plan') return openPlan(id);
  if (a === 'prop') return openProposalForPlan(id);
  if (a === 'oprop') return openOrphanProposal(id);
  if (a === 'print') return choosePrint(id);
  if (a === 'oprint') { loading(true); try { doPrint(propDoc(await api('getProposal', id))); } catch (er) { toast(errMsg(er), 'bad'); } finally { loading(false); } return; }
  if (a === 'del' || a === 'odel') {
    const isPlan = a === 'del', pr = isPlan && propOf(id);
    if (!await confirmBox(isPlan ? 'ลบแผนนี้?' : 'ลบข้อเสนอนี้?', isPlan ? 'แผน' + (pr ? 'และข้อเสนอที่ผูกอยู่' : '') + 'จะถูกลบถาวร กู้คืนไม่ได้' : 'ข้อเสนอนี้จะถูกลบถาวร กู้คืนไม่ได้', 'ลบถาวร')) return;
    loading(true);
    try {
      await api('deleteRecord', isPlan ? 'plan' : 'proposal', id);
      if (pr) await api('deleteRecord', 'proposal', pr.id);
      if (S.plan && S.plan.id === id) S.plan = null;
      if (S.prop && (S.prop.planId === id || S.prop.id === id)) { S.prop = null; S.propPlan = null; }
      toast('ลบแล้ว'); await loadRecords();
    } catch (er) { toast(errMsg(er), 'bad'); } finally { loading(false); }
  }
}
async function choosePrint(planId) {
  const pr = propOf(planId);
  let which = 'plan';
  if (pr) {
    $('#mNo').textContent = 'พิมพ์ข้อเสนอ';
    which = await confirmBox('พิมพ์เอกสารไหน?', 'เลือกเอกสารที่ต้องการพิมพ์หรือบันทึกเป็น PDF', 'พิมพ์แผนการสอน') ? 'plan' : 'prop';
    $('#mNo').textContent = 'ยกเลิก';
  }
  loading(true);
  try {
    if (which === 'plan') doPrint(planDoc(normalizePlan(await api('getPlan', planId))));
    else doPrint(propDoc(await api('getProposal', pr.id), normalizePlan(await api('getPlan', planId))));
  } catch (e) { toast(errMsg(e), 'bad'); } finally { loading(false); }
}

/* =========================================================
 *  เอกสาร A4
 * ========================================================= */
function docHead(title) {
  return '<div class="doc-h"><img class="l1" src="assets/img/logo-foundation.png" alt=""><div class="c"><h1>' + title + '</h1><div>' + BAR + '</div></div><img class="l2" src="assets/img/logo-dltv.png" alt=""></div>';
}
function info(label, v, wide) { return '<div' + (wide ? ' class="w"' : '') + '><b>' + label + ':</b> ' + (v ? esc(v) : '<span style="color:#9ca3af">—</span>') + '</div>'; }
function sign(name, role) { return '<div class="sign"><div>ลงชื่อ ....................................................<br>(' + esc(name || '....................................................') + ')<br>' + role + '</div></div>'; }
function planDoc(p) {
  const t = TARGET();
  const items = sortItems((p.items || []).filter(i => i.date || i.start || i.detail || i.grade));
  const days = [];
  items.forEach(i => { const last = days[days.length - 1]; if (last && last.date === i.date) last.items.push(i); else days.push({ date: i.date, items: [i] }); });
  let body = '';
  days.forEach((d, di) => {
    const dt = parseD(d.date), alt = di % 2 ? ' class="alt"' : '';
    d.items.forEach((i, k) => {
      const teach = isTeach(i);
      body += '<tr' + alt + '>' + (k === 0 ? '<td rowspan="' + d.items.length + '"><b>' + (dt ? TH_DAY[dt.getDay()] : 'ไม่ระบุวัน') + '</b>' + (dt ? '<br>' + thDate(d.date) : '') + '</td>' : '') +
        '<td class="t">' + esc(thShort(i.start, i.end) || '—') + '</td>' +
        (teach ? '<td>' + esc([i.grade, i.subject].filter(Boolean).join(' ') || '—') + '</td><td>' + esc(PAT_NAME[i.pattern] || '—') + '</td><td class="c">' + esc(i.pattern || '–') + '</td>'
          : '<td class="m">–</td><td class="m">' + esc(i.detail || i.type) + '</td><td class="c m">–</td>') + '</tr>';
    });
  });
  const teach = teachItems({ items }), cnt = k => teach.filter(i => i.pattern === k).length;
  body += '<tr class="sum"><td colspan="5">รวมคาบสอน ' + teach.length + ' คาบ' + (teach.length < t ? ' (เป้าหมาย ' + t + ' คาบ)' : '') + ' — แบบที่ 1: ' + cnt('1') + ' คาบ · แบบที่ 2: ' + cnt('2') + ' คาบ · แบบที่ 3: ' + cnt('3') + ' คาบ</td></tr>';
  const place = [p.district, p.province].filter(Boolean).join(' ');
  return '<div class="doc">' + docHead('แผนการสอน ณ โรงเรียนปลายทาง (' + t + ' คาบ/สัปดาห์)') +
    '<div class="doc-info">' + info('ครูต้นทาง', p.teacher) + info('สอนที่โรงเรียนต้นทาง', [p.originSubject, p.originSchool && p.originSchool !== (S.init && S.init.originSchool) ? p.originSchool : ''].filter(Boolean).join(' · ')) +
    info('โรงเรียนปลายทาง', p.destSchool) + info('สังกัด', p.affiliation) + info('อำเภอ/จังหวัด', place) + info('ช่วงวันที่', thRangeDates(p.startDate, p.endDate)) +
    info('วิชาที่สอนที่โรงเรียนปลายทาง', p.destSubject, true) + '</div>' +
    (items.length ? '<table><thead><tr><th style="width:17%">วัน</th><th style="width:19%">เวลา</th><th style="width:17%">ชั้น / วิชา</th><th>ไปทำอะไร</th><th style="width:9%;text-align:center">แบบที่</th></tr></thead><tbody>' + body + '</tbody></table>'
      : '<div class="none">ยังไม่มีคาบสอนในแผน</div>') +
    '<div class="legend-box"><b>ความหมายของ “แบบที่”</b><br><b>1</b> = เปิดเทป แล้วดูว่านักเรียนปลายทางเข้าใจเนื้อหาไหม &nbsp;·&nbsp; <b>2</b> = เปิดเทป แล้วดูครูปลายทางกำกับห้องเรียน &nbsp;·&nbsp; <b>3</b> = สอนนักเรียนปลายทางเองจริง</div>' +
    (p.note ? '<div><b>หมายเหตุ:</b> ' + nl(p.note) + '</div>' : '') +
    sign(p.teacher, 'ครูต้นทาง') + '</div>';
}
function propDoc(p, plan) {
  const items = sortItems((p.items || []).filter(i => i.problem || i.cause || i.before || i.after || i.topic || i.tape));
  const subj = p.destSubject || (plan && plan.destSubject) || '';
  const issues = items.map((i, n) => {
    const d = parseD(i.date);
    const head = 'ข้อที่ ' + (n + 1) + (i.tape ? ' · เทปที่ ' + esc(i.tape) : '') + (i.minute ? ' นาทีที่ ' + esc(i.minute) : '') + (i.topic ? ' — ' + esc(i.topic) : '');
    const when = [d ? TH_DAY[d.getDay()] + ' ' + thDate(i.date) : '', i.time, i.grade, i.mode].filter(Boolean).join(' · ');
    const row = (lb, v, cls) => '<tr><th' + (cls ? ' class="' + cls + '"' : '') + '>' + lb + '</th><td' + (cls === 'n' ? ' class="n"' : '') + '>' + (v ? nl(v) : '<span style="color:#9ca3af">—</span>') + '</td></tr>';
    return '<table class="issue"><caption>' + head + '</caption><tbody>' + row('คาบที่สอน', when) + row('นักเรียนไม่เข้าใจตรงไหน', i.problem) + row('เพราะอะไร', i.cause) +
      row('ในเทปเดิม สอนแบบนี้', i.before, 'o') + row('ควรปรับเป็นแบบนี้', i.after, 'n') + (i.remark ? row('หมายเหตุ', i.remark) : '') + '</tbody></table>';
  }).join('');
  return '<div class="doc">' + docHead('ข้อเสนอปรับปรุงเทป (เนื้อหา/วิธีการสอน)') +
    '<div class="doc-info">' + info('ครูผู้เสนอ', p.teacher) + info('วิชา', subj) + info('โรงเรียนปลายทาง', p.destSchool) + info('สังกัด', p.affiliation || (plan && plan.affiliation)) + '</div>' +
    (issues || '<div class="none">ยังไม่มีข้อเสนอ</div>') + sign(p.teacher, 'ครูผู้เสนอ') + '</div>';
}
function doPrint(html) {
  pkClose();
  $('#printArea').innerHTML = html;
  const imgs = $$('#printArea img');
  const ready = document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve();
  Promise.all([ready].concat(imgs.map(i => i.complete ? 1 : new Promise(r => { i.onload = i.onerror = r; })))).then(() => setTimeout(() => window.print(), 200));
}

/* =========================================================
 *  เริ่มระบบ
 * ========================================================= */
function wire() {
  $('#pnGrades').innerHTML = GRADES.map(g => '<button type="button" data-v="' + g + '" aria-pressed="false">' + g + '</button>').join('');
  $('#pnGrades').addEventListener('click', e => { const b = e.target.closest('button'); if (b) setPanelGrade(b.dataset.v); });
  $('#stepper').addEventListener('click', e => { const b = e.target.closest('[data-step]'); if (b) stepTo(+b.dataset.step); });
  $('#st2').addEventListener('click', e => {
    const s = e.target.closest('[data-step]'); if (s) return stepTo(+s.dataset.step);
    const c = e.target.closest('.pc'); if (c) return editItem(+c.dataset.i);
    const a = e.target.closest('[data-add]');
    if (a) { clearPanel(); $('#pnDay').value = a.dataset.add; $('#pnStart').focus(); }
  });
  $('#st1').addEventListener('input', () => { readPlanForm(); $$('#st1 .in.err').forEach(x => { if (getV(x)) x.classList.remove('err'); }); planChanged(); });
  $('#st1').addEventListener('change', () => { readPlanForm(); planChanged(); });
  $('#pnSave').onclick = savePanel;
  $('#pnDel').onclick = deletePanelItem;
  $('#pnCancel').onclick = () => clearPanel(true);
  $('#pnMode').onclick = () => { setPanelMode(S.panelMode === 'teach' ? 'other' : 'teach'); renderPanel(); };
  $('#btnBack').onclick = () => stepTo(Math.max(1, S.step - 1));
  $('#btnNext').onclick = nextFromPlan;
  $('#btnPrintPlan').onclick = async () => { await planSaver.now(); doPrint(planDoc(S.plan)); };
  $('#prPlan').onchange = async e => { await propSaver.now(); if (e.target.value) openProposalForPlan(e.target.value); };
  $('#periods').addEventListener('click', async e => {
    if (e.target.closest('#goPlanFromProp')) return S.propPlan ? openPlan(S.propPlan.id, 2) : go('plan');
    const b = e.target.closest('.per'); if (!b) return;
    S.sel = b.dataset.key; renderProposal();
  });
  $('#qcard').addEventListener('input', onQuestionInput);
  $('#btnNextPeriod').onclick = nextPeriod;
  $('#btnPrintProp').onclick = async () => { await propSaver.now(); doPrint(propDoc(S.prop, S.propPlan)); };
  $('#recList').addEventListener('click', onRecAction);
  $('#q').addEventListener('input', renderRecList);
  $('#btnNewWeek').onclick = async () => {
    if (S.plan && !S.plan.id && (S.plan.items.length || S.plan.startDate) && !await confirmBox('เริ่มแผนใหม่?', 'แผนที่กำลังทำและยังไม่ได้บันทึกจะหายไป', 'เริ่มใหม่')) return;
    store.del(dk('planDraft')); newPlan(); go('plan');
  };
}

let started = false;
function initials(n) { return (n || '?').replace(/^(คุณ|นางสาว|นาง|นาย|น\.ส\.|ครู|ดร\.)\s*/, '').trim().charAt(0) || '?'; }
function renderUser() {
  const name = profile().teacher || AUTH.name || AUTH.email;
  $('#userName').textContent = name || '—';
  $('#userAvatar').innerHTML = AUTH.picture ? '<img src="' + esc(AUTH.picture) + '" referrerpolicy="no-referrer" alt="">' : esc(initials(name));
  $('#heroName').textContent = name ? 'คุณ' + name.replace(/^(คุณ|นางสาว|นาง|นาย|น\.ส\.)\s*/, '') : 'คุณครูต้นทาง';
  const ll = S.init && S.init.lastLogin;
  $('#heroLead').textContent = 'งานของคุณมี 2 ขั้นตอน ทำตามลำดับได้เลย' + (ll ? ' · เข้าใช้ครั้งก่อน ' + since(ll) : '');
  $('#demoChip').classList.toggle('hide', MODE !== 'demo');
}
async function startApp() {
  if (started) return; started = true;
  S.ready = false; S.plan = null; S.prop = null; S.propPlan = null; S.records = [];
  renderUser();
  loading(true);
  try {
    S.init = await api('getInit', { ua: navigator.userAgent });
    if (S.init.picture && !AUTH.picture) setAuth({ picture: S.init.picture });
    $('#dlSchools').innerHTML = (S.init.schools || []).map(s => '<option value="' + esc(s) + '">').join('');
    $('#dlSubjects').innerHTML = (S.init.subjects || []).map(s => '<option value="' + esc(s) + '">').join('');
    $('#dlAffiliations').innerHTML = (S.init.affiliations || []).map(s => '<option value="' + esc(s) + '">').join('');
  } catch (e) { toast(errMsg(e), 'bad'); }
  finally { loading(false); }
  const draft = store.get(dk('planDraft'));
  if (draft && draft.items) { S.plan = normalizePlan(draft); S.step = 1; fillPlanForm(); planSaver.reset(); $('#planStatus').textContent = 'กู้คืนแผนที่ยังไม่ได้บันทึก'; }
  S.ready = true;
  renderUser();
  go('home');
  if (draft && draft.items && (draft.teacher && draft.destSchool)) planSaver.now();
}
function boot() {
  wire();
  ['planDraft', 'propDraft', 'profile'].forEach(k => store.del(k));
  $('#btnLogout').onclick = async () => { if (await confirmBox('ออกจากระบบ?', 'งานที่บันทึกแล้วยังอยู่ครบ เข้าสู่ระบบครั้งหน้าจะเห็นเหมือนเดิม', 'ออกจากระบบ')) logout(); };
  $('#loginLite').onsubmit = e => {
    e.preventDefault();
    const a = { name: $('#lgName').value.trim(), email: $('#lgEmail').value.trim().toLowerCase() };
    setAuth(a); store.set('lite', a); hideLogin(); startApp();
  };
  $('#btnDemo').onclick = () => { setAuth({ name: 'ผู้ใช้ทดลอง', email: 'demo@dltv.local' }); hideLogin(); startApp(); };
  if (restoreAuth()) startApp(); else showLogin();
}
boot();
