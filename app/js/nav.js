// Navigation entre écrans (adresse en « #/… »).

let redraw = () => {};

export const setRedraw = (fn) => { redraw = fn; };

/** Redessine l'écran courant en gardant la position de défilement. */
export const rerender = () => redraw();

export function go(hash, { replace = false } = {}) {
  if (replace) location.replace(hash);
  else location.hash = hash;
}
