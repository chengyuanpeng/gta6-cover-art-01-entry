// ViceFrame browser entrypoint. This file boots the static, offline-first studio.
import { bootStudio } from './app.js';

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => bootStudio(document), { once: true });
} else {
  bootStudio(document);
}
