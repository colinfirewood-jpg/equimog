// Données de l'app, gardées uniquement sur l'appareil (localStorage).
// Rien n'est envoyé sur Internet.

import { todayISO, fold } from './format.js';
import { ITEMS } from './questionnaire.js';
import { demoData } from './demo.js';

const DATA_KEY = 'equimog.data.v1';
const SETTINGS_KEY = 'equimog.settings.v1';

/** `?demo` dans l'adresse : données des maquettes, jamais enregistrées. */
export const isDemo = new URLSearchParams(location.search).has('demo');

const empty = () => ({ version: 1, patients: [], cycles: [], bilans: [] });

let data = load();

function load() {
  if (isDemo) return demoData();
  try {
    const parsed = JSON.parse(localStorage.getItem(DATA_KEY));
    return isValid(parsed) ? parsed : empty();
  } catch {
    return empty();
  }
}

function isValid(d) {
  return d && Array.isArray(d.patients) && Array.isArray(d.cycles) && Array.isArray(d.bilans);
}

let saveError = null;
export const lastSaveError = () => saveError;

export function save() {
  if (isDemo) return;
  try {
    localStorage.setItem(DATA_KEY, JSON.stringify(data));
    saveError = null;
  } catch (e) {
    saveError = e;
    alert("Impossible d'enregistrer sur cet appareil. Faites une sauvegarde depuis les Réglages.");
  }
}

/** Demande au navigateur de ne pas effacer les données de l'app. */
export async function askPersistence() {
  try { await navigator.storage?.persist?.(); } catch { /* sans effet */ }
}

export const uid = () =>
  (crypto.randomUUID ? crypto.randomUUID() : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`);

// ---------- Lecture ----------

export const patient = (id) => data.patients.find((p) => p.id === id);
export const cycle = (id) => data.cycles.find((c) => c.id === id);
export const bilan = (id) => data.bilans.find((b) => b.id === id);
export const cycles = () => data.cycles;

export const bilansOf = (c) => data.bilans.filter((b) => b.cycleId === c.id);
export const debutOf = (c) => bilansOf(c).find((b) => b.moment === 'debut');
export const finOf = (c) => bilansOf(c).find((b) => b.moment === 'fin');
export const patientOf = (c) => patient(c.patientId);
export const cycleOf = (b) => cycle(b.cycleId);
export const patientOfBilan = (b) => patientOf(cycleOf(b));

export function debutOfBilan(b) {
  return b.moment === 'fin' ? debutOf(cycleOf(b)) : null;
}

/** 'debutEnCours' | 'finAFaire' | 'termine' */
export function status(c) {
  if (finOf(c)?.complete) return 'termine';
  if (debutOf(c)?.complete) return 'finAFaire';
  return 'debutEnCours';
}

export function lastActivity(c) {
  return bilansOf(c).reduce((max, b) => (b.updatedAt > max ? b.updatedAt : max), c.createdAt);
}

export const displayName = (p) => (p ? `${p.nom} ${p.prenom}` : 'Patient');

// ---------- Écriture ----------

function newBilan(cycleId, moment, evaluatrice) {
  const now = Date.now();
  const b = {
    id: uid(), cycleId, moment, date: todayISO(), createdAt: now, updatedAt: now,
    answers: {}, vm: null, commentaires: '', evaluatrice, complete: false,
  };
  data.bilans.push(b);
  return b;
}

export function startDebut({ nom, prenom, dob, evaluatrice }) {
  let p = data.patients.find((x) => fold(x.nom) === fold(nom) && fold(x.prenom) === fold(prenom) && x.dob === dob);
  if (!p) {
    p = { id: uid(), nom, prenom, dob, createdAt: Date.now() };
    data.patients.push(p);
  }
  const c = { id: uid(), patientId: p.id, createdAt: Date.now() };
  data.cycles.push(c);
  const b = newBilan(c.id, 'debut', evaluatrice);
  save();
  return b;
}

export function startFin(cycleId, evaluatrice) {
  const c = cycle(cycleId);
  const existing = finOf(c);
  if (existing) return existing;
  const b = newBilan(cycleId, 'fin', evaluatrice);
  save();
  return b;
}

export function touch(b) {
  b.updatedAt = Date.now();
  save();
}

export function deleteCycle(cycleId) {
  const c = cycle(cycleId);
  if (!c) return;
  data.bilans = data.bilans.filter((b) => b.cycleId !== cycleId);
  data.cycles = data.cycles.filter((x) => x.id !== cycleId);
  if (!data.cycles.some((x) => x.patientId === c.patientId)) {
    data.patients = data.patients.filter((p) => p.id !== c.patientId);
  }
  save();
}

// ---------- Sauvegarde ----------

export function exportData() {
  return JSON.stringify({ ...data, exportedAt: new Date().toISOString(), app: 'EquiMoG' }, null, 2);
}

/** Remplace toutes les données par celles d'une sauvegarde. Renvoie le nombre de bilans. */
export function importData(text) {
  const parsed = JSON.parse(text);
  if (!isValid(parsed) || parsed.app !== 'EquiMoG') throw new Error("Ce fichier n'est pas une sauvegarde EquiMoG.");
  const known = new Set(ITEMS.map((i) => i.id));
  for (const b of parsed.bilans) {
    if (typeof b.answers !== 'object' || !b.answers) b.answers = {};
    for (const k of Object.keys(b.answers)) if (!known.has(k)) delete b.answers[k];
  }
  data = { version: 1, patients: parsed.patients, cycles: parsed.cycles, bilans: parsed.bilans };
  save();
  return data.bilans.length;
}

export const counts = () => ({ patients: data.patients.length, bilans: data.bilans.length });

// ---------- Réglages ----------

export function settings() {
  try { return { evaluatrice: '', lastBackup: null, ...JSON.parse(localStorage.getItem(SETTINGS_KEY)) }; } catch { return { evaluatrice: '', lastBackup: null }; }
}

export function setSettings(patch) {
  try { localStorage.setItem(SETTINGS_KEY, JSON.stringify({ ...settings(), ...patch })); } catch { /* ignore */ }
}
