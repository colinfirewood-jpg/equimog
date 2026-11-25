// PDF A4 du bilan, dessiné avec jsPDF (texte vectoriel, police Helvetica intégrée).
// Page 1 : synthèse. Page 2 : détail des 26 items. Page 3 : commentaires longs, si besoin.

import {
  SECTIONS, VM_THRESHOLD, optionLabel, score, sectionScore, deficientItems, itemPoints,
} from './questionnaire.js';
import { day, vm, signed } from './format.js';

const C = {
  ink: [21, 33, 42], muted: [91, 103, 112], teal: [30, 77, 92], tealSoft: [227, 238, 240],
  tealTint: [243, 247, 248], brick: [142, 58, 34], border: [221, 225, 221], divider: [238, 240, 238],
  rowDivider: [240, 242, 240], neutral: [238, 240, 238], sectionTint: [243, 245, 243],
};
const W = 595.28;
const H = 841.89;
const M = 48;
const RIGHT = W - M;
const CW = W - 2 * M;
const FOOTER_TOP = H - 50;

/** « LEFEVRE Paul - EquiMoG fin - 2026-11-25.pdf » */
export function pdfFileName({ bilan, patient }) {
  const nom = (patient?.nom || 'PATIENT').normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase();
  const name = `${nom} ${patient?.prenom || ''} - EquiMoG ${bilan.moment === 'fin' ? 'fin' : 'début'} - ${bilan.date}.pdf`;
  return name.replace(/[\\/:*?"<>|]/g, '-').replace(/\s+/g, ' ');
}

/** Caractères que la police intégrée sait afficher. */
const clean = (s) => String(s ?? '')
  .replace(/[’‘]/g, "'").replace(/[“”]/g, '"').replace(/[−–]/g, '-').replace(/ /g, ' ');

function makeKit(doc) {
  const font = (size, bold) => { doc.setFont('helvetica', bold ? 'bold' : 'normal'); doc.setFontSize(size); };
  const width = (s, size, bold, cs = 0) => { font(size, bold); const t = clean(s); return doc.getTextWidth(t) + cs * Math.max(0, t.length - 1); };

  function text(s, x, y, { size = 10.5, bold = false, color = C.ink, align = 'left', cs = 0 } = {}) {
    const t = clean(s);
    font(size, bold);
    doc.setTextColor(...color);
    let xx = x;
    if (align !== 'left') {
      const w = width(t, size, bold, cs);
      xx = align === 'right' ? x - w : x - w / 2;
    }
    doc.text(t, xx, y, { baseline: 'top', charSpace: cs || undefined });
  }

  const fill = (x, y, w, h, color, r = 0) => {
    doc.setFillColor(...color);
    if (r) doc.roundedRect(x, y, w, h, r, r, 'F'); else doc.rect(x, y, w, h, 'F');
  };
  const stroke = (x, y, w, h, color, r = 0, lw = 0.8) => {
    doc.setDrawColor(...color); doc.setLineWidth(lw);
    if (r) doc.roundedRect(x, y, w, h, r, r, 'S'); else doc.rect(x, y, w, h, 'S');
  };
  const hline = (x1, x2, y, color = C.divider, lw = 0.8) => {
    doc.setDrawColor(...color); doc.setLineWidth(lw); doc.line(x1, y, x2, y);
  };
  const vline = (x, y1, y2, color = C.border, lw = 0.8) => {
    doc.setDrawColor(...color); doc.setLineWidth(lw); doc.line(x, y1, x, y2);
  };

  /** « a → b », la flèche est dessinée (la police intégrée n'a pas ce signe). */
  function arrowText(a, b, x, y, opts = {}) {
    const { size = 10.5, bold = false, color = C.ink, align = 'left' } = opts;
    const wa = width(a, size, bold);
    const wb = width(b, size, bold);
    const arrow = size * 0.8;
    const gap = size * 0.3;
    const total = wa + gap + arrow + gap + wb;
    let x0 = x;
    if (align === 'right') x0 = x - total;
    if (align === 'center') x0 = x - total / 2;
    text(a, x0, y, { size, bold, color });
    const ax = x0 + wa + gap;
    const ay = y + size * 0.47;
    doc.setDrawColor(...color);
    doc.setLineWidth(Math.max(0.6, size / 16));
    doc.line(ax, ay, ax + arrow, ay);
    doc.line(ax + arrow, ay, ax + arrow - size * 0.28, ay - size * 0.22);
    doc.line(ax + arrow, ay, ax + arrow - size * 0.28, ay + size * 0.22);
    text(b, ax + arrow + gap, y, { size, bold, color });
  }

  const lines = (s, size, bold, w) => { font(size, bold); return doc.splitTextToSize(clean(s), w); };

  return { text, width, fill, stroke, hline, vline, arrowText, lines };
}

export function buildPdf(input, JsPDF, output = 'blob') {
  const { bilan, debut, patient, evaluatrice } = input;
  const doc = new JsPDF({ unit: 'pt', format: 'a4', compress: true });
  const k = makeKit(doc);
  const isFin = bilan.moment === 'fin' && !!debut;
  const name = patient ? `${patient.nom} ${patient.prenom}` : 'Patient';
  const footerLeft = `EquiMoG · ${name} · ${bilan.moment === 'fin' ? 'fin' : 'début'} de cycle`;
  doc.setProperties({ title: pdfFileName(input).replace(/\.pdf$/, ''), creator: 'EquiMoG', subject: 'Bilan EquiMoG' });

  // Les commentaires tiennent-ils sur la page 1 ?
  const comment = (bilan.commentaires || '').trim();
  const pages = [];
  const summary = drawSummary(doc, k, { bilan, debut: isFin ? debut : null, name, patient, evaluatrice, comment });
  pages.push(1);
  doc.addPage();
  drawItems(doc, k, { bilan, debut: isFin ? debut : null });
  pages.push(2);
  if (summary.commentsOverflow) {
    doc.addPage();
    drawComments(doc, k, comment);
    pages.push(3);
  }
  pages.forEach((_, i) => {
    doc.setPage(i + 1);
    drawFooter(k, footerLeft, `Page ${i + 1} / ${pages.length}`);
  });
  return doc.output(output);
}

function drawFooter(k, left, right) {
  k.hline(M, RIGHT, FOOTER_TOP + 10);
  k.text(left, M, FOOTER_TOP + 18, { size: 8.5, color: C.muted });
  k.text(right, RIGHT, FOOTER_TOP + 18, { size: 8.5, color: C.muted, align: 'right' });
}

function smallCaps(k, s, x, y, opts = {}) {
  k.text(s.toUpperCase(), x, y, { size: 8.5, bold: true, color: C.muted, cs: 0.5, ...opts });
}

// ---------- Page 1 : synthèse ----------

function drawSummary(doc, k, { bilan, debut, name, patient, evaluatrice, comment }) {
  const isFin = !!debut;
  let y = 44;

  // En-tête
  k.text("ÉVALUATION DE L'ÉQUILIBRE ET DE LA MOTRICITÉ", M, y, { size: 8, bold: true, color: C.muted, cs: 1.1 });
  k.text('Bilan EquiMoG', M, y + 12, { size: 22, bold: true });
  const label = bilan.moment === 'fin' ? 'Fin de cycle' : 'Début de cycle';
  const pw = k.width(label, 10, true) + 20;
  k.fill(RIGHT - pw, y + 15, pw, 19, isFin ? C.tealSoft : C.neutral, 9.5);
  k.text(label, RIGHT - pw / 2, y + 19.5, { size: 10, bold: true, color: isFin ? C.teal : C.ink, align: 'center' });
  y += 46;
  k.hline(M, RIGHT, y, C.ink, 1.5);
  y += 16;

  // Infos patient
  const info = (label2, value, x, w, yy) => {
    k.text(label2, x, yy, { size: 9, color: C.muted });
    const l = k.lines(value, 11.5, true, w - 6);
    l.slice(0, 2).forEach((line, i) => k.text(line, x, yy + 12 + i * 14, { size: 11.5, bold: true }));
    return l.length > 1 ? 14 : 0;
  };
  const ev = evaluatrice || 'Non renseignée';
  if (isFin) {
    const cw = (CW - 32) / 3;
    const extra = Math.max(
      info('Patient', name, M, cw, y),
      info('Date de naissance', patient?.dob || '-', M + cw + 16, cw, y),
      info('Évaluatrice', ev, M + 2 * (cw + 16), cw, y),
    );
    y += 34 + extra;
    info('Bilan de début', day(debut.date), M, cw, y);
    info('Bilan de fin', day(bilan.date), M + cw + 16, cw, y);
    y += 44;
  } else {
    const cw = (CW - 48) / 4;
    const extra = Math.max(
      info('Patient', name, M, cw, y),
      info('Date de naissance', patient?.dob || '-', M + cw + 16, cw, y),
      info('Date du bilan', day(bilan.date), M + 2 * (cw + 16), cw, y),
      info('Évaluatrice', ev, M + 3 * (cw + 16), cw, y),
    );
    y += 44 + extra;
  }

  // Encadré des scores
  const boxH = 62;
  const total = score(bilan);
  const big = (v, x, yy, suffix) => {
    k.text(String(v), x, yy, { size: 22, bold: true });
    if (suffix) k.text(suffix, x + k.width(String(v), 22, true) + 2, yy + 9, { size: 10, color: C.muted });
  };
  if (isFin) {
    const cells = 4;
    const cw = CW / cells;
    const d = total - score(debut);
    k.fill(M + 2 * cw, y, cw, boxH, C.tealTint);
    k.text('Score début', M + 14, y + 12, { size: 9, color: C.muted });
    big(score(debut), M + 14, y + 26, '/26');
    k.text('Score fin', M + cw + 14, y + 12, { size: 9, color: C.muted });
    big(total, M + cw + 14, y + 26, '/26');
    k.text('Évolution', M + 2 * cw + 14, y + 12, { size: 9, color: C.muted });
    k.text(signed(d), M + 2 * cw + 14, y + 26, { size: 22, bold: true, color: d < 0 ? C.brick : C.teal });
    k.text('Vitesse de marche', M + 3 * cw + 14, y + 12, { size: 9, color: C.muted });
    k.arrowText(vm(debut.vm), vm(bilan.vm), M + 3 * cw + 14, y + 27, { size: 13, bold: true });
    k.text(`m/s · seuil ${vm(VM_THRESHOLD)}`, M + 3 * cw + 14, y + 45, { size: 8.5, color: C.muted });
    for (let i = 1; i < cells; i++) k.vline(M + i * cw, y, y + boxH);
  } else {
    const cells = 3;
    const cw = CW / cells;
    k.text('Score total', M + 14, y + 12, { size: 9, color: C.muted });
    big(total, M + 14, y + 26, '/26');
    k.text('Vitesse de marche', M + cw + 14, y + 12, { size: 9, color: C.muted });
    if (bilan.vm != null) {
      big(vm(bilan.vm), M + cw + 14, y + 26, 'm/s');
      const above = bilan.vm >= VM_THRESHOLD;
      k.text(`${above ? 'Au-dessus du' : 'Sous le'} seuil de ${vm(VM_THRESHOLD)}`, M + cw + 14, y + 49, { size: 8.5, bold: true, color: above ? C.teal : C.brick });
    } else {
      big('-', M + cw + 14, y + 26);
      k.text('Non mesurée', M + cw + 14, y + 49, { size: 8.5, color: C.muted });
    }
    k.text('Items déficients', M + 2 * cw + 14, y + 12, { size: 9, color: C.muted });
    big(deficientItems(bilan).length, M + 2 * cw + 14, y + 26);
    for (let i = 1; i < cells; i++) k.vline(M + i * cw, y, y + boxH);
  }
  k.stroke(M, y, CW, boxH, C.border, 8);
  y += boxH + 22;

  // Tableau par section
  const rowH = 22;
  if (isFin) {
    const cD = RIGHT - 128; const cF = RIGHT - 64;
    smallCaps(k, 'Section', M + 26, y);
    smallCaps(k, 'Début', cD, y, { align: 'right' });
    smallCaps(k, 'Fin', cF, y, { align: 'right' });
    smallCaps(k, 'Écart', RIGHT, y, { align: 'right' });
    y += 14;
    k.hline(M, RIGHT, y, C.ink, 0.8);
    for (const s of SECTIONS) {
      const n = s.items.length; const d = sectionScore(debut, s); const f = sectionScore(bilan, s);
      k.text(s.id, M, y + 6.5, { size: 10.5, bold: true });
      k.text(s.pdfName, M + 26, y + 6.5, { size: 10.5 });
      k.text(`${d}/${n}`, cD, y + 6.5, { size: 10.5, color: C.muted, align: 'right' });
      k.text(`${f}/${n}`, cF, y + 6.5, { size: 10.5, bold: true, align: 'right' });
      k.text(signed(f - d), RIGHT, y + 6.5, { size: 10.5, bold: true, color: f - d < 0 ? C.brick : C.teal, align: 'right' });
      y += rowH;
      k.hline(M, RIGHT, y);
    }
    const d = score(debut);
    k.text('Total', M + 26, y + 8, { size: 11, bold: true });
    k.text(`${d}/26`, cD, y + 8, { size: 11, bold: true, align: 'right' });
    k.text(`${total}/26`, cF, y + 8, { size: 11, bold: true, align: 'right' });
    k.text(signed(total - d), RIGHT, y + 8, { size: 11, bold: true, color: total - d < 0 ? C.brick : C.teal, align: 'right' });
  } else {
    const barX = RIGHT - 56 - 12 - 150;
    smallCaps(k, 'Section', M + 26, y);
    smallCaps(k, 'Score', RIGHT, y, { align: 'right' });
    y += 14;
    k.hline(M, RIGHT, y, C.ink, 0.8);
    for (const s of SECTIONS) {
      const n = s.items.length; const v = sectionScore(bilan, s);
      k.text(s.id, M, y + 6.5, { size: 10.5, bold: true });
      k.text(s.pdfName, M + 26, y + 6.5, { size: 10.5 });
      k.fill(barX, y + 9, 150, 4, C.divider, 2);
      if (v) k.fill(barX, y + 9, 150 * (v / n), 4, C.teal, 2);
      k.text(`${v}/${n}`, RIGHT, y + 6.5, { size: 10.5, bold: true, align: 'right' });
      y += rowH;
      k.hline(M, RIGHT, y);
    }
    k.text('Total', M + 26, y + 8, { size: 11, bold: true });
    k.text(`${total}/26`, RIGHT, y + 8, { size: 11, bold: true, align: 'right' });
  }
  y += 40;

  // Items déficients
  smallCaps(k, isFin ? 'Reste déficient en fin de cycle' : 'Items déficients', M, y);
  y += 14;
  const def = deficientItems(bilan);
  const defLines = k.lines(def.length ? def.map((i) => i.pdfLabel).join('  ·  ') : 'Aucun', 10.5, false, CW);
  defLines.forEach((l, i) => k.text(l, M, y + i * 15, { size: 10.5 }));
  y += defLines.length * 15 + 18;

  // Commentaires
  smallCaps(k, 'Commentaires', M, y);
  y += 14;
  if (!comment) {
    k.text('Aucun commentaire.', M, y, { size: 10.5, color: C.muted });
    return { commentsOverflow: false };
  }
  const cl = k.lines(comment, 10.5, false, CW);
  if (y + cl.length * 15 > FOOTER_TOP - 6) {
    k.text('Voir page 3.', M, y, { size: 10.5, color: C.muted });
    return { commentsOverflow: true };
  }
  cl.forEach((l, i) => k.text(l, M, y + i * 15, { size: 10.5 }));
  return { commentsOverflow: false };
}

// ---------- Page 2 : détail des items ----------

function drawItems(doc, k, { bilan, debut }) {
  let y = 44;
  k.text('Détail des items', M, y, { size: 16, bold: true });
  k.text('Bleu : point acquis · brique : déficient', RIGHT, y + 6, { size: 8.5, color: C.muted, align: 'right' });
  y += 28;
  k.hline(M, RIGHT, y, C.ink, 1.5);
  y += 10;

  const colW = debut ? 64 : 84;
  const cFin = RIGHT - colW / 2;
  const cDeb = RIGHT - colW - colW / 2;
  smallCaps(k, 'Item', M, y, { size: 8 });
  if (debut) {
    smallCaps(k, 'Début', cDeb, y, { size: 8, align: 'center' });
    smallCaps(k, 'Fin', cFin, y, { size: 8, align: 'center' });
  } else {
    smallCaps(k, 'Réponse', cFin, y, { size: 8, align: 'center' });
  }
  y += 14;

  const answer = (b, it, s, x, yy) => {
    const a = b.answers[it.id];
    if (a === undefined) { k.text('-', x, yy, { size: 9.5, color: C.muted, align: 'center' }); return; }
    const good = itemPoints(b, it) === 1;
    k.text(optionLabel(s, a), x, yy, { size: 9.5, bold: true, color: good ? C.teal : C.brick, align: 'center' });
  };

  for (const s of SECTIONS) {
    k.fill(M, y, CW, 20, C.sectionTint, 3);
    k.text(`${s.id} · ${s.title}`, M + 8, y + 5.5, { size: 9.5, bold: true });
    const n = s.items.length;
    if (debut) k.arrowText(String(sectionScore(debut, s)), `${sectionScore(bilan, s)} / ${n}`, RIGHT - 8, y + 5.5, { size: 9.5, bold: true, align: 'right' });
    else k.text(`${sectionScore(bilan, s)} / ${n}`, RIGHT - 8, y + 5.5, { size: 9.5, bold: true, align: 'right' });
    y += 22;
    for (const it of s.items) {
      k.text(it.pdfLabel, M + 8, y + 3.5, { size: 9.5 });
      if (debut) answer(debut, it, s, cDeb, y + 3.5);
      answer(bilan, it, s, cFin, y + 3.5);
      y += 16.5;
      k.hline(M, RIGHT, y, C.rowDivider);
    }
    y += 5;
  }
}

// ---------- Page 3 : commentaires longs ----------

function drawComments(doc, k, comment) {
  let y = 44;
  k.text('Commentaires', M, y, { size: 16, bold: true });
  y += 28;
  k.hline(M, RIGHT, y, C.ink, 1.5);
  y += 14;
  const cl = k.lines(comment, 10.5, false, CW);
  const max = Math.floor((FOOTER_TOP - 6 - y) / 15);
  cl.slice(0, max).forEach((l, i) => k.text(l, M, y + i * 15, { size: 10.5 }));
  if (cl.length > max) k.text('[...] Commentaire tronqué.', M, y + max * 15, { size: 9, color: C.muted });
}
