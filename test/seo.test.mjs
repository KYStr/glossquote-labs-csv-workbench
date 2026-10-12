import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { releaseHtml, releaseMetadata, releaseOrigin } from '../scripts/build.mjs';
import zh from '../public/js/locales/zh-Hant.mjs';
import en from '../public/js/locales/en.mjs';
test('U04-14 bilingual literal-search controls remain static, labeled and untruncated',async()=>{
  for(const path of ['../public/index.html','../public/en/index.html']){
    const html=await readFile(new URL(path,import.meta.url),'utf8');
    for(const id of ['search-column','search-query','search-find','search-status','search-previous','search-next','search-clear'])assert.ok(html.includes(`id="${id}"`));
    assert.match(html,/<label[^>]+for="search-query"/u);assert.match(html,/<textarea id="search-query"[^>]*aria-describedby="search-help search-status"/u);
    assert.doesNotMatch(html,/<textarea id="search-query"[^>]*maxlength/u);assert.match(html,/id="search-status"[^>]*role="status"[^>]*aria-live="polite"/u);
  }
});
test('complete UI/status/error dictionary parity in both languages',()=>{
  assert.deepEqual(Object.keys(zh).sort(),Object.keys(en).sort());assert.deepEqual(Object.keys(zh.errors).sort(),Object.keys(en.errors).sort());
  for(const copy of [zh,en])for(const [key,value] of Object.entries(copy))if(key!=='errors')assert.equal(typeof value=== 'function'?typeof value(2,3,4):typeof value,'string');
});
test('preview has no canonical; candidate has reciprocal hreflang, x-default and exact canonical',async()=>{
  for(const path of ['index.html','en/index.html']){
    const source=await readFile(new URL(`../public/${path}`,import.meta.url),'utf8');
    assert.match(source,/name="robots" content="noindex, nofollow"/u);assert.ok(!source.includes('rel="canonical"'));
    const html=releaseHtml(source,path);assert.ok(html.includes(`rel="canonical" href="${releaseOrigin}/${path}"`));
    for(const [lang,target] of [['zh-Hant','index.html'],['en','en/index.html'],['x-default','index.html']])assert.ok(html.includes(`hreflang="${lang}" href="${releaseOrigin}/${target}"`));
    assert.ok(!html.includes('noindex'));assert.equal((html.match(/<details>/gu)||[]).length,6);assert.match(html,/<h1>/u);
  }
});
test('candidate sitemap covers both languages and robots points to exact sitemap; 404 stays noindex',async()=>{
  const {robots,sitemap}=releaseMetadata();assert.ok(robots.includes(`Sitemap: ${releaseOrigin}/sitemap.xml`));assert.match(robots,/Allow: \//u);assert.equal((sitemap.match(/<loc>/gu)||[]).length,2);
  const page=await readFile(new URL('../public/404.html',import.meta.url),'utf8');assert.equal(releaseHtml(page,'404.html'),page);assert.match(page,/noindex/u);
});
