import { createReadStream } from 'node:fs';
import { realpath, stat } from 'node:fs/promises';
import { createServer } from 'node:http';
import { extname, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const appDirectory = await realpath(fileURLToPath(new URL('./app/', import.meta.url)));
const mimeByExtension = new Map([
  ['.html', 'text/html; charset=utf-8'],
  ['.css', 'text/css; charset=utf-8'],
  ['.js', 'text/javascript; charset=utf-8'],
  ['.mjs', 'text/javascript; charset=utf-8'],
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

function sendText(response, status, text) {
  response.writeHead(status, { 'content-type': 'text/plain; charset=utf-8' });
  response.end(text);
}

function pathInsideApp(requestUrl) {
  let pathname;
  try {
    pathname = decodeURIComponent(new URL(requestUrl || '/', 'http://localhost').pathname);
  } catch {
    return { problem: 'bad-url' };
  }

  // Reject traversal before normalizing it away, including encoded separators.
  if (pathname.includes('\\') || pathname.split('/').some((part) => part === '..')) {
    return { problem: 'outside' };
  }
  const filePart = pathname.endsWith('/') ? `${pathname}index.html` : pathname;
  const target = resolve(appDirectory, `.${filePart}`);
  const fromRoot = relative(appDirectory, target);
  if (fromRoot === '..' || fromRoot.startsWith(`..${sep}`) || fromRoot.startsWith(sep)) {
    return { problem: 'outside' };
  }
  return { target };
}

function isWithinApp(realFile) {
  const fromRoot = relative(appDirectory, realFile);
  return fromRoot !== '..' && !fromRoot.startsWith(`..${sep}`) && !fromRoot.startsWith(sep);
}

async function handleRequest(request, response) {
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    response.setHeader('allow', 'GET, HEAD');
    sendText(response, 405, 'method not allowed');
    return;
  }

  const resolvedPath = pathInsideApp(request.url);
  if (resolvedPath.problem === 'bad-url') {
    sendText(response, 400, 'malformed URL path');
    return;
  }
  if (resolvedPath.problem === 'outside') {
    sendText(response, 403, 'path is outside app/');
    return;
  }

  try {
    const realFile = await realpath(resolvedPath.target);
    if (!isWithinApp(realFile)) {
      sendText(response, 403, 'path is outside app/');
      return;
    }
    const info = await stat(realFile);
    if (!info.isFile()) {
      sendText(response, 404, 'file not found');
      return;
    }

    response.writeHead(200, {
      'content-type': mimeByExtension.get(extname(realFile).toLowerCase()) || 'application/octet-stream',
      'content-length': info.size,
      'cache-control': 'no-store',
      'x-content-type-options': 'nosniff',
    });
    if (request.method === 'HEAD') {
      response.end();
      return;
    }

    const fileStream = createReadStream(realFile);
    fileStream.on('error', () => response.destroy());
    fileStream.pipe(response);
  } catch {
    sendText(response, 404, 'file not found');
  }
}

function readPort(args) {
  const flagIndex = args.indexOf('--port');
  if (flagIndex === -1) return 8080;
  const rawPort = args[flagIndex + 1];
  if (!rawPort || !/^\d+$/.test(rawPort)) {
    throw new Error('--port requires a number from 1 to 65535');
  }
  const port = Number(rawPort);
  if (!Number.isSafeInteger(port) || port < 1 || port > 65535) {
    throw new Error('--port requires a number from 1 to 65535');
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
