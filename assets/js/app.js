/* =========================================================
 *  DLTV ครูต้นทาง – Front-end
 * ========================================================= */
const $ = (s, el) => (el || document).querySelector(s);
const $$ = (s, el) => Array.from((el || document).querySelectorAll(s));
const S = { init: null, records: [], kind: '', planId: '', propId: '' };
const TITLES = { home: 'ภาพรวม', plan: 'แผนปฏิบัติงานรายบุคคล 8 คาบ/สัปดาห์', proposal: 'ข้อเสนอการปรับปรุง “เนื้อหา/วิธีการสอน”', records: 'รายการที่บันทึก', guide: 'คำชี้แจง / รูปแบบงาน' };
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
  S.ready = false; S.init = null; S.records = [];
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
  t.innerHTML = '<span class="ms fill">' + (type === 'bad' ? 'error' : 'check_circle') + '</span><span>' + esc(msg) + '</span>';
  $('#toasts').appendChild(t);
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

/* ---------- navigation ---------- */
function go(page) {
  $$('.page').forEach(p => p.classList.toggle('on', p.id === 'pg-' + page));
  $$('[data-go]').forEach(b => { if (b.closest('.nav,.bnav')) b.classList.toggle('on', b.dataset.go === page); });
  $('#pageTitle').textContent = TITLES[page] || '';
  window.scrollTo({ top: 0, behavior: 'smooth' });
  if (page === 'records' || page === 'home' || page === 'proposal') loadRecords();
}
document.addEventListener('click', e => {
  const b = e.target.closest('[data-go]'); if (b) go(b.dataset.go);
});

/* ---------- segmented control ---------- */
function segVal(seg) { const on = $('button.on', seg); return on ? on.dataset.v : ''; }
function segSet(seg, v) { $$('button', seg).forEach(b => b.classList.toggle('on', b.dataset.v === String(v))); }
document.addEventListener('click', e => {
  const b = e.target.closest('.seg button'); if (!b) return;
  const seg = b.parentElement;
  if (seg.id === 'kindSeg') return;
  const was = b.classList.contains('on');
  $$('button', seg).forEach(x => x.classList.remove('on'));
  if (!was || seg.dataset.k === 'type' || seg.dataset.k === 'mode') b.classList.add('on');
  seg.dispatchEvent(new Event('input', { bubbles: true }));
});

/* ---------- generic item list ---------- */
function getV(f) { return f.classList.contains('thdate') ? (f.dataset.iso || '') : f.value.trim(); }
function setV(f, v) {
  v = v == null ? '' : String(v);
  if (f.classList.contains('thdate')) { f.dataset.iso = /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : ''; f.value = f.dataset.iso ? thDateLong(f.dataset.iso) : ''; }
  else f.value = v;
}
function readItem(el) {
  const o = {};
  $$('[data-k]', el).forEach(f => { o[f.dataset.k] = f.classList.contains('seg') ? segVal(f) : getV(f); });
  return o;
}
function writeItem(el, o) {
  $$('[data-k]', el).forEach(f => {
    const v = o && o[f.dataset.k] != null ? o[f.dataset.k] : '';
    if (f.classList.contains('seg')) segSet(f, v); else setV(f, v);
  });
}
function wireList(box, refresh, addFn) {
  box.addEventListener('click', e => {
    const b = e.target.closest('[data-act]'); if (!b) return;
    const it = b.closest('.item');
    if (b.dataset.act === 'del') {
      confirmBox('ลบรายการนี้?', 'ข้อมูลในรายการนี้จะถูกลบออกจากแบบฟอร์ม', 'ลบ').then(ok => { if (ok) { it.remove(); refresh(); } });
    } else if (b.dataset.act === 'dup') {
      const c = addFn(readItem(it)); it.after(c); refresh();
    } else if (b.dataset.act === 'up' && it.previousElementSibling) {
      it.parentElement.insertBefore(it, it.previousElementSibling); refresh();
    }
  });
  box.addEventListener('input', refresh);
  box.addEventListener('change', refresh);
}


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

/* =========================================================
 *  แผนปฏิบัติงาน
 * ========================================================= */
const PLAN_F = ['teacher', 'originSchool', 'originSubject', 'destSubject', 'startDate', 'endDate', 'destSchool', 'affiliation', 'district', 'province', 'note'];
const TASK2PAT = { 'สอนเปิดเทปสังเกตนักเรียน': '1', 'สอนเปิดเทปสังเกตการกำกับห้องเรียน': '2', 'สอนจริง': '3' };

