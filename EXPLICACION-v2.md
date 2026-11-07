# Icons Hub: guía completa

Una pestaña nueva personalizada para el navegador, con accesos directos a tus sitios, modo oscuro y efectos de luz. Esta guía explica **cómo está hecho**, **cómo instalarlo** en Chrome, Brave y Firefox, y **cómo mantenerlo**.

---

## 0. Resumen rápido

- Es **HTML + CSS + JavaScript puro**. Sin frameworks, sin librerías, sin compilar nada.
- Funciona como **extensión de navegador** que reemplaza la pestaña nueva.
- Tus accesos se guardan en el `localStorage` de la extensión, **en cada navegador por separado**.
- Para pasar tus accesos de un navegador a otro: **Editar → Exportar** e **Importar**.
- Los logos pueden ser automáticos, archivos tuyos, o emojis y letras.

### Archivos del proyecto

```
icons-hub/
├── manifest.json     ← "DNI" de la extensión (nombre, versión, iconos, pestaña nueva)
├── newtab.html       ← estructura de la página
├── newtab.css        ← colores, cuadrícula y efectos
├── newtab.js         ← toda la lógica
├── icons/            ← icono de la extensión (16, 48 y 128 px)
│   ├── icon16.png
│   ├── icon48.png
│   └── icon128.png
└── img/              ← tus propios logos (ej. linkedin.svg)
```

> **Dos manifests.** Chrome/Brave no necesitan la clave de Firefox (`browser_specific_settings`) y la ignoran, aunque a veces muestran un aviso amarillo inofensivo. Si quieres limpieza total, usa uno sin esa clave para Chrome (ver sección 5).

---

## 1. HTML: solo el esqueleto

`newtab.html` tiene la estructura, pero **la cuadrícula está vacía**:

```html
<div class="grid" id="grid"></div>
```

Las tarjetas las crea JavaScript a partir de una lista de datos. Añadir un acceso no toca el HTML: se agrega un elemento a la lista y se vuelve a dibujar.

Otras piezas del HTML:

| Elemento | Para qué sirve |
|---|---|
| `<h1 id="title">` | El título grande (tu nombre o empresa). Editable desde el modo Editar |
| `<p class="sub">` | La frase pequeña bajo el título. Cambia en modo edición para dar instrucciones |
| `.bar` (abajo a la derecha) | Botón **Editar** y, en modo edición, la caja de herramientas `#tools` con **Restaurar originales**, **Exportar** e **Importar** |
| `<input type="file" id="impFile" hidden>` | Selector de archivo oculto; el botón Importar lo "pulsa" por código |
| `.ov` > `.card` | Ventana para añadir o editar un acceso. Está oculta con `display:none` y JS le añade la clase `show` |

**Importante en extensiones (Manifest V3):** el HTML solo puede traer `<script src="newtab.js">`. No se permite JavaScript escrito dentro del HTML ni atributos como `onclick="..."`. Por eso todo usa `addEventListener`.

---

## 2. CSS: de dónde salen los efectos

### Variables CSS
```css
:root { --bg:#0a0b13; --line:#262a40; --text:#eef0fb; ... }
.tile { --c:#6d5efc; }   /* cada tarjeta redefine su propio --c */
```
JavaScript le da a cada tarjeta su color (`tile.style.setProperty('--c', it.c)`) y el CSS lo usa para el ícono, el borde y el brillo. Un solo CSS sirve para ocho colores distintos.

### Cuadrícula responsive
```css
.grid { display:grid; grid-template-columns:repeat(4,1fr); gap:18px; }
@media (max-width:720px) { .grid { grid-template-columns:repeat(3,1fr); } }
@media (max-width:480px) { .grid { grid-template-columns:repeat(2,1fr); } }
```

### El halo que sigue al mouse
```css
.tile::before {
  background: radial-gradient(260px circle at var(--mx) var(--my),
              color-mix(in srgb, var(--c) 38%, transparent), transparent 65%);
  opacity: 0;
}
.tile:hover::before { opacity: 1; }
```
`::before` es un pseudo-elemento: una capa extra sobre la tarjeta. Su degradado está centrado en `--mx` y `--my`, y **JavaScript actualiza esas dos variables cada vez que mueves el mouse**. El CSS no sabe de eventos; JS solo le cambia números.

