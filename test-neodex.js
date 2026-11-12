// lancé par le test « local » de NeoDex : une explosion tirée au hasard, un réglage changé, un verrou, annuler, un jingle mélangé,
// l'export 8 bits, un son rangé sur un pad puis joué au clavier
module.exports = async ({ pj, sleep }) => {
  const run = async code => { const r = await pj(code); if (r && r.err) throw new Error(r.err); return r; };
  const name = () => pj(`document.getElementById('sd_name').textContent`);
  const sd = `document.getElementById('sd_wave').closest('.appWrap').parentNode.__sd`;
  await sleep(500);
  await pj(`document.querySelector('[data-fam=boom]').click(), 0`); await sleep(100);
  if (!/Explosion · bruit/.test(await name())) throw new Error('explosion : ' + await name());
  const ink = await pj(`(() => { const d = document.getElementById('sd_wave').getContext('2d').getImageData(0, 0, 640, 110).data; let n = 0; for (let i = 0; i < d.length; i += 4) if (d[i] > 120 && d[i + 2] > 150 && d[i + 1] < 120) n++; return n; })()`);
  if (ink < 500) throw new Error('forme d\'onde presque vide : ' + ink);
  await pj(`document.querySelector('[data-wave="0"]').click(), (() => { const r = document.querySelector('[data-k=freq]'); r.value = Math.log(880); r.dispatchEvent(new Event('input')); r.dispatchEvent(new Event('change')); })(), 0`); await sleep(100);
  if (!/carrée · 880 Hz/.test(await name())) throw new Error('réglage : ' + await name());
  // la hauteur verrouillée ne bouge pas avec une famille ; annuler revient à l'explosion
  await pj(`document.querySelector('[data-k=freq]').parentNode.querySelector('.lk').click(), 0`);
  await pj(`document.querySelector('[data-fam=laser]').click(), 0`); await sleep(100);
  if (Math.round(await pj(`${sd}.cur.freq`)) !== 880) throw new Error('verrou : ' + await pj(`${sd}.cur.freq`));
  await pj(`${sd}.back(), 0`); if (!/Explosion/.test(await name())) throw new Error('annuler : ' + await name());
  const r = await run(`(() => { try { const s = ${sd}, m = s.renderMix(s.jingle('Victoire')), w = s.toWav(m, 11025, 8), s2 = s.synth({...s.cur, echo: .5, echoTime: .1, reso: .8, lowpass: 2000, dist: .5, hipass: 200});
    let pk = 0; for (const v of s2) pk = Math.max(pk, Math.abs(v)); if (!(pk > .02 && pk <= 1)) return {err: 'effets : crête ' + pk};
    if (w[34] !== 8 || w.length !== 44 + Math.floor(m.length / 4)) return {err: 'WAV 8 bits : ' + w.length};
    return {mix: m.length}; } catch (e) { return {err: e.message}; } })()`);
  await pj(`document.querySelector('[data-pad="0"]').click(), 0`); await sleep(100);
  if (!await pj(`document.querySelector('[data-pad="0"]').classList.contains('full')`)) throw new Error('pad vide');
  await pj(`document.dispatchEvent(new KeyboardEvent('keydown', {key: '1'})), document.dispatchEvent(new KeyboardEvent('keydown', {key: 'g'})), 0`); await sleep(300);
  return 'explosion, réglage, verrou, annuler, effets, jingle de ' + (r.mix / 44100).toFixed(2) + ' s, WAV 8 bits, pad et clavier ok';
};
