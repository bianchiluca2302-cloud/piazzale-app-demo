// Prototipo Piazzale v2: dati demo + localStorage, nessun backend.
// Il confronto tollerante delle targhe sta in match.js (caricato prima di questo file).
const $ = id => document.getElementById(id);
const SVGNS = 'http://www.w3.org/2000/svg';

function el(tag, cls, testo) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (testo !== undefined) e.textContent = testo;
  return e;
}
function ico(nome) {
  const s = document.createElementNS(SVGNS, 'svg'), u = document.createElementNS(SVGNS, 'use');
  s.setAttribute('class', 'ic'); u.setAttribute('href', '#i-' + nome); s.appendChild(u);
  return s;
}
function targaEl(testo, cls) {
  const t = el('span', 'targa' + (cls ? ' ' + cls : ''));
  t.append(el('i', '', 'I'), el('b', '', testo));
  return t;
}
function bottone(cls, testo, fn, icona) {
  const b = el('button', cls);
  if (icona) b.append(ico(icona));
  b.append(testo); b.onclick = fn;
  return b;
}
const dato = (k, v) => { const d = el('div', 'dato'); d.append(el('span', '', k), el('b', '', v)); return d; };

// ---------- Dati demo (nel prodotto: storico veri e uscite lette dalle mail) ----------
// Le parti (codici e disegno) stanno in sagoma.js, ricostruite dal foglio dei danni dell'azienda
const TIPI = ['Graffio', 'Ammaccatura', 'Rottura', 'Mancante'];
const AUTISTI = [
  { n: 'Rossi Marco', tra: 'FG456HJ' }, { n: 'Esposito Ciro', tra: 'FH902MN' },
  { n: 'Conti Andrea', tra: 'EZ118PQ' }, { n: 'Greco Paolo', tra: 'FJ330RT' },
  { n: 'Ferrari Davide', tra: 'GA221KL' }, { n: 'Romano Luigi', tra: 'FK774VW' }
];
const ATTESE = [
  { rim: 'XB123CD', chi: 'Rossi Marco', rif: 'BL-4471' },
  { rim: 'XC777EF', chi: 'Esposito Ciro', rif: 'BL-4472' },
  { rim: 'XD555GH', chi: 'Conti Andrea', rif: 'BL-4475' },
  { rim: 'XE010IJ', chi: 'Greco Paolo', rif: 'BL-4480' }
];
const DEMO_PIAZZALE = ['XB123CD', 'XC777EF', 'XD555GH', 'XE010IJ', 'XF020KL'];
const RIM_NOTI = ['XA481BN', 'XG302MP', 'XH915QR', 'XL660ST', 'XM142UV', 'XN873WZ', 'XP207AB', ...DEMO_PIAZZALE];

const KEY = 'piazzale-v2';
let S = JSON.parse(localStorage.getItem(KEY) || 'null') || {
  piazzale: DEMO_PIAZZALE.map(rim => ({ rim })), ingressi: [], uscite: [], giro: [], intrusi: []
};
const salva = () => { localStorage.setItem(KEY, JSON.stringify(S)); aggiornaStat(); };

const rimNoti = () => [...new Set([...RIM_NOTI, ...S.piazzale.map(p => p.rim), ...S.ingressi.map(i => i.rim)])].map(p => ({ p }));
const traNoti = () => AUTISTI.map(a => ({ p: a.tra, a }));
const ATT = () => ATTESE.map(a => ({ p: a.rim, a }));
const tutteLeTarghe = () => [...rimNoti(), ...traNoti()];
const uscito = rim => S.uscite.some(u => u.rim === rim);
const haJolly = t => /[?*]/.test(t);

function toast(msg, tipo) {
  const t = $('toast'); t.textContent = msg; t.className = 'toast ' + (tipo || ''); t.hidden = false;
  clearTimeout(toast.t); toast.t = setTimeout(() => t.hidden = true, 1800);
}
function apriSheet(...nodi) { $('sheet-box').replaceChildren(...nodi); $('sheet').hidden = false; }
function chiudiSheet() { $('sheet').hidden = true; }
$('sheet').querySelector('.sheet-bg').onclick = chiudiSheet;

