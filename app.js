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
// Ritiri per ditta: l'azienda delega una lista di conducenti valida per tutti i suoi rimorchi, senza data ne' conducente unico
const DITTE = [
  { n: 'Autotrasporti Ferrari', rif: 'BL-4490', conducenti: ['Ferrari Davide', 'Marino Gianni', 'Costa Elia'], rim: ['XF020KL', 'XG302MP'] },
  { n: 'Trasporti Bruni', rif: 'BL-4491', conducenti: ['Bruni Carlo', 'Neri Paolo'], rim: ['XH915QR'] }
];
const dittaDi = rim => DITTE.find(d => d.rim.includes(rim)) || null;
// Arrivi dal porto: nel prodotto verrebbero dall'agenzia marittima o dal terminal (fonte da definire)
const NAVI = [
  { nave: 'Nave demo Livorno 1', eta: '09:30', rim: 'XQ100AA', chi: 'Rossi Marco' },
  { nave: 'Nave demo Livorno 1', eta: '09:30', rim: 'XQ101BB', chi: 'Greco Paolo' },
  { nave: 'Nave demo Livorno 1', eta: '09:30', rim: 'XQ102CC', chi: '' },
  { nave: 'Nave demo Livorno 2', eta: '15:00', rim: 'XR200DD', chi: 'Conti Andrea' },
  { nave: 'Nave demo Livorno 2', eta: '15:00', rim: 'XR201EE', chi: '' }
];
const DEMO_PIAZZALE = ['XB123CD', 'XC777EF', 'XD555GH', 'XE010IJ', 'XF020KL', 'XG302MP', 'XH915QR'];
const RIM_NOTI = ['XA481BN', 'XG302MP', 'XH915QR', 'XL660ST', 'XM142UV', 'XN873WZ', 'XP207AB', ...DEMO_PIAZZALE];

