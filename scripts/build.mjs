import { mkdir, copyFile, lstat, rm, realpath, readFile, writeFile } from 'node:fs/promises';
import { resolve, relative, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { check, projectRoot } from './check.mjs';

export const releaseOrigin = 'https://csv.glossquote.com';
export function releaseHtml(html,path) {
  if (!['index.html','en/index.html'].includes(path)) return html;
  const links = `  <link rel="canonical" href="${releaseOrigin}/${path}">\n  <link rel="alternate" hreflang="zh-Hant" href="${releaseOrigin}/index.html">\n  <link rel="alternate" hreflang="en" href="${releaseOrigin}/en/index.html">\n  <link rel="alternate" hreflang="x-default" href="${releaseOrigin}/index.html">\n`;
  return html.replace('name="robots" content="noindex, nofollow"','name="robots" content="index, follow"').replace('</head>',`${links}</head>`);
}
export function releaseMetadata() {
  return {
    robots: `User-agent: *\nAllow: /\nSitemap: ${releaseOrigin}/sitemap.xml\n`,
    sitemap: `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n${['index.html','en/index.html'].map(path=>`  <url><loc>${releaseOrigin}/${path}</loc><xhtml:link rel="alternate" hreflang="zh-Hant" href="${releaseOrigin}/index.html"/><xhtml:link rel="alternate" hreflang="en" href="${releaseOrigin}/en/index.html"/><xhtml:link rel="alternate" hreflang="x-default" href="${releaseOrigin}/index.html"/></url>`).join('\n')}\n</urlset>\n`
  };
}
export async function build(release = false) {
  const files = await check();
  const root = await realpath(projectRoot), dist = resolve(root,'dist');
  if (relative(root,dist) !== 'dist') throw new Error('Unsafe build target');
  try {
    if ((await lstat(dist)).isSymbolicLink() || await realpath(dist) !== dist) throw new Error('Build target is a link');
    await rm(dist,{recursive:true});
  } catch (error) { if (error.code !== 'ENOENT') throw error; }
  await mkdir(dist,{recursive:true});
  for (const file of files) {
    const path = relative(resolve(projectRoot,'public'),file).replaceAll('\\','/');
    const destination = resolve(dist,path); await mkdir(dirname(destination),{recursive:true});
    if (release && ['index.html','en/index.html'].includes(path)) await writeFile(destination,releaseHtml(await readFile(file,'utf8'),path));
    else if (release && path === '_headers') {
      const headers = (await readFile(file,'utf8')).replace('  X-Robots-Tag: noindex, nofollow\n','');
      await writeFile(destination,`${headers}\n/js/*.mjs\n  Content-Type: text/javascript; charset=utf-8\n/styles/*.css\n  Content-Type: text/css; charset=utf-8\n/404.html\n  X-Robots-Tag: noindex, nofollow\n`);
    } else await copyFile(file,destination);
  }
  if (release) {
    const metadata=releaseMetadata();await writeFile(resolve(dist,'robots.txt'),metadata.robots);await writeFile(resolve(dist,'sitemap.xml'),metadata.sitemap);
  }
  return files.length + (release ? 1 : 0);
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args=process.argv.slice(2);
  if (args.length && !(args.length===1&&args[0]==='--release')) throw new Error('Use no arguments (preview) or --release (prepared candidate)');
  const release=args.length>0,count=await build(release);
  console.log(`PASS: ${count} reviewed static files built to dist (${release?'release candidate for csv.glossquote.com; deployment unverified':'preview, noindex'})`);
}