// ---------- Navigazione ----------
const TITOLI = { home: 'Piazzale', ingresso: 'Ingresso', uscita: 'Uscita', giro: 'Giro piazzale', invio: 'Chiudi giornata' };
let vista = 'home';
function vai(v, push = true) {
  chiudiSheet(); vista = v;
  document.querySelectorAll('.vista').forEach(e => e.hidden = e.id !== 'v-' + v);
  $('titolo').textContent = TITOLI[v];
  $('btn-indietro').hidden = v === 'home';
  $('logo').hidden = v !== 'home';
  document.body.dataset.vista = v;
  if (push && v !== 'home') history.pushState({ v }, '');
  ({ home: aggiornaStat, ingresso: iniziaIngresso, uscita: disegnaUscita, giro: disegnaGiro, invio: disegnaInvio })[v]();
  window.scrollTo(0, 0);
}
const tornaHome = () => vista === 'home' ? vai('home', false) : history.back();
document.querySelectorAll('[data-vai]').forEach(b => b.onclick = () => vai(b.dataset.vai));
$('btn-indietro').onclick = tornaHome;
window.addEventListener('popstate', e => {
  // Il tasto indietro di Android chiude prima fotocamera e foglio, poi torna alla home
  if (!$('scan').hidden) { chiudiScan(); history.pushState({ v: vista }, ''); return; }
  if (!$('sheet').hidden) { chiudiSheet(); history.pushState({ v: vista }, ''); return; }
  vai((e.state && e.state.v) || 'home', false);
});

const oggi = ts => ts.slice(0, 10) === new Date().toISOString().slice(0, 10);
function aggiornaStat() {
  const mancano = ATTESE.filter(a => !uscito(a.rim)).length;
  const dafare = S.piazzale.filter(p => !S.giro.includes(p.rim)).length;
  $('st-piazzale').textContent = S.piazzale.length;
  $('st-attese').textContent = mancano;
  $('st-oggi').textContent = [...S.ingressi, ...S.uscite].filter(r => oggi(r.ora)).length;
  $('bd-uscita').textContent = mancano; $('bd-giro').textContent = dafare;
  $('contatore').textContent = S.piazzale.length + ' in piazzale';
}

// ---------- Suggerimenti ----------
function suggerisci(box, q, lista, scegli) {
  box.replaceChildren();
  trova(q, lista).slice(0, 4).filter(r => !(r.s === 0 && norm(q) === norm(r.it.p))).forEach(({ it, s }) => {
    const b = el('button', 'sugg-it');
    b.append(targaEl(it.p), el('small', '', motivo(s) + (it.a ? ' · ' + it.a.n : '')));
    b.onclick = () => scegli(it);
    box.append(b);
  });
}
function stato(box, tipo, testo) { box.className = 'stato ' + tipo; box.textContent = testo; box.hidden = !testo; }

