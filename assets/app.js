/* Agent Kammer MVP prototype — runs entirely in the browser (localStorage).
   Two separate stores model the compliance boundary:
   - LIFESTYLE: concierge requests, vendors, audit log (no financial data, ever)
   - PROSPECTS: consented inbound leads + anonymous editorial interactions
   Sample data only. Not a production system. */
(function () {
  'use strict';
  var KEY = { L: 'ak.lifestyle.v1', P: 'ak.prospects.v1' };
  var H = 3600e3, D = 24 * H, mem = {};
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var uid = function (p) { return p + Math.random().toString(36).slice(2, 8); };
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }

  function save(k, v) { mem[k] = v; try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  function load(k, seed) {
    if (mem[k]) return mem[k];
    try { var v = localStorage.getItem(k); if (v) { mem[k] = JSON.parse(v); return mem[k]; } } catch (e) {}
    var s = seed(); save(k, s); return s;
  }

  /* ---------- reference data ---------- */
  var STAT = [['pending', 'Pending'], ['assigned', 'Assigned'], ['in_progress', 'In progress'], ['fulfilled', 'Fulfilled']];
  var STAFF = ['Unassigned', 'M. Reyes', 'J. Tan', 'A. Okafor'];
  var TYPES = ['Dining', 'Private transit', 'Property staging', 'Vendor introduction', 'Fine art handling', 'Security', 'Bespoke travel'];
  var HOUSEHOLDS = ['H-A', 'H-B', 'H-C', 'H-D', 'H-E', 'H-F'];
  var VCATS = ['Private aviation', 'Architectural design', 'Property staging', 'Security consulting', 'Fine art handling', 'Dining & hospitality', 'Marine services'];
  var LEAD_STAT = [['new', 'New'], ['contacted', 'Contacted'], ['consult_booked', 'Consultation booked'], ['consult_held', 'Consultation held']];
  var STORIES = { glass: 'The glass house that learned to disappear', blocks: 'Three blocks, one skyline', harbor: 'An evening above the harbor', wall: 'The collector’s wall', arrivals: 'Slow arrivals' };
  var ROUTES = [
    { tier: 'A', label: 'Private Client', min: 70, to: 'H. Whitaker · Senior Advisor' },
    { tier: 'B', label: 'Select', min: 45, to: 'S. Marlowe · Private Client Associate' },
    { tier: 'C', label: 'Nurture', min: 0, to: 'Editorial nurture list' }
  ];

  /* ---------- seed data (sample, relative to now) ---------- */
  function seedL() {
    var n = Date.now(), v = [
      ['Aerovance Charter (sample)', 'Private aviation', 'Dana Kerr', '+1 (555) 010-0101', 'Fast on weekend repositioning. Prefers 48h notice for Teterboro.'],
      ['Studio Halden (sample)', 'Architectural design', 'Ines Halden', '+1 (555) 010-0102', 'Residential interiors. Strong on heritage buildings.'],
      ['Stagecraft Residences (sample)', 'Property staging', 'Marcus Bell', '+1 (555) 010-0103', 'Two-week turnaround for prime listings.'],
      ['Meridian Protective (sample)', 'Security consulting', 'Colonel R. Voss', '+1 (555) 010-0104', 'Event and travel advance work. Discreet.'],
      ['Gallery Freight Co. (sample)', 'Fine art handling', 'Priya Nair', '+1 (555) 010-0105', 'Climate-controlled crating. Insured to client schedule.'],
      ['La Table Privée (sample)', 'Dining & hospitality', 'Maître Julien', '+1 (555) 010-0106', 'Direct line. Chef’s table and private rooms.'],
      ['Harbor & Keel (sample)', 'Marine services', 'Tom Alder', '+1 (555) 010-0107', 'Winterization and crew placement. Quotes in 3–5 days.']
    ].map(function (r, i) { return { id: 'v' + (i + 1), name: r[0], cat: r[1], contact: r[2], phone: r[3], notes: r[4], lastUsed: n - (i + 2) * D }; });
    var R = [
      ['Dining', 'H-A', 'Table for six, Friday 8:00 pm. Allergen note on file.', 'pending', 'Unassigned', 3, 0, 'v6', 'high'],
      ['Private transit', 'H-C', 'Charter, Aspen to Teterboro, Sunday.', 'assigned', 'J. Tan', 9, 0, 'v1', 'high'],
      ['Fine art handling', 'H-F', 'Crate and move two works to the new residence.', 'in_progress', 'M. Reyes', 30, 0, 'v5', 'normal'],
      ['Property staging', 'H-B', 'Stage the east-wing listing before photography.', 'in_progress', 'A. Okafor', 52, 0, 'v3', 'normal'],
      ['Vendor introduction', 'H-D', 'Introduce an architect for a coastal renovation.', 'assigned', 'M. Reyes', 20, 0, 'v2', 'normal'],
      ['Security', 'H-A', 'Advance team for a two-day Lisbon trip.', 'pending', 'Unassigned', 6, 0, 'v4', 'high'],
      ['Dining', 'H-E', 'Anniversary dinner, private room.', 'fulfilled', 'M. Reyes', 80, 22, 'v6', 'normal'],
      ['Private transit', 'H-B', 'Airport transfer, four guests.', 'fulfilled', 'J. Tan', 70, 9, 'v1', 'normal'],
      ['Bespoke travel', 'H-C', 'Ten-day itinerary, Japan, spring.', 'fulfilled', 'A. Okafor', 160, 410, '', 'normal'],
      ['Dining', 'H-F', 'Chef’s table, Thursday.', 'fulfilled', 'M. Reyes', 120, 51, 'v6', 'normal'],
      ['Fine art handling', 'H-D', 'Condition report ahead of loan.', 'fulfilled', 'J. Tan', 200, 240, 'v5', 'normal'],
      ['Vendor introduction', 'H-A', 'Marine surveyor introduction.', 'fulfilled', 'A. Okafor', 300, 130, 'v7', 'normal']
    ].map(function (r, i) {
      var created = n - r[5] * H;
      return { id: 'r' + (i + 1), type: r[0], hh: r[1], detail: r[2], status: r[3], assignee: r[4], vendor: r[7], priority: r[8], due: '', createdAt: created, fulfilledAt: r[3] === 'fulfilled' ? created + r[6] * 60e3 : null };
    });
    var log = R.slice(0, 6).map(function (r) { return { id: uid('l'), at: r.createdAt, who: 'Desk', action: 'Request logged', ref: r.id, detail: r.type + ' · ' + r.hh }; });
    return { requests: R, vendors: v, log: log };
  }
  function seedP() {
    var n = Date.now();
    var A = [
      ['R. Alder', 'r.alder@example.com', 'Private call', ['Real estate', 'Fine art'], '$5M – $25M', 'Within 3 months', 'Considering a second residence and a collection to furnish it.', 'consult_booked', 40],
      ['C. Fontaine', 'c.fontaine@example.com', 'In person', ['Real estate'], '$25M +', '3 – 12 months', '', 'contacted', 90],
      ['M. Osei', 'm.osei@example.com', 'Email', ['Aviation', 'Travel'], '$1M – $5M', '3 – 12 months', '', 'new', 20],
      ['T. Lindqvist', 't.lindqvist@example.com', 'Private call', ['Yachts', 'Travel', 'Real estate'], '$5M – $25M', 'Within 3 months', 'Relocating the family office base this year.', 'consult_held', 400],
      ['E. Park', 'e.park@example.com', 'Email', ['Wine & collectibles'], 'Under $1M', 'Exploring', '', 'new', 8],
      ['N. Banerjee', 'n.banerjee@example.com', 'Email', ['Art'], '$1M – $5M', 'Over 12 months', '', 'new', 150]
    ].map(function (r, i) {
      var a = { assets: r[3], scale: r[4], timeline: r[5], channel: r[2], detail: r[6] }, s = score(a), t = tierOf(s);
      return { id: 'p' + (i + 1), name: r[0], contact: r[1], channel: r[2], assets: r[3], scale: r[4], timeline: r[5], detail: r[6], consent: true, score: s, tier: t.tier, routedTo: t.to, status: r[7], createdAt: n - r[8] * H, sample: true };
    });
    return { leads: A, readers: 240, views: { glass: 96, blocks: 71, harbor: 58, wall: 44, arrivals: 33 } };
  }
  var L = function () { return load(KEY.L, seedL); };
  var P = function () { return load(KEY.P, seedP); };
  function commitL() { save(KEY.L, L()); }
  function commitP() { save(KEY.P, P()); }
  function log(action, ref, detail, who) { L().log.unshift({ id: uid('l'), at: Date.now(), who: who || 'Desk', action: action, ref: ref || '', detail: detail || '' }); commitL(); }
  function resetDemo() { try { localStorage.removeItem(KEY.L); localStorage.removeItem(KEY.P); } catch (e) {} mem = {}; location.reload(); }

  /* ---------- scoring & routing ---------- */
  function score(a) {
    var s = 0;
    s += { 'Under $1M': 5, '$1M – $5M': 15, '$5M – $25M': 30, '$25M +': 40 }[a.scale] || 0;
    s += { 'Within 3 months': 30, '3 – 12 months': 20, 'Over 12 months': 8, 'Exploring': 3 }[a.timeline] || 0;
    s += Math.min((a.assets || []).length, 3) * 5;
    s += { 'Private call': 10, 'In person': 10, 'Email': 5 }[a.channel] || 0;
    s += a.detail && a.detail.length > 40 ? 5 : 0;
    return Math.min(100, s);
  }
  function tierOf(s) { for (var i = 0; i < ROUTES.length; i++) if (s >= ROUTES[i].min) return ROUTES[i]; return ROUTES[2]; }
  function looksFinancial(t) { return /account\s*(number|#|no)|routing\s*number|\bssn\b|social security|\b\d{9,}\b|portfolio value|net worth/i.test(t || ''); }

  /* ---------- helpers ---------- */
  function fmtDate(t) { var d = new Date(t); return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) + ' ' + d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' }); }
  function ago(t) { var m = Math.round((Date.now() - t) / 60e3); if (m < 60) return m + ' min ago'; if (m < 1440) return Math.round(m / 60) + ' h ago'; return Math.round(m / 1440) + ' d ago'; }
  function median(a) { if (!a.length) return null; a = a.slice().sort(function (x, y) { return x - y; }); var m = a.length >> 1; return a.length % 2 ? a[m] : (a[m - 1] + a[m]) / 2; }
  function fmtMin(m) { if (m == null) return '—'; if (m < 90) return Math.round(m) + '<i>min</i>'; if (m < 2880) return (m / 60).toFixed(1) + '<i>h</i>'; return (m / 1440).toFixed(1) + '<i>d</i>'; }
  function csvCell(v) { v = String(v == null ? '' : v); if (/^[=+\-@\t\r]/.test(v)) v = "'" + v; return '"' + v.replace(/"/g, '""') + '"'; }
  function download(name, mime, text) {
    var a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([text], { type: mime })); a.download = name;
    document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  }
  function opts(list, sel) { return list.map(function (x) { var v = Array.isArray(x) ? x[0] : x, l = Array.isArray(x) ? x[1] : x; return '<option value="' + esc(v) + '"' + (v === sel ? ' selected' : '') + '>' + esc(l) + '</option>'; }).join(''); }
  function vname(id) { var v = L().vendors.filter(function (x) { return x.id === id; })[0]; return v ? v.name.replace(' (sample)', '') : ''; }
  var since30 = function () { return Date.now() - 30 * D; };

  /* ================= PORTAL (module 1) ================= */
  function initPortal() {
    var form = $('#intake'); if (!form) return;
    var p = P();
    try { if (!sessionStorage.getItem('ak.reader')) { sessionStorage.setItem('ak.reader', '1'); p.readers++; commitP(); } } catch (e) {}
    $$('[data-story]').forEach(function (a) {
      a.addEventListener('click', function (e) {
        e.preventDefault(); var k = a.getAttribute('data-story'); p.views[k] = (p.views[k] || 0) + 1; commitP();
        $('#story-note').textContent = '“' + STORIES[k] + '” — read noted (anonymous, editorial interaction only).';
        $('#story-note').scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      });
    });
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var f = new FormData(form), err = $('#intake-err'); err.textContent = '';
      var a = { assets: f.getAll('assets'), scale: f.get('scale'), timeline: f.get('timeline'), channel: f.get('channel'), detail: String(f.get('detail') || '').trim() };
      var name = String(f.get('name') || '').trim(), contact = String(f.get('contact') || '').trim();
      if (!name || !contact) { err.textContent = 'Please add a name and a way to reach you.'; return; }
      if (!f.get('consent')) { err.textContent = 'Please confirm you would like the team to contact you.'; return; }
      if (!a.assets.length) { err.textContent = 'Choose at least one area of interest.'; return; }
      if (looksFinancial(a.detail + ' ' + name)) { err.textContent = 'For your privacy, please leave out account numbers and financial details. Lifestyle interests only.'; return; }
      var s = score(a), t = tierOf(s);
      p.leads.unshift({ id: uid('p'), name: name.slice(0, 80), contact: contact.slice(0, 120), channel: a.channel, assets: a.assets, scale: a.scale, timeline: a.timeline, detail: a.detail.slice(0, 500), consent: true, score: s, tier: t.tier, routedTo: t.to, status: 'new', createdAt: Date.now() });
      commitP(); log('Inbound inquiry received', '', 'Routed to ' + t.to + ' (tier ' + t.tier + ')', 'Portal');
      form.hidden = true; $('#thanks').hidden = false;
      $('#thanks-detail').textContent = 'Your inquiry has been routed to ' + t.to + '. (Demo: score ' + s + '/100, tier ' + t.tier + ' — ' + t.label + '.)';
    });
  }

  /* ================= DESK (module 2) ================= */
  function initDesk() {
    var root = $('#desk'); if (!root) return;
    var tab = (location.hash || '#queue').slice(1);
    function setTab(t) { tab = t; location.hash = t; render(); }
    window.addEventListener('hashchange', function () { tab = (location.hash || '#queue').slice(1); render(); });
    function render() {
      $$('#tabs a').forEach(function (a) { a.classList.toggle('on', a.getAttribute('href') === '#' + tab); });
      var v = $('#view');
      if (tab === 'vendors') v.innerHTML = vendorsView(); else if (tab === 'audit') v.innerHTML = auditView(); else v.innerHTML = queueView();
      bind();
    }
    function queueView() {
      var d = L();
      var cols = STAT.map(function (s) {
        var items = d.requests.filter(function (r) { return r.status === s[0]; }).sort(function (a, b) { return b.createdAt - a.createdAt; });
        var cards = items.map(function (r) {
          return '<div class="card"><div style="display:flex;gap:6px;flex-wrap:wrap"><span class="chip' + (r.priority === 'high' ? ' urgent' : '') + '">' + esc(r.priority === 'high' ? 'Priority' : r.type) + '</span>' + (r.priority === 'high' ? '<span class="chip">' + esc(r.type) + '</span>' : '') + '</div>' +
            '<div class="t">' + esc(r.detail) + '</div><div class="m">' + esc(r.hh) + ' · ' + esc(ago(r.createdAt)) + (r.vendor ? ' · ' + esc(vname(r.vendor)) : '') + '</div>' +
            '<div class="ctl"><select class="sel" data-rs="' + r.id + '" aria-label="Status">' + opts(STAT, r.status) + '</select><select class="sel" data-ra="' + r.id + '" aria-label="Assignee">' + opts(STAFF, r.assignee) + '</select></div></div>';
        }).join('') || '<div class="m" style="padding:6px 2px">Nothing here.</div>';
        return '<div class="col"><h4>' + s[1] + ' <span>' + items.length + '</span></h4>' + cards + '</div>';
      }).join('');
      var open = d.requests.filter(function (r) { return r.status !== 'fulfilled'; }).length;
      return '<div class="kpis" style="margin-bottom:22px"><div class="kpi"><small>Open</small><div>' + open + '</div></div><div class="kpi"><small>Unassigned</small><div>' + d.requests.filter(function (r) { return r.assignee === 'Unassigned' && r.status !== 'fulfilled'; }).length + '</div></div><div class="kpi"><small>Fulfilled (30d)</small><div>' + d.requests.filter(function (r) { return r.status === 'fulfilled' && r.fulfilledAt > since30(); }).length + '</div></div><div class="kpi"><small>Median fulfilment</small><div>' + fmtMin(median(d.requests.filter(function (r) { return r.fulfilledAt; }).map(function (r) { return (r.fulfilledAt - r.createdAt) / 60e3; }))) + '</div></div></div>' +
        '<details class="newreq"><summary class="btn ghost" style="width:max-content">+ Log a request</summary>' +
        '<form id="newreq" class="inl"><label>Household<select name="hh">' + opts(HOUSEHOLDS) + '</select></label><label>Type<select name="type">' + opts(TYPES) + '</select></label><label>Priority<select name="priority"><option value="normal">Normal</option><option value="high">Priority</option></select></label><label style="grid-column:1/-1">Request<input name="detail" maxlength="200" required placeholder="What does the household need?"></label><label>Preferred vendor<select name="vendor"><option value="">None yet</option>' + d.vendors.map(function (x) { return '<option value="' + x.id + '">' + esc(x.name) + '</option>'; }).join('') + '</select></label><button class="btn" type="submit" style="align-self:end">Log request</button></form></details>' +
        '<div class="board">' + cols + '</div>';
    }
    function vendorsView() {
      var d = L(), cat = root.getAttribute('data-cat') || '';
      var rows = d.vendors.filter(function (x) { return !cat || x.cat === cat; }).map(function (x) {
        return '<tr><td><b>' + esc(x.name) + '</b><div class="m">' + esc(x.cat) + '</div></td><td>' + esc(x.contact) + '<div class="m">' + esc(x.phone) + '</div></td><td>' + esc(x.notes) + '</td><td class="m">Last used ' + esc(ago(x.lastUsed)) + '</td></tr>';
      }).join('');
      return '<div class="ctl" style="margin-bottom:14px;display:flex;gap:10px;flex-wrap:wrap;align-items:center"><select class="sel" id="vcat" aria-label="Filter category"><option value="">All categories</option>' + opts(VCATS, cat) + '</select><span class="m">Internal use only. Visible to desk staff.</span></div>' +
        '<div class="box" style="overflow-x:auto"><table class="vt">' + rows + '</table></div>' +
        '<details class="newreq" style="margin-top:16px"><summary class="btn ghost" style="width:max-content">+ Add a vetted partner</summary><form id="newv" class="inl"><label>Name<input name="name" required maxlength="80"></label><label>Category<select name="cat">' + opts(VCATS) + '</select></label><label>Point of contact<input name="contact" required maxlength="80"></label><label>Phone<input name="phone" maxlength="40"></label><label style="grid-column:1/-1">Historical notes<input name="notes" maxlength="240"></label><button class="btn" type="submit">Save partner</button></form></details>';
    }
    function auditView() {
      var d = L();
      var rows = d.log.slice(0, 200).map(function (x) { return '<tr><td class="m" style="white-space:nowrap">' + esc(fmtDate(x.at)) + '</td><td>' + esc(x.who) + '</td><td><b>' + esc(x.action) + '</b></td><td>' + esc(x.detail) + '</td></tr>'; }).join('');
      return '<div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:14px"><button class="btn" id="csv">Export audit trail (CSV)</button><button class="btn ghost" id="json">Export (JSON)</button><span class="m" style="align-self:center">' + d.log.length + ' entries · lifestyle actions only</span></div><div class="box" style="overflow-x:auto"><table class="vt">' + rows + '</table></div>';
    }
    function bind() {
      $$('[data-rs]').forEach(function (s) { s.onchange = function () {
        var r = L().requests.filter(function (x) { return x.id === s.getAttribute('data-rs'); })[0];
        r.status = s.value; r.fulfilledAt = s.value === 'fulfilled' ? Date.now() : null; commitL(); log('Status → ' + s.value.replace('_', ' '), r.id, r.type + ' · ' + r.hh); render(); }; });
      $$('[data-ra]').forEach(function (s) { s.onchange = function () {
        var r = L().requests.filter(function (x) { return x.id === s.getAttribute('data-ra'); })[0];
        r.assignee = s.value; if (r.status === 'pending' && s.value !== 'Unassigned') r.status = 'assigned'; commitL(); log('Assigned to ' + s.value, r.id, r.type + ' · ' + r.hh); render(); }; });
      var nr = $('#newreq'); if (nr) nr.onsubmit = function (e) {
        e.preventDefault(); var f = new FormData(nr), detail = String(f.get('detail')).trim();
        if (looksFinancial(detail)) { alert('Keep financial details out of the desk. Lifestyle logistics only.'); return; }
        var r = { id: uid('r'), type: f.get('type'), hh: f.get('hh'), detail: detail, status: 'pending', assignee: 'Unassigned', vendor: f.get('vendor'), priority: f.get('priority'), due: '', createdAt: Date.now(), fulfilledAt: null };
        L().requests.unshift(r); commitL(); log('Request logged', r.id, r.type + ' · ' + r.hh); render(); };
      var vc = $('#vcat'); if (vc) vc.onchange = function () { root.setAttribute('data-cat', vc.value); render(); };
      var nv = $('#newv'); if (nv) nv.onsubmit = function (e) {
        e.preventDefault(); var f = new FormData(nv);
        var v = { id: uid('v'), name: String(f.get('name')).trim(), cat: f.get('cat'), contact: String(f.get('contact')).trim(), phone: String(f.get('phone')).trim(), notes: String(f.get('notes')).trim(), lastUsed: Date.now() };
        L().vendors.unshift(v); commitL(); log('Partner added', v.id, v.name + ' · ' + v.cat); render(); };
      var c = $('#csv'); if (c) c.onclick = function () {
        var rows = [['Timestamp', 'Actor', 'Action', 'Reference', 'Detail']].concat(L().log.map(function (x) { return [new Date(x.at).toISOString(), x.who, x.action, x.ref, x.detail]; }));
        download('concierge-audit-trail.csv', 'text/csv', rows.map(function (r) { return r.map(csvCell).join(','); }).join('\r\n')); };
      var j = $('#json'); if (j) j.onclick = function () { download('concierge-audit-trail.json', 'application/json', JSON.stringify(L().log, null, 2)); };
    }
    render();
  }

  /* ================= PIPELINE (module 3) ================= */
  function initBridge() {
    var root = $('#bridge'); if (!root) return;
    function render() {
      var l = L(), p = P(), t0 = since30();
      var reqs = l.requests.filter(function (r) { return r.createdAt > t0; });
      var done = l.requests.filter(function (r) { return r.status === 'fulfilled' && r.fulfilledAt > t0; });
      var leads = p.leads.filter(function (x) { return x.createdAt > t0; });
      var qual = leads.filter(function (x) { return x.tier !== 'C'; }).length;
      var consults = p.leads.filter(function (x) { return x.status === 'consult_booked' || x.status === 'consult_held'; }).length;
      var conv = p.readers ? (consults / p.readers * 100) : 0;
      $('#kpis').innerHTML =
        '<div class="kpi"><small>Requests handled (30d)</small><div>' + done.length + '<i>of ' + reqs.length + '</i></div></div>' +
        '<div class="kpi"><small>Median fulfilment</small><div>' + fmtMin(median(done.map(function (r) { return (r.fulfilledAt - r.createdAt) / 60e3; }))) + '</div></div>' +
        '<div class="kpi"><small>Inbound leads (30d)</small><div>' + leads.length + '<i>' + qual + ' qualified</i></div></div>' +
        '<div class="kpi"><small>Reader → consultation</small><div>' + conv.toFixed(1) + '<i>%</i></div></div>';
      var order = { A: 0, B: 1, C: 2 };
      var rows = p.leads.slice().sort(function (a, b) { return order[a.tier] - order[b.tier] || b.createdAt - a.createdAt; }).map(function (x) {
        return '<tr><td><b>' + esc(x.name) + '</b><div class="m">' + esc(x.channel) + ' · ' + esc(ago(x.createdAt)) + '</div></td><td>' + esc(x.assets.join(', ')) + '<div class="m">' + esc(x.scale) + ' · ' + esc(x.timeline) + '</div></td>' +
          '<td><span class="tier t' + x.tier + '">' + x.tier + '</span> <span class="m">' + x.score + '/100</span></td><td>' + esc(x.routedTo) + '</td><td><select class="sel" data-ls="' + x.id + '" aria-label="Status">' + opts(LEAD_STAT, x.status) + '</select></td></tr>';
      }).join('');
      $('#leads').innerHTML = '<table class="vt"><tr class="thr"><td>Prospect</td><td>Interest</td><td>Tier</td><td>Routed to</td><td>Stage</td></tr>' + rows + '</table>';
      $$('[data-ls]').forEach(function (s) { s.onchange = function () { P().leads.filter(function (x) { return x.id === s.getAttribute('data-ls'); })[0].status = s.value; commitP(); render(); }; });
      function bars(sel, data) {
        var max = Math.max.apply(null, data.map(function (d) { return d[1]; }).concat([1]));
        $(sel).innerHTML = data.map(function (d) { return '<div class="br"><span>' + esc(d[0]) + '</span><i style="--w:' + (d[1] / max * 100) + '%"></i><b>' + d[1] + '</b></div>'; }).join('');
      }
      var byType = {}; reqs.forEach(function (r) { byType[r.type] = (byType[r.type] || 0) + 1; });
      bars('#b-type', Object.keys(byType).map(function (k) { return [k, byType[k]]; }).sort(function (a, b) { return b[1] - a[1]; }));
      bars('#b-story', Object.keys(p.views).map(function (k) { return [STORIES[k] || k, p.views[k]]; }).sort(function (a, b) { return b[1] - a[1]; }));
      var byTier = { A: 0, B: 0, C: 0 }; p.leads.forEach(function (x) { byTier[x.tier]++; });
      bars('#b-tier', ROUTES.map(function (r) { return ['Tier ' + r.tier + ' · ' + r.label, byTier[r.tier]]; }));
      $('#stores').innerHTML =
        '<div><b>Lifestyle store</b><span>' + l.requests.length + ' requests · ' + l.vendors.length + ' partners · ' + l.log.length + ' audit entries</span></div>' +
        '<div><b>Prospect store</b><span>' + p.leads.length + ' consented inquiries · ' + p.readers + ' anonymous readers</span></div>' +
        '<div><b>Financial data</b><span>0 fields accepted · lives only in the firm’s own systems</span></div>';
    }
    var rb = $('#reset'); if (rb) rb.onclick = function () { if (confirm('Reset all demo data in this browser?')) resetDemo(); };
    render();
  }

  /* ================= DECK ================= */
  function initDeck() {
    var deck = $('#deck'); if (!deck) return;
    var s = $$('.slide', deck), i = 0;
    function go(n) { i = Math.max(0, Math.min(s.length - 1, n)); s.forEach(function (el, k) { el.classList.toggle('on', k === i); }); $('#dk-n').textContent = (i + 1) + ' / ' + s.length; $('#dk-p').disabled = i === 0; $('#dk-x').disabled = i === s.length - 1; try { history.replaceState(null, '', '#' + (i + 1)); } catch (e) {} window.scrollTo(0, 0); }
    $('#dk-p').onclick = function () { go(i - 1); }; $('#dk-x').onclick = function () { go(i + 1); };
    document.addEventListener('keydown', function (e) { if (/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName)) return; if (e.key === 'ArrowRight' || e.key === 'PageDown' || e.key === ' ') { e.preventDefault(); go(i + 1); } if (e.key === 'ArrowLeft' || e.key === 'PageUp') go(i - 1); });
    var sx = null; deck.addEventListener('touchstart', function (e) { sx = e.touches[0].clientX; }, { passive: true });
    deck.addEventListener('touchend', function (e) { if (sx == null) return; var dx = e.changedTouches[0].clientX - sx; if (Math.abs(dx) > 60) go(i + (dx < 0 ? 1 : -1)); sx = null; });
    go(parseInt((location.hash || '#1').slice(1), 10) - 1 || 0);
  }

  var resetBtn = $('#reset-global'); if (resetBtn) resetBtn.onclick = function () { if (confirm('Reset all demo data in this browser?')) resetDemo(); };
  initPortal(); initDesk(); initBridge(); initDeck();
})();
