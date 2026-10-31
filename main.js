// Truchet Weaver — generative maze patterns from quarter-circle tiles.
// Core idea: pick arc orientation per tile; connections remain consistent
// at tile boundaries, so drawn strands are continuous across the grid.

const canvas = document.getElementById('c');
const ctx = canvas.getContext('2d');

const params = {
  grid: 24, stroke: 6, hue: 180, spread: 120,
  style: 'arcs', bg: '#0e0e12',
};

let seed = Math.random() * 2 ** 32;
let tiles = [];
let animating = false;
let animProgress = 0;

// Mulberry32 PRNG — deterministic per seed.
function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function generate() {
  const rnd = mulberry32(seed);
  tiles = [];
  for (let y = 0; y < params.grid; y++) {
    for (let x = 0; x < params.grid; x++) {
      let style = params.style;
      if (style === 'mixed') {
        const r = rnd();
        style = r < 0.5 ? 'arcs' : (r < 0.85 ? 'lines' : 'semis');
      }
      tiles.push({ x, y, flip: rnd() < 0.5, style, delay: rnd() });
    }
  }
}

function hsl(h, s, l, a = 1) {
  return `hsla(${((h % 360) + 360) % 360},${s}%,${l}%,${a})`;
}

function drawTile(t, size, tGlobal) {
  const px = t.x * size, py = t.y * size, s = size, h = s / 2;
  const hue = params.hue + ((t.x / params.grid + t.y / params.grid) / 2) * params.spread;
  const lineWidth = Math.max(1, (params.stroke / 24) * s);

  // Reveal progress during animation
  const reveal = animating
    ? Math.min(1, Math.max(0, (tGlobal - t.delay * 0.6) / 0.4))
    : 1;
  if (reveal <= 0) return;

  ctx.strokeStyle = hsl(hue, 78, 60);
  ctx.lineWidth = lineWidth;
  ctx.lineCap = 'round';

  const frac = (n) => n * s;
  const arc = (cx, cy, r, a0, a1) => {
    ctx.beginPath();
    ctx.arc(frac(cx), frac(cy), frac(r), a0, a1);
    ctx.stroke();
  };
  const line = (x0, y0, x1, y1) => {
    ctx.beginPath();
    ctx.moveTo(frac(x0), frac(y0));
    ctx.lineTo(frac(x1), frac(y1));
    ctx.stroke();
  };

  // Partial draw for animation
  const full = (fn) => {
    ctx.save();
    ctx.beginPath();
    ctx.rect(frac(t.x), frac(t.y), frac(1), frac(1) * reveal);
    ctx.clip();
    fn();
    ctx.restore();
  };

  full(() => {
    if (t.style === 'lines') {
      if (t.flip) line(0, 0, 1, 1); else line(1, 0, 0, 1);
    } else if (t.style === 'semis') {
      if (t.flip) arc(0.5, 0, 0.5, 0, Math.PI);
      else arc(0.5, 1, 0.5, Math.PI, Math.PI * 2);
    } else { // arcs
      if (t.flip) { arc(0, 0, 0.5, 0, Math.PI / 2); arc(1, 1, 0.5, Math.PI, Math.PI * 1.5); }
      else { arc(1, 0, 0.5, Math.PI / 2, Math.PI); arc(0, 1, 0.5, Math.PI * 1.5, Math.PI * 2); }
    }
  });
}

function render(tGlobal = 1) {
  const stage = document.getElementById('stage');
  const size = Math.min(stage.clientWidth, stage.clientHeight) - 48;
  const px = Math.max(200, Math.floor(size));
  canvas.width = px;
  canvas.height = px;

  ctx.fillStyle = params.bg;
  ctx.fillRect(0, 0, px, px);
  const cell = px / params.grid;

  const gap = params.grid > 30 ? 0.6 : 0; // subtle gap at high densities handled by stroke caps
  for (const t of tiles) drawTile(t, cell, tGlobal);
}

function reseed() {
  seed = Math.random() * 2 ** 32;
  generate();
  animating = false;
  animProgress = 0;
  render();
}

