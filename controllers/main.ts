import '@fontsource/space-grotesk/500.css';
import '@fontsource/space-grotesk/700.css';
import '@fontsource/ibm-plex-sans/400.css';
import '@fontsource/ibm-plex-sans/500.css';
import '@fontsource/ibm-plex-sans/600.css';
import '@fontsource/jetbrains-mono/400.css';
import '@fontsource/jetbrains-mono/600.css';

import '../assets/styles/tokens.css';
import '../assets/styles/base.css';
import '../assets/styles/components.css';

import { AppController } from './appController';

const root = document.getElementById('app');
if (root) {
  const controller = new AppController();
  controller.mount(root);
}
