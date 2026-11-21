const frames = {
  collage: [
    [[0, 0], [.31, 0], [.22, .48], [0, .61]], [[.33, 0], [.66, 0], [.56, .5], [.25, .49]], [[.68, 0], [1, 0], [1, .46], [.59, .5]],
    [[0, .64], [.22, .52], [.54, .53], [.45, 1], [0, 1]], [[.58, .53], [1, .49], [1, 1], [.48, 1]],
  ],
  grid: [ [[0, 0], [.49, 0], [.49, .47], [0, .47]], [[.51, 0], [1, 0], [1, .47], [.51, .47]], [[0, .49], [.49, .49], [.49, .96], [0, .96]], [[.51, .49], [1, .49], [1, .96], [.51, .96]] ],
  hero: [ [[0, 0], [.67, 0], [.67, .84], [0, .84]], [[.69, 0], [1, 0], [1, .41], [.69, .41]], [[.69, .43], [1, .43], [1, .84], [.69, .84]], [[0, .86], [1, .86], [1, 1], [0, 1]] ],
};
const moods = {
  sunset: { pink: [214, 46, 130], orange: [255, 126, 64], cyan: [53, 205, 213] },
  neon: { pink: [246, 30, 154], orange: [111, 54, 224], cyan: [25, 221, 224] },
};

