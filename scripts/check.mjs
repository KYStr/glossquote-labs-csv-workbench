import { readdir, readFile, lstat } from 'node:fs/promises';
import { resolve, relative, extname, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { workerBundle } from './worker-bundle.mjs';

export const projectRoot = fileURLToPath(new URL('../', import.meta.url));
const publicRoot = resolve(projectRoot, 'public');
export async function publicFiles(directory = publicRoot) {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const file = resolve(directory, entry.name);
    if (entry.name.startsWith('.') || (await lstat(file)).isSymbolicLink()) throw new Error('Hidden file or symlink in public');
    if (entry.isDirectory()) files.push(...await publicFiles(file));
    else if (['.html', '.css', '.mjs', '.js', '.json', '.svg', '.txt', '.xml'].includes(extname(file)) || ['_headers', '_redirects'].includes(entry.name)) files.push(file);
    else throw new Error('Unreviewed public asset');
  }
  return files;
}
export async function check() {
  const pkg = JSON.parse(await readFile(resolve(projectRoot, 'package.json'), 'utf8'));
  if (!pkg.private || pkg.type !== 'module' || pkg.dependencies || pkg.devDependencies) throw new Error('Package contract');
  for (const [key, command] of Object.entries({ dev: 'node scripts/serve.mjs', test: 'node --test test/*.test.mjs', check: 'node scripts/check.mjs', build: 'node scripts/build.mjs' })) {
    if (pkg.scripts[key] !== command) throw new Error('Script contract');
  }
  const files = await publicFiles();
  const names = new Set(files);
  if (names.has(resolve(publicRoot,'js/worker-source.mjs')) && await readFile(resolve(publicRoot,'js/worker-source.mjs'),'utf8') !== await workerBundle()) throw new Error('Stale generated worker');
  for (const name of ['index.html', 'styles/tokens.css', 'styles/app.css', 'js/app.mjs']) if (!names.has(resolve(publicRoot, name))) throw new Error('Missing scaffold');
  const reference = (file, ref) => {
    if (/^(https?:|mailto:|#)/u.test(ref)) return;
    if (/^(?:[a-z]+:|\/\/)/iu.test(ref) || ref.includes('\\')) throw new Error('Invalid execution resource');
    if (ref.startsWith('/') && file !== resolve(publicRoot,'404.html')) throw new Error('Root-relative resources reserved for error page');
    const target = ref.startsWith('/') ? resolve(publicRoot,`.${ref.split(/[?#]/u)[0]}`) : resolve(dirname(file), ref.split(/[?#]/u)[0]);
    if (!names.has(target)) throw new Error(`Missing local reference: ${relative(publicRoot, target)}`);
  };
  for (const file of files) {
    const source = await readFile(file, 'utf8');
    if (['.mjs', '.js'].includes(extname(file))) {
      const result = spawnSync(process.execPath, ['--check', file], { shell: false, encoding: 'utf8' });
      if (result.status !== 0) throw new Error(`Syntax: ${relative(publicRoot, file)}`);
      if (/\b(?:innerHTML|outerHTML|insertAdjacentHTML|eval|localStorage|sessionStorage|indexedDB|sendBeacon|WebSocket|fetch|XMLHttpRequest)\b|new\s+Function\s*\(|console\s*\.|document\s*\.\s*cookie|serviceWorker/u.test(source)) throw new Error(`Forbidden runtime API: ${relative(publicRoot, file)}`);
      for (const match of source.matchAll(/(?:\bfrom\s*|\bimport\s*|new URL\s*\()(['"])([^'"]+)\1/gu)) reference(file, match[2]);
    }
    if (extname(file) === '.html') {
      if (!/<html\s+lang=/u.test(source) || !/<title>[^<]+<\/title>/u.test(source) || !/<h1[ >]/u.test(source) || !/name="robots" content="noindex, nofollow"/u.test(source)) throw new Error('Static HTML contract');
      if (/\bon\w+=|<script(?![^>]*\bsrc=)[^>]*>|javascript:/iu.test(source)) throw new Error('Inline execution');
      for (const match of source.matchAll(/<(?:script|link|img)\b[^>]*\b(?:src|href)="([^"]+)"/gu)) {
        if (/^(?:[a-z]+:|\/\/)/iu.test(match[1])) throw new Error('External resource');
        reference(file, match[1]);
      }
    }
    if (extname(file) === '.css') {
      if (/@import|url\s*\(/iu.test(source)) throw new Error('Unreviewed CSS resource');
    }
  }
  if (names.has(resolve(publicRoot,'en/index.html'))) {
    const zh = await readFile(resolve(publicRoot,'index.html'),'utf8'), en = await readFile(resolve(publicRoot,'en/index.html'),'utf8');
    const ids = html => [...html.matchAll(/\bid="([^"]+)"/gu)].map(match=>match[1]).sort();
    if (JSON.stringify(ids(zh)) !== JSON.stringify(ids(en))) throw new Error('Bilingual control mismatch');
    for (const [html, language, home] of [[zh,'zh-Hant','https://glossquote.com/index.html'],[en,'en','https://glossquote.com/en/index.html']]) {
      if (!html.includes(`<html lang="${language}">`) || !html.includes(`href="${home}"`) || (html.match(/<details>/gu) ?? []).length !== 6 || !html.includes('id="method-title"')) throw new Error('Bilingual static content');
    }
    for (const name of ['js/core/input.mjs','js/core/csv.mjs','js/core/selection.mjs','js/core/risk.mjs','js/core/export.mjs','js/core/session.mjs','js/worker.mjs','js/worker-source.mjs','js/locales/en.mjs','js/locales/zh-Hant.mjs','404.html','robots.txt','_headers']) if (!names.has(resolve(publicRoot,name))) throw new Error('Missing final delivery asset');
  }
  return files;
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await check(); console.log('PASS: ESM syntax, references, static HTML, resources and runtime API rules');
}
