// Création et partage du PDF d'un bilan.

import * as S from './store.js';
import { buildPdf, pdfFileName } from './pdf.js';
import { shareOrDownload, toast } from './ui.js';

export function pdfInput(bilan) {
  return {
    bilan,
    debut: S.debutOfBilan(bilan),
    patient: S.patientOfBilan(bilan),
    evaluatrice: (bilan.evaluatrice || S.settings().evaluatrice || '').trim(),
  };
}

export const fileNameFor = (bilan) => pdfFileName(pdfInput(bilan));

/**
 * Le PDF est créé d'un bloc, sans attente, pour que le menu Partager d'iOS
 * s'ouvre bien dans la foulée du toucher.
 */
export async function exportPdf(bilan) {
  if (!window.jspdf) {
    toast("Le module PDF n'est pas chargé. Fermez et rouvrez l'app.");
    return 'error';
  }
  let blob;
  try {
    blob = buildPdf(pdfInput(bilan), window.jspdf.jsPDF);
  } catch (e) {
    console.error(e);
    toast("Le PDF n'a pas pu être créé.");
    return 'error';
  }
  const result = await shareOrDownload(blob, fileNameFor(bilan));
  if (result === 'downloaded') toast('PDF téléchargé');
  return result;
}