function addPlanItem(o, focus) {
  const el = $('#tplPlanItem').content.firstElementChild.cloneNode(true);
  writeItem(el, Object.assign({ type: 'เข้าสอน' }, o || {}));
  if (!o) {
    const last = readPlanItems().slice(-1)[0];
    if (last) { setV($('[data-k=date]', el), last.date); $('[data-k=subject]', el).value = last.subject; }
    else $('[data-k=subject]', el).value = ($('#pl-destSubject').value.split(/[\s(]/)[0] || '');
  }
  $('[data-k=task]', el).addEventListener('change', ev => {
    const p = TASK2PAT[ev.target.value]; const seg = $('[data-k=pattern]', el);
    if (p && !segVal(seg)) segSet(seg, p);
  });
  $('#planItems').appendChild(el);
  refreshPlan();
  if (focus) $('[data-k=date]', el).focus();
  return el;
}
function readPlanItems() { return $$('#planItems .item').map(readItem); }
function refreshPlan() {
  let n = 0;
  $$('#planItems .item').forEach((el, i) => {
    const o = readItem(el); const teach = o.type === 'เข้าสอน';
    if (teach) n++;
    $('.num', el).textContent = i + 1;
    $('.teach-only', el).classList.toggle('hide', !teach);
    el.className = 'item' + (teach ? ' t-teach' + (o.pattern ? ' p' + o.pattern : '') : '');
    $('.t', el).textContent = teach ? ('เข้าสอน' + (o.subject ? 'วิชา' + o.subject : '') + (o.grade ? ' ' + o.grade : '') + (o.period ? ' (คาบที่ ' + o.period + ')' : '')) : (o.type || 'รายการ');
    $('.sub', el).textContent = [o.date ? thDay(o.date) + ' ' + thDate(o.date, 1) : '', thRange(o.start, o.end)].filter(Boolean).join(' · ');
  });
  const t = (S.init && S.init.periodsPerWeek) || 8;
  $('#planCount').textContent = n;
  $('#planRing').style.setProperty('--v', Math.min(100, n / t * 100));
  $('#planRing').classList.toggle('full', n >= t);
}
function collectPlan() {
  const p = { id: S.planId, items: readPlanItems() };
  PLAN_F.forEach(k => p[k] = getV($('#pl-' + k)));
  return p;
}
function fillPlan(p) {
  S.planId = p.id || '';
  PLAN_F.forEach(k => setV($('#pl-' + k), p[k] || ''));
  if (!$('#pl-originSchool').value) $('#pl-originSchool').value = (S.init && S.init.originSchool) || '';
  $('#planItems').innerHTML = '';
  (p.items && p.items.length ? p.items : [null]).forEach(it => addPlanItem(it || { type: 'เข้าสอน' }));
  $('#planIdBadge').textContent = S.planId ? 'รหัส ' + S.planId : 'แผนใหม่';
  $('#planSaveInfo').textContent = p.updated ? 'บันทึกล่าสุด ' + since(p.updated) : 'ยังไม่ได้บันทึก';
  refreshPlan();
}
function draftPlan() { if (S.ready) store.set(dk('planDraft'), collectPlan()); }
function draftProp() { if (S.ready) store.set(dk('propDraft'), collectProp()); }
function dk(k) { return k + '_' + (AUTH.email || 'anon'); }
function profile() { return (S.init && S.init.profile) || {}; }
function rememberLocal(p) {
  if (!S.init) return;
  const pf = S.init.profile = S.init.profile || {};
  ['teacher', 'originSubject', 'destSubject', 'destSchool', 'affiliation', 'district', 'province'].forEach(k => { if (p[k]) pf[k] = p[k]; });
}
function newPlan() {
  const last = profile();
  fillPlan({ teacher: last.teacher || AUTH.name, originSubject: last.originSubject, destSubject: last.destSubject, destSchool: last.destSchool, affiliation: last.affiliation, district: last.district, province: last.province });
}
function sortPlan() {
  const items = readPlanItems().sort((a, b) => (a.date + a.start).localeCompare(b.date + b.start));
  $('#planItems').innerHTML = ''; items.forEach(it => addPlanItem(it));
}
async function savePlan() {
  const p = collectPlan();
  let bad = false;
  ['teacher', 'destSchool'].forEach(k => { const el = $('#pl-' + k); const e = !el.value.trim(); el.classList.toggle('err', e); bad = bad || e; });
  if (bad) { toast('กรุณากรอกข้อมูลที่มีเครื่องหมาย *', 'bad'); return; }
  const btn = $('#btnSavePlan'); btn.disabled = true; loading(true);
  try {
    const r = await api('savePlan', p);
    S.planId = r.id;
    $('#planIdBadge').textContent = 'รหัส ' + r.id;
    $('#planSaveInfo').textContent = 'บันทึกแล้ว ' + new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }) + ' · ' + r.periods + ' คาบสอน';
    store.del(dk('planDraft')); rememberLocal(p);
    toast('บันทึกแผนปฏิบัติงานเรียบร้อย');
    loadRecords();
  } catch (e) { toast(errMsg(e), 'bad'); }
  finally { btn.disabled = false; loading(false); }
}
async function openPlan(id) {
  loading(true);
  try { fillPlan(await api('getPlan', id)); go('plan'); }
  catch (e) { toast(errMsg(e), 'bad'); } finally { loading(false); }
}

/* =========================================================
 *  ข้อเสนอการปรับปรุง
 * ========================================================= */