// ---------- Ingresso ----------
let danni = {}, foto = [], dannoScelta = null;
function iniziaIngresso() {
  danni = {}; foto = []; dannoScelta = null;
  ['in-rim', 'in-tra', 'in-aut'].forEach(i => $(i).value = '');
  $('dn-no').classList.remove('on'); $('dn-si').classList.remove('on'); $('blocco-danni').hidden = true;
  document.querySelectorAll('.zona').forEach(z => z.classList.remove('danno'));
  $('foto-prev').replaceChildren(); impostaScheda(false); mostraVista(VISTE[0].id);
  disegnaDanni(); frequenti(); aggiornaRim(); aggiornaTra(); aggiornaCta();
}
const mk = (tag, attrs, cls) => {
  const e = document.createElementNS(SVGNS, tag);
  for (const k in attrs) e.setAttribute(k, attrs[k]);
  if (cls) e.setAttribute('class', cls);
  return e;
};
const area = z => z.f === 'rect' ? z.a.width * z.a.height : z.f === 'circle' ? Math.PI * z.a.r * z.a.r : 1e5;
// Una scheda per vista (lato A, lato B, fronte, retro...). Le zone piu' piccole stanno sopra le grandi.
function costruisciSagome() {
  VISTE.forEach(v => {
    const svg = mk('svg', { viewBox: '0 0 360 150', role: 'img', 'aria-label': v.nome, 'data-v': v.id }, 'sagoma');
    const base = v.tr ? svg.appendChild(mk('g', { transform: v.tr })) : svg;
    const deco = v.specchio ? base.appendChild(mk('g', { transform: 'translate(360 0) scale(-1 1)' })) : base;
    v.deco.forEach(([t, a, c]) => deco.append(mk(t, a, c)));
    [...v.zone].sort((x, y) => area(y) - area(x)).forEach(z => {
      const g = mk('g', { 'data-p': z.p }, 'zona' + (z.c ? ' ' + z.c : '')), t = mk('text', { x: z.cx, y: z.cy + 4 }, z.s ? 'pic' : '');
      t.textContent = z.p; g.append(mk(z.f, z.a), t);
      g.addEventListener('click', () => toccaZona(z.p));
      base.append(g);
    });
    (v.sopra || []).forEach(([t, a, c]) => base.append(mk(t, a, c)));
    $('sagome').append(svg);
    const tab = el('button', 'tab-v', v.nome); tab.dataset.v = v.id; tab.append(el('span', 'bd'));
    tab.onclick = () => mostraVista(v.id);
    $('viste-tab').append(tab);
  });
}
function mostraVista(id) {
  document.querySelectorAll('svg.sagoma').forEach(s => s.toggleAttribute('hidden', s.getAttribute('data-v') !== id));
  document.querySelectorAll('.tab-v').forEach(t => t.classList.toggle('on', t.dataset.v === id));
}
function aggiornaTab() {
  VISTE.forEach(v => {
    const n = new Set(v.zone.map(z => z.p).filter(p => p in danni)).size, b = document.querySelector('.tab-v[data-v="' + v.id + '"] .bd');
    b.textContent = n; b.hidden = !n;
  });
}
// lo stesso codice puo' stare su piu' viste (es. la gamba 21 sul fronte e sul lato A): si colorano tutte
function segnaZona(k) { document.querySelectorAll('.zona[data-p="' + k + '"]').forEach(z => z.classList.toggle('danno', k in danni)); }
function toccaZona(k) {
  if (k in danni) delete danni[k]; else danni[k] = null; // il tipo di danno va scelto a mano: nessun valore predefinito
  segnaZona(k); disegnaDanni(); aggiornaCta();
}
function disegnaDanni() {
  const box = $('lista-danni'); box.replaceChildren();
  for (const k of Object.keys(danni)) {
    const r = el('div', 'danno-riga'), testa = el('div', 'danno-testa'), seg = el('div', 'seg');
    testa.append(el('span', 'cod', k), el('span', 'nome', NOMI[k]), bottone('x', '', () => toccaZona(k), 'x'));
    TIPI.forEach(tp => seg.append(bottone('seg-b' + (danni[k] === tp ? ' on' : ''), tp, () => { danni[k] = tp; disegnaDanni(); aggiornaCta(); })));
    r.append(testa, seg); box.append(r);
  }
}
function scegliDanno(si) {
  dannoScelta = si ? 'si' : 'no';
  $('dn-no').classList.toggle('on', !si); $('dn-si').classList.toggle('on', si);
  $('blocco-danni').hidden = !si;
  if (!si) { Object.keys(danni).forEach(k => { delete danni[k]; segnaZona(k); }); foto = []; $('foto-prev').replaceChildren(); disegnaDanni(); }
  aggiornaCta();
}
$('dn-no').onclick = () => scegliDanno(false);
$('dn-si').onclick = () => scegliDanno(true);

