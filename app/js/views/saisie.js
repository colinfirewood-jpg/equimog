// Saisie des 26 items, de la vitesse de marche et des commentaires.

import * as S from '../store.js';
import {
  SECTIONS, ITEMS, ITEM_COUNT, VM_THRESHOLD, optionLabel, pointsFor,
  score, answeredCount, sectionScore, sectionAnswered,
} from '../questionnaire.js';
import { day, esc, vm, vmInput, parseVm, plural } from '../format.js';
import { icon, confirmSheet } from '../ui.js';
import { go, rerender } from '../nav.js';

export function render(root, bilanId, { fresh }) {
  const b = S.bilan(bilanId);
  if (!b) { go('#/', { replace: true }); return; }
  const p = S.patientOfBilan(b);
  const debut = S.debutOfBilan(b);
  const answered = answeredCount(b);

  const subtitle = debut
    ? `Fin de cycle · début le ${day(debut.date)} : ${score(debut)}/26`
    : `${b.moment === 'fin' ? 'Fin' : 'Début'} de cycle · ${day(b.date)}`;

  const sections = SECTIONS.map((s) => `
    <section class="card sec" id="sec-${s.id}">
      <div class="sec-head">
        <span class="badge-id">${s.id}</span>
        <div class="sec-title"><b>${s.title}</b><span>${s.sub}</span></div>
        <span class="sec-total num">${sectionScore(b, s)}/${s.items.length}</span>
      </div>
      ${s.items.map((it) => itemRow(b, debut, s, it)).join('')}
    </section>`).join('');

  root.innerHTML = `
  <div class="screen saisie">
    <header class="saisie-head">
      <div class="row-between">
        <button class="back" data-back>${icon.back} Bilans</button>
        <span class="saved">${S.isDemo ? 'Démonstration' : 'Enregistré automatiquement'}</span>
      </div>
      <div>
        <div class="who">${esc(S.displayName(p))}</div>
        <div class="who-sub">${subtitle}</div>
      </div>
      <div class="progress"><i style="width:${Math.round((answered / ITEM_COUNT) * 100)}%"></i></div>
      <nav class="nav-chips" aria-label="Sections">
        ${SECTIONS.map((s) => `<button class="nav-chip" data-jump="sec-${s.id}">${s.id} <span class="num">${sectionAnswered(b, s)}/${s.items.length}</span></button>`).join('')}
        <button class="nav-chip" data-jump="sec-VM">VM</button>
      </nav>
    </header>

    <div class="sections">
      ${sections}

      <section class="card vm-card" id="sec-VM">
        <div class="vm-head"><span class="badge-id" style="font-size:13px">VM</span>Vitesse de marche</div>
        <label class="vm-input">
          <input id="vm" inputmode="decimal" placeholder="0,00" autocomplete="off" value="${b.vm == null ? '' : vm(b.vm)}" aria-label="Vitesse de marche en mètres par seconde">
          <span class="muted" style="font-size:16px">m/s</span>
        </label>
        <div class="vm-foot">
          <span>Seuil ${vm(VM_THRESHOLD)}${debut ? ` · début ${vm(debut.vm)}` : ''}</span>
          <span id="vm-status"></span>
        </div>
      </section>

      <section class="card comments">
        <label for="com">Commentaires</label>
        <textarea id="com" rows="4" placeholder="Observations libres. Le micro du clavier permet de dicter.">${esc(b.commentaires)}</textarea>
      </section>
    </div>
  </div>
  <div class="bottom-bar white"><div class="inner">
    <div class="score-box">
      <span class="big num">${score(b)}<small> / 26</small></span>
      <span class="s">${plural(answered, 'réponse', 'réponses')} sur 26</span>
    </div>
    <button class="btn-primary fit" id="finish">Terminer</button>
  </div></div>`;

  updateVmStatus(root, b);

  root.querySelector('[data-back]').onclick = () => go('#/');
  root.querySelectorAll('[data-jump]').forEach((el) => {
    el.onclick = () => document.getElementById(el.dataset.jump)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });

  root.querySelectorAll('[data-opt]').forEach((btn) => {
    btn.onclick = () => {
      const { item, opt } = btn.dataset;
      const o = Number(opt);
      if (b.answers[item] === o) delete b.answers[item];
      else b.answers[item] = o;
      S.touch(b);
      const wasAnswered = b.answers[item] !== undefined;
      rerender();
      if (wasAnswered) revealNext(item, b);
    };
  });

  const vmField = root.querySelector('#vm');
  vmField.addEventListener('input', () => {
    const clean = vmInput(vmField.value);
    if (clean !== vmField.value) vmField.value = clean;
    b.vm = parseVm(clean);
    S.touch(b);
    updateVmStatus(root, b);
  });

  root.querySelector('#com').addEventListener('input', (e) => {
    b.commentaires = e.target.value;
    S.touch(b);
  });

  root.querySelector('#finish').onclick = async () => {
    const missing = ITEM_COUNT - answeredCount(b);
    if (missing > 0) {
      const ok = await confirmSheet({
        title: 'Bilan incomplet',
        message: `${plural(missing, 'item n’a', 'items n’ont')} pas de réponse. ${missing > 1 ? 'Ils seront comptés' : 'Il sera compté'} comme déficient${missing > 1 ? 's' : ''}.`,
        confirm: 'Terminer quand même',
        cancel: 'Continuer la saisie',
      });
      if (!ok) {
        const first = ITEMS.find((it) => b.answers[it.id] === undefined);
        if (first) document.querySelector(`[data-row="${first.id}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        return;
      }
    }
    b.complete = true;
    S.touch(b);
    go(`#/recap/${b.id}`);
  };

  if (fresh && answered > 0 && answered < ITEM_COUNT) {
    // Reprise d'un bilan : on se place sur le premier item sans réponse.
    const first = ITEMS.find((it) => b.answers[it.id] === undefined);
    requestAnimationFrame(() => document.querySelector(`[data-row="${first.id}"]`)?.scrollIntoView({ block: 'center' }));
  }
}

function itemRow(b, debut, section, it) {
  const a = b.answers[it.id];
  const btn = (o) => {
    const sel = a === o;
    const cls = sel ? (pointsFor(it, o) ? 'good' : 'bad') : '';
    return `<button class="opt ${cls}" data-opt="${o}" data-item="${it.id}" aria-pressed="${sel}" aria-label="${esc(it.label)} : ${optionLabel(section, o)}">${optionLabel(section, o)}</button>`;
  };
  const prev = debut
    ? `<span>Début : ${debut.answers[it.id] === undefined ? '—' : optionLabel(section, debut.answers[it.id])}</span>`
    : '';
  return `
    <div class="item" data-row="${it.id}">
      <div class="item-label"><b>${esc(it.label)}</b>${prev}</div>
      <div class="opts">${btn(0)}${btn(1)}</div>
    </div>`;
}

/** Après un tap, fait apparaître l'item suivant s'il est caché sous la barre du bas. */
function revealNext(itemId, b) {
  const idx = ITEMS.findIndex((i) => i.id === itemId);
  const next = ITEMS.slice(idx + 1).find((i) => b.answers[i.id] === undefined) || ITEMS[idx + 1];
  const el = next ? document.querySelector(`[data-row="${next.id}"]`) : document.getElementById('sec-VM');
  if (!el) return;
  const r = el.getBoundingClientRect();
  const bottomLimit = window.innerHeight - 110;
  if (r.bottom > bottomLimit) {
    window.scrollTo({ top: window.scrollY + r.bottom - bottomLimit + 24, behavior: 'smooth' });
  }
}

function updateVmStatus(root, b) {
  const el = root.querySelector('#vm-status');
  if (b.vm == null) { el.textContent = ''; el.className = ''; return; }
  const diff = b.vm - VM_THRESHOLD;
  const above = diff >= 0;
  el.className = above ? 'above' : 'below';
  el.textContent = `${above ? 'Au-dessus du seuil' : 'Sous le seuil'} (${above ? '+' : '−'}${vm(Math.abs(diff))})`;
}