const PROP_F = ['teacher', 'destSchool', 'affiliation', 'destSubject', 'planId'];
function addPropItem(o, focus) {
  const el = $('#tplPropItem').content.firstElementChild.cloneNode(true);
  writeItem(el, Object.assign({ mode: 'เปิดเทป' }, o || {}));
  $('#propItems').appendChild(el);
  refreshProp();
  if (focus) $('[data-k=date]', el).focus();
  return el;
}
function readPropItems() { return $$('#propItems .item').map(readItem); }
function refreshProp() {
  const list = $$('#propItems .item');
  list.forEach((el, i) => {
    const o = readItem(el);
    $('.num', el).textContent = i + 1;
    $('.t', el).textContent = (o.tape ? 'เทปที่ ' + o.tape : 'ประเด็นข้อเสนอ') + (o.topic ? ' · ' + o.topic : '');
    $('.sub', el).textContent = [o.mode, o.grade, o.date ? thDate(o.date, 1) : '', o.minute ? 'นาทีที่ ' + o.minute : ''].filter(Boolean).join(' · ');
  });
  $('#propCount').textContent = list.length + ' รายการ';
}
function collectProp() {
  const p = { id: S.propId, items: readPropItems() };
  PROP_F.forEach(k => p[k] = getV($('#pr-' + k)));
  return p;
}
function fillProp(p) {
  S.propId = p.id || '';
  fillPlanSelect(p.planId);
  PROP_F.forEach(k => { if (k !== 'planId') $('#pr-' + k).value = p[k] || ''; });
  $('#propItems').innerHTML = '';
  (p.items && p.items.length ? p.items : [null]).forEach(it => addPropItem(it));
  $('#propIdBadge').textContent = S.propId ? 'รหัส ' + S.propId : 'ข้อเสนอใหม่';
  $('#propSaveInfo').textContent = p.updated ? 'บันทึกล่าสุด ' + since(p.updated) : 'ยังไม่ได้บันทึก';
  refreshProp();
}
function newProp() {
  const last = profile();
  fillProp({ teacher: last.teacher || AUTH.name, destSchool: last.destSchool, affiliation: last.affiliation, destSubject: (last.destSubject || '').split(/[\s(]/)[0] });
}
function fillPlanSelect(sel) {
  const s = $('#pr-planId'); const cur = sel != null ? sel : s.value;
  const plans = S.records.filter(r => r.kind === 'plan');
  s.innerHTML = '<option value="">— ไม่อ้างอิงแผน —</option>' + plans.map(p =>
    '<option value="' + esc(p.id) + '">' + esc(p.teacher) + ' · ' + esc(p.school || '-') + ' · ' + esc(thRangeDates(p.startDate, p.endDate)) + '</option>').join('');
  if (cur && !plans.some(p => p.id === cur)) s.insertAdjacentHTML('beforeend', '<option value="' + esc(cur) + '">' + esc(cur) + '</option>');
  s.value = cur || '';
}
async function onPlanPick() {
  const id = $('#pr-planId').value; if (!id) return;
  const r = S.records.find(x => x.id === id); if (!r) return;
  if (!$('#pr-teacher').value) $('#pr-teacher').value = r.teacher;
  if (!$('#pr-destSchool').value) $('#pr-destSchool').value = r.school;
  if (!$('#pr-affiliation').value && r.affiliation) $('#pr-affiliation').value = r.affiliation;
  if (!$('#pr-destSubject').value) $('#pr-destSubject').value = (r.subject || '').split(/[\s(]/)[0];
  refreshProp();
}
async function importPeriods() {
  const id = $('#pr-planId').value;
  if (!id) { toast('กรุณาเลือกแผนปฏิบัติงานก่อน', 'bad'); return; }
  loading(true);
  try {
    const p = await api('getPlan', id);
    const teach = p.items.filter(i => i.type === 'เข้าสอน');
    if (!teach.length) { toast('แผนนี้ยังไม่มีคาบสอน', 'bad'); return; }
    const empty = readPropItems().every(o => !o.problem && !o.before && !o.after && !o.topic && !o.tape);
    if (empty) $('#propItems').innerHTML = '';
    teach.forEach(i => addPropItem({ date: i.date, time: thRange(i.start, i.end), grade: i.grade, mode: i.task === 'สอนจริง' ? 'สอนสด' : 'เปิดเทป' }));
    toast('ดึง ' + teach.length + ' คาบสอนจากแผนแล้ว');
  } catch (e) { toast(errMsg(e), 'bad'); } finally { loading(false); }
}
async function saveProp() {
  const p = collectProp();
  let bad = false;
  ['teacher', 'destSchool'].forEach(k => { const el = $('#pr-' + k); const e = !el.value.trim(); el.classList.toggle('err', e); bad = bad || e; });
  if (bad) { toast('กรุณากรอกข้อมูลที่มีเครื่องหมาย *', 'bad'); return; }
  if (!p.items.some(o => o.problem || o.before || o.after || o.topic)) { toast('กรุณากรอกอย่างน้อย 1 ประเด็นข้อเสนอ', 'bad'); return; }
  const btn = $('#btnSaveProp'); btn.disabled = true; loading(true);
  try {
    const r = await api('saveProposal', p);
    S.propId = r.id;
    $('#propIdBadge').textContent = 'รหัส ' + r.id;
    $('#propSaveInfo').textContent = 'บันทึกแล้ว ' + new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }) + ' · ' + r.count + ' ประเด็น';
    store.del(dk('propDraft')); rememberLocal({ teacher: p.teacher, destSchool: p.destSchool, affiliation: p.affiliation });
    toast('บันทึกข้อเสนอเรียบร้อย');
    loadRecords();
  } catch (e) { toast(errMsg(e), 'bad'); }
  finally { btn.disabled = false; loading(false); }
}
async function openProp(id) {
  loading(true);
  try { fillProp(await api('getProposal', id)); go('proposal'); }
  catch (e) { toast(errMsg(e), 'bad'); } finally { loading(false); }
}
/* =========================================================
 *  รายการ / ภาพรวม
 * ========================================================= */
