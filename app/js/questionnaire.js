// Grille EquiMoG : 26 items, 1 point par item acquis.
// Réponse 0 = Oui / B, réponse 1 = Non / D.
// Un item « inverse » est formulé comme un déficit : « Oui » ne donne pas de point.

export const VM_THRESHOLD = 0.65;

// [libellé de saisie, libellé PDF, libellé court, inverse]
const RAW = [
  ['A', 'Contrôle postural proactif', 'Anticipations', 'Proactif · anticipations', 'Contrôle postural proactif (anticipations)', true, [
    ['Pointe des pieds'],
    ['Pas alternés sur une marche'],
    ['Préparation du demi-tour'],
    ['Transfert assis-debout'],
    ['Transfert debout-assis'],
  ]],
  ['B', 'Contrôle postural réactif', 'Réactions', 'Réactif · réactions', 'Contrôle postural réactif (réactions)', true, [
    ['Adaptation posturale'],
    ['Réaction parachute'],
  ]],
  ['C', 'Mobilité', 'B = Bon · D = Déficient', 'Mobilité', 'Mobilité', false, [
    ['Vitesse de marche en double tâche', null, 'Marche en double tâche'],
    ['Changement de vitesse de marche', null, 'Changement de vitesse'],
    ['Qualité du demi-tour'],
    ['Rotation cervicale'],
    ['Descente au sol'],
    ['Relever du sol'],
  ]],
  ['D', 'Contrôle postural statique', 'B = Bon · D = Déficient', 'Postural statique', 'Contrôle postural statique', false, [
    ['Pieds joints, yeux ouverts, sol dur', null, 'Pieds joints, yeux ouverts'],
    ['Pieds écartés, yeux fermés, sol dur', null, 'Pieds écartés, yeux fermés'],
    ['Pieds écartés, yeux ouverts, mousse', null, 'Pieds écartés sur mousse'],
  ]],
  ['E', 'Contraintes biomécaniques', 'B = Bon · D = Déficient', 'Contraintes biomécaniques', 'Contraintes biomécaniques', false, [
    ['Adaptation à l’effort'],
    ['Puissance MI'],
    ['Amplitude de cheville'],
    ['État du capteur podal'],
    ['Instabilité directionnelle'],
    ['Limite de stabilité antérieure (Functional Reach Test)', null, 'Functional Reach Test'],
  ]],
  ['F', 'Analyse de la marche', 'Les déficits notés Oui ne donnent pas de point', 'Analyse de la marche', 'Analyse de la marche', true, [
    ['Symétrie de la marche'],
    ['Douleur à l’appui pouvant être impliquée dans l’asymétrie', 'Douleur à l’appui impliquée dans l’asymétrie', 'Douleur à l’appui (marche)', true],
    ['Déficit de force musculaire pouvant être impliqué dans l’asymétrie', 'Déficit de force musculaire impliqué dans l’asymétrie', 'Déficit de force (marche)', true],
    ['Déficit d’amplitude articulaire pouvant être impliqué dans l’asymétrie', 'Déficit d’amplitude articulaire impliqué dans l’asymétrie', 'Déficit d’amplitude (marche)', true],
  ]],
];

export const SECTIONS = RAW.map(([id, title, sub, recapName, pdfName, yesNo, items]) => ({
  id, title, sub, recapName, pdfName, yesNo,
  items: items.map(([label, pdfLabel, short, inverse], i) => ({
    id: id + i, label, pdfLabel: pdfLabel || label, short: short || label, inverse: !!inverse,
  })),
}));

export const ITEMS = SECTIONS.flatMap((s) => s.items);
export const ITEM_COUNT = ITEMS.length; // 26

export function optionLabel(section, option) {
  return section.yesNo ? (option === 0 ? 'Oui' : 'Non') : (option === 0 ? 'B' : 'D');
}

export function pointsFor(item, option) {
  return item.inverse ? (option === 1 ? 1 : 0) : (option === 0 ? 1 : 0);
}

function pts(bilan, item) {
  const a = bilan.answers[item.id];
  return a === undefined ? null : pointsFor(item, a);
}

export function score(bilan) {
  return ITEMS.reduce((sum, it) => sum + (pts(bilan, it) || 0), 0);
}

export function answeredCount(bilan) {
  return ITEMS.filter((it) => bilan.answers[it.id] !== undefined).length;
}

export function sectionScore(bilan, section) {
  return section.items.reduce((sum, it) => sum + (pts(bilan, it) || 0), 0);
}

export function sectionAnswered(bilan, section) {
  return section.items.filter((it) => bilan.answers[it.id] !== undefined).length;
}

/** Items sans point : réponse déficiente ou item non renseigné. */
export function deficientItems(bilan) {
  return ITEMS.filter((it) => pts(bilan, it) !== 1);
}

export function itemPoints(bilan, item) {
  return pts(bilan, item);
}
