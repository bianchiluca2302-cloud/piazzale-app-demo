// Schema delle parti del semirimorchio, ricostruito dalla foto del foglio dell'azienda (IMG_1997).
// I NUMERI sono quelli del foglio. I NOMI descrivono solo la posizione: la legenda ufficiale
// (cosa e' il 22, il 27, il 29...) non e' sulla foto e va ancora confermata.
const SUOLO = ['line', { x1: 0, y1: 128, x2: 360, y2: 128 }, 'suolo'];
const CABINA = 'M246 108V44Q246 32 258 32H302L334 62Q346 64 346 76V108Z';

// Lato A: davanti a destra, retro a sinistra. Tre sezioni (dietro, centro, davanti) per tre fasce (alto, centro, basso).
const SEZIONI = { dietro: [8, 48, [17, 18, 19]], centro: [56, 196, [14, 15, 16]], davanti: [252, 100, [11, 12, 13]] };
const FASCE = [[8, 14, 'alto'], [22, 58, 'centro'], [80, 16, 'basso']];

function zoneLato(lato) {
  const z = [];
  for (const s in SEZIONI) {
    const [x, w, codici] = SEZIONI[s];
    FASCE.forEach(([y, h, f], j) => z.push({ p: String(codici[j]), f: 'rect', a: { x, y, width: w, height: h }, cx: x + w / 2, cy: y + h / 2, nome: `Lato ${lato} · ${s} · ${f}` }));
  }
  const r = (p, x, y, width, height, cx, cy, nome, s) => z.push({ p, f: 'rect', a: { x, y, width, height }, cx, cy, nome, s });
  r('22', 164, 98, 80, 12, 204, 104, `Lato ${lato} · telaio`);
  r('26', 54, 96, 11, 10, 59, 101, `Lato ${lato} · parafango`, 1);
  r('26', 151, 96, 11, 10, 156, 101, `Lato ${lato} · parafango`, 1);
  r('27', 34, 98, 20, 16, 44, 106, `Lato ${lato} · scatola dietro le ruote`);
  r('29', 88, 96, 12, 10, 94, 101, `Lato ${lato} · tra le ruote`, 1);
  r('21', 244, 96, 7, 26, 262, 110, `Gamba di appoggio ${lato}`);
  r('30', 236, 122, 23, 6, 247, 138, `Piede di appoggio ${lato}`);
  z.push({ p: '20', f: 'circle', a: { cx: 326, cy: 115, r: 8 }, cx: 326, cy: 115, nome: `Lato ${lato} · punto ⊗`, s: 1, c: 'segno' });
  [['23', 140, 'anteriore'], ['24', 109, 'centrale'], ['25', 79, 'posteriore']].forEach(([p, cx, n]) =>
    z.push({ p, f: 'circle', a: { cx, cy: 114, r: 13 }, cx, cy: 114, nome: `Lato ${lato} · ruota ${n}`, c: 'ruota' }));
  return z;
}
// Il lato B del foglio e' il lato A visto allo specchio con i codici + 30 (il piede 30 diventa 40, la gamba 21 diventa 51)
const codiceB = p => p === '30' ? '40' : p === '21' ? '51' : String(+p + 30);
const specchia = zs => zs.map(z => {
  const a = { ...z.a };
  if (z.f === 'rect') a.x = 360 - z.a.x - z.a.width; else a.cx = 360 - z.a.cx;
  return { ...z, a, cx: 360 - z.cx, p: codiceB(z.p) };
});
const decoLato = [
  SUOLO,
  ['rect', { x: 8, y: 8, width: 344, height: 88, rx: 4 }, 'cassa'],
  ['rect', { x: 8, y: 96, width: 344, height: 6, rx: 2 }, 'deco'],
  ['rect', { x: 8, y: 102, width: 26, height: 4, rx: 2 }, 'deco'],    // paraincastro
  ['rect', { x: 300, y: 102, width: 40, height: 5, rx: 2 }, 'deco']   // piastra del perno
];

const rz = (p, x, y, width, height, cx, cy, nome, s) => ({ p, f: 'rect', a: { x, y, width, height }, cx, cy, nome, s });

