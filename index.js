// SoundDeck : fabriquer des bruitages rétro pour ses jeux. Un synthé calculé échantillon par échantillon (5 formes d'onde,
// glissando, enveloppe, vibrato, arpège, filtre, bruit), 8 familles de sons à tirer au hasard, une variation d'un clic,
// 12 pads pour ranger ses sons et les jouer au clavier, et l'export WAV.
const CSS = `
.sdGrid{display:grid;grid-template-columns:minmax(0,1fr) 340px;gap:12px}
@media (max-width:900px){.sdGrid{grid-template-columns:minmax(0,1fr)}.sdGrid>:last-child{order:-1}}
.sdFam{display:grid;grid-template-columns:repeat(4,1fr);gap:6px;margin-bottom:8px}
.sdFam .btn,.sdRow .btn{width:auto;margin:0;padding:6px 8px}
.sdRow{display:flex;gap:6px;flex-wrap:wrap;align-items:center;margin:6px 0}
.sdP{display:grid;grid-template-columns:120px minmax(0,1fr) 84px;gap:8px;align-items:center;margin:3px 0;font-size:12px;color:var(--lilac)}
.sdP b{font:12px monospace;color:#fff;text-align:right}
.sdRange{-webkit-appearance:none;appearance:none;height:10px;background:var(--bg0);border:2px solid var(--line);outline:none;width:100%}
.sdRange::-webkit-slider-thumb{-webkit-appearance:none;width:12px;height:22px;background:var(--magenta);border:2px solid #000;cursor:var(--cp,pointer)}
.sdWave{width:100%;height:110px;display:block;image-rendering:pixelated;background:#0b0816;border:2px solid var(--line);cursor:var(--cp,pointer)}
.sdPads{display:grid;grid-template-columns:repeat(4,1fr);gap:6px;margin-top:6px}
.sdPad{height:58px;background:var(--bg0);border:2px solid var(--line);cursor:var(--cp,pointer);display:flex;flex-direction:column;align-items:center;justify-content:center;font-size:11px;color:var(--lilac);position:relative;padding:2px;text-align:center;overflow:hidden}
.sdPad b{font:16px monospace;color:#fff}
.sdPad.full{border-color:var(--magenta)}
.sdPad.on{background:rgba(var(--pkr),.4)}
.sdPad .k{position:absolute;left:3px;top:1px;font:10px monospace;color:var(--muted)}
.sdHelp{font-size:12px;color:var(--lilac);margin-top:6px;line-height:1.5}
`;
const SR = 44100;
const WAVES = ['carrée', 'dent de scie', 'sinus', 'triangle', 'bruit'];
// [clé, nom, min, max, pas, unité]
const PARAMS = [['freq', 'Hauteur', 40, 2400, 1, 'Hz'], ['slide', 'Glissando', -8, 8, .1, 'oct/s'], ['duty', 'Largeur (carrée)', .05, .5, .01, ''],
  ['attack', 'Attaque', 0, .5, .005, 's'], ['sustain', 'Tenue', 0, 1, .005, 's'], ['decay', 'Chute', .01, 1.5, .005, 's'], ['punch', 'Punch', 0, 1, .01, ''],
  ['vibDepth', 'Vibrato', 0, 1, .01, ''], ['vibSpeed', 'Vitesse vibrato', 0, 30, .5, 'Hz'], ['arpMul', 'Arpège', .5, 3, .01, '×'], ['arpTime', 'Moment arpège', 0, 1, .01, 's'],
  ['lowpass', 'Filtre', 200, 20000, 10, 'Hz'], ['crush', 'Écrasement', 0, 1, .01, ''], ['volume', 'Volume', 0, 1, .01, '']];
