// Récapitulatif d'un bilan et génération du PDF.

import * as S from '../store.js';
import { SECTIONS, VM_THRESHOLD, score, sectionScore, deficientItems } from '../questionnaire.js';
import { day, esc, vm, plural, signed } from '../format.js';
import { icon } from '../ui.js';
import { exportPdf, fileNameFor } from '../export.js';
import { go } from '../nav.js';

let exported = false;

export function render(root, bilanId, { fresh }) {
  const b = S.bilan(bilanId);
  if (!b) { go('#/', { replace: true }); return; }
  if (fresh) exported = false;
  const p = S.patientOfBilan(b);
  const debut = S.debutOfBilan(b);
  const isFin = b.moment === 'fin';
  const total = score(b);
  const deficient = deficientItems(b);

  const vmPill = (v) => {
    if (v == null) return '<span class="muted">Non mesurée</span>';
    const above = v >= VM_THRESHOLD;
    return `<span style="display:flex;align-items:center;gap:8px"><b class="num">${vm(v)} m/s</b><span class="pill sm ${above ? '' : 'brick'}">${above ? 'Au-dessus du seuil' : 'Sous le seuil'}</span></span>`;
  };

  let scoreBottom;
  let delta = '';
  if (debut) {
    const d = total - score(debut);
    delta = `<span class="pill lg ${d < 0 ? 'brick' : ''}">${signed(d)} pts</span>`;
    scoreBottom = `<div class="two-cols">
      <div><span class="muted">Début · ${day(debut.date)}</span><b class="num">${score(debut)} / 26</b></div>
      <div><span class="muted">Vitesse de marche</span><b class="num">${vm(debut.vm)} → ${vm(b.vm)} m/s</b></div>
    </div>`;
  } else {
    scoreBottom = `<div class="vm-line"><span class="muted">Vitesse de marche</span>${vmPill(b.vm)}</div>`;
  }

  const bars = SECTIONS.map((s) => {
    const n = s.items.length;
    const f = sectionScore(b, s);
    const d = debut ? sectionScore(debut, s) : null;
    return `<div class="bar-row">
      <span class="id">${s.id}</span>
      <div class="mid"><span>${s.recapName}</span>
        ${debut ? `<div class="meter grey"><i style="width:${(d / n) * 100}%"></i></div>` : ''}
        <div class="meter"><i style="width:${(f / n) * 100}%"></i></div>
      </div>
      <span class="val num" style="width:${debut ? 64 : 40}px">${debut ? `${d} → ${f} /${n}` : `${f}/${n}`}</span>
    </div>`;
  }).join('');

  root.innerHTML = `
  <div class="screen">
    <button class="back" data-back>${icon.back} Modifier la saisie</button>
    <div class="recap">
      <div>
        <span class="eyebrow">Bilan de ${isFin ? 'fin' : 'début'} de cycle · ${day(b.date)}</span>
        <h1>${esc(S.displayName(p))}</h1>
      </div>

      <div class="card score-card">
        <div class="score-top">
          <div><div class="l">Score total</div><div class="v num">${total}<small> / 26</small></div></div>
          ${delta}
        </div>
        <div class="score-bottom">${scoreBottom}</div>
      </div>

      <div class="card bars">
        <div class="bars-head">Par section
          ${debut ? '<span class="legend"><span><i class="g"></i>Début</span><span><i></i>Fin</span></span>' : ''}
        </div>
        ${bars}
      </div>

      <div class="group">
        <span class="eyebrow">${isFin ? 'Reste déficient' : plural(deficient.length, 'item déficient', 'items déficients')}</span>
        ${deficient.length
          ? `<div class="tags">${deficient.map((it) => `<span class="tag-bad">${esc(it.short)}</span>`).join('')}</div>`
          : '<div><span class="pill">Aucun item déficient</span></div>'}
      </div>

      ${!isFin ? `<div class="info-box">${icon.info}<span>${esc(p?.prenom || 'Le patient')} passe dans les patients en cours. Son bilan de fin lui sera proposé en un tap depuis l'accueil.</span></div>` : ''}

      <div class="pdf-card">
        <span class="pdf-icon">PDF</span>
        <div><b>${esc(fileNameFor(b))}</b><span>Partager › Enregistrer dans Fichiers › iCloud Drive › EquiMoG</span></div>
      </div>

      ${exported ? '<button class="btn-secondary" data-home>Revenir aux bilans</button>' : ''}
    </div>
  </div>
  <div class="bottom-bar"><div class="inner">
    <button class="btn-primary" id="pdf">${icon.download} ${exported ? 'Générer à nouveau le PDF' : 'Générer le PDF'}</button>
  </div></div>`;

  root.querySelector('[data-back]').onclick = () => go(`#/saisie/${b.id}`);
  root.querySelector('[data-home]')?.addEventListener('click', () => go('#/'));
  root.querySelector('#pdf').onclick = async () => {
    const result = await exportPdf(b);
    if (result === 'shared' || result === 'downloaded') {
      exported = true;
      render(root, bilanId, { fresh: false });
    }
  };
}