function startAnim() {
  generate();
  animating = true;
  animProgress = 0;
  const t0 = performance.now();
  const dur = 1400;
  (function step(now) {
    if (!animating) return;
    const t = (now - t0) / dur;
    render(t);
    if (t < 1.01) requestAnimationFrame(step);
    else { animating = false; render(1); }
  })(t0);
}

// --- SVG export (vector) ---
function buildSVG() {
  const px = 1000, cell = px / params.grid;
  const hsl2 = (h) => `hsl(${((h % 360) + 360) % 360},78%,60%)`;
  let out = '';
  for (const t of tiles) {
    const hue = params.hue + ((t.x / params.grid + t.y / params.grid) / 2) * params.spread;
    const col = hsl2(hue);
    const w = Math.max(1, (params.stroke / 24) * cell);
    const f = (n) => (n * cell).toFixed(3);
    const X = t.x * cell, Y = t.y * cell;
    const d = [];
    if (t.style === 'lines') {
      d.push(t.flip ? `M ${f(0)} ${f(0)} L ${f(1)} ${f(1)}` : `M ${f(1)} ${f(0)} L ${f(0)} ${f(1)}`);
    } else if (t.style === 'semis') {
      // Semicircle through tile midpoints: arc centered on edge midpoint
      if (t.flip) d.push(`M ${f(0)} ${f(0.5)} A ${f(0.5)} ${f(0.5)} 0 0 1 ${f(1)} ${f(0.5)}`);
      else d.push(`M ${f(0)} ${f(0.5)} A ${f(0.5)} ${f(0.5)} 0 0 0 ${f(1)} ${f(0.5)}`);
    } else { // arcs
      if (t.flip) {
        d.push(`M ${f(0.5)} ${f(0)} A ${f(0.5)} ${f(0.5)} 0 0 1 ${f(0)} ${f(0.5)}`);
        d.push(`M ${f(1)} ${f(0.5)} A ${f(0.5)} ${f(0.5)} 0 0 1 ${f(0.5)} ${f(1)}`);
      } else {
        d.push(`M ${f(0.5)} ${f(0)} A ${f(0.5)} ${f(0.5)} 0 0 0 ${f(1)} ${f(0.5)}`);
        d.push(`M ${f(0)} ${f(0.5)} A ${f(0.5)} ${f(0.5)} 0 0 0 ${f(0.5)} ${f(1)}`);
      }
    }
    out += `<g transform="translate(${X.toFixed(2)},${Y.toFixed(2)})" fill="none" stroke="${col}" stroke-width="${w.toFixed(3)}" stroke-linecap="round">${d.map(p => `<path d="${p}"/>`).join('')}</g>\n`;
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${px}" height="${px}" viewBox="0 0 ${px} ${px}"><rect width="${px}" height="${px}" fill="${params.bg}"/>\n${out}</svg>`;
}

// --- Controls wiring ---
const bind = (id, key, fmt = parseFloat) => {
  const el = document.getElementById(id);
  const label = document.getElementById('v' + id.charAt(0).toUpperCase() + id.slice(1));
  el.addEventListener('input', () => {
    params[key] = fmt(el.value);
    if (label) label.textContent = el.value;
    render();
  });
};
bind('grid', 'grid', parseInt);
bind('stroke', 'stroke', parseInt);
bind('hue', 'hue', parseInt);
bind('spread', 'spread', parseInt);
document.getElementById('style').addEventListener('change', e => { params.style = e.target.value; generate(); render(); });
document.getElementById('bg').addEventListener('change', e => { params.bg = e.target.value; render(); });
document.getElementById('regen').addEventListener('click', reseed);
document.getElementById('anim').addEventListener('click', startAnim);
document.getElementById('png').addEventListener('click', () => {
  const a = document.createElement('a');
  a.download = 'truchet-weaver.png';
  a.href = canvas.toDataURL('image/png');
  a.click();
});
document.getElementById('svg').addEventListener('click', () => {
  const blob = new Blob([buildSVG()], { type: 'image/svg+xml' });
  const a = document.createElement('a');
  a.download = 'truchet-weaver.svg';
  a.href = URL.createObjectURL(blob);
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
});

// Click canvas to reseed
canvas.addEventListener('click', reseed);

generate();
render();
