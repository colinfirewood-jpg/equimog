// Petites briques d'interface partagées : icônes, messages, feuilles.

const svg = (body, sw = 1.8) =>
  `<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round">${body}</svg>`;

export const icon = {
  back: svg('<path d="m15 18-6-6 6-6"/>', 2),
  gear: svg('<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>', 1.6),
  search: svg('<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>'),
  plus: svg('<path d="M12 5v14M5 12h14"/>', 2.2),
  doc: svg('<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5M9 13h6M9 17h6"/>'),
  download: svg('<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5M12 11v6M9.5 14.5 12 17l2.5-2.5"/>'),
  info: svg('<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/>', 2),
  share: svg('<path d="M12 3v12M8 7l4-4 4 4"/><path d="M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7"/>'),
};

export function toast(message, ms = 2600) {
  document.querySelector('.toast')?.remove();
  const el = document.createElement('div');
  el.className = 'toast';
  el.setAttribute('role', 'status');
  el.textContent = message;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), ms);
}

/** Ouvre une feuille en bas d'écran. Renvoie une fonction pour la fermer. */
export function openSheet(html, onMount) {
  const backdrop = document.createElement('div');
  backdrop.className = 'sheet-backdrop';
  backdrop.innerHTML = `<div class="sheet" role="dialog" aria-modal="true">${html}</div>`;
  const close = () => { backdrop.remove(); document.removeEventListener('keydown', onKey); };
  const onKey = (e) => { if (e.key === 'Escape') close(); };
  backdrop.addEventListener('click', (e) => { if (e.target === backdrop) close(); });
  document.addEventListener('keydown', onKey);
  document.body.appendChild(backdrop);
  onMount?.(backdrop.querySelector('.sheet'), close);
  return close;
}

/** Demande une confirmation. Résout à true si l'utilisatrice confirme. */
export function confirmSheet({ title, message, confirm, cancel = 'Annuler', danger = false }) {
  return new Promise((resolve) => {
    let done = false;
    const finish = (v, close) => { if (!done) { done = true; close(); resolve(v); } };
    openSheet(`
      <div class="sheet-head"><h2>${title}</h2></div>
      <p>${message}</p>
      <div class="btn-row">
        <button class="${danger ? 'btn-danger' : 'btn-primary'}" data-ok>${confirm}</button>
        <button class="btn-secondary" data-cancel>${cancel}</button>
      </div>`, (sheet, close) => {
      sheet.querySelector('[data-ok]').addEventListener('click', () => finish(true, close));
      sheet.querySelector('[data-cancel]').addEventListener('click', () => finish(false, close));
      sheet.parentElement.addEventListener('click', (e) => { if (e.target === sheet.parentElement) finish(false, () => {}); });
    });
  });
}

export const isTouchDevice = () =>
  /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

export const isIOS = () =>
  /iPhone|iPad|iPod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

export const isInstalled = () =>
  window.navigator.standalone === true || window.matchMedia('(display-mode: standalone)').matches;

/** Sur téléphone : menu Partager d'iOS. Sur ordinateur : téléchargement. */
export async function shareOrDownload(blob, filename) {
  const file = new File([blob], filename, { type: blob.type });
  if (isTouchDevice() && navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file] });
      return 'shared';
    } catch (e) {
      if (e.name === 'AbortError') return 'cancelled';
    }
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 20000);
  return 'downloaded';
}
