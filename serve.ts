// ViceFrame local dev server: serves app/ over plain HTTP so the studio can
// be tried in a desktop browser. No build step, nothing fetched from the net.
import { createReadStream } from 'node:fs';
import { realpath, stat } from 'node:fs/promises';
import { createServer } from 'node:http';
import { extname, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const appRoot = await realpath(fileURLToPath(new URL('./app/', import.meta.url)));

const mimeTypes = new Map([
  ['.html', 'text/html; charset=utf-8'],
  ['.css', 'text/css; charset=utf-8'],
  ['.js', 'text/javascript; charset=utf-8'],
  ['.mjs', 'text/javascript; charset=utf-8'],
  ['.ts', 'text/javascript; charset=utf-8'],
  ['.json', 'application/json; charset=utf-8'],
  ['.txt', 'text/plain; charset=utf-8'],
  ['.svg', 'image/svg+xml'],
  ['.png', 'image/png'],
  ['.jpg', 'image/jpeg'],
  ['.jpeg', 'image/jpeg'],
  ['.webp', 'image/webp'],
  ['.gif', 'image/gif'],
  ['.ico', 'image/x-icon'],
  ['.woff', 'font/woff'],
  ['.woff2', 'font/woff2'],
  ['.ttf', 'font/ttf'],
  ['.otf', 'font/otf'],
  ['.wasm', 'application/wasm'],
  ['.mp3', 'audio/mpeg'],
  ['.ogg', 'audio/ogg'],
  ['.wav', 'audio/wav'],
]);

function sendPlain(response, status, text) {
  response.writeHead(status, { 'content-type': 'text/plain; charset=utf-8' });
  response.end(text);
}

function resolveRequestPath(requestUrl) {
  let pathname;
  try {
    pathname = decodeURIComponent(new URL(requestUrl || '/', 'http://localhost').pathname);
  } catch {
    return { problem: 'bad-url' };
  }
  // Refuse traversal outright, encoded separators included.
  if (pathname.includes('\\') || pathname.split('/').some((part) => part === '..')) {
    return { problem: 'outside' };
  }
  const filePart = pathname.endsWith('/') ? `${pathname}index.html` : pathname;
  const target = resolve(appRoot, `.${filePart}`);
  const rel = relative(appRoot, target);
  if (rel === '..' || rel.startsWith(`..${sep}`) || rel.startsWith(sep)) {
    return { problem: 'outside' };
  }
  return { target };
}

function insideApp(realFile) {
  const rel = relative(appRoot, realFile);
  return rel !== '..' && !rel.startsWith(`..${sep}`) && !rel.startsWith(sep);
}

async function handleRequest(request, response) {
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    response.setHeader('allow', 'GET, HEAD');
    sendPlain(response, 405, 'method not allowed');
    return;
  }

  const resolved = resolveRequestPath(request.url);
  if (resolved.problem === 'bad-url') return sendPlain(response, 400, 'malformed URL path');
  if (resolved.problem === 'outside') return sendPlain(response, 403, 'path is outside app/');

  try {
    const realFile = await realpath(resolved.target);
    if (!insideApp(realFile)) return sendPlain(response, 403, 'path is outside app/');
    const info = await stat(realFile);
    if (!info.isFile()) return sendPlain(response, 404, 'file not found');

    response.writeHead(200, {
      'content-type': mimeTypes.get(extname(realFile).toLowerCase()) || 'application/octet-stream',
      'content-length': info.size,
      'cache-control': 'no-store',
      'x-content-type-options': 'nosniff',
    });
    if (request.method === 'HEAD') return response.end();

    const stream = createReadStream(realFile);
    stream.on('error', () => response.destroy());
    stream.pipe(response);
  } catch {
    sendPlain(response, 404, 'file not found');
  }
}

function readPort(args) {
  const at = args.indexOf('--port');
  if (at === -1) return 8080;
  const raw = args[at + 1];
  if (!raw || !/^\d+$/.test(raw)) throw new Error('--port needs a number from 1 to 65535');
  const port = Number(raw);
  if (!Number.isSafeInteger(port) || port < 1 || port > 65535) {
    throw new Error('--port needs a number from 1 to 65535');
  }
  return port;
}

const port = readPort(process.argv.slice(2));
const server = createServer((request, response) => {
  void handleRequest(request, response);
});
server.listen(port, '127.0.0.1', () => {
  console.log(`ViceFrame dev server: http://localhost:${port} (app/)`);
});
