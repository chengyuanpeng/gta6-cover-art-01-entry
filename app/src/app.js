// ViceFrame studio: a multi-panel cover composer painted on one 2D canvas.
// Every panel shape is written in normalized (0..1) coordinates, so a single
// layout definition works at all three export sizes. Photos are read on this
// machine only and are never uploaded anywhere.

// Three frame layouts: a slanted collage, a tidy grid, one big hero moment.
const LAYOUTS = {
  collage: [
    [[0, 0], [.31, 0], [.22, .48], [0, .61]],
    [[.33, 0], [.66, 0], [.56, .5], [.25, .49]],
    [[.68, 0], [1, 0], [1, .46], [.59, .5]],
    [[0, .64], [.22, .52], [.54, .53], [.45, 1], [0, 1]],
    [[.58, .53], [1, .49], [1, 1], [.48, 1]],
  ],
  grid: [
    [[0, 0], [.49, 0], [.49, .47], [0, .47]],
    [[.51, 0], [1, 0], [1, .47], [.51, .47]],
    [[0, .49], [.49, .49], [.49, .96], [0, .96]],
    [[.51, .49], [1, .49], [1, .96], [.51, .96]],
  ],
  hero: [
    [[0, 0], [.67, 0], [.67, .84], [0, .84]],
    [[.69, 0], [1, 0], [1, .41], [.69, .41]],
    [[.69, .43], [1, .43], [1, .84], [.69, .84]],
    [[0, .86], [1, .86], [1, 1], [0, 1]],
  ],
};

// Colour stories: a warm dusk against an electric neon night.
const MOODS = {
  sunset: { pink: [214, 46, 130], orange: [255, 126, 64], cyan: [53, 205, 213] },
  neon: { pink: [246, 30, 154], orange: [111, 54, 224], cyan: [25, 221, 224] },
};

const EXPORT_SIZES = ['1080x1080', '1080x1350', '1920x1080'];
const SAMPLE_NAMES = ['boulevard.jpg', 'pier.jpg'];
const DEFAULT_FRAME = { x: 0, y: 0, z: 1.08 };

