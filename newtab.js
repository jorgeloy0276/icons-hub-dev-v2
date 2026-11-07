/* ===== 1. DATOS ===== */
const COLORS = ['#ff3b4e','#4285f4','#10b981','#25d366','#f59e0b','#a855f7','#ec4899','#06b6d4'];

// n = nombre, u = url, i = icono (vacío = logo automático), c = color del halo
const DEFAULTS = [
  { n:'YouTube',          u:'https://www.youtube.com',     i:'',   c:'#ff3b4e' },
  { n:'Google',           u:'https://www.google.com',      i:'',   c:'#4285f4' },
  { n:'Mi banca en línea',u:'',                            i:'🏦', c:'#10b981' },
  { n:'Gmail',            u:'https://mail.google.com',     i:'',   c:'#ec4899' },
  { n:'WhatsApp',         u:'https://web.whatsapp.com',    i:'',   c:'#25d366' },
  { n:'Maps',             u:'https://maps.google.com',     i:'',   c:'#f59e0b' },
  { n:'Netflix',          u:'https://www.netflix.com',     i:'',   c:'#a855f7' },
  { n:'Drive',            u:'https://drive.google.com',    i:'',   c:'#06b6d4' }
];

/* ===== 2. ESTADO Y PERSISTENCIA (localStorage) ===== */
const KEY = 'inicio:v2';
let state = { title: 'Icons-Hub-Krypton Logic', items: DEFAULTS };
let editing = false, editIdx = -1, color = COLORS[0];

try {
  const saved = JSON.parse(localStorage.getItem(KEY));
  if (saved && Array.isArray(saved.items)) state = saved;
} catch (e) {}
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) {} };

const $ = id => document.getElementById(id);
const grid = $('grid'), title = $('title');
title.textContent = state.title || 'Mi Empresa';

/* ===== 3. ICONOS ===== */
// Regla: "" -> favicon automático | "img/x.svg" o "https://..." -> imagen | otra cosa -> texto/emoji
function buildIcon(it) {
  const ico = document.createElement('span');
  ico.className = 'ico';
  const v = (it.i || '').trim();
  const letter = (it.n || '?').charAt(0).toUpperCase();
  let src = '';

  if (/^(https?:|data:|img\/)/i.test(v)) src = v;
  else if (!v && it.u) {
    try { src = 'https://www.google.com/s2/favicons?domain=' + new URL(it.u).hostname + '&sz=128'; } catch (e) {}
  }

  if (src) {
    const img = new Image();
    img.alt = '';
    img.addEventListener('error', () => { ico.classList.remove('img'); ico.textContent = letter; }); // respaldo
    img.src = src;
    ico.classList.add('img');
    ico.appendChild(img);
  } else {
    ico.textContent = v || letter;
  }
  return ico;
}

