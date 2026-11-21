import { createReadStream } from 'node:fs';
import { realpath, stat } from 'node:fs/promises';
import { createServer } from 'node:http';
import { extname, isAbsolute, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const applicationRoot = await realpath(fileURLToPath(new URL('./app/', import.meta.url)));
const contentTypes = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.ts': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.otf': 'font/otf',
  '.wasm': 'application/wasm',
  '.mp3': 'audio/mpeg',
  '.ogg': 'audio/ogg',
  '.wav': 'audio/wav',
};

function reply(response, status, message) {
  response.writeHead(status, { 'content-type': 'text/plain; charset=utf-8' });
  response.end(message);
}

function appPathFrom(request) {
  let pathname;
  try {
    pathname = decodeURIComponent(new URL(request.url ?? '/', 'http://localhost').pathname);
  } catch {
    return null;
  }

  if (pathname.includes('\\') || pathname.split('/').includes('..')) return '';
  if (pathname.endsWith('/')) pathname += 'index.html';
  const candidate = resolve(applicationRoot, `.${pathname}`);
  const pathFromRoot = relative(applicationRoot, candidate);
  if (isAbsolute(pathFromRoot) || pathFromRoot === '..' || pathFromRoot.startsWith(`..${sep}`)) return '';
  return candidate;
}

async function serve(request, response) {
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    response.setHeader('allow', 'GET, HEAD');
    reply(response, 405, 'method not allowed');
    return;
  }

  const candidate = appPathFrom(request);
  if (candidate === null) {
    reply(response, 400, 'malformed URL path');
    return;
  }
  if (candidate === '') {
    reply(response, 403, 'path is outside app/');
    return;
  }

  try {
    const actualPath = await realpath(candidate);
    const pathFromRoot = relative(applicationRoot, actualPath);
    if (isAbsolute(pathFromRoot) || pathFromRoot === '..' || pathFromRoot.startsWith(`..${sep}`)) {
      reply(response, 403, 'path is outside app/');
      return;
    }

    const details = await stat(actualPath);
    if (!details.isFile()) {
      reply(response, 404, 'file not found');
      return;
    }

    response.writeHead(200, {
      'content-type': contentTypes[extname(actualPath).toLowerCase()] ?? 'application/octet-stream',
      'content-length': details.size,
      'cache-control': 'no-store',
      'x-content-type-options': 'nosniff',
    });
    if (request.method === 'HEAD') {
      response.end();
      return;
    }

    const stream = createReadStream(actualPath);
    stream.on('error', () => response.destroy());
    stream.pipe(response);
  } catch {
    reply(response, 404, 'file not found');
  }
}

function portFrom(arguments_) {
  const option = arguments_.indexOf('--port');
  if (option < 0) return 8080;
  const value = arguments_[option + 1];
  if (!value || !/^\d+$/.test(value)) throw new Error('--port requires a number from 1 to 65535');
  const port = Number(value);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('--port requires a number from 1 to 65535');
  }
  return port;
}

const port = portFrom(process.argv.slice(2));
const server = createServer((request, response) => {
  void serve(request, response);
});

server.listen(port, '127.0.0.1', () => {
  console.log(`ViceFrame is serving app/ at http://localhost:${port}`);
});
