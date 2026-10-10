import http from 'node:http';
import { readFile, realpath, stat } from 'node:fs/promises';
import { resolve, relative, isAbsolute, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const project = fileURLToPath(new URL('../', import.meta.url));
export const securityHeaders = {
  'Content-Security-Policy': "default-src 'none'; script-src 'self'; style-src 'self'; img-src 'self'; worker-src 'self' blob:; connect-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'",
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'no-referrer',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  'X-Robots-Tag': 'noindex, nofollow',
  'Cache-Control': 'no-store'
};
const mime = new Map([['.html', 'text/html; charset=utf-8'], ['.css', 'text/css; charset=utf-8'], ['.mjs', 'text/javascript; charset=utf-8'], ['.js', 'text/javascript; charset=utf-8'], ['.json', 'application/json; charset=utf-8'], ['.txt', 'text/plain; charset=utf-8'], ['.xml', 'application/xml; charset=utf-8'], ['.svg', 'image/svg+xml']]);
const inside = (root, path) => { const rel = relative(root, path); return rel === '' || (!isAbsolute(rel) && rel !== '..' && !rel.startsWith(`..${process.platform === 'win32' ? '\\' : '/'}`)); };

export async function startServer({ root = resolve(project, 'public'), port = 4184 } = {}) {
  const actualRoot = await realpath(root);
  const server = http.createServer(async (req, res) => {
    const finish = (status, body = '', type = 'text/plain; charset=utf-8') => {
      res.writeHead(status, { ...securityHeaders, 'Content-Type': type });
      res.end(req.method === 'HEAD' ? undefined : body);
    };
    const notFound = async () => { try { const path = await realpath(resolve(actualRoot,'404.html')); if (!inside(actualRoot,path)) throw new Error(); finish(404,await readFile(path),'text/html; charset=utf-8'); } catch { finish(404,'Not found'); } };
    if (!['GET', 'HEAD'].includes(req.method)) { res.setHeader('Allow', 'GET, HEAD'); finish(405, 'Method not allowed'); return; }
    let pathname;
    try { pathname = decodeURIComponent(req.url.split('?')[0]); } catch { finish(400, 'Invalid path'); return; }
    if (!pathname.startsWith('/') || /[\u0000-\u001f\\:]/u.test(pathname)) { finish(400, 'Invalid path'); return; }
    if (pathname.split('/').some(part => part.startsWith('.'))) { finish(403, 'Forbidden'); return; }
    if (pathname.endsWith('/')) pathname += 'index.html';
    const file = resolve(actualRoot, `.${pathname}`);
    if (!inside(actualRoot, file)) { finish(403, 'Forbidden'); return; }
    try {
      const actual = await realpath(file);
      if (!inside(actualRoot, actual)) { finish(403, 'Forbidden'); return; }
      if (!(await stat(actual)).isFile() || !mime.has(extname(actual))) { await notFound(); return; }
      finish(200, await readFile(actual), mime.get(extname(actual)));
    } catch { await notFound(); }
  });
  await new Promise((accept, reject) => { server.once('error', reject); server.listen(port, '127.0.0.1', accept); });
  return server;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  let server;
  try { server = await startServer(); }
  catch (error) { if (error.code !== 'EADDRINUSE') throw error; server = await startServer({ port: 0 }); }
  console.log(`Preview: http://127.0.0.1:${server.address().port}/ (public only, noindex)`);
  const close = () => server.close(() => process.exit(0));
  process.on('SIGINT', close); process.on('SIGTERM', close);
}
