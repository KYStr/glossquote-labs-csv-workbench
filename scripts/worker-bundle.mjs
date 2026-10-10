import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
const root = fileURLToPath(new URL('../public/js/', import.meta.url));
const modules = ['core/input.mjs','core/csv.mjs','core/selection.mjs','core/risk.mjs','core/export.mjs','worker.mjs'];
export async function workerBundle() {
  const sources = [];
  for (const module of modules) {
    const source = await readFile(resolve(root,module),'utf8');
    sources.push(source.replace(/^import [^\n]+\n/gmu, '').replace(/^export /gmu,''));
  }
  return `// Generated from the reviewed worker/core allowlist; never includes user data.\nexport const workerSource = ${JSON.stringify(sources.join('\n'))};\n`;
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await writeFile(resolve(root,'worker-source.mjs'), await workerBundle());
  console.log('PASS: deterministic memory worker source generated');
}
