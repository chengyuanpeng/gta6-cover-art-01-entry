// ViceFrame browser entrypoint: wire the studio up once the page is ready.
import { bootStudio } from './app.js';

function startStudio() {
  bootStudio(document);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', startStudio, { once: true });
} else {
  startStudio();
}