function frequenti() {
  // con un conducente gia' scelto si mostrano comunque tutti, per poterlo cambiare con un tocco
  const scelto = AUTISTI.some(a => a.n === $('in-aut').value);
  const q = scelto ? '' : $('in-aut').value.trim().toLowerCase(), box = $('freq'); box.replaceChildren();
  AUTISTI.filter(a => !q || a.n.toLowerCase().includes(q)).slice(0, 5).forEach(a => {
    const b = el('button', 'chip' + (a.n === $('in-aut').value ? ' on' : ''));
    b.append(a.n, el('small', '', a.tra));
    b.onclick = () => { $('in-aut').value = a.n; $('in-tra').value = a.tra; frequenti(); aggiornaTra(); aggiornaCta(); };
    box.append(b);
  });
}
function aggiornaRim() {
  const q = $('in-rim').value, n = norm(q);
  suggerisci($('sugg-rim'), q, rimNoti(), it => { $('in-rim').value = it.p; aggiornaRim(); aggiornaCta(); });
  if (n.length < 5 || haJolly(q)) return stato($('stato-rim'), '', '');
  if (S.piazzale.some(p => p.rim === n)) stato($('stato-rim'), 'avviso', 'Attenzione: questa targa risulta già in piazzale');
  else if (rimNoti().some(r => r.p === n)) stato($('stato-rim'), 'info', 'Rimorchio già visto in passato');
  else stato($('stato-rim'), 'neutro', 'Targa nuova: controlla bene le lettere');
}
function aggiornaTra() {
  suggerisci($('sugg-tra'), $('in-tra').value, traNoti(), it => {
    $('in-tra').value = it.p; $('in-aut').value = it.a.n; frequenti(); aggiornaTra(); aggiornaCta();
  });
}
function aggiornaCta() {
  const rim = $('in-rim').value, tra = $('in-tra').value;
  let manca = '', neiDanni = false;
  if (!$('in-aut').value.trim()) manca = 'Manca il conducente';
  else if (haJolly(rim) || haJolly(tra)) manca = 'Sostituisci il ? con la lettera giusta';
  else if (norm(tra).length < 5) manca = 'Manca la targa del trattore';
  else if (norm(rim).length < 5) manca = 'Manca la targa del rimorchio';
  else if (!dannoScelta) { manca = 'Indica se ci sono danni (tocca qui)'; neiDanni = true; }
  else if (dannoScelta === 'si' && !Object.keys(danni).length) { manca = 'Tocca sulla sagoma la parte danneggiata'; neiDanni = true; }
  else if (Object.values(danni).some(v => !v)) { manca = 'Scegli il tipo di ogni danno'; neiDanni = true; }
  $('btn-salva-ingresso').disabled = !!manca;
  $('hint-cta').textContent = manca; $('hint-cta').className = 'hint-cta' + (neiDanni ? ' apri' : '');
  statoDanni(); aggiornaTab();
}
// Scheda dei danni: chiusa all'inizio, lo stato resta visibile anche da chiusa
function impostaScheda(aperta) {
  $('scheda-corpo').hidden = !aperta; $('scheda-testa').setAttribute('aria-expanded', String(aperta));
}
function statoDanni() {
  const n = Object.keys(danni).length, s = $('danni-stato');
  if (dannoScelta === 'no') { s.textContent = 'Nessun danno'; s.className = 'scheda-stato ok'; }
  else if (dannoScelta === 'si' && n) { s.textContent = n + (n === 1 ? ' danno' : ' danni'); s.className = 'scheda-stato ko'; }
  else { s.textContent = 'Da indicare'; s.className = 'scheda-stato avv'; }
}
$('scheda-testa').onclick = () => impostaScheda($('scheda-corpo').hidden);
$('hint-cta').onclick = () => {
  if (!$('hint-cta').classList.contains('apri')) return;
  impostaScheda(true); $('scheda-testa').scrollIntoView({ behavior: 'smooth', block: 'start' });
};
$('in-rim').oninput = () => { aggiornaRim(); aggiornaCta(); };
$('in-tra').oninput = () => { aggiornaTra(); aggiornaCta(); };
$('in-aut').oninput = () => { frequenti(); aggiornaCta(); };

