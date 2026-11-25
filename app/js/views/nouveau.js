// Nouveau bilan : début ou fin de cycle, puis le patient.

import * as S from '../store.js';
import { score } from '../questionnaire.js';
import { day, todayISO, dobInput, validDob, esc } from '../format.js';
import { icon } from '../ui.js';
import { openSettings } from './settings.js';
import { go, rerender } from '../nav.js';

let state = null;

function openCycles() {
  return S.cycles()
    .filter((c) => S.status(c) === 'finAFaire')
    .sort((a, b) => (S.debutOf(b)?.date || '').localeCompare(S.debutOf(a)?.date || ''));
}

export function render(root, cycleId, { fresh }) {
  if (fresh || !state) {
    state = { fin: !!cycleId, picked: cycleId || null, nom: '', prenom: '', dob: '' };
    if (state.fin && !S.cycle(cycleId)) state = { ...state, fin: false, picked: null };
  }
  const open = openCycles();
  if (state.fin && !state.picked && open.length) state.picked = open[0].id;
  const picked = state.picked ? S.cycle(state.picked) : null;
  const p = picked ? S.patientOf(picked) : null;
  const evaluatrice = S.settings().evaluatrice.trim();

  const fields = state.fin
    ? [['Nom', p?.nom], ['Prénom', p?.prenom], ['Date de naissance', p?.dob]]
        .map(([l, v]) => `<div class="field-row"><span>${l}</span><span class="ro" style="color:${v ? 'var(--ink)' : 'var(--placeholder)'}">${esc(v || '—')}</span></div>`).join('')
    : `
      <label class="field-row"><span>Nom</span><input id="nom" placeholder="DUPONT" autocomplete="off" autocorrect="off" autocapitalize="characters" spellcheck="false" value="${esc(state.nom)}"></label>
      <label class="field-row"><span>Prénom</span><input id="prenom" placeholder="Marie" autocomplete="off" autocorrect="off" autocapitalize="words" spellcheck="false" value="${esc(state.prenom)}"></label>
      <label class="field-row"><span>Date de naissance</span><input id="dob" placeholder="jj/mm/aaaa" inputmode="numeric" autocomplete="off" value="${esc(state.dob)}"></label>`;

  const openList = !state.fin ? '' : `
    <div class="group">
      <span class="eyebrow">Patients en cours</span>
      <div class="list-card">
        ${open.length ? open.map((c) => {
          const d = S.debutOf(c);
          const on = c.id === state.picked;
          return `<button class="radio-row ${on ? 'on' : ''}" data-pick="${c.id}" aria-pressed="${on}">
            <span class="radio-dot"></span>
            <span><span class="t">${esc(S.displayName(S.patientOf(c)))}</span>
            <span class="s">Début le ${day(d.date)} · ${score(d)}/26${S.finOf(c) ? ' · fin en cours' : ''}</span></span>
          </button>`;
        }).join('') : '<div class="list-empty">Aucun patient n’attend de bilan de fin. Faites d’abord un bilan de début.</div>'}
      </div>
    </div>`;

  root.innerHTML = `
  <div class="screen">
    <div class="top-row">
      <button class="back" data-back>${icon.back} Bilans</button>
      <span class="muted" style="font-size:14px">${day(todayISO())}</span>
    </div>
    <div class="stack">
      <h1 class="h-l">Nouveau bilan</h1>
      <div class="group">
        <span class="eyebrow">Moment du cycle</span>
        <div class="seg">
          <button class="${state.fin ? '' : 'on'}" data-seg="debut" aria-pressed="${!state.fin}">Début de cycle</button>
          <button class="${state.fin ? 'on' : ''}" data-seg="fin" aria-pressed="${state.fin}">Fin de cycle</button>
        </div>
      </div>
      ${openList}
      <div class="group">
        <span class="eyebrow">Patient</span>
        <div class="list-card">${fields}</div>
        <div class="error" id="dob-error" hidden>Date de naissance invalide.</div>
      </div>
      <div class="eval-row">
        <span>Évaluatrice</span>
        <button data-eval class="${evaluatrice ? '' : 'empty-val'}">${esc(evaluatrice || 'À renseigner')}</button>
      </div>
    </div>
  </div>
  <div class="bottom-bar"><div class="inner">
    <button class="btn-primary" id="start">${state.fin && picked && S.finOf(picked) ? 'Reprendre le bilan' : 'Commencer le bilan'}</button>
  </div></div>`;

  const startBtn = root.querySelector('#start');
  const refresh = () => {
    const dobBad = !state.fin && state.dob.length === 10 && !validDob(state.dob);
    root.querySelector('#dob-error').hidden = !dobBad;
    startBtn.disabled = state.fin
      ? !state.picked
      : !(state.nom.trim() && state.prenom.trim() && validDob(state.dob));
  };
  refresh();

  root.querySelector('[data-back]').onclick = () => go('#/');
  root.querySelector('[data-eval]').onclick = () => openSettings();
  root.querySelectorAll('[data-seg]').forEach((b) => {
    b.onclick = () => { state.fin = b.dataset.seg === 'fin'; rerender(); };
  });
  root.querySelectorAll('[data-pick]').forEach((b) => {
    b.onclick = () => { state.picked = b.dataset.pick; rerender(); };
  });
  for (const id of ['nom', 'prenom']) {
    root.querySelector(`#${id}`)?.addEventListener('input', (e) => { state[id] = e.target.value; refresh(); });
  }
  root.querySelector('#dob')?.addEventListener('input', (e) => {
    const v = dobInput(e.target.value);
    if (v !== e.target.value) e.target.value = v;
    state.dob = v;
    refresh();
  });

  startBtn.onclick = () => {
    const evalName = S.settings().evaluatrice.trim();
    let bilan;
    if (state.fin) {
      if (!state.picked) return;
      bilan = S.startFin(state.picked, evalName);
    } else {
      bilan = S.startDebut({
        nom: state.nom.trim().toLocaleUpperCase('fr-FR'),
        prenom: state.prenom.trim(),
        dob: state.dob,
        evaluatrice: evalName,
      });
    }
    state = null;
    go(`#/saisie/${bilan.id}`, { replace: true });
  };
}
