// lancé par le test « local » de NeoDex : une explosion tirée au hasard, un réglage changé, rangée sur un pad puis jouée au clavier
module.exports = async ({ pj, sleep }) => {
  const name = () => pj(`document.getElementById('sd_name').textContent`);
  await sleep(500);
  await pj(`document.querySelector('[data-fam=boom]').click(), 0`); await sleep(100);
  if (!/Explosion · bruit/.test(await name())) throw new Error('explosion : ' + await name());
  const ink = await pj(`(() => { const d = document.getElementById('sd_wave').getContext('2d').getImageData(0, 0, 640, 110).data; let n = 0; for (let i = 0; i < d.length; i += 4) if (d[i] > 200 && d[i + 2] > 150 && d[i + 1] < 120) n++; return n; })()`);
  if (ink < 500) throw new Error('forme d\'onde presque vide : ' + ink);
  await pj(`document.querySelector('[data-wave="0"]').click(), (() => { const r = document.querySelector('[data-k=freq]'); r.value = Math.log(880); r.dispatchEvent(new Event('input')); r.dispatchEvent(new Event('change')); })(), 0`); await sleep(100);
  if (!/carrée · 880 Hz/.test(await name())) throw new Error('réglage : ' + await name());
  await pj(`document.querySelector('[data-pad="0"]').click(), 0`); await sleep(100);
  if (!await pj(`document.querySelector('[data-pad="0"]').classList.contains('full')`)) throw new Error('pad vide');
  await pj(`document.dispatchEvent(new KeyboardEvent('keydown', {key: '1'})), 0`); await sleep(300);
  return 'explosion, réglage, pad et clavier ok';
};