### Inclinación 3D
```css
.tile { transform: perspective(700px) rotateX(var(--rx)) rotateY(var(--ry)); }
```
JS calcula `--rx` y `--ry` según dónde está el mouse dentro de la tarjeta (máximo 10°). `transition: transform .18s` lo suaviza.

### Animaciones
- `@keyframes drift`: las dos manchas de luz del fondo se mueven despacio (28 s, ida y vuelta).
- `@keyframes in` + `animation-delay: calc(var(--i) * 55ms)`: las tarjetas entran una tras otra. `--i` es la posición que pone JS.
- `@media (prefers-reduced-motion: reduce)`: apaga todo si el sistema operativo lo pide (accesibilidad).

### Logos reales
```css
.ico.img { background:#f4f5fb; }          /* fondo claro para que se vea cualquier logo */
.ico img { width:44px; height:44px; object-fit:contain; }
```

### Modo edición
JS le pone la clase `edit` a la cuadrícula. Con `.edit .x { display:grid }` aparecen las × rojas. El CSS decide qué se ve; JS solo cambia una clase.

### Título con degradado
```css
h1 { background:linear-gradient(...); background-clip:text; color:transparent; }
```
El fondo degradado se recorta con la forma de las letras.

### Tipografía
Usa la fuente del sistema (`system-ui`), sin descargar nada. Si quieres una fuente propia, pon un `.woff2` en la carpeta y cárgalo con `@font-face`. Es lo más seguro en una extensión.

---

## 3. JavaScript: la lógica (`newtab.js`)

El archivo está dividido en 8 bloques numerados en los comentarios.

### Bloque 1: Datos
```js
{ n:'YouTube', u:'https://www.youtube.com', i:'', c:'#ff3b4e' }
//  nombre        dirección                  icono  color
```
Todo el sitio es una lista (`state.items`) de objetos así, más el título. `DEFAULTS` son los 8 accesos de fábrica.

### Bloque 2: Estado y persistencia
```js
localStorage.setItem(KEY, JSON.stringify(state));   // guardar
JSON.parse(localStorage.getItem(KEY));              // leer al abrir
```
`localStorage` guarda texto en el navegador, por eso el estado se convierte a JSON. Todo va dentro de `try/catch` por si el almacenamiento falla. La clave es `inicio:v2`.

### Bloque 3: Iconos, `buildIcon()`
La función decide qué mostrar según lo que escribiste en el campo **Icono**:

| En el campo Icono | Resultado |
|---|---|
| *(vacío)* | Logo automático (favicon del sitio) |
| `🏦` o `L` | Ese emoji o letra |
| `img/linkedin.svg` | Un archivo tuyo en la carpeta `img/` |
| `https://sitio.com/logo.png` | Una imagen de internet |

Si una imagen falla al cargar, el evento `error` pone la primera letra del nombre como respaldo.

> **Privacidad del logo automático:** usa el servicio de favicons de Google (`google.com/s2/favicons?domain=...`), así que Google recibe el dominio de tus accesos. Si no quieres eso, usa siempre archivos locales en `img/`.

### Bloque 4: `render()`
Vacía la cuadrícula y recorre `state.items` creando una tarjeta por elemento, más la tarjeta "+ Añadir". Se llama después de cada cambio.

Detalle: en modo normal, un acceso con URL es un `<a>` (enlace de verdad: clic central y "abrir en pestaña nueva" funcionan). En modo edición, o sin URL, es un `<button>` que abre el formulario.

### Bloque 5: `addTilt(el)`
Escucha `pointermove`, calcula la posición del mouse con `getBoundingClientRect()` y escribe cuatro variables CSS (`--mx --my --rx --ry`). Al salir (`pointerleave`) las regresa a cero.

### Bloque 6: Formulario
- `openForm(idx)`: con `-1` es un acceso nuevo; con otro número edita ese.
- `save`: arma el objeto, lo inserta o reemplaza, guarda y llama a `render()`.
- `fixUrl()`: añade `https://` si lo olvidas.
- Atajos: **Enter** guarda, **Escape** cierra.

### Bloque 7: Modo edición y restaurar
- `editing` (true/false) controla todo. Al activarlo: aparecen las × y las herramientas, el título pasa a `contentEditable`, y clic en una tarjeta abre el formulario en vez de navegar.
- **Restaurar originales:** recorre `DEFAULTS` y reinserta los que falten (compara por nombre). No toca los que añadiste tú.

### Bloque 8: Exportar e Importar
**Exportar:** convierte `state` a JSON, lo mete en un `Blob`, crea un enlace temporal con `download="mi-inicio.json"` y lo pulsa por código.