let loadingRecs = false;
async function loadRecords() {
  if (loadingRecs) return; loadingRecs = true;
  try {
    const r = await api('listRecords');
    S.records = r.records;
    $('#st-plans').textContent = r.stat.plans;
    $('#st-periods').textContent = r.stat.periods;
    $('#st-items').textContent = r.stat.items;
    $('#st-schools').textContent = r.stat.schools;
    renderRecent(); renderRecords(); fillPlanSelect();
  } catch (e) { toast(errMsg(e), 'bad'); $('#recentList').innerHTML = '<div class="empty">' + esc(errMsg(e)) + '</div>'; }
  finally { loadingRecs = false; }
}
function recDetail(r) {
  return r.kind === 'plan'
    ? '<span class="ms" style="font-size:16px;color:var(--muted)">date_range</span> ' + esc(thRangeDates(r.startDate, r.endDate) || '-') + ' · <b>' + r.periods + '</b> คาบ'
    : '<b>' + r.count + '</b> ประเด็นข้อเสนอ';
}
function recStatus(r) {
  if (r.kind === 'plan') return '<span class="badge ' + (r.periods >= 8 ? 's-ok' : 's-wait') + '">' + (r.periods >= 8 ? 'ครบ 8 คาบ' : 'ยังไม่ครบ ' + r.periods + '/8') + '</span>';
  return '<span class="badge ' + (r.count ? 's-ok' : 's-wait') + '">' + (r.count ? 'มีข้อเสนอแล้ว' : 'ยังไม่มีประเด็น') + '</span>';
}
function renderRecent() {
  const list = S.records.slice(0, 6);
  $('#recentList').innerHTML = list.length ? list.map(r =>
    '<div style="display:flex;gap:12px;align-items:center;padding:10px 0;border-bottom:1px solid var(--line);cursor:pointer" data-open="' + r.kind + '|' + esc(r.id) + '">' +
    '<div class="ic" style="width:38px;height:38px;border-radius:12px;display:grid;place-items:center;flex:none;background:' + (r.kind === 'plan' ? '#e8ecff;color:var(--navy)' : 'var(--gold-soft);color:#b07d00') + '"><span class="ms">' + (r.kind === 'plan' ? 'event_note' : 'tips_and_updates') + '</span></div>' +
    '<div style="flex:1;min-width:0"><b style="display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + esc(r.teacher) + ' · ' + esc(r.school || '-') + '</b><small style="color:var(--muted)">' + (r.kind === 'plan' ? 'แผนปฏิบัติงาน' : 'ข้อเสนอปรับปรุง') + ' · ' + esc(since(r.updated)) + '</small></div>' +
    recStatus(r) + '</div>').join('')
    : '<div class="empty"><span class="ms">inbox</span>ยังไม่มีรายการ เริ่มสร้างแผนปฏิบัติงานได้เลย</div>';
}
function renderRecords() {
  const q = $('#q').value.trim().toLowerCase();
  const list = S.records.filter(r => (!S.kind || r.kind === S.kind) &&
    (!q || [r.teacher, r.school, r.affiliation, r.subject, r.id, r.email].join(' ').toLowerCase().includes(q)));
  $('#recEmpty').classList.toggle('hide', list.length > 0);
  $('#recBody').innerHTML = list.map(r =>
    '<tr>' +
    '<td data-l="ประเภท"><span class="badge ' + (r.kind === 'plan' ? 'plan' : 'prop') + '">' + (r.kind === 'plan' ? 'แผนปฏิบัติงาน' : 'ข้อเสนอ') + '</span></td>' +
    '<td data-l="ครู" class="who"><b>' + esc(r.teacher) + '</b><small>' + esc(r.email || '') + '</small></td>' +
    '<td data-l="โรงเรียน/วิชา" class="who"><b>' + esc(r.school || '-') + '</b><small>' + esc([r.affiliation, r.subject].filter(Boolean).join(' · ')) + '</small></td>' +
    '<td data-l="รายละเอียด">' + recDetail(r) + '</td>' +
    '<td data-l="สถานะ">' + recStatus(r) + '</td>' +
    '<td data-l="แก้ไขล่าสุด" style="color:var(--muted);white-space:nowrap">' + esc(since(r.updated)) + '</td>' +
    '<td><div class="acts">' +
    '<button class="ibtn" title="เปิด/แก้ไข" data-open="' + r.kind + '|' + esc(r.id) + '"><span class="ms">edit</span></button>' +
    '<button class="ibtn" title="พิมพ์" data-print="' + r.kind + '|' + esc(r.id) + '"><span class="ms">print</span></button>' +
    '<button class="ibtn del" title="ลบ" data-del="' + r.kind + '|' + esc(r.id) + '"><span class="ms">delete</span></button>' +
    '</div></td></tr>').join('');
}
document.addEventListener('click', async e => {
  const o = e.target.closest('[data-open]'), p = e.target.closest('[data-print]'), d = e.target.closest('[data-del]');
  if (o) { const [k, id] = o.dataset.open.split('|'); k === 'plan' ? openPlan(id) : openProp(id); }
  if (p) {
    const [k, id] = p.dataset.print.split('|'); loading(true);
    try { k === 'plan' ? printPlan(await api('getPlan', id)) : printProp(await api('getProposal', id)); }
    catch (er) { toast(errMsg(er), 'bad'); } finally { loading(false); }
  }
  if (d) {
    const [k, id] = d.dataset.del.split('|');
    if (!await confirmBox('ลบรายการนี้ถาวร?', 'รหัส ' + id + ' จะถูกลบออกจาก Google Sheets และไม่สามารถกู้คืนได้', 'ลบถาวร')) return;
    loading(true);
    try {
      await api('deleteRecord', k, id); toast('ลบรายการแล้ว');
      if (k === 'plan' && S.planId === id) newPlan();
      if (k === 'proposal' && S.propId === id) newProp();
      await loadRecords();
    } catch (er) { toast(errMsg(er), 'bad'); } finally { loading(false); }
  }
});

