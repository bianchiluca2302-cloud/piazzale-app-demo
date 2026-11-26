// Confronto tollerante delle targhe: ultime cifre, ? come lettera illeggibile,
// confusioni di lettura (0/O, 1/I, 8/B, 5/S...) e uno/due caratteri sbagliati.
const CLASSI = { O: '0', Q: '0', D: '0', I: '1', L: '1', B: '8', S: '5', Z: '2', G: '6' };

const norm = t => (t || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
const normJolly = t => (t || '').toUpperCase().replace(/[^A-Z0-9?*]/g, '');
const canon = t => [...t].map(c => CLASSI[c] || c).join('');

function distanza(a, b) {
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++)
    for (let j = 1; j <= b.length; j++)
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return d[a.length][b.length];
}

// lista: oggetti con .p (la targa). Risultato ordinato per vicinanza:
// 0 uguale, 1 finisce con, 2 contiene, 3-4 simile (1 o 2 caratteri diversi)
function trova(q, lista) {
  const raw = normJolly(q);
  if (raw.length < 2) return [];
  const cq = canon(raw);
  const jolly = /[?*]/.test(cq);
  const corpo = cq.replace(/\?/g, '.').replace(/\*/g, '.*');
  const reTutta = new RegExp('^' + corpo + '$'), reFine = new RegExp(corpo + '$'), reDentro = new RegExp(corpo);
  const out = [];
  for (const it of lista) {
    const cp = canon(norm(it.p));
    let s = -1;
    if (jolly) s = reTutta.test(cp) ? 0 : reFine.test(cp) ? 1 : reDentro.test(cp) ? 2 : -1;
    else if (cp === cq) s = 0;
    else if (cp.endsWith(cq)) s = 1;
    else if (cp.includes(cq)) s = 2;
    else if (cq.length >= 5) {
      const d = distanza(cp, cq);
      if (d <= (cq.length >= 7 ? 2 : 1)) s = 2 + d;
    }
    if (s >= 0) out.push({ it, s });
  }
  return out.sort((x, y) => x.s - y.s);
}

const motivo = s => ['Corrisponde', 'Finisce così', 'Contiene', 'Simile: 1 carattere diverso', 'Simile: 2 caratteri diversi'][s];
