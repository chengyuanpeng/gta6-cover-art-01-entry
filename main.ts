import { cpSync, lstatSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-app.ts';

const rules = {
  appItems: 993,
  appBytes: 48 * 1024 * 1024,
  pathBytes: 1000,
  htmlBytes: 1024 * 1024,
  screenshotCount: 4,
  screenshotBytes: 256 * 1024,
};

const project = dirname(fileURLToPath(import.meta.url));
const destination = resolve(process.env.MAKEFUN_OUTPUT_DIR || '/output');

function directory(path: string): void {
  const details = lstatSync(path);
  if (!details.isDirectory() || details.isSymbolicLink()) {
    throw new Error(`Expected a physical directory at ${path}`);
  }
}

function inspectApp(root: string): void {
  directory(root);
  let entries = 0;
  let bytes = 0;
  let indexSize: number | undefined;

  const inspect = (folder: string, relative: string): void => {
    for (const name of readdirSync(folder).sort()) {
      const path = join(folder, name);
      const key = relative ? `${relative}/${name}` : name;
      const stat = lstatSync(path);
      entries++;
      if (Buffer.byteLength(key, 'utf8') > rules.pathBytes) throw new Error(`App path exceeds limit: ${key}`);
      if (stat.isSymbolicLink()) throw new Error(`App contains a symbolic link: ${key}`);
      if (stat.isDirectory()) inspect(path, key);
      else if (stat.isFile()) {
        bytes += stat.size;
        if (key === 'index.html') indexSize = stat.size;
      } else throw new Error(`App contains a non-file entry: ${key}`);
      if (entries > rules.appItems) throw new Error(`App exceeds ${rules.appItems} entries`);
      if (bytes > rules.appBytes) throw new Error(`App exceeds ${rules.appBytes} bytes`);
    }
  };

  inspect(root, '');
  if (indexSize === undefined) throw new Error('App needs a regular index.html file');
  if (indexSize > rules.htmlBytes) throw new Error('App index.html exceeds 1 MiB');
}

function dimensions(image: Buffer, name: string): [number, number] {
  const pngSignature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  if (image.length >= 24 && image.subarray(0, 8).equals(pngSignature)) {
    return [image.readUInt32BE(16), image.readUInt32BE(20)];
  }
  if (image.length >= 4 && image[0] === 0xff && image[1] === 0xd8) {
    let at = 2;
    while (at + 3 < image.length) {
      if (image[at++] !== 0xff) continue;
      while (image[at] === 0xff) at++;
      const marker = image[at++];
      if (marker === 0xd9 || marker === 0xda) break;
      if (at + 1 >= image.length) break;
      const size = image.readUInt16BE(at);
      if (size < 2 || at + size > image.length) break;
      if ([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf].includes(marker)) {
        return [image.readUInt16BE(at + 5), image.readUInt16BE(at + 3)];
      }
      at += size;
    }
  }
  throw new Error(`${name} is not a PNG or JPEG image`);
}

function inspectScreenshots(root: string): string[] {
  directory(root);
  const names = readdirSync(root).sort();
  if (names.length < 3 || names.length > rules.screenshotCount) {
    throw new Error(`Screenshots must contain 3 or 4 images (found ${names.length})`);
  }
  for (const name of names) {
    if (!/^[A-Za-z0-9._-]{1,128}$/.test(name) || /^[.-]/.test(name)) {
      throw new Error(`Invalid screenshot name: ${name}`);
    }
    if (!/\.(?:png|jpe?g)$/i.test(name)) throw new Error(`Unsupported screenshot extension: ${name}`);
    const imagePath = join(root, name);
    const stat = lstatSync(imagePath);
    if (stat.isSymbolicLink() || !stat.isFile()) throw new Error(`Screenshot must be a plain file: ${name}`);
    if (stat.size > rules.screenshotBytes) throw new Error(`Screenshot is too large: ${name}`);
    const [width, height] = dimensions(readFileSync(imagePath), name);
    if (Math.max(width, height) > 1280 || Math.min(width, height) < 480) {
      throw new Error(`Screenshot dimensions are out of bounds: ${name} (${width}x${height})`);
    }
  }
  return names;
}

const sourceApp = join(project, 'app');
const sourceShots = join(project, 'screenshots');
inspectApp(sourceApp);
const shotNames = inspectScreenshots(sourceShots);

mkdirSync(dirname(destination), { recursive: true });
mkdirSync(destination, { recursive: true });
for (const name of ['app', 'screenshots', 'dossier.json']) {
  rmSync(join(destination, name), { recursive: true, force: true });
}
cpSync(sourceApp, join(destination, 'app'), { recursive: true, errorOnExist: true });
cpSync(sourceShots, join(destination, 'screenshots'), { recursive: true, errorOnExist: true });

const dossierBytes = buildDossier(destination, {
  text_max_bytes: 163840,
  screenshots: { max: rules.screenshotCount, max_bytes: rules.screenshotBytes },
  app_max_files: rules.appItems,
  app_max_bytes: rules.appBytes,
  app_path_max_bytes: rules.pathBytes,
});
writeFileSync(join(destination, 'dossier.json'), dossierBytes);
console.log(`ViceFrame prepared in ${destination} (${shotNames.length} screenshots, dossier written)`);