/* =========================================================
 *  พิมพ์ (รูปแบบตามแบบฟอร์ม PDF)
 * ========================================================= */
const BAR = 'โครงการจัดการเรียนรู้ด้วยการศึกษาทางไกลผ่านดาวเทียม (DLTV) ร่วมกับโรงเรียนปลายทาง';
const PAT = { '1': 'ดูความเข้าใจนักเรียน', '2': 'ดูการกำกับห้องเรียน', '3': 'สอนจริง' };
function thShort(a, b) { const f = t => t ? t.replace(':', '.') : ''; return a && b ? f(a) + '–' + f(b) + ' น.' : (a || b ? f(a || b) + ' น.' : ''); }
function rpHead(title, tag) {
  return '<div class="rp-head"><img class="f" src="assets/img/logo-foundation.png"><div class="t">' +
    '<div class="k">มูลนิธิการศึกษาทางไกลผ่านดาวเทียม ในพระบรมราชูปถัมภ์</div>' +
    '<h1>' + title + (tag ? '<span class="rp-tag">' + tag + '</span>' : '') + '</h1>' +
    '<div class="s">' + BAR + '</div></div><img class="d" src="assets/img/logo-dltv.png"></div><div class="rp-bar"></div>';
}
function rpInfo(list) {
  return '<div class="rp-info">' + list.map(x => '<div class="' + (x[2] || '') + '"><small>' + x[0] + '</small><b>' + (x[1] ? esc(x[1]) : '<span style="color:#b8bfd6">—</span>') + '</b></div>').join('') + '</div>';
}
function rpSign(left, right) {
  return '<div class="rp-sign"><div><div class="ln"></div>(' + esc(left[0] || '..................................................') + ')<br><small>' + left[1] + '</small></div>' +
    '<div><div class="ln"></div>(..................................................)<br><small>' + right + '</small></div></div>';
}
function rpFoot(id) {
  const n = new Date();
  return '<div class="rp-foot"><span>ระบบบันทึกงานครูต้นทาง DLTV' + (id ? ' · รหัส ' + esc(id) : '') + '</span><span>พิมพ์เมื่อ ' +
    n.getDate() + ' ' + TH_M[n.getMonth()] + ' ' + (n.getFullYear() + 543) + ' ' + String(n.getHours()).padStart(2, '0') + '.' + String(n.getMinutes()).padStart(2, '0') + ' น.</span></div>';
}
function doPrint(html) {
  pkClose();
  $('#printArea').innerHTML = html;
  const imgs = $$('#printArea img');
  const ready = document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve();
  Promise.all([ready].concat(imgs.map(i => i.complete ? 1 : new Promise(r => { i.onload = i.onerror = r; }))))
    .then(() => setTimeout(() => window.print(), 200));
}