const KEY = 'piazzale-v2';
let sede = localStorage.getItem('piazzale-sede') || 'LDV'; // piazzale su cui si lavora: per ora solo un'etichetta, i dati demo sono gli stessi
let S = JSON.parse(localStorage.getItem(KEY) || 'null') || {
  piazzale: DEMO_PIAZZALE.map(rim => ({ rim })), ingressi: [], uscite: [], giro: [], intrusi: []
};
const salva = () => { let ok = true; try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { ok = false; } aggiornaStat(); return ok; };

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
const TITOLI = { piazzale: 'Scegli il piazzale', home: 'Piazzale', ingresso: 'Ingresso', uscita: 'Uscita', giro: 'Giro piazzale', invio: 'Chiudi giornata', rimorchi: 'Rimorchi in piazzale' };
let vista = 'home';
function vai(v, push = true) {
  chiudiSheet(); vista = v;
  document.querySelectorAll('.vista').forEach(e => e.hidden = e.id !== 'v-' + v);
  $('titolo').textContent = TITOLI[v];
  $('btn-indietro').hidden = v === 'home' || v === 'piazzale';
  $('logo').hidden = v !== 'home' && v !== 'piazzale';
  $('contatore').hidden = v === 'piazzale';
  document.body.dataset.vista = v;
  if (push && v !== 'home') history.pushState({ v }, '');
  ({ piazzale() {}, home: aggiornaStat, ingresso: iniziaIngresso, uscita: disegnaUscita, giro: disegnaGiro, invio: disegnaInvio, rimorchi: disegnaRimorchi })[v]();
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
  $('bd-rim').textContent = S.piazzale.length; $('bd-uscita').textContent = mancano; $('bd-giro').textContent = dafare;
  $('contatore').textContent = S.piazzale.length + ' in piazzale'; $('sede-nome').textContent = sede;
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
let danni = {}, foto = { l: null, v: null }, dannoScelta = null;
function iniziaIngresso() {
  danni = {}; foto = { l: null, v: null }; dannoScelta = null; ril = null;
  ['in-rim', 'in-tra', 'in-aut'].forEach(i => $(i).value = '');
  $('dn-no').classList.remove('on'); $('dn-si').classList.remove('on'); $('blocco-danni').hidden = true;
  document.querySelectorAll('.zona').forEach(z => z.classList.remove('danno'));
  disegnaSlot(); $('foto-esito').replaceChildren(); impostaScheda(false); mostraVista(VISTE[0].id);
  disegnaDanni(); frequenti(); aggiornaRim(); aggiornaTra(); aggiornaCta(); disegnaNavi();
}
const arrivato = rim => S.ingressi.some(i => i.rim === rim);
function disegnaNavi() {
  const box = $('navi'); box.replaceChildren();
  $('nv-cont').textContent = NAVI.filter(n => !arrivato(n.rim)).length + ' da registrare';
  let ultima = '';
  NAVI.forEach(n => {
    if (n.nave + n.eta !== ultima) { ultima = n.nave + n.eta; box.append(el('div', 'aiuto', n.nave + ' · arrivo ' + n.eta)); }
    const fatto = arrivato(n.rim), b = el('button', 'card att' + (fatto ? ' fatta' : '')), d = el('div', 'dett');
    d.append(el('b', '', n.chi || 'Conducente da indicare'));
    b.append(targaEl(n.rim), d, fatto ? el('span', 'tag', 'Arrivato') : ico('next'));
    b.onclick = () => {
      if (fatto) return;
      $('in-rim').value = n.rim; $('in-aut').value = n.chi || '';
      const a = AUTISTI.find(x => x.n === n.chi); $('in-tra').value = a ? a.tra : '';
      frequenti(); aggiornaRim(); aggiornaTra(); aggiornaCta(); window.scrollTo({ top: $('in-aut').offsetTop - 60, behavior: 'smooth' });
    };
    box.append(b);
  });
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
  if (!si) { Object.keys(danni).forEach(k => { delete danni[k]; segnaZona(k); }); disegnaDanni(); }
  aggiornaCta();
}
// Foto del mezzo: una da lontano e una da vicino. Il riconoscimento di parte e tipo e' SIMULATO (nessun modello vero):
// il risultato dipende dalla foto scattata, ma e' solo per mostrare l'idea. L'operatore conferma sempre.
const RIL_DEMO = [
  { k: '15', t: 'Rottura', x: .42, y: .30, nota: 'telo tagliato' },
  { k: '12', t: 'Ammaccatura', x: .74, y: .38, nota: 'lamiera deformata' },
  { k: '45', t: 'Graffio', x: .38, y: .45, nota: 'segni sulla fiancata' },
  { k: '32', t: 'Rottura', x: .30, y: .42, nota: 'porta danneggiata' },
  { k: '26', t: 'Mancante', x: .30, y: .76, nota: 'parafango mancante' },
  null
];
let ril = null;
function disegnaSlot() {
  [['l', 'fs-l', 'Foto lontano'], ['v', 'fs-v', 'Foto vicino']].forEach(([w, id, nome]) => {
    const b = $(id), u = foto[w];
    b.className = 'foto-slot' + (u ? ' piena' : '');
    b.style.backgroundImage = u ? 'url(' + u + ')' : '';
    b.replaceChildren(...(u ? [el('small', 'fs-et', nome)] : [ico('cam'), el('strong', '', nome)]));
  });
}
const impronta = u => { let h = 0; for (let i = 0; i < u.length; i += 97) h = (h * 31 + u.charCodeAt(i)) >>> 0; return h; };
function analizza() {
  const box = $('foto-esito'); box.replaceChildren();
  if (!foto.l || !foto.v) { ril = null; return; }
  box.append(el('p', 'foto-att', 'Riconoscimento in corso…'));
  const tok = foto.l + foto.v.length;
  setTimeout(() => {
    if (foto.l + foto.v.length !== tok) return;
    const r = RIL_DEMO[(impronta(foto.l) + impronta(foto.v)) % RIL_DEMO.length];
    ril = r; mostraEsito(r);
  }, 900);
}
const azioni = (...bt) => { const d = el('div', 'varco-az'); d.append(...bt); return d; };
function mostraEsito(r) {
  const box = $('foto-esito'); box.replaceChildren();
  const c = el('div', 'varco-card ' + (r ? 'ko' : 'ok')), im = el('div', 'foto-ril');
  im.style.backgroundImage = 'url(' + foto.l + ')';
  if (r) { const q = el('span', 'ril-box'); q.style.left = (r.x * 100 - 14) + '%'; q.style.top = (r.y * 100 - 14) + '%'; im.append(q); }
  c.append(im);
  if (!r) {
    c.append(el('p', 'varco-tit', 'Nessun problema riconosciuto'),
      azioni(bottone('varco-b ok', 'Confermo: nessun danno', () => { scegliDanno(false); box.replaceChildren(el('p', 'varco-fatto', 'Confermato: nessun danno')); })));
  } else {
    c.append(el('p', 'varco-tit', 'Riconosciuto: ' + r.t + ' · ' + NOMI[r.k]), el('p', 'varco-sub', 'Zona ' + r.k + ' · ' + r.nota + ' (riconoscimento simulato)'),
      azioni(
        bottone('varco-b ko', 'Confermo', () => {
          scegliDanno(true); if (!(r.k in danni)) toccaZona(r.k);
          danni[r.k] = r.t; disegnaDanni(); aggiornaCta();
          const v = VISTE.find(x => x.zone.some(z => z.p === r.k)); if (v) mostraVista(v.id);
          box.replaceChildren(el('p', 'varco-fatto', 'Danno segnato: ' + r.t + ' · zona ' + r.k + '. Puoi correggerlo sulla sagoma qui sotto.'));
        }),
        bottone('varco-b', 'Non è un danno', () => { scegliDanno(false); box.replaceChildren(el('p', 'varco-fatto', 'Nessun danno')); })));
  }
  box.append(c);
}
[['l', 'fs-l', 'file-l'], ['v', 'fs-v', 'file-v']].forEach(([w, bt, fi]) => {
  $(bt).onclick = () => $(fi).click();
  $(fi).onchange = async e => {
    const f = e.target.files[0]; e.target.value = ''; if (!f) return;
    try { foto[w] = await riduci(f); disegnaSlot(); analizza(); } catch (err) { toast('Foto non letta, riprova', 'ko'); }
  };
});
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
$('btn-salva-ingresso').onclick = () => {
  const rim = norm($('in-rim').value);
  S.ingressi.push({ rim, tra: norm($('in-tra').value), aut: $('in-aut').value.trim(), danni: { ...danni }, foto: { ...foto }, nfoto: (foto.l ? 1 : 0) + (foto.v ? 1 : 0), ora: new Date().toISOString() });
  S.piazzale = S.piazzale.filter(p => p.rim !== rim).concat({ rim });
  if (!salva()) { S.ingressi[S.ingressi.length - 1].foto = null; salva(); toast('Memoria piena: foto non salvate', 'ko'); }
  else toast('Ingresso registrato: ' + rim, 'ok');
  tornaHome();
};

// ---------- Uscita ----------
function disegnaUscita() { $('ex-cerca').value = ''; filtraUscita(); }
function filtraUscita() {
  const q = $('ex-cerca').value, lista = $('attese'), es = $('ex-esito'), dl = $('ditte');
  lista.replaceChildren(); es.replaceChildren(); dl.replaceChildren();
  const filtra = normJolly(q).length >= 2;
  let righe = ATT().map(it => ({ it, s: 0 }));
  if (filtra) righe = trova(q, ATT());
  righe.sort((x, y) => uscito(x.it.p) - uscito(y.it.p) || x.s - y.s);
  $('ex-cont').textContent = ATTESE.filter(a => !uscito(a.rim)).length + ' da fare';
  righe.forEach(({ it, s }) => {
    const b = el('button', 'card att' + (uscito(it.p) ? ' fatta' : '')), d = el('div', 'dett');
    d.append(el('b', '', it.a.chi), el('small', '', 'Rif. ' + it.a.rif + (filtra && s ? ' · ' + motivo(s) : '')));
    b.append(targaEl(it.p), d, uscito(it.p) ? el('span', 'tag', 'Uscito') : ico('next'));
    b.onclick = () => { if (!uscito(it.p)) apriUscita(it.a); };
    lista.append(b);
  });
  // Ritiro per ditta: l'operatore riconosce la ditta (dal telo o dalla scritta sul rimorchio) e la sceglie.
  // Se la targa e' nelle liste delle ditte, la ricerca porta dritti alla ditta giusta.
  const dit = S.piazzale.filter(p => dittaDi(p.rim) && !ATTESE.some(a => a.rim === p.rim)).map(p => ({ p: p.rim, d: dittaDi(p.rim) }));
  const rd = filtra ? trova(q, dit) : [];
  $('dt-cont').textContent = DITTE.length + ' ditte';
  if (filtra) rd.forEach(({ it, s }) => {
    const b = el('button', 'card att'), d = el('div', 'dett');
    d.append(el('b', '', it.d.n), el('small', '', 'Rif. ' + it.d.rif + (s ? ' · ' + motivo(s) : '')));
    b.append(targaEl(it.p), d, ico('next'));
    b.onclick = () => apriDitta(it.d, it.p);
    dl.append(b);
  }); else DITTE.forEach(dt => {
    const b = el('button', 'card att ditta'), d = el('div', 'dett');
    d.append(el('b', '', dt.n), el('small', '', dt.conducenti.length + ' conducenti delegati'));
    b.append(ico('truck'), d, ico('next'));
    b.onclick = () => apriDitta(dt);
    dl.append(b);
  });
  if (normJolly(q).length >= 3 && !righe.length && !rd.length) {
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
// Ritiro per ditta: ditta scelta dall'operatore, poi targa del rimorchio (in piazzale) e conducente tra i delegati.
// Chi non e' in lista, o un rimorchio che nelle liste risulta di un'altra ditta, esce segnalato.
function apriDitta(d, rim0 = '') {
  let chi = '', fuori = false;
  const nota = el('div'), inp = el('input', 'inp'), sug = el('div', 'sugg'), drv = el('div', 'chips'), altro = el('input', 'inp');
  inp.placeholder = 'Targa del rimorchio'; inp.autocapitalize = 'characters'; inp.value = rim0;
  altro.placeholder = 'Cognome Nome di chi si presenta'; altro.hidden = true;
  const ok = bottone('cta verde', 'Conferma uscita', () => {
    const rim = norm(inp.value), a = dittaDi(rim), fl = [];
    if (fuori) fl.push('conducente non in lista');
    if (a && a !== d) fl.push('rimorchio di ' + a.n);
    confermaUscita({ rim, chi: d.n + ' (delega)', rif: d.rif }, fuori ? altro.value.trim() : chi, fl.join(' · '));
  }, 'check');
  const agg = () => {
    const rim = norm(inp.value), inP = S.piazzale.some(p => p.rim === rim), a = dittaDi(rim);
    nota.replaceChildren();
    if (rim.length >= 5 && !inP) nota.append(el('div', 'banner rosso', '✖ Questo rimorchio non risulta in piazzale'));
    else if (inP && a && a !== d) nota.append(el('div', 'banner arancio', '⚠ Nelle liste questo rimorchio risulta di ' + a.n));
    ok.disabled = !(inP && (fuori ? altro.value.trim() : chi));
    ok.className = 'cta ' + ((fuori || (a && a !== d)) ? 'arancio' : 'verde');
  };
  const chips = el('div', 'chips');
  d.rim.filter(r => S.piazzale.some(p => p.rim === r)).forEach(r => chips.append(bottone('chip', r, () => { inp.value = r; sug.replaceChildren(); agg(); })));
  inp.oninput = () => { suggerisci(sug, inp.value, S.piazzale.map(p => ({ p: p.rim })), it => { inp.value = it.p; sug.replaceChildren(); agg(); }); agg(); };
  const scegli = (c, nome) => { chi = nome; fuori = false; altro.hidden = true; drv.querySelectorAll('.chip').forEach(x => x.classList.toggle('on', x === c)); agg(); };
  d.conducenti.forEach(n => { const c = bottone('chip', n, () => scegli(c, n)); drv.append(c); });
  const cAltro = bottone('chip', 'Altro conducente', () => { chi = ''; fuori = true; altro.hidden = false; altro.focus(); drv.querySelectorAll('.chip').forEach(x => x.classList.toggle('on', x === cAltro)); agg(); });
  drv.append(cAltro); altro.oninput = agg;
  apriSheet(el('div', 'sheet-tit', d.n), dato('Riferimento', d.rif), el('div', 'sheet-sez', 'Rimorchio'), ...(chips.children.length ? [chips] : []), inp, sug, nota,
    el('div', 'sheet-sez', 'Chi si presenta?'), drv, altro, ok, bottone('cta-sec', 'Annulla', chiudiSheet));
  agg();
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
  salva(); chiudiSheet(); toast('Uscita registrata: ' + att.rim + (flag ? ' (' + flag + ')' : ''), 'ok');
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

// ---------- Rimorchi in piazzale ----------
// Dettaglio di ogni rimorchio. Per i cinque demo l'ingresso e' inventato; per gli altri viene dalla registrazione.
const ORA = h => { const d = new Date(), [a, b] = h.split(':'); d.setHours(+a, +b, 0, 0); return d.toISOString(); };
const INGRESSI_DEMO = {
  XB123CD: { aut: 'Rossi Marco', tra: 'FG456HJ', ora: ORA('07:40'), danni: {} },
  XC777EF: { aut: 'Esposito Ciro', tra: 'FH902MN', ora: ORA('08:15'), danni: { 15: 'Graffio' } },
  XD555GH: { aut: 'Conti Andrea', tra: 'EZ118PQ', ora: ORA('06:55'), danni: {} },
  XE010IJ: { aut: 'Greco Paolo', tra: 'FJ330RT', ora: ORA('08:50'), danni: { 21: 'Ammaccatura', 3: 'Rottura' } },
  XF020KL: { aut: 'Ferrari Davide', tra: 'GA221KL', ora: ORA('05:30'), danni: {} },
  XG302MP: { aut: 'Marino Gianni', tra: 'FM410AB', ora: ORA('06:20'), danni: {} },
  XH915QR: { aut: 'Bruni Carlo', tra: 'FN520CD', ora: ORA('07:05'), danni: {} }
};
const hh = ts => new Date(ts).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
function schedaRim(rim) {
  const i = [...S.ingressi].reverse().find(x => x.rim === rim) || INGRESSI_DEMO[rim] || null;
  const dt = dittaDi(rim), att = uscito(rim) ? null : (ATTESE.find(a => a.rim === rim) || (dt ? { chi: dt.n + ' (delega)', rif: dt.rif } : null));
  return { i, att, nd: i ? Object.keys(i.danni).length : 0, giro: S.giro.includes(rim) };
}
function disegnaRimorchi() { $('rm-cerca').value = ''; filtraRimorchi(); }
function filtraRimorchi() {
  const q = $('rm-cerca').value, lista = $('rm-lista'); lista.replaceChildren();
  let tutte = S.piazzale.map(p => ({ p: p.rim })), righe = tutte.map(it => ({ it, s: 0 }));
  if (normJolly(q).length >= 2) righe = trova(q, tutte);
  $('rm-cont').textContent = S.piazzale.length + ' in piazzale';
  if (!righe.length) lista.append(el('p', 'nota', 'Nessun rimorchio trovato'));
  righe.forEach(({ it }) => {
    const r = schedaRim(it.p), b = el('button', 'card att'), d = el('div', 'dett'), st = el('div', 'rm-stati');
    d.append(el('b', '', r.i ? r.i.aut : 'Ingresso non registrato'), el('small', '', r.att ? 'Lo ritira ' + r.att.chi : 'Nessun ritiro previsto'));
    st.append(el('span', 'pill-s ' + (r.att ? 'avv' : 'ok'), r.att ? 'Ritiro previsto' : 'Disponibile'),
      el('span', 'pill-s ' + (r.nd ? 'ko' : ''), r.nd ? r.nd + (r.nd === 1 ? ' danno' : ' danni') : 'Nessun danno'));
    d.append(st); b.append(targaEl(it.p), d, ico('next'));
    b.onclick = () => apriRimorchio(it.p);
    lista.append(b);
  });
}
function apriRimorchio(rim) {
  const r = schedaRim(rim), nodi = [el('div', 'sheet-tit', 'Dettaglio rimorchio'), targaEl(rim, 'grande'), el('div', 'sheet-sez', 'Ingresso')];
  if (r.i) nodi.push(dato('Entrato alle', hh(r.i.ora)), dato('Conducente', r.i.aut || '—'), dato('Trattore', r.i.tra || '—'));
  else nodi.push(dato('Entrato', 'non registrato'));
  nodi.push(el('div', 'sheet-sez', 'Ritiro'), dato('Disponibile', r.att ? 'No, ritiro previsto' : 'Sì, nessun ritiro assegnato'));
  if (r.att) nodi.push(dato('Lo ritira', r.att.chi), dato('Riferimento', r.att.rif));
  nodi.push(el('div', 'sheet-sez', 'Danni'));
  if (!r.nd) nodi.push(dato('Danni', r.i ? 'Nessuno segnalato' : 'non noti'));
  else Object.entries(r.i.danni).forEach(([k, v]) => nodi.push(dato(k + ' · ' + (NOMI[k] || 'zona'), v || 'tipo da indicare')));
  if (r.i && r.i.foto && (r.i.foto.l || r.i.foto.v)) {
    const g = el('div', 'foto-det');
    [['l', 'Foto lontano'], ['v', 'Foto vicino']].forEach(([w, n]) => { if (r.i.foto[w]) { const f = el('figure'), im = el('img'); im.src = r.i.foto[w]; im.alt = n; f.append(im, el('figcaption', '', n)); g.append(f); } });
    nodi.push(g);
  }
  nodi.push(el('div', 'sheet-sez', 'Giro piazzale'), dato('Controllo targa', r.giro ? 'Fatto' : 'Da fare'), bottone('cta-sec', 'Chiudi', chiudiSheet));
  apriSheet(...nodi);
}
$('rm-cerca').oninput = filtraRimorchi;
// Chiudi giornata con la conferma in basso: riepilogo e tasto di conferma stanno nel foglio che sale dal fondo
$('btn-chiudi-gg').onclick = () => {
  const mancano = S.piazzale.filter(p => !S.giro.includes(p.rim)).length, att = ATTESE.filter(a => !uscito(a.rim)).length;
  const nodi = [el('div', 'sheet-tit', 'Chiudere la giornata?'), dato('Rimorchi in piazzale', S.piazzale.length), dato('Ingressi', S.ingressi.length), dato('Uscite', S.uscite.length)];
  if (mancano) nodi.push(el('div', 'banner arancio', '⚠ ' + mancano + (mancano === 1 ? ' targa non controllata' : ' targhe non controllate')));
  if (att) nodi.push(el('div', 'banner arancio', '⚠ ' + att + (att === 1 ? ' uscita attesa non fatta' : ' uscite attese non fatte')));
  nodi.push(bottone('cta verde', 'Conferma e chiudi giornata', () => { chiudiSheet(); inviaReport(); toast('Giornata chiusa, report scaricato', 'ok'); }, 'check'), bottone('cta-sec', 'Annulla', chiudiSheet));
  apriSheet(...nodi);
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
function inviaReport() {
  const righe = ['tipo;targa_rimorchio;targa_trattore;persona;danni;nota;ora']
    .concat(S.ingressi.map(i => ['INGRESSO', i.rim, i.tra, i.aut, Object.entries(i.danni).map(([k, v]) => k + ':' + v).join('|'), i.nfoto + ' foto', i.ora].join(';')))
    .concat(S.uscite.map(u => ['USCITA', u.rim, '', u.chi, '', u.flag, u.ora].join(';')))
    .concat(S.intrusi.map(t => ['NON_IN_LISTA', t, '', '', '', '', ''].join(';')));
  const a = el('a'); a.href = URL.createObjectURL(new Blob(['﻿' + righe.join('\n')], { type: 'text/csv' }));
  a.download = 'report_' + new Date().toISOString().slice(0, 10) + '.csv'; a.click();
  $('esito-invio').textContent = 'Nel prodotto vero questo parte da solo verso il sistema del cliente. Qui scarica un CSV.';
}
$('btn-invia').onclick = inviaReport;
$('btn-reset').onclick = () => {
  if ($('btn-reset').textContent === 'Azzera i dati demo') {
    $('btn-reset').textContent = 'Tocca ancora per confermare';
    return setTimeout(() => $('btn-reset').textContent = 'Azzera i dati demo', 3000);
  }
  localStorage.removeItem(KEY); location.replace(location.pathname);
};


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

// ---------- Piazzale su cui si lavora ----------
document.querySelectorAll('[data-pz]').forEach(b => b.onclick = () => {
  sede = b.dataset.pz; localStorage.setItem('piazzale-sede', sede); vai('home', false);
});
$('sede-btn').onclick = () => vai('piazzale');

// ---------- Avvio ----------
costruisciSagome();
history.replaceState({ v: 'home' }, '');
const iniz = location.hash.slice(1);
if (TITOLI[iniz] && iniz !== 'home' && iniz !== 'piazzale') { vai('home', false); vai(iniz); } else vai('piazzale', false);
if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