async function riduci(file, max = 1280) {
  const b = await createImageBitmap(file), k = Math.min(1, max / Math.max(b.width, b.height));
  const c = el('canvas'); c.width = Math.round(b.width * k); c.height = Math.round(b.height * k);
  c.getContext('2d').drawImage(b, 0, 0, c.width, c.height);
  return c.toDataURL('image/jpeg', 0.7);
}
$('btn-foto').onclick = () => $('file-foto').click();
$('file-foto').onchange = async e => {
  const f = e.target.files[0]; e.target.value = ''; if (!f) return;
  try {
    const url = await riduci(f); foto.push(url);
    const im = el('img'); im.src = url; im.alt = 'Foto del danno'; $('foto-prev').append(im);
  } catch (err) { toast('Foto non letta, riprova', 'ko'); }
};
$('btn-salva-ingresso').onclick = () => {
  const rim = norm($('in-rim').value);
  S.ingressi.push({ rim, tra: norm($('in-tra').value), aut: $('in-aut').value.trim(), danni: { ...danni }, nfoto: foto.length, ora: new Date().toISOString() });
  S.piazzale = S.piazzale.filter(p => p.rim !== rim).concat({ rim });
  salva(); toast('Ingresso registrato: ' + rim, 'ok'); tornaHome();
};

// ---------- Uscita ----------
function disegnaUscita() { $('ex-cerca').value = ''; filtraUscita(); }
function filtraUscita() {
  const q = $('ex-cerca').value, lista = $('attese'), es = $('ex-esito');
  lista.replaceChildren(); es.replaceChildren();
  let righe = ATT().map(it => ({ it, s: 0 }));
  if (normJolly(q).length >= 2) righe = trova(q, ATT());
  righe.sort((x, y) => uscito(x.it.p) - uscito(y.it.p) || x.s - y.s);
  $('ex-cont').textContent = ATTESE.filter(a => !uscito(a.rim)).length + ' da fare';
  righe.forEach(({ it, s }) => {
    const b = el('button', 'card att' + (uscito(it.p) ? ' fatta' : '')), d = el('div', 'dett');
    d.append(el('b', '', it.a.chi), el('small', '', 'Rif. ' + it.a.rif + (normJolly(q).length >= 2 && s ? ' · ' + motivo(s) : '')));
    b.append(targaEl(it.p), d, uscito(it.p) ? el('span', 'tag', 'Uscito') : ico('next'));
    b.onclick = () => { if (!uscito(it.p)) apriUscita(it.a); };
    lista.append(b);
  });
  if (normJolly(q).length >= 3 && !righe.length) {
    const ban = el('div', 'banner rosso', '✖ NON AUTORIZZATO');
    ban.append(el('small', '', 'Nessuna uscita prevista per «' + normJolly(q) + '»' + (trova(q, S.piazzale.map(p => ({ p: p.rim }))).length ? ' (è in piazzale, ma non tra le uscite di oggi)' : '')));
    es.append(ban);
  }
}
$('ex-cerca').oninput = filtraUscita;
function apriUscita(att) {
  apriSheet(
    el('div', 'sheet-tit', 'Controlla i documenti'), targaEl(att.rim, 'grande'),
    dato('Ritira', att.chi), dato('Riferimento', att.rif),
    bottone('cta verde', 'Conferma uscita', () => confermaUscita(att, att.chi, ''), 'check'),
    bottone('cta-sec', 'Si presenta un altro conducente', () => apriDiverso(att)),
    bottone('cta-sec', 'Annulla', chiudiSheet));
}
function apriDiverso(att) {
  const ban = el('div', 'banner arancio', '⚠ Conducente diverso'); ban.append(el('small', '', 'Atteso: ' + att.chi + ' · rif. ' + att.rif));
  const inp = el('input', 'inp'); inp.placeholder = 'Cognome Nome di chi si presenta';
  const ok = bottone('cta arancio', 'Conferma uscita con conducente diverso', () => confermaUscita(att, inp.value.trim(), 'conducente diverso'), 'warn');
  ok.disabled = true; inp.oninput = () => ok.disabled = !inp.value.trim();
  const ch = el('div', 'chips');
  AUTISTI.forEach(a => ch.append(bottone('chip', a.n, () => { inp.value = a.n; ok.disabled = false; })));
  apriSheet(ban, el('div', 'sheet-tit', 'Chi si presenta?'), ch, inp, ok, bottone('cta-sec', 'Indietro', () => apriUscita(att)));
}
function confermaUscita(att, chi, flag) {
  S.uscite.push({ rim: att.rim, chi, atteso: att.chi, flag, ora: new Date().toISOString() });
  S.piazzale = S.piazzale.filter(p => p.rim !== att.rim);
  salva(); chiudiSheet(); toast('Uscita registrata: ' + att.rim + (flag ? ' (conducente diverso)' : ''), 'ok');
  $('ex-cerca').value = ''; filtraUscita();
}