/* ===== 4. DIBUJAR LA CUADRÍCULA ===== */
const fixUrl = u => { u = (u || '').trim(); return !u ? '' : /^https?:\/\//i.test(u) ? u : 'https://' + u; };

function render() {
  grid.className = 'grid' + (editing ? ' edit' : '');
  grid.innerHTML = '';

  state.items.forEach((it, idx) => {
    // En modo normal con URL es un <a>; en edición (o sin URL) es un <button>
    const tile = document.createElement(editing || !it.u ? 'button' : 'a');
    tile.className = 'tile';
    tile.style.setProperty('--c', it.c);
    tile.style.setProperty('--i', idx);
    if (tile.tagName === 'A') tile.href = it.u;

    const name = document.createElement('span');
    name.className = 'name';
    name.textContent = it.n;
    tile.append(buildIcon(it), name);

    tile.addEventListener('click', e => { if (editing || !it.u) { e.preventDefault(); openForm(idx); } });

    const x = document.createElement('span');
    x.className = 'x'; x.textContent = '×'; x.title = 'Eliminar';
    x.addEventListener('click', e => {
      e.preventDefault(); e.stopPropagation();
      state.items.splice(idx, 1); save(); render();
    });
    tile.appendChild(x);

    addTilt(tile);
    grid.appendChild(tile);
  });

  const add = document.createElement('button');
  add.className = 'tile add';
  add.style.setProperty('--i', state.items.length);
  add.innerHTML = '<span class="ico">+</span><span class="name">Añadir</span>';
  add.addEventListener('click', () => openForm(-1));
  addTilt(add);
  grid.appendChild(add);
}

/* ===== 5. EFECTO: halo + inclinación 3D según el mouse ===== */
function addTilt(el) {
  el.addEventListener('pointermove', e => {
    const r = el.getBoundingClientRect();
    const x = e.clientX - r.left, y = e.clientY - r.top;
    el.style.setProperty('--mx', x + 'px');                         // el CSS usa esto para el halo
    el.style.setProperty('--my', y + 'px');
    el.style.setProperty('--ry', ((x / r.width  - .5) * 10) + 'deg');  // inclinación horizontal
    el.style.setProperty('--rx', ((.5 - y / r.height) * 10) + 'deg');  // inclinación vertical
  });
  el.addEventListener('pointerleave', () => {
    el.style.setProperty('--rx', '0deg'); el.style.setProperty('--ry', '0deg');
  });
}

/* ===== 6. FORMULARIO (añadir / editar) ===== */
function drawSwatches() {
  $('sw').innerHTML = '';
  COLORS.forEach(c => {
    const b = document.createElement('button');
    b.type = 'button';
    b.style.setProperty('--c', c);
    b.setAttribute('aria-label', 'Color ' + c);
    if (c === color) b.className = 'sel';
    b.addEventListener('click', () => { color = c; drawSwatches(); });
    $('sw').appendChild(b);
  });
}
function openForm(idx) {
  editIdx = idx;
  const it = idx >= 0 ? state.items[idx] : { n:'', u:'', i:'', c: COLORS[state.items.length % COLORS.length] };
  $('dt').textContent = idx >= 0 ? 'Editar acceso' : 'Nuevo acceso';
  $('fName').value = it.n; $('fUrl').value = it.u; $('fIco').value = it.i;
  color = it.c; drawSwatches();
  $('ov').classList.add('show');
  setTimeout(() => $('fName').focus(), 30);
}
const closeForm = () => $('ov').classList.remove('show');

$('cancel').addEventListener('click', closeForm);
$('ov').addEventListener('click', e => { if (e.target === $('ov')) closeForm(); });
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') closeForm();
  if (e.key === 'Enter' && $('ov').classList.contains('show')) $('save').click();
});
$('save').addEventListener('click', () => {
  const n = $('fName').value.trim();
  if (!n) { $('fName').focus(); return; }
  const it = { n, u: fixUrl($('fUrl').value), i: $('fIco').value.trim(), c: color };
  if (editIdx >= 0) state.items[editIdx] = it; else state.items.push(it);
  save(); closeForm(); render();
});

/* ===== 7. MODO EDICIÓN Y RESTAURAR ===== */
$('editBtn').addEventListener('click', () => {
  editing = !editing;
  $('editBtn').textContent = editing ? 'Listo' : 'Editar';
  $('editBtn').classList.toggle('on', editing);
  $('tools').style.display = editing ? 'inline-flex' : 'none';
  title.contentEditable = editing ? 'true' : 'false';
  $('sub').textContent = editing
    ? 'Toca el título para cambiar tu nombre. Toca un acceso para editarlo.'
    : 'Tus sitios favoritos, a un clic';
  if (!editing) {
    state.title = title.textContent.trim() || 'Mi Empresa';
    title.textContent = state.title;
    save();
  }
  render();
});

$('restBtn').addEventListener('click', () => {
  const have = state.items.map(i => i.n);
  DEFAULTS.forEach((d, k) => {
    if (!have.includes(d.n)) state.items.splice(Math.min(k, state.items.length), 0, { ...d });
  });
  save(); render();
});

/* ===== 8. EXPORTAR / IMPORTAR (para pasar tu inicio a otro navegador) ===== */
$('expBtn').addEventListener('click', () => {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'mi-inicio.json';
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
});

$('impBtn').addEventListener('click', () => $('impFile').click());
$('impFile').addEventListener('change', async e => {
  const file = e.target.files[0];
  e.target.value = '';                       // permite volver a elegir el mismo archivo
  if (!file) return;
  try {
    const data = JSON.parse(await file.text());
    if (!data || !Array.isArray(data.items)) throw new Error('formato');
    // Se limpia cada elemento: nunca se confía en un archivo de fuera
    const items = data.items
      .filter(it => it && typeof it.n === 'string' && it.n.trim())
      .map(it => ({
        n: it.n.trim().slice(0, 24),
        u: typeof it.u === 'string' ? fixUrl(it.u) : '',
        i: typeof it.i === 'string' ? it.i.trim().slice(0, 120) : '',
        c: /^#[0-9a-f]{6}$/i.test(it.c) ? it.c : COLORS[0]
      }));
    if (!items.length) throw new Error('vacío');
    if (!confirm('Esto reemplaza tus accesos actuales por los del archivo (' + items.length + '). ¿Continuar?')) return;
    state = { title: typeof data.title === 'string' && data.title.trim() ? data.title.trim().slice(0, 60) : state.title, items };
    title.textContent = state.title;
    save(); render();
  } catch (err) {
    alert('No pude leer ese archivo. Usa uno exportado desde Mi Inicio (mi-inicio.json).');
  }
});

render();
