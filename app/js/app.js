// Point d'entrée : routes, rendu des écrans, mode hors ligne.

import * as home from './views/home.js';
import * as nouveau from './views/nouveau.js';
import * as saisie from './views/saisie.js';
import * as recap from './views/recap.js';
import { askPersistence, isDemo } from './store.js';
import { setRedraw } from './nav.js';

const root = document.getElementById('app');

const ROUTES = [
  [/^#?\/?$/, home],
  [/^#\/nouveau(?:\/([\w-]+))?$/, nouveau],
  [/^#\/saisie\/([\w-]+)$/, saisie],
  [/^#\/recap\/([\w-]+)$/, recap],
];

let current = null;

function resolve() {
  const hash = location.hash || '#/';
  for (const [re, view] of ROUTES) {
    const m = re.exec(hash);
    if (m) return { view, param: m[1] };
  }
  return { view: home, param: undefined };
}

setRedraw(() => {
  if (!current) return;
  const y = window.scrollY;
  current.view.render(root, current.param, { fresh: false });
  window.scrollTo(0, y);
});

function onRoute() {
  current = resolve();
  current.view.render(root, current.param, { fresh: true });
  window.scrollTo(0, 0);
}

window.addEventListener('hashchange', onRoute);
onRoute();
askPersistence();

// Mode hors ligne : l'app se charge même sans réseau une fois installée.
if ('serviceWorker' in navigator && !isDemo) {
  const hadController = !!navigator.serviceWorker.controller;
  navigator.serviceWorker.register('./sw.js').catch(() => {});
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (hadController) location.reload(); // nouvelle version publiée
  });
}