// ---------- Giro piazzale ----------
function disegnaGiro() { $('gi-cerca').value = ''; filtraGiro(); }
function filtraGiro() {
  const q = $('gi-cerca').value, visti = new Set(S.giro), tutte = S.piazzale.map(p => ({ p: p.rim }));
  const fatti = tutte.filter(t => visti.has(t.p)).length;
  $('gi-testo').textContent = fatti + ' di ' + tutte.length + ' controllati';
  $('gi-mancano').textContent = tutte.length - fatti ? 'Mancano ' + (tutte.length - fatti) : 'Tutto ok';
  $('gi-barra').style.width = (tutte.length ? fatti / tutte.length * 100 : 0) + '%';

  let righe = tutte.map(it => ({ it, s: 0 }));
  const cerca = normJolly(q).length >= 2;
  if (cerca) righe = trova(q, tutte);
  righe.sort((x, y) => visti.has(x.it.p) - visti.has(y.it.p) || x.s - y.s);

  const az = $('gi-azione'); az.replaceChildren();
  if (cerca && righe.length === 1 && !visti.has(righe[0].it.p))
    az.append(bottone('cta blu', 'Spunta ' + righe[0].it.p, () => spuntaGiro(righe[0].it.p), 'check'));
  if (normJolly(q).length >= 3 && !righe.length && !haJolly(q))
    az.append(el('div', 'banner rosso', 'Non in lista'), bottone('cta-sec', 'Segna ' + norm(q) + ' come presente non prevista', () => {
      const n = norm(q); if (!S.intrusi.includes(n)) S.intrusi.push(n);
      salva(); $('gi-cerca').value = ''; filtraGiro(); toast('Segnata: ' + n, 'ko');
    }, 'warn'));

  const lista = $('giro-lista'); lista.replaceChildren();
  righe.forEach(({ it }) => {
    const b = el('button', 'card att' + (visti.has(it.p) ? ' ok' : ''));
    const sp = el('span', 'spunta'); if (visti.has(it.p)) sp.append(ico('check'));
    b.append(targaEl(it.p), el('div', 'dett'), sp);
    b.onclick = () => spuntaGiro(it.p);
    lista.append(b);
  });

  const intr = $('giro-intrusi'); intr.replaceChildren();
  if (S.intrusi.length) {
    intr.append(el('div', 'titolo-sez', 'Presenti ma non in lista'));
    S.intrusi.forEach(t => {
      const b = el('div', 'card att intruso'); b.append(targaEl(t), el('div', 'dett'), bottone('x', '', () => { S.intrusi = S.intrusi.filter(x => x !== t); salva(); filtraGiro(); }, 'x'));
      intr.append(b);
    });
  }
}
function spuntaGiro(rim) {
  S.giro = S.giro.includes(rim) ? S.giro.filter(x => x !== rim) : S.giro.concat(rim);
  salva(); $('gi-cerca').value = ''; filtraGiro();
}
$('gi-cerca').oninput = filtraGiro;
$('gi-cerca').onkeydown = e => {
  if (e.key !== 'Enter') return;
  const r = trova($('gi-cerca').value, S.piazzale.map(p => ({ p: p.rim })));
  if (r.length === 1 && !S.giro.includes(r[0].it.p)) spuntaGiro(r[0].it.p);
};

