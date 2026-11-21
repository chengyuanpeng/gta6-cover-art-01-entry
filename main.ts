import { cpSync, lstatSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-app.ts';

const ceiling = {
  entries: 993,
  bytes: 48 * 1024 * 1024,
  pathBytes: 1000,
  shots: 4,
  shotBytes: 256 * 1024,
};

function requireFolder(path: string, name: string): void {
  const stat = lstatSync(path);
  if (stat.isSymbolicLink() || !stat.isDirectory()) {
    throw new Error(`${name} must be a real directory (${path})`);
  }
}

function auditApp(folder: string): void {
  requireFolder(folder, 'app/');
  let itemCount = 0;
  let storedBytes = 0;
  let pageFound = false;

  function walk(at: string, prefix: string): void {
    for (const leaf of readdirSync(at).sort()) {
      const fullPath = join(at, leaf);
      const relativePath = prefix ? `${prefix}/${leaf}` : leaf;
      const info = lstatSync(fullPath);
      itemCount++;
      if (Buffer.byteLength(relativePath, 'utf8') > ceiling.pathBytes) {
        throw new Error(`app path is too long: ${relativePath}`);
      }
      if (info.isSymbolicLink()) throw new Error(`app cannot contain a link: ${relativePath}`);
      if (info.isDirectory()) {
        walk(fullPath, relativePath);
      } else if (info.isFile()) {
        storedBytes += info.size;
        if (relativePath === 'index.html') {
          pageFound = true;
          if (info.size > 1024 * 1024) throw new Error('app/index.html is over 1 MiB');
        }
      } else {
        throw new Error(`app contains an unsupported filesystem item: ${relativePath}`);
      }
      if (itemCount > ceiling.entries) throw new Error(`app has more than ${ceiling.entries} files and folders`);
      if (storedBytes > ceiling.bytes) throw new Error(`app uses more than ${ceiling.bytes} bytes`);
    }
  }

  walk(folder, '');
  if (!pageFound) throw new Error('app/index.html is missing or is not a regular file');
}

function imageDimensions(bytes: Buffer, file: string): [number, number] {
  if (bytes.length >= 24 && bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) {
    return [bytes.readUInt32BE(16), bytes.readUInt32BE(20)];
  }
  if (bytes.length >= 4 && bytes[0] === 0xff && bytes[1] === 0xd8) {
    let cursor = 2;
    while (cursor + 3 < bytes.length) {
      if (bytes[cursor] !== 0xff) { cursor++; continue; }
      while (bytes[cursor] === 0xff) cursor++;
      const marker = bytes[cursor++];
      if (marker === 0xd9 || marker === 0xda) break;
      if (cursor + 1 >= bytes.length) break;
      const length = bytes.readUInt16BE(cursor);
      if (length < 2 || cursor + length > bytes.length) break;
      if ([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf].includes(marker)) {
        return [bytes.readUInt16BE(cursor + 5), bytes.readUInt16BE(cursor + 3)];
      }
      cursor += length;
    }
  }
  throw new Error(`${file} is not a readable PNG or JPEG image`);
}

function auditScreenshots(folder: string): string[] {
  requireFolder(folder, 'screenshots/');
  const names = readdirSync(folder).sort();
  if (names.length < 3 || names.length > ceiling.shots) {
    throw new Error(`screenshots/ needs 3 or 4 images; found ${names.length}`);
  }
  for (const name of names) {
    if (!/^[A-Za-z0-9._-]{1,128}$/.test(name) || name[0] === '.' || name[0] === '-') {
      throw new Error(`screenshot filename is not allowed: ${name}`);
    }
    const path = join(folder, name);
    const info = lstatSync(path);
    if (info.isSymbolicLink() || !info.isFile()) throw new Error(`screenshot must be a regular file: ${name}`);
    if (!/\.(png|jpe?g)$/i.test(name)) throw new Error(`screenshot must use PNG or JPEG: ${name}`);
    if (info.size > ceiling.shotBytes) throw new Error(`${name} is over ${ceiling.shotBytes} bytes`);
    const [width, height] = imageDimensions(readFileSync(path), name);
    if (Math.max(width, height) > 1280 || Math.min(width, height) < 480) {
      throw new Error(`${name} dimensions ${width}x${height} are outside the screenshot limits`);
    }
  }
  return names;
}

const home = dirname(fileURLToPath(import.meta.url));
const appSource = join(home, 'app');
const shotsSource = join(home, 'screenshots');
const target = resolve(process.env.MAKEFUN_OUTPUT_DIR || '/output');

auditApp(appSource);
const shotNames = auditScreenshots(shotsSource);

mkdirSync(dirname(target), { recursive: true });
mkdirSync(target, { recursive: true });
for (const name of ['app', 'screenshots', 'dossier.json']) {
  rmSync(join(target, name), { recursive: true, force: true });
}
cpSync(appSource, join(target, 'app'), { recursive: true, errorOnExist: true });
cpSync(shotsSource, join(target, 'screenshots'), { recursive: true, errorOnExist: true });

const dossier = buildDossier(target, {
  text_max_bytes: 163840,
  screenshots: { max: ceiling.shots, max_bytes: ceiling.shotBytes },
  app_max_files: ceiling.entries,
  app_max_bytes: ceiling.bytes,
  app_path_max_bytes: ceiling.pathBytes,
});
writeFileSync(join(target, 'dossier.json'), dossier);
console.log(`ViceFrame output ready at ${target}: app/ plus ${shotNames.length} screenshots and dossier.json`);
