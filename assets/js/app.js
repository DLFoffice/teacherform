/* =========================================================
 *  DLTV ครูต้นทาง – Front-end
 * ========================================================= */
const $ = (s, el) => (el || document).querySelector(s);
const $$ = (s, el) => Array.from((el || document).querySelectorAll(s));
const S = { init: null, records: [], kind: '', planId: '', propId: '', propStatus: '' };
const TITLES = { home: 'ภาพรวม', plan: 'แผนปฏิบัติงานรายบุคคล 8 คาบ/สัปดาห์', proposal: 'ข้อเสนอการปรับปรุง “เนื้อหา/วิธีการสอน”', records: 'รายการที่บันทึก', guide: 'คำชี้แจง / รูปแบบงาน' };
const TH_M = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
const TH_D = ['อา.', 'จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.'];

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
const AUTH = { token: '', email: '', name: '', exp: 0 };

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
    getInit: () => ({ email: AUTH.email, name: AUTH.name, isAdmin: true, originSchool: 'โรงเรียนวังไกลกังวล ในพระบรมราชูปถัมภ์', periodsPerWeek: 8, schools: ['โรงเรียนบ้านหนองหญ้าปล้อง'], subjects: ['ภาษาไทย', 'คณิตศาสตร์', 'วิทยาศาสตร์', 'ภาษาอังกฤษ', 'สังคมศึกษา'] }),
    savePlan: p => {
      const db = load(); p = JSON.parse(JSON.stringify(p));
      p.items = (p.items || []).filter(i => i.date || i.detail || i.subject);
      const old = p.id && db.plans[p.id];
      p.id = old ? p.id : id('PL'); p.created = old ? old.created : now(); p.updated = now(); p.email = AUTH.email;
      p.periods = p.items.filter(i => i.type === 'เข้าสอน').length;
      db.plans[p.id] = p; save(db); return { id: p.id, periods: p.periods };
    },
    getPlan: i => { const p = load().plans[i]; if (!p) throw new Error('ไม่พบแผนปฏิบัติงาน'); return p; },
    saveProposal: p => {
      const db = load(); p = JSON.parse(JSON.stringify(p));
      p.items = (p.items || []).filter(i => i.problem || i.before || i.after || i.topic);
      const old = p.id && db.props[p.id];
      p.id = old ? p.id : id('PR'); p.created = old ? old.created : now(); p.updated = now(); p.email = AUTH.email;
      p.status = old && old.status !== 'ส่งกลับแก้ไข' ? old.status : 'รอพิจารณา';
      if (old) { p.comment = old.comment; p.reviewer = old.reviewer; p.reviewedAt = old.reviewedAt; }
      db.props[p.id] = p; save(db); return { id: p.id, count: p.items.length };
    },
    getProposal: i => { const p = load().props[i]; if (!p) throw new Error('ไม่พบข้อเสนอ'); return p; },
    reviewProposal: (i, st, cm) => { const db = load(); Object.assign(db.props[i], { status: st, comment: cm, reviewer: AUTH.email, reviewedAt: now() }); save(db); return true; },
    deleteRecord: (k, i) => { const db = load(); delete db[k === 'plan' ? 'plans' : 'props'][i]; save(db); return true; },
    listRecords: () => {
      const db = load();
      const plans = Object.values(db.plans).map(p => ({ kind: 'plan', id: p.id, created: p.created, updated: p.updated, email: p.email, teacher: p.teacher, school: p.destSchool, subject: p.destSubject, startDate: p.startDate, endDate: p.endDate, periods: p.periods }));
      const props = Object.values(db.props).map(p => ({ kind: 'proposal', id: p.id, created: p.created, updated: p.updated, email: p.email, teacher: p.teacher, school: p.destSchool, subject: p.destSubject, planId: p.planId, count: p.items.length, status: p.status }));
      const all = plans.concat(props).sort((a, b) => a.updated < b.updated ? 1 : -1);
      return { records: all, isAdmin: true, stat: { plans: plans.length, proposals: props.length, items: props.reduce((s, x) => s + x.count, 0), periods: plans.reduce((s, x) => s + x.periods, 0), approved: props.filter(x => x.status === 'อนุมัติ').length } };
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
  try { sessionStorage.setItem('dltv_auth', JSON.stringify(AUTH)); } catch (e) { }
}
function restoreAuth() {
  try { const a = JSON.parse(sessionStorage.getItem('dltv_auth')); if (a) Object.assign(AUTH, a); } catch (e) { }
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
      setAuth({ token: r.credential, email: p.email || '', name: p.name || '', exp: p.exp || 0 });
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
  Object.assign(AUTH, { token: '', email: '', name: '', exp: 0 });
  try { sessionStorage.removeItem('dltv_auth'); } catch (e) { }
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
function readItem(el) {
  const o = {};
  $$('[data-k]', el).forEach(f => { o[f.dataset.k] = f.classList.contains('seg') ? segVal(f) : f.value.trim(); });
  return o;
}
function writeItem(el, o) {
  $$('[data-k]', el).forEach(f => {
    const v = o && o[f.dataset.k] != null ? o[f.dataset.k] : '';
    if (f.classList.contains('seg')) segSet(f, v); else f.value = v;
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
 *  แผนปฏิบัติงาน
 * ========================================================= */
const PLAN_F = ['teacher', 'originSchool', 'originSubject', 'destSubject', 'startDate', 'endDate', 'destSchool', 'district', 'province', 'note'];
const TASK2PAT = { 'สอนเปิดเทปสังเกตนักเรียน': '1', 'สอนเปิดเทปสังเกตการกำกับห้องเรียน': '2', 'สอนจริง': '3' };

function addPlanItem(o, focus) {
  const el = $('#tplPlanItem').content.firstElementChild.cloneNode(true);
  writeItem(el, Object.assign({ type: 'เข้าสอน' }, o || {}));
  if (!o) {
    const last = readPlanItems().slice(-1)[0];
    if (last) { $('[data-k=date]', el).value = last.date; $('[data-k=subject]', el).value = last.subject; }
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
  store.set('planDraft', collectPlan());
}
function collectPlan() {
  const p = { id: S.planId, items: readPlanItems() };
  PLAN_F.forEach(k => p[k] = $('#pl-' + k).value.trim());
  return p;
}
function fillPlan(p) {
  S.planId = p.id || '';
  PLAN_F.forEach(k => $('#pl-' + k).value = p[k] || '');
  if (!$('#pl-originSchool').value) $('#pl-originSchool').value = (S.init && S.init.originSchool) || '';
  $('#planItems').innerHTML = '';
  (p.items && p.items.length ? p.items : [null]).forEach(it => addPlanItem(it || { type: 'เข้าสอน' }));
  $('#planIdBadge').textContent = S.planId ? 'รหัส ' + S.planId : 'แผนใหม่';
  $('#planSaveInfo').textContent = p.updated ? 'บันทึกล่าสุด ' + since(p.updated) : 'ยังไม่ได้บันทึก';
  refreshPlan();
}
function newPlan() {
  const last = store.get('profile') || {};
  fillPlan({ teacher: last.teacher, originSubject: last.originSubject, destSubject: last.destSubject, destSchool: last.destSchool, district: last.district, province: last.province });
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
    store.set('profile', p); store.del('planDraft');
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
const PROP_F = ['teacher', 'destSchool', 'destSubject', 'planId'];
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
  store.set('propDraft', collectProp());
}
function collectProp() {
  const p = { id: S.propId, items: readPropItems() };
  PROP_F.forEach(k => p[k] = $('#pr-' + k).value.trim());
  return p;
}
function fillProp(p) {
  S.propId = p.id || ''; S.propStatus = p.status || '';
  fillPlanSelect(p.planId);
  PROP_F.forEach(k => { if (k !== 'planId') $('#pr-' + k).value = p[k] || ''; });
  $('#propItems').innerHTML = '';
  (p.items && p.items.length ? p.items : [null]).forEach(it => addPropItem(it));
  $('#propIdBadge').textContent = S.propId ? (p.status || 'รอพิจารณา') + ' · ' + S.propId : 'ข้อเสนอใหม่';
  $('#propSaveInfo').textContent = p.updated ? 'บันทึกล่าสุด ' + since(p.updated) : 'ยังไม่ได้บันทึก';
  const showReview = S.propId && (S.init && S.init.isAdmin || (p.status && p.status !== 'รอพิจารณา'));
  $('#reviewCard').classList.toggle('hide', !showReview);
  if (showReview) {
    $('#rv-status').value = p.status || 'รอพิจารณา';
    $('#rv-comment').value = p.comment || '';
    $('#reviewMeta').textContent = p.reviewer ? 'โดย ' + p.reviewer + ' · ' + since(p.reviewedAt) : 'ยังไม่มีการพิจารณา';
    const ro = !(S.init && S.init.isAdmin);
    $('#rv-status').disabled = ro; $('#rv-comment').readOnly = ro; $('#btnReview').classList.toggle('hide', ro);
  }
  refreshProp();
}
function newProp() {
  const last = store.get('profile') || {};
  fillProp({ teacher: last.teacher, destSchool: last.destSchool, destSubject: (last.destSubject || '').split(/[\s(]/)[0] });
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
    $('#propIdBadge').textContent = (S.propStatus === 'ส่งกลับแก้ไข' || !S.propStatus ? 'รอพิจารณา' : S.propStatus) + ' · ' + r.id;
    $('#propSaveInfo').textContent = 'บันทึกแล้ว ' + new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }) + ' · ' + r.count + ' ประเด็น';
    store.del('propDraft');
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
async function saveReview() {
  if (!S.propId) return;
  loading(true);
  try {
    await api('reviewProposal', S.propId, $('#rv-status').value, $('#rv-comment').value);
    S.propStatus = $('#rv-status').value;
    $('#propIdBadge').textContent = S.propStatus + ' · ' + S.propId;
    $('#reviewMeta').textContent = 'โดย ' + (S.init.email || '') + ' · เมื่อสักครู่';
    toast('บันทึกผลการพิจารณาแล้ว');
  } catch (e) { toast(errMsg(e), 'bad'); } finally { loading(false); }
}

/* =========================================================
 *  รายการ / ภาพรวม
 * ========================================================= */
const ST_CLS = { 'รอพิจารณา': 's-wait', 'อนุมัติ': 's-ok', 'ไม่อนุมัติ': 's-no', 'ส่งกลับแก้ไข': 's-back' };
let loadingRecs = false;
async function loadRecords() {
  if (loadingRecs) return; loadingRecs = true;
  try {
    const r = await api('listRecords');
    S.records = r.records;
    $('#st-plans').textContent = r.stat.plans;
    $('#st-periods').textContent = r.stat.periods;
    $('#st-items').textContent = r.stat.items;
    $('#st-approved').textContent = r.stat.approved;
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
  if (r.kind === 'plan') return '<span class="badge ' + (r.periods >= 8 ? 's-ok' : 's-wait') + '">' + (r.periods >= 8 ? 'ครบ 8 คาบ' : 'ยังไม่ครบ') + '</span>';
  return '<span class="badge ' + (ST_CLS[r.status] || 's-wait') + '">' + esc(r.status || 'รอพิจารณา') + '</span>';
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
    (!q || [r.teacher, r.school, r.subject, r.id, r.email].join(' ').toLowerCase().includes(q)));
  $('#recEmpty').classList.toggle('hide', list.length > 0);
  $('#recBody').innerHTML = list.map(r =>
    '<tr>' +
    '<td data-l="ประเภท"><span class="badge ' + (r.kind === 'plan' ? 'plan' : 'prop') + '">' + (r.kind === 'plan' ? 'แผนปฏิบัติงาน' : 'ข้อเสนอ') + '</span></td>' +
    '<td data-l="ครู" class="who"><b>' + esc(r.teacher) + '</b><small>' + esc(r.email || '') + '</small></td>' +
    '<td data-l="โรงเรียน/วิชา" class="who"><b>' + esc(r.school || '-') + '</b><small>' + esc(r.subject || '') + '</small></td>' +
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
function pHead() {
  return '<div class="phead"><img src="assets/img/logo-foundation.png"><div class="pbar" style="flex:1">' + BAR + '</div><img src="assets/img/logo-dltv.png"></div>';
}
function doPrint(html) {
  $('#printArea').innerHTML = html;
  const imgs = $$('#printArea img');
  Promise.all(imgs.map(i => i.complete ? 1 : new Promise(r => { i.onload = i.onerror = r; }))).then(() => setTimeout(() => window.print(), 150));
}
function printPlan(p) {
  const pc = n => n ? '<span class="c' + n + '">(รูปแบบที่ ' + n + ')</span>' : '';
  let rows = '', lastDate = null;
  (p.items || []).forEach(i => {
    const showDate = i.date !== lastDate; lastDate = i.date;
    const time = thRange(i.start, i.end);
    let what;
    if (i.type === 'เข้าสอน') what = 'เข้าสอนวิชา' + esc(i.subject) + ' ' + esc(i.grade) + (i.period ? ' (คาบที่ ' + esc(i.period) + ')' : '') + (i.detail ? ' ' + esc(i.detail) : '');
    else what = esc(i.detail || i.type);
    rows += '<tr><td style="white-space:nowrap">' + (showDate ? esc(thDate(i.date)) : '') + '</td><td style="white-space:nowrap">=> ' + esc(time) + '</td><td>' + what + '</td></tr>';
    if (i.type === 'เข้าสอน' && (i.task || i.pattern)) rows += '<tr><td></td><td></td><td class="task">' + esc(i.task) + ' ' + pc(i.pattern) + '</td></tr>';
  });
  const html = '<div class="pdoc">' + pHead() +
    '<h2 style="font-size:20px;margin:6px 0 12px">แผนปฏิบัติงานรายบุคคล ' + ((S.init && S.init.periodsPerWeek) || 8) + ' คาบ/สัปดาห์</h2>' +
    '<div class="pplan"><div class="h">แผนการปฏิบัติงาน ครูต้นทาง ' + esc(p.originSchool || '') + ' (รายบุคคล)<br>' + BAR + '</div>' +
    '<div class="pinfo"><b>ชื่อครู</b> ' + esc(p.teacher) + '<br><b>วิชาที่สอน ณ โรงเรียนต้นทาง</b> ' + esc(p.originSubject) +
    '<br><b>วิชาที่สอน ณ โรงเรียนปลายทาง</b> ' + esc(p.destSubject) +
    '<br><b>ห้วงเวลาในการปฏิบัติงาน ณ โรงเรียนปลายทาง</b> ' + esc(thRangeDates(p.startDate, p.endDate)) +
    '<br><b>โรงเรียนปลายทาง</b> ' + esc(p.destSchool) + (p.district ? ' อำเภอ' + esc(p.district) : '') + (p.province ? ' จังหวัด' + esc(p.province) : '') + '</div>' +
    '<table class="sched">' + rows + '</table>' +
    (p.note ? '<p><b>หมายเหตุเพิ่มเติม</b> ' + nl(p.note) + '</p>' : '') +
    '<p style="margin-top:16px"><b>หมายเหตุ งานที่ครูต้นทางปฏิบัติ ณ โรงเรียนปลายทาง</b><br>' +
    '<span class="c1">รูปแบบที่ 1)</span> เปิดเทปดูว่านักเรียนปลายทางเข้าใจเนื้อหาการสอนของตนผ่านเทปออกอากาศหรือไม่<br>' +
    '<span class="c2">รูปแบบที่ 2)</span> เปิดเทปดูการกำกับห้องเรียนของครู<br>' +
    '<span class="c3">รูปแบบที่ 3)</span> สอนจริง ณ โรงเรียนปลายทางกับลูกค้าจริง</p></div>' +
    '<div class="psign"><div>ลงชื่อ ......................................................<br>(' + esc(p.teacher) + ')<br>ครูต้นทาง</div><div>ลงชื่อ ......................................................<br>(......................................................)<br>ผู้อนุมัติ</div></div></div>';
  doPrint(html);
}
function printProp(p) {
  const items = (p.items || []).slice();
  while (items.length < 6) items.push({});
  const rows = items.map(i => {
    const prop = (i.before ? '<div class="lb o">เดิม:</div>' + nl(i.before) : '') + (i.after ? '<div class="lb n">ปรับใหม่:</div>' + nl(i.after) : '');
    return '<tr style="height:34px"><td>' + esc(i.date ? thDate(i.date) : '') + (i.time ? '<br>' + esc(i.time) : '') + '</td><td style="text-align:center">' + esc(i.grade || '') +
      '</td><td>' + (i.mode ? '(' + esc(i.mode) + ')<br>' : '') + (i.tape ? 'เทปที่ ' + esc(i.tape) + '<br>' : '') + esc(i.topic || '') +
      '</td><td>' + nl(i.problem) + '</td><td>' + nl(i.cause) + '</td><td>' + prop + '</td><td style="text-align:center">' + esc(i.minute || '') + '</td><td>' + nl(i.remark) + '</td></tr>';
  }).join('');
  const html = '<div class="pdoc">' + pHead() +
    '<div class="ptitle">ข้อเสนอการปรับปรุง <span class="r">“เนื้อหา/วิธีการสอน”</span> ของครูต้นทาง <span class="b">(การบ้านเพิ่มเติม : รายบุคคล)</span></div>' +
    '<div class="psub">ตามโครงการจัดการเรียนรู้ด้วยการศึกษาทางไกลผ่านดาวเทียม (DLTV) ร่วมกับโรงเรียนปลายทาง</div>' +
    '<div class="pinfo"><b>ชื่อครูผู้สอน :</b> ' + esc(p.teacher) + '<br><b>โรงเรียนปลายทาง :</b> ' + esc(p.destSchool) + '<br><b>วิชาที่สอน ณ โรงเรียนปลายทาง :</b> ' + esc(p.destSubject) + '</div>' +
    '<table class="pt"><colgroup><col style="width:9%"><col style="width:6%"><col style="width:13%"><col style="width:17%"><col style="width:13%"><col style="width:22%"><col style="width:7%"><col style="width:13%"></colgroup>' +
    '<thead><tr><th>วัน/เวลา<br>ที่สอน</th><th>ระดับชั้น<br>ที่สอน</th><th><span style="font-weight:500;font-size:11px">(เปิดเทป/สอนสด)</span><br><span class="r">ตรงกับเทปที่ ?<br>เรื่องที่สอน ?</span></th>' +
    '<th><span class="r">ปัญหาที่พบ</span><span class="b">ของ “เนื้อหา/วิธีการสอนของครูต้นทาง” ที่ทำให้ นร.ไม่เข้าใจ</span></th>' +
    '<th><span class="r">สาเหตุของปัญหา</span><br><span style="font-weight:500">(ทั้งจากครู และทั้งจาก นร.)</span></th>' +
    '<th><span class="r">ปรับข้อเสนอ</span><br><u>“เนื้อหา/วิธีการสอน”</u><span class="b">(ปรับเพื่อให้ นร.เข้าใจเนื้อหาการสอนมากขึ้น)</span></th>' +
    '<th>ปรับ ณ<br><span class="r">นาทีที่ ?</span><br>ในเทป</th><th>หมายเหตุ</th></tr></thead><tbody>' + rows + '</tbody></table>' +
    (p.status && p.status !== 'รอพิจารณา' ? '<p><b>ผลการพิจารณา:</b> ' + esc(p.status) + (p.comment ? ' — ' + nl(p.comment) : '') + '</p>' : '') +
    '<div class="psign"><div>ลงชื่อ ......................................................<br>(' + esc(p.teacher) + ')<br>ครูผู้เสนอ</div><div>ลงชื่อ ......................................................<br>(......................................................)<br>ผู้พิจารณา</div></div></div>';
  doPrint(html);
}

/* =========================================================
 *  Init
 * ========================================================= */
function wire() {
  wireList($('#planItems'), refreshPlan, o => addPlanItem(o));
  wireList($('#propItems'), refreshProp, o => addPropItem(o));
  $('#pg-plan').addEventListener('input', e => { if (e.target.id && e.target.id.startsWith('pl-')) { e.target.classList.remove('err'); refreshPlan(); } });
  $('#pg-proposal').addEventListener('input', e => { if (e.target.id && e.target.id.startsWith('pr-')) { e.target.classList.remove('err'); refreshProp(); } });
  $('#btnAddPlanItem').onclick = () => addPlanItem(null, true);
  $('#btnAddPropItem').onclick = () => addPropItem(null, true);
  $('#btnSortPlan').onclick = sortPlan;
  $('#btnSavePlan').onclick = savePlan;
  $('#btnSaveProp').onclick = saveProp;
  $('#btnPrintPlan').onclick = () => printPlan(collectPlan());
  $('#btnPrintProp').onclick = () => printProp(Object.assign(collectProp(), { status: S.propStatus, comment: $('#rv-comment').value }));
  $('#btnNewPlan').onclick = async () => { if (await confirmBox('เริ่มแผนใหม่?', 'ข้อมูลที่ยังไม่บันทึกในแบบฟอร์มจะหายไป', 'เริ่มใหม่')) { store.del('planDraft'); newPlan(); } };
  $('#btnNewProp').onclick = async () => { if (await confirmBox('เริ่มข้อเสนอใหม่?', 'ข้อมูลที่ยังไม่บันทึกในแบบฟอร์มจะหายไป', 'เริ่มใหม่')) { store.del('propDraft'); newProp(); } };
  $('#pr-planId').onchange = onPlanPick;
  $('#btnImportPeriods').onclick = importPeriods;
  $('#btnReview').onclick = saveReview;
  $('#btnReload').onclick = loadRecords;
  $('#q').oninput = renderRecords;
  $('#kindSeg').addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    $$('#kindSeg button').forEach(x => x.classList.toggle('on', x === b));
    S.kind = b.dataset.v; renderRecords();
  });
}
let started = false;
async function startApp() {
  if (started) return; started = true;
  $('#userEmail').textContent = AUTH.name ? AUTH.name + ' · ' + AUTH.email : AUTH.email;
  $('#demoChip').classList.toggle('hide', MODE !== 'demo');
  go('home');
  try {
    S.init = await api('getInit');
    $('#userRole').innerHTML = S.init.isAdmin ? '<span class="chip admin" style="margin-top:8px"><span class="ms" style="font-size:16px">shield_person</span>ผู้ดูแลระบบ</span>' : '';
    $('#dlSchools').innerHTML = S.init.schools.map(s => '<option value="' + esc(s) + '">').join('');
    $('#dlSubjects').innerHTML = S.init.subjects.map(s => '<option value="' + esc(s) + '">').join('');
    $('#planOriginLbl').textContent = S.init.originSchool;
    if (!$('#pl-originSchool').value) $('#pl-originSchool').value = S.init.originSchool;
    if (!$('#pl-teacher').value && AUTH.name) $('#pl-teacher').value = AUTH.name;
    if (!$('#pr-teacher').value && AUTH.name) $('#pr-teacher').value = AUTH.name;
    refreshPlan(); refreshProp();
  } catch (e) { toast(errMsg(e), 'bad'); }
}
function boot() {
  wire();
  const pd = store.get('planDraft'), rd = store.get('propDraft');
  pd ? fillPlan(pd) : newPlan();
  rd ? fillProp(rd) : newProp();
  if (pd && pd.teacher) $('#planSaveInfo').textContent = 'กู้คืนแบบร่างที่ยังไม่บันทึก';
  if (rd && rd.teacher) $('#propSaveInfo').textContent = 'กู้คืนแบบร่างที่ยังไม่บันทึก';
  $('#btnLogout').onclick = $('#btnLogout2').onclick = async () => { if (await confirmBox('ออกจากระบบ?', 'แบบร่างที่ยังไม่บันทึกจะยังเก็บไว้ในเบราว์เซอร์นี้', 'ออกจากระบบ')) logout(); };
  $('#loginLite').onsubmit = e => {
    e.preventDefault();
    const a = { name: $('#lgName').value.trim(), email: $('#lgEmail').value.trim().toLowerCase() };
    setAuth(a); store.set('lite', a); hideLogin(); startApp();
  };
  $('#btnDemo').onclick = () => { setAuth({ name: 'ผู้ใช้ทดลอง', email: 'demo@dltv.local' }); hideLogin(); startApp(); };
  if (restoreAuth()) startApp(); else showLogin();
}
boot();
