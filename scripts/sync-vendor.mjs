import fs from 'node:fs';
import path from 'node:path';
import { build } from 'esbuild';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);

const copies = [
  ['firebase/firebase-app-compat.js', 'firebase/firebase-app-compat.js'],
  ['firebase/firebase-auth-compat.js', 'firebase/firebase-auth-compat.js'],
  ['firebase/firebase-firestore-compat.js', 'firebase/firebase-firestore-compat.js'],
  ['firebase/firebase-storage-compat.js', 'firebase/firebase-storage-compat.js'],
  ['chart.js/dist/chart.umd.min.js', 'chartjs/chart.umd.min.js'],
  ['@fortawesome/fontawesome-free/css/all.min.css', 'fontawesome/css/all.min.css']
];

const vendorRoot = path.resolve('public/vendor');
for (const [sourceRelative, destinationRelative] of copies) {
  const destination = path.join(vendorRoot, destinationRelative);
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.copyFileSync(path.resolve('node_modules', sourceRelative), destination);
}

const fontSource = path.resolve('node_modules/@fortawesome/fontawesome-free/webfonts');
const fontDestination = path.join(vendorRoot, 'fontawesome/webfonts');
fs.mkdirSync(fontDestination, { recursive: true });
for (const filename of fs.readdirSync(fontSource)) {
  fs.copyFileSync(path.join(fontSource, filename), path.join(fontDestination, filename));
}

// Build both shipped parser assets from the same pinned, patched dependency graph.
const parserVersion = require('@xmldom/xmldom/package.json').version;
if (parserVersion !== '0.8.15') throw new Error('Review the parser security baseline before changing its pinned version.');
const dependencies = new Map();
for (const target of ['mammoth.browser.min.js', 'document-worker.js']) {
  const result = await build({
    ...(target === 'document-worker.js' ? { entryPoints: ['scripts/document-worker.cjs'] } : {
      stdin: { contents: "module.exports = require('mammoth');", resolveDir: process.cwd() }, globalName: 'mammoth'
    }),
    bundle: true, platform: 'browser', format: 'iife', minify: true,
    legalComments: 'external', metafile: true,
    outfile: path.join(vendorRoot, 'mammoth', target)
  });
  for (const input of Object.keys(result.metafile.inputs).filter(input => input.startsWith('node_modules/'))) {
    let directory = path.dirname(path.resolve(input));
    while (directory !== path.dirname(directory)) {
      if (fs.existsSync(path.join(directory, 'package.json'))) {
        const pkg = JSON.parse(fs.readFileSync(path.join(directory, 'package.json'), 'utf8'));
        if (pkg.name && pkg.version) {
          const licenses = fs.readdirSync(directory).filter(name => /^(licen[sc]e|copying|notice)([.\-_]|$)/i.test(name) && fs.statSync(path.join(directory, name)).isFile());
          dependencies.set(pkg.name, { version: pkg.version, license: pkg.license, texts: licenses.map(name => fs.readFileSync(path.join(directory, name), 'utf8')) });
          break;
        }
      }
      directory = path.dirname(directory);
    }
  }
}
fs.writeFileSync(path.join(vendorRoot, 'mammoth', 'LICENSES.txt'), [...dependencies].sort().map(([name, data]) => `${name}@${data.version} (${data.license})\n${data.texts.join('\n')}`).join('\n\n'));
fs.writeFileSync(path.join(vendorRoot, 'mammoth', 'versions.json'), JSON.stringify(Object.fromEntries([...dependencies].sort().map(([name, data]) => [name, data.version])), null, 2) + '\n');
