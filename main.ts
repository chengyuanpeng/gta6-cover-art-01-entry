// ViceFrame hand-in program: copy app/ and screenshots/ into the output
// directory and write dossier.json with the kit's buildDossier. Running it
// twice over the same repository writes byte-identical output.
import { cpSync, lstatSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-app.ts';

// Gate limits for this competition (see the kit's RULES.txt).
const LIMITS = {
  appEntries: 993,
  appBytes: 48 * 1024 * 1024,
  pathBytes: 1000,
  indexBytes: 1024 * 1024,
  shotCount: 4,
  shotBytes: 256 * 1024,
};

const repoRoot = dirname(fileURLToPath(import.meta.url));
const outDir = resolve(process.env.MAKEFUN_OUTPUT_DIR || '/output');

function mustBeDirectory(path, label) {
  const info = lstatSync(path);
  if (!info.isDirectory() || info.isSymbolicLink()) {
    throw new Error(`${label} is not a plain directory: ${path}`);
  }
}

function checkAppTree(root) {
  mustBeDirectory(root, 'app/');
  let entries = 0;
  let bytes = 0;
  let indexBytes;

  const walk = (folder, prefix) => {
    for (const name of readdirSync(folder).sort()) {
      const path = join(folder, name);
      const key = prefix ? `${prefix}/${name}` : name;
      const info = lstatSync(path);
      entries += 1;
      if (Buffer.byteLength(key, 'utf8') > LIMITS.pathBytes) {
        throw new Error(`App path is too long: ${key}`);
      }
      if (info.isSymbolicLink()) throw new Error(`App holds a symlink: ${key}`);
      if (info.isDirectory()) walk(path, key);
      else if (info.isFile()) {
        bytes += info.size;
        if (key === 'index.html') indexBytes = info.size;
      } else throw new Error(`App holds a non-file entry: ${key}`);
      if (entries > LIMITS.appEntries) throw new Error(`App holds more than ${LIMITS.appEntries} entries`);
      if (bytes > LIMITS.appBytes) throw new Error(`App is larger than ${LIMITS.appBytes} bytes`);
    }
  };

  walk(root, '');
  if (indexBytes === undefined) throw new Error('app/ needs an index.html file');
  if (indexBytes > LIMITS.indexBytes) throw new Error('app/index.html is larger than 1 MiB');
}

function imageSize(buffer, name) {
  const pngMagic = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  if (buffer.length >= 24 && buffer.subarray(0, 8).equals(pngMagic)) {
    return [buffer.readUInt32BE(16), buffer.readUInt32BE(20)];
  }
  if (buffer.length >= 4 && buffer[0] === 0xff && buffer[1] === 0xd8) {
    // Walk JPEG markers until the frame header (SOF) gives the dimensions.
    let at = 2;
    while (at + 3 < buffer.length) {
      if (buffer[at++] !== 0xff) continue;
      while (buffer[at] === 0xff) at += 1;
      const marker = buffer[at++];
      if (marker === 0xd9 || marker === 0xda) break;
      if (at + 1 >= buffer.length) break;
      const size = buffer.readUInt16BE(at);
      if (size < 2 || at + size > buffer.length) break;
      if ([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf].includes(marker)) {
        return [buffer.readUInt16BE(at + 5), buffer.readUInt16BE(at + 3)];
      }
      at += size;
    }
  }
  throw new Error(`${name} is neither a whole PNG nor a whole JPEG`);
}

function checkShots(root) {
  mustBeDirectory(root, 'screenshots/');
  const names = readdirSync(root).sort();
  if (names.length < 3 || names.length > LIMITS.shotCount) {
    throw new Error(`screenshots/ must hold 3 or 4 images (found ${names.length})`);
  }
  for (const name of names) {
    if (!/^[A-Za-z0-9._-]{1,128}$/.test(name) || /^[.-]/.test(name)) {
      throw new Error(`Bad screenshot name: ${name}`);
    }
    if (!/\.(?:png|jpe?g)$/i.test(name)) throw new Error(`Bad screenshot type: ${name}`);
    const path = join(root, name);
    const info = lstatSync(path);
    if (info.isSymbolicLink() || !info.isFile()) throw new Error(`Screenshot is not a plain file: ${name}`);
    if (info.size > LIMITS.shotBytes) throw new Error(`Screenshot is too large: ${name}`);
    const [width, height] = imageSize(readFileSync(path), name);
    if (Math.max(width, height) > 1280 || Math.min(width, height) < 480) {
      throw new Error(`Screenshot size out of bounds: ${name} (${width}x${height})`);
    }
  }
  return names;
}

const appSource = join(repoRoot, 'app');
const shotsSource = join(repoRoot, 'screenshots');
checkAppTree(appSource);
const shotNames = checkShots(shotsSource);

mkdirSync(dirname(outDir), { recursive: true });
mkdirSync(outDir, { recursive: true });
for (const name of ['app', 'screenshots', 'dossier.json']) {
  rmSync(join(outDir, name), { recursive: true, force: true });
}
cpSync(appSource, join(outDir, 'app'), { recursive: true, errorOnExist: true });
cpSync(shotsSource, join(outDir, 'screenshots'), { recursive: true, errorOnExist: true });

const dossier = buildDossier(outDir, {
  text_max_bytes: 163840,
  screenshots: { max: LIMITS.shotCount, max_bytes: LIMITS.shotBytes },
  app_max_files: LIMITS.appEntries,
  app_max_bytes: LIMITS.appBytes,
  app_path_max_bytes: LIMITS.pathBytes,
});
writeFileSync(join(outDir, 'dossier.json'), dossier);
console.log(`ViceFrame handed in to ${outDir} (${shotNames.length} screenshots, dossier written)`);