function printPlan(p) {
  const items = (p.items || []).filter(i => i.date || i.start || i.detail || i.subject || i.grade || i.period);
  const teach = items.filter(i => i.type === 'เข้าสอน');
  const target = (S.init && S.init.periodsPerWeek) || 8;
  const cnt = k => teach.filter(i => i.pattern === k).length;
  const days = {};
  items.forEach(i => { (days[i.date || ''] = days[i.date || ''] || []).push(i); });
  const order = Object.keys(days).sort((a, b) => (a || '9').localeCompare(b || '9'));
  const dayHtml = order.map(k => {
    const d = parseD(k);
    const head = d ? '<b>' + d.getDate() + '</b><span>' + TH_M[d.getMonth()] + ' ' + String(d.getFullYear() + 543).slice(-2) + '</span><small>' + TH_DAY[d.getDay()] + '</small>'
      : '<span style="padding:8px 0">ไม่ระบุวัน</span>';
    const rows = days[k].sort((a, b) => (a.start || '').localeCompare(b.start || '')).map(i => {
      const isT = i.type === 'เข้าสอน';
      const title = isT ? 'เข้าสอน' + (i.subject ? 'วิชา' + esc(i.subject) : '') + (i.grade ? ' ' + esc(i.grade) : '') + (i.period ? ' · คาบที่ ' + esc(i.period) : '') : esc(i.type || 'กิจกรรม');
      const sub = isT ? [i.task, i.detail].filter(Boolean).map(esc).join(' · ') : esc(i.detail || '');
      const pill = isT && i.pattern ? '<span class="pill p' + i.pattern + '">รูปแบบที่ ' + i.pattern + ' · ' + PAT[i.pattern] + '</span>' : (isT ? '' : '<span class="pill g">' + esc(i.type || '') + '</span>');
      return '<div class="rp-row ' + (isT ? (i.pattern ? 'p' + i.pattern : 't') : '') + '"><div class="tm">' + (esc(thShort(i.start, i.end)) || '—') + '</div><div class="w"><b>' + title + '</b>' + (sub ? '<span>' + sub + '</span>' : '') + '</div>' + pill + '</div>';
    }).join('');
    return '<div class="rp-day"><div class="rp-date">' + head + '</div><div class="rp-rows">' + rows + '</div></div>';
  }).join('');
  const place = [p.destSchool, p.district ? 'อ.' + p.district : '', p.province ? 'จ.' + p.province : ''].filter(Boolean).join(' ');
  const html = '<div class="rp">' + rpHead('แผนปฏิบัติงานรายบุคคล ' + target + ' คาบ/สัปดาห์', 'ครูต้นทาง') +
    rpInfo([['ชื่อครู', p.teacher], ['โรงเรียนต้นทาง', p.originSchool, 'w2'], ['ห้วงเวลาปฏิบัติงาน', thRangeDates(p.startDate, p.endDate)],
      ['วิชาที่สอน ณ ร.ร.ต้นทาง', p.originSubject], ['วิชาที่สอน ณ ร.ร.ปลายทาง', p.destSubject], ['โรงเรียนปลายทาง', place, 'w2'], ['สังกัด', p.affiliation, 'w4']]) +
    '<div class="rp-sum"><div class="n"><b>' + teach.length + ' / ' + target + '</b><small>คาบสอน ณ โรงเรียนปลายทาง</small></div>' +
    '<div class="p1"><b>' + cnt('1') + '</b><small>รูปแบบที่ 1</small></div><div class="p2"><b>' + cnt('2') + '</b><small>รูปแบบที่ 2</small></div>' +
    '<div class="p3"><b>' + cnt('3') + '</b><small>รูปแบบที่ 3</small></div><div class="o"><b>' + order.filter(Boolean).length + '</b><small>วันปฏิบัติงาน</small></div></div>' +
    '<div class="rp-sec"><h3>ตารางปฏิบัติงานรายวัน</h3></div>' +
    (dayHtml || '<div class="rp-empty">ยังไม่มีรายการปฏิบัติงาน</div>') +
    (p.note ? '<div class="rp-note"><b>หมายเหตุ:</b> ' + nl(p.note) + '</div>' : '') +
    '<div class="rp-legend"><div class="p1"><b>รูปแบบที่ 1 · ดูความเข้าใจนักเรียน</b>เปิดเทปดูว่านักเรียนปลายทางเข้าใจเนื้อหาการสอนผ่านเทปออกอากาศหรือไม่</div>' +
    '<div class="p2"><b>รูปแบบที่ 2 · ดูการกำกับห้องเรียน</b>เปิดเทปดูการกำกับห้องเรียนของครูปลายทาง</div>' +
    '<div class="p3"><b>รูปแบบที่ 3 · สอนจริง</b>สอนจริง ณ โรงเรียนปลายทางกับนักเรียนจริง</div></div>' +
    rpSign([p.teacher, 'ครูต้นทาง'], 'ผู้อนุมัติ') + rpFoot(p.id) + '</div>';
  doPrint(html);
}