const BASE = {wave: 0, freq: 440, slide: 0, duty: .5, attack: 0, sustain: .1, decay: .3, punch: 0, vibDepth: 0, vibSpeed: 6, arpMul: 1, arpTime: 0, lowpass: 20000, crush: 0, volume: .6};
// les familles de sons : chacune tire ses réglages au hasard dans des fourchettes typiques
const R = (a, b) => a + Math.random() * (b - a), pick = a => a[Math.floor(Math.random() * a.length)];
const FAMILIES = {
  coin: ['Pièce', () => ({wave: pick([0, 0, 2]), freq: R(700, 1400), sustain: R(.02, .08), decay: R(.15, .35), punch: R(.3, .6), arpMul: R(1.3, 1.6), arpTime: R(.04, .09), duty: R(.3, .5)})],
  jump: ['Saut', () => ({wave: 0, freq: R(220, 500), slide: R(1.5, 4), sustain: R(.05, .15), decay: R(.1, .25), duty: R(.2, .5)})],
  laser: ['Laser', () => ({wave: pick([0, 1, 1]), freq: R(800, 2000), slide: R(-8, -4), sustain: R(.05, .12), decay: R(.05, .2), duty: R(.1, .4)})],
  boom: ['Explosion', () => ({wave: 4, freq: R(60, 200), slide: R(-2, -.5), sustain: R(.1, .3), decay: R(.4, 1), punch: R(.4, .8), lowpass: R(1500, 6000)})],
  power: ['Bonus', () => ({wave: pick([0, 3]), freq: R(250, 500), slide: R(1, 3), sustain: R(.2, .35), decay: R(.2, .4), vibDepth: R(.1, .4), vibSpeed: R(10, 20), duty: R(.3, .5)})],
  hit: ['Touché', () => ({wave: pick([1, 4, 0]), freq: R(150, 500), slide: R(-6, -2), sustain: R(0, .04), decay: R(.08, .2), punch: R(.3, .7)})],
  blip: ['Clic', () => ({wave: pick([0, 2, 3]), freq: R(400, 1500), sustain: R(.01, .04), decay: R(.02, .07), duty: R(.2, .5)})],
  door: ['Porte', () => ({wave: pick([1, 4]), freq: R(60, 160), slide: R(-1, .5), attack: R(0, .05), sustain: R(.15, .4), decay: R(.1, .3), lowpass: R(400, 1500), vibDepth: R(0, .3), vibSpeed: R(10, 25)})],
};
// le synthé : renvoie un Float32Array de la longueur exacte du son
function synth(p) {
  const n = Math.max(1, Math.round((p.attack + p.sustain + p.decay) * SR)), out = new Float32Array(n);
  let phase = 0, lp = 0, noiseVal = 0, lastCycle = -1, held = 0; const k = 1 - Math.exp(-2 * Math.PI * p.lowpass / SR), crushN = Math.max(1, Math.round(p.crush * 24));
  for (let i = 0; i < n; i++) {
    const t = i / SR; let f = p.freq * 2 ** (p.slide * t); if (p.arpTime > 0 && t >= p.arpTime) f *= p.arpMul;
    f *= 1 + p.vibDepth * .06 * Math.sin(2 * Math.PI * p.vibSpeed * t); f = Math.max(20, Math.min(20000, f));
    phase += f / SR; const ph = phase % 1, cyc = Math.floor(phase * 2);
    let v; switch (p.wave) { case 0: v = ph < p.duty ? 1 : -1; break; case 1: v = 1 - 2 * ph; break; case 2: v = Math.sin(2 * Math.PI * ph); break; case 3: v = ph < .5 ? 4 * ph - 1 : 3 - 4 * ph; break; default: if (cyc !== lastCycle) { lastCycle = cyc; noiseVal = Math.random() * 2 - 1; } v = noiseVal; }
    const env = t < p.attack ? t / p.attack : t < p.attack + p.sustain ? 1 + p.punch * (1 - (t - p.attack) / Math.max(1e-4, p.sustain)) : Math.max(0, 1 - (t - p.attack - p.sustain) / p.decay);
    lp += (v - lp) * k; if (i % crushN === 0) held = lp;
    out[i] = held * env * p.volume * .5;
  }
  return out;
}
function toWav(samples) {
  const d = new DataView(new ArrayBuffer(44 + samples.length * 2)), w = (o, s) => [...s].forEach((c, i) => d.setUint8(o + i, c.charCodeAt(0)));
  w(0, 'RIFF'); d.setUint32(4, 36 + samples.length * 2, true); w(8, 'WAVE'); w(12, 'fmt '); d.setUint32(16, 16, true); d.setUint16(20, 1, true); d.setUint16(22, 1, true); d.setUint32(24, SR, true); d.setUint32(28, SR * 2, true); d.setUint16(32, 2, true); d.setUint16(34, 16, true); w(36, 'data'); d.setUint32(40, samples.length * 2, true);
  samples.forEach((v, i) => d.setInt16(44 + i * 2, Math.max(-1, Math.min(1, v)) * 32767, true)); return new Uint8Array(d.buffer);
}
export default async function (ctx) {
  const view = ctx.view;
  if (!ctx.host) { view.textContent = "Ce plugin doit être approuvé par NeoDex pour s'ouvrir."; return; }
  const { el, toast } = ctx.host;
  ctx.host.addStyle(CSS);
  // vérification : chaque famille donne un son audible, sans saturer, de la bonne longueur ; le WAV a le bon en-tête
  console.assert(Object.values(FAMILIES).every(([, f]) => { const p = {...BASE, ...f()}, s = synth(p); let pk = 0; for (const v of s) pk = Math.max(pk, Math.abs(v)); return pk > .02 && pk <= 1 && s.length === Math.max(1, Math.round((p.attack + p.sustain + p.decay) * SR)); }) && toWav(new Float32Array(10)).length === 64, 'sounddeck : synthé');
  let data = null; try { data = await ctx.folder.read('sounddeck'); } catch {}
  let cur = data?.cur ? {...BASE, ...data.cur} : {...BASE, ...FAMILIES.coin[1]()}, pads = data?.pads || Array(12).fill(null), curName = data?.curName || 'Pièce';
  let saveT = 0; const save = () => { clearTimeout(saveT); saveT = setTimeout(() => ctx.folder.write('sounddeck', {cur, pads, curName}).catch(() => {}), 400); };
  // ---------- l'interface ----------
  view.innerHTML = '';
  const wrap = el('div', 'appWrap'), head = el('div', 'agHead'), lay = el('div', 'sdGrid'), left = el('div', 'sysCard px'), right = el('div', 'sysCard px');
  head.append(el('span', 'label', 'SoundDeck · bruitages rétro')); lay.append(left, right); wrap.append(head, lay); view.append(wrap);
  const fam = el('div', 'sdFam'), waveRow = el('div', 'sdRow'), sliders = el('div');
  left.append(el('span', 'label', 'Tirer un son au hasard'), fam, el('span', 'label', 'Réglages'), waveRow, sliders);
  const cv = el('canvas', 'sdWave'), act = el('div', 'sdRow'), padsBox = el('div', 'sdPads'), nameL = el('div', 'hint');
  cv.id = 'sd_wave'; cv.title = 'Clic : jouer'; nameL.id = 'sd_name';
  right.append(el('span', 'label', 'Le son'), nameL, cv, act, el('span', 'label', 'Pads'), padsBox, el('p', 'sdHelp', 'Clic sur un pad vide : y ranger le son. Clic sur un pad plein : le jouer. Clic droit : le reprendre pour le modifier, ou le vider. Touches 1 à 9, 0, - et = : jouer les pads.'));
  for (const [k, [n, f]] of Object.entries(FAMILIES)) { const b = el('button', 'btn px', n); b.dataset.fam = k; b.onclick = () => { cur = {...BASE, ...f()}; curName = n; save(); full(); play(); }; fam.append(b); }
  // ---------- jouer ----------
  let ac = null;
  function play(p = cur) { try { ac = ac || new AudioContext(); if (ac.state === 'suspended') ac.resume(); const s = synth(p), b = ac.createBuffer(1, s.length, SR); b.copyToChannel(s, 0); const src = ac.createBufferSource(); src.buffer = b; src.connect(ac.destination); src.start(); } catch (e) { toast('Son impossible : ' + e.message); } }
  cv.onclick = () => play();
  // ---------- les réglages ----------
  const fmtv = (v, st) => st >= 1 ? String(Math.round(v)) : (Math.round(v * 100) / 100).toString();
  function drawSliders() {
    waveRow.replaceChildren(...WAVES.map((w, i) => { const b = el('button', 'btn px' + (cur.wave === i ? ' main' : ''), w); b.dataset.wave = i; b.onclick = () => { cur.wave = i; changed(); drawSliders(); }; return b; }));
    sliders.replaceChildren(...PARAMS.map(([k, n, mn, mx, stp, u]) => { const row = el('div', 'sdP'), r = el('input', 'sdRange'), val = el('b', '', fmtv(cur[k], stp) + (u ? ' ' + u : ''));
      val.translate = false; r.type = 'range'; r.min = mn; r.max = mx; r.step = stp; r.value = cur[k]; r.dataset.k = k;
      if (k === 'freq' || k === 'lowpass') { r.min = Math.log(mn); r.max = Math.log(mx); r.step = .001; r.value = Math.log(cur[k]); }  // échelle logarithmique pour les fréquences
      r.oninput = () => { cur[k] = k === 'freq' || k === 'lowpass' ? Math.round(Math.exp(+r.value)) : +r.value; val.textContent = fmtv(cur[k], stp) + (u ? ' ' + u : ''); drawWave(); };
      r.onchange = () => { changed(); play(); }; row.append(el('span', '', n), r, val); return row; }));
  }
  function drawWave() {
    const s = synth(cur), W = cv.width = 640, H = cv.height = 110, g = cv.getContext('2d'), step = s.length / W; g.fillStyle = '#0b0816'; g.fillRect(0, 0, W, H); g.fillStyle = '#241c40'; g.fillRect(0, H / 2, W, 1);
    g.fillStyle = '#ff4fb0'; for (let x = 0; x < W; x++) { let mn = 0, mx = 0; for (let i = Math.floor(x * step); i < Math.floor((x + 1) * step); i++) { mn = Math.min(mn, s[i]); mx = Math.max(mx, s[i]); } const y1 = Math.round(H / 2 - mx * H * .9), y2 = Math.round(H / 2 - mn * H * .9); g.fillRect(x, y1, 1, Math.max(1, y2 - y1)); }
    g.fillStyle = '#8a7aa8'; g.font = '10px monospace'; g.fillText((s.length / SR).toFixed(2) + ' s', W - 44, 12);
    nameL.replaceChildren(el('span', '', curName), ' · ', el('span', '', WAVES[cur.wave]), ' · ' + Math.round(cur.freq) + ' Hz');
  }
  function changed() { save(); drawWave(); }
  // ---------- les actions ----------
  const btn = (t, f, title) => { const b = el('button', 'btn px', t); b.onclick = f; if (title) b.title = title; return b; };
  const mutate = () => { for (const [k, , mn, mx] of PARAMS) { if (k === 'volume') continue; if (Math.random() < .5) { const span = (mx - mn) * .08; cur[k] = Math.max(mn, Math.min(mx, cur[k] + (Math.random() * 2 - 1) * span)); } } cur.freq = Math.max(40, cur.freq * (1 + (Math.random() - .5) * .25)); curName = curName.replace(/ \*$/, '') + ' *'; save(); full(); play(); };
  const playB = btn('▶ Jouer', () => play()); playB.classList.add('main'); playB.id = 'sd_play';
  act.append(playB, btn('🎲 Variante', mutate, 'Changer un peu les réglages'), btn('⟲ Neutre', () => { cur = {...BASE}; curName = 'Neutre'; save(); full(); }),
    btn('Exporter WAV', () => { const a = el('a'); a.href = URL.createObjectURL(new Blob([toWav(synth(cur))], {type: 'audio/wav'})); a.download = (curName.replace(/[^\wÀ-ÿ-]+/g, '-').replace(/^-|-$/g, '') || 'son') + '.wav'; document.body.append(a); a.click(); a.remove(); }));
  // ---------- les pads ----------
  const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0', '-', '='];
  function drawPads() {
    padsBox.replaceChildren(...pads.map((p, i) => { const d = el('div', 'sdPad' + (p ? ' full' : '')); d.append(el('span', 'k', KEYS[i])); d.dataset.pad = i;
      if (p) { const n = el('span', '', p.name); n.translate = false; d.append(el('b', '', '♪'), n); } else d.append(el('span', '', '+ ranger'));
      d.onclick = () => { if (p) { play(p.p); flash(d); } else { pads[i] = {name: curName, p: {...cur}}; save(); drawPads(); toast('Rangé sur le pad ' + KEYS[i]); } };
      d.oncontextmenu = async e => { e.preventDefault(); if (!p) return; if (await ctx.host.confirm?.('Vider ce pad ? (Annuler : le reprendre pour le modifier)')) { pads[i] = null; save(); drawPads(); } else { cur = {...BASE, ...p.p}; curName = p.name; save(); full(); } };
      return d; }));
  }
  const flash = d => { d.classList.add('on'); setTimeout(() => d.classList.remove('on'), 150); };
  const onKey = e => { if (!view.isConnected) { document.removeEventListener('keydown', onKey); return; } if (/INPUT|TEXTAREA|SELECT/.test(document.activeElement?.tagName) && document.activeElement.type !== 'range') return;
    const i = KEYS.indexOf(e.key); if (i >= 0 && pads[i]) { play(pads[i].p); flash(padsBox.children[i]); } else if (e.code === 'Space' && document.activeElement?.tagName !== 'BUTTON') { e.preventDefault(); play(); } };
  document.addEventListener('keydown', onKey);
  ctx.onClose?.(() => { document.removeEventListener('keydown', onKey); ac?.close(); });
  function full() { drawSliders(); drawWave(); }
  full(); drawPads();
}
