// Réglages : nom de l'évaluatrice, sauvegarde, aide pour l'envoi vers le PC.

import * as S from '../store.js';
import { esc, todayISO, day } from '../format.js';
import { openSheet, confirmSheet, shareOrDownload, toast } from '../ui.js';
import { rerender } from '../nav.js';

export const APP_VERSION = '1.0';

export function openSettings() {
  const s = S.settings();
  const { patients, bilans } = S.counts();
  const last = s.lastBackup ? day(new Date(s.lastBackup).toISOString().slice(0, 10)) : 'jamais';

  openSheet(`
    <div class="sheet-head"><h2>Réglages</h2><button data-close>OK</button></div>

    <div class="group">
      <span class="eyebrow">Évaluatrice</span>
      <input class="text-input" id="evaluatrice" placeholder="Prénom Nom" autocomplete="name" value="${esc(s.evaluatrice)}">
      <p>Ce nom est repris sur les nouveaux bilans et dans les PDF.</p>
    </div>

    <div class="group">
      <span class="eyebrow">Envoyer les PDF vers l'ordinateur</span>
      <ol>
        <li>Après « Générer le PDF », touchez <b>Enregistrer dans Fichiers</b>.</li>
        <li>Choisissez <b>iCloud Drive › EquiMoG</b> (iOS s'en souvient ensuite).</li>
        <li>Sur le PC, le PDF apparaît dans l'Explorateur, dossier <b>iCloud Drive › EquiMoG</b>. Glissez-le dans Vega.</li>
      </ol>
    </div>

    <div class="group">
      <span class="eyebrow">Sauvegarde</span>
      <p>Les bilans sont gardés uniquement sur ce téléphone (${patients} patient${patients > 1 ? 's' : ''}, ${bilans} bilan${bilans > 1 ? 's' : ''}). Dernière sauvegarde : ${last}. Rangez la sauvegarde dans iCloud Drive pour pouvoir la restaurer sur un nouveau téléphone.</p>
      <div class="btn-row">
        <button class="btn-secondary" data-export ${S.isDemo ? 'disabled' : ''}>Faire une sauvegarde</button>
        <label class="btn-secondary" style="cursor:pointer">Restaurer une sauvegarde
          <input type="file" accept=".json,application/json" data-import hidden>
        </label>
      </div>
    </div>

    <p style="font-size:12px">EquiMoG ${APP_VERSION} · aucune donnée ne quitte cet appareil.</p>
  `, (sheet, close) => {
    sheet.querySelector('[data-close]').addEventListener('click', () => { close(); rerender(); });
    sheet.querySelector('#evaluatrice').addEventListener('input', (e) => {
      S.setSettings({ evaluatrice: e.target.value });
      rerender();
    });

    sheet.querySelector('[data-export]').addEventListener('click', async () => {
      const blob = new Blob([S.exportData()], { type: 'application/json' });
      const result = await shareOrDownload(blob, `EquiMoG sauvegarde ${todayISO()}.json`);
      if (result !== 'cancelled' && result !== 'error') {
        S.setSettings({ lastBackup: Date.now() });
        toast('Sauvegarde créée');
      }
    });

    sheet.querySelector('[data-import]').addEventListener('change', async (e) => {
      const file = e.target.files?.[0];
      e.target.value = '';
      if (!file) return;
      const ok = await confirmSheet({
        title: 'Restaurer la sauvegarde ?',
        message: 'Les bilans actuellement dans l’app seront remplacés par ceux de la sauvegarde.',
        confirm: 'Restaurer',
        danger: true,
      });
      if (!ok) return;
      try {
        const n = S.importData(await file.text());
        toast(`${n} bilan${n > 1 ? 's' : ''} restauré${n > 1 ? 's' : ''}`);
        close();
        rerender();
      } catch (err) {
        toast(err.message || 'Fichier illisible.');
      }
    });
  });
}
