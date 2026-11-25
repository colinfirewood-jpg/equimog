// Accueil : la liste des bilans par patient.

import * as S from '../store.js';
import { score } from '../questionnaire.js';
import { day, esc, fold, plural, signed } from '../format.js';
import { icon, confirmSheet, isIOS, isInstalled, isTouchDevice, toast } from '../ui.js';
import { exportPdf } from '../export.js';
import { openSettings } from './settings.js';
import { go, rerender } from '../nav.js';

const FILTERS = [['tous', 'Tous'], ['finAFaire', 'Fin à faire'], ['termines', 'Terminés']];
let filter = 'tous';
let query = '';

export function render(root) {
  const all = S.cycles();
  const nPatients = new Set(all.map((c) => c.patientId)).size;
  const nTodo = all.filter((c) => S.status(c) === 'finAFaire').length;

  root.innerHTML = `
  <div class="screen">
    <header class="home-head">
      <div class="row-between">
        <span class="brand">EQUIMOG</span>
        <button class="icon-btn" data-act="settings" aria-label="Réglages">${icon.gear}</button>
      </div>
      <div>
        <h1 class="h-xl">Bilans</h1>
        <p class="sub">${plural(nPatients, 'patient', 'patients')} · ${plural(nTodo, 'bilan', 'bilans')} de fin à faire</p>
      </div>
      ${banner()}
      <label class="search">${icon.search}
        <input type="search" id="q" placeholder="Rechercher un patient" autocomplete="off" autocorrect="off" spellcheck="false" value="${esc(query)}" aria-label="Rechercher un patient">
      </label>
      <div class="chips" role="group" aria-label="Filtrer">
        ${FILTERS.map(([k, l]) => `<button class="chip ${k === filter ? 'on' : ''}" data-act="filter" data-id="${k}" aria-pressed="${k === filter}">${l}</button>`).join('')}
      </div>
    </header>
    <main class="list" id="list"></main>
  </div>
  <div class="bottom-bar"><div class="inner">
    <a class="btn-primary" href="#/nouveau">${icon.plus} Nouveau bilan</a>
  </div></div>`;

  renderList(root);

  root.querySelector('#q').addEventListener('input', (e) => {
    query = e.target.value;
    renderList(root);
  });
  root.onclick = (e) => onClick(e, root);
}

function banner() {
  if (S.isDemo) {
    return `<div class="install-hint">${icon.info}<span>Mode démonstration : patients fictifs, rien n'est enregistré.</span></div>`;
  }
  if (isIOS() && !isInstalled()) {
    return `<div class="install-hint">${icon.share}<span>Installez l'app pour garder vos bilans : touchez <b>Partager</b>, puis <b>Sur l'écran d'accueil</b>, et ouvrez EquiMoG depuis son icône.</span></div>`;
  }
  const { bilans } = S.counts();
  const last = S.settings().lastBackup;
  const old = !last || Date.now() - last > 30 * 24 * 3600 * 1000;
  if (bilans >= 3 && old) {
    return `<button class="install-hint" data-act="settings" style="border:0;text-align:left">${icon.info}<span>Pensez à faire une sauvegarde de vos bilans (Réglages). Elle sert si vous changez de téléphone.</span></button>`;
  }
  return '';
}

function visibleCycles() {
  const q = fold(query);
  return S.cycles()
    .filter((c) => filter === 'tous'
      || (filter === 'finAFaire' && S.status(c) === 'finAFaire')
      || (filter === 'termines' && S.status(c) === 'termine'))
    .filter((c) => !q || fold(S.displayName(S.patientOf(c))).includes(q))
    .sort((a, b) => S.lastActivity(b) - S.lastActivity(a));
}

function renderList(root) {
  const list = root.querySelector('#list');
  const cycles = visibleCycles();
  if (!cycles.length) {
    const none = !S.cycles().length;
    list.innerHTML = `<div class="empty"><b>${none ? 'Aucun bilan pour l’instant' : 'Aucun résultat'}</b>${none ? 'Touchez « Nouveau bilan » pour évaluer un premier patient.' : 'Essayez un autre nom ou un autre filtre.'}</div>`;
    return;
  }
  list.innerHTML = cycles.map(card).join('');
  if (isTouchDevice()) bindSwipe(list);
}

