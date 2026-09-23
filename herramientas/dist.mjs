// Arma la versión publicable del portafolio en dist/.
//
// El HTML de trabajo se queda legible y con comentarios; lo que se publica va
// minificado: sin comentarios, sin espacios y con el JavaScript comprimido.
// No impide descargar la página (nada lo impide en un sitio estático), pero el
// código que se lleva quien la guarde ya no se lee ni se edita fácil.
//
// Uso: npm run dist   (compila Tailwind primero)

import fs from 'node:fs/promises';
import path from 'node:path';
import { minify } from 'html-minifier-terser';

const RAIZ = path.resolve(import.meta.dirname, '..');
const DIST = path.join(RAIZ, 'dist');
const PAGINA = '[Balderrama_Lopez_Samuel_Alberto] · Portafolio.html';
const RECURSOS = '[Balderrama_Lopez_Samuel_Alberto] · Portafolio_files';

// Lo que la página carga desde disco, como [origen, destino en dist/].
// saved_resource era el CDN de Tailwind y ya no se usa: se queda fuera.
const COPIAR = [
  ['assets', 'assets'],
  ['css/output.css', 'css/output.css'],
  // css2 son las fuentes de Google guardadas por el navegador. Sin extensión,
  // Render no sabe que es CSS, y con el encabezado nosniff el navegador la
  // rechaza. Se publica como .css.
  [`${RECURSOS}/css2`, 'css/fonts.css'],
  ['LICENSE.md', 'LICENSE.md'],
];

/** Cambia `buscar` por `poner` y falla si no aparece: un cambio que no se hizo no debe pasar callado. */
function cambiar(texto, buscar, poner, que) {
  if (!buscar.test(texto)) throw new Error(`No encontré ${que} en ${PAGINA}`);
  return texto.replace(buscar, poner);
}

await fs.rm(DIST, { recursive: true, force: true });
await fs.mkdir(DIST, { recursive: true });

let fuente = await fs.readFile(path.join(RAIZ, PAGINA), 'utf8');

fuente = cambiar(
  fuente,
  /href="\.\/\[Balderrama_Lopez_Samuel_Alberto\] · Portafolio_files\/css2"/,
  'href="css/fonts.css"',
  'el enlace a las fuentes'
);

// El monitor de GoDaddy/cPanel que el hosting de la plantilla original metió
// en la página. Reporta a ese servidor, no a Render: en la versión publicada
// sobra.
fuente = cambiar(
  fuente,
  /<script>'undefined'=== typeof _trfq[\s\S]*?<\/script><script src="[^"]*tccl\.min\.js\.descarga"><\/script>/,
  '',
  'el monitor de cPanel'
);

const html = await minify(fuente, {
  collapseWhitespace: true,
  conservativeCollapse: true, // deja un espacio donde había salto: el texto no se pega
  removeComments: true,
  minifyCSS: true,
  minifyJS: { compress: true, mangle: true, format: { comments: false } },
  removeRedundantAttributes: true,
  sortAttributes: true,
});

// En Render la raíz del sitio sirve index.html.
await fs.writeFile(path.join(DIST, 'index.html'), html);

for (const [origen, destino] of COPIAR) {
  await fs.cp(path.join(RAIZ, origen), path.join(DIST, destino), { recursive: true });
}

const kb = (n) => `${(n / 1024).toFixed(1)} KB`;
console.log(`index.html: ${kb(Buffer.byteLength(fuente))} -> ${kb(Buffer.byteLength(html))}`);
console.log(`dist/ listo con ${COPIAR.length} recursos copiados`);