**Importar:** lee el archivo con `file.text()` y **no confía en él**: filtra cada elemento y lo limpia antes de aceptarlo.
```js
n: it.n.trim().slice(0, 24)                 // nombre: texto, máximo 24 caracteres
u: fixUrl(it.u)                             // dirección normalizada
c: /^#[0-9a-f]{6}$/i.test(it.c) ? it.c : COLORS[0]   // solo colores hex válidos
```
Pide confirmación porque **reemplaza** tus accesos actuales. Si el archivo no sirve, muestra un aviso y no cambia nada.

---

## 4. `manifest.json`: el "DNI" de la extensión

```json
{
  "manifest_version": 3,
  "name": "Icons Hub",
  "version": "1.1",
  "description": "El punto desde el que despegas hacia cualquier sitio.",
  "icons": { "16": "icons/icon16.png", "48": "icons/icon48.png", "128": "icons/icon128.png" },
  "chrome_url_overrides": { "newtab": "newtab.html" },
  "browser_specific_settings": {
    "gecko": {
      "id": "icons-hub-ext@example.com",
      "data_collection_permissions": { "required": ["none"] }
    }
  }
}
```

| Clave | Qué hace |
|---|---|
| `manifest_version: 3` | Formato actual de extensiones |
| `name`, `version`, `description` | Lo que se ve en la lista de extensiones. **Sube la versión cada vez que cambies código y la subas a firmar** |
| `icons` | El icono de la extensión en tres tamaños (se ve en la página de extensiones) |
| `chrome_url_overrides.newtab` | La línea clave: "al abrir una pestaña nueva, muestra este archivo". No necesita permisos |
| `browser_specific_settings.gecko.id` | Identificador que **Firefox** exige. Debe tener forma de correo. Si algún día la subes a Mozilla, pon uno propio y único |
| `data_collection_permissions` | Declaración obligatoria para **subir extensiones nuevas a Mozilla** desde noviembre de 2025. `["none"]` significa que no transmites datos |

Sobre `["none"]`: si usas el logo automático, el dominio de tus accesos sí viaja a Google. Para ser estrictamente coherente con esa declaración, usa logos locales en `img/`.

---

## 5. Instalación

### Chrome, Brave, Edge (Chromium)

1. Ten una carpeta con todos los archivos del proyecto (con `manifest.json` en su raíz). **No la borres ni la muevas**; el navegador la lee desde ahí.
2. Abre `chrome://extensions` (en Brave: `brave://extensions`).
3. Activa **Modo de desarrollador** (arriba a la derecha).
4. Pulsa **Cargar descomprimida** y elige la carpeta.
5. Abre una pestaña nueva.

**Manifest para Chrome:** es el mismo pero sin el bloque `browser_specific_settings`. Chrome lo ignora, pero si quieres evitar el aviso, quítalo.

**Si cambias un archivo:** en la página de extensiones pulsa el botón de recargar (flecha circular) de Icons Hub y abre otra pestaña.

### Firefox Developer Edition (o Nightly)

Esta versión permite instalar extensiones sin firmar de forma permanente:

1. Escribe `about:config` y acepta el aviso.
2. Busca `xpinstall.signatures.required` y ponlo en **false** (doble clic).
3. Ve a `about:addons`.
4. Pulsa el **engranaje ⚙️** (arriba a la derecha, junto al buscador).
5. Elige **Instalar complemento desde archivo…** y selecciona el `.xpi` (o el `.zip`).
6. Abre una pestaña nueva.

Esto **no funciona** en el Firefox normal ni en Beta: ahí solo se instalan extensiones firmadas.

### Firefox normal: opciones