// ---------- Chiudi giornata ----------
function disegnaInvio() {
  const fatti = S.piazzale.filter(p => S.giro.includes(p.rim)).length;
  const box = $('riepilogo'); box.replaceChildren(
    dato('Ingressi', S.ingressi.length),
    dato('Danni segnalati', S.ingressi.reduce((n, i) => n + Object.keys(i.danni).length, 0)),
    dato('Uscite', S.uscite.length),
    dato('Conducenti diversi dall\'atteso', S.uscite.filter(u => u.flag).length),
    dato('Targhe controllate nel giro', fatti + ' di ' + S.piazzale.length),
    dato('Presenti non in lista', S.intrusi.length));
  $('esito-invio').textContent = '';
  $('btn-reset').textContent = 'Azzera i dati demo';
}
$('btn-invia').onclick = () => {
  const righe = ['tipo;targa_rimorchio;targa_trattore;persona;danni;nota;ora']
    .concat(S.ingressi.map(i => ['INGRESSO', i.rim, i.tra, i.aut, Object.entries(i.danni).map(([k, v]) => k + ':' + v).join('|'), i.nfoto + ' foto', i.ora].join(';')))
    .concat(S.uscite.map(u => ['USCITA', u.rim, '', u.chi, '', u.flag, u.ora].join(';')))
    .concat(S.intrusi.map(t => ['NON_IN_LISTA', t, '', '', '', '', ''].join(';')));
  const a = el('a'); a.href = URL.createObjectURL(new Blob(['﻿' + righe.join('\n')], { type: 'text/csv' }));
  a.download = 'report_' + new Date().toISOString().slice(0, 10) + '.csv'; a.click();
  $('esito-invio').textContent = 'Nel prodotto vero questo parte da solo verso il sistema del cliente. Qui scarica un CSV.';
};
$('btn-reset').onclick = () => {
  if ($('btn-reset').textContent === 'Azzera i dati demo') {
    $('btn-reset').textContent = 'Tocca ancora per confermare';
    return setTimeout(() => $('btn-reset').textContent = 'Azzera i dati demo', 3000);
  }
  localStorage.removeItem(KEY); location.replace(location.pathname);
};

// ---------- Tasti "?" ----------
document.querySelectorAll('[data-jolly]').forEach(b => b.onclick = () => {
  const i = $(b.dataset.jolly), p = i.selectionStart == null ? i.value.length : i.selectionStart;
  i.setRangeText('?', p, i.selectionEnd == null ? p : i.selectionEnd, 'end');
  i.dispatchEvent(new Event('input')); i.focus();
});

// ---------- Lettura targa con la fotocamera ----------
// Raffica di scatti, si tiene il piu' nitido, contrasto esteso, poi OCR (Tesseract.js, serve rete la prima volta).
// Il testo letto va nel campo e il confronto con gli elenchi propone le targhe note: la persona conferma con un tocco.
let stream = null, campoScan = null, worker = null, torciaOn = false;
const attesa = ms => new Promise(r => setTimeout(r, ms));
const msgScan = t => $('scan-msg').textContent = t;
document.querySelectorAll('[data-scan]').forEach(b => b.onclick = () => apriScan(b.dataset.scan));

async function apriScan(campo) {
  campoScan = campo; $('scan').hidden = false; torciaOn = false; $('btn-scatta').disabled = false;
  msgScan('Inquadra la targa nel riquadro');
  try {
    stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' }, width: { ideal: 1920 }, height: { ideal: 1080 } } });
    $('video').srcObject = stream;
    const tr = stream.getVideoTracks()[0], cap = tr.getCapabilities ? tr.getCapabilities() : {};
    $('btn-torcia').hidden = !cap.torch;
    if (cap.focusMode && cap.focusMode.includes('continuous')) tr.applyConstraints({ advanced: [{ focusMode: 'continuous' }] }).catch(() => {});
  } catch (e) { msgScan('Fotocamera non disponibile (serve HTTPS). Scrivi la targa o le ultime cifre.'); }
}
function chiudiScan() {
  if (stream) stream.getTracks().forEach(t => t.stop());
  stream = null; $('scan').hidden = true;
}
$('btn-chiudi-scan').onclick = chiudiScan;
$('btn-torcia').onclick = () => {
  torciaOn = !torciaOn;
  stream.getVideoTracks()[0].applyConstraints({ advanced: [{ torch: torciaOn }] }).catch(() => msgScan('Torcia non disponibile'));
};

