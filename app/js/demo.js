// Patients des maquettes, chargés seulement avec « ?demo » dans l'adresse.

const ORDER = [0, 2, 3, 5, 8, 9, 12, 13, 16, 19, 21, 23, 1, 6, 10, 14, 17, 20, 22, 25, 4, 7, 11, 15, 18, 24];
const IDS = ['A0', 'A1', 'A2', 'A3', 'A4', 'B0', 'B1', 'C0', 'C1', 'C2', 'C3', 'C4', 'C5',
  'D0', 'D1', 'D2', 'E0', 'E1', 'E2', 'E3', 'E4', 'E5', 'F0', 'F1', 'F2', 'F3'];
const INVERSE = new Set(['F1', 'F2', 'F3']);

const spread = (n) => {
  const pts = Array(26).fill(0);
  ORDER.slice(0, n).forEach((i) => { pts[i] = 1; });
  return pts;
};

const answers = (pts) => Object.fromEntries(IDS.map((id, i) => {
  const p = pts[i];
  return [id, INVERSE.has(id) ? (p ? 1 : 0) : (p ? 0 : 1)];
}));

export function demoData() {
  const data = { version: 1, patients: [], cycles: [], bilans: [] };
  const paulDebut = [1, 0, 1, 1, 0, 1, 0, 0, 0, 1, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 1, 0, 1, 0, 0];
  const add = (nom, prenom, dob, debut, fin) => {
    const key = nom.normalize('NFD').replace(/[^A-Za-z]/g, '');
    const pid = `p-${key}`;
    data.patients.push({ id: pid, nom, prenom, dob, createdAt: 0 });
    const cid = `c-${key}`;
    data.cycles.push({ id: cid, patientId: pid, createdAt: Date.parse(debut[0]) });
    for (const [moment, entry] of [['debut', debut], ['fin', fin]]) {
      if (!entry) continue;
      const t = Date.parse(entry[0]);
      data.bilans.push({
        id: `b-${key}-${moment}`, cycleId: cid, moment, date: entry[0], createdAt: t, updatedAt: t,
        answers: answers(entry[1]), vm: entry[2], commentaires: '', evaluatrice: '', complete: true,
      });
    }
  };
  add('MARTIN', 'Jeanne', '14/03/1941', ['2026-10-12', spread(14), 0.48], ['2026-11-25', spread(21), 0.69]);
  add('LEFÈVRE', 'Paul', '02/07/1938', ['2026-11-04', paulDebut, 0.52], null);
  add('GARNIER', 'Hélène', '21/09/1945', ['2026-09-30', spread(16), 0.61], ['2026-11-18', spread(19), 0.66]);
  add('ROUX', 'Michel', '08/01/1950', ['2026-11-19', spread(18), 0.70], null);
  return data;
}