function card(c) {
  const p = S.patientOf(c);
  const rows = [S.debutOf(c), S.finOf(c)].filter(Boolean);
  const st = S.status(c);
  let badge;
  if (st === 'termine') {
    const d = score(S.finOf(c)) - score(S.debutOf(c));
    badge = `<span class="pill ${d < 0 ? 'brick' : ''}">${signed(d)} pts</span>`;
  } else if (st === 'finAFaire') {
    badge = '<span class="pill brick">Fin à faire</span>';
  } else {
    badge = '<span class="pill neutral">Saisie en cours</span>';
  }
  const fin = S.finOf(c);
  const cta = st === 'finAFaire'
    ? `<button class="btn-soft" data-act="${fin ? 'resume' : 'fin'}" data-id="${fin ? fin.id : c.id}">${fin ? 'Reprendre le bilan de fin' : 'Faire le bilan de fin'}</button>`
    : '';
  const del = isTouchDevice() ? '' : `<button class="link-del" data-act="delete" data-id="${c.id}">Supprimer</button>`;

  return `
  <div class="swipe">
    <button class="swipe-del" data-act="delete" data-id="${c.id}">Supprimer</button>
    <article class="card pcard swipe-front" data-cycle="${c.id}">
      <div class="pcard-head">
        <div><div class="pname">${esc(S.displayName(p))}</div><div class="pdob">Né(e) le ${esc(p?.dob || '—')}</div></div>
        ${badge}
      </div>
      <div class="prows">${rows.map(row).join('')}</div>
      ${cta}
      ${del ? `<div class="pcard-foot">${del}</div>` : ''}
    </article>
  </div>`;
}

function row(b) {
  const tag = b.moment === 'debut' ? 'Début' : 'Fin';
  const action = b.complete
    ? `<button class="mini-btn" data-act="pdf" data-id="${b.id}" aria-label="PDF du bilan de ${tag.toLowerCase()}">${icon.doc} PDF</button>`
    : `<button class="mini-btn soft" data-act="resume" data-id="${b.id}">Reprendre</button>`;
  return `
    <div class="prow">
      <span class="tag"><b>${tag}</b> · ${day(b.date)}</span>
      <span class="score num">${score(b)}/26</span>
      ${action}
    </div>`;
}

async function onClick(e, root) {
  const openCard = root.querySelector('.swipe-front.open');
  const el = e.target.closest('[data-act]');
  if (openCard && (!el || el.dataset.act !== 'delete')) {
    closeSwipe(openCard);
    e.preventDefault();
    return;
  }
  if (!el) return;
  const { act, id } = el.dataset;
  if (act === 'settings') openSettings();
  else if (act === 'filter') { filter = id; rerender(); }
  else if (act === 'resume') go(`#/saisie/${id}`);
  else if (act === 'fin') go(`#/nouveau/${id}`);
  else if (act === 'pdf') {
    const b = S.bilan(id);
    if (b) await exportPdf(b);
  } else if (act === 'delete') {
    const c = S.cycle(id);
    const name = esc(S.displayName(S.patientOf(c)));
    const ok = await confirmSheet({
      title: 'Supprimer ce cycle ?',
      message: `Les bilans de ${name} seront effacés de l'app. Les PDF déjà enregistrés et ceux importés dans Vega ne sont pas touchés.`,
      confirm: 'Supprimer les bilans',
      danger: true,
    });
    if (ok) { S.deleteCycle(id); toast('Bilans supprimés'); }
    rerender();
  }
}

// ---------- Balayer vers la gauche pour supprimer ----------

const OPEN_X = -96;

function closeSwipe(front) {
  front.classList.remove('open');
  front.style.transform = '';
  front.parentElement.classList.remove('reveal');
}

function bindSwipe(list) {
  list.querySelectorAll('.swipe-front').forEach((front) => {
    let x0 = 0; let y0 = 0; let dx = 0; let base = 0; let decided = false; let dragging = false;
    front.addEventListener('touchstart', (e) => {
      const t = e.touches[0];
      x0 = t.clientX; y0 = t.clientY; dx = 0; decided = false; dragging = false;
      base = front.classList.contains('open') ? OPEN_X : 0;
      front.style.transition = 'none';
    }, { passive: true });
    front.addEventListener('touchmove', (e) => {
      const t = e.touches[0];
      const ddx = t.clientX - x0; const ddy = t.clientY - y0;
      if (!decided) {
        if (Math.abs(ddx) < 8 && Math.abs(ddy) < 8) return;
        decided = true;
        dragging = Math.abs(ddx) > Math.abs(ddy);
      }
      if (!dragging) return;
      front.parentElement.classList.add('reveal');
      dx = ddx;
      front.style.transform = `translateX(${Math.min(0, Math.max(-120, base + dx))}px)`;
    }, { passive: true });
    front.addEventListener('touchend', () => {
      front.style.transition = '';
      if (!dragging) return;
      const open = base + dx < OPEN_X / 2;
      list.querySelectorAll('.swipe-front.open').forEach((o) => { if (o !== front) closeSwipe(o); });
      if (open) {
        front.classList.add('open');
        front.style.transform = `translateX(${OPEN_X}px)`;
      } else {
        closeSwipe(front);
      }
    });
  });
}