function printProp(p) {
  const items = (p.items || []).filter(i => i.problem || i.cause || i.before || i.after || i.topic || i.tape || i.remark);
  const cards = items.map((i, n) => {
    const meta = [i.mode ? '<span class="pill y">' + esc(i.mode) + '</span>' : '', i.grade ? '<span class="pill g">' + esc(i.grade) + '</span>' : '',
      (i.date || i.time) ? '<span class="pill g">' + esc([i.date ? thDate(i.date, 1) : '', i.time].filter(Boolean).join(' · ')) + '</span>' : '',
      i.minute ? '<span class="pill p1">นาทีที่ ' + esc(i.minute) + '</span>' : ''].join(' ');
    const blk = (lb, v, cls) => '<div class="' + (cls || '') + '"><div class="lb ' + (cls === 'r' ? 'r' : '') + '">' + lb + '</div>' + (v ? nl(v) : '<span style="color:#b8bfd6">—</span>') + '</div>';
    return '<div class="rp-card"><div class="h"><div class="no">' + (n + 1) + '</div><b>' + (i.tape ? 'เทปที่ ' + esc(i.tape) : 'ไม่ระบุเทป') + (i.topic ? ' · ' + esc(i.topic) : '') + '</b><div class="sp"></div>' + meta + '</div>' +
      '<div class="bd">' + blk('ปัญหาที่พบ', i.problem) + blk('สาเหตุของปัญหา', i.cause) +
      '<div class="rp-ba"><div class="o"><div class="lb">เดิมเป็นอย่างไร</div>' + (i.before ? nl(i.before) : '—') + '</div><div class="a">➜</div>' +
      '<div class="n"><div class="lb">ปรับใหม่ให้เป็นอย่างไร</div>' + (i.after ? nl(i.after) : '—') + '</div></div>' +
      (i.remark ? '<div class="full" style="font-size:12px;color:#5b6385"><b>หมายเหตุ:</b> ' + nl(i.remark) + '</div>' : '') + '</div></div>';
  }).join('');
  const html = '<div class="rp">' + rpHead('ข้อเสนอการปรับปรุง “เนื้อหา/วิธีการสอน”', 'การบ้านเพิ่มเติม · รายบุคคล') +
    rpInfo([['ครูผู้สอน', p.teacher], ['วิชาที่สอน ณ โรงเรียนปลายทาง', p.destSubject], ['โรงเรียนปลายทาง', p.destSchool, 'w2'], ['สังกัด', p.affiliation, 'w4']]) +
    '<div class="rp-guide"><span>ปรับตรงไหนของเทป?</span><em>→</em><span class="r">เดิมเป็นอย่างไร?</span><em>→</em><span class="n">ปรับใหม่ให้เป็นอย่างไร?</span><i>*** ข้อเสนอที่นำไปปฏิบัติได้จริง ***</i></div>' +
    '<div class="rp-sec"><h3>ประเด็นข้อเสนอ (' + items.length + ')</h3></div>' +
    (cards || '<div class="rp-empty">ยังไม่มีประเด็นข้อเสนอ</div>') +
    '<div class="rp-sign one"><div><div class="ln"></div>(' + esc(p.teacher || '..................................................') + ')<br><small>ครูผู้เสนอ</small></div></div>' + rpFoot(p.id) + '</div>';
  doPrint(html);
}

/* =========================================================
 *  Init
 * ========================================================= */