- **Carga temporal** (`about:debugging#/runtime/this-firefox` → "Cargar complemento temporal" → elegir `manifest.json`). Sirve para probar, pero **se pierde al cerrar Firefox**.
- **Firma gratuita de Mozilla** (distribución propia, sin publicar en la tienda):
  1. Verifica que el manifest tenga `gecko.id` único y `data_collection_permissions`.
  2. Crea el `.zip` con los archivos **en la raíz** (ver sección 6).
  3. Entra a [addons.mozilla.org/developers](https://addons.mozilla.org/developers/), **Submit a New Add-on**, elige **"On your own"** (distribución propia) y sube el zip.
  4. Descarga el `.xpi` firmado e instálalo desde `about:addons` → ⚙️ → *Instalar complemento desde archivo*.
  5. Para cada actualización, sube una versión con un `"version"` mayor.

---

## 6. ¿Qué es un `.xpi` y de dónde lo obtengo?

Un `.xpi` es **un `.zip` con otro nombre**. No hay que descargarlo de ningún lado: lo creas tú.

### Crearlo a mano

1. Entra a la carpeta del proyecto y **selecciona los archivos de adentro** (`manifest.json`, `newtab.*`, `icons`, `img`), **no la carpeta que los contiene**.
2. Clic derecho → **Enviar a → Carpeta comprimida (en zip)** (Windows), o usa 7-Zip.
3. Renombra el resultado de `.zip` a `.xpi`.
   - En Windows, si no ves las extensiones: en el Explorador, **Ver → Mostrar → Extensiones de nombre de archivo**.

### Errores comunes al crearlo

| Problema | Causa |
|---|---|
| "No se pudo leer el manifest" | El zip contiene una carpeta y el `manifest.json` está dentro de ella. Debe estar **en la raíz del zip** |
| Firefox rechaza el paquete | El zip se creó con `Compress-Archive` de PowerShell antiguo, que puede guardar rutas con `\`. Usa el menú del Explorador, 7-Zip o `zip` |

### Desde la terminal (Linux, macOS o Git Bash)
```bash
cd icons-hub
zip -r ../icons-hub.xpi .
```

### Obtener un `.xpi` firmado
Solo lo entrega Mozilla después de que subes el zip a addons.mozilla.org (sección 5).

---

## 7. Datos y copias de seguridad

- Los accesos se guardan en el `localStorage` **de cada navegador**. Chrome, Brave y Firefox **no comparten** datos entre sí.
- Si **desinstalas** la extensión, se borran.
- **Respaldo y traslado:** Editar → **Exportar** descarga `mi-inicio.json`. En el otro navegador: Editar → **Importar**.
- Haz un Exportar **antes de actualizar** o reinstalar. Recargar normalmente conserva los datos, pero un respaldo no cuesta nada.

---

## 8. Solución de problemas

| Síntoma | Qué revisar |
|---|---|
| El icono de la extensión no cambia | Que `icons/` esté junto a `manifest.json`; recargar la extensión; si no, "Remove" y volver a cargarla |
| Un logo no aparece | Sin internet, o el sitio no tiene favicon: se usa la primera letra. Prueba con una imagen en `img/` |
| Los cambios de código no se ven | Recargar la extensión en `chrome://extensions` y abrir otra pestaña |
| Aviso amarillo en Chrome | Es por la clave de Firefox. Inofensivo; quítala del manifest de Chrome si te molesta |
| En Firefox desaparece al reiniciar | Es una carga temporal. Usa Developer Edition con la firma desactivada, o firma la extensión |
| El zip no instala en Firefox | `manifest.json` debe estar en la raíz del zip, no dentro de una carpeta |
| "Importar" dice que no puede leer el archivo | Debe ser un `mi-inicio.json` exportado desde Icons Hub |

---

## 9. Ideas para seguir aprendiendo

1. **Reordenar arrastrando:** la API de *drag and drop* de HTML5, o `pointerdown/move/up` a mano.
2. **Buscador arriba:** un `<input>` que al pulsar Enter vaya a `https://www.google.com/search?q=...`.
3. **Saludo y hora:** `new Date()` y `setInterval`.
4. **Carpetas o categorías** de accesos: añade un campo `g` (grupo) a cada objeto y agrúpalos al dibujar.
5. **Sincronización automática** entre dispositivos: `chrome.storage.sync` (en Firefox, `browser.storage.sync`) requiere `"permissions": ["storage"]` y pasar el código a `async/await`. Ojo: solo sincroniza dentro del mismo navegador y cuenta, no entre Chrome y Firefox.
6. **Tipografía propia** con `@font-face` y un `.woff2` local.
7. **Empaquetado profesional:** la herramienta `web-ext` (`npx web-ext build`) crea el zip correcto y valida el manifest.

---

## 10. La versión web (la que se publicó primero)

Es la misma lógica en **un solo archivo** (HTML con CSS y JS adentro). Difiere en tres cosas: no puede cargar imágenes externas, por lo que solo usa emojis y letras; no tiene Exportar/Importar; y usa otro nombre de clave de guardado. La extensión es la versión completa.