function ritaglia(v) {
  // il riquadro e' a schermo; il video e' ritagliato "cover": si riporta il riquadro sulle coordinate vere del video
  const r = v.getBoundingClientRect(), m = document.querySelector('.mirino').getBoundingClientRect();
  const k = Math.max(r.width / v.videoWidth, r.height / v.videoHeight);
  const ox = (v.videoWidth * k - r.width) / 2, oy = (v.videoHeight * k - r.height) / 2;
  const sx = (m.left - r.left + ox) / k, sy = (m.top - r.top + oy) / k, sw = m.width / k, sh = m.height / k;
  const c = el('canvas'); c.width = Math.round(sw); c.height = Math.round(sh);
  c.getContext('2d').drawImage(v, sx, sy, sw, sh, 0, 0, c.width, c.height);
  return c;
}
function elabora(c) {
  // scala di grigi con contrasto esteso tra il 2% e il 98%; restituisce la nitidezza (gradiente medio)
  const ctx = c.getContext('2d'), d = ctx.getImageData(0, 0, c.width, c.height), p = d.data, w = c.width, n = w * c.height;
  const g = new Uint8ClampedArray(n), hist = new Uint32Array(256);
  for (let i = 0, j = 0; j < n; i += 4, j++) { const y = (p[i] * 299 + p[i + 1] * 587 + p[i + 2] * 114) / 1000 | 0; g[j] = y; hist[y]++; }
  let lo = 0, hi = 255, acc = 0;
  while (lo < 255 && (acc += hist[lo]) < n * 0.02) lo++;
  acc = 0; while (hi > 0 && (acc += hist[hi]) < n * 0.02) hi--;
  const k = 255 / Math.max(1, hi - lo);
  for (let j = 0; j < n; j++) g[j] = (g[j] - lo) * k;
  let nit = 0, cnt = 0;
  for (let y = 1; y < c.height - 1; y += 2) for (let x = 1; x < w - 1; x += 2) {
    const i = y * w + x; nit += Math.abs(g[i + 1] - g[i - 1]) + Math.abs(g[i + w] - g[i - w]); cnt++;
  }
  for (let j = 0, i = 0; j < n; j++, i += 4) p[i] = p[i + 1] = p[i + 2] = g[j];
  ctx.putImageData(d, 0, 0);
  return cnt ? nit / cnt : 0;
}
async function leggi(canvas) {
  if (!worker) {
    if (!window.Tesseract) await new Promise((ok, ko) => {
      const s = el('script'); s.src = 'https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js'; s.onload = ok; s.onerror = ko; document.head.append(s);
    });
    worker = await Tesseract.createWorker('eng');
    await worker.setParameters({ tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789', tessedit_pageseg_mode: '7' });
  }
  return norm((await worker.recognize(canvas)).data.text);
}
$('btn-scatta').onclick = async () => {
  const v = $('video'); if (!v.videoWidth) return;
  $('btn-scatta').disabled = true;
  try {
    const scatti = [];
    for (let i = 1; i <= 5; i++) { msgScan('Tieni fermo… ' + i + '/5'); const c = ritaglia(v); scatti.push({ c, nit: elabora(c) }); await attesa(120); }
    scatti.sort((a, b) => b.nit - a.nit);
    msgScan('Leggo la targa…');
    const noti = tutteLeTarghe(); let best = null;
    for (const { c } of scatti.slice(0, 2)) {
      const t = await leggi(c), m = trova(t, noti)[0], punti = m ? m.s : 9;
      if (t.length >= 3 && (!best || punti < best.punti || (punti === best.punti && t.length > best.t.length))) best = { t, punti };
    }
    if (!best) { msgScan('Non riesco a leggerla: avvicinati, accendi la torcia e riprova, oppure scrivi le ultime cifre.'); $('btn-scatta').disabled = false; return; }
    $(campoScan).value = best.t; $(campoScan).dispatchEvent(new Event('input'));
    chiudiScan();
  } catch (e) {
    msgScan('Lettura automatica non disponibile (serve rete la prima volta). Scrivi le ultime cifre.'); $('btn-scatta').disabled = false;
  }
};

// ---------- Avvio ----------
costruisciSagome();
history.replaceState({ v: 'home' }, '');
const iniz = location.hash.slice(1);
vai('home', false);
if (TITOLI[iniz] && iniz !== 'home') vai(iniz);
if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