function wire() {
  wireList($('#planItems'), () => { refreshPlan(); draftPlan(); }, o => addPlanItem(o));
  wireList($('#propItems'), () => { refreshProp(); draftProp(); }, o => addPropItem(o));
  ['input', 'change'].forEach(ev => { $('#pg-plan').addEventListener(ev, draftPlan); $('#pg-proposal').addEventListener(ev, draftProp); });
  $('#pg-plan').addEventListener('input', e => { if (e.target.id && e.target.id.startsWith('pl-')) { e.target.classList.remove('err'); refreshPlan(); } });
  $('#pg-proposal').addEventListener('input', e => { if (e.target.id && e.target.id.startsWith('pr-')) { e.target.classList.remove('err'); refreshProp(); } });
  $('#btnAddPlanItem').onclick = () => addPlanItem(null, true);
  $('#btnAddPropItem').onclick = () => addPropItem(null, true);
  $('#btnSortPlan').onclick = sortPlan;
  $('#btnSavePlan').onclick = savePlan;
  $('#btnSaveProp').onclick = saveProp;
  $('#btnPrintPlan').onclick = () => printPlan(collectPlan());
  $('#btnPrintProp').onclick = () => printProp(collectProp());
  $('#btnNewPlan').onclick = async () => { if (await confirmBox('เริ่มแผนใหม่?', 'ข้อมูลที่ยังไม่บันทึกในแบบฟอร์มจะหายไป', 'เริ่มใหม่')) { store.del(dk('planDraft')); newPlan(); } };
  $('#btnNewProp').onclick = async () => { if (await confirmBox('เริ่มข้อเสนอใหม่?', 'ข้อมูลที่ยังไม่บันทึกในแบบฟอร์มจะหายไป', 'เริ่มใหม่')) { store.del(dk('propDraft')); newProp(); } };
  $('#pr-planId').onchange = onPlanPick;
  $('#btnImportPeriods').onclick = importPeriods;
  $('#btnReload').onclick = loadRecords;
  $('#q').oninput = renderRecords;
  $('#kindSeg').addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    $$('#kindSeg button').forEach(x => x.classList.toggle('on', x === b));
    S.kind = b.dataset.v; renderRecords();
  });
}
let started = false;
function initials(n) { return (n || '?').replace(/^(คุณ|นางสาว|นาง|นาย|น\.ส\.|ครู|ดร\.)\s*/, '').trim().charAt(0) || '?'; }
function renderUser() {
  const name = (S.init && S.init.profile && S.init.profile.teacher) || AUTH.name || AUTH.email;
  $('#userName').textContent = name;
  $('#userEmail').textContent = AUTH.email;
  const av = $('#userAvatar');
  av.innerHTML = AUTH.picture ? '<img src="' + esc(AUTH.picture) + '" referrerpolicy="no-referrer" alt="">' : esc(initials(name));
  $('#heroName').textContent = name ? 'คุณ' + name.replace(/^(คุณ|นางสาว|นาง|นาย|น\.ส\.)\s*/, '') : 'คุณครูต้นทาง';
  const ll = S.init && S.init.lastLogin;
  $('#heroLast').textContent = ll ? 'เข้าใช้ครั้งก่อน ' + since(ll) + ' · เข้าใช้ทั้งหมด ' + S.init.loginCount + ' ครั้ง' : (S.init ? 'ยินดีต้อนรับสู่ระบบครั้งแรก' : '');
  $('#heroLast').classList.toggle('hide', !$('#heroLast').textContent);
}
async function startApp() {
  if (started) return; started = true;
  S.ready = false;
  $('#demoChip').classList.toggle('hide', MODE !== 'demo');
  renderUser();
  go('home');
  loading(true);
  try {
    S.init = await api('getInit', { ua: navigator.userAgent });
    if (S.init.picture && !AUTH.picture) setAuth({ picture: S.init.picture });
    $('#userRole').innerHTML = S.init.isAdmin ? '<span class="chip admin" style="margin-top:8px"><span class="ms" style="font-size:16px">shield_person</span>ผู้ดูแลระบบ</span>' : '';
    $('#dlSchools').innerHTML = S.init.schools.map(s => '<option value="' + esc(s) + '">').join('');
    $('#dlSubjects').innerHTML = S.init.subjects.map(s => '<option value="' + esc(s) + '">').join('');
    $('#dlAffiliations').innerHTML = (S.init.affiliations || []).map(s => '<option value="' + esc(s) + '">').join('');
    $('#planOriginLbl').textContent = S.init.originSchool;
  } catch (e) { toast(errMsg(e), 'bad'); }
  finally { loading(false); }
  // เติมฟอร์ม: แบบร่างของบัญชีนี้ (ถ้ามี) หรือข้อมูลตั้งต้นจากครั้งก่อน
  const pd = store.get(dk('planDraft')), rd = store.get(dk('propDraft'));
  pd ? fillPlan(pd) : newPlan();
  rd ? fillProp(rd) : newProp();
  if (pd) $('#planSaveInfo').textContent = 'กู้คืนแบบร่างที่ยังไม่บันทึก';
  if (rd) $('#propSaveInfo').textContent = 'กู้คืนแบบร่างที่ยังไม่บันทึก';
  S.ready = true;
  renderUser();
}
function boot() {
  wire();
  ['planDraft', 'propDraft', 'profile'].forEach(k => store.del(k));   // ล้างแบบร่างรุ่นเก่าที่ไม่แยกบัญชี
  $('#btnLogout').onclick = $('#btnLogout2').onclick = async () => { if (await confirmBox('ออกจากระบบ?', 'แบบร่างที่ยังไม่บันทึกจะเก็บไว้ในเบราว์เซอร์นี้ เมื่อเข้าสู่ระบบครั้งหน้าจะกู้คืนให้', 'ออกจากระบบ')) logout(); };
  $('#loginLite').onsubmit = e => {
    e.preventDefault();
    const a = { name: $('#lgName').value.trim(), email: $('#lgEmail').value.trim().toLowerCase() };
    setAuth(a); store.set('lite', a); hideLogin(); startApp();
  };
  $('#btnDemo').onclick = () => { setAuth({ name: 'ผู้ใช้ทดลอง', email: 'demo@dltv.local' }); hideLogin(); startApp(); };
  if (restoreAuth()) startApp();
  else if (MODE === 'google' && AUTH.email) { showLogin(); }      // token หมดอายุ: One Tap จะเข้าสู่ระบบให้อัตโนมัติ
  else showLogin();
}
boot();