export function bootStudio(root = document) {
  const $ = (id) => root.getElementById(id);
  const canvas = $('cover');
  const ctx = canvas.getContext('2d');

  const photos = [];    // loaded pictures, in load order: { image, width, height }
  const assigned = [];  // panel index -> photo index
  const frames = [];    // panel index -> { x, y, z } crop offset and zoom
  let layout = 'collage';
  let active = 0;
  let drag = null;
  let toastTimer;

  const panels = () => LAYOUTS[layout];
  const rgba = (rgb, alpha) => `rgba(${rgb.join(',')},${alpha})`;

  function panelPath(poly, w, h) {
    const path = new Path2D();
    poly.forEach(([px, py], i) => {
      if (i === 0) path.moveTo(px * w, py * h);
      else path.lineTo(px * w, py * h);
    });
    path.closePath();
    return path;
  }

  function panelBox(poly, w, h) {
    const xs = poly.map((p) => p[0] * w);
    const ys = poly.map((p) => p[1] * h);
    const x = Math.min(...xs);
    const y = Math.min(...ys);
    return { x, y, w: Math.max(...xs) - x, h: Math.max(...ys) - y };
  }

  function showToast(message) {
    const toast = $('toast');
    toast.textContent = message;
    toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('show'), 2000);
  }

  // Paint the whole cover at the canvas's full export resolution.
  function drawCover() {
    const w = canvas.width;
    const h = canvas.height;
    const mood = MOODS[$('tone').value] || MOODS.sunset;
    const wash = Number($('intensity').value) / 100;
    const toneOn = $('toneToggle').getAttribute('aria-pressed') === 'true';

    ctx.fillStyle = '#151120';
    ctx.fillRect(0, 0, w, h);

    panels().forEach((poly, i) => {
      const box = panelBox(poly, w, h);
      ctx.save();
      ctx.clip(panelPath(poly, w, h));

      const photoIndex = assigned[i] ?? (photos.length ? i % photos.length : -1);
      const photo = photos[photoIndex];
      const frame = frames[i] || DEFAULT_FRAME;
      if (photo) {
        // Cover-fit the photo into its panel, then apply the user's offset/zoom.
        const scale = Math.max(box.w / photo.width, box.h / photo.height) * frame.z;
        const dw = photo.width * scale;
        const dh = photo.height * scale;
        ctx.drawImage(
          photo.image,
          box.x + box.w / 2 - dw / 2 + frame.x * box.w,
          box.y + box.h / 2 - dh / 2 + frame.y * box.h,
          dw,
          dh,
        );
      } else {
        // No photo in this panel yet: a sunset gradient holds its place.
        const fallback = ctx.createLinearGradient(box.x, box.y, box.x + box.w, box.y + box.h);
        fallback.addColorStop(0, '#3b315d');
        fallback.addColorStop(.55, '#ba557c');
        fallback.addColorStop(1, '#258991');
        ctx.fillStyle = fallback;
        ctx.fillRect(box.x, box.y, box.w, box.h);
      }

      if (toneOn) {
        const tint = ctx.createLinearGradient(box.x, box.y, box.x + box.w * .55, box.y + box.h);
        tint.addColorStop(0, rgba(mood.cyan, wash * .25));
        tint.addColorStop(.55, rgba(mood.pink, wash * .2));
        tint.addColorStop(1, rgba(mood.orange, wash * .5));
        ctx.fillStyle = tint;
        ctx.fillRect(box.x, box.y, box.w, box.h);
      }
      ctx.restore();

      // Seams: the selected panel glows pink, the rest keep a dark edge.
      ctx.strokeStyle = i === active ? '#ff75ba' : '#171326';
      ctx.lineWidth = i === active ? Math.max(3, w / 420) : Math.max(7, w / 180);
      ctx.stroke(panelPath(poly, w, h));
    });

    // A dusk shade across the lower half keeps the headline readable.
    const shade = ctx.createLinearGradient(0, h * .48, 0, h);
    shade.addColorStop(0, 'transparent');
    shade.addColorStop(.48, rgba(mood.pink, .2));
    shade.addColorStop(1, 'rgba(10,6,20,.9)');
    ctx.fillStyle = shade;
    ctx.fillRect(0, 0, w, h);

    drawHeadline(w, h);
    drawCaptions(w, h);

    // Fine grain for a printed-poster feel, at fixed spots, never random.
    ctx.save();
    ctx.globalAlpha = .1;
    ctx.fillStyle = '#fff';
    for (let n = 0; n < 170; n++) {
      ctx.fillRect(
        ((n * 7919) % 997) / 997 * w,
        ((n * 3571) % 991) / 991 * h,
        Math.max(1, w / 1400),
        Math.max(1, h / 850),
      );
    }
    ctx.restore();
  }

  function drawHeadline(w, h) {
    const pad = w * .058;
    const onTop = $('titlePosition').value === 'top';
    const words = ($('caption').value || 'YOUR CITY').trim().toUpperCase().split(/\s+/);
    let size = h * (h > w ? .105 : .17);
    let lines = [''];

    const wrap = () => {
      lines = [''];
      for (const word of words) {
        const last = lines.length - 1;
        const joined = lines[last] ? `${lines[last]} ${word}` : word;
        if (ctx.measureText(joined).width > w - pad * 2 && last === 0) lines.push(word);
        else lines[last] = joined;
      }
    };

    // Shrink the headline until at most two lines fit the canvas width.
    do {
      ctx.font = `${size}px Anton,Impact,sans-serif`;
      wrap();
      if (lines.some((line) => ctx.measureText(line).width > w - pad * 2)) size *= .94;
    } while (lines.some((line) => ctx.measureText(line).width > w - pad * 2) && size > 18);

    const gap = size * .84;
    const base = onTop ? h * .2 : h - h * .13 - (lines.length - 1) * gap;
    ctx.save();
    ctx.translate(pad, base);
    ctx.rotate(-.025);
    ctx.font = `${size}px Anton,Impact,sans-serif`;
    ctx.lineJoin = 'round';
    ctx.lineWidth = size * .1;
    ctx.strokeStyle = '#26102f';
    ctx.shadowColor = '#10091d';
    ctx.shadowBlur = size * .15;
    ctx.shadowOffsetY = h * .008;
    lines.slice(0, 2).forEach((line, i) => {
      ctx.strokeText(line, 0, i * gap);
      ctx.fillStyle = $('titleColor').value;
      ctx.fillText(line, 0, i * gap);
    });
    ctx.restore();
  }

  function drawCaptions(w, h) {
    const pad = w * .058;
    const onTop = $('titlePosition').value === 'top';
    const subY = onTop ? h * .27 : h - h * .055;

    ctx.textAlign = 'left';
    ctx.fillStyle = '#ffd3e5';
    ctx.font = `800 ${Math.max(13, h * .022)}px sans-serif`;
    ctx.fillText(($('subtitle').value || '').toUpperCase(), pad + 2, subY);

    ctx.textAlign = 'right';
    ctx.fillStyle = '#fff9';
    ctx.font = `700 ${Math.max(10, h * .014)}px sans-serif`;
    ctx.fillText('VICEFRAME  /  ORIGINAL CITY STORIES', w - pad, subY);

    ctx.textAlign = 'left';
    ctx.fillStyle = '#ffb7d8';
    ctx.font = `700 ${Math.max(9, h * .012)}px sans-serif`;
    ctx.fillText('VOL. 01  •  THE NIGHT IS YOURS', pad, h * .075);
  }

  // Sizing and selection.
  function applySize() {
    const [w, h] = $('size').value.split('x').map(Number);
    canvas.width = w;
    canvas.height = h;
    canvas.style.aspectRatio = `${w}/${h}`;
    $('sizeLabel').innerHTML = `${w} × ${h} <span>▣</span>`;
    drawCover();
  }

  function selectPanel() {
    $('activePanel').textContent = `PANEL ${String(active + 1).padStart(2, '0')}`;
    root.querySelectorAll('.photo-pick').forEach((button) => {
      button.classList.toggle('assigned', Number(button.dataset.photo) === assigned[active]);
    });
    $('zoom').value = Math.round((frames[active]?.z || DEFAULT_FRAME.z) * 100);
    drawCover();
  }

  function fillUnassignedPanels() {
    panels().forEach((_, i) => {
      if (assigned[i] == null && photos.length) assigned[i] = i % photos.length;
    });
  }

  // Photos: uploads from the device plus the two bundled samples.
  function addPhoto(file, image) {
    const index = photos.push({ image, width: image.naturalWidth, height: image.naturalHeight }) - 1;
    const button = root.createElement('button');
    button.type = 'button';
    button.className = 'photo-pick';
    button.dataset.photo = index;
    button.title = `Place ${file.name || 'sample photo'} in selected panel`;
    const thumb = root.createElement('img');
    thumb.className = 'photo-thumb';
    thumb.src = image.src;
    thumb.alt = file.name || 'Sample photo';
    button.append(thumb);
    button.onclick = () => {
      assigned[active] = index;
      selectPanel();
      showToast('Photo placed in selected panel');
    };
    $('photoTray').append(button);
    if (index === 0) panels().forEach((_, n) => { assigned[n] = 0; });
    $('photoCount').textContent = `${photos.length} PHOTO${photos.length === 1 ? '' : 'S'}`;
    selectPanel();
  }

  function loadFile(file) {
    if (!file.type.startsWith('image/')) return;
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => { addPhoto(file, image); URL.revokeObjectURL(url); };
    image.onerror = () => { URL.revokeObjectURL(url); showToast(`Could not open ${file.name}`); };
    image.src = url;
  }

  function loadSample(name) {
    return new Promise((resolve) => {
      const image = new Image();
      image.onload = () => { addPhoto({ name }, image); resolve(); };
      image.onerror = resolve;
      image.src = `./samples/${name}`;
    });
  }

  // Export the canvas at its full size as a PNG download.
  function exportPNG() {
    canvas.toBlob((blob) => {
      if (!blob) return showToast('PNG export failed');
      const [w, h] = $('size').value.split('x');
      const url = URL.createObjectURL(blob);
      const link = root.createElement('a');
      link.href = url;
      link.download = `viceframe-${w}x${h}.png`;
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1500);
      showToast(`Cover exported · ${w} × ${h} PNG`);
    }, 'image/png');
  }

  // Wiring: controls, templates, and canvas pointer input.
  $('photoInput').onchange = (event) => {
    [...event.target.files].forEach(loadFile);
    event.target.value = '';
  };

  root.querySelectorAll('.template').forEach((button) => {
    button.onclick = () => {
      layout = button.dataset.layout;
      active = 0;
      root.querySelectorAll('.template').forEach((other) => {
        other.classList.toggle('selected', other === button);
      });
      fillUnassignedPanels();
      selectPanel();
    };
  });

  ['caption', 'subtitle'].forEach((id) => { $(id).oninput = drawCover; });
  ['titleColor', 'titlePosition', 'tone'].forEach((id) => { $(id).onchange = drawCover; });
  $('size').onchange = applySize;
  $('intensity').oninput = (event) => {
    $('intensityValue').value = `${event.target.value}%`;
    drawCover();
  };
  $('zoom').oninput = (event) => {
    frames[active] = frames[active] || { ...DEFAULT_FRAME };
    frames[active].z = Number(event.target.value) / 100;
    drawCover();
  };
  $('toneToggle').onclick = (event) => {
    const next = event.currentTarget.getAttribute('aria-pressed') !== 'true';
    event.currentTarget.setAttribute('aria-pressed', String(next));
    event.currentTarget.classList.toggle('on', next);
    drawCover();
  };
  $('addPhoto').onclick = () => $('photoInput').click();
  $('exportTop').onclick = exportPNG;

  // Click a panel to select it; drag inside it to reframe its photo.
  canvas.onpointerdown = (event) => {
    const rect = canvas.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width;
    const y = (event.clientY - rect.top) / rect.height;
    const hit = panels().findIndex((poly) => ctx.isPointInPath(panelPath(poly, 1, 1), x, y));
    if (hit < 0) return;
    active = hit;
    selectPanel();
    drag = { x, y };
    canvas.setPointerCapture(event.pointerId);
  };
  canvas.onpointermove = (event) => {
    if (!drag || assigned[active] == null) return;
    const rect = canvas.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width;
    const y = (event.clientY - rect.top) / rect.height;
    frames[active] = frames[active] || { ...DEFAULT_FRAME };
    frames[active].x += x - drag.x;
    frames[active].y += y - drag.y;
    drag = { x, y };
    drawCover();
  };
  canvas.onpointerup = () => { drag = null; };
  canvas.onpointercancel = () => { drag = null; };

  // Start: paint the empty frame, load the bundled samples, honour ?shot=.
  applySize();
  const params = new URLSearchParams(location.search);
  const shot = params.get('shot');
  const wanted = (params.get('photos') || params.get('photo') || '')
    .split(',')
    .map((name) => name.trim())
    .filter((name) => SAMPLE_NAMES.includes(name));
  const orderedSamples = [...wanted, ...SAMPLE_NAMES.filter((name) => !wanted.includes(name))];

  Promise.all(orderedSamples.map(loadSample)).then(() => {
    panels().forEach((_, i) => { assigned[i] = i % Math.max(photos.length, 1); });
    if (shot === 'cover' || shot === 'editor') {
      if (params.has('layout') && LAYOUTS[params.get('layout')]) {
        layout = params.get('layout');
        root.querySelectorAll('.template').forEach((button) => {
          button.classList.toggle('selected', button.dataset.layout === layout);
        });
      }
      if (params.has('size') && EXPORT_SIZES.includes(params.get('size'))) {
        $('size').value = params.get('size');
      }
      if (params.has('caption')) $('caption').value = params.get('caption');
      if (params.has('subtitle')) $('subtitle').value = params.get('subtitle');
      if (shot === 'cover') root.body.classList.add('shot-cover');
      applySize();
    }
    selectPanel();
    window.__shotReady = true;
  });
}
