#!/usr/bin/env node
// Local, buildless docs preview; serve only files inside docs, including symlinks.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { ROOT } from './lib.mjs';

export function createDocsServer(directory = path.join(ROOT, 'docs')) {
  const root = fs.realpathSync(directory);
  const types = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.md': 'text/plain', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png' };
  return http.createServer((request, response) => {
    if (!['GET', 'HEAD'].includes(request.method)) { response.writeHead(405, { Allow: 'GET, HEAD' }).end(); return; }
    try {
      const name = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
      let file = path.resolve(root, '.' + name);
      if (fs.statSync(file).isDirectory()) file = path.join(file, 'index.html');
      file = fs.realpathSync(file);
      const relative = path.relative(root, file);
      if (relative === '..' || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative) || !fs.statSync(file).isFile()) throw new Error('Outside docs');
      response.writeHead(200, { 'Content-Type': (types[path.extname(file)] || 'application/octet-stream') + (['.html', '.css', '.js', '.md', '.json', '.svg'].includes(path.extname(file)) ? '; charset=utf-8' : ''), 'X-Content-Type-Options': 'nosniff' });
      if (request.method === 'HEAD') response.end();
      else fs.createReadStream(file).on('error', () => response.destroy()).pipe(response);
    } catch { response.writeHead(404).end('Not found'); }
  });
}
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const port = Number(process.argv[2] ?? 8080);
  if (!Number.isInteger(port) || port < 1 || port > 65535) { console.error('Usage: node tools/serve-docs.mjs [PORT]'); process.exitCode = 1; }
  else {
    const server = createDocsServer();
    server.on('error', error => { console.error(`Docs preview failed: ${error.code}`); process.exitCode = 1; });
    server.listen(port, '127.0.0.1', () => console.log(`Docs: http://127.0.0.1:${port}`));
  }
}