export function bootStudio() {
  const $ = (id) => document.getElementById(id);
  const canvas = $('cover'), ctx = canvas.getContext('2d');
  const photos = [], assignment = [], framing = [];
  let layout = 'collage', active = 0, wash = .54, zoom = 1.16, tintOn = true, drag = null, toastTimer;
  const panels = () => frames[layout];
  const pathFor = (poly, w, h) => {
    const p = new Path2D(); p.moveTo(poly[0][0] * w, poly[0][1] * h);
    poly.slice(1).forEach(([x, y]) => p.lineTo(x * w, y * h)); p.closePath(); return p;
  };
  const rgb = (v, a) => `rgba(${v.join(',')},${a})`;
  const message = (text) => { $('toast').textContent = text; $('toast').classList.add('show'); clearTimeout(toastTimer); toastTimer = setTimeout(() => $('toast').classList.remove('show'), 2100); };

  function draw() {
    const w = canvas.width, h = canvas.height, mood = moods[$('tone').value], inset = w * .014;
    ctx.clearRect(0, 0, w, h); ctx.fillStyle = '#171326'; ctx.fillRect(0, 0, w, h);
    panels().forEach((poly, i) => {
      const xs = poly.map(p => p[0] * w), ys = poly.map(p => p[1] * h);
      const x = Math.min(...xs), y = Math.min(...ys), pw = Math.max(...xs) - x, ph = Math.max(...ys) - y;
      const photoIndex = assignment[i] ?? (photos.length ? i % photos.length : -1), photo = photos[photoIndex], frame = framing[i] || { x: 0, y: 0, zoom: 1.08 };
      ctx.save(); ctx.clip(pathFor(poly, w, h));
      if (photo) {
        const scale = Math.max(pw / photo.image.naturalWidth, ph / photo.image.naturalHeight) * frame.zoom * (i === active ? zoom / 1.16 : 1);
        const dw = photo.image.naturalWidth * scale, dh = photo.image.naturalHeight * scale;
        ctx.drawImage(photo.image, x + pw / 2 - dw / 2 + frame.x * pw, y + ph / 2 - dh / 2 + frame.y * ph, dw, dh);
      } else {
        const grad = ctx.createLinearGradient(x, y, x + pw, y + ph); grad.addColorStop(0, '#342b55'); grad.addColorStop(.52, '#a94b75'); grad.addColorStop(1, '#217f8a'); ctx.fillStyle = grad; ctx.fillRect(x, y, pw, ph);
        ctx.strokeStyle = '#ffffff1b'; ctx.lineWidth = Math.max(2, w / 500); for (let n = 0; n < 8; n++) { ctx.beginPath(); ctx.moveTo(x + n * pw / 6, y); ctx.lineTo(x + n * pw / 6 - pw * .2, y + ph); ctx.stroke(); }
      }
      if (tintOn) { const tint = ctx.createLinearGradient(x, y, x + pw * .5, y + ph); tint.addColorStop(0, rgb(mood.cyan, wash * .24)); tint.addColorStop(.55, rgb(mood.pink, wash * .16)); tint.addColorStop(1, rgb(mood.orange, wash * .49)); ctx.fillStyle = tint; ctx.fillRect(x, y, pw, ph); }
      ctx.restore();
      ctx.strokeStyle = i === active ? '#ff75ba' : '#171326'; ctx.lineWidth = i === active ? Math.max(3, w / 420) : Math.max(7, w / 180); ctx.stroke(pathFor(poly, w, h));
    });

    const shade = ctx.createLinearGradient(0, h * .52, 0, h); shade.addColorStop(0, 'rgba(13,8,26,0)'); shade.addColorStop(.45, rgb(mood.pink, .2)); shade.addColorStop(1, 'rgba(12,7,22,.88)'); ctx.fillStyle = shade; ctx.fillRect(0, 0, w, h);
    const vignette = ctx.createRadialGradient(w * .5, h * .42, h * .04, w * .5, h * .48, w * .78); vignette.addColorStop(0, 'transparent'); vignette.addColorStop(1, 'rgba(7,5,18,.43)'); ctx.fillStyle = vignette; ctx.fillRect(0, 0, w, h);

    const pad = w * .058, top = $('titlePosition').value === 'top', title = ($('caption').value || 'YOUR CITY').trim().toUpperCase();
    const words = title.split(/\s+/).filter(Boolean); if (!words.length) words.push('YOUR CITY');
    let size = h * (h > w ? .11 : .17), lines = []; ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
    do {
      ctx.font = `${size}px Anton, Impact, sans-serif`; lines = [''];
      words.forEach(word => { const row = lines.length - 1, next = lines[row] ? `${lines[row]} ${word}` : word; if (ctx.measureText(next).width > w - pad * 2 && row === 0) lines.push(word); else lines[row] = next; });
      if (lines.some(line => ctx.measureText(line).width > w - pad * 2)) size *= .94;
    } while (lines.some(line => ctx.measureText(line).width > w - pad * 2) && size > 20);
    const lineGap = size * .84, base = top ? h * .2 : h - h * .13 - (lines.length - 1) * lineGap;
    ctx.save(); ctx.translate(pad, base); ctx.rotate(-.025); ctx.font = `${size}px Anton, Impact, sans-serif`; ctx.lineJoin = 'round'; ctx.lineWidth = size * .1; ctx.strokeStyle = '#26102fdc'; ctx.shadowColor = '#10091d'; ctx.shadowBlur = size * .15; ctx.shadowOffsetY = h * .008;
    lines.slice(0, 2).forEach((line, i) => { ctx.strokeText(line, 0, i * lineGap); ctx.fillStyle = $('titleColor').value; ctx.fillText(line, 0, i * lineGap); }); ctx.restore();
    const sub = ($('subtitle').value || '').toUpperCase(), subY = top ? h * .27 : h - h * .055;
    ctx.fillStyle = '#ffd3e5'; ctx.textAlign = 'left'; ctx.font = `800 ${Math.max(13, h * .022)}px ui-sans-serif, sans-serif`; ctx.fillText(sub, pad + 2, subY);
    ctx.textAlign = 'right'; ctx.fillStyle = '#fff9'; ctx.font = `700 ${Math.max(10, h * .014)}px ui-sans-serif, sans-serif`; ctx.fillText('VICEFRAME  /  ORIGINAL CITY STORIES', w - pad, subY);
    ctx.fillStyle = '#ffb7d8'; ctx.font = `700 ${Math.max(9, h * .012)}px ui-sans-serif, sans-serif`; ctx.textAlign = 'left'; ctx.fillText('VOL. 01    •    THE NIGHT IS YOURS', pad, h * .075);
    ctx.save(); ctx.globalAlpha = .11; ctx.fillStyle = '#fff'; for (let n = 0; n < 190; n++) ctx.fillRect((n * 7919 % 997) / 997 * w, (n * 3571 % 991) / 991 * h, Math.max(1, w / 1400), Math.max(1, h / 850)); ctx.restore();
  }

  function syncSize() { const [w, h] = $('size').value.split('x').map(Number); canvas.width = w; canvas.height = h; canvas.style.aspectRatio = `${w}/${h}`; $('sizeLabel').innerHTML = `${w} × ${h} <span>▣</span>`; draw(); }
  function syncSelection() { $('activePanel').textContent = `PANEL ${String(active + 1).padStart(2, '0')}`; document.querySelectorAll('.photo-pick').forEach(el => el.classList.toggle('assigned', Number(el.dataset.photo) === assignment[active])); draw(); }
  function addPhoto(file, image) {
    const index = photos.push({ file, image }) - 1, button = document.createElement('button'); button.type = 'button'; button.className = 'photo-pick'; button.dataset.photo = index; button.title = `Place ${file.name || 'sample photo'} in selected panel`;
    const thumb = document.createElement('img'); thumb.className = 'photo-thumb'; thumb.src = image.src; thumb.alt = file.name || 'Sample photo'; button.append(thumb);
    button.addEventListener('click', () => { assignment[active] = index; syncSelection(); message(`Photo placed in panel ${String(active + 1).padStart(2, '0')}`); }); $('photoTray').append(button);
    if (photos.length === 1) panels().forEach((_, i) => assignment[i] = 0);
    $('photoCount').textContent = `${photos.length} PHOTO${photos.length === 1 ? '' : 'S'}`; syncSelection();
  }
  function loadFile(file) { if (!file.type.startsWith('image/')) return; const url = URL.createObjectURL(file), image = new Image(); image.onload = () => { addPhoto(file, image); URL.revokeObjectURL(url); }; image.onerror = () => { URL.revokeObjectURL(url); message(`Could not open ${file.name}`); }; image.src = url; }
  $('photoInput').addEventListener('change', e => { [...e.target.files].forEach(loadFile); e.target.value = ''; });
  document.querySelectorAll('.template').forEach(button => button.addEventListener('click', () => { layout = button.dataset.layout; active = 0; document.querySelectorAll('.template').forEach(el => el.classList.toggle('selected', el === button)); panels().forEach((_, i) => { if (assignment[i] == null && photos.length) assignment[i] = i % photos.length; }); syncSelection(); }));
  ['caption', 'subtitle'].forEach(id => $(id).addEventListener('input', draw)); ['titleColor', 'titlePosition', 'tone'].forEach(id => $(id).addEventListener('change', draw));
  $('size').addEventListener('change', syncSize); $('intensity').addEventListener('input', e => { wash = Number(e.target.value) / 100; $('intensityValue').value = `${e.target.value}%`; draw(); });
  $('zoom').addEventListener('input', e => { zoom = Number(e.target.value) / 100; draw(); });
  $('toneToggle').addEventListener('click', e => { tintOn = !tintOn; e.currentTarget.classList.toggle('on', tintOn); e.currentTarget.setAttribute('aria-pressed', String(tintOn)); draw(); });
  $('addPhoto').addEventListener('click', () => $('photoInput').click());
  canvas.addEventListener('pointerdown', e => { const r = canvas.getBoundingClientRect(), point = { x: (e.clientX - r.left) / r.width, y: (e.clientY - r.top) / r.height }, hit = panels().findIndex(poly => ctx.isPointInPath(pathFor(poly, 1, 1), point.x, point.y)); if (hit < 0) return; active = hit; syncSelection(); drag = { point }; canvas.setPointerCapture(e.pointerId); });
  canvas.addEventListener('pointermove', e => { if (!drag || assignment[active] == null) return; const r = canvas.getBoundingClientRect(), p = { x: (e.clientX - r.left) / r.width, y: (e.clientY - r.top) / r.height }; framing[active] ||= { x: 0, y: 0, zoom: 1.08 }; framing[active].x += p.x - drag.point.x; framing[active].y += p.y - drag.point.y; drag.point = p; draw(); });
  canvas.addEventListener('pointerup', () => { drag = null; }); canvas.addEventListener('pointercancel', () => { drag = null; });
  function exportPng() { canvas.toBlob(blob => { if (!blob) return message('PNG export failed. Try again.'); const [w, h] = $('size').value.split('x'), url = URL.createObjectURL(blob), a = document.createElement('a'); a.href = url; a.download = `viceframe-${w}x${h}.png`; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1500); message(`Cover exported · ${w} × ${h} PNG`); }, 'image/png'); }
  $('exportTop').addEventListener('click', exportPng);
  syncSize();
  Promise.all(['boulevard.jpg', 'pier.jpg'].map(name => new Promise(resolve => { const image = new Image(); image.onload = () => { addPhoto({ name }, image); resolve(); }; image.onerror = resolve; image.src = `./samples/${name}`; }))).then(() => {
    panels().forEach((_, i) => assignment[i] = i % Math.max(photos.length, 1));
    const query = new URLSearchParams(location.search), shot = query.get('shot');
    if (shot === 'cover' || shot === 'editor') { $('caption').value = query.get('caption') || 'SUNSET HEIST'; if (shot === 'cover') document.body.classList.add('shot-cover'); draw(); }
    window.__shotReady = true;
  });
}
