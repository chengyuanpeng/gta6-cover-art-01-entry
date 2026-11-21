import { closeSync, cpSync, lstatSync, mkdirSync, openSync, readSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-app.ts';

const LIMITS = {
  appEntries: 993,
  appBytes: 48 * 1024 * 1024,
  appPathBytes: 1000,
  screenshotCount: 4,
  screenshotBytes: 256 * 1024,
};

function requireDirectory(path: string, label: string): void {
  const info = lstatSync(path);
  if (!info.isDirectory() || info.isSymbolicLink()) throw new Error(`${label} must be a real directory: ${path}`);
}

function inspectApp(root: string): void {
  let entries = 0;
  let bytes = 0;

  function visit(directory: string, relative: string): void {
    for (const name of readdirSync(directory).sort()) {
      const child = join(directory, name);
      const appPath = relative ? `${relative}/${name}` : name;
      const info = lstatSync(child);
      entries++;
      if (Buffer.byteLength(appPath, 'utf8') > LIMITS.appPathBytes) {
        throw new Error(`app path exceeds ${LIMITS.appPathBytes} UTF-8 bytes: ${appPath}`);
      }
      if (info.isSymbolicLink()) throw new Error(`app contains a symbolic link: ${appPath}`);
      if (info.isDirectory()) visit(child, appPath);
      else if (info.isFile()) {
        bytes += info.size;
        if (bytes > LIMITS.appBytes) throw new Error(`app exceeds ${LIMITS.appBytes} bytes`);
      } else throw new Error(`app contains a special file: ${appPath}`);
      if (entries > LIMITS.appEntries) throw new Error(`app exceeds ${LIMITS.appEntries} files and directories`);
    }
  }

  requireDirectory(root, 'app/');
  visit(root, '');
  const page = lstatSync(join(root, 'index.html'));
  if (!page.isFile() || page.size > 1024 * 1024) throw new Error('app/index.html must be a regular file no larger than 1 MiB');
}

function inspectScreenshots(root: string): string[] {
  requireDirectory(root, 'screenshots/');
  const names = readdirSync(root).sort();
  if (names.length < 3 || names.length > LIMITS.screenshotCount) {
    throw new Error(`screenshots/ must contain 3 or 4 images; found ${names.length}`);
  }

  for (const name of names) {
    if (!/^[A-Za-z0-9._-]{1,128}$/.test(name) || name.startsWith('.') || name.startsWith('-')) {
      throw new Error(`invalid screenshot filename: ${name}`);
    }
    const path = join(root, name);
    const info = lstatSync(path);
    if (!info.isFile() || info.isSymbolicLink()) throw new Error(`screenshot must be a regular file: ${name}`);
    if (info.size > LIMITS.screenshotBytes) throw new Error(`${name} exceeds ${LIMITS.screenshotBytes} bytes`);
    const head = Buffer.alloc(3);
    const fd = openSync(path, 'r');
    try { readSync(fd, head, 0, 3, 0); } finally { closeSync(fd); }
    const png = head[0] === 0x89 && head[1] === 0x50 && head[2] === 0x4e;
    const jpeg = head[0] === 0xff && head[1] === 0xd8 && head[2] === 0xff;
    if (!png && !jpeg) throw new Error(`${name} is not a PNG or JPEG image`);
  }
  return names;
}

const project = dirname(fileURLToPath(import.meta.url));
const sourceApp = join(project, 'app');
const sourceShots = join(project, 'screenshots');
const destination = resolve(process.env.MAKEFUN_OUTPUT_DIR || '/output');

inspectApp(sourceApp);
inspectScreenshots(sourceShots);

mkdirSync(dirname(destination), { recursive: true });
mkdirSync(destination, { recursive: true });
for (const item of ['app', 'screenshots', 'dossier.json']) {
  rmSync(join(destination, item), { recursive: true, force: true });
}
cpSync(sourceApp, join(destination, 'app'), { recursive: true, errorOnExist: true });
cpSync(sourceShots, join(destination, 'screenshots'), { recursive: true, errorOnExist: true });

const dossier = buildDossier(destination, {
  text_max_bytes: 163840,
  screenshots: { max: LIMITS.screenshotCount, max_bytes: LIMITS.screenshotBytes },
  app_max_files: LIMITS.appEntries,
  app_max_bytes: LIMITS.appBytes,
  app_path_max_bytes: LIMITS.appPathBytes,
});
writeFileSync(join(destination, 'dossier.json'), dossier);
console.log(`ViceFrame package written to ${destination}`);