const VISTE = [
  { id: 'A', nome: 'Lato A', deco: decoLato, zone: zoneLato('A') },
  { id: 'B', nome: 'Lato B', deco: decoLato, specchio: true, zone: specchia(zoneLato('B')) },
  {
    id: 'F', nome: 'Fronte',
    deco: [SUOLO, ['rect', { x: 110, y: 8, width: 140, height: 84, rx: 6 }, 'cassa'], ['rect', { x: 132, y: 104, width: 96, height: 4, rx: 2 }, 'deco']],
    zone: [
      rz('2', 110, 22, 140, 70, 135, 40, 'Fronte · parete'),
      rz('1', 110, 8, 140, 14, 180, 15, 'Fronte · bordo alto'),
      rz('3', 152, 42, 56, 22, 180, 53, 'Fronte · attacchi'),
      rz('4', 116, 72, 34, 12, 133, 78, 'Fronte · fanale', 1), rz('4', 210, 72, 34, 12, 227, 78, 'Fronte · fanale', 1),
      rz('21', 130, 92, 7, 30, 121, 107, 'Gamba di appoggio A'), rz('30', 122, 122, 23, 6, 133, 138, 'Piede di appoggio A'),
      rz('51', 223, 92, 7, 30, 239, 107, 'Gamba di appoggio B'), rz('40', 215, 122, 23, 6, 227, 138, 'Piede di appoggio B')
    ]
  },
  {
    id: 'R', nome: 'Retro',
    deco: [SUOLO, ['rect', { x: 110, y: 8, width: 140, height: 100, rx: 3 }, 'cassa'], ['rect', { x: 116, y: 120, width: 8, height: 8 }, 'deco'], ['rect', { x: 236, y: 120, width: 8, height: 8 }, 'deco']],
    sopra: [['line', { x1: 202, y1: 30, x2: 232, y2: 56 }, 'barra'], ['line', { x1: 232, y1: 30, x2: 202, y2: 56 }, 'barra']],  // il 33 e' barrato sul foglio
    zone: [
      rz('32', 110, 18, 68, 70, 144, 53, 'Retro · porta sinistra'),
      rz('33', 182, 18, 68, 70, 216, 74, 'Retro · porta destra'),
      rz('31', 110, 8, 140, 10, 180, 13, 'Retro · bordo alto', 1),
      rz('34', 176, 18, 8, 70, 180, 76, 'Retro · chiusure', 1),
      rz('35', 236, 20, 12, 14, 242, 27, 'Retro · angolo alto destro', 1),
      rz('36', 112, 88, 34, 10, 129, 93, 'Retro · fanale', 1), rz('36', 214, 88, 34, 10, 231, 93, 'Retro · fanale', 1),
      rz('37', 112, 99, 28, 9, 126, 103, 'Retro · luci basse', 1), rz('37', 220, 99, 28, 9, 234, 103, 'Retro · luci basse', 1),
      rz('39', 156, 99, 48, 9, 180, 103, 'Retro · targa', 1),
      rz('38', 106, 110, 148, 10, 180, 115, 'Retro · paraincastro', 1)
    ]
  },
  {
    id: 'C', nome: 'Cisterna',
    deco: [SUOLO, ['ellipse', { cx: 180, cy: 56, rx: 70, ry: 48 }, 'cassa'], ['rect', { x: 118, y: 100, width: 124, height: 14, rx: 2 }, 'deco'],
      ['rect', { x: 112, y: 88, width: 22, height: 8, rx: 2 }, 'vetro'], ['rect', { x: 226, y: 88, width: 22, height: 8, rx: 2 }, 'vetro']]
      .concat(Array.from({ length: 9 }, (_, i) => ['line', { x1: 168, y1: 24 + i * 8, x2: 192, y2: 24 + i * 8 }, 'nervatura'])),
    zone: [rz('7', 168, 16, 24, 80, 180, 56, 'Scaletta'), rz('8', 158, 4, 44, 10, 222, 10, 'Sommità cisterna', 1)]
  },
  {
    id: 'G', nome: 'Fronte 2',
    deco: [SUOLO, ['rect', { x: 100, y: 6, width: 160, height: 122, rx: 16 }, 'cassa']]
      .concat(Array.from({ length: 10 }, (_, i) => ['line', { x1: 132, y1: 18 + i * 6, x2: 228, y2: 18 + i * 6 }, 'nervatura'])),
    zone: [rz('5', 128, 14, 104, 60, 180, 44, 'Pannello a griglia'), rz('6', 138, 96, 70, 20, 173, 106, 'Quadro comandi')]
  },
  {
    // provvisorio: il foglio mostra solo il semirimorchio, il trattore resta come nella prima versione
    id: 'T', nome: 'Trattore', tr: 'translate(-112 -8)',
    deco: [['line', { x1: 0, y1: 151, x2: 700, y2: 151 }, 'suolo'], ['rect', { x: 238, y: 108, width: 112, height: 8, rx: 2 }, 'deco'],
      ['path', { d: CABINA }, 'cabina'], ['path', { d: 'M264 40H300L326 62H264Z' }, 'vetro'],
      ['rect', { x: 266, y: 70, width: 14, height: 3, rx: 1.5 }, 'deco'], ['rect', { x: 338, y: 52, width: 6, height: 14, rx: 2 }, 'deco']],
    zone: [
      { p: 'MT', f: 'path', a: { d: CABINA }, cx: 296, cy: 92, nome: 'Cabina trattore', c: 'cab' },
      { p: 'RU5', f: 'circle', a: { cx: 274, cy: 134, r: 16 }, cx: 274, cy: 134, nome: 'Ruota posteriore trattore', c: 'ruota' },
      { p: 'RU4', f: 'circle', a: { cx: 322, cy: 134, r: 16 }, cx: 322, cy: 134, nome: 'Ruota anteriore trattore', c: 'ruota' }
    ]
  }
];

const NOMI = {};
VISTE.forEach(v => v.zone.forEach(z => { if (!NOMI[z.p]) NOMI[z.p] = z.nome; }));
