const layouts = {
  collage: [
    [[0, 0], [.34, 0], [.25, .55], [0, .66]],
    [[.36, 0], [.69, 0], [.58, .56], [.27, .56]],
    [[.71, 0], [1, 0], [1, .53], [.61, .53]],
    [[0, .69], [.24, .58], [.55, .59], [.46, 1], [0, 1]],
    [[.58, .57], [1, .56], [1, 1], [.49, 1]],
  ],
  grid: [
    [[0, 0], [.49, 0], [.49, .47], [0, .47]],
    [[.51, 0], [1, 0], [1, .47], [.51, .47]],
    [[0, .49], [.49, .49], [.49, .96], [0, .96]],
    [[.51, .49], [1, .49], [1, .96], [.51, .96]],
  ],
  hero: [
    [[0, 0], [.67, 0], [.67, .84], [0, .84]],
    [[.69, 0], [1, 0], [1, .42], [.69, .42]],
    [[.69, .44], [1, .44], [1, .84], [.69, .84]],
  ],
};

const palettes = {
  sunset: { a: [255, 115, 73], b: [217, 39, 141], c: [39, 202, 211] },
  neon: { a: [246, 34, 149], b: [83, 42, 210], c: [32, 225, 221] },
};

export function bootStudio() {
  const canvas = document.querySelector('#cover');
  const ctx = canvas.getContext('2d');
  const byId = (id) => document.getElementById(id);
  const photos = [];
  const assignments = [];
  let layout = 'collage';
  let active = 0;
  let intensity = .54;
  let zoom = 1.16;
  let toneEnabled = true;
  let dragging = null;
  let toastTimer;

  function polygonPath(points, w, h) {
    const path = new Path2D();
    path.moveTo(points[0][0] * w, points[0][1] * h);
    for (let i = 1; i < points.length; i++) path.lineTo(points[i][0] * w, points[i][1] * h);
    path.closePath();
    return path;
  }

  function wrapHeadline(text, maxWidth, maxLines) {
    const words = text.trim().toUpperCase().split(/\s+/).filter(Boolean);
    const lines = [];
    let line = '';
    for (const word of words) {
      const next = line ? `${line} ${word}` : word;
      if (ctx.measureText(next).width > maxWidth && line) {
        lines.push(line);
        line = word;
      } else line = next;
    }
    if (line) lines.push(line);
    if (lines.length > maxLines) {
      const rest = lines.splice(maxLines - 1).join(' ');
      lines.push(rest);
      while (ctx.measureText(lines[maxLines - 1]).width > maxWidth && lines[maxLines - 1].length > 5) {
        lines[maxLines - 1] = `${lines[maxLines - 1].slice(0, -2)}…`;
      }
    }
    return lines;
  }

  function fitPhoto(photo, polygon, index, w, h) {
    const xs = polygon.map((p) => p[0] * w);
    const ys = polygon.map((p) => p[1] * h);
    const x = Math.min(...xs), y = Math.min(...ys);
    const pw = Math.max(...xs) - x, ph = Math.max(...ys) - y;
    ctx.save();
    ctx.clip(polygonPath(polygon, w, h));
    if (photo) {
      const scale = Math.max(pw / photo.image.naturalWidth, ph / photo.image.naturalHeight) * (index === active ? zoom : 1.12);
      const dw = photo.image.naturalWidth * scale, dh = photo.image.naturalHeight * scale;
      const centerX = x + pw / 2 + (photo.offsetX || 0) * pw;
      const centerY = y + ph / 2 + (photo.offsetY || 0) * ph;
      ctx.drawImage(photo.image, centerX - dw / 2, centerY - dh / 2, dw, dh);
    } else {
      const g = ctx.createLinearGradient(x, y, x + pw, y + ph);
      g.addColorStop(0, ['#30284c', '#39304d', '#342444'][index % 3]);
      g.addColorStop(1, ['#b84f69', '#337984', '#815177'][index % 3]);
      ctx.fillStyle = g;
      ctx.fillRect(x, y, pw, ph);
      ctx.save();
      ctx.globalAlpha = .2;
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = Math.max(2, w / 600);
      for (let i = 0; i < 7; i++) {
        ctx.beginPath(); ctx.moveTo(x + i * pw / 5, y); ctx.lineTo(x + i * pw / 5 - pw * .28, y + ph); ctx.stroke();
      }
      ctx.restore();
    }
    if (toneEnabled) {
      const pal = palettes[byId('tone').value];
      const tint = ctx.createLinearGradient(x, y, x + pw * .65, y + ph);
      tint.addColorStop(0, `rgba(${pal.c.join(',')},${intensity * .23})`);
      tint.addColorStop(.48, `rgba(${pal.b.join(',')},${intensity * .1})`);
      tint.addColorStop(1, `rgba(${pal.a.join(',')},${intensity * .52})`);
      ctx.fillStyle = tint;
      ctx.fillRect(x, y, pw, ph);
    }
    if (index === active) {
      ctx.strokeStyle = '#ff65aa';
      ctx.lineWidth = Math.max(2, w / 540);
      ctx.stroke(polygonPath(polygon, w, h));
    } else {
      ctx.strokeStyle = 'rgba(17,13,31,.9)';
      ctx.lineWidth = Math.max(4, w / 230);
      ctx.stroke(polygonPath(polygon, w, h));
    }
    ctx.restore();
  }

  function draw() {
    const w = canvas.width, h = canvas.height;
    const panels = layouts[layout];
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = '#161324';
    ctx.fillRect(0, 0, w, h);
    panels.forEach((polygon, i) => fitPhoto(photos.length ? photos[assignments[i] ?? (i % photos.length)] : null, polygon, i, w, h));

    const pal = palettes[byId('tone').value];
    const vignette = ctx.createRadialGradient(w * .5, h * .44, h * .05, w * .5, h * .48, w * .78);
    vignette.addColorStop(0, 'rgba(15,10,27,0)');
    vignette.addColorStop(1, 'rgba(11,8,26,.58)');
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, w, h);

    const shade = ctx.createLinearGradient(0, h * .55, 0, h);
    shade.addColorStop(0, 'rgba(15,10,28,0)');
    shade.addColorStop(.36, `rgba(${pal.b.join(',')},.22)`);
    shade.addColorStop(1, 'rgba(12,8,23,.82)');
    ctx.fillStyle = shade;
    ctx.fillRect(0, 0, w, h);

    const pad = w * .057;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = byId('titleColor').value;
    ctx.shadowColor = 'rgba(15,7,24,.72)';
    ctx.shadowBlur = w * .013;
    ctx.shadowOffsetX = w * .002;
    ctx.shadowOffsetY = h * .008;
    let size = h * (h > w ? .106 : .16);
    ctx.font = `${size}px Anton, Impact, sans-serif`;
    let lines = wrapHeadline(byId('caption').value || 'YOUR CITY', w - pad * 2, 2);
    while (Math.max(...lines.map((line) => ctx.measureText(line).width)) > w - pad * 2 && size > 18) {
      size *= .93;
      ctx.font = `${size}px Anton, Impact, sans-serif`;
    }
    const lineGap = size * .86;
    const topLockup = byId('titlePosition').value === 'top';
    const baseline = topLockup ? h * .19 : h - h * .12 - (lines.length - 1) * lineGap;
    if (topLockup) {
      const band = ctx.createLinearGradient(0, 0, 0, h * .42);
      band.addColorStop(0, 'rgba(12,8,23,.72)');
      band.addColorStop(1, 'rgba(12,8,23,0)');
      ctx.fillStyle = band;
      ctx.fillRect(0, 0, w, h * .42);
      ctx.fillStyle = byId('titleColor').value;
    }
    ctx.lineWidth = Math.max(3, size * .055);
    ctx.strokeStyle = 'rgba(27,12,36,.85)';
    lines.forEach((line, i) => {
      const y = baseline + i * lineGap;
      ctx.strokeText(line, pad, y);
      ctx.fillText(line, pad, y);
    });
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;

    ctx.font = `700 ${Math.max(12, h * .021)}px ui-sans-serif, sans-serif`;
    ctx.letterSpacing = `${Math.max(1, w * .0016)}px`;
    ctx.fillStyle = '#ffbddc';
    ctx.fillText((byId('subtitle').value || '').toUpperCase(), pad + 2, topLockup ? h * .25 : h - h * .052);
    ctx.letterSpacing = '0px';
    ctx.textAlign = 'right';
    ctx.fillStyle = 'rgba(255,255,255,.78)';
    ctx.font = `700 ${Math.max(9, h * .013)}px ui-sans-serif, sans-serif`;
    ctx.fillText('VICEFRAME  /  ORIGINAL CITY STORIES', w - pad, topLockup ? h * .25 : h - h * .052);

    // A subtle print grain gives the cover a tactile poster finish.
    ctx.save();
    ctx.globalAlpha = .1;
    ctx.fillStyle = '#fff';
    for (let i = 0; i < 170; i++) {
      const x = ((i * 7919) % 997) / 997 * w;
      const y = ((i * 3571) % 991) / 991 * h;
      ctx.fillRect(x, y, Math.max(1, w / 1400), Math.max(1, h / 850));
    }
    ctx.restore();
  }

  function updateSize() {
    const [w, h] = byId('size').value.split('x').map(Number);
    canvas.width = w;
    canvas.height = h;
    canvas.style.aspectRatio = `${w} / ${h}`;
    byId('sizeLabel').innerHTML = `${w} × ${h} <span>▣</span>`;
    draw();
  }

  function announce(message) {
    const toast = byId('toast');
    toast.textContent = message;
    toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('show'), 2200);
  }

  function addPhoto(file, image) {
    photos.push({ file, image, offsetX: 0, offsetY: 0 });
    const index = photos.length - 1;
    const thumb = document.createElement('button');
    thumb.type = 'button';
    thumb.className = 'photo-pick';
    thumb.title = `Use ${file?.name || 'sample photo'} in the selected panel`;
    thumb.setAttribute('aria-label', thumb.title);
    const preview = document.createElement('img');
    preview.className = 'photo-thumb';
    preview.src = image.src;
    preview.alt = file?.name || 'Sample photo';
    thumb.append(preview);
    thumb.addEventListener('click', () => {
      assignments[active] = index;
      document.querySelectorAll('.photo-pick').forEach((item) => item.classList.toggle('assigned', Number(item.dataset.photo) === assignments[active]));
      draw();
      announce(`Photo assigned to panel ${String(active + 1).padStart(2, '0')}`);
    });
    thumb.dataset.photo = String(index);
    byId('photoTray').append(thumb);
    if (photos.length === 1) assignments.fill(0);
    byId('photoCount').textContent = `${photos.length} PHOTO${photos.length === 1 ? '' : 'S'}`;
    draw();
  }

  byId('photoInput').addEventListener('change', (event) => {
    for (const file of event.target.files || []) {
      if (!file.type.startsWith('image/')) continue;
      const url = URL.createObjectURL(file);
      const image = new Image();
      image.onload = () => addPhoto(file, image);
      image.onerror = () => announce(`Could not load ${file.name}`);
      image.src = url;
    }
    event.target.value = '';
  });
  document.querySelectorAll('.template').forEach((button) => button.addEventListener('click', () => {
    layout = button.dataset.layout;
    active = 0;
    document.querySelectorAll('.template').forEach((item) => item.classList.toggle('selected', item === button));
    byId('activePanel').textContent = 'PANEL 01';
    draw();
  }));
  byId('caption').addEventListener('input', draw);
  byId('subtitle').addEventListener('input', draw);
  byId('titleColor').addEventListener('change', draw);
  byId('titlePosition').addEventListener('change', draw);
  byId('tone').addEventListener('change', draw);
  byId('size').addEventListener('change', updateSize);
  byId('intensity').addEventListener('input', (event) => {
    intensity = Number(event.target.value) / 100;
    byId('intensityValue').value = `${event.target.value}%`;
    draw();
  });
  byId('zoom').addEventListener('input', (event) => {
    zoom = Number(event.target.value) / 100;
    draw();
  });
  byId('toneToggle').addEventListener('click', (event) => {
    toneEnabled = !toneEnabled;
    event.currentTarget.classList.toggle('on', toneEnabled);
    event.currentTarget.setAttribute('aria-pressed', String(toneEnabled));
    draw();
  });
  byId('addPhoto').addEventListener('click', () => byId('photoInput').click());

  function pointerPosition(event) {
    const rect = canvas.getBoundingClientRect();
    return { x: (event.clientX - rect.left) / rect.width, y: (event.clientY - rect.top) / rect.height };
  }
  canvas.addEventListener('pointerdown', (event) => {
    const point = pointerPosition(event);
    const panels = layouts[layout];
    const hit = panels.findIndex((polygon) => ctx.isPointInPath(polygonPath(polygon, 1, 1), point.x, point.y));
    if (hit >= 0) {
      active = hit;
      byId('activePanel').textContent = `PANEL ${String(hit + 1).padStart(2, '0')}`;
      document.querySelectorAll('.photo-pick').forEach((item) => item.classList.toggle('assigned', Number(item.dataset.photo) === assignments[active]));
      dragging = { point, photo: photos[assignments[hit] ?? (hit % Math.max(photos.length, 1))] };
      canvas.setPointerCapture(event.pointerId);
      draw();
    }
  });
  canvas.addEventListener('pointermove', (event) => {
    if (!dragging || !dragging.photo) return;
    const point = pointerPosition(event);
    dragging.photo.offsetX += point.x - dragging.point.x;
    dragging.photo.offsetY += point.y - dragging.point.y;
    dragging.point = point;
    draw();
  });
  canvas.addEventListener('pointerup', () => { dragging = null; });

  function exportPng() {
    canvas.toBlob((blob) => {
      if (!blob) return announce('Export did not complete. Try again.');
      const [w, h] = byId('size').value.split('x');
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `viceframe-${w}x${h}.png`;
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1500);
      announce(`Cover exported · ${w} × ${h} PNG`);
    }, 'image/png');
  }
  byId('exportTop').addEventListener('click', exportPng);

  Promise.all(['boulevard.jpg', 'pier.jpg'].map((name) => new Promise((resolve) => {
    const image = new Image();
    image.onload = () => { addPhoto({ name }, image); resolve(); };
    image.onerror = resolve;
    image.src = `./samples/${name}`;
  }))).then(() => {
    layouts[layout].forEach((_, index) => { assignments[index] = index % Math.max(photos.length, 1); });
    const shot = new URLSearchParams(location.search).get('shot');
    if (shot === 'cover' || shot === 'editor') {
      byId('caption').value = new URLSearchParams(location.search).get('caption') || (shot === 'cover' ? 'SUNSET HEIST' : 'BOULEVARD QUEEN');
      draw();
    }
  });
  updateSize();
}
