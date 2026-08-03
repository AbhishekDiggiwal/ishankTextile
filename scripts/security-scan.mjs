import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const workspace = process.cwd();
const ignoredDirectories = new Set([
  '.git',
  '.next',
  '.agents',
  'node_modules',
  'vendor'
]);
const ignoredFiles = new Set([
  'site.css'
]);
const textExtensions = new Set([
  '.css',
  '.html',
  '.js',
  '.json',
  '.jsx',
  '.md',
  '.mjs',
  '.rules',
  '.ts',
  '.tsx'
]);

const secretPatterns = [
  ['Google API key', /AIza[0-9A-Za-z_-]{20,}/g],
  ['AWS access key', /\b(?:AKIA|ASIA)[0-9A-Z]{16}\b/g],
  ['GitHub token', /\b(?:ghp_|github_pat_)[0-9A-Za-z_]{20,}\b/g],
  ['OpenAI-style secret key', /\bsk-[0-9A-Za-z_-]{20,}\b/g],
  ['private key', /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/g]
];
const firebaseConfigPattern =
  /\b(?:apiKey|authDomain|projectId|storageBucket|messagingSenderId|appId)\s*:/g;
const inlineHandlerPattern = /\son[a-z]+\s*=/gi;
const remoteScriptPattern = /<script\b[^>]*\bsrc=["']https?:\/\//gi;

async function collectFiles(relativePath) {
  const absolutePath = path.join(workspace, relativePath);
  const entries = await readdir(absolutePath, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    if (ignoredDirectories.has(entry.name) || ignoredFiles.has(entry.name)) continue;
    const child = path.join(relativePath, entry.name);
    if (entry.isDirectory()) {
      files.push(...await collectFiles(child));
    } else if (textExtensions.has(path.extname(entry.name).toLowerCase())) {
      files.push(child);
    }
  }

  return files;
}

function lineNumber(text, index) {
  return text.slice(0, index).split('\n').length;
}

const files = await collectFiles('.');
const findings = [];

for (const relativePath of files) {
  const content = await readFile(path.join(workspace, relativePath), 'utf8');

  for (const [label, pattern] of secretPatterns) {
    pattern.lastIndex = 0;
    for (const match of content.matchAll(pattern)) {
      findings.push(`${relativePath}:${lineNumber(content, match.index)} ${label}`);
    }
  }

  if (!relativePath.startsWith(`tests${path.sep}`)) {
    firebaseConfigPattern.lastIndex = 0;
    for (const match of content.matchAll(firebaseConfigPattern)) {
      findings.push(
        `${relativePath}:${lineNumber(content, match.index)} committed Firebase web configuration`
      );
    }
  }

  if (relativePath.startsWith(`public${path.sep}`) &&
      (relativePath.endsWith('.html') || relativePath.endsWith('.js'))) {
    inlineHandlerPattern.lastIndex = 0;
    for (const match of content.matchAll(inlineHandlerPattern)) {
      findings.push(
        `${relativePath}:${lineNumber(content, match.index)} inline event handler`
      );
    }
  }

  if (relativePath.endsWith('.html')) {
    remoteScriptPattern.lastIndex = 0;
    for (const match of content.matchAll(remoteScriptPattern)) {
      findings.push(
        `${relativePath}:${lineNumber(content, match.index)} remote executable script`
      );
    }
  }
}

if (findings.length) {
  console.error('Security scan failed:');
  findings.forEach((finding) => console.error(`- ${finding}`));
  process.exitCode = 1;
} else {
  console.log(`Security scan passed (${files.length} source files checked).`);
}
